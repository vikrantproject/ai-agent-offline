// Configuration
let currentConversationId = null;
let isStreaming = false;
let abortController = null;

// DOM Elements
const app = document.getElementById('app');
const sidebar = document.getElementById('sidebar');
const conversationList = document.getElementById('conversationList');
const newChatBtn = document.getElementById('newChatBtn');
const themeToggle = document.getElementById('themeToggle');
const emptyState = document.getElementById('emptyState');
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const stopBtn = document.getElementById('stopBtn');
const modelName = document.getElementById('modelName');

// Initialize
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadConversations();
  setupEventListeners();
  autoResizeTextarea();
});

// Theme Management
function initTheme() {
  fetch('/api/settings')
    .then(res => res.json())
    .then(settings => {
      const theme = settings.theme || 'dark';
      document.documentElement.setAttribute('data-theme', theme);
    })
    .catch(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  
  fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'theme', value: newTheme })
  });
}

// Event Listeners
function setupEventListeners() {
  newChatBtn.addEventListener('click', startNewChat);
  themeToggle.addEventListener('click', toggleTheme);
  sendBtn.addEventListener('click', sendMessage);
  stopBtn.addEventListener('click', stopGeneration);
  
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  messageInput.addEventListener('input', autoResizeTextarea);
}

// Auto-resize textarea
function autoResizeTextarea() {
  messageInput.style.height = 'auto';
  messageInput.style.height = Math.min(messageInput.scrollHeight, 200) + 'px';
}

// Load Conversations
async function loadConversations() {
  try {
    const response = await fetch('/api/conversations');
    const conversations = await response.json();
    
    conversationList.innerHTML = '';
    
    conversations.forEach(conv => {
      const item = document.createElement('div');
      item.className = 'conversation-item';
      if (conv.id === currentConversationId) {
        item.classList.add('active');
      }
      item.setAttribute('data-testid', `conversation-item-${conv.id}`);
      
      item.innerHTML = `
        <span class="conversation-title">${escapeHtml(conv.title)}</span>
        <button class="delete-btn" data-testid="delete-conversation-btn" title="Delete">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
        </button>
      `;
      
      const deleteBtn = item.querySelector('.delete-btn');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteConversation(conv.id);
      });
      
      item.addEventListener('click', () => loadConversation(conv.id));
      conversationList.appendChild(item);
    });
  } catch (error) {
    console.error('Failed to load conversations:', error);
  }
}

// Start New Chat
function startNewChat() {
  currentConversationId = null;
  messagesContainer.innerHTML = '';
  messagesContainer.classList.remove('visible');
  emptyState.classList.remove('hidden');
  messageInput.value = '';
  messageInput.focus();
  
  document.querySelectorAll('.conversation-item').forEach(item => {
    item.classList.remove('active');
  });
}

// Load Conversation
async function loadConversation(conversationId) {
  try {
    currentConversationId = conversationId;
    
    const response = await fetch(`/api/conversations/${conversationId}/messages`);
    const messages = await response.json();
    
    messagesContainer.innerHTML = '';
    emptyState.classList.add('hidden');
    messagesContainer.classList.add('visible');
    
    messages.forEach(msg => {
      if (msg.role !== 'system') {
        appendMessage(msg.role, msg.content, false);
      }
    });
    
    scrollToBottom();
    
    document.querySelectorAll('.conversation-item').forEach(item => {
      item.classList.remove('active');
    });
    
    const activeItem = conversationList.querySelector(`[data-testid="conversation-item-${conversationId}"]`);
    if (activeItem) {
      activeItem.classList.add('active');
    }
  } catch (error) {
    console.error('Failed to load conversation:', error);
  }
}

// Delete Conversation
async function deleteConversation(conversationId) {
  if (!confirm('Are you sure you want to delete this conversation?')) {
    return;
  }
  
  try {
    await fetch(`/api/conversations/${conversationId}`, { method: 'DELETE' });
    
    if (conversationId === currentConversationId) {
      startNewChat();
    }
    
    loadConversations();
  } catch (error) {
    console.error('Failed to delete conversation:', error);
    alert('Failed to delete conversation. Please try again.');
  }
}

