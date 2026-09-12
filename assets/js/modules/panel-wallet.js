// ===============================================
// Admin Child Panel Wallets Module (Rewritten)
// ===============================================

import { api } from '../utils/api.js';
import { formatCurrency } from '../utils/formatter.js';
import { showToast } from '../components/toast.js';

export default async function initPanelWallet() {

    // ── State ──
    let allPanels = [];
    let filteredPanels = [];
    let selectedPanelIds = new Set();
    let currentFilter = 'all';
    let searchQuery = '';
    let currentPage = 1;
    const pageSize = 15;
    let sortField = null;
    let sortAsc = true;

    // ── DOM References ──
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const els = {
        statTotalBalance: $('#statTotalBalance'),
        statTotalDeposited: $('#statTotalDeposited'),
        statTotalDeducted: $('#statTotalDeducted'),
        statLowBalance: $('#statLowBalance'),
        filterTabs: $('#walletFilterTabs'),
        search: $('#walletSearch'),
        tableBody: $('#walletTableBody'),
        tableCount: $('#walletTableCount'),
        selectAll: $('#walletSelectAll'),
        tableFooter: $('#walletTableFooter'),
        showingInfo: $('#walletShowingInfo'),
        pagination: $('#walletPagination'),
        bulkTopUpBtn: $('#bulkTopUpBtn'),

        // Add Funds Modal
        addFundsModal: $('#addFundsModal'),
        addFundsForm: $('#addFundsForm'),
        addFundsPanelId: $('#addFundsPanelId'),
        addFundsPanelLabel: $('#addFundsPanelLabel'),
        addFundsAmount: $('#addFundsAmount'),
        addFundsDescription: $('#addFundsDescription'),
        addFundsCurrentBalance: $('#addFundsCurrentBalance'),
        addFundsNewBalance: $('#addFundsNewBalance'),

        // Deduct Funds Modal
        deductFundsModal: $('#deductFundsModal'),
        deductFundsForm: $('#deductFundsForm'),
        deductFundsPanelId: $('#deductFundsPanelId'),
        deductFundsPanelLabel: $('#deductFundsPanelLabel'),
        deductFundsAmount: $('#deductFundsAmount'),
        deductFundsDescription: $('#deductFundsDescription'),
        deductFundsError: $('#deductFundsError'),
        deductFundsCurrentBalance: $('#deductFundsCurrentBalance'),
        deductFundsNewBalance: $('#deductFundsNewBalance'),

        // Set Balance Modal
        setBalanceModal: $('#setBalanceModal'),
        setBalanceForm: $('#setBalanceForm'),
        setBalancePanelId: $('#setBalancePanelId'),
        setBalancePanelLabel: $('#setBalancePanelLabel'),
        setBalanceAmount: $('#setBalanceAmount'),
        setBalanceReason: $('#setBalanceReason'),

        // History Modal
        historyModal: $('#historyModal'),
        historyPanelLabel: $('#historyPanelLabel'),
        historyPanelBalance: $('#historyPanelBalance'),
        historyTableBody: $('#historyTableBody'),
        historyTableFooter: $('#historyTableFooter'),
        historyShowingInfo: $('#historyShowingInfo'),
        historyPagination: $('#historyPagination'),

        // Bulk Top Up Modal
        bulkTopUpModal: $('#bulkTopUpModal'),
        bulkTopUpForm: $('#bulkTopUpForm'),
        bulkSelectedCount: $('#bulkSelectedCount'),
        bulkAmount: $('#bulkAmount'),
        bulkDescription: $('#bulkDescription'),
        bulkTotalAmount: $('#bulkTotalAmount'),
    };

    // ── Data Normalization ──
    // Flattens the backend response so the rest of the module doesn't need to guess paths
    function normalizePanelData(raw) {
        const info = raw.info || {};
        const owner = raw.owner || {};
        
        return {
            id: raw.id,
            panelName: info.panelName || 'Unknown Panel',
            ownerUsername: info.ownerUsername || owner.username || 'Unknown',
            ownerEmail: info.ownerEmail || owner.email || '',
            subdomain: info.subdomain || '',
            customDomain: info.customDomain || '',
            status: info.status || 'active',
            plan: info.plan || 'monthly',
            balance: parseFloat(info.balance ?? owner.balance ?? 0),
            totalDeposited: parseFloat(info.totalDeposited ?? owner.totalDeposited ?? 0),
            totalSpent: parseFloat(info.totalSpent ?? owner.spent ?? 0)
        };
    }

    function getDomain(p) {
        return p.customDomain || (p.subdomain ? `${p.subdomain}.smmmaria.netlify.app` : '');
    }

    // ── Helpers ──
    function getPanel(id) {
        return allPanels.find(p => p.id === id);
    }

    function getInitials(name) {
        if (!name || name === 'Unknown') return '??';
        return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    }

    function statusBadge(status) {
        return `<span class="badge badge--${status === 'active' ? 'success' : 'danger'}">${status}</span>`;
    }

    function planBadge(plan) {
        return `<span class="badge badge--${plan === 'lifetime' ? 'info' : 'primary'}">${plan}</span>`;
    }

    function isLowBalance(balance) {
        return balance < 10;
    }

    // ── Fetch Data ──
    async function fetchPanels() {
        try {
            const response = await api.getChildPanels();
            let rawData = response.data || response.panels || response;
            
            // Fallback if Firebase returns an object instead of array
            if (!Array.isArray(rawData) && typeof rawData === 'object') {
                rawData = Object.keys(rawData).map(key => ({ id: key, ...rawData[key] }));
            }

            allPanels = rawData.map(normalizePanelData);
            applyFilters();
            renderStats();
        } catch (error) {
            console.error('Fetch error:', error);
            showToast('Failed to load panel wallets', 'error');
            els.tableBody.innerHTML = `<tr><td colspan="10" class="text-center text-muted">Failed to load data.</td></tr>`;
        }
    }

    // ── Stats ──
    function renderStats() {
        let totalBalance = 0, totalDeposited = 0, totalDeducted = 0, lowCount = 0;

        allPanels.forEach(p => {
            totalBalance += p.balance;
            totalDeposited += p.totalDeposited;
            totalDeducted += p.totalSpent;
            if (isLowBalance(p.balance)) lowCount++;
        });

        if (els.statTotalBalance) els.statTotalBalance.textContent = formatCurrency(totalBalance);
        if (els.statTotalDeposited) els.statTotalDeposited.textContent = formatCurrency(totalDeposited);
        if (els.statTotalDeducted) els.statTotalDeducted.textContent = formatCurrency(totalDeducted);
        if (els.statLowBalance) els.statLowBalance.textContent = lowCount;
    }

    // ── Filter & Sort ──
    function applyFilters() {
        let result = [...allPanels];

        // Tab Filters
        if (currentFilter === 'active') result = result.filter(p => p.status === 'active');
        else if (currentFilter === 'suspended') result = result.filter(p => p.status === 'suspended');
        else if (currentFilter === 'low') result = result.filter(p => isLowBalance(p.balance));

        // Search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(p => {
                return [p.panelName, p.ownerUsername, p.ownerEmail, getDomain(p), p.id]
                    .filter(Boolean).join(' ').toLowerCase().includes(q);
            });
        }

        // Sorting (FIXED BUG: Uses a and b properly)
        if (sortField) {
            result.sort((a, b) => {
                let valA, valB;
                if (sortField === 'panel') {
                    valA = a.panelName.toLowerCase();
                    valB = b.panelName.toLowerCase();
                } else if (sortField === 'balance') {
                    valA = a.balance;
                    valB = b.balance;
                } else {
                    valA = a[sortField] || '';
                    valB = b[sortField] || '';
                }
                if (valA < valB) return sortAsc ? -1 : 1;
                if (valA > valB) return sortAsc ? 1 : -1;
                return 0;
            });
        }

        filteredPanels = result;
        currentPage = 1;
        renderTable();
    }

    // ── Render Table ──
    function renderTable() {
        const totalItems = filteredPanels.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
        if (currentPage > totalPages) currentPage = totalPages;

        const start = (currentPage - 1) * pageSize;
        const end = Math.min(start + pageSize, totalItems);
        const pageData = filteredPanels.slice(start, end);

        if (els.tableCount) els.tableCount.textContent = `${totalItems} panel${totalItems !== 1 ? 's' : ''}`;

        if (pageData.length === 0) {
            els.tableBody.innerHTML = `<tr><td colspan="10" class="text-center text-muted">No panels found.</td></tr>`;
            if (els.tableFooter) els.tableFooter.style.display = 'none';
            return;
        }

        els.tableBody.innerHTML = pageData.map(p => {
            const domain = getDomain(p);
            const low = isLowBalance(p.balance);
            const selected = selectedPanelIds.has(p.id);

            return `
                <tr data-panel-id="${p.id}" class="wallet-row${low ? ' wallet-row--low-balance' : ''}">
                    <td><input type="checkbox" class="form-checkbox wallet-checkbox" data-panel-id="${p.id}" ${selected ? 'checked' : ''}></td>
                    <td>
                        <div class="cell-panel">
                            <div class="cell-panel__avatar">${getInitials(p.panelName)}</div>
                            <div class="cell-panel__info">
                                <span class="cell-panel__name">${p.panelName}</span>
                                <span class="cell-panel__id text-muted">${p.id}</span>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="cell-owner">${p.ownerUsername}</span>
                        <br><span class="text-muted cell-owner-email" style="font-size: 12px;">${p.ownerEmail}</span>
                    </td>
                    <td>${domain ? `<a href="https://${domain}" target="_blank" class="cell-domain">${domain}</a>` : '<span class="text-muted">—</span>'}</td>
                    <td class="text-right">
                        <span class="cell-balance${low ? ' text-danger' : ''}">${formatCurrency(p.balance)}</span>
                        ${low ? '<br><span style="font-size: 11px;" class="text-danger">LOW BALANCE</span>' : ''}
                    </td>
                    <td class="text-right text-muted">${formatCurrency(p.totalDeposited)}</td>
                    <td class="text-right text-muted">${formatCurrency(p.totalSpent)}</td>
                    <td class="text-center">${statusBadge(p.status)}</td>
                    <td class="text-center">${planBadge(p.plan)}</td>
                    <td>
                        <div class="dropdown" data-dropdown>
                            <button class="btn btn--icon dropdown__trigger" data-dropdown-trigger>
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                            </button>
                            <div class="dropdown__menu">
                                <button class="dropdown__item" data-action="add-funds" data-panel-id="${p.id}">Add Funds</button>
                                <button class="dropdown__item" data-action="deduct-funds" data-panel-id="${p.id}">Deduct Funds</button>
                                <button class="dropdown__item" data-action="set-balance" data-panel-id="${p.id}">Set Balance</button>
                                <div class="dropdown__divider"></div>
                                <button class="dropdown__item" data-action="view-history" data-panel-id="${p.id}">View Transactions</button>
                                <button class="dropdown__item" data-action="open-panel" data-panel-id="${p.id}" data-domain="${domain}">Open Panel</button>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Pagination Controls
        if (totalItems > pageSize) {
            if (els.tableFooter) els.tableFooter.style.display = '';
            if (els.showingInfo) els.showingInfo.textContent = `Showing ${start + 1}–${end} of ${totalItems}`;
            renderPagination(els.pagination, currentPage, totalPages, (page) => { currentPage = page; renderTable(); });
        } else {
            if (els.tableFooter) els.tableFooter.style.display = 'none';
        }

        // Sync Select All Checkbox
        if (els.selectAll) {
            const visibleIds = pageData.map(p => p.id);
            els.selectAll.checked = visibleIds.length > 0 && visibleIds.every(id => selectedPanelIds.has(id));
        }

        bindRowEvents();
    }

    // ── Pagination Helper ──
    function renderPagination(container, current, total, onPageChange) {
        if (!container) return;
        let html = `<button class="btn btn--sm btn--outline" ${current <= 1 ? 'disabled' : ''} data-page="${current - 1}">&laquo;</button>`;
        const maxVisible = 5;
        let startPage = Math.max(1, current - Math.floor(maxVisible / 2));
        let endPage = Math.min(total, startPage + maxVisible - 1);
        if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);

        if (startPage > 1) {
            html += `<button class="btn btn--sm btn--outline" data-page="1">1</button>`;
            if (startPage > 2) html += `<span class="text-muted" style="padding: 0 4px;">...</span>`;
        }
        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="btn btn--sm ${i === current ? 'btn--primary' : 'btn--outline'}" data-page="${i}">${i}</button>`;
        }
        if (endPage < total) {
            if (endPage < total - 1) html += `<span class="text-muted" style="padding: 0 4px;">...</span>`;
            html += `<button class="btn btn--sm btn--outline" data-page="${total}">${total}</button>`;
        }
        html += `<button class="btn btn--sm btn--outline" ${current >= total ? 'disabled' : ''} data-page="${current + 1}">&raquo;</button>`;

        container.innerHTML = html;
        container.querySelectorAll('[data-page]').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = parseInt(btn.dataset.page);
                if (page >= 1 && page <= total) onPageChange(page);
            });
        });
    }

    // ── Event Bindings ──
    function bindRowEvents() {
        $$('.wallet-checkbox').forEach(cb => {
            cb.addEventListener('change', () => {
                cb.checked ? selectedPanelIds.add(cb.dataset.panelId) : selectedPanelIds.delete(cb.dataset.panelId);
                syncSelectAll();
            });
        });

        $$('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeAllDropdowns();
                const { action, panelId, domain } = btn.dataset;
                
                if (action === 'add-funds') openAddFunds(panelId);
                else if (action === 'deduct-funds') openDeductFunds(panelId);
                else if (action === 'set-balance') openSetBalance(panelId);
                else if (action === 'view-history') openHistory(panelId);
                else if (action === 'open-panel' && domain) window.open('https://' + domain, '_blank');
            });
        });
    }

    function syncSelectAll() {
        if (!els.selectAll) return;
        const checkboxes = $$('.wallet-checkbox');
        els.selectAll.checked = checkboxes.length > 0 && [...checkboxes].every(cb => cb.checked);
    }

    function closeAllDropdowns() { $$('[data-dropdown]').forEach(d => d.classList.remove('dropdown--open')); }
    function openModal(modal) { if (modal) modal.classList.add('modal--active'); }
    function closeModal(modal) { if (modal) modal.classList.remove('modal--active'); }

    $$('[data-modal-close]').forEach(trigger => {
        trigger.addEventListener('click', () => closeModal(document.getElementById(trigger.dataset.modalClose)));
    });

    // ── MODALS ──

    // 1. Add Funds
    function openAddFunds(panelId) {
        const panel = getPanel(panelId); if (!panel) return;
        if (els.addFundsPanelId) els.addFundsPanelId.value = panelId;
        if (els.addFundsPanelLabel) els.addFundsPanelLabel.textContent = `${panel.panelName} — ${getDomain(panel)}`;
        if (els.addFundsCurrentBalance) els.addFundsCurrentBalance.textContent = formatCurrency(panel.balance);
        if (els.addFundsNewBalance) els.addFundsNewBalance.textContent = formatCurrency(panel.balance);
        if (els.addFundsAmount) els.addFundsAmount.value = '';
        if (els.addFundsDescription) els.addFundsDescription.value = '';
        openModal(els.addFundsModal);
    }

    if (els.addFundsAmount) {
        els.addFundsAmount.addEventListener('input', () => {
            const panel = getPanel(els.addFundsPanelId.value); if (!panel) return;
            const amount = parseFloat(els.addFundsAmount.value) || 0;
            if (els.addFundsNewBalance) els.addFundsNewBalance.textContent = formatCurrency(panel.balance + amount);
        });
    }

    if (els.addFundsForm) {
        els.addFundsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const amount = parseFloat(els.addFundsAmount.value);
            if (isNaN(amount) || amount <= 0) return showToast('Please enter a valid amount', 'error');

            const btn = els.addFundsForm.querySelector('button[type="submit"]');
            btn.disabled = true; btn.textContent = 'Processing...';
            try {
                await api.fundChildPanelWallet(els.addFundsPanelId.value, amount, els.addFundsDescription.value || 'Manual deposit');
                showToast('Funds added successfully', 'success');
                closeModal(els.addFundsModal); await fetchPanels();
            } catch (error) { showToast(error.message || 'Failed to add funds', 'error'); }
            finally { btn.disabled = false; btn.textContent = 'Add Funds'; }
        });
    }

    // 2. Deduct Funds
    function openDeductFunds(panelId) {
        const panel = getPanel(panelId); if (!panel) return;
        if (els.deductFundsPanelId) els.deductFundsPanelId.value = panelId;
        if (els.deductFundsPanelLabel) els.deductFundsPanelLabel.textContent = `${panel.panelName} — ${getDomain(panel)}`;
        if (els.deductFundsCurrentBalance) els.deductFundsCurrentBalance.textContent = formatCurrency(panel.balance);
        if (els.deductFundsNewBalance) els.deductFundsNewBalance.textContent = formatCurrency(panel.balance);
        if (els.deductFundsAmount) els.deductFundsAmount.value = '';
        if (els.deductFundsDescription) els.deductFundsDescription.value = '';
        if (els.deductFundsError) els.deductFundsError.style.display = 'none';
        openModal(els.deductFundsModal);
    }

    if (els.deductFundsAmount) {
        els.deductFundsAmount.addEventListener('input', () => {
            const panel = getPanel(els.deductFundsPanelId.value); if (!panel) return;
            const amount = parseFloat(els.deductFundsAmount.value) || 0;
            if (els.deductFundsNewBalance) els.deductFundsNewBalance.textContent = formatCurrency(panel.balance - amount);
            if (els.deductFundsError) els.deductFundsError.style.display = amount > panel.balance ? '' : 'none';
        });
    }

    if (els.deductFundsForm) {
        els.deductFundsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const panel = getPanel(els.deductFundsPanelId.value);
            const amount = parseFloat(els.deductFundsAmount.value);
            if (isNaN(amount) || amount <= 0) return showToast('Please enter a valid amount', 'error');
            if (amount > panel.balance) { if (els.deductFundsError) els.deductFundsError.style.display = ''; return; }

            const btn = els.deductFundsForm.querySelector('button[type="submit"]');
            btn.disabled = true; btn.textContent = 'Processing...';
            try {
                await api.deductChildPanelWallet(els.deductFundsPanelId.value, amount, els.deductFundsDescription.value || 'Manual deduction');
                showToast('Funds deducted successfully', 'success');
                closeModal(els.deductFundsModal); await fetchPanels();
            } catch (error) { showToast(error.message || 'Failed to deduct funds', 'error'); }
            finally { btn.disabled = false; btn.textContent = 'Deduct Funds'; }
        });
    }

    // 3. Set Balance
    function openSetBalance(panelId) {
        const panel = getPanel(panelId); if (!panel) return;
        if (els.setBalancePanelId) els.setBalancePanelId.value = panelId;
        if (els.setBalancePanelLabel) els.setBalancePanelLabel.textContent = `${panel.panelName} — ${getDomain(panel)}`;
        if (els.setBalanceAmount) els.setBalanceAmount.value = panel.balance.toFixed(2);
        if (els.setBalanceReason) els.setBalanceReason.value = '';
        openModal(els.setBalanceModal);
    }

    if (els.setBalanceForm) {
        els.setBalanceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const amount = parseFloat(els.setBalanceAmount.value);
            if (isNaN(amount) || amount < 0) return showToast('Please enter a valid amount', 'error');
            if (!els.setBalanceReason.value.trim()) return showToast('Please provide a reason', 'error');

            const btn = els.setBalanceForm.querySelector('button[type="submit"]');
            btn.disabled = true; btn.textContent = 'Processing...';
            try {
                await api.setChildPanelBalance(els.setBalancePanelId.value, amount, els.setBalanceReason.value);
                showToast('Balance updated successfully', 'success');
                closeModal(els.setBalanceModal); await fetchPanels();
            } catch (error) { showToast(error.message || 'Failed to set balance', 'error'); }
            finally { btn.disabled = false; btn.textContent = 'Set Balance'; }
        });
    }

    // 4. Transaction History
    async function openHistory(panelId) {
        const panel = getPanel(panelId); if (!panel) return;
        if (els.historyPanelLabel) els.historyPanelLabel.textContent = `${panel.panelName} — ${getDomain(panel)}`;
        if (els.historyPanelBalance) els.historyPanelBalance.textContent = formatCurrency(panel.balance);
        if (els.historyTableBody) els.historyTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Loading...</td></tr>`;
        if (els.historyTableFooter) els.historyTableFooter.style.display = 'none';
        openModal(els.historyModal);

        try {
            const response = await api.getChildPanelTransactions(panelId);
            const transactions = response.data || [];
            renderHistoryTable(transactions);
        } catch (error) {
            if (els.historyTableBody) els.historyTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Failed to load transactions.</td></tr>`;
            showToast('Failed to load transaction history', 'error');
        }
    }

    function renderHistoryTable(transactions) {
        if (!transactions.length) {
            if (els.historyTableBody) els.historyTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No transactions found.</td></tr>`;
            if (els.historyTableFooter) els.historyTableFooter.style.display = 'none';
            return;
        }
        if (els.historyTableBody) {
            els.historyTableBody.innerHTML = transactions.map(tx => {
                const isCredit = tx.type === 'credit';
                return `
                    <tr>
                        <td class="text-muted">${tx.date || tx.createdAt || '—'}</td>
                        <td>${tx.description || '—'}</td>
                        <td class="text-right ${isCredit ? 'text-success' : 'text-danger'}">${isCredit ? '+' : '-'}${formatCurrency(tx.amount || 0)}</td>
                        <td class="text-center"><span class="badge badge--default">${tx.source || 'System'}</span></td>
                    </tr>
                `;
            }).join('');
        }
        if (els.historyTableFooter) {
            els.historyTableFooter.style.display = '';
            if (els.historyShowingInfo) els.historyShowingInfo.textContent = `Showing ${transactions.length} transaction${transactions.length !== 1 ? 's' : ''}`;
        }
    }

    // 5. Bulk Top Up
    if (els.bulkTopUpBtn) {
        els.bulkTopUpBtn.addEventListener('click', () => {
            const count = selectedPanelIds.size;
            if (els.bulkSelectedCount) els.bulkSelectedCount.textContent = count > 0 ? `${count} panel${count > 1 ? 's' : ''} selected` : '0 panels selected';
            if (els.bulkAmount) els.bulkAmount.value = '';
            if (els.bulkDescription) els.bulkDescription.value = '';
            if (els.bulkTotalAmount) els.bulkTotalAmount.textContent = '$0.00';
            openModal(els.bulkTopUpModal);
        });
    }

    if (els.bulkAmount) {
        els.bulkAmount.addEventListener('input', () => {
            const amount = parseFloat(els.bulkAmount.value) || 0;
            if (els.bulkTotalAmount) els.bulkTotalAmount.textContent = formatCurrency(amount * selectedPanelIds.size);
        });
    }

    if (els.bulkTopUpForm) {
        els.bulkTopUpForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (selectedPanelIds.size === 0) return showToast('No panels selected', 'error');
            const amount = parseFloat(els.bulkAmount.value);
            if (isNaN(amount) || amount <= 0) return showToast('Please enter a valid amount', 'error');

            const btn = els.bulkTopUpForm.querySelector('button[type="submit"]');
            btn.disabled = true; btn.textContent = 'Processing...';
            try {
                await api.bulkFundChildPanelWallets([...selectedPanelIds], amount, els.bulkDescription.value || 'Bulk top up');
                showToast(`$${amount.toFixed(2)} added to ${selectedPanelIds.size} panels`, 'success');
                selectedPanelIds.clear();
                closeModal(els.bulkTopUpModal); await fetchPanels();
            } catch (error) { showToast(error.message || 'Bulk top up failed', 'error'); }
            finally { btn.disabled = false; btn.textContent = 'Top Up All Selected'; }
        });
    }

    // ── Global Listeners ──
    
    // Filter Tabs
    if (els.filterTabs) {
        els.filterTabs.querySelectorAll('[data-filter]').forEach(tab => {
            tab.addEventListener('click', () => {
                els.filterTabs.querySelectorAll('[data-filter]').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentFilter = tab.dataset.filter;
                applyFilters();
            });
        });
    }

    // Search with Debounce
    if (els.search) {
        let timeout;
        els.search.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => { searchQuery = els.search.value.trim(); applyFilters(); }, 250);
        });
    }

    // Select All Checkbox
    if (els.selectAll) {
        els.selectAll.addEventListener('change', () => {
            const checked = els.selectAll.checked;
            $$('.wallet-checkbox').forEach(cb => {
                cb.checked = checked;
                checked ? selectedPanelIds.add(cb.dataset.panelId) : selectedPanelIds.delete(cb.dataset.panelId);
            });
        });
    }

    // Column Sorting
    $$('#walletTable th[data-sort]').forEach(th => {
        th.style.cursor = 'pointer';
        th.addEventListener('click', () => {
            const field = th.dataset.sort;
            if (sortField === field) sortAsc = !sortAsc; 
            else { sortField = field; sortAsc = true; }
            applyFilters();
        });
    });

    // Close Dropdowns on Outside Click
    document.addEventListener('click', (e) => { if (!e.target.closest('[data-dropdown]')) closeAllDropdowns(); });

    // ── Initialize ──
    await fetchPanels();
}