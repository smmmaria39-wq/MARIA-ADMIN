// ===============================================
// Navbar Component
// ===============================================

import { $ } from '../utils/helpers.js';
import { toggleTheme } from '../utils/storage.js';

export function initNavbar() {
 const themeToggle = $('#theme-toggle');
 
 if (themeToggle) {
  themeToggle.addEventListener('click', toggleTheme);
 }
}