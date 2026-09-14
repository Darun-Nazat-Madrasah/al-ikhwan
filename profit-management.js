/* লভ্যাংশ ব্যবস্থাপনা — existing site add-on */
document.addEventListener('DOMContentLoaded', () => {
  const q = id => document.getElementById(id);
  const money = n => `৳ ${Number(n||0).toLocaleString('bn-BD')}`;
  const esc = s => String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const sb2 = (window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY)
    ? window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_ANON_KEY) : null;

  const manageSelect=q('manageSelect');
  const managementArea=q('managementArea');
  if(!manageSelect || !managementArea || !sb2) return;

  if(![...manageSelect.options].some(o=>o.value==='profits')){
    const opt=document.createElement('option');
    opt.value='profits'; opt.textContent='লভ্যাংশ ব্যবস্থাপনা';
    manageSelect.appendChild(opt);
  }

  if(!q('manageProfits')){
    const box=document.createElement('div');
    box.id='manageProfits';
    box.className='admin-data';
    box.innerHTML='<h3>📈 লভ্যাংশ ব্যবস্থাপনা</h3><div id="adminProfits" class="table-wrap"></div>';
    managementArea.appendChild(box);
  }

  async function renderProfits(){
    const out=q('adminProfits'); if(!out) return;
    const {data,error}=await sb2.from('profits').select('*').order('year',{ascending:false});
    if(error){out.innerHTML=`<div class="message error">${esc(error.message)}</div>`;return;}
    const rows=data||[];
    out.innerHTML=`<table><thead><tr><th>সাল</th><th>মোট লভ্যাংশ</th><th>অ্যাকশন</th></tr></thead><tbody>${
      rows.map(x=>`<tr><td>${esc(x.year)}</td><td>${money(x.total_profit)}</td><td class="row-actions"><button class="small-btn edit" data-profit-edit="${esc(x.id)}">Edit</button><button class="small-btn del" data-profit-delete="${esc(x.id)}">Delete</button></td></tr>`).join('')
    }</tbody></table>`;
  }

  manageSelect.addEventListener('change',()=>{});
  const manageOpen=q('manageOpen');
  if(manageOpen) manageOpen.addEventListener('click',()=>{
    setTimeout(()=>{ if(manageSelect.value==='profits') renderProfits(); },0);
  });

  managementArea.addEventListener('click',async e=>{
    const edit=e.target.closest('[data-profit-edit]');
    const del=e.target.closest('[data-profit-delete]');
    if(edit){
      const {data,error}=await sb2.from('profits').select('*').eq('id',edit.dataset.profitEdit).maybeSingle();
      if(error||!data)return;
      const f=q('profitForm');
      f.year.value=data.year; f.total_profit.value=data.total_profit;
      document.querySelectorAll('.admin-form').forEach(x=>x.classList.remove('active'));
      f.classList.add('active');
      f.scrollIntoView({behavior:'smooth',block:'start'});
    }
    if(del){
      if(!confirm('এই লভ্যাংশের তথ্যটি মুছে ফেলতে চান?'))return;
      const {error}=await sb2.from('profits').delete().eq('id',del.dataset.profitDelete);
      if(error){alert(error.message);return;}
      await renderProfits();
    }
  });
});
