import browser from './browser-polyfill';
import { ChatMessage, ChatState, ModelConfig } from '../types/types';
import { AnyHighlightData } from './highlighter';
import { generalSettings, saveSettings, loadSettings } from './storage-utils';

interface LLMResponse {
  content: string;
  error?: string;
}

export interface ChatSession {
  id: string;
  url: string;
  messages: ChatMessage[];
  createdAt: number;
}

export interface StoredChatData {
  url: string;
  sessions: ChatSession[];
  activeSessionId: string;
}

export let chatState: ChatState = {
  messages: [],
  isProcessing: false,
  sessionId: generateSessionId()
};

export function generateSessionId(): string {
  return Date.now().toString() + Math.random().toString(36).slice(2, 11);
}

async function sendToLLM(
  promptContext: string,
  content: string,
  model: ModelConfig
): Promise<LLMResponse> {
  const provider = generalSettings.providers.find(p => p.id === model.providerId);
  if (!provider) {
    throw new Error(`Provider not found for model ${model.name}`);
  }

  if (!provider.apiKey) {
    throw new Error(`API key is not set for provider ${provider.name}`);
  }

  try {
    const systemContent = 
      `You are a helpful assistant analyzing a web page. You have access to the page content and any highlights the user has made. 
       Respond naturally and conversationally. If the user references highlights, acknowledge them in your response.
       Keep responses concise but informative. Format responses in Markdown when appropriate.`;
    
    const requestUrl = provider.baseUrl;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    let requestBody: Record<string, any>;

    if (provider.name.toLowerCase().includes('anthropic')) {
      requestBody = {
        model: model.providerModelId,
        max_tokens: 1600,
        messages: [
          { role: 'user', content: `${promptContext}\n\n${content}` }
        ],
        temperature: 0.7,
        system: systemContent
      };
      Object.assign(headers, {
        'x-api-key': provider.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      });
    } else if (provider.name.toLowerCase().includes('ollama')) {
      requestBody = {
        model: model.providerModelId,
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: `${promptContext}\n\n${content}` }
        ],
        stream: true
      };
    } else {
      requestBody = {
        model: model.providerModelId,
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: `${promptContext}\n\n${content}` }
        ],
        temperature: 0.7
      };
      Object.assign(headers, {
        "HTTP-Referer": 'https://obsidian.md/',
        "X-Title": 'Obsidian Web Clipper',
        'Authorization': `Bearer ${provider.apiKey}`
      });
    }

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${provider.name} error: ${response.statusText} ${errorText}`);
    }

    const responseText = await response.text();
    const data = JSON.parse(responseText);

    let llmResponseContent: string;

    if (provider.name.toLowerCase().includes('anthropic')) {
      llmResponseContent = data.content[0]?.text || '';
    } else if (provider.name.toLowerCase().includes('ollama')) {
      llmResponseContent = data.message?.content || '';
    } else {
      llmResponseContent = data.choices[0]?.message?.content || '';
    }

    return { content: llmResponseContent };
  } catch (error) {
    console.error(`Error sending to ${provider.name} LLM:`, error);
    throw error;
  }
}

export async function sendChatMessage(
  message: string, 
  pageContext: string
): Promise<string> {
  try {
    chatState.isProcessing = true;
    updateChatProcessingUI();

    // Get current model configuration
    const modelSelect = document.getElementById('model-select') as HTMLSelectElement;
    const selectedModelId = modelSelect?.value || generalSettings.interpreterModel;
    const modelConfig = generalSettings.models.find(m => m.id === selectedModelId);
    
    if (!modelConfig) {
      throw new Error(`Model configuration not found for ${selectedModelId}`);
    }

    const response = await sendToLLM(pageContext, message, modelConfig);
    return response.content;
  } catch (error) {
    console.error('Chat error:', error);
    throw error;
  } finally {
    chatState.isProcessing = false;
    updateChatProcessingUI();
  }
}

export function updateChatState(updates: Partial<ChatState>): void {
  chatState = { ...chatState, ...updates };
  updateChatUI();
  updateChatProcessingUI();
  if (updates.error) updateChatErrorUI();
}

export async function saveChatState(): Promise<void> {
  const currentUrl = window.location.href;
  const result = await browser.storage.local.get(`chat_${currentUrl}`);
  const data = result[`chat_${currentUrl}`] as StoredChatData | undefined;
  
  const updatedData: StoredChatData = {
    url: currentUrl,
    sessions: [
      ...(data?.sessions?.filter(s => s.id !== chatState.sessionId) || []),
      {
        id: chatState.sessionId,
        url: currentUrl,
        messages: chatState.messages,
        createdAt: Date.now()
      }
    ],
    activeSessionId: chatState.sessionId
  };
  
  await browser.storage.local.set({ [`chat_${currentUrl}`]: updatedData });
}

export async function loadChatState(): Promise<void> {
  const currentUrl = window.location.href;
  const result = await browser.storage.local.get(`chat_${currentUrl}`);
  const data = result[`chat_${currentUrl}`] as StoredChatData | undefined;
  
  if (data?.activeSessionId) {
    const activeSession = data.sessions.find(s => s.id === data.activeSessionId);
    if (activeSession) {
      updateChatState({
        messages: activeSession.messages,
        sessionId: activeSession.id
      });
    }
  }
}

export function updateChatUI(): void {
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) return;

  chatMessages.innerHTML = '';
  
  for (const message of chatState.messages.filter(msg => !msg.isContext)) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${message.role}`;
    messageDiv.textContent = message.content;
    chatMessages.appendChild(messageDiv);
  }

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

