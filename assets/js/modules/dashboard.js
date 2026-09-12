// ===============================================
// Admin Dashboard Module
// ===============================================

import { api } from '../utils/api.js';
import { $, $$ } from '../utils/helpers.js';
import { formatCurrency, formatDate } from '../utils/formatter.js';

export default async function initDashboard() {
 try {
  const response = await api.getDashboardStats();
  const stats = response.data;
  
  // Update Stat Cards if they exist
  const statCards = $$('.stat-card');
  if (statCards.length > 0 && stats) {
   statCards[0].querySelector('.stat-card__value').textContent = formatCurrency(stats.totalRevenue || 0);
   statCards[1].querySelector('.stat-card__value').textContent = (stats.totalUsers || 0).toLocaleString();
   statCards[2].querySelector('.stat-card__value').textContent = (stats.totalOrders || 0).toLocaleString();
   statCards[3].querySelector('.stat-card__value').textContent = stats.pendingOrders || 0;
   statCards[4].querySelector('.stat-card__value').textContent = stats.activeSuppliers || 0;
   statCards[5].querySelector('.stat-card__value').textContent = stats.openTickets || 0;
  }
  
  // Update Recent Orders Table
  const tbody = $('.table-card tbody');
  if (tbody && stats.recentOrders) {
   if (stats.recentOrders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center">No recent orders found.</td></tr>`;
   } else {
    tbody.innerHTML = stats.recentOrders.map(order => `
                    <tr>
                        <td>#${order.id.substring(0, 8)}</td>
                        <td>${order.userId || 'N/A'}</td>
                        <td>${order.serviceId || 'N/A'}</td>
                        <td>${formatCurrency(order.charge)}</td>
                        <td><span class="badge badge--${order.status}">${order.status}</span></td>
                        <td>${formatDate(order.createdAt)}</td>
                    </tr>
                `).join('');
   }
  }
 } catch (error) {
  console.error('Failed to load dashboard data:', error);
 }
}