// assets/js/modules/admin-accounts.js

import { api } from '../utils/api.js';

console.log('[admin-accounts] module loaded');

async function initAdminAccountsPage() {
 console.log('[admin-accounts] initialization started');
 
 const tableBody = document.getElementById('adminAccountsTableBody');
 
 // Modal Elements
 const accountModal = document.getElementById('accountFormModal');
 const categoryModal = document.getElementById('categoryModal');
 const importModal = document.getElementById('importModal');
 
 // Buttons
 const addBtn = document.getElementById('openAddAccountModalBtn');
 const catBtn = document.getElementById('openCategoryModalBtn');
 const impBtn = document.getElementById('openImportModalBtn');
 
 // Diagnostic Logs
 console.log('[admin-accounts] Buttons check:', { addBtn, catBtn, impBtn });
 
 // Defensive Checks
 if (!addBtn) console.error('Missing #openAddAccountModalBtn');
 if (!catBtn) console.error('Missing #openCategoryModalBtn');
 if (!impBtn) console.error('Missing #openImportModalBtn');
 
 // Helper function to open modals using the architecture's .active class
 const openModal = (modal) => {
  if (modal) modal.classList.add('active');
 };
 
 // Helper function to close modals
 const closeModal = (modal) => {
  if (modal) modal.classList.remove('active');
 };
 
 // Attach Event Listeners safely
 if (addBtn) addBtn.addEventListener('click', () => {
  console.log('[admin-accounts] Add Account button clicked');
  openAccountModal();
 });
 
 if (catBtn) catBtn.addEventListener('click', () => {
  console.log('[admin-accounts] Manage Categories button clicked');
  openCategoryModal();
 });
 
 if (impBtn) impBtn.addEventListener('click', () => {
  console.log('[admin-accounts] Bulk Import button clicked');
  openModal(importModal);
 });
 
 // Close Listeners
 const closeAccBtn = document.getElementById('closeAccountModal');
 const closeCatBtn = document.getElementById('closeCategoryModal');
 const closeImpBtn = document.getElementById('closeImportModal');
 
 if (closeAccBtn) closeAccBtn.addEventListener('click', () => closeModal(accountModal));
 if (closeCatBtn) closeCatBtn.addEventListener('click', () => closeModal(categoryModal));
 if (closeImpBtn) closeImpBtn.addEventListener('click', () => closeModal(importModal));
 
 // Form Submits
 const accForm = document.getElementById('accountForm');
 const catForm = document.getElementById('categoryForm');
 const impBtnProcess = document.getElementById('processImportBtn');
 
 if (accForm) accForm.addEventListener('submit', handleAccountFormSubmit);
 if (catForm) catForm.addEventListener('submit', handleCategoryFormSubmit);
 if (impBtnProcess) impBtnProcess.addEventListener('click', handleBulkImport);
 
 // Initial Load
 try {
  await loadStats();
  await loadAccounts();
  await loadCategoriesDropdown();
 } catch (err) {
  console.error('[admin-accounts] initialization failed', err);
 }
 
 async function loadStats() {
  try {
   const res = await api.getAdminAccountStats();
   const stats = res.data || {};
   document.getElementById('statTotal').innerText = stats.total || 0;
   document.getElementById('statAvailable').innerText = stats.available || 0;
   document.getElementById('statSold').innerText = stats.sold || 0;
   document.getElementById('statReserved').innerText = stats.reserved || 0;
  } catch (err) {
   console.error('Failed to load stats', err);
  }
 }
 
 async function loadAccounts() {
  if (!tableBody) return;
  tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Loading...</td></tr>';
  try {
   const res = await api.getAdminAccounts();
   const accounts = res.data || [];
   
   tableBody.innerHTML = '';
   if (accounts.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No accounts found.</td></tr>';
    return;
   }
   
   accounts.forEach(acc => {
    const row = document.createElement('tr');
    row.innerHTML = `
                    <td>${acc.id.substring(0, 8)}...</td>
                    <td>${acc.platform}</td>
                    <td>@${acc.username}</td>
                    <td>${parseInt(acc.followers || 0).toLocaleString()}</td>
                    <td>$${parseFloat(acc.price || 0).toFixed(2)}</td>
                    <td><span class="status-badge status-badge--${acc.status || 'disabled'}">${acc.status || 'N/A'}</span></td>
                    <td>
                        <button class="btn btn--outline btn--sm edit-btn" data-id="${acc.id}">Edit</button>
                        <button class="btn btn--danger btn--sm delete-btn" data-id="${acc.id}">Delete</button>
                    </td>
                `;
    tableBody.appendChild(row);
   });
   
   document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', (e) => openAccountModal(e.target.getAttribute('data-id'))));
   document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', (e) => deleteAccount(e.target.getAttribute('data-id'))));
   
  } catch (err) {
   console.error('Failed to load accounts:', err);
   tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Failed to load accounts.</td></tr>';
  }
 }
 
 async function loadCategoriesDropdown() {
  try {
   const res = await api.getAdminAccountCategories();
   const categories = res.data || [];
   const dropdown = document.getElementById('accountCategoryId');
   if (dropdown) {
    dropdown.innerHTML = '<option value="">Select Category</option>';
    categories.forEach(cat => {
     dropdown.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
    });
   }
  } catch (err) {
   console.error('Failed to load categories for dropdown', err);
  }
 }
 
 async function openAccountModal(accountId = null) {
  const form = document.getElementById('accountForm');
  if (!form) {
   console.error('Missing #accountForm');
   return;
  }
  form.reset();
  
  if (accountId) {
   document.getElementById('accountModalTitle').innerText = 'Edit Account';
   document.getElementById('accountId').value = accountId;
   
   try {
    const res = await api.getAccountDetails(accountId);
    const acc = res.data;
    document.getElementById('accountCategoryId').value = acc.categoryId || '';
    document.getElementById('accountPlatform').value = acc.platform || '';
    document.getElementById('accountUsername').value = acc.username || '';
    document.getElementById('accountFollowers').value = acc.followers || '';
    document.getElementById('accountPrice').value = acc.price || '';
    document.getElementById('accountPassword').value = acc.accountPassword || '';
    document.getElementById('accountEmail').value = acc.email || '';
    document.getElementById('accountEmailPassword').value = acc.emailPassword || '';
   } catch (err) {
    console.error('Failed to fetch account details:', err);
    alert('Failed to fetch account details for editing.');
   }
  } else {
   document.getElementById('accountModalTitle').innerText = 'Add New Account';
   document.getElementById('accountId').value = '';
  }
  openModal(accountModal);
 }
 
 async function handleAccountFormSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('accountId').value;
  const data = {
   categoryId: document.getElementById('accountCategoryId').value,
   platform: document.getElementById('accountPlatform').value,
   username: document.getElementById('accountUsername').value,
   followers: parseInt(document.getElementById('accountFollowers').value),
   price: parseFloat(document.getElementById('accountPrice').value),
   accountPassword: document.getElementById('accountPassword').value,
   email: document.getElementById('accountEmail').value,
   emailPassword: document.getElementById('accountEmailPassword').value
  };
  
  try {
   if (id) {
    await api.updateAdminAccount(id, data);
    alert('Account updated successfully!');
   } else {
    await api.createAdminAccount(data);
    alert('Account added successfully!');
   }
   closeModal(accountModal);
   await loadAccounts();
   await loadStats();
  } catch (err) {
   alert(`Error: ${err.message}`);
  }
 }
 
 async function deleteAccount(id) {
  if (!confirm('Are you sure you want to delete this account?')) return;
  try {
   await api.deleteAdminAccount(id);
   alert('Account deleted.');
   await loadAccounts();
   await loadStats();
  } catch (err) {
   alert(`Error: ${err.message}`);
  }
 }
 
 async function openCategoryModal() {
  openModal(categoryModal);
  await loadCategoryList();
 }
 
 // SINGLE, CORRECT loadCategoryList function
 async function loadCategoryList() {
  const list = document.getElementById('categoryList');
  if (!list) return;
  
  try {
   // Using the admin endpoint specifically
   const res = await api.getAdminAccountCategories();
   const categories = res.data || [];
   
   list.innerHTML = '';
   if (categories.length === 0) {
    list.innerHTML = '<p class="text-center text-muted">No categories found. Add one above!</p>';
    return;
   }
   
   categories.forEach(cat => {
    const item = document.createElement('div');
    item.className = 'category-list-item';
    item.innerHTML = `<span>${cat.name} (${cat.platform})</span>`;
    list.appendChild(item);
   });
  } catch (err) {
   console.error('Failed to load categories:', err);
   list.innerHTML = `<p class="text-danger">Error: ${err.message}</p>`;
  }
 }
 
 async function handleCategoryFormSubmit(e) {
  e.preventDefault();
  const data = {
   name: document.getElementById('categoryName').value,
   platform: document.getElementById('categoryPlatform').value
  };
  try {
   await api.createAdminCategory(data);
   document.getElementById('categoryForm').reset();
   await loadCategoryList();
   await loadCategoriesDropdown();
  } catch (err) {
   alert(`Error: ${err.message}`);
  }
 }
 
 async function handleBulkImport() {
  const jsonText = document.getElementById('importJsonTextarea').value;
  try {
   const data = JSON.parse(jsonText);
   if (!Array.isArray(data)) throw new Error('Input must be a JSON array.');
   
   await api.importAdminAccounts(data);
   alert(`${data.length} accounts imported successfully!`);
   closeModal(importModal);
   await loadAccounts();
   await loadStats();
  } catch (err) {
   alert(`Invalid JSON or API Error: ${err.message}`);
  }
 }
}

export default initAdminAccountsPage;