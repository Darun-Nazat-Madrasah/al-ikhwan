const sb=(window.supabase&&window.SUPABASE_URL&&window.SUPABASE_ANON_KEY)?window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_ANON_KEY):null;
const money=n=>`৳ ${Number(n||0).toLocaleString('bn-BD')}`;
const months=['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
let members=[],payments=[],assets=[],annual=[],adminUser=null;

async function load(){
 if(!sb){setMsg('Supabase config পাওয়া যায়নি।');return;}
 const [m,p,a,y,n]=await Promise.all([
   sb.from('member_public_summary').select('*').order('name'),
   sb.from('payments').select('*').order('year').order('month'),
   sb.from('assets').select('*').eq('status','active').order('date',{ascending:false}),
   sb.from('annual_summary').select('*').order('year'),
   sb.from('notices').select('*').eq('status','published').order('publish_date',{ascending:false})
 ]);
 if(m.error||p.error||a.error||y.error){setMsg('ডাটাবেস/SQL সেটআপ সম্পূর্ণ হয়নি।');return;}
 members=m.data||[];payments=p.data||[];assets=a.data||[];annual=y.data||[];
 renderMembers();renderAssets();renderYears();renderYearSelect();renderNotices(n?.data||[]);
 const {data:fund}=await sb.from('current_fund_summary').select('*').maybeSingle();
 document.querySelector('#activeMembers').textContent=Number(members.length).toLocaleString('bn-BD');
 document.querySelector('#totalDeposit').textContent=money(members.reduce((s,x)=>s+Number(x.total_deposit),0));
 document.querySelector('#totalDue').textContent=money(members.reduce((s,x)=>s+Number(x.due),0));
 document.querySelector('#totalProfit').textContent=money(annual.reduce((s,x)=>s+Number(x.total_profit),0));
 document.querySelector('#assetTotal').textContent=money(assets.reduce((s,x)=>s+Number(x.amount),0));
 document.querySelector('#currentFund').textContent=money(fund?.current_fund||0);
 showYear('all');
}

function renderMembers(){
 const q=(document.querySelector('#search').value||'').toLowerCase();
 const list=members.filter(x=>x.name.toLowerCase().includes(q));
 document.querySelector('#memberRows').innerHTML=list.map((x,i)=>`<tr><td>${i+1}</td><td>${x.name}</td><td>${money(x.total_deposit)}</td><td>${money(x.due)}</td><td>সক্রিয়</td><td><button class="small" onclick="showMember('${x.id}')">মাসিক হিসাব</button></td></tr>`).join('')||'<tr><td colspan="6">কোনো সদস্য পাওয়া যায়নি</td></tr>';
}

function showMember(id){
 const m=members.find(x=>x.id===id); if(!m)return;
 const rows=payments.filter(x=>x.member_id===id).sort((a,b)=>a.year-b.year||a.month-b.month);
 const years=[...new Set(rows.map(x=>x.year))];
 let h=`<div class="detail-head"><b>${m.name}</b><span>মোট জমা: ${money(m.total_deposit)} • বকেয়া: ${money(m.due)}</span></div>`;
 for(const y of years){
   h+=`<h3>${y} সাল</h3><div class="monthgrid">`;
   rows.filter(x=>x.year===y).forEach(x=>{const due=Math.max(Number(x.required_amount)-Number(x.paid_amount),0);h+=`<div><b>${months[x.month-1]}</b><span>জমা ${money(x.paid_amount)}</span><small>${due?`বকেয়া ${money(due)}`:'পরিশোধিত'}</small></div>`});
   h+=`</div>`;
 }
 document.querySelector('#monthlyDetail').innerHTML=h;
 location.hash='monthly';
}

function renderAssets(){document.querySelector('#assetRows').innerHTML=assets.map(x=>`<tr><td>${x.year}</td><td>${x.category}</td><td>${x.description}</td><td>${money(x.amount)}</td><td>${x.status==='active'?'বর্তমানে আছে':x.status}</td></tr>`).join('')||'<tr><td colspan="5">কোনো সম্পদ/খাতের তথ্য নেই</td></tr>';}
function renderYears(){document.querySelector('#yearRows').innerHTML=annual.map(x=>`<tr><td>${x.year}</td><td>${money(x.total_deposit)}</td><td>${money(x.total_profit)}</td><td>${money(x.total_expense)}</td><td>${money(x.total_investment)}</td><td>${money(x.asset_amount)}</td></tr>`).join('');}
function renderYearSelect(){const s=document.querySelector('#yearSelect');s.innerHTML='<option value="all">সকল বছর</option>'+annual.map(x=>`<option value="${x.year}">${x.year}</option>`).join('');}
function showYear(v){const rows=v==='all'?annual:annual.filter(x=>String(x.year)===v);document.querySelector('#annualDeposit').textContent=money(rows.reduce((s,x)=>s+Number(x.total_deposit),0));document.querySelector('#annualExpense').textContent=money(rows.reduce((s,x)=>s+Number(x.total_expense),0));document.querySelector('#annualInvestment').textContent=money(rows.reduce((s,x)=>s+Number(x.total_investment),0));document.querySelector('#annualProfit').textContent=money(rows.reduce((s,x)=>s+Number(x.total_profit),0));document.querySelector('#annualAsset').textContent=money(rows.reduce((s,x)=>s+Number(x.asset_amount),0));}
function renderNotices(list){document.querySelector('#noticeRows').innerHTML=list.map(x=>`<article class="notice"><h3>${x.title}</h3><p>${x.description}</p><small>${x.publish_date}</small></article>`).join('')||'<p>কোনো প্রকাশিত নোটিশ নেই।</p>';}
function setMsg(t){console.warn(t);}

async function checkAdmin(){
 if(!sb)return;
 const {data:{session}}=await sb.auth.getSession();
 adminUser=session?.user||null;
 if(adminUser){
   const {data}=await sb.from('admin_users').select('user_id').eq('user_id',adminUser.id).maybeSingle();
   if(data){document.querySelector('#loginBox').hidden=true;document.querySelector('#adminBox').hidden=false;document.querySelector('#adminUser').textContent=adminUser.email;fillPayMembers();}
   else{document.querySelector('#loginMsg').textContent='এই অ্যাকাউন্টে অ্যাডমিন অনুমতি নেই।';}
 }
}
async function login(){const email=adminEmail.value.trim(),password=adminPassword.value;const {error}=await sb.auth.signInWithPassword({email,password});loginMsg.textContent=error?error.message:'লগইন সফল';await checkAdmin();}
async function logout(){await sb.auth.signOut();location.reload();}
function fillPayMembers(){payMember.innerHTML=members.map(x=>`<option value="${x.id}">${x.name}</option>`).join('');}
function formObj(form){return Object.fromEntries(new FormData(form).entries());}
async function adminInsert(table,form,transform=x=>x){
 const {error}=await sb.from(table).insert(transform(formObj(form)));adminMsg.textContent=error?error.message:'সংরক্ষণ হয়েছে ✓';if(!error){form.reset();await load();fillPayMembers();}
}
async function saveMember(){const f=memberForm;const d=formObj(f);const {error}=await sb.from('members').upsert({name:d.name.trim(),mobile:d.mobile||null,status:'active'},{onConflict:'name'});adminMsg.textContent=error?error.message:'সদস্য সংরক্ষণ হয়েছে ✓';f.reset();await load();fillPayMembers();}
async function savePayment(){const d=formObj(paymentForm);await adminInsert('payments',paymentForm,()=>({member_id:d.member_id,year:+d.year,month:+d.month,required_amount:500,paid_amount:+d.paid_amount}));}
async function saveProfit(){const d=formObj(profitForm);const {error}=await sb.from('profits').upsert({year:+d.year,total_profit:+d.total_profit},{onConflict:'year'});adminMsg.textContent=error?error.message:'লাভ সংরক্ষণ হয়েছে ✓';profitForm.reset();await load();}
async function bootAdmin(){document.querySelector('#loginBtn')?.addEventListener('click',login);document.querySelector('#logoutBtn')?.addEventListener('click',logout);document.querySelector('#memberForm')?.addEventListener('submit',e=>{e.preventDefault();saveMember()});document.querySelector('#paymentForm')?.addEventListener('submit',e=>{e.preventDefault();savePayment()});document.querySelector('#profitForm')?.addEventListener('submit',e=>{e.preventDefault();saveProfit()});document.querySelector('#expenseForm')?.addEventListener('submit',e=>{e.preventDefault();const d=formObj(expenseForm);adminInsert('expenses',expenseForm,()=>({year:+d.year,date:d.date,description:d.description,amount:+d.amount}))});document.querySelector('#investmentForm')?.addEventListener('submit',e=>{e.preventDefault();const d=formObj(investmentForm);adminInsert('investments',investmentForm,()=>({year:+d.year,date:d.date,description:d.description,amount:+d.amount}))});document.querySelector('#assetForm')?.addEventListener('submit',e=>{e.preventDefault();const d=formObj(assetForm);adminInsert('assets',assetForm,()=>({year:+d.year,date:d.date,category:d.category,description:d.description,amount:+d.amount,status:'active'}))});document.querySelector('#noticeForm')?.addEventListener('submit',e=>{e.preventDefault();const d=formObj(noticeForm);adminInsert('notices',noticeForm,()=>({title:d.title,description:d.description,status:'published'}))});await checkAdmin();}
document.querySelector('#search')?.addEventListener('input',renderMembers);
document.querySelector('#yearSelect')?.addEventListener('change',e=>showYear(e.target.value));
load();bootAdmin();
