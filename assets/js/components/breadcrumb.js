// ===============================================
// Breadcrumb Component
// ===============================================
import { $ } from '../utils/helpers.js';

export function initBreadcrumb(pageName) {
 const container = $('.breadcrumb');
 if (container) {
  container.innerHTML = `<a href="dashboard.html">Admin</a> / <span>${pageName}</span>`;
 }
}