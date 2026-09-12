// ===============================================
// App.js - Admin Main Entry Point
// ===============================================

// 1. Route Guard (Must be at the very top)
const adminPublicPages = ['login.html', '404.html', ''];
const currentAdminPage = window.location.pathname.split('/').pop().toLowerCase();

if (!adminPublicPages.includes(currentAdminPage) && !currentAdminPage.includes('login')) {
 const token = localStorage.getItem('smmmaria_token');
 if (!token) {
  window.location.href = 'login.html';
 }
}

// 2. Imports (Using ./ because they are in the same js/ folder)
import { initTheme } from './utils/storage.js';
import { initSidebar } from './components/sidebar.js';
import { initNavbar } from './components/navbar.js';
import { initModals } from './components/modal.js';
import { initToasts } from './components/toast.js';
import { initFooter } from './components/footer.js';
import { initDropdowns } from './components/dropdown.js';
import { handleLogin, handleLogout } from './modules/auth.js';

// Expose Auth functions to window for HTML inline events (onsubmit/onclick)
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;

document.addEventListener('DOMContentLoaded', async () => {
 // Initialize Theme
 initTheme();
 
 // Initialize Global UI Components
 initSidebar();
 initNavbar();
 initModals();
 initToasts();
 initFooter();
 initDropdowns();
 
 // Load the specific module for the current page
 const pageName = document.body.getAttribute('data-page');
 
 if (pageName && pageName !== 'login') {
  try {
   const module = await import(`./modules/${pageName}.js`);
   if (module && typeof module.default === 'function') {
    module.default();
   }
  } catch (error) {
   console.warn(`No specific module found for page: ${pageName}`, error);
  }
 }
});