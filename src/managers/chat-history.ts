import { ChatMessage, ChatState } from '../types/types';
import { updateChatState } from '../utils/chat';
import browser from '../utils/browser-polyfill';
import { initializeIcons } from '../icons/icons';

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

  // Add click handlers to chat cards and delete buttons
  const chatCards = chatHistoryPanel.querySelectorAll('.chat-card');
  chatCards.forEach(card => {
    // Handle card click
    card.addEventListener('click', (e) => {
      // Don't trigger if clicking delete button
      if ((e.target as HTMLElement).closest('.chat-card-delete')) return;
      
      const sessionId = card.getAttribute('data-session-id');
      if (sessionId) {
        loadChat(sessionId, data);
      }
    });

    // Handle delete button click
    const deleteBtn = card.querySelector('.chat-card-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation(); // Prevent card click
        const sessionId = deleteBtn.getAttribute('data-session-id');
        if (sessionId && data) {
          await deleteChat(sessionId, data);
        }
      });
    }
  });

  // Initialize Lucide icons for the delete buttons
  const icons = Array.from(chatHistoryPanel.querySelectorAll('[data-lucide]'));
  icons.forEach(icon => initializeIcons(icon as HTMLElement));
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
  const title = firstMessage?.content || 'New Chat';
  return `
    <div class="chat-card" data-session-id="${session.id}">
      <div class="chat-card-content">
        <div class="chat-card-title" title="${title}">
          ${title}
        </div>
        <div class="chat-card-subtitle">
          placeholder subtitle
        </div>
      </div>
      <button class="chat-card-delete" data-session-id="${session.id}" aria-label="Delete chat">
        <i data-lucide="trash-2"></i>
      </button>
    </div>
  `;
}

async function deleteChat(sessionId: string, data: StoredChatData): Promise<void> {
  const currentUrl = window.location.href;
  
  // Remove the session from the data
  const updatedData: StoredChatData = {
    ...data,
    sessions: data.sessions.filter(s => s.id !== sessionId)
  };

  // If we're deleting the active session, set a new active session
  if (data.activeSessionId === sessionId) {
    const remainingSessions = updatedData.sessions;
    updatedData.activeSessionId = remainingSessions.length > 0 
      ? remainingSessions[remainingSessions.length - 1].id 
      : '';
  }

  // Save the updated data
  await browser.storage.local.set({ [`chat_${currentUrl}`]: updatedData });

  // Refresh the chat history display
  await showChatHistory();
} 