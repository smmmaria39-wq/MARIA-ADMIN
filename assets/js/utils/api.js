// ===============================================
// API Utility (Live Backend Only)
// ===============================================

const API_BASE_URL = 'https://smmmaria-backend-production-3ae4.up.railway.app/api/v1';

async function request(endpoint, method = 'GET', body = null) {
 const token = localStorage.getItem('smmmaria_token');
 
 const headers = { 'Content-Type': 'application/json' };
 if (token) headers['Authorization'] = `Bearer ${token}`;
 
 const config = { method, headers };
 if (body) config.body = JSON.stringify(body);
 
 try {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  const data = await response.json();
  
  if (!response.ok) throw new Error(data.message || 'Something went wrong');
  return data;
 } catch (error) {
  console.error(`API Error [${endpoint}]:`, error.message);
  throw error;
 }
}

export const api = {
 // Auth
 login: (identifier, password) => request('/auth/login', 'POST', { identifier, password }),
 getMe: () => request('/auth/me'),
 
 // Admin Dashboard
 getDashboardStats: () => request('/admin/dashboard'),
 
 // Users
 getUsers: () => request('/users'),
 updateUserStatus: (userId, status) => request(`/users/${userId}/status`, 'PUT', { status }),
 
 // Orders
 getOrders: () => request('/orders'),
 
 // Services & Categories
 getServices: () => request('/services'),
 getCategories: () => request('/services/categories?withCounts=true'),
 updateService: (id, data) => request(`/services/${id}`, 'PUT', data),
 bulkUpdateServices: (updates) => request('/services/bulk-update', 'PUT', { updates }),
 deleteService: (id) => request(`/services/${id}`, 'DELETE'),
 
 // Categories
 updateCategory: (id, data) => request('/services/categories/' + id, 'PUT', data),
 deleteCategory: (id) => request('/services/categories/' + id, 'DELETE'),
 
 // Suppliers
 getSuppliers: () => request('/suppliers'),
  addSupplier: (data) => request('/suppliers', 'POST', data),
  syncSupplierServices: (supplierId, options = {}) => request(`/suppliers/${supplierId}/sync`, 'POST', options),
  checkSupplierBalance: (supplierId) => request(`/suppliers/${supplierId}/balance`, 'GET'),
  deleteSupplier: (supplierId) => request(`/suppliers/${supplierId}`, 'DELETE'),
  getSupplierCategories: (supplierId) => request(`/suppliers/${supplierId}/categories`),
 
 // Payments & Wallets
 getPayments: () => request('/payments'),
 approvePayment: (paymentId) => request(`/payments/${paymentId}/approve`, 'PUT'),
 rejectPayment: (paymentId) => request(`/payments/${paymentId}/reject`, 'PUT'),
 getWallets: () => request('/wallet'),
 adjustWallet: (userId, amount, action, note) => request(`/wallet/adjust`, 'POST', { userId, amount, action, note }),
 
 // Child Panels (Admin)
 getChildPanels: () => request('/child-panel/all'),
 adminCreateChildPanel: (data) => request('/child-panel/admin-create', 'POST', data),
 getChildPanelDetails: (id) => request(`/child-panel/${id}`),
 updateChildPanelStatus: (id, status) => request(`/child-panel/${id}/status`, 'PUT', { status }),
 fundChildPanelWallet: (id, amount, description) => request(`/child-panel/${id}/fund`, 'POST', { amount, description }),
 deductChildPanelWallet: (id, amount, description) => request(`/child-panel/${id}/deduct`, 'POST', { amount, description }),
 setChildPanelBalance: (id, amount, reason) => request(`/child-panel/${id}/balance`, 'PUT', { amount, reason }),
 getChildPanelTransactions: (id) => request(`/child-panel/${id}/transactions`),
 bulkFundChildPanelWallets: (panelIds, amount, description) => request('/child-panel/bulk-fund', 'POST', { panelIds, amount, description }),
 
 // Announcements
 getAnnouncements: () => request('/announcements'),
 createAnnouncement: (data) => request('/announcements', 'POST', data),
 deleteAnnouncement: (id) => request(`/announcements/${id}`, 'DELETE'),
 
 // Admin Tickets
 getAdminTickets: (params = '') => request(`/tickets/admin${params}`),
 getAdminTicketById: (id) => request(`/tickets/admin/${id}`),
 replyAsAdmin: (id, message) => request(`/tickets/admin/${id}/reply`, 'POST', { message }),
 updateTicketStatus: (id, status) => request(`/tickets/admin/${id}/status`, 'PATCH', { status }),
 updateTicketPriority: (id, priority) => request(`/tickets/admin/${id}/priority`, 'PATCH', { priority }),
 reopenTicket: (id) => request(`/tickets/admin/${id}/reopen`, 'PATCH'),
 
  // ===============================================
  // ADMIN BUY ACCOUNT MARKETPLACE
  // ===============================================
  getAdminAccountStats: () => request('/admin/accounts'),
   getAdminAccounts: () => request('/admin/accounts/all'),
   getAdminAccountCategories: () => request('/admin/accounts/categories'), // <-- ADDED THIS LINE
   createAdminAccount: (data) => request('/admin/accounts', 'POST', data),
   updateAdminAccount: (id, data) => request(`/admin/accounts/${id}`, 'PATCH', data),
   deleteAdminAccount: (id) => request(`/admin/accounts/${id}`, 'DELETE'),
   importAdminAccounts: (data) => request('/admin/accounts/import', 'POST', { accounts: data }),
   createAdminCategory: (data) => request('/admin/accounts/categories', 'POST', data),
   
 // ===============================================
  // ADMIN LIVE CHAT
  // ===============================================
  getPrivateChatUsers: () => request('/admin/chat/private'),
   getAdminPrivateChat: (userId) => request(`/admin/chat/private/${userId}`),
   adminSendPrivateMessage: (userId, payload) => request(`/admin/chat/private/${userId}`, 'POST', payload),
   adminMarkPrivateRead: (userId) => request(`/admin/chat/private/${userId}/read`, 'PUT'),
   getAdminPublicChat: () => request('/admin/chat/public'),
   adminDeletePublicMessage: (messageId) => request(`/admin/chat/public/${messageId}`, 'DELETE'),
  };