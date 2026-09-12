// ===============================================
// Sidebar Component
// ===============================================

import { $ } from '../utils/helpers.js';
import { storage } from '../utils/storage.js';

export function initSidebar() {
 const appContainer = $('.app-container');
 const collapseBtn = $('#collapse-btn');
 const mobileToggle = $('#mobile-menu-toggle');
 const overlay = $('#sidebar-overlay');
 
 if (!appContainer) return;
 
 // Restore collapse state on load
 if (storage.get('admin_sidebar_collapsed')) {
  appContainer.classList.add('sidebar-collapsed');
 }
 
 if (collapseBtn) {
  collapseBtn.addEventListener('click', () => {
   appContainer.classList.toggle('sidebar-collapsed');
   storage.set('admin_sidebar_collapsed', appContainer.classList.contains('sidebar-collapsed'));
  });
 }
 
 if (mobileToggle) {
  mobileToggle.addEventListener('click', () => {
   appContainer.classList.add('sidebar-open');
   if (overlay) overlay.classList.add('active');
  });
 }
 
 if (overlay) {
  overlay.addEventListener('click', () => {
   appContainer.classList.remove('sidebar-open');
   overlay.classList.remove('active');
  });
 }
}