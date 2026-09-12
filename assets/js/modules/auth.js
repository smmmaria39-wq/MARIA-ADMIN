// ===============================================
// Admin Auth Module
// ===============================================

import { api } from '../utils/api.js';
import { showToast } from '../components/toast.js';

export async function handleLogin(e) {
 e.preventDefault();
 const email = document.getElementById('email').value;
 const password = document.getElementById('password').value;
 
 try {
  showToast('Logging in...', 'info');
  const response = await api.login(email, password);
  
  // Safely extract token and user (handles both response.token and response.data.token)
  const token = response.data?.token || response.token;
  const user = response.data?.user || response.user;
  
  // Verify the user is an admin
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
   showToast('Access Denied: You are not an admin.', 'error');
   return;
  }
  
  // Save token to localStorage
  localStorage.setItem('smmmaria_token', token);
  
  showToast('Login successful! Redirecting...', 'success');
  
  // Redirect to admin dashboard
  setTimeout(() => {
   window.location.href = 'dashboard.html';
  }, 1000);
    } catch (error) {
     console.error('Login Error:', error);
     
     // THIS LINE WILL MAKE THE ERROR POP UP ON YOUR SCREEN
     alert('BACKEND ERROR: ' + error.message);
     
     showToast(error.message || 'Invalid credentials', 'error');
    }
}

export function handleLogout() {
 localStorage.removeItem('smmmaria_token');
 showToast('Logged out successfully', 'info');
 setTimeout(() => {
  window.location.href = 'login.html';
 }, 500);
}
