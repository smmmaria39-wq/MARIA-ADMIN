import { api } from '../utils/api.js';
import { $ } from '../utils/helpers.js';
import { formatCurrency } from '../utils/formatter.js';
import { showToast } from '../components/toast.js';

let allServices = [];
let filteredServices = []; 
let displayCount = 0;
const BATCH_SIZE = 20; 
let isLoading = false;
let sentinelObserver = null;

let ugxRate = 3800; 
let pendingChanges = {}; 

// Inject CSS for the inline price editor dynamically
const editorStyles = document.createElement('style');
editorStyles.innerHTML = `
    .price-editor { display: flex; align-items: center; gap: 4px; }
    .price-input-sm { width: 70px; padding: 4px 6px; border: 1px solid var(--border-color); border-radius: 4px; text-align: center; background: var(--bg-input); color: var(--text-primary); font-weight: 600; font-size: 13px; }
    .price-input-sm:focus { outline: none; border-color: var(--color-gold); }
    .btn-icon-sm { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-weight: bold; font-size: 14px; transition: all 0.2s; }
    .btn-icon-sm:hover { background: var(--color-gold); color: #fff; border-color: var(--color-gold); }
    .save-changes-btn { animation: pulse-gold 2s infinite; }
    @keyframes pulse-gold { 0% { box-shadow: 0 0 0 0 rgba(245, 166, 35, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(245, 166, 35, 0); } 100% { box-shadow: 0 0 0 0 rgba(245, 166, 35, 0); } }
    .charge-ugx { display: block; font-size: 11px; color: var(--text-secondary); margin-top: 2px; }
    #sentinel { visibility: hidden; }
    .table-loader { text-align: center; padding: 20px; color: var(--text-secondary); }
    
    /* Bulk Markup Tool Styling */
    .bulk-markup-container {
        display: flex; align-items: center; gap: 8px; 
        background: var(--bg-input); padding: 6px 12px; 
        border-radius: 8px; border: 1px solid var(--border-color);
        margin-right: 10px;
    }
    .bulk-markup-container span { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
`;
document.head.appendChild(editorStyles);

// Fetch live exchange rate
async function fetchLiveExchangeRate() {
 try {
  const response = await fetch('https://open.er-api.com/v6/latest/USD');
  const data = await response.json();
  if (data && data.rates && data.rates.UGX) {
   ugxRate = data.rates.UGX;
  }
 } catch (error) {
  console.warn('Failed to fetch live exchange rate, using fallback UGX rate.');
 }
}

// Setup the Bulk Markup UI in the top page header
function setupBulkMarkupTool() {
    const actionsDiv = document.querySelector('.page-actions');
    if (!actionsDiv || document.getElementById('bulkMarkupContainer')) return;

    const bulkHTML = `
        <div id="bulkMarkupContainer" class="bulk-markup-container">
            <span>Bulk Markup %:</span>
            <input type="number" id="bulkMarkupInput" class="form-input form-input--sm" placeholder="e.g. 20" min="-100" step="1" style="width: 80px;">
            <button class="btn btn--primary btn--sm" id="applyBulkMarkupBtn">Calculate & Apply</button>
        </div>
    `;
    
    // Insert at the beginning of the actions div (left of Save Changes button)
    actionsDiv.insertAdjacentHTML('afterbegin', bulkHTML);

    document.getElementById('applyBulkMarkupBtn').addEventListener('click', () => {
        const percInput = document.getElementById('bulkMarkupInput');
        const perc = parseFloat(percInput.value);
        
        if (isNaN(perc)) {
            return showToast('Please enter a valid percentage number (e.g., 20)', 'error');
        }

        if (filteredServices.length === 0) {
            return showToast('No services match the current filter to update.', 'error');
        }

        showToast(`Calculating ${perc}% markup for ${filteredServices.length} services...`, 'info');

        filteredServices.forEach(service => {
            const cost = parseFloat(service.costPrice || 0);
            // If perc is 20, newPrice = cost * 1.20
            // If perc is -10, newPrice = cost * 0.90
            const newPrice = parseFloat((cost * (1 + perc / 100)).toFixed(2));
            
            // Update local master array so infinite scroll keeps the new price
            const idx = allServices.findIndex(s => s.id === service.id);
            if (idx !== -1) allServices[idx].sellingPrice = newPrice;

            // Add to pending changes
            pendingChanges[service.id] = newPrice;

            // Update the DOM input instantly if it's currently visible
            const priceInput = document.getElementById(`price-${service.id}`);
            if (priceInput) {
                priceInput.value = newPrice;
                window.updateUgx(service.id, newPrice);
            }
        });

        toggleSaveButton();
        showToast(`Applied ${perc}% markup. Click "Save Changes" to commit to database!`, 'success');
    });
}

