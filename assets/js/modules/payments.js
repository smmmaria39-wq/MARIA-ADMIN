// ===============================================
// Admin Payments Module (FIXED)
// FIX 1: "Total Deposited" now counts payments settled as 'completed'
//        (the backend's settlePayment() writes 'completed', not 'approved')
// FIX 2: Status badges handle all real backend statuses
//        (completed / approved / rejected / failed / cancelled / expired / processing / pending)
// FIX 3: Approve/Reject buttons only on 'pending'; 'processing' shows neutral state
// FIX 4: Auto-polling also keeps running while payments are 'processing'
// ===============================================

import { api } from '../utils/api.js';
import { $ } from '../utils/helpers.js';
import { formatCurrency, formatDate } from '../utils/formatter.js';
import { showToast } from '../components/toast.js';

let allPayments = [];
let userMap = {};
let ugxRate = 3800;
let pollInterval = null;

// ===============================================
// STATUS NORMALIZATION (mirrors backend's
// isPaymentSuccessful / isPaymentFailed helpers)
// ===============================================
const SUCCESS_STATUSES = ['approved', 'completed', 'success', 'successful'];
const FAILED_STATUSES = ['rejected', 'failed', 'cancelled', 'expired'];
const IN_FLIGHT_STATUSES = ['pending', 'processing'];

function normalizeStatus(status) {
  return String(status || '').toLowerCase().trim();
}

const isSuccessfulStatus = (status) => SUCCESS_STATUSES.includes(normalizeStatus(status));
const isFailedStatus = (status) => FAILED_STATUSES.includes(normalizeStatus(status));
const isInFlightStatus = (status) => IN_FLIGHT_STATUSES.includes(normalizeStatus(status));

// Match a dropdown selection against a payment status (grouped + case-insensitive)
function statusMatchesFilter(status, selected) {
  const s = normalizeStatus(status);
  const sel = normalizeStatus(selected);
  if (!sel) return true;
  if (SUCCESS_STATUSES.includes(sel)) return isSuccessfulStatus(s); // 'approved' or 'completed' selects match both
  if (FAILED_STATUSES.includes(sel)) return isFailedStatus(s);
  if (IN_FLIGHT_STATUSES.includes(sel)) return isInFlightStatus(s);
  return s === sel;
}

function getStatusBadgeClass(status) {
  const s = normalizeStatus(status);
  if (SUCCESS_STATUSES.includes(s)) return 'success';
  if (FAILED_STATUSES.includes(s)) return 'danger';
  if (s === 'processing') return 'info';
  return 'warning'; // pending and anything unknown
}

// Fetch live exchange rate from USD to UGX
async function fetchLiveExchangeRate() {
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await response.json();
    if (data && data.rates && data.rates.UGX) {
      ugxRate = data.rates.UGX;
    }
  } catch (error) {
    console.warn('Failed to fetch live exchange rate, using fallback UGX rate.');
  }
}

export default async function initPayments() {
  const container = document.querySelector('.table-card');
  if (!container) return;

  // 1. Setup Search & Filters Event Listeners
  const searchInput = document.querySelector('.table-toolbar input[type="text"]');
  const methodFilter = document.getElementById('methodFilter');
  const statusFilter = document.getElementById('statusFilter');

  if (searchInput) searchInput.addEventListener('input', renderTable);
  if (methodFilter) methodFilter.addEventListener('change', renderTable);
  if (statusFilter) statusFilter.addEventListener('change', renderTable);

  await fetchPayments(true);

  // 2. Start Auto-Polling if there are pending OR processing payments
  if (allPayments.some(isInFlightStatus)) {
    startPolling();
  } else {
    stopPolling();
  }
}

// Fetch data from backend
async function fetchPayments(isInitial = false) {
  const container = document.querySelector('.table-card');
  const toolbar = document.querySelector('.table-toolbar');

  if (isInitial && container) {
    container.innerHTML = '';
    if (toolbar) container.appendChild(toolbar);
    container.insertAdjacentHTML('beforeend', `<p class="text-center text-muted" style="padding: 20px;">Loading payments...</p>`);
  }

  try {
    const [paymentsRes, usersRes] = await Promise.all([
      api.getPayments(),
      api.getUsers(),
      fetchLiveExchangeRate()
    ]);

    allPayments = paymentsRes.data || [];
    const users = usersRes.data || [];

    // Create a lookup map to resolve userId to real username
    userMap = {};
    users.forEach(user => {
      userMap[user.id] = user.username || user.email || 'Unknown User';
    });

    // Sort payments so newest are at the top
    allPayments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    renderTable();

    // Check if we should stop polling
    if (!allPayments.some(isInFlightStatus)) {
      stopPolling();
    }

  } catch (error) {
    console.error('Failed to load payments:', error);
    if (isInitial && container) {
      container.innerHTML = '';
      if (toolbar) container.appendChild(toolbar);
      container.insertAdjacentHTML('beforeend', `<p class="text-center text-danger" style="padding: 20px;">Failed to load payments.</p>`);
    }
  }
}

// Start auto-refresh every 15 seconds
function startPolling() {
  if (pollInterval) return; // Already polling
  console.log('Starting auto-refresh for pending payments...');
  pollInterval = setInterval(() => fetchPayments(false), 15000);
}

// Stop auto-refresh
function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
    console.log('Stopped auto-refresh. No pending payments left.');
  }
}

