import { api } from '../utils/api.js';
import { formatCurrency } from '../utils/formatter.js';
import { showToast } from '../components/toast.js';
let dataset={users:[],orders:[],payments:[],suppliers:[]}, filtered={};
const dateOf=x=>{const v=x?.createdAt||x?.created_at||x?.date||x?.timestamp; if(!v)return null; const d=typeof v==='number'?new Date(v<1e12?v*1000:v):new Date(v); return Number.isNaN(d.getTime())?null:d;};
const statusOf=x=>String(x?.status||'unknown').toLowerCase();
const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export default async function initReports(){
 const ids=['r-users','r-orders','r-revenue','r-pending'];
 try{
  const [u,o,p,s]=await Promise.all([api.getUsers(),api.getOrders(),api.getPayments(),api.getSuppliers()]);
  dataset={users:Array.isArray(u.data)?u.data:[],orders:Array.isArray(o.data)?o.data:[],payments:Array.isArray(p.data)?p.data:[],suppliers:Array.isArray(s.data)?s.data:[]};
  document.getElementById('apply-report-filter')?.addEventListener('click',render);
  document.getElementById('reset-report-filter')?.addEventListener('click',()=>{document.getElementById('report-from').value='';document.getElementById('report-to').value='';render();});
  document.getElementById('export-report')?.addEventListener('click',exportCsv); render();
 }catch(e){ids.forEach(id=>{const el=document.getElementById(id);if(el)el.textContent='Unavailable';});showToast(`Reports could not load: ${e.message}`,'error');}
}
function within(x){const d=dateOf(x); if(!d)return true; const from=document.getElementById('report-from')?.value, to=document.getElementById('report-to')?.value; return (!from||d>=new Date(`${from}T00:00:00`))&&(!to||d<=new Date(`${to}T23:59:59.999`));}
function countStatuses(items){return items.reduce((a,x)=>{const k=statusOf(x);a[k]=(a[k]||0)+1;return a;},{});}
function render(){const orders=dataset.orders.filter(within), payments=dataset.payments.filter(within); filtered={orders,payments};
 const approved=payments.filter(x=>statusOf(x)==='approved').reduce((n,x)=>n+(Number(x.amount)||0),0);
 document.getElementById('r-users').textContent=dataset.users.length.toLocaleString();document.getElementById('r-orders').textContent=orders.length.toLocaleString();document.getElementById('r-revenue').textContent=formatCurrency(approved);document.getElementById('r-pending').textContent=orders.filter(x=>['pending','processing'].includes(statusOf(x))).length.toLocaleString();
 renderBreakdown('order-status-report',countStatuses(orders));renderBreakdown('payment-status-report',countStatuses(payments));renderSuppliers(orders);
}
function renderBreakdown(id,counts){const el=document.getElementById(id);if(!el)return;const entries=Object.entries(counts);el.innerHTML=entries.length?entries.sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="report-row"><span>${safe(k)}</span><strong>${v.toLocaleString()}</strong></div>`).join(''):'<p>No records in this date range.</p>';}
function renderSuppliers(orders){const body=document.getElementById('supplier-report-body');if(!body)return;const groups=new Map();orders.forEach(o=>{const key=o.supplierName||o.supplier||o.providerName||o.supplierId;if(!key)return;const g=groups.get(String(key))||{total:0,done:0};g.total++;if(['completed','complete'].includes(statusOf(o)))g.done++;groups.set(String(key),g);});body.innerHTML=groups.size?[...groups].map(([name,g])=>`<tr><td>${safe(name)}</td><td>${g.total}</td><td>${g.done}</td><td>${g.total?((g.done/g.total)*100).toFixed(1):'0.0'}%</td></tr>`).join(''):'<tr><td colspan="4">No supplier-linked orders were returned by the API.</td></tr>';}
function exportCsv(){const rows=[['Report','Value'],['Registered users',dataset.users.length],['Orders in range',filtered.orders?.length||0],['Approved payments',filtered.payments?.filter(x=>statusOf(x)==='approved').reduce((n,x)=>n+(Number(x.amount)||0),0)||0],['Pending/processing orders',filtered.orders?.filter(x=>['pending','processing'].includes(statusOf(x))).length||0]];const csv=rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`smmmaria-report-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);}
