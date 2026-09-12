// ===============================================
// Admin Wallets Module
// ===============================================

import { api } from '../utils/api.js';
import { $ } from '../utils/helpers.js';
import { formatCurrency } from '../utils/formatter.js';
import { showToast } from '../components/toast.js';

let activeUserId = null; // Stores the ID of the user we are adjusting

export default async function initWallets() {
 const tbody = $('.datatable tbody');
 if (!tbody) return;
 
 try {
  const response = await api.getUsers();
  const users = response.data || response || [];
  
  if (users.length === 0) {
   tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No user wallets found.</td></tr>`;
   return;
  }
  
  tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.username || user.email}</td>
                <td>${formatCurrency(user.balance || 0)}</td>
                <td>${formatCurrency(user.deposits || 0)}</td> 
                <td>${formatCurrency(user.spent || 0)}</td>
                <td>${formatCurrency(user.refunds || 0)}</td> 
                <td>
                    <button class="btn btn--outline btn--sm" onclick="openAdjustModal('${user.id}')">Adjust Balance</button>
                </td>
            </tr>
        `).join('');
  
 } catch (error) {
  tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Failed to load wallet data.</td></tr>`;
  console.error('Failed to load wallets:', error);
 }
}

// 1. Opens the modal and saves which user we are editing
function openAdjustModal(userId) {
 activeUserId = userId;
 const modal = document.getElementById('adjustWalletModal');
 if (modal) {
  modal.classList.add('active'); // Opens the modal
 } else {
  alert('Modal missing from HTML!');
 }
}

// 2. Submits the adjustment to the backend
async function saveWalletAdjust(event) {
 event.preventDefault();
 
 if (!activeUserId) {
  showToast('No user selected.', 'error');
  return;
 }
 
 const amount = parseFloat(document.getElementById('adjustAmount').value);
 const action = document.getElementById('adjustAction').value; // 'add' or 'subtract'
 const note = document.getElementById('adjustNote').value;
 
 try {
  showToast('Updating balance...', 'info');
  // Call the new API function
  await api.adjustWallet(activeUserId, amount, action, note);
  
  showToast('Balance updated successfully!', 'success');
  
  // Close modal and reset form
  document.getElementById('adjustWalletModal').classList.remove('active');
  document.getElementById('adjustWalletForm').reset();
  activeUserId = null;
  
  // Reload the table to show new balance
  initWallets();
 } catch (error) {
  showToast(error.message || 'Failed to adjust balance', 'error');
 }
}

// Expose to window for HTML buttons
window.openAdjustModal = openAdjustModal;
window.saveWalletAdjust = saveWalletAdjust;