export function updateChatProcessingUI(): void {
  const sendButton = document.getElementById('chat-send-btn') as HTMLButtonElement;
  const chatInput = document.getElementById('chat-message-input') as HTMLTextAreaElement;
  
  if (!sendButton || !chatInput) return;
  
  sendButton.disabled = chatState.isProcessing;
  chatInput.disabled = chatState.isProcessing;
  
  const icon = sendButton.querySelector('i');
  if (icon) {
    icon.setAttribute('data-lucide', chatState.isProcessing ? 'loader-2' : 'arrow-up');
    icon.classList.toggle('spin', chatState.isProcessing);
  }
}

export function updateChatErrorUI(): void {
  if (!chatState.error) return;
  
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) return;

  const errorDiv = document.createElement('div');
  errorDiv.className = 'chat-message error';
  errorDiv.textContent = chatState.error;
  chatMessages.appendChild(errorDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

export async function initializeChatContext(pageContent: string): Promise<void> {
  chatState.messages = [
    {
      role: 'user',
      content: `PAGE CONTENT: ${pageContent}`,
      timestamp: Date.now(),
      isContext: true
    },
    {
      role: 'assistant',
      content: 'Sure. Happy to help.',
      timestamp: Date.now(),
      isContext: true
    }
  ];
}

export async function updateChatContextWithHighlights(highlights: AnyHighlightData[]): Promise<void> {
  if (!chatState.messages.length) return;

  const contextMessageIndex = chatState.messages.findIndex(msg => msg.isContext);
  if (contextMessageIndex === -1) return;

  const highlightsSection = highlights.length ? `
HIGHLIGHTED EXCERPTS:
${highlights.map(h => `"${h.content}"`).join('\n')}
` : '';

  const baseContent = chatState.messages[contextMessageIndex].content;
  const updatedContent = baseContent.includes('HIGHLIGHTED EXCERPTS:') 
    ? baseContent.split('HIGHLIGHTED EXCERPTS:')[0] + highlightsSection
    : baseContent + '\n\n' + highlightsSection;

  chatState.messages[contextMessageIndex].content = updatedContent.trim();
  
  await saveChatState();
}

export async function createNewChat(): Promise<void> {
  const currentUrl = window.location.href;
  
  // Save current chat before creating new one
  await saveChatState();
  
  // Create new chat session
  const newSessionId = generateSessionId();
  
  // Update chat state
  updateChatState({
    messages: [],
    isProcessing: false,
    sessionId: newSessionId
  });
  
  // Save new session to storage
  const result = await browser.storage.local.get(`chat_${currentUrl}`);
  const data = result[`chat_${currentUrl}`] as StoredChatData | undefined;
  
  const newData: StoredChatData = {
    url: currentUrl,
    sessions: [...(data?.sessions || []), {
      id: newSessionId,
      url: currentUrl,
      messages: [],
      createdAt: Date.now()
    }],
    activeSessionId: newSessionId
  };
  
  await browser.storage.local.set({ [`chat_${currentUrl}`]: newData });
}

export async function initializeChatModelSelect(): Promise<void> {
  const modelSelect = document.getElementById('model-select') as HTMLSelectElement;
  
  // Load settings first
  const settings = await loadSettings();
  console.log('Loaded settings:', settings);
  
  if (modelSelect) {
    modelSelect.addEventListener('change', () => {
      void (async () => {
        generalSettings.interpreterModel = modelSelect.value;
        await saveSettings();
      })();
    });

    // Filter enabled models and populate select options
    const enabledModels = settings.models.filter(model => model.enabled);
    console.log('Enabled models:', enabledModels);
    
    if (enabledModels.length === 0) {
      console.warn('No enabled models found');
      return;
    }

    // Populate select options
    modelSelect.innerHTML = enabledModels
      .map(model => `<option value="${model.id}">${model.name}</option>`)
      .join('');

    // Check if last selected model exists and is enabled
    const lastSelectedModel = enabledModels.find(model => 
      model.id === settings.interpreterModel
    );
    
    if (!lastSelectedModel && enabledModels.length > 0) {
      // If last selected model is not available/enabled, use first enabled model
      generalSettings.interpreterModel = enabledModels[0].id;
      await saveSettings();
    }

    // Set the selected value and make visible
    modelSelect.value = settings.interpreterModel || (enabledModels[0]?.id ?? '');
    modelSelect.style.display = 'inline-block';
  }
}

export async function initializeChat(): Promise<void> {
  await loadChatState();
  initializeChatModelSelect();
  updateChatUI();
}