// Filter, Group by User, and Render
function renderTable() {
  const container = document.querySelector('.table-card');
  const toolbar = document.querySelector('.table-toolbar');

  if (!container) return;

  const searchInput = document.querySelector('.table-toolbar input[type="text"]');
  const methodFilter = document.getElementById('methodFilter');
  const statusFilter = document.getElementById('statusFilter');

  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const selectedMethod = methodFilter && methodFilter.value.toLowerCase() !== 'all methods' ? methodFilter.value.toLowerCase() : '';
  const selectedStatus = statusFilter && statusFilter.value.toLowerCase() !== 'all statuses' ? statusFilter.value.toLowerCase() : '';

  // 1. Filter payments
  const filteredPayments = allPayments.filter(payment => {
    const userName = userMap[payment.userId] || '';
    const payId = payment.id || '';

    const matchesSearch = userName.toLowerCase().includes(searchTerm) || payId.toLowerCase().includes(searchTerm);
    const matchesMethod = !selectedMethod || (payment.method && payment.method.toLowerCase() === selectedMethod);
    // FIX: normalized status matching ('approved' selection also matches 'completed', etc.)
    const matchesStatus = !selectedStatus || statusMatchesFilter(payment.status, selectedStatus);

    return matchesSearch && matchesMethod && matchesStatus;
  });

  // Clear container
  container.innerHTML = '';
  if (toolbar) container.appendChild(toolbar);

  if (filteredPayments.length === 0) {
    container.insertAdjacentHTML('beforeend', `<p class="text-center text-muted" style="padding: 20px;">No payments match your filters.</p>`);
    return;
  }

  // 2. Group by User
  const groupedByUser = {};
  filteredPayments.forEach(p => {
    if (!groupedByUser[p.userId]) groupedByUser[p.userId] = [];
    groupedByUser[p.userId].push(p);
  });

  // 3. Generate Table for each user
  let html = '';

  for (const userId in groupedByUser) {
    const userName = userMap[userId] || 'Unknown User';
    const userPayments = groupedByUser[userId];

    // FIX: Count all settled deposits ('approved' AND 'completed'), case-insensitive
    const totalDeposits = userPayments
      .filter(p => isSuccessfulStatus(p.status))
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);

    const totalDepositsUgx = (totalDeposits * ugxRate).toLocaleString(undefined, { maximumFractionDigits: 0 });

    html += `
      <div class="card" style="margin-top: 20px; box-shadow: none; border: 1px solid var(--border-color);">
        <div class="card__header" style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-input); border-bottom: 1px solid var(--border-color);">
          <h3 class="card__title" style="margin: 0;">${userName}</h3>
          <div style="text-align: right;">
            <span class="badge badge--success">Total Deposited: ${formatCurrency(totalDeposits)}</span>
            <span class="charge-ugx" style="display: block; font-size: 11px; color: var(--text-secondary); margin-top: 2px;">UGX ${totalDepositsUgx}</span>
          </div>
        </div>
        <div class="table-responsive">
          <table class="table datatable">
            <thead>
              <tr>
                <th>Payment ID</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
    `;

    userPayments.forEach(payment => {
      const ugxAmount = (payment.amount * ugxRate).toLocaleString(undefined, { maximumFractionDigits: 0 });
      // FIX: badge class derived from normalized status (completed -> success, rejected/failed/cancelled/expired -> danger, processing -> info)
      const statusBadge = getStatusBadgeClass(payment.status);
      const statusText = normalizeStatus(payment.status) || 'unknown';

      // FIX: Approve/Reject only for 'pending'; 'processing' gets neutral label (backend already claimed it)
      let actionsHtml;
      if (normalizeStatus(payment.status) === 'pending') {
        actionsHtml = `
              <button class="btn btn--primary btn--sm" onclick="approvePayment('${payment.id}')">Approve</button>
              <button class="btn btn--danger btn--sm" onclick="rejectPayment('${payment.id}')">Reject</button>
            `;
      } else if (normalizeStatus(payment.status) === 'processing') {
        actionsHtml = '<span class="text-muted">Processing...</span>';
      } else {
        actionsHtml = '<span class="text-muted">Processed</span>';
      }

      html += `
        <tr>
          <td>${payment.id.substring(0, 8)}</td>
          <td>
            ${formatCurrency(payment.amount)}
            <span class="charge-ugx" style="display: block; font-size: 11px; color: var(--text-secondary); margin-top: 2px;">UGX ${ugxAmount}</span>
          </td>
          <td>${payment.method}</td>
          <td><span class="badge badge--${statusBadge}">${statusText}</span></td>
          <td>${formatDate(payment.createdAt)}</td>
          <td>
            ${actionsHtml}
          </td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  container.insertAdjacentHTML('beforeend', html);
}

// --- Actions ---

window.approvePayment = async (paymentId) => {
  try {
    await api.approvePayment(paymentId);
    showToast('Payment approved & wallet credited!', 'success');
    await fetchPayments(false); // Instantly re-render without full loading text
  } catch (error) {
    showToast(error.message || 'Failed to approve payment', 'error');
  }
};

window.rejectPayment = async (paymentId) => {
  try {
    await api.rejectPayment(paymentId);
    showToast('Payment rejected.', 'info');
    await fetchPayments(false); // Instantly re-render
  } catch (error) {
    showToast(error.message || 'Failed to reject payment', 'error');
  }
};
