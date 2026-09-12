// ===============================================
// Admin Orders Module
// ===============================================

import { api } from '../utils/api.js';
import { $ } from '../utils/helpers.js';
import { formatCurrency, formatDate } from '../utils/formatter.js';

let allOrders = [];
let userMap = {};
let serviceMap = {};
let serviceIdMap = {};

export default async function initOrders() {
 // We target the main table card container instead of just a tbody
 // because we are now generating multiple tables dynamically
 const container = document.querySelector('.table-card');
 if (!container) return;
 
 // 1. Setup Search & Status Filter Event Listeners
 const searchInput = document.querySelector('.table-toolbar input[type="text"]');
 const statusFilter = document.querySelector('.table-toolbar select');
 
 if (searchInput) searchInput.addEventListener('input', renderTable);
 if (statusFilter) statusFilter.addEventListener('change', renderTable);
 
 // Show initial loading state
 const toolbar = document.querySelector('.table-toolbar');
 container.innerHTML = '';
 if (toolbar) container.appendChild(toolbar);
 container.insertAdjacentHTML('beforeend', `<p class="text-center text-muted" style="padding: 20px;">Loading orders...</p>`);
 
 try {
  // Fetch orders, users, and services at the same time for speed
  const [ordersRes, usersRes, servicesRes] = await Promise.all([
   api.getOrders(),
   api.getUsers(),
   api.getServices()
  ]);
  
  allOrders = ordersRes.data || [];
  const users = usersRes.data || [];
  const services = servicesRes.data || [];
  
  // Create lookup maps for instant name resolution
  users.forEach(u => {
   userMap[u.id] = u.username || u.email;
  });
  services.forEach(s => {
   serviceMap[s.id] = s.name;
   serviceIdMap[s.id] = s.supplierServiceId || 'N/A';
  });
  
  // Sort orders so newest are at the top globally before grouping
  allOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  renderTable();
  
 } catch (error) {
  container.innerHTML = '';
  if (toolbar) container.appendChild(toolbar);
  container.insertAdjacentHTML('beforeend', `<p class="text-center text-danger" style="padding: 20px;">Failed to load orders.</p>`);
  console.error('Failed to load orders:', error);
 }
}

// Function to filter, group by user, and render the tables
function renderTable() {
 const container = document.querySelector('.table-card');
 if (!container) return;
 
 const searchInput = document.querySelector('.table-toolbar input[type="text"]');
 const statusFilter = document.querySelector('.table-toolbar select');
 
 const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
 const selectedStatus = statusFilter && statusFilter.value.toLowerCase() !== 'all statuses' ? statusFilter.value.toLowerCase() : '';
 
 // 1. Filter orders based on search term and selected status
 const filteredOrders = allOrders.filter(order => {
  const userName = userMap[order.userId] || '';
  const serviceName = serviceMap[order.serviceId] || '';
  const supplierId = serviceIdMap[order.serviceId] || '';
  const orderId = order.id || '';
  
  const matchesSearch =
   userName.toLowerCase().includes(searchTerm) ||
   serviceName.toLowerCase().includes(searchTerm) ||
   supplierId.toString().includes(searchTerm) ||
   orderId.toLowerCase().includes(searchTerm);
  
  const matchesStatus = !selectedStatus || order.status === selectedStatus;
  
  return matchesSearch && matchesStatus;
 });
 
 // Clear previous content (except toolbar)
 const toolbar = document.querySelector('.table-toolbar');
 container.innerHTML = '';
 if (toolbar) container.appendChild(toolbar);
 
 if (filteredOrders.length === 0) {
  container.insertAdjacentHTML('beforeend', `<p class="text-center text-muted" style="padding: 20px;">No orders match your filters.</p>`);
  return;
 }
 
 // 2. Group filtered orders by User ID
 const groupedByUser = {};
 filteredOrders.forEach(order => {
  if (!groupedByUser[order.userId]) {
   groupedByUser[order.userId] = [];
  }
  groupedByUser[order.userId].push(order);
 });
 
 // 3. Generate a separate table card for each user
 let html = '';
 
 for (const userId in groupedByUser) {
  const userName = userMap[userId] || 'Unknown User';
  const userOrders = groupedByUser[userId];
  
  html += `
      <div class="card" style="margin-top: 20px; box-shadow: none; border: 1px solid var(--border-color);">
        <div class="card__header" style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-input); border-bottom: 1px solid var(--border-color);">
          <h3 class="card__title" style="margin: 0;">${userName}</h3>
          <span class="badge badge--info">${userOrders.length} Orders</span>
        </div>
        <div class="table-responsive">
          <table class="table datatable">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Service</th>
                <th>Service ID</th>
                <th>Link</th>
                <th>Quantity</th>
                <th>Charge</th>
                <th>Progress</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
    `;
  
  userOrders.forEach(order => {
   const serviceName = serviceMap[order.serviceId] || 'Unknown Service';
   const supplierServiceId = serviceIdMap[order.serviceId] || 'N/A';
   const shortServiceName = serviceName.length > 25 ? serviceName.substring(0, 25) + '...' : serviceName;
   
   // Calculate real progress based on remains
   let progress = 0;
   if (order.status === 'completed') {
    progress = 100;
   } else if (order.status === 'partial' || order.status === 'canceled') {
    const delivered = order.quantity - (order.remains || 0);
    progress = order.quantity > 0 ? (delivered / order.quantity) * 100 : 0;
   } else if (order.status === 'processing' || order.status === 'in_progress') {
    if (order.remains !== undefined && order.quantity > 0) {
     const delivered = order.quantity - order.remains;
     progress = (delivered / order.quantity) * 100;
     progress = Math.max(0, Math.min(99, progress));
    } else {
     progress = 40;
    }
   }
   
   html += `
        <tr>
          <td>#${order.id?.substring(0, 8) || 'N/A'}</td>
          <td title="${serviceName}">${shortServiceName}</td>
          <td><span style="font-weight: 600; color: var(--color-gold);">${supplierServiceId}</span></td>
          <td><a href="${order.link}" target="_blank" class="text-link">View Link</a></td>
          <td>${order.quantity?.toLocaleString() || 0}</td>
          <td>${formatCurrency(order.charge)}</td>
          <td>
            <div class="progress-bar">
              <div class="progress-bar__fill" style="width: ${progress.toFixed(0)}%;"></div>
            </div>
          </td>
          <td><span class="badge badge--${order.status}">${order.status}</span></td>
          <td>${formatDate(order.createdAt)}</td>
          <td><button class="btn btn--outline btn--sm">View</button></td>
        </tr>
      `;
  });
  
  html += `
            </tbody>
          </table>
        </div>
      </div>
    `;
 }
 
 container.insertAdjacentHTML('beforeend', html);
}