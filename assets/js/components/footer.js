// ===============================================
// Footer Component
// ===============================================
export function initFooter() {
 const footer = document.querySelector('.footer__text');
 if (footer) {
  const year = new Date().getFullYear();
  footer.textContent = `© ${year} SMMMARIA Admin Panel. All rights reserved.`;
 }
}