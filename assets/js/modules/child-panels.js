// ===============================================
// Admin Child Panels Module
// ===============================================

import { api } from '../utils/api.js';
import { formatCurrency, formatDate } from '../utils/formatter.js';

export default async function initChildPanels() {
 const tbody = document.querySelector('.table tbody');
 if (!tbody) return;
 
 try {
  const response = await api.getChildPanels();
  const panels = response.data || [];
  
  if (panels.length === 0) {
   tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No child panels created yet.</td></tr>`;
   return;
  }
  
  tbody.innerHTML = panels.map(p => `
      <tr>
        <td><strong>${p.info?.panelName || 'N/A'}</strong></td>
        <td>${p.info?.ownerUsername || p.info?.ownerId?.substring(0, 8) || 'N/A'}</td>
        <td><a href="https://${p.info?.subdomain}.smmmaria.com" target="_blank" class="text-link">${p.info?.subdomain}.smmmaria.com</a></td>
        <td class="text-gold">${formatCurrency(p.info?.balance || 0)}</td>
        <td>${p.statistics?.totalUsers || 0}</td>
        <td><span class="badge badge--${p.info?.status === 'active' ? 'success' : 'danger'}">${p.info?.status}</span></td>
        <td>${p.info?.plan || 'N/A'}</td>
        <td>
          <a href="child-panel-details.html?id=${p.info?.panelId}" class="btn btn--outline btn--sm">Details</a>
        </td>
      </tr>
    `).join('');
  
 } catch (error) {
  console.error('Failed to load child panels:', error);
  tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Failed to load panels.</td></tr>`;
 }
}