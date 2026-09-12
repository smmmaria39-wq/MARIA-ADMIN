// ===============================================
// Admin Create Child Panel Module
// ===============================================

import { api } from '../utils/api.js';
import { showToast } from '../components/toast.js';

export default async function initCreatePanel() {
 const form = document.getElementById('createPanelForm');
 if (!form) return;
 
 form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const panelName = document.getElementById('panelName').value.trim();
  const ownerId = document.getElementById('ownerId').value.trim();
  const subdomain = document.getElementById('subdomain').value.toLowerCase().trim();
  const plan = document.getElementById('plan').value;
  
  if (!panelName || !ownerId || !subdomain) {
   return showToast('Please fill in all fields', 'error');
  }
  
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = 'Creating Panel...';
  
  try {
   // Call the admin API to create the panel
   const response = await api.adminCreateChildPanel({ panelName, ownerId, subdomain, plan });
   
   showToast('Child Panel created successfully!', 'success');
   
   // Redirect back to the list after 2 seconds
   setTimeout(() => {
    window.location.href = 'child-panels.html';
   }, 2000);
   
  } catch (error) {
   console.error('Creation failed:', error);
   showToast(error.message || 'Failed to create panel. Check if subdomain is unique.', 'error');
   submitBtn.disabled = false;
   submitBtn.innerHTML = originalText;
  }
 });
}