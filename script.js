const sb=(window.supabase&&window.SUPABASE_URL&&window.SUPABASE_ANON_KEY)
  ?window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_ANON_KEY):null;

const months=['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
const money=n=>`৳ ${Number(n||0).toLocaleString('bn-BD')}`;
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const q=id=>document.getElementById(id);
let members=[],payments=[],profits=[],expenses=[],assets=[],notices=[],adminUser=null,years=[];

function getYears(){
  const set=new Set();
  [payments,profits,expenses,assets].forEach(list=>list.forEach(x=>{if(x.year!=null)set.add(String(x.year))}));
  if(!set.size)set.add(String(new Date().getFullYear()));
  return [...set].sort((a,b)=>Number(b)-Number(a));
}
function fillYearSelect(el,includeAll=false){
  if(!el)return;
  const first=includeAll?'<option value="all">সকল বছর</option>':'<option value="">-- সাল নির্বাচন করুন --</option>';
  el.innerHTML=first+years.map(y=>`<option value="${esc(y)}">${esc(y)}</option>`).join('');
}
function fillYearSelectors(){
  years=getYears();
  fillYearSelect(q('personalYear'),true);
  fillYearSelect(q('allMembersYear'),true);
  fillYearSelect(q('paymentManageYear'),true);
}
function fillMemberSelectors(){
  const opts=members.map((m,i)=>`<option value="${esc(m.id)}">${Number(m.serial_no||i+1).toLocaleString('bn-BD')}. ${esc(m.name)}</option>`).join('');
  q('personalMember').innerHTML='<option value="">-- সদস্য নির্বাচন করুন --</option>'+opts;
  q('payMember').innerHTML='<option value="">-- সদস্য নির্বাচন করুন --</option>'+opts;
}
function memberPaid(m,year){
  return payments.filter(p=>String(p.member_id)===String(m.id)&&(!year||year==='all'||Number(p.year)===Number(year))).reduce((s,p)=>s+Number(p.paid_amount||0),0);
}
function memberRequired(m,year){
  return payments.filter(p=>String(p.member_id)===String(m.id)&&(!year||year==='all'||Number(p.year)===Number(year))).reduce((s,p)=>s+Number(p.required_amount??500),0);
}
function memberDue(m,year){return Math.max(memberRequired(m,year)-memberPaid(m,year),0)}
function totalPaid(year){return payments.filter(p=>!year||year==='all'||Number(p.year)===Number(year)).reduce((s,p)=>s+Number(p.paid_amount||0),0)}
function totalRequired(year){return payments.filter(p=>!year||year==='all'||Number(p.year)===Number(year)).reduce((s,p)=>s+Number(p.required_amount??500),0)}
function totalDue(year){return Math.max(totalRequired(year)-totalPaid(year),0)}
function totalExpense(year){return expenses.filter(e=>!year||year==='all'||Number(e.year)===Number(year)).reduce((s,e)=>s+Number(e.amount||0),0)}
function totalProfit(year){return profits.filter(p=>!year||year==='all'||Number(p.year)===Number(year)).reduce((s,p)=>s+Number(p.total_profit||0),0)}
function totalAssets(year){return assets.filter(a=>!year||year==='all'||Number(a.year)===Number(year)).reduce((s,a)=>s+Number(a.amount||0),0)}
function currentFund(){return totalPaid('all')+totalProfit('all')-totalExpense('all')-totalAssets('all')}
function printButton(id){return `<div class="result-print"><button class="print-btn" type="button" onclick="printSection('${id}')">🖨 প্রিন্ট / PDF</button></div>`}

async function load(){
  if(!sb){q('totalResult').innerHTML='<div class="empty-state">Supabase configuration পাওয়া যায়নি।</div>';return;}
  q('totalResult').innerHTML='<div class="loading">ডাটা লোড হচ্ছে...</div>';
  const [m,p,pr,e,a,n]=await Promise.all([
    sb.from('members').select('id,name,mobile,status,serial_no').eq('status','active').order('serial_no',{ascending:true,nullsFirst:false}).order('created_at'),
    sb.from('payments').select('*').order('year').order('month'),
    sb.from('profits').select('*').order('year'),
    sb.from('expenses').select('*').order('date',{ascending:false}),
    sb.from('assets').select('*').eq('status','active').order('date',{ascending:false}),
    sb.from('notices').select('*').eq('status','published').order('publish_date',{ascending:false})
  ]);
  const errors=[m,p,pr,e,a,n].filter(x=>x.error);
  if(errors.length){console.error(...errors.map(x=>x.error));q('totalResult').innerHTML='<div class="empty-state">ডাটা লোড করতে সমস্যা হয়েছে। Supabase/RLS সেটিংস পরীক্ষা করুন।</div>';return;}
  members=m.data||[];payments=p.data||[];profits=pr.data||[];expenses=e.data||[];assets=a.data||[];notices=n.data||[];
  fillYearSelectors();fillMemberSelectors();
  renderTotal();renderFund();renderNotices();renderAllMembersPreview();
  await checkAdmin();
}

function renderPersonal(){
  const y=q('personalYear').value,id=q('personalMember').value;
  q('personalMessage').className='message hidden';
  if(!y||!id){q('personalMessage').textContent='সাল ও সদস্য নির্বাচন করুন।';q('personalMessage').className='message error';return;}
  const m=members.find(x=>String(x.id)===String(id));if(!m)return;
  const label=y==='all'?'সকল বছরের মোট হিসাব':`${y} সালের হিসাব`;
  q('personalResult').innerHTML=`<div class="report-title"><h3>${esc(m.name)}</h3><p>${label}</p></div>
    <div class="member-summary compact-summary">
      <div>মোট পরিশোধ<strong>${money(memberPaid(m,y))}</strong></div>
      <div>মোট বাকি<strong>${money(memberDue(m,y))}</strong></div>
    </div>${printButton('personalResult')}`;
  q('personalResult').scrollIntoView({behavior:'smooth',block:'start'});
}

function paidCell(m,y,month){
  const amount=payments.filter(p=>String(p.member_id)===String(m.id)&&Number(p.year)===Number(y)&&Number(p.month)===month).reduce((s,p)=>s+Number(p.paid_amount||0),0);
  return amount>0?money(amount):'';
}
function renderAllMembers(){
  const y=q('allMembersYear').value||'all';
  if(!y){q('allMembersResult').innerHTML='<div class="empty-state">একটি বছর নির্বাচন করে হিসাব দেখুন।</div>';return;}
  if(y==='all'){
    let h=`<div class="report-title"><h3>সকল বছরের সকল সদস্যদের হিসাব</h3><p>যে মাসে টাকা দেওয়া হয়েছে শুধু সেই টাকাই দেখানো হয়েছে</p></div><div class="table-wrap"><table class="member-report-table"><thead><tr><th>ক্রমিক</th><th class="name nowrap">সদস্যের নাম</th>${years.map(v=>`<th>${esc(v)}</th>`).join('')}<th>মোট পরিশোধ</th><th>মোট বাকি</th></tr></thead><tbody>`;
    members.forEach((m,i)=>{h+=`<tr><td>${Number(m.serial_no||i+1).toLocaleString('bn-BD')}</td><td class="name nowrap">${esc(m.name)}</td>`+years.map(v=>`<td>${memberPaid(m,v)>0?money(memberPaid(m,v)):''}</td>`).join('')+`<td>${money(memberPaid(m,'all'))}</td><td>${money(memberDue(m,'all'))}</td></tr>`});
    h+=`</tbody><tfoot><tr class="total-row"><td colspan="2">সর্বমোট</td>${years.map(v=>`<td>${totalPaid(v)>0?money(totalPaid(v)):''}</td>`).join('')}<td>${money(totalPaid('all'))}</td><td>${money(totalDue('all'))}</td></tr></tfoot></table></div>${printButton('allMembersResult')}`;
    q('allMembersResult').innerHTML=h;return;
  }
  let h=`<div class="report-title"><h3>${esc(y)} সালের সকল সদস্যদের হিসাব</h3><p>প্রতি মাসে শুধু পরিশোধের পরিমাণ দেখানো হয়েছে</p></div><div class="table-wrap"><table class="member-report-table"><thead><tr><th>ক্রমিক</th><th class="name nowrap">সদস্যের নাম</th>${months.map(m=>`<th>${m}</th>`).join('')}<th>মোট পরিশোধ</th><th>মোট বাকি</th></tr></thead><tbody>`;
  members.forEach((m,i)=>{h+=`<tr><td>${Number(m.serial_no||i+1).toLocaleString('bn-BD')}</td><td class="name nowrap">${esc(m.name)}</td>`+months.map((_,mi)=>`<td>${paidCell(m,y,mi+1)}</td>`).join('')+`<td>${money(memberPaid(m,y))}</td><td>${money(memberDue(m,y))}</td></tr>`});
  h+=`</tbody><tfoot><tr class="total-row"><td colspan="2">সর্বমোট</td>${months.map((_,mi)=>{const x=payments.filter(p=>Number(p.year)===Number(y)&&Number(p.month)===mi+1).reduce((s,p)=>s+Number(p.paid_amount||0),0);return `<td>${x>0?money(x):''}</td>`}).join('')}<td>${money(totalPaid(y))}</td><td>${money(totalDue(y))}</td></tr></tfoot></table></div>
  <div class="member-summary"><div>মোট পরিশোধ<strong>${money(totalPaid(y))}</strong></div><div>মোট বাকি<strong>${money(totalDue(y))}</strong></div></div>${printButton('allMembersResult')}`;
  q('allMembersResult').innerHTML=h;
}
function renderAllMembersPreview(){
  const rows=years.map(y=>`<tr><td>${esc(y)}</td><td>${money(totalPaid(y))}</td><td>${money(totalDue(y))}</td></tr>`).join('');
  q('allMembersResult').innerHTML=`<div class="report-title"><h3>সকল সদস্যদের হিসাব</h3><p>সাল নির্বাচন করে বিস্তারিত হিসাব দেখুন</p></div><div class="table-wrap"><table><thead><tr><th>সাল</th><th>মোট পরিশোধ</th><th>মোট বাকি</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderTotal(){
  const deposit=totalPaid('all'),profit=totalProfit('all'),expense=totalExpense('all'),remaining=currentFund();
  q('totalResult').innerHTML=`<div class="report-title"><h3>সংস্থার মোট হিসাব</h3><p>প্রতিষ্ঠার শুরু থেকে সকল বছরের সমন্বিত হিসাব</p></div>
  <div class="summary-grid total-summary">
    <article><span>মোট জমা</span><strong>${money(deposit)}</strong></article>
    <article><span>মোট লভ্যাংশ</span><strong>${money(profit)}</strong></article>
    <article><span>মোট খরচ</span><strong>${money(expense)}</strong></article>
    <article class="highlight"><span>অবশিষ্ট তহবিল</span><strong>${money(remaining)}</strong></article>
  </div>${printButton('totalResult')}`;
}
function renderFund(){
  const deposit=totalPaid('all'),profit=totalProfit('all'),expense=totalExpense('all'),allocated=totalAssets('all'),remaining=currentFund();
  const body=assets.map((a,i)=>`<tr><td>${(i+1).toLocaleString('bn-BD')}</td><td>${esc(a.year)}</td><td>${esc(a.category)}</td><td class="name">${esc(a.description)}</td><td>${money(a.amount)}</td><td>${esc(a.date||'')}</td></tr>`).join('');
  q('fundResult').innerHTML=`<div class="report-title"><h3>তহবিল ব্যবহারের খাতসমূহ</h3><p>যে সকল খাতে তহবিল ব্যবহার করা হয়েছে</p></div>
  <div class="table-wrap"><table><thead><tr><th>ক্রমিক</th><th>সাল</th><th>খাত</th><th class="name">বিস্তারিত</th><th>পরিমাণ</th><th>তারিখ</th></tr></thead><tbody>${body||'<tr><td colspan="6">এখনও কোনো খাত যোগ করা হয়নি।</td></tr>'}</tbody><tfoot><tr class="total-row"><td colspan="4">বিভিন্ন খাতে ব্যবহার করা মোট</td><td>${money(allocated)}</td><td></td></tr></tfoot></table></div>
  <div class="fund-summary-table"><h3>তহবিলের সংক্ষিপ্ত হিসাব</h3><div class="table-wrap"><table><tbody>
    <tr><th>মোট জমা</th><td>${money(deposit)}</td></tr><tr><th>মোট লভ্যাংশ</th><td>${money(profit)}</td></tr><tr><th>মোট বিবিধ খরচ</th><td>${money(expense)}</td></tr><tr><th>বিভিন্ন খাতে ব্যবহার</th><td>${money(allocated)}</td></tr><tr class="highlight-row"><th>বর্তমান অবশিষ্ট তহবিল</th><td><b>${money(remaining)}</b></td></tr>
  </tbody></table></div></div>${printButton('fundResult')}`;
}
function renderNotices(){
  const html=notices.map(n=>`<article class="notice"><h3>${esc(n.title)}</h3><p>${esc(n.description)}</p><small>${esc(n.publish_date||'')}</small></article>`).join('');
  q('noticeResult').innerHTML=(html||'<div class="empty-state">কোনো প্রকাশিত নোটিশ নেই।</div>')+printButton('noticeResult');
}
function showMessage(text,ok=false,target='adminMsg'){const el=q(target);if(!el)return;el.textContent=text;el.className='message '+(ok?'success':'error')}
function resetForm(id){const f=q(id);if(!f)return;f.reset();const h=f.querySelector('[name=id]');if(h)h.value=''}
async function saveOrUpdate(table,form,make){const d=Object.fromEntries(new FormData(form).entries()),id=d.id,row=make(d);const res=id?await sb.from(table).update(row).eq('id',id):await sb.from(table).insert(row);if(res.error){showMessage(res.error.message,false);return false}showMessage('সফলভাবে সংরক্ষণ হয়েছে ✓',true);resetForm(form.id);await load();return true}
async function saveMember(){await saveOrUpdate('members',q('memberForm'),d=>({name:d.name.trim(),mobile:d.mobile||null,status:'active'}))}
async function savePayment(){const f=q('paymentForm'),d=Object.fromEntries(new FormData(f).entries());const row={member_id:d.member_id,year:+d.year,month:+d.month,required_amount:500,paid_amount:+d.paid_amount,payment_date:null};const res=d.id?await sb.from('payments').update(row).eq('id',d.id):await sb.from('payments').upsert(row,{onConflict:'member_id,year,month'});if(res.error){showMessage(res.error.message,false);return}showMessage('মাসিক জমা সংরক্ষণ হয়েছে ✓',true);resetForm('paymentForm');await load()}
async function saveProfit(){const d=Object.fromEntries(new FormData(q('profitForm')).entries());const {error}=await sb.from('profits').upsert({year:+d.year,total_profit:+d.total_profit},{onConflict:'year'});if(error){showMessage(error.message,false);return}showMessage('লভ্যাংশ সংরক্ষণ হয়েছে ✓',true);resetForm('profitForm');await load()}
async function saveExpense(){await saveOrUpdate('expenses',q('expenseForm'),d=>({year:+d.year,date:d.date,description:d.description.trim(),amount:+d.amount}))}
async function saveAsset(){await saveOrUpdate('assets',q('assetForm'),d=>({year:+d.year,date:d.date,category:d.category.trim(),description:d.description.trim(),amount:+d.amount,status:'active'}))}
async function saveNotice(){await saveOrUpdate('notices',q('noticeForm'),d=>({title:d.title.trim(),description:d.description.trim(),status:'published'}))}
async function del(table,id){if(!confirm('এই তথ্যটি মুছে ফেলতে চান?'))return;const {error}=await sb.from(table).delete().eq('id',id);if(error){showMessage(error.message,false);return}showMessage('তথ্য মুছে ফেলা হয়েছে ✓',true);await load()}
function editMember(id){const m=members.find(x=>String(x.id)===String(id));if(!m)return;const f=q('memberForm');f.id.value=m.id;f.name.value=m.name;f.mobile.value=m.mobile||'';openForm('member');f.scrollIntoView({behavior:'smooth',block:'start'})}
function editPayment(id){const p=payments.find(x=>String(x.id)===String(id));if(!p)return;const f=q('paymentForm');f.id.value=p.id;f.member_id.value=p.member_id;f.year.value=p.year;f.month.value=p.month;f.paid_amount.value=p.paid_amount;openForm('payment');f.scrollIntoView({behavior:'smooth',block:'start'})}
function editExpense(id){const x=expenses.find(x=>String(x.id)===String(id));if(!x)return;const f=q('expenseForm');f.id.value=x.id;f.year.value=x.year;f.date.value=x.date;f.description.value=x.description;f.amount.value=x.amount;openForm('expense');f.scrollIntoView({behavior:'smooth',block:'start'})}
function editAsset(id){const x=assets.find(x=>String(x.id)===String(id));if(!x)return;const f=q('assetForm');f.id.value=x.id;f.year.value=x.year;f.date.value=x.date;f.category.value=x.category;f.description.value=x.description;f.amount.value=x.amount;openForm('asset');f.scrollIntoView({behavior:'smooth',block:'start'})}
function editNotice(id){const x=notices.find(x=>String(x.id)===String(id));if(!x)return;const f=q('noticeForm');f.id.value=x.id;f.title.value=x.title;f.description.value=x.description;openForm('notice');f.scrollIntoView({behavior:'smooth',block:'start'})}
function renderAdminData(){
  q('adminMembers').innerHTML=`<table><thead><tr><th>ক্রম</th><th class="name">নাম</th><th>মোবাইল</th><th>অ্যাকশন</th></tr></thead><tbody>`+members.map((m,i)=>`<tr><td>${Number(m.serial_no||i+1).toLocaleString('bn-BD')}</td><td class="name">${esc(m.name)}</td><td>${esc(m.mobile||'-')}</td><td class="row-actions"><button class="small-btn edit" onclick="editMember('${esc(m.id)}')">Edit</button><button class="small-btn del" onclick="del('members','${esc(m.id)}')">Delete</button></td></tr>`).join('')+`</tbody></table>`;
  const selectedYear=q('paymentManageYear').value||'all';
  const paymentRows=payments.filter(p=>selectedYear==='all'||Number(p.year)===Number(selectedYear)).slice().sort((a,b)=>Number(b.year)-Number(a.year)||Number(b.month)-Number(a.month));
  q('adminPayments').innerHTML=`<table><thead><tr><th>সদস্য</th><th>সাল</th><th>মাস</th><th>জমা</th><th>অ্যাকশন</th></tr></thead><tbody>`+paymentRows.map(p=>`<tr><td class="name">${esc(members.find(m=>String(m.id)===String(p.member_id))?.name||'')}</td><td>${esc(p.year)}</td><td>${months[Number(p.month)-1]||''}</td><td>${money(p.paid_amount)}</td><td class="row-actions"><button class="small-btn edit" onclick="editPayment('${esc(p.id)}')">Edit</button><button class="small-btn del" onclick="del('payments','${esc(p.id)}')">Delete</button></td></tr>`).join('')+`</tbody></table>`;
  q('adminExpenses').innerHTML=`<table><thead><tr><th>বছর</th><th>তারিখ</th><th class="name">বিবরণ</th><th>পরিমাণ</th><th>অ্যাকশন</th></tr></thead><tbody>`+expenses.map(x=>`<tr><td>${esc(x.year)}</td><td>${esc(x.date||'')}</td><td class="name">${esc(x.description)}</td><td>${money(x.amount)}</td><td class="row-actions"><button class="small-btn edit" onclick="editExpense('${esc(x.id)}')">Edit</button><button class="small-btn del" onclick="del('expenses','${esc(x.id)}')">Delete</button></td></tr>`).join('')+`</tbody></table>`;
  q('adminAssets').innerHTML=`<table><thead><tr><th>বছর</th><th>খাত</th><th class="name">বিবরণ</th><th>পরিমাণ</th><th>অ্যাকশন</th></tr></thead><tbody>`+assets.map(x=>`<tr><td>${esc(x.year)}</td><td>${esc(x.category)}</td><td class="name">${esc(x.description)}</td><td>${money(x.amount)}</td><td class="row-actions"><button class="small-btn edit" onclick="editAsset('${esc(x.id)}')">Edit</button><button class="small-btn del" onclick="del('assets','${esc(x.id)}')">Delete</button></td></tr>`).join('')+`</tbody></table>`;
  q('adminNotices').innerHTML=`<table><thead><tr><th>শিরোনাম</th><th class="name">বিবরণ</th><th>তারিখ</th><th>অ্যাকশন</th></tr></thead><tbody>`+notices.map(x=>`<tr><td>${esc(x.title)}</td><td class="name">${esc(x.description)}</td><td>${esc(x.publish_date||'')}</td><td class="row-actions"><button class="small-btn edit" onclick="editNotice('${esc(x.id)}')">Edit</button><button class="small-btn del" onclick="del('notices','${esc(x.id)}')">Delete</button></td></tr>`).join('')+`</tbody></table>`;
}
async function checkAdmin(){if(!sb)return;const {data:{session}}=await sb.auth.getSession();adminUser=session?.user||null;if(!adminUser){q('loginBox').hidden=false;q('adminBox').hidden=true;return}const {data,error}=await sb.from('admin_users').select('user_id').eq('user_id',adminUser.id).maybeSingle();if(error||!data){q('loginBox').hidden=false;q('adminBox').hidden=true;q('loginMsg').textContent='এই অ্যাকাউন্টে অ্যাডমিন অনুমতি নেই।';return}q('loginBox').hidden=true;q('adminBox').hidden=false;q('adminUser').textContent=adminUser.email||'Admin';renderAdminData()}
async function login(){if(!sb){showMessage('Supabase configuration পাওয়া যায়নি।',false,'loginMsg');return}showMessage('লগইন হচ্ছে...',true,'loginMsg');const {error}=await sb.auth.signInWithPassword({email:q('adminEmail').value.trim(),password:q('adminPassword').value});if(error){showMessage(error.message,false,'loginMsg');return}await checkAdmin();q('adminPassword').value=''}
async function logout(){await sb.auth.signOut();location.hash='admin';location.reload()}
function openForm(name){document.querySelectorAll('.admin-form').forEach(f=>f.classList.remove('active'));const f=q(name+'Form');if(f)f.classList.add('active')}
function openManagement(name){document.querySelectorAll('.admin-data').forEach(x=>x.classList.remove('active'));q('managementArea').style.display='block';const target=q('manage'+name.charAt(0).toUpperCase()+name.slice(1));if(target)target.classList.add('active');if(name==='payments')renderAdminData()}
function setMenu(open){const menu=q('mobileMenu'),overlay=q('menuOverlay'),btn=q('menuBtn');menu.classList.toggle('open',open);overlay.classList.toggle('show',open);btn.setAttribute('aria-expanded',String(open));document.body.classList.toggle('menu-open',open)}
function openMainMenu(){setMenu(true)}
function route(){const id=(location.hash||'#personal').slice(1);const valid=['personal','members','due','fund','notices','admin'];const active=valid.includes(id)?id:'personal';document.querySelectorAll('.page-section').forEach(s=>s.classList.toggle('active',s.id===active));document.querySelectorAll('#mobileMenu a[data-view]').forEach(a=>a.classList.toggle('active',a.dataset.view===active));setMenu(false)}
function printSection(id){const target=q(id);if(!target)return;document.querySelectorAll('.print-target').forEach(x=>x.classList.remove('print-target'));target.classList.add('print-target');document.body.classList.add('printing-report');setTimeout(()=>{window.print();setTimeout(()=>{target.classList.remove('print-target');document.body.classList.remove('printing-report')},600)},80)}
function csvDownload(name,rows){const csv='\ufeff'+rows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function downloadAllMembersCSV(){const y=q('allMembersYear').value||'all';const rows=[['ক্রমিক','সদস্যের নাম',...(y==='all'?years:months),'মোট পরিশোধ','মোট বাকি']];members.forEach((m,i)=>rows.push([m.serial_no||i+1,m.name,...(y==='all'?years.map(v=>memberPaid(m,v)):months.map((_,mi)=>payments.filter(p=>String(p.member_id)===String(m.id)&&Number(p.year)===Number(y)&&Number(p.month)===mi+1).reduce((s,p)=>s+Number(p.paid_amount||0),0))),memberPaid(m,y),memberDue(m,y)]));csvDownload(`members-${y}.csv`,rows)}
function downloadAssetsCSV(){csvDownload('fund-assets.csv',[['বছর','খাত','বিস্তারিত','পরিমাণ','তারিখ'],...assets.map(a=>[a.year,a.category,a.description,a.amount,a.date])])}

document.addEventListener('DOMContentLoaded',()=>{
  q('footerYear').textContent=new Date().getFullYear();
  q('menuBtn').addEventListener('click',()=>setMenu(true));q('menuClose').addEventListener('click',()=>setMenu(false));q('menuOverlay').addEventListener('click',()=>setMenu(false));document.querySelectorAll('#mobileMenu a').forEach(a=>a.addEventListener('click',()=>setMenu(false)));window.addEventListener('hashchange',route);
  q('personalForm').addEventListener('submit',e=>{e.preventDefault();renderPersonal()});q('membersForm').addEventListener('submit',e=>{e.preventDefault();renderAllMembers()});q('paymentManageYear').addEventListener('change',()=>renderAdminData());
  q('loginBtn').addEventListener('click',login);q('logoutBtn').addEventListener('click',logout);
  q('addOpen').addEventListener('click',()=>{const value=q('addSelect').value;if(!value){showMessage('আগে একটি যুক্ত করার বিষয় নির্বাচন করুন।',false);return}openForm(value);q('addArea').scrollIntoView({behavior:'smooth',block:'start'})});
  q('manageOpen').addEventListener('click',()=>{const value=q('manageSelect').value;if(!value){showMessage('আগে একটি সম্পাদনার বিষয় নির্বাচন করুন।',false);return}openManagement(value);q('managementArea').scrollIntoView({behavior:'smooth',block:'start'})});
  q('memberForm').addEventListener('submit',e=>{e.preventDefault();saveMember()});q('paymentForm').addEventListener('submit',e=>{e.preventDefault();savePayment()});q('profitForm').addEventListener('submit',e=>{e.preventDefault();saveProfit()});q('expenseForm').addEventListener('submit',e=>{e.preventDefault();saveExpense()});q('assetForm').addEventListener('submit',e=>{e.preventDefault();saveAsset()});q('noticeForm').addEventListener('submit',e=>{e.preventDefault();saveNotice()});
  route();load();
});
