// ===============================================
// Storage Utility
// ===============================================

const THEME_KEY = 'smmmaria_admin_theme';

export const storage = {
 get: (key) => JSON.parse(localStorage.getItem(key)),
 set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
 remove: (key) => localStorage.removeItem(key),
};

export function initTheme() {
 const savedTheme = storage.get(THEME_KEY) || 'light';
 document.documentElement.setAttribute('data-theme', savedTheme);
}

export function toggleTheme() {
 const currentTheme = document.documentElement.getAttribute('data-theme');
 const newTheme = currentTheme === 'light' ? 'dark' : 'light';
 document.documentElement.setAttribute('data-theme', newTheme);
 storage.set(THEME_KEY, newTheme);
}