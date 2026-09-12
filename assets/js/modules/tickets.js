// ===============================================
// Admin Tickets Module
// ===============================================

import { api } from '../utils/api.js';
import { showToast } from '../components/toast.js';

let activeTicketId = null;

export default async function initTickets() {
 const ticketList = document.querySelector('.ticket-items');
 if (!ticketList) return;
 
 const sendBtn = document.getElementById('send-reply-btn');
 const backBtn = document.getElementById('back-to-tickets-btn');
 
 // 1. Fetch and Render Ticket List
 await loadTickets();
 
 // 2. Reply Listener
 if (sendBtn) {
  sendBtn.addEventListener('click', sendReply);
 }
 
 // 3. Mobile Back Button Listener
 if (backBtn) {
  backBtn.addEventListener('click', () => {
   const inboxLayout = document.querySelector('.inbox-layout');
   if (inboxLayout) inboxLayout.classList.remove('show-detail');
  });
 }
}

// Load and Render Ticket List
async function loadTickets() {
 const ticketList = document.querySelector('.ticket-items');
 if (!ticketList) return;
 
 ticketList.innerHTML = `<p class="text-center text-muted">Loading tickets...</p>`;
 
 try {
  // Call the Admin API endpoint
  const response = await api.getAdminTickets();
  const resData = response.data || response;
  const tickets = resData.tickets || resData || [];
  
  if (tickets.length === 0) {
   ticketList.innerHTML = `<p class="text-center text-muted">No support tickets found.</p>`;
  } else {
   ticketList.innerHTML = tickets.map(ticket => {
    const metaHtml = [];
    if (ticket.orderId) metaHtml.push(`<span style="font-size: 12px; color: var(--text-secondary); display: block; margin-top: 2px;">Order ID: ${ticket.orderId}</span>`);
    if (ticket.requestType) metaHtml.push(`<span style="font-size: 12px; color: var(--text-secondary); display: block;">Request: ${ticket.requestType}</span>`);
    
    return `
        <div class="ticket-item" data-ticket-id="${ticket.id}">
            <div class="ticket-item__top">
                <span class="ticket-item__name">${ticket.username || ticket.userId}</span>
                <span class="ticket-item__time">${ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : ''}</span>
            </div>
            ${metaHtml.length ? `<div style="margin-bottom: 5px;">${metaHtml.join('')}</div>` : ''}
            <p class="ticket-item__msg"><strong>${ticket.subject}</strong> - ${ticket.status}</p>
            <span class="badge badge--${ticket.priority === 'high' ? 'danger' : 'warning'}">${ticket.priority}</span>
        </div>
      `;
   }).join('');
   
   // Attach event listeners to the newly rendered tickets
   document.querySelectorAll('.ticket-item').forEach(item => {
    item.addEventListener('click', (e) => {
     const id = e.currentTarget.getAttribute('data-ticket-id');
     loadTicket(e, id);
    });
   });
  }
 } catch (error) {
  ticketList.innerHTML = `<p class="text-danger">Error: ${error.message}</p>`;
 }
}

// Load Specific Ticket Thread
async function loadTicket(event, ticketId) {
 activeTicketId = ticketId;
 
 // Safely handle the event to highlight the active ticket
 const items = document.querySelectorAll('.ticket-item');
 items.forEach(item => item.classList.remove('active'));
 if (event && event.currentTarget) {
  event.currentTarget.classList.add('active');
 }
 
 // Show chat view on mobile
 const inboxLayout = document.querySelector('.inbox-layout');
 if (inboxLayout) inboxLayout.classList.add('show-detail');
 
 const chatHeader = document.getElementById('chat-title');
 const chatBody = document.getElementById('chat-body');
 const chatFooter = document.getElementById('chat-footer');
 
 if (chatHeader) chatHeader.textContent = `Loading Ticket #${ticketId}...`;
 if (chatBody) chatBody.innerHTML = '';
 if (chatFooter) chatFooter.style.display = 'none';
 
 try {
  // Call the Admin API endpoint
  const response = await api.getAdminTicketById(ticketId);
  const data = response.data || response;
  
  const ticket = data.ticket || data;
  const messages = data.messages || ticket.messages || [];
  
  if (chatHeader && ticket) {
   chatHeader.textContent = `${ticket.subject} ${ticket.requestType ? '— ' + ticket.requestType : ''}`;
  }
  
  if (chatBody && ticket) {
   let metaHtml = '<div style="margin-bottom: 15px; font-size: 12px; color: var(--text-secondary); border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">';
   if (ticket.username) metaHtml += `User: ${ticket.username}<br>`;
   if (ticket.orderId) metaHtml += `Order ID: ${ticket.orderId}<br>`;
   metaHtml += `Status: <span class="badge badge--${ticket.status === 'open' ? 'success' : 'muted'}">${ticket.status}</span><br>`;
   metaHtml += `Priority: ${ticket.priority || 'Medium'}`;
   metaHtml += '</div>';
   
   if (messages.length === 0) {
    chatBody.innerHTML = metaHtml + `<p class="text-muted">No messages yet. Send a reply below.</p>`;
   } else {
    // Admin view: messages from admin are right, user messages are left
    chatBody.innerHTML = metaHtml + messages.map(msg => `
          <div class="chat-message ${msg.isAdmin ? 'chat-message--right' : 'chat-message--left'}">
            <div class="avatar">${msg.isAdmin ? 'AD' : 'U'}</div>
            <div class="chat-content">${msg.message}</div>
          </div>
        `).join('');
    chatBody.scrollTop = chatBody.scrollHeight;
   }
  }
  
  // Admins can always reply
  if (chatFooter) {
   chatFooter.style.display = 'flex';
  }
 } catch (error) {
  showToast('Failed to load ticket details', 'error');
  console.error("Ticket Detail Error:", error);
 }
}

// Send Reply Function (Admin)
async function sendReply() {
 if (!activeTicketId) return showToast('Please select a ticket first', 'error');
 
 const textarea = document.getElementById('reply-input');
 if (!textarea) return;
 
 const message = textarea.value.trim();
 if (!message) return showToast('Please type a message first', 'error');
 
 const sendBtn = document.getElementById('send-reply-btn');
 if (sendBtn) {
  sendBtn.disabled = true;
  sendBtn.textContent = 'Sending...';
 }
 
 try {
  // Call the Admin API endpoint
  await api.replyAsAdmin(activeTicketId, message);
  showToast('Reply sent successfully!', 'success');
  textarea.value = '';
  loadTicket(null, activeTicketId); // Reload chat
 } catch (error) {
  showToast(error.message || 'Failed to send reply', 'error');
 } finally {
  if (sendBtn) {
   sendBtn.disabled = false;
   sendBtn.textContent = 'Send';
  }
 }
}