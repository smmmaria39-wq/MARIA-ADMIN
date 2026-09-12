// ===============================================
// Validators Utility
// ===============================================

export const isRequired = (value) => value.trim() !== '' || 'This field is required';
export const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || 'Invalid email address';
export const isUrl = (value) => {
 try {
  new URL(value);
  return true;
 } catch {
  return 'Invalid URL format';
 }
};
export const minLength = (value, len) => value.length >= len || `Must be at least ${len} characters`;