export default async function initServices() {
 const tbody = $('.datatable tbody');
 if (!tbody) return;
 
 // 1. Attach event listeners for searching and filtering
 const searchInput = document.querySelector('input[placeholder="Search services..."]');
 const categoryFilter = document.getElementById('categoryFilter');
 const supplierFilter = document.getElementById('supplierFilter');
 
 if (searchInput) searchInput.addEventListener('input', filterServices);
 if (categoryFilter) categoryFilter.addEventListener('change', filterServices);
 if (supplierFilter) supplierFilter.addEventListener('change', filterServices);
 
 // 2. Setup Infinite Scroll Observer
 if (sentinelObserver) sentinelObserver.disconnect();
 sentinelObserver = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting && !isLoading) {
   loadMore();
  }
 }, { rootMargin: '200px' });

 // 3. Fetch Fresh Data from Backend (and live exchange rate)
 try {
  const [response] = await Promise.all([
   api.getServices(),
   fetchLiveExchangeRate()
  ]);
  
  allServices = response.data || response || [];
  
  if (allServices.length === 0) {
   tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted">No services found. Sync services from a supplier to import them.</td></tr>`;
   return;
  }
  
  // 4. Populate the filter dropdowns & Setup Bulk Tool
  populateFilters();
  setupBulkMarkupTool();
  
  // 5. Render the initial table
  filterServices();
  
 } catch (error) {
  tbody.innerHTML = `<tr><td colspan="10" class="text-center text-danger">Failed to load services.</td></tr>`;
  console.error('Failed to load services:', error);
 }
}

// Function to populate dropdowns dynamically
function populateFilters() {
 const categories = [...new Set(allServices.map(s => s.category || 'Uncategorized'))];
 const suppliers = [...new Set(allServices.map(s => s.supplierId || 'Unknown'))];
 
 const catSelect = document.getElementById('categoryFilter');
 const supSelect = document.getElementById('supplierFilter');
 
 if(!catSelect || !supSelect) return;
 
 catSelect.innerHTML = '<option value="">All Categories</option>';
 supSelect.innerHTML = '<option value="">All Suppliers</option>';
 
 categories.forEach(cat => {
  const option = document.createElement('option');
  option.value = cat;
  option.textContent = cat;
  catSelect.appendChild(option);
 });
 
 suppliers.forEach(sup => {
  const option = document.createElement('option');
  option.value = sup;
  option.textContent = sup.substring(0, 8) + '...'; 
  supSelect.appendChild(option);
 });
}

// Function to filter and render the table
function filterServices() {
 const searchInput = document.querySelector('input[placeholder="Search services..."]');
 const categoryFilter = document.getElementById('categoryFilter');
 const supplierFilter = document.getElementById('supplierFilter');
 
 const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
 const selectedCategory = categoryFilter ? categoryFilter.value : '';
 const selectedSupplier = supplierFilter ? supplierFilter.value : '';
 
 filteredServices = allServices.filter(service => {
  const matchesName = service.name?.toLowerCase().includes(searchTerm);
  const matchesId = service.id?.toLowerCase().includes(searchTerm);
  const matchesSupplierId = service.supplierServiceId?.toString().includes(searchTerm);
  const matchesSearch = matchesName || matchesId || matchesSupplierId;
  
  const matchesCategory = !selectedCategory || (service.category || 'Uncategorized') === selectedCategory;
  const matchesSupplier = !selectedSupplier || (service.supplierId || 'Unknown') === selectedSupplier;
  
  return matchesSearch && matchesCategory && matchesSupplier;
 });
 
 displayCount = BATCH_SIZE; 
 renderServices(true); 
}

// Function to render services in batches
function renderServices(isFresh = false) {
 const tbody = $('.datatable tbody');
 
 if (filteredServices.length === 0) {
  tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted">No services match your search.</td></tr>`;
  return;
 }
 
 if (isFresh) {
  tbody.innerHTML = '';
 }
 
 const startIndex = isFresh ? 0 : displayCount - BATCH_SIZE;
 const batch = filteredServices.slice(startIndex, displayCount);
 
 const cardsHTML = batch.map(service => {
  const costUgx = (service.costPrice * ugxRate).toLocaleString(undefined, { maximumFractionDigits: 0 });
  const sellingUgx = (service.sellingPrice * ugxRate).toLocaleString(undefined, { maximumFractionDigits: 0 });
  
  return `
   <tr>
    <td>${service.id ? service.id.substring(0, 8) : 'N/A'}</td>
    <td>${service.name || 'Unknown'}</td>
    <td><span style="font-weight: 600; color: var(--color-gold);">${service.supplierServiceId || 'N/A'}</span></td>
    <td>${service.category || 'Uncategorized'}</td>
    <td>${service.supplierId ? service.supplierId.substring(0, 8) + '...' : 'N/A'}</td>
    <td>
     ${formatCurrency(service.costPrice || 0)}
     <span class="charge-ugx">UGX ${costUgx}</span>
    </td>
    <td>
     <div class="price-editor">
      <button class="btn-icon-sm" onclick="adjustPrice('${service.id}', -0.10)">-</button>
      <input type="number" step="0.10" value="${service.sellingPrice}" id="price-${service.id}" oninput="updateUgx('${service.id}', this.value)" onchange="queuePriceChange('${service.id}', this.value)" class="price-input-sm">
      <button class="btn-icon-sm" onclick="adjustPrice('${service.id}', 0.10)">+</button>
     </div>
     <span class="charge-ugx" id="ugx-${service.id}">UGX ${sellingUgx}</span>
    </td>
    <td>${service.min || 0} / ${service.max?.toLocaleString() || 0}</td>
    <td><span class="badge badge--${service.status === 'active' ? 'success' : 'danger'}">${service.status || 'unknown'}</span></td>
    <td>
     <button class="btn btn--outline btn--sm" onclick="toggleStatus('${service.id}', '${service.status}')">Toggle Status</button>
    </td>
   </tr>
  `;
 }).join('');
 
 tbody.insertAdjacentHTML('beforeend', cardsHTML);
 
 // Infinite Scroll Logic
 let sentinel = document.getElementById('sentinel');
 if (displayCount < filteredServices.length) {
  if (!sentinel) {
   sentinel = document.createElement('tr');
   sentinel.id = 'sentinel';
   sentinel.innerHTML = '<td colspan="10" class="table-loader">Loading more services...</td>';
   tbody.appendChild(sentinel);
  }
  sentinelObserver.unobserve(sentinel);
  sentinelObserver.observe(sentinel);
 } else if (sentinel) {
  sentinelObserver.unobserve(sentinel);
  sentinel.remove();
 }
}

