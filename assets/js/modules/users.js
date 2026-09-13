import { api } from '../utils/api.js';
import { $ } from '../utils/helpers.js';
import { formatCurrency, formatDate } from '../utils/formatter.js';
import { showToast } from '../components/toast.js';

// FIX: Store users in module scope to allow client-side search/filtering without re-fetching
let allUsers = [];

export default async function initUsers() {
  const tbody = $('.datatable tbody');
  if (!tbody) return;
  
  try {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center">Loading users...</td></tr>`;
    const response = await api.getUsers();
    allUsers = response.data || [];
    renderUsers(allUsers);
    
    // FIX: Attach event listeners for search and filter
    const searchInput = $('#user-search');
    const statusFilter = $('#status-filter');
    
    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (statusFilter) statusFilter.addEventListener('change', applyFilters);
    
  } catch (error) {
    console.error('Error loading users:', error);
    tbody.innerHTML = `<tr><td colspan="10" class="text-center text-danger">Failed to load users.</td></tr>`;
  }
}

// FIX: Dedicated render function
function renderUsers(usersToRender) {
  const tbody = $('.datatable tbody');
  if (!tbody) return;
  
  if (usersToRender.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center">No users found.</td></tr>`;
    return;
  }
  
  tbody.innerHTML = usersToRender.map(user => {
    // FIX: Robust fallbacks for phone number and account ID to prevent crashes
    const phone = user.phoneNumber || user.phone || '';
    const cleanPhone = phone ? phone.replace(/\s+/g, '').replace(/^\+/, '') : '';
    const waLink = cleanPhone ? `https://wa.me/${cleanPhone}` : '#';
    const phoneHtml = cleanPhone 
      ? `<a href="${waLink}" target="_blank" style="color: var(--primary-color); text-decoration: none;">${phone}</a>` 
      : 'N/A';
      
    const accountId = user.accountId || user.account_id || 'N/A';
    const status = user.status || 'active';
    const role = user.role || 'user';
    const balance = user.balance || 0;
    const createdAt = user.createdAt || null;
    
    // FIX: Exactly 10 <td> elements to match the 10 <th> elements in HTML
    return `
      <tr>
        <td>${user.id || 'N/A'}</td>
        <td>${user.username || 'N/A'}</td>
        <td>${user.email || 'N/A'}</td>
        <td>${phoneHtml}</td>
        <td>${accountId}</td>
        <td>${formatCurrency(balance)}</td>
        <td><span class="badge badge--${status === 'active' ? 'success' : 'danger'}">${status}</span></td>
        <td>${role}</td>
        <td>${formatDate(createdAt)}</td>
        <td>
          <button class="btn btn--outline btn--sm" onclick="toggleUserStatus('${user.id}', '${status}')">
            ${status === 'active' ? 'Suspend' : 'Activate'}
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// FIX: Client-side filter logic
function applyFilters() {
  const searchInput = $('#user-search');
  const statusFilter = $('#status-filter');
  
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
  const statusValue = statusFilter ? statusFilter.value : 'all';
  
  const filtered = allUsers.filter(user => {
    const matchesSearch = !searchTerm || 
      (user.username && user.username.toLowerCase().includes(searchTerm)) ||
      (user.email && user.email.toLowerCase().includes(searchTerm)) ||
      (user.id && user.id.toLowerCase().includes(searchTerm)) ||
      (user.accountId && String(user.accountId).toLowerCase().includes(searchTerm)) ||
      (user.phoneNumber && user.phoneNumber.toLowerCase().includes(searchTerm));
      
    const matchesStatus = statusValue === 'all' || user.status === statusValue;
    
    return matchesSearch && matchesStatus;
  });
  
  renderUsers(filtered);
}

window.toggleUserStatus = async (userId, currentStatus) => {
  const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
  try {
    await api.updateUserStatus(userId, newStatus);
    showToast(`User ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`, 'success');
    
    // FIX: Update local state and re-render to preserve search/filter context
    const userIndex = allUsers.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      allUsers[userIndex].status = newStatus;
    }
    applyFilters(); 
  } catch (error) {
    showToast('Failed to update user status', 'error');
  }
};
