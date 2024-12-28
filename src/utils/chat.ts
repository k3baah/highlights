import browser from './browser-polyfill';
import { ChatMessage, ChatState, ModelConfig } from '../types/types';
import { sendToLLM } from './interpreter';
import { AnyHighlightData } from './highlighter';

interface StoredChatData {
  url: string;
  messages: ChatMessage[];
}

export let chatState: ChatState = {
  messages: [],
  isProcessing: false
};

export async function sendChatMessage(
  message: string, 
  pageContext: string,
  modelConfig: ModelConfig
): Promise<string> {
  try {
    chatState.isProcessing = true;
    updateChatProcessingUI();

    const response = await sendToLLM(
      pageContext,
      message,
      [{ key: 'chat', prompt: message }],
      modelConfig
    );

    return response.promptResponses[0]?.user_response || '';
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
  await browser.storage.local.set({
    [`chat_${currentUrl}`]: {
      url: currentUrl,
      messages: chatState.messages
    }
  });
}

export async function loadChatState(): Promise<void> {
  const currentUrl = window.location.href;
  const result = await browser.storage.local.get(`chat_${currentUrl}`);
  const data = result[`chat_${currentUrl}`] as StoredChatData | undefined;
  
  if (data?.messages) {
    updateChatState({ messages: data.messages });
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

export function updateHighlightCounterUI(highlightCount: number): void {
  const counter = document.getElementById('chat-highlight-counter');
  const countSpan = counter?.querySelector('.highlight-count');
  
  if (counter && countSpan) {
    if (highlightCount > 0) {
      counter.style.display = 'flex';
      countSpan.textContent = `${highlightCount} highlights`;
    } else {
      counter.style.display = 'none';
    }
  }
}
