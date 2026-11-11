// ===============================================
// Admin Dashboard Module (FIXED)
// FIX 1: Revenue chart now renders real daily revenue (Last 7/30 days dropdown works)
// FIX 2: Recent Activity list now shows real events (deposits, orders, new users)
// FIX 3: Latest Orders table shows real usernames + service names instead of raw IDs
// FIX 4: Total Revenue counts payments settled as 'completed' (backend now writes
//        'completed' after settlement, not 'approved') and is computed client-side
// ===============================================

import { api } from '../utils/api.js';
import { $, $$ } from '../utils/helpers.js';
import { formatCurrency, formatDate } from '../utils/formatter.js';

let userMap = {};
let serviceMap = {};

// ===============================================
// STATUS NORMALIZATION (mirrors backend settlement statuses)
// ===============================================
const SUCCESS_STATUSES = ['approved', 'completed', 'success', 'successful'];
const FAILED_STATUSES = ['rejected', 'failed', 'cancelled', 'canceled', 'expired', 'refunded'];

function normalizeStatus(status) {
  return String(status || '').toLowerCase().trim();
}

const isSuccessfulStatus = (status) => SUCCESS_STATUSES.includes(normalizeStatus(status));
const isFailedStatus = (status) => FAILED_STATUSES.includes(normalizeStatus(status));
const isInFlightStatus = (status) => ['pending', 'processing', 'in progress'].includes(normalizeStatus(status));

function getOrderBadgeClass(status) {
  const s = normalizeStatus(status);
  if (SUCCESS_STATUSES.includes(s)) return 'success';
  if (isFailedStatus(s)) return 'danger';
  if (isInFlightStatus(s)) return 'warning';
  return 'info'; // partial and anything unknown
}

// Relative time label for the activity feed
function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  if (isNaN(diff)) return '';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default async function initDashboard() {
  try {
    // Fetch stats, users (for real names), services (for real names),
    // and payments (for revenue chart + activity feed) all in parallel
    const [statsRes, usersRes, servicesRes, paymentsRes] = await Promise.all([
      api.getDashboardStats(),
      api.getUsers().catch(() => ({ data: [] })),
      api.getServices().catch(() => ({ data: [] })),
      api.getPayments().catch(() => ({ data: [] }))
    ]);

    const stats = statsRes.data || {};
    const users = usersRes.data || [];
    const services = servicesRes.data || [];
    const payments = paymentsRes.data || [];

    // Lookup maps: userId -> display name, serviceId -> service name
    userMap = {};
    users.forEach(user => {
      userMap[user.id] = user.username || user.email || 'Unknown User';
    });
    serviceMap = {};
    services.forEach(service => {
      serviceMap[service.id] = service.name || service.serviceName || service.title || 'Unknown Service';
    });

    // 1. Stat Cards (same order as dashboard.html:
    //    Revenue, Users, Orders, Pending Orders, Suppliers, Tickets)
    const statCards = $$('.stat-card');
    if (statCards.length >= 6) {
      // Count ALL settled deposits ('completed' AND legacy 'approved'), case-insensitive
      const totalRevenue = payments
        .filter(p => isSuccessfulStatus(p.status))
        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

      statCards[0].querySelector('.stat-card__value').textContent = formatCurrency(totalRevenue);
      statCards[1].querySelector('.stat-card__value').textContent = (stats.totalUsers || 0).toLocaleString();
      statCards[2].querySelector('.stat-card__value').textContent = (stats.totalOrders || 0).toLocaleString();
      statCards[3].querySelector('.stat-card__value').textContent = stats.pendingOrders || 0;
      statCards[4].querySelector('.stat-card__value').textContent = stats.activeSuppliers || 0;
      statCards[5].querySelector('.stat-card__value').textContent = stats.openTickets || 0;
    }

    // 2. Revenue Overview Chart (Last 30 Days default, dropdown switches to 7)
    paymentsCache = payments;
    renderRevenueChart(30);
    const rangeDropdown = $('.chart-card .card__dropdown');
    if (rangeDropdown) {
      rangeDropdown.addEventListener('change', () => {
        const days = rangeDropdown.value.includes('7') ? 7 : 30;
        renderRevenueChart(days);
      });
    }

    // 3. Recent Activity Feed (real events from payments, orders, users)
    renderRecentActivity(payments, stats);

    // 4. Latest Orders Table with real names
    renderLatestOrders(stats);

  } catch (error) {
    console.error('Failed to load dashboard data:', error);
  }
}

// Cache of payments for the chart dropdown re-renders
let paymentsCache = [];

