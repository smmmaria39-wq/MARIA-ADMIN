// ===============================================
// Profile Module
// ===============================================
import { $$ } from '../utils/helpers.js';
import { showToast } from '../components/toast.js';

export default async function initProfile() {
 const tabs = $$('.settings-card .tab');
 const form = $('.settings-content form');
 
 if (tabs.length > 0) {
  tabs.forEach(tab => {
   tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    showToast(`Switched to ${tab.textContent} tab`, 'info');
   });
  });
 }
 
 if (form) {
  form.addEventListener('submit', (e) => {
   e.preventDefault();
   showToast('Profile updated successfully!', 'success');
  });
 }
}