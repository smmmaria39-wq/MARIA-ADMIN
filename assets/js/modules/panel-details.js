// ===============================================
// Admin Panel Details Module
// ===============================================

import { api } from '../utils/api.js';
import { formatCurrency } from '../utils/formatter.js';
import { showToast } from '../components/toast.js';

export default async function initPanelDetails() {
 const urlParams = new URLSearchParams(window.location.search);
 const panelId = urlParams.get('id');
 
 if (!panelId) {
  window.location.href = 'child-panels.html';
  return;
 }
 
 const titleEl = document.getElementById('panelTitle');
 const statStatus = document.getElementById('statStatus');
 const statUsers = document.getElementById('statUsers');
 const statOrders = document.getElementById('statOrders');
 const statBalance = document.getElementById('statBalance');
 const suspendBtn = document.getElementById('suspendBtn');
 
 try {
  const response = await api.getChildPanelDetails(panelId);
  const panel = response.data || {};
  
  // Populate Stats
  if (titleEl) titleEl.textContent = panel.info?.panelName || 'Panel Details';
  if (statStatus) {
   statStatus.innerHTML = `<span class="badge badge--${panel.info?.status === 'active' ? 'success' : 'danger'}">${panel.info?.status}</span>`;
  }
  if (statUsers) statUsers.textContent = panel.statistics?.totalUsers || 0;
  if (statOrders) statOrders.textContent = panel.statistics?.totalOrders || 0;
  if (statBalance) statBalance.textContent = formatCurrency(panel.info?.balance || 0);
  
  // Setup Suspend/Activate Button
  if (suspendBtn) {
   const isSuspended = panel.info?.status === 'suspended';
   suspendBtn.textContent = isSuspended ? 'Activate' : 'Suspend';
   suspendBtn.classList.toggle('btn--danger', !isSuspended);
   suspendBtn.classList.toggle('btn--success', isSuspended);
   
   suspendBtn.addEventListener('click', async () => {
    try {
     const newStatus = isSuspended ? 'active' : 'suspended';
     await api.updateChildPanelStatus(panelId, newStatus);
     showToast(`Panel ${newStatus} successfully!`, 'success');
     setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
     showToast('Failed to update panel status', 'error');
    }
   });
  }
  
 } catch (error) {
  console.error('Failed to load panel details:', error);
  showToast('Panel not found', 'error');
  setTimeout(() => window.location.href = 'child-panels.html', 2000);
 }
}