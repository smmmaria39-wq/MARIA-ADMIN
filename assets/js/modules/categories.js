// ===============================================
// Admin Categories Module
// ===============================================

import { api } from '../utils/api.js';
import { $ } from '../utils/helpers.js';
import { showToast } from '../components/toast.js';

let allServices = [];

export default async function initCategories() {
 const tbody = $('.datatable tbody');
 const searchInput = $('#catSearchInput');
 const supplierFilter = $('#supplierFilter');
 
 if (!tbody) return;
 
 // Attach event listeners for filtering
 if (searchInput) searchInput.addEventListener('input', renderTable);
 if (supplierFilter) supplierFilter.addEventListener('change', renderTable);
 
 try {
  // Fetch both categories and services simultaneously
  const [catRes, servRes] = await Promise.all([
   api.getCategories(),
   api.getServices()
  ]);
  
  let categories = catRes.data || catRes || [];
  allServices = servRes.data || servRes || [];
  
  // Store categories globally for the renderTable function to use
  window._adminCategories = categories;
  
  // Populate Supplier Dropdown
  if (supplierFilter) {
   const suppliers = [...new Set(allServices.map(s => s.supplierId || 'Unknown'))];
   supplierFilter.innerHTML = '<option value="">All Suppliers</option>';
   suppliers.forEach(sup => {
    const option = document.createElement('option');
    option.value = sup;
    option.textContent = sup.substring(0, 8) + '...';
    supplierFilter.appendChild(option);
   });
  }
  
  renderTable();
  
 } catch (error) {
  tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Failed to load categories.</td></tr>`;
 }
}

// Function to filter and render the table
function renderTable() {
 const tbody = $('.datatable tbody');
 const searchInput = $('#catSearchInput');
 const supplierFilter = $('#supplierFilter');
 
 const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
 const selectedSupplier = supplierFilter ? supplierFilter.value : '';
 
 let categories = window._adminCategories || [];
 
 // Filter out "Uncategorized"
 categories = categories.filter(cat => (cat.name || 'Uncategorized').toLowerCase() !== 'uncategorized');
 
 // Apply Search Filter
 let filteredCats = categories.filter(cat => {
  const rawName = cat.name || 'Uncategorized';
  return rawName.toLowerCase().includes(searchTerm);
 });
 
 // Apply Supplier Filter
 if (selectedSupplier) {
  filteredCats = filteredCats.filter(cat => {
   // Check if any service in this category belongs to the selected supplier
   return allServices.some(s => s.category === cat.name && s.supplierId === selectedSupplier);
  });
 }
 
 if (filteredCats.length === 0) {
  tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No categories match your filters.</td></tr>`;
  return;
 }
 
 tbody.innerHTML = filteredCats.map(cat => {
  const rawName = cat.name || 'Uncategorized';
  const encodedName = encodeURIComponent(rawName);
  
  return `
      <tr>
        <td style="font-weight: 600; color: var(--color-gold);">
          ${rawName}
        </td>
        <td>${cat.serviceCount || 0}</td>
        <td><span class="badge badge--success">Visible</span></td>
        <td>${cat.sortOrder || 0}</td>
        <td style="display: flex; gap: 8px;">
          <button class="btn btn--primary btn--sm" onclick="viewServicesInCategory('${encodedName}')">View</button>
          <button class="btn btn--outline btn--sm" onclick="editCategory('${encodedName}', '${encodedName}')">Edit</button>
          <button class="btn btn--danger btn--sm" onclick="deleteCategory('${encodedName}', '${encodedName}')">Delete</button>
        </td>
      </tr>
    `;
 }).join('');
}

// --- Modal Functions ---
window.viewServicesInCategory = (encodedName) => {
 const modal = document.getElementById('catServicesModal');
 const modalBody = document.getElementById('catModalBody');
 const modalTitle = document.getElementById('catModalTitle');
 const catName = decodeURIComponent(encodedName);
 
 if (!modal) return alert('Modal element not found!');
 
 modal.style.display = 'flex';
 modalTitle.textContent = `Services in: ${catName}`;
 
 // Filter services locally (instant load)
 const servicesInCat = allServices.filter(s => s.category === catName);
 
 if (servicesInCat.length === 0) {
  modalBody.innerHTML = `<p class="text-center text-muted">No services found in this category.</p>`;
  return;
 }
 
 modalBody.innerHTML = servicesInCat.map(s => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border-color);">
      <div>
        <p style="font-weight: 600; margin: 0;">${s.name}</p>
        <small style="color: var(--text-secondary);">ID: ${s.supplierServiceId || s.id.substring(0,8)}</small>
      </div>
      <button class="btn btn--danger btn--sm" onclick="deleteService('${s.id}', this)">Delete</button>
    </div>
  `).join('');
};

window.closeCatModal = () => {
 const modal = document.getElementById('catServicesModal');
 if (modal) modal.style.display = 'none';
};

// --- Category Functions ---
window.editCategory = async (encodedId, encodedCurrentName) => {
 const currentName = decodeURIComponent(encodedCurrentName);
 const newName = window.prompt('Enter new category name:', currentName);
 
 if (newName === null || newName.trim() === '') return;
 
 try {
  showToast('Updating category...', 'info');
  await api.updateCategory(encodedId, { name: newName.trim() });
  showToast('Category updated successfully!', 'success');
  initCategories();
 } catch (error) {
  showToast(error.message || 'Failed to update category', 'error');
 }
};

window.deleteCategory = async (encodedId, encodedName) => {
 const name = decodeURIComponent(encodedName);
 
 if (window.confirm(`Are you sure you want to delete "${name}"? ALL SERVICES IN THIS CATEGORY WILL BE PERMANENTLY DELETED.`)) {
  try {
   showToast('Deleting category and services...', 'info');
   await api.deleteCategory(encodedId);
   showToast('Category deleted successfully!', 'success');
   initCategories();
  } catch (error) {
   showToast(error.message || 'Failed to delete category', 'error');
  }
 }
};

// --- Service Delete Function ---
window.deleteService = async (serviceId, btn) => {
 if (window.confirm('Are you sure you want to permanently delete this service?')) {
  try {
   btn.disabled = true;
   btn.innerText = 'Deleting...';
   await api.deleteService(serviceId);
   
   // Remove from local array so it disappears instantly
   allServices = allServices.filter(s => s.id !== serviceId);
   btn.parentElement.remove(); // Remove from modal list
   
   showToast('Service deleted successfully!', 'success');
  } catch (error) {
   showToast(error.message || 'Failed to delete service', 'error');
   btn.disabled = false;
   btn.innerText = 'Delete';
  }
 }
};