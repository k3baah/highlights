import { ChatMessage, ChatState } from '../types/types';
import { updateChatState } from '../utils/chat';
import browser from '../utils/browser-polyfill';

// Add these interfaces locally since they're not in types.ts
interface ChatSession {
  id: string;
  url: string;
  messages: ChatMessage[];
  createdAt: number;
}

interface StoredChatData {
  url: string;
  sessions: ChatSession[];
  activeSessionId: string;
}

let chatHistoryPanel: HTMLElement | null = null;
let isVisible = false;

export async function showChatHistory(): Promise<void> {
  const chatInterface = document.getElementById('chat-interface');
  if (!chatInterface) return;

  if (!chatHistoryPanel) {
    chatHistoryPanel = document.createElement('div');
    chatHistoryPanel.className = 'chat-history-panel';
    chatInterface.appendChild(chatHistoryPanel);
  }

  if (isVisible) {
    chatHistoryPanel.style.display = 'none';
    const chatMessages = document.getElementById('chat-messages');
    const chatInputBox = document.getElementById('chat-input-box');
    if (chatMessages) chatMessages.style.display = 'block';
    if (chatInputBox) chatInputBox.style.display = 'flex';
    isVisible = false;
    return;
  }

  // Get all chats for current URL
  const currentUrl = window.location.href;
  const result = await browser.storage.local.get(`chat_${currentUrl}`);
  const data = result[`chat_${currentUrl}`] as StoredChatData | undefined;

  // Render chat history
  chatHistoryPanel.innerHTML = `
    <div class="chat-history-header">
    </div>
    <div class="chat-history-list">
      ${data?.sessions.map(session => createChatCard(session)).join('') || 'No chats yet'}
    </div>
  `;

  // Hide chat interface elements
  const chatMessages = document.getElementById('chat-messages');
  const chatInputBox = document.getElementById('chat-input-box');
  if (chatMessages) chatMessages.style.display = 'none';
  if (chatInputBox) chatInputBox.style.display = 'none';

  // Show chat history
  chatHistoryPanel.style.display = 'block';
  isVisible = true;

  // Add click handlers to chat cards
  const chatCards = chatHistoryPanel.querySelectorAll('.chat-card');
  chatCards.forEach(card => {
    card.addEventListener('click', () => {
      const sessionId = card.getAttribute('data-session-id');
      if (sessionId) {
        loadChat(sessionId, data);
      }
    });
  });
}

async function loadChat(sessionId: string, data: StoredChatData | undefined): Promise<void> {
  if (!data) return;

  const session = data.sessions.find((s: ChatSession) => s.id === sessionId);
  if (!session) return;

  // Update chat state with selected session
  updateChatState({
    messages: session.messages,
    sessionId: session.id
  });

  // Update storage with new active session
  const currentUrl = window.location.href;
  await browser.storage.local.set({
    [`chat_${currentUrl}`]: {
      ...data,
      activeSessionId: sessionId
    }
  });

  // Hide chat history and show chat interface
  if (chatHistoryPanel) {
    chatHistoryPanel.style.display = 'none';
  }
  const chatMessages = document.getElementById('chat-messages');
  const chatInputBox = document.getElementById('chat-input-box');
  if (chatMessages) chatMessages.style.display = 'block';
  if (chatInputBox) chatInputBox.style.display = 'flex';
  isVisible = false;
}

function createChatCard(session: ChatSession): string {
  const firstMessage = session.messages.find((msg: ChatMessage) => !msg.isContext);
  return `
    <div class="chat-card" data-session-id="${session.id}">
      <div class="chat-card-title">
        ${firstMessage?.content || 'New Chat'}
      </div>
      <div class="chat-card-subtitle">
        placeholder subtitle
      </div>
    </div>
  `;
} 