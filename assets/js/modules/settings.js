// ===============================================
// Settings Module
// ===============================================
import { $$ } from '../utils/helpers.js';
import { showToast } from '../components/toast.js';

export default async function initSettings() {
 const tabs = $$('.settings-card .tab');
 const form = $('.settings-content form');
 
 if (tabs.length > 0) {
  tabs.forEach(tab => {
   tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    showToast(`Switched to ${tab.textContent} settings`, 'info');
   });
  });
 }
 
 if (form) {
  form.addEventListener('submit', (e) => {
   e.preventDefault();
   showToast('Settings saved successfully!', 'success');
  });
 }
}