// Send Message
async function sendMessage() {
  const message = messageInput.value.trim();
  
  if (!message || isStreaming) return;
  
  messageInput.value = '';
  autoResizeTextarea();
  
  emptyState.classList.add('hidden');
  messagesContainer.classList.add('visible');
  
  appendMessage('user', message, false);
  
  const assistantMessageDiv = appendMessage('assistant', '', true);
  const contentDiv = assistantMessageDiv.querySelector('.message-content');
  
  showLoading(contentDiv);
  
  isStreaming = true;
  sendBtn.classList.add('hidden');
  stopBtn.classList.remove('hidden');
  messageInput.disabled = true;
  
  abortController = new AbortController();
  
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_id: currentConversationId,
        message: message
      }),
      signal: abortController.signal
    });
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let assistantText = '';
    let receivedStart = false;
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            if (data.type === 'start') {
              receivedStart = true;
              currentConversationId = data.conversation_id;
              hideLoading(contentDiv);
            }
            
            if (data.type === 'token' && data.token) {
              if (!receivedStart) {
                hideLoading(contentDiv);
                receivedStart = true;
              }
              assistantText += data.token;
              renderMarkdown(contentDiv, assistantText);
              scrollToBottom();
            }
            
            if (data.type === 'done') {
              currentConversationId = data.conversation_id;
              loadConversations();
            }
            
            if (data.type === 'error') {
              hideLoading(contentDiv);
              contentDiv.innerHTML = `<p style="color: var(--red);">Error: ${escapeHtml(data.error)}</p>`;
            }
          } catch (e) {
            console.error('Parse error:', e);
          }
        }
      }
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      hideLoading(contentDiv);
      contentDiv.innerHTML += '<p style="color: var(--text-tertiary); font-style: italic;">[Generation stopped]</p>';
    } else {
      hideLoading(contentDiv);
      contentDiv.innerHTML = `<p style="color: var(--red);">Error: ${escapeHtml(error.message)}</p>`;
      console.error('Send message error:', error);
    }
  } finally {
    isStreaming = false;
    sendBtn.classList.remove('hidden');
    stopBtn.classList.add('hidden');
    messageInput.disabled = false;
    messageInput.focus();
    abortController = null;
  }
}

// Stop Generation
function stopGeneration() {
  if (abortController) {
    abortController.abort();
  }
}

// Append Message
function appendMessage(role, content, isStreaming) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;
  messageDiv.setAttribute('data-testid', `message-${role}`);
  
  const avatar = role === 'user' ? 'U' : 'C';
  
  messageDiv.innerHTML = `
    <div class="message-avatar">${avatar}</div>
    <div class="message-content"></div>
  `;
  
  const contentDiv = messageDiv.querySelector('.message-content');
  
  if (!isStreaming) {
    if (role === 'user') {
      contentDiv.textContent = content;
    } else {
      renderMarkdown(contentDiv, content);
    }
  }
  
  messagesContainer.appendChild(messageDiv);
  scrollToBottom();
  
  return messageDiv;
}

// Render Markdown
function renderMarkdown(element, text) {
  const html = marked.parse(text);
  element.innerHTML = html;
  
  element.querySelectorAll('pre code').forEach((block) => {
    hljs.highlightElement(block);
    
    const pre = block.parentElement;
    if (!pre.querySelector('.copy-btn')) {
      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-btn';
      copyBtn.textContent = 'Copy';
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(block.textContent);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => copyBtn.textContent = 'Copy', 2000);
      };
      pre.style.position = 'relative';
      pre.appendChild(copyBtn);
    }
  });
}

// Loading Indicator
function showLoading(element) {
  element.innerHTML = '<div class="loading-spinner"><span></span><span></span><span></span></div>';
}

function hideLoading(element) {
  const spinner = element.querySelector('.loading-spinner');
  if (spinner) {
    spinner.remove();
  }
}

// Scroll to Bottom
function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}