// Function to load next batch
function loadMore() {
 if (displayCount >= filteredServices.length) return;
 isLoading = true;
 displayCount += BATCH_SIZE;
 renderServices(false);
 isLoading = false;
}

// --- INLINE PRICE EDITING LOGIC ---

window.adjustPrice = (serviceId, delta) => {
 const input = document.getElementById(`price-${serviceId}`);
 if (!input) return;
 let currentVal = parseFloat(input.value) || 0;
 currentVal += delta;
 if (currentVal < 0) currentVal = 0; 
 input.value = currentVal.toFixed(2);
 
 window.updateUgx(serviceId, currentVal);
 queuePriceChange(serviceId, currentVal);
}

window.updateUgx = (serviceId, val) => {
 const ugxEl = document.getElementById(`ugx-${serviceId}`);
 if (ugxEl) {
  const ugxVal = (parseFloat(val) * ugxRate).toLocaleString(undefined, { maximumFractionDigits: 0 });
  ugxEl.textContent = `UGX ${ugxVal}`;
 }
}

window.queuePriceChange = (serviceId, newPrice) => {
 pendingChanges[serviceId] = parseFloat(newPrice);
 toggleSaveButton();
}

function toggleSaveButton() {
 const actionsDiv = document.querySelector('.page-actions');
 if (!actionsDiv) return;
 
 const existingBtn = document.getElementById('bulkSaveBtn');
 
 if (Object.keys(pendingChanges).length > 0) {
  if (!existingBtn) {
   const saveBtn = document.createElement('button');
   saveBtn.id = 'bulkSaveBtn';
   saveBtn.className = 'btn btn--success save-changes-btn';
   saveBtn.innerHTML = `Save Changes (${Object.keys(pendingChanges).length})`;
   saveBtn.onclick = saveAllChanges;
   actionsDiv.appendChild(saveBtn);
  } else {
   existingBtn.innerHTML = `Save Changes (${Object.keys(pendingChanges).length})`;
   existingBtn.disabled = false; // Ensure it's clickable if previously disabled
  }
 } else {
  if (existingBtn) existingBtn.remove();
 }
}

// --- BULK SAVE (Sends ALL changes in 1 single request to prevent rate limiting) ---
async function saveAllChanges() {
 const keys = Object.keys(pendingChanges);
 if (keys.length === 0) return;
 
 const saveBtn = document.getElementById('bulkSaveBtn');
 if (saveBtn) {
  saveBtn.disabled = true;
  saveBtn.innerHTML = `Saving ${keys.length} changes...`;
 }
 
 // Convert the pendingChanges object into an array for the backend
 const updatesArray = keys.map(id => ({
   id: id,
   sellingPrice: pendingChanges[id]
 }));
 
 try {
  // Send ONE single request to the bulk update endpoint
  await api.bulkUpdateServices(updatesArray);
  
  // Update local master array to reflect saved data
  keys.forEach(id => {
   const idx = allServices.findIndex(s => s.id === id);
   if (idx !== -1) allServices[idx].sellingPrice = pendingChanges[id];
  });
  
  pendingChanges = {}; 
  toggleSaveButton(); 
  showToast('All prices updated successfully!', 'success');
  
 } catch (error) {
  showToast(error.message || 'Failed to save prices', 'error');
  if (saveBtn) {
   saveBtn.disabled = false;
   saveBtn.innerHTML = `Save Changes (${Object.keys(pendingChanges).length})`;
  }
 }
}

window.toggleStatus = async (serviceId, currentStatus) => {
 const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
 try {
  showToast('Updating status...', 'info');
  await api.updateService(serviceId, { status: newStatus });
  
  const idx = allServices.findIndex(s => s.id === serviceId);
  if (idx !== -1) allServices[idx].status = newStatus;
  
  filterServices(); 
  showToast('Status updated successfully!', 'success');
 } catch (error) {
  showToast(error.message || 'Failed to update status', 'error');
 }
}