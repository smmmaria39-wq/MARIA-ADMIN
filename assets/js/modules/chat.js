// admin/modules/chat.js

import { api } from '../utils/api.js';
import { showToast } from '../components/toast.js';

let activeChat = 'private';
let selectedUserId = null;
let messages = [];
let pollInterval = null;
let isFetching = false;

// DOM Elements
let chatMessagesEl, messageInputEl, sendBtnEl, chatUserListEl, chatActiveHeaderEl, chatComposerEl;
let mediaUrlInputEl, mediaTypeSelectEl, clearMediaBtnEl;

export default async function initAdminChat() {
 console.log('[Admin Chat] Initializing...');
 
 chatMessagesEl = document.getElementById('chatMessages');
 messageInputEl = document.getElementById('messageInput');
 sendBtnEl = document.getElementById('sendBtn');
 chatUserListEl = document.getElementById('chatUserList');
 chatActiveHeaderEl = document.getElementById('chatActiveHeader');
 chatComposerEl = document.getElementById('chatComposer');
 
 mediaUrlInputEl = document.getElementById('mediaUrlInput');
 mediaTypeSelectEl = document.getElementById('mediaTypeSelect');
 clearMediaBtnEl = document.getElementById('clearMediaBtn');
 
 if (!chatMessagesEl) return;
 
 // Tab Switching
 document.querySelectorAll('.chat-tab').forEach(tab => {
  tab.addEventListener('click', () => switchTab(tab.getAttribute('data-admin-chat')));
 });
 
 // Send Message
 sendBtnEl.addEventListener('click', handleSend);
 messageInputEl.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleSend();
 });
 
 // Clear Media
 clearMediaBtnEl.addEventListener('click', () => {
  mediaUrlInputEl.value = '';
 });
 
 // Initial Load
 await loadUserList();
 startPolling();
}

function switchTab(chatType) {
 activeChat = chatType;
 selectedUserId = null;
 messages = [];
 
 document.querySelectorAll('.chat-tab').forEach(tab => {
  tab.classList.toggle('active', tab.getAttribute('data-admin-chat') === chatType);
 });
 
 if (activeChat === 'private') {
  chatActiveHeaderEl.textContent = 'Select a conversation';
  chatComposerEl.style.display = 'none';
  loadUserList();
 } else {
  chatActiveHeaderEl.textContent = '🌐 Public Chat Moderation';
  chatComposerEl.style.display = 'block';
  loadMessages(); // Load public chat directly
 }
}

function startPolling() {
 if (pollInterval) clearInterval(pollInterval);
 pollInterval = setInterval(() => {
  if (activeChat === 'private' && selectedUserId) {
   loadMessages();
   loadUserList(); // Refresh unread counts
  } else if (activeChat === 'public') {
   loadMessages();
  }
 }, 5000); // Poll every 5 seconds
}

// --- PRIVATE CHAT USER LIST ---
async function loadUserList() {
 if (activeChat !== 'private') return;
 try {
  const res = await api.getPrivateChatUsers();
  const users = res.data || [];
  
  if (users.length === 0) {
   chatUserListEl.innerHTML = '<div class="chat-empty">No active conversations.</div>';
   return;
  }
  
  chatUserListEl.innerHTML = users.map(u => `
            <div class="chat-user-item ${u.userId === selectedUserId ? 'active' : ''}" onclick="window.selectAdminChatUser('${u.userId}', '${u.username}')">
                <strong>${u.username} ${u.unreadCount > 0 ? `<span class="unread-badge">${u.unreadCount}</span>` : ''}</strong>
                <small>${u.lastMessage ? u.lastMessage.substring(0, 30) + '...' : 'No messages'}</small>
            </div>
        `).join('');
 } catch (error) {
  console.error('Failed to load user list:', error);
  chatUserListEl.innerHTML = '<div class="chat-empty text-danger">Failed to load users.</div>';
 }
}

window.selectAdminChatUser = (userId, username) => {
 selectedUserId = userId;
 messages = []; // Clear previous messages
 chatActiveHeaderEl.innerHTML = `💬 ${username}`;
 chatComposerEl.style.display = 'block';
 
 // Update active class in list
 document.querySelectorAll('.chat-user-item').forEach(el => el.classList.remove('active'));
 // Note: In a real DOM setup, we'd add active to the clicked element. 
 
 loadMessages();
 markMessagesRead(userId);
};


