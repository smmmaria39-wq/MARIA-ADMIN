import { $$ } from '../utils/helpers.js';
import { showToast } from '../components/toast.js';
import { api } from '../utils/api.js';
export default async function initProfile() {
 const tabs=$$('.settings-card .tab');tabs.forEach(tab=>tab.addEventListener('click',()=>{tabs.forEach(t=>t.classList.remove('active'));tab.classList.add('active');}));
 const form=document.querySelector('.settings-content form');if(!form)return;
 const fields={fullname:form.querySelector('[name="fullname"],#fullname'),username:form.querySelector('[name="username"],#username'),country:form.querySelector('[name="country"],#country'),phone:form.querySelector('[name="phone"],#phone')};
 try{const res=await api.getMe();const u=res.data||{};Object.entries(fields).forEach(([k,el])=>{if(el&&u[k]!=null)el.value=u[k];});}catch(e){showToast(`Could not load profile: ${e.message}`,'error');}
 form.addEventListener('submit',async e=>{e.preventDefault();const payload={};Object.entries(fields).forEach(([k,el])=>{if(el)payload[k]=el.value.trim();});const submit=form.querySelector('[type="submit"]');if(submit)submit.disabled=true;try{await api.updateProfile(payload);showToast('Profile updated successfully.','success');}catch(err){showToast(`Profile update failed: ${err.message}`,'error');}finally{if(submit)submit.disabled=false;}});
}
