// ===============================================
// Suppliers Module
// ===============================================

import { api } from '../utils/api.js';
import { $ } from '../utils/helpers.js';
import { formatCurrency, formatDate } from '../utils/formatter.js';
import { showToast } from '../components/toast.js';

export default async function initSuppliers() {
 const tbody = $('.datatable tbody');
 if (!tbody) return;
 
 try {
  const response = await api.getSuppliers();
  const suppliers = response.data || response || [];
  
  if (suppliers.length === 0) {
   tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No suppliers found. Click "Add Supplier" to start.</td></tr>`;
   return;
  }
  
  tbody.innerHTML = suppliers.map(supplier => `
            <tr>
                <td>${supplier.name || 'Unknown'}</td>
                <td>${supplier.apiUrl ? `<a href="${supplier.apiUrl}" target="_blank" class="text-link">${supplier.apiUrl.substring(0, 30)}...</a>` : '-'}</td>
                <td>${formatCurrency(supplier.balance || 0)}</td>
                <td>${supplier.serviceCount || 0}</td>
                <td>${supplier.priority || 1}</td>
                <td><span class="badge badge--${supplier.status === 'active' ? 'success' : 'danger'}">${supplier.status || 'unknown'}</span></td>
                <td>${supplier.lastSync ? formatDate(supplier.lastSync) : 'Never'}</td>
                <td>
                    <button class="btn btn--outline btn--sm" onclick="checkBalance('${supplier.id}')">Check Balance</button>
                    <button class="btn btn--outline btn--sm" onclick="openSyncModal('${supplier.id}', '${supplier.name}')" style="margin-left: 5px;">Sync Selected</button>
                    <button class="btn btn--outline btn--sm" onclick="syncAllServices('${supplier.id}')" style="margin-left: 5px;">Sync All</button>
                    <button class="btn btn--danger btn--sm" onclick="deleteSupplier('${supplier.id}')" style="margin-left: 5px;">Delete</button>
                </td>
            </tr>
        `).join('');
 } catch (error) {
  tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Failed to load suppliers.</td></tr>`;
 }
}

// 1. Function to save the new supplier
async function saveSupplier(event) {
 event.preventDefault();
 
 const name = document.getElementById('supplierName').value;
 const apiUrl = document.getElementById('supplierApiUrl').value;
 const apiKey = document.getElementById('supplierApiKey').value;
 
 try {
  showToast('Adding supplier...', 'info');
  await api.addSupplier({ name, apiUrl, apiKey });
  showToast('Supplier added successfully!', 'success');
  
  document.querySelector('#addSupplierModal').classList.remove('active');
  document.getElementById('addSupplierForm').reset();
  initSuppliers();
 } catch (error) {
  showToast(error.message || 'Failed to add supplier', 'error');
 }
}

// 2. Sync ALL services function
async function syncAllServices(supplierId) {
 showToast('Syncing all services from supplier...', 'info');
 try {
  await api.syncSupplierServices(supplierId, { type: 'all' });
  showToast('All services synced successfully!', 'success');
  initSuppliers();
 } catch (error) {
  showToast('Failed to sync all services.', 'error');
 }
}

// 3. Open Sync Selected Modal & Fetch Live Categories
async function openSyncModal(supplierId, supplierName) {
 console.log('openSyncModal called for supplier:', supplierId);
 
 const modal = document.getElementById('syncServicesModal');
 const supplierIdInput = document.getElementById('syncSupplierId');
 const supplierNameEl = document.getElementById('syncSupplierName');
 const categorySelect = document.getElementById('syncCategory');
 
 if (!modal || !supplierIdInput) {
  console.error('Modal elements not found!');
  return;
 }
 
 supplierIdInput.value = supplierId;
 if (supplierNameEl) supplierNameEl.innerText = supplierName || 'Unknown Supplier';
 
 // Reset form fields
 const categoryRadio = document.querySelector('input[name="syncMethod"][value="category"]');
 if (categoryRadio) categoryRadio.checked = true;
 toggleSyncMethod('category');
 
 const serviceIdInput = document.getElementById('syncServiceId');
 if (serviceIdInput) serviceIdInput.value = '';
 
 // Fetch categories directly from external Supplier API
 if (categorySelect) {
  categorySelect.innerHTML = '<option value="">Loading categories...</option>';
  try {
   console.log('Fetching categories from backend...');
   const res = await api.getSupplierCategories(supplierId);
   console.log('Categories received:', res);
   
   const categories = res.data || [];
   
   if (categories.length > 0) {
    categorySelect.innerHTML = '<option value="">Select a category</option>';
    categories.forEach(cat => {
     categorySelect.innerHTML += `<option value="${cat}">${cat}</option>`;
    });
   } else {
    categorySelect.innerHTML = '<option value="">No categories found</option>';
   }
  } catch (err) {
   console.error('Failed to load categories:', err);
   categorySelect.innerHTML = '<option value="">Failed to load categories</option>';
  }
 }
 
 modal.classList.add('active');
}

// 4. Toggle Sync Method in Modal
function toggleSyncMethod(method) {
 const catGroup = document.getElementById('syncCategoryGroup');
 const idGroup = document.getElementById('syncServiceIdGroup');
 
 if (catGroup) catGroup.style.display = method === 'category' ? 'block' : 'none';
 if (idGroup) idGroup.style.display = method === 'service' ? 'block' : 'none';
}

// 5. Submit Selected Sync
async function submitSelectedSync() {
 const supplierId = document.getElementById('syncSupplierId').value;
 const method = document.querySelector('input[name="syncMethod"]:checked').value;
 
 let payload = {};
 
 if (method === 'category') {
  const category = document.getElementById('syncCategory').value;
  if (!category) {
   showToast('Please select a category.', 'error');
   return;
  }
  payload = { type: 'category', category };
 } else if (method === 'service') {
  const serviceId = document.getElementById('syncServiceId').value.trim();
  if (!serviceId) {
   showToast('Please enter a service ID.', 'error');
   return;
  }
  payload = { type: 'service', serviceId };
 }
 
 showToast('Syncing selected services...', 'info');
 
 try {
  await api.syncSupplierServices(supplierId, payload);
  showToast('Selected services synced successfully!', 'success');
  document.getElementById('syncServicesModal').classList.remove('active');
  initSuppliers();
 } catch (error) {
  showToast('Failed to sync selected services.', 'error');
 }
}

// 6. Check live balance function
async function checkBalance(supplierId) {
 try {
  showToast('Fetching live balance...', 'info');
  const res = await api.checkSupplierBalance(supplierId);
  showToast(`Live balance updated: $${res.data.balance}`, 'success');
  initSuppliers();
 } catch (error) {
  showToast('Failed to fetch balance. Check API Key/URL.', 'error');
 }
}

// 7. Delete supplier function
async function deleteSupplier(supplierId) {
 if (!confirm('Are you sure? This will permanently delete the supplier AND all of their synced services.')) return;
 
 try {
  showToast('Deleting supplier and services...', 'info');
  await api.deleteSupplier(supplierId);
  showToast('Supplier deleted successfully!', 'success');
  initSuppliers();
 } catch (error) {
  showToast('Failed to delete supplier.', 'error');
 }
}

// --- EXPOSE FUNCTIONS TO HTML ---
window.saveSupplier = saveSupplier;
window.syncAllServices = syncAllServices;
window.openSyncModal = openSyncModal;
window.toggleSyncMethod = toggleSyncMethod;
window.submitSelectedSync = submitSelectedSync;
window.checkBalance = checkBalance;
window.deleteSupplier = deleteSupplier;