// --- MESSAGE LOADING ---
async function loadMessages() {
 if (isFetching) return;
 isFetching = true;
 
 try {
  let res;
  if (activeChat === 'private') {
   if (!selectedUserId) {
    isFetching = false;
    return;
   }
   res = await api.getAdminPrivateChat(selectedUserId);
  } else {
   res = await api.getAdminPublicChat();
  }
  
  const newMessages = res.data || [];
  
  if (newMessages.length !== messages.length || (newMessages.length > 0 && messages.length > 0 && newMessages[newMessages.length - 1].id !== messages[messages.length - 1].id)) {
   messages = newMessages;
   renderMessages();
  } else if (newMessages.length === 0 && messages.length !== 0) {
   messages = [];
   renderMessages();
  }
 } catch (error) {
  console.error(`Failed to load ${activeChat} messages:`, error);
  chatMessagesEl.innerHTML = `<div class="chat-empty text-danger">Failed to load messages.</div>`;
 } finally {
  isFetching = false;
 }
}

function renderMessages() {
 chatMessagesEl.innerHTML = '';
 
 if (messages.length === 0) {
  chatMessagesEl.innerHTML = `<div class="chat-empty">No messages yet.</div>`;
  return;
 }
 
 messages.forEach(msg => {
  chatMessagesEl.appendChild(createMessageElement(msg));
 });
 chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

function createMessageElement(msg) {
 const wrapper = document.createElement('div');
 wrapper.className = 'message-wrapper';
 
 // Admin messages are on the right
 const isOwn = msg.senderRole === 'admin';
 if (isOwn) wrapper.classList.add('own');
 
 const info = document.createElement('div');
 info.className = 'message-info';
 info.textContent = `${msg.username || 'User'} - ${new Date(msg.timestamp).toLocaleTimeString()}`;
 wrapper.appendChild(info);
 
 const bubble = document.createElement('div');
 bubble.className = 'message-bubble';
 
 if (msg.deleted) {
  const deletedText = document.createElement('span');
  deletedText.textContent = 'Message deleted';
  deletedText.style.fontStyle = 'italic';
  deletedText.style.opacity = '0.7';
  bubble.appendChild(deletedText);
 } else {
  const text = document.createElement('div');
  text.className = 'message-text';
  text.textContent = msg.message || '';
  bubble.appendChild(text);
  
  if (msg.media && msg.media.url) {
   const mediaDiv = document.createElement('div');
   mediaDiv.className = 'message-media';
   
   if (msg.media.type === 'image') {
    const img = document.createElement('img');
    img.src = msg.media.url;
    mediaDiv.appendChild(img);
   } else if (msg.media.type === 'video') {
    const video = document.createElement('video');
    video.controls = true;
    video.src = msg.media.url;
    mediaDiv.appendChild(video);
   }
   bubble.appendChild(mediaDiv);
  }
 }
 
 wrapper.appendChild(bubble);
 
 // Admin Moderation Actions (Delete)
 if (!msg.deleted) {
  const actions = document.createElement('div');
  actions.className = 'message-actions';
  
  if (activeChat === 'public') {
   const deleteBtn = document.createElement('button');
   deleteBtn.className = 'message-action-btn';
   deleteBtn.textContent = '🗑 Delete';
   deleteBtn.addEventListener('click', () => handleDelete(msg.id));
   actions.appendChild(deleteBtn);
  }
  
  if (actions.children.length > 0) {
   wrapper.appendChild(actions);
  }
 }
 
 return wrapper;
}


// --- SENDING & MODERATION ---
async function handleSend() {
 const message = messageInputEl.value.trim();
 const mediaUrl = mediaUrlInputEl.value.trim();
 
 if (!message && !mediaUrl) return;
 
 let payload = { message };
 if (mediaUrl) {
  payload.media = {
   type: mediaTypeSelectEl.value,
   url: mediaUrl
  };
 }
 
 sendBtnEl.disabled = true;
 sendBtnEl.textContent = 'Sending...';
 
 try {
  if (activeChat === 'private' && selectedUserId) {
   await api.adminSendPrivateMessage(selectedUserId, payload);
  } else if (activeChat === 'public') {
   await api.sendPublicMessage(payload); // Admin uses same public endpoint
  }
  
  messageInputEl.value = '';
  mediaUrlInputEl.value = '';
  await loadMessages();
 } catch (error) {
  showToast('Failed to send message.', 'error');
 } finally {
  sendBtnEl.disabled = false;
  sendBtnEl.textContent = 'Send';
 }
}

async function handleDelete(messageId) {
 if (!confirm('Delete this public message?')) return;
 try {
  if (activeChat === 'public') {
   await api.adminDeletePublicMessage(messageId);
   await loadMessages();
   showToast('Message deleted.', 'success');
  }
 } catch (error) {
  showToast('Failed to delete message.', 'error');
 }
}

async function markMessagesRead(userId) {
 try {
  await api.adminMarkPrivateRead(userId);
  loadUserList(); // Refresh unread badges
 } catch (error) {
  console.error('Failed to mark read:', error);
 }
}