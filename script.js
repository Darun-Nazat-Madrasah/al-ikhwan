const sb = (window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY)
  ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY) : null;

const money = n => `৳ ${Number(n || 0).toLocaleString('bn-BD', {minimumFractionDigits: 0, maximumFractionDigits: 2})}`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const nowDate = () => new Date().toISOString().slice(0,10);
let members=[], annual=[], notices=[], history=[];
let admin=false;

function msg(text, ok=false){ const el=document.querySelector('#message'); if(el){el.textContent=text; el.className=ok?'ok':'error';} }
function show(el, yes=true){document.querySelector(el)?.classList.toggle('hidden',!yes)}

async function loadPublic(){
  if(!sb){msg('Supabase config পাওয়া যায়নি।');return;}
  const [m,y,a,h,n]=await Promise.all([
    sb.from('public_member_accounts').select('member_id,name,father_name,total_deposit,total_due').order('name'),
    sb.from('public_yearly_summary').select('*').order('year'),
    sb.from('public_all_years_summary').select('*').maybeSingle(),
    sb.from('public_payment_history').select('*').order('year',{ascending:false}).order('month',{ascending:false}),
    sb.from('public_notices').select('*').order('publish_date',{ascending:false})
  ]);
  const err=[m,y,a,h,n].find(x=>x.error); if(err){console.error(err.error);msg('ডাটাবেস থেকে তথ্য লোড করা যায়নি।');return;}
  members=m.data||[]; annual=y.data||[]; history=h.data||[]; notices=n.data||[];
  renderPublic(a.data||{}); renderMembers(); renderYears(); renderHistory(); renderNotices(); fillYears();
}
function renderPublic(all){
  const totalDeposit=Number(all.total_deposit||members.reduce((s,x)=>s+Number(x.total_deposit||0),0));
  const totalDue=Number(all.total_due||members.reduce((s,x)=>s+Number(x.total_due||0),0));
  document.querySelector('#activeMembers').textContent=members.length.toLocaleString('bn-BD');
  document.querySelector('#totalDeposit').textContent=money(totalDeposit);
  document.querySelector('#totalDue').textContent=money(totalDue);
  document.querySelector('#totalProfit').textContent=money(all.total_profit||annual.reduce((s,x)=>s+Number(x.total_profit||0),0));
  document.querySelector('#totalExpense').textContent=money(all.total_expense||annual.reduce((s,x)=>s+Number(x.total_expense||0),0));
  document.querySelector('#currentBalance').textContent=money(all.current_balance||0);
}
function renderMembers(){
  const q=(document.querySelector('#search')?.value||'').trim().toLowerCase();
  const rows=members.filter(x=>`${x.name} ${x.father_name||''}`.toLowerCase().includes(q));
  document.querySelector('#memberRows').innerHTML=rows.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.father_name||'-')}</td><td>${money(x.total_deposit)}</td><td>${money(x.total_due)}</td></tr>`).join('')||'<tr><td colspan="4">কোনো সদস্য পাওয়া যায়নি</td></tr>';
}
function renderYears(){
  document.querySelector('#yearRows').innerHTML=annual.map(x=>`<tr><td>${x.year}</td><td>${money(x.total_deposit)}</td><td>${money(x.total_due)}</td><td>${money(x.total_profit)}</td><td>${money(x.total_expense)}</td><td>${money(x.total_investment)}</td></tr>`).join('')||'<tr><td colspan="6">এখনও কোনো বছরের হিসাব নেই</td></tr>';
}
function renderHistory(){
  document.querySelector('#historyRows').innerHTML=history.map(x=>`<tr><td>${esc(x.name)}</td><td>${x.year}</td><td>${Number(x.month).toLocaleString('bn-BD')}</td><td>${money(x.required_amount)}</td><td>${money(x.paid_amount)}</td><td>${money(x.due_amount)}</td><td>${x.payment_date||'-'}</td></tr>`).join('')||'<tr><td colspan="7">এখনও কোনো জমার তথ্য নেই</td></tr>';
}
function renderNotices(){document.querySelector('#noticeRows').innerHTML=notices.map(x=>`<article class="notice"><h3>${esc(x.title)}</h3><p>${esc(x.description)}</p><small>${x.publish_date||''}</small></article>`).join('')||'<p>এখনও কোনো প্রকাশিত নোটিশ নেই।</p>';}
function fillYears(){document.querySelector('#yearSelect').innerHTML='<option value="all">সকল বছর</option>'+annual.map(x=>`<option value="${x.year}">${x.year}</option>`).join('');showYear('all');}
function showYear(v){const rows=v==='all'?annual:annual.filter(x=>String(x.year)===String(v)); ['Deposit','Due','Profit','Expense','Investment'].forEach((k,i)=>document.querySelector('#annual'+k).textContent=money(rows.reduce((s,x)=>s+Number(x[['total_deposit','total_due','total_profit','total_expense','total_investment'][i]]||0),0)));}

async function login(){
  const email=document.querySelector('#adminEmail').value.trim(), password=document.querySelector('#adminPassword').value;
  if(!email||!password){msg('ইমেইল ও পাসওয়ার্ড দিন।');return;}
  const {error}=await sb.auth.signInWithPassword({email,password}); if(error){msg('লগইন ব্যর্থ: '+error.message);return;} await refreshAdmin(); msg('Admin লগইন সফল।',true);
}
async function logout(){await sb.auth.signOut();admin=false;show('#adminPanel',false);show('#loginBox',true);}
async function refreshAdmin(){const {data:{session}}=await sb.auth.getSession(); if(!session){admin=false;show('#adminPanel',false);show('#loginBox',true);return;}
  const {data,error}=await sb.from('admin_users').select('role').eq('user_id',session.user.id).maybeSingle();
  admin=!error && data?.role==='admin'; show('#adminPanel',admin);show('#loginBox',!admin); if(admin) loadAdmin();
}
async function loadAdmin(){
  const [m,p,pr,e,n]=await Promise.all([
    sb.from('members').select('*').order('name'), sb.from('payments').select('*').order('year',{ascending:false}).order('month',{ascending:false}),
    sb.from('profits').select('*').order('year',{ascending:false}), sb.from('expenses').select('*').order('year',{ascending:false}), sb.from('notices').select('*').order('publish_date',{ascending:false})
  ]);
  const err=[m,p,pr,e,n].find(x=>x.error);if(err){document.querySelector('#adminData').textContent='Admin ডাটা লোড হয়নি: '+err.error.message;return;}
  document.querySelector('#adminMemberRows').innerHTML=(m.data||[]).map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.father_name||'-')}</td><td>${esc(x.mobile||'-')}</td><td>${x.status}</td></tr>`).join('')||'<tr><td colspan="4">কোনো সদস্য নেই</td></tr>';
  document.querySelector('#memberSelect').innerHTML=(m.data||[]).filter(x=>x.status==='active').map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');
  document.querySelector('#adminData').textContent=`Admin mode চালু। সদস্য: ${(m.data||[]).length}, জমার রেকর্ড: ${(p.data||[]).length}, লাভের বছর: ${(pr.data||[]).length}, খরচের রেকর্ড: ${(e.data||[]).length}, নোটিশ: ${(n.data||[]).length}`;
}
async function addMember(){
  const name=document.querySelector('#memberName').value.trim(); if(!name){msg('সদস্যের নাম দিন।');return;}
  const {error}=await sb.from('members').insert({name,father_name:document.querySelector('#fatherName').value.trim()||null,mobile:document.querySelector('#mobile').value.trim()||null,join_date:document.querySelector('#joinDate').value||null,status:'active'});
  if(error){msg(error.message);return;} msg('সদস্য যোগ হয়েছে।',true);document.querySelector('#memberForm').reset();await loadAdmin();await loadPublic();
}
async function addPayment(){
  const member_id=document.querySelector('#memberSelect').value,year=Number(document.querySelector('#payYear').value),month=Number(document.querySelector('#payMonth').value),paid=Number(document.querySelector('#paidAmount').value||0),required=Number(document.querySelector('#requiredAmount').value||500);
  if(!member_id||!year||!month){msg('সদস্য, বছর ও মাস নির্বাচন করুন।');return;}
  const {error}=await sb.from('payments').upsert({member_id,year,month,required_amount:required,paid_amount:paid,due_amount:Math.max(required-paid,0),payment_date:document.querySelector('#paymentDate').value||nowDate()},{onConflict:'member_id,year,month'});
  if(error){msg(error.message);return;}msg('জমার তথ্য সংরক্ষণ হয়েছে।',true);document.querySelector('#paymentForm').reset();await loadAdmin();await loadPublic();
}
async function addProfit(){const year=Number(document.querySelector('#profitYear').value),total_profit=Number(document.querySelector('#profitAmount').value||0);const {error}=await sb.from('profits').upsert({year,total_profit},{onConflict:'year'});if(error){msg(error.message);return;}msg('লাভ সংরক্ষণ হয়েছে।',true);document.querySelector('#profitForm').reset();await loadAdmin();await loadPublic();}
async function addExpense(){const year=Number(document.querySelector('#expenseYear').value),amount=Number(document.querySelector('#expenseAmount').value||0),description=document.querySelector('#expenseDesc').value.trim();const {error}=await sb.from('expenses').insert({year,date:document.querySelector('#expenseDate').value||nowDate(),description,amount});if(error){msg(error.message);return;}msg('খরচ সংরক্ষণ হয়েছে।',true);document.querySelector('#expenseForm').reset();await loadAdmin();await loadPublic();}
async function addNotice(){const title=document.querySelector('#noticeTitle').value.trim(),description=document.querySelector('#noticeDesc').value.trim();const {error}=await sb.from('notices').insert({title,description,publish_date:document.querySelector('#noticeDate').value||nowDate(),status:'published'});if(error){msg(error.message);return;}msg('নোটিশ প্রকাশ হয়েছে।',true);document.querySelector('#noticeForm').reset();await loadAdmin();await loadPublic();}

document.querySelector('#search')?.addEventListener('input',renderMembers);document.querySelector('#yearSelect')?.addEventListener('change',e=>showYear(e.target.value));
document.querySelector('#loginBtn')?.addEventListener('click',login);document.querySelector('#logoutBtn')?.addEventListener('click',logout);
document.querySelector('#memberForm')?.addEventListener('submit',e=>{e.preventDefault();addMember()});document.querySelector('#paymentForm')?.addEventListener('submit',e=>{e.preventDefault();addPayment()});document.querySelector('#profitForm')?.addEventListener('submit',e=>{e.preventDefault();addProfit()});document.querySelector('#expenseForm')?.addEventListener('submit',e=>{e.preventDefault();addExpense()});document.querySelector('#noticeForm')?.addEventListener('submit',e=>{e.preventDefault();addNotice()});

document.querySelector('#payYear').value=new Date().getFullYear();document.querySelector('#profitYear').value=new Date().getFullYear();document.querySelector('#expenseYear').value=new Date().getFullYear();
loadPublic(); if(sb) sb.auth.onAuthStateChange(()=>setTimeout(refreshAdmin,0)); refreshAdmin();
