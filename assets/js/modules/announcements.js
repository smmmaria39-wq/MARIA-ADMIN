// ===============================================
// Admin Announcements Module
// ===============================================

import { api } from '../utils/api.js';
import { $ } from '../utils/helpers.js';
import { showToast } from '../components/toast.js';

export default async function initAnnouncements() {
 const tbody = $('.datatable tbody');
 const form = $('#announcement-form');
 
 if (!tbody) return;
 
 // 1. Fetch and display announcements
 const fetchAnnouncements = async () => {
  try {
   const response = await api.getAnnouncements();
   const announcements = response.data || response || [];
   
   if (announcements.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No announcements posted yet.</td></tr>`;
    return;
   }
   
   tbody.innerHTML = announcements.map(ann => `
        <tr>
          <td>${ann.title}</td>
          <td>${ann.message.substring(0, 50)}${ann.message.length > 50 ? '...' : ''}</td>
          <td>${new Date(ann.createdAt).toLocaleDateString()}</td>
          <td>
            <button class="btn btn--danger btn--sm" onclick="deleteAnnouncement('${ann.id}')">Delete</button>
          </td>
        </tr>
      `).join('');
  } catch (error) {
   tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Failed to load announcements.</td></tr>`;
  }
 };
 
 await fetchAnnouncements();
 
 // 2. Handle Create Announcement Form
 if (form) {
  form.addEventListener('submit', async (e) => {
   e.preventDefault();
   const title = $('#announcement-title').value;
   const message = $('#announcement-message').value;
   
   if (!title || !message) {
    return showToast('Please enter both title and message', 'error');
   }
   
   try {
    showToast('Posting announcement...', 'info');
    await api.createAnnouncement({ title, message });
    showToast('Announcement posted successfully!', 'success');
    
    form.reset();
    fetchAnnouncements(); // Refresh table
   } catch (error) {
    showToast(error.message || 'Failed to post announcement', 'error');
   }
  });
 }
 
 // 3. Handle Delete Announcement
 window.deleteAnnouncement = async (id) => {
  if (window.confirm('Are you sure you want to delete this announcement?')) {
   try {
    showToast('Deleting...', 'info');
    await api.deleteAnnouncement(id);
    showToast('Announcement deleted successfully!', 'success');
    fetchAnnouncements(); // Refresh table
   } catch (error) {
    showToast(error.message || 'Failed to delete announcement', 'error');
   }
  }
 };
}