// ===============================================
// Revenue Overview Chart (pure CSS bar chart)
// ===============================================
function buildDailyRevenue(payments, days) {
  const dayKeys = [];
  const dayMap = {};
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    dayMap[key] = {
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      total: 0
    };
    dayKeys.push(key);
  }

  payments.forEach(p => {
    if (!isSuccessfulStatus(p.status)) return;
    const d = new Date(p.createdAt);
    if (!d || isNaN(d.getTime())) return;
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (dayMap[key]) dayMap[key].total += parseFloat(p.amount || 0);
  });

  return dayKeys.map(k => ({ label: dayMap[k].label, total: dayMap[k].total }));
}

function renderRevenueChart(days) {
  const container = $('#chart-revenue');
  if (!container) return;

  const data = buildDailyRevenue(paymentsCache, days);
  const maxVal = Math.max(...data.map(d => d.total), 0);

  if (maxVal === 0) {
    container.innerHTML = `<p class="text-center text-muted" style="width: 100%; align-self: center;">No revenue recorded in the last ${days} days.</p>`;
    return;
  }

  container.innerHTML = data.map(d => `
    <div class="chart-bar"
         style="height: ${d.total > 0 ? Math.max((d.total / maxVal) * 100, 3) : 1}%; ${d.total === 0 ? 'opacity: 0.25;' : ''}"
         title="${d.label}: ${formatCurrency(d.total)}"></div>
  `).join('');
}

// ===============================================
// Recent Activity Feed
// ===============================================
function renderRecentActivity(payments, stats) {
  const list = $('.recent-activity-card .notification-list');
  if (!list) return;

  const events = [];

  // Deposit events (completed + pending requests)
  payments.forEach(p => {
    const name = userMap[p.userId] || 'Unknown User';
    const amount = formatCurrency(p.amount || 0);
    const method = p.method || 'wallet';
    if (isSuccessfulStatus(p.status)) {
      events.push({
        ts: p.createdAt,
        icon: 'success',
        symbol: '$',
        html: `<p><strong>${name}</strong> completed a deposit of <strong>${amount}</strong> via ${method}.</p>`
      });
    } else if (normalizeStatus(p.status) === 'pending') {
      events.push({
        ts: p.createdAt,
        icon: 'warning',
        symbol: '!',
        html: `<p><strong>${name}</strong> requested a deposit of <strong>${amount}</strong> via ${method} (pending).</p>`
      });
    }
  });

  // Order events (latest orders from stats)
  (stats.recentOrders || []).forEach(order => {
    const name = userMap[order.userId] || 'Unknown User';
    const service = serviceMap[order.serviceId] || 'Service';
    events.push({
      ts: order.createdAt,
      icon: 'info',
      symbol: 'O',
      html: `<p>New order <strong>#${String(order.id || '').substring(0, 8)}</strong> by <strong>${name}</strong> &mdash; ${service} (${formatCurrency(order.charge || 0)}).</p>`
    });
  });

  // New user events (latest users from stats)
  (stats.recentUsers || []).forEach(user => {
    const name = user.username || user.email || 'Unknown User';
    events.push({
      ts: user.createdAt,
      icon: 'info',
      symbol: 'U',
      html: `<p>New user registered: <strong>${name}</strong>.</p>`
    });
  });

  // Sort newest first, keep the latest 6
  events.sort((a, b) => new Date(b.ts) - new Date(a.ts));
  const latest = events.slice(0, 6);

  if (latest.length === 0) {
    list.innerHTML = `
      <li class="notification-item">
        <div class="notification__icon notification__icon--info">i</div>
        <div class="notification__content">
          <p>No recent activity.</p>
          <span class="notification__time">Just now</span>
        </div>
      </li>
    `;
    return;
  }

  list.innerHTML = latest.map(ev => `
    <li class="notification-item">
      <div class="notification__icon notification__icon--${ev.icon}">${ev.symbol}</div>
      <div class="notification__content">
        ${ev.html}
        <span class="notification__time">${timeAgo(ev.ts)}</span>
      </div>
    </li>
  `).join('');
}

// ===============================================
// Latest Orders Table (real names, real services)
// ===============================================
function renderLatestOrders(stats) {
  const tbody = $('.table-card tbody');
  if (!tbody) return;

  const orders = stats.recentOrders || [];

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center">No recent orders found.</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(order => {
    const userName = userMap[order.userId] || 'Unknown User';
    const serviceName = serviceMap[order.serviceId] || 'Unknown Service';
    const badge = getOrderBadgeClass(order.status);
    return `
      <tr>
        <td>#${String(order.id || '').substring(0, 8)}</td>
        <td>${userName}</td>
        <td>${serviceName}</td>
        <td>${formatCurrency(order.charge || 0)}</td>
        <td><span class="badge badge--${badge}">${normalizeStatus(order.status) || 'unknown'}</span></td>
        <td>${formatDate(order.createdAt)}</td>
      </tr>
    `;
  }).join('');
}
