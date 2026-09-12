import { api } from '../utils/api.js';
import { $ } from '../utils/helpers.js';
import { formatCurrency, formatDate } from '../utils/formatter.js';
import { showToast } from '../components/toast.js';

export default async function initUsers() {
 const tbody = $('.datatable tbody');
 if (!tbody) return;
 
 try {
  const response = await api.getUsers();
  const users = response.data || [];
  
  if (users.length === 0) {
   tbody.innerHTML = `<tr><td colspan="8" class="text-center">No users found.</td></tr>`;
   return;
  }
  
  tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${formatCurrency(user.balance || 0)}</td>
                <td><span class="badge badge--${user.status === 'active' ? 'success' : 'danger'}">${user.status}</span></td>
                <td>${user.role}</td>
                <td>${formatDate(user.createdAt)}</td>
                <td>
                    <button class="btn btn--outline btn--sm" onclick="toggleUserStatus('${user.id}', '${user.status}')">
                        ${user.status === 'active' ? 'Suspend' : 'Activate'}
                    </button>
                </td>
            </tr>
        `).join('');
 } catch (error) {
  tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Failed to load users.</td></tr>`;
 }
}

window.toggleUserStatus = async (userId, currentStatus) => {
 const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
 try {
  await api.updateUserStatus(userId, newStatus);
  showToast(`User ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`, 'success');
  initUsers();
 } catch (error) {
  showToast('Failed to update user status', 'error');
 }
};