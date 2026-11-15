import { $$ } from '../utils/helpers.js';
import { showToast } from '../components/toast.js';
export default async function initSettings() {
 const tabs=$$('.settings-card .tab');
 tabs.forEach(tab=>tab.addEventListener('click',()=>{tabs.forEach(t=>t.classList.remove('active'));tab.classList.add('active');showToast(`Viewing ${tab.textContent.trim()} settings`,'info');}));
 const form=document.querySelector('.settings-content form');
 if(form) form.addEventListener('submit',e=>{e.preventDefault();showToast('Settings were not saved: the supplied backend has no admin settings persistence endpoint.','warning');});
}
