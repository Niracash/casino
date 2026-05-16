let D={shift:null,exchanges:[],cashpoints:[],fillups:[],additions:[],inputs:{home:{},shift:{},machines:{}},kfType:'kr'};

function loadState(){
  const raw=localStorage.getItem('ccc_v5');
  if(raw){const l=JSON.parse(raw);D={...D,...l};if(!D.inputs)D.inputs={home:{},shift:{},machines:{}};if(!D.exchanges)D.exchanges=[];if(!D.cashpoints)D.cashpoints=[];}
}
function saveState(){localStorage.setItem('ccc_v5',JSON.stringify(D));}

// Load state immediately on script execution
loadState();

// ── Custom Modal ──
function showModal({icon='',title='',msg='',buttons=[]}){
  document.getElementById('modal-icon').textContent=icon;
  document.getElementById('modal-icon').style.display=icon?'block':'none';
  document.getElementById('modal-title').textContent=title;
  document.getElementById('modal-msg').textContent=msg;
  const btnsEl=document.getElementById('modal-btns');
  btnsEl.innerHTML='';
  buttons.forEach(b=>{
    const btn=document.createElement('button');
    btn.className='modal-btn '+(b.style||'modal-btn-ghost');
    btn.textContent=b.label;
    btn.onclick=()=>{closeModal();b.action&&b.action();};
    btnsEl.appendChild(btn);
  });
  document.getElementById('modal-overlay').classList.add('show');
}
function closeModal(){document.getElementById('modal-overlay').classList.remove('show');}
document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('modal-overlay').addEventListener('click',e=>{
    if(e.target===document.getElementById('modal-overlay'))closeModal();
  });
  // Restore inputs after DOM is ready
  restoreInputs();
  // Re-init UI state
  if(D.kfType){
    _kfType=D.kfType;
    document.querySelectorAll('#page-machines .type-sel.cols-3 .tsb').forEach(b=>b.classList.remove('on'));
    const ab=document.getElementById('type-'+D.kfType);if(ab)ab.classList.add('on');
    document.getElementById('kf-input-label').textContent={kr:'Win amount (kr)','1cr':'Credits on display','05cr':'Credits on display'}[D.kfType]||'Win amount (kr)';
  }
  selExFrom(_exFrom);
  renderShiftInfo();renderHomeLog();renderExchangeList();renderCashpointList();renderAddList();renderKFLog();
  renderShopItems();renderShopLog();
  recalc();updateEstCalc();updateHomeEst();
  loadCoffeeTimer();
  checkBetbooksAlert();
});

function goPage(id,btn){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.nb').forEach(b=>b.classList.remove('on'));
  document.getElementById('page-'+id).classList.add('on');btn.classList.add('on');
  if(id==='home'){recalc();renderHomeLog();renderExchangeList();}
  if(id==='machines'){renderKFLog();renderAddList();}
  if(id==='shift'){renderShiftInfo();sPreview();renderExchangeList();renderCashpointList();updateEstCalc();exCalc();}
  if(id==='shop'){renderShopItems();renderShopLog();}
  if(id==='checklist'){renderChecklist();}
}

const g=id=>parseFloat(document.getElementById(id).value)||0;
const fmt=v=>Math.abs(Math.round(v)).toLocaleString('no-NO')+' kr';
const nowTime=()=>new Date().toLocaleTimeString('no-NO',{hour:'2-digit',minute:'2-digit'});
const nowDate=()=>new Date().toLocaleDateString('no-NO',{day:'2-digit',month:'2-digit',year:'numeric'});
const nowFull=()=>nowDate()+' '+nowTime();
const CAT_LABELS={cash:'Cash',pc:'Playcoins',coin:'Mønt',bank:'Bank'};

function flash(id){const el=document.getElementById(id);if(!el)return;el.style.borderColor='var(--red)';el.focus();setTimeout(()=>el.style.borderColor='',1600);}

function getExpected(){
  if(!D.shift)return{coin:0,cash:0,pc:0,bank:0,total:0};
  let coin=D.shift.coin,cash=D.shift.cash,pc=D.shift.pc,bank=D.shift.bank;
  D.additions.forEach(a=>{if(a.type==='cash')cash+=a.amount;else if(a.type==='playcoin')pc+=a.amount;});
  D.exchanges.forEach(e=>{
    if(e.from==='cash'){
      // cash→mønt: all goes to coin
      if(e.to==='coin'){
        coin+=e.amount;
        cash-=e.amount;
        return;
      }
      const cashPart=Math.floor(e.amount/50)*50;
      const coinPart=e.amount-cashPart;
      cash+=cashPart;coin+=coinPart;
    }
    if(e.from==='bank')bank+=e.amount;
    if(e.from==='pc')pc+=e.amount;
    if(e.from==='coin')coin+=e.amount;
    if(e.from==='cash'&&e.to!=='coin'){/* handled above */}
    if(e.to==='cash')cash-=e.amount;if(e.to==='pc')pc-=e.amount;
    if(e.to==='coin'&&e.from!=='cash')coin-=e.amount;if(e.to==='bank')bank-=e.amount;
  });
  D.cashpoints.forEach(cp=>{
    if(cp.from==='bank') bank+=cp.amount;
    if(cp.from==='cash'){
      if(cp.amount>=0){
        const cashPart=Math.floor(cp.amount/50)*50;
        const coinPart=cp.amount-cashPart;
        cash+=cashPart;
        coin+=coinPart;
      } else {
        cash+=cp.amount;
      }
    }
  });
  D.fillups.forEach(f=>{pc-=f.coins*20;});
  return{coin,cash,pc,bank,total:coin+cash+pc+bank};
}

function stashInputs(){
  D.inputs.home={coin:document.getElementById('h-coin').value,cash:document.getElementById('h-cash').value,pc:document.getElementById('h-pc').value,bank:document.getElementById('h-bank').value};
  D.inputs.shift={coin:document.getElementById('s-coin').value,cash:document.getElementById('s-cash').value,pc:document.getElementById('s-pc').value,bank:document.getElementById('s-bank').value};
  D.inputs.machines={machine:document.getElementById('kf-machine').value,val:document.getElementById('kf-val').value};
  D.kfType=_kfType;saveState();
}

function restoreInputs(){
  const set=(id,v)=>{const el=document.getElementById(id);if(el&&v!=null&&v!=='')el.value=v;};
  if(D.inputs.home){set('h-coin',D.inputs.home.coin);set('h-cash',D.inputs.home.cash);set('h-pc',D.inputs.home.pc);set('h-bank',D.inputs.home.bank);}
  if(D.inputs.shift){set('s-coin',D.inputs.shift.coin);set('s-cash',D.inputs.shift.cash);set('s-pc',D.inputs.shift.pc);set('s-bank',D.inputs.shift.bank);}
  if(D.inputs.machines){set('kf-machine',D.inputs.machines.machine);set('kf-val',D.inputs.machines.val);}
}

function getFridgeTotal(){
  if(!D.shop||!D.shop.sold)return 0;
  const products={sodavand:10,redbull:20,vand:5,bounty:10,bueno:10,mars:10,snickers:10,pringles:10,lighter:10};
  return Object.entries(products).reduce((s,[id,price])=>s+(D.shop.sold[id]||0)*price,0);
}

function updateHomeEst(){
  const exp=getExpected();
  const fridge=getFridgeTotal();
  const fridgeCash=fridge>0?Math.floor(fridge/50)*50:0;
  const fridgeCoin=fridge>0?fridge-fridgeCash:0;

  const setV=(id,v,fridgePart)=>{
    const el=document.getElementById(id);
    if(!el)return;
    if(!D.shift){el.innerHTML='—';return;}
    const base=Math.round(v).toLocaleString('no-NO')+' kr';
    const bracket=fridgePart>0?` <span style="color:var(--green);font-size:.72rem">(+${fridgePart.toLocaleString('no-NO')} kr)</span>`:'';
    el.innerHTML=base+bracket;
  };

  setV('eh-coin',exp.coin,fridgeCoin);
  setV('eh-cash',exp.cash,fridgeCash);
  setV('eh-pc',exp.pc,0);
  setV('eh-bank',exp.bank,0);

  const lbl=document.getElementById('est-home-label');
  if(lbl)lbl.textContent=D.shift?'Based on start total + all transactions':'Set start of shift to see expected amounts';
}

function updateHomeHints(){
  const exp=getExpected();
  const fridge=getFridgeTotal();
  const fridgeCash=fridge>0?Math.floor(fridge/50)*50:0;
  const fridgeCoin=fridge>0?fridge-fridgeCash:0;
  const setH=(id,v)=>{
    const el=document.getElementById(id);if(!el)return;
    el.innerHTML=D.shift?`Expected: <span>${Math.round(v).toLocaleString('no-NO')} kr</span>`:'';
  };
  setH('h-coin-hint',exp.coin+fridgeCoin);
  setH('h-cash-hint',exp.cash+fridgeCash);
  setH('h-pc-hint',exp.pc);
  setH('h-bank-hint',exp.bank);
}

function recalc(){
  const coin=g('h-coin'),cash=g('h-cash'),pc=g('h-pc'),bank=g('h-bank');
  const current=coin+cash+pc+bank;
  document.getElementById('h-current-total').textContent=fmt(current);
  updateHomeHints();updateHomeEst();

  const db=document.getElementById('diff-block'),dv=document.getElementById('diff-val'),ds=document.getElementById('diff-sub');
  const hp=document.getElementById('hdr-pill'),br=document.getElementById('diff-breakdown');
  const bp=document.getElementById('db-phys'),ba=document.getElementById('db-adj'),bf=document.getElementById('db-fridge');
  const updBtn=document.getElementById('update-expected-btn');

  if(!D.shift){
    db.className='diff idle';dv.textContent='—';ds.textContent='Set your start of shift first';
    hp.className='hdr-pill idle';hp.textContent='No shift';br.classList.remove('on');
    if(updBtn)updBtn.style.display='none';
    return;
  }

  const exp=getExpected(),expected=exp.total,hasCurrent=coin>0||cash>0||pc>0||bank>0;
  const fridge=getFridgeTotal();
  br.classList.add('on');

  const physDiff=current-D.shift.total;
  const physStr=Math.abs(Math.round(physDiff))<1?'0 kr':(physDiff>0?'+':'−')+fmt(physDiff);
  const fridgeCounterStr=fridge>0?` <span style="color:var(--green);font-size:.75rem">(fridge: +${fridge.toLocaleString('no-NO')} kr)</span>`:'';
  bp.innerHTML=physStr+fridgeCounterStr;
  bp.className=physDiff>0?'bv green':physDiff<0?'bv red':'bv muted';

  if(bf){
    if(fridge<=0){bf.textContent='—';bf.className='bv muted';}
    else{bf.textContent=fridge.toLocaleString('no-NO')+' kr';bf.className='bv green';}
  }

  if(!hasCurrent){
    ba.textContent='—';ba.className='bv muted';db.className='diff idle';dv.textContent='—';
    ds.textContent='Expected: '+fmt(expected)+' · Count your drawer';
    hp.className='hdr-pill idle';hp.textContent='Shift active';
    if(updBtn){updBtn.style.display='none';}
    return;
  }

  // diff WITHOUT fridge (pure accounting diff)
  const diffNoFridge=current-expected;
  // diff WITH fridge baked in (what you'd expect if fridge revenue is in drawer)
  const diffWithFridge=current-expected-fridge;
  const absDiffNoFridge=Math.abs(Math.round(diffNoFridge));
  const absDiffWithFridge=Math.abs(Math.round(diffWithFridge));

  // Determine display state
  // Primary: show diff without fridge (pure accounting)
  // Secondary info: show that with fridge it's balanced
  const bothBalanced=absDiffNoFridge<1&&absDiffWithFridge<1;
  const onlyWithFridgeBalanced=absDiffWithFridge<1&&absDiffNoFridge>=1;
  const noFridgeBalanced=absDiffNoFridge<1&&absDiffWithFridge>=1;
  const neitherBalanced=absDiffNoFridge>=1&&absDiffWithFridge>=1;

  if(absDiffNoFridge<1){
    // Pure accounting match (no fridge needed) - allow update
    db.className='diff ok';
    if(fridge>0){
      dv.innerHTML='0 kr <span style="color:var(--sub);font-size:.75rem">w/o fridge</span>';
      ds.textContent='Drawer matches expected (excluding fridge revenue)';
    } else {
      dv.innerHTML='0 kr';
      ds.textContent='Drawer matches perfectly';
    }
    hp.className='hdr-pill ok';hp.textContent='Balanced ✓';
    ba.textContent='0 kr ✓';ba.className='bv green';
    if(updBtn){updBtn.style.display='';updBtn.disabled=false;}
  } else if(absDiffWithFridge<1){
    // Only matches when including fridge revenue - show "balanced with fridge" but warn
    db.className='diff ok';
    dv.innerHTML=`<span style="font-size:1.3rem">0 kr</span> <span style="color:var(--green);font-size:.72rem">w/ fridge</span>`;
    ds.textContent=`Off by ${fmt(absDiffNoFridge)} without fridge · +${fridge.toLocaleString('no-NO')} kr fridge brings it to zero`;
    hp.className='hdr-pill ok';hp.textContent='Balanced w/ fridge ✓';
    ba.innerHTML=`<span style="color:var(--sub);font-size:.8rem">−${fmt(absDiffNoFridge)}</span> <span style="color:var(--green);font-size:.75rem">(+fridge: 0)</span>`;
    ba.className='bv';
    // Don't allow update — drawer includes fridge money, not a pure accounting match
    if(updBtn){updBtn.style.display='none';}
  } else {
    db.className='diff off';
    const showVal=diffNoFridge;
    dv.innerHTML=(showVal>0?'+':'−')+fmt(showVal);
    let subText=(showVal>0?'Over by ':'Short by ')+fmt(showVal)+' · expected '+fmt(expected);
    if(fridge>0) subText+=` · w/ fridge: ${diffWithFridge>0?'+':'−'}${fmt(diffWithFridge)}`;
    ds.textContent=subText;
    hp.className='hdr-pill off';hp.textContent='Off '+fmt(absDiffNoFridge);
    ba.textContent=(showVal>0?'+':'−')+fmt(showVal);ba.className=showVal>0?'bv green':'bv red';
    if(updBtn){updBtn.style.display='none';}
  }
  updateEstCalc();
}

function updateExpectedFromCount(){
  const coin=g('h-coin'),cash=g('h-cash'),pc=g('h-pc'),bank=g('h-bank');
  const hasCurrent=coin>0||cash>0||pc>0||bank>0;
  if(!D.shift||!hasCurrent)return;
  const exp=getExpected();
  const diff=Math.abs(Math.round((coin+cash+pc+bank)-exp.total));
  // Only allow when pure diff (without fridge) is 0
  if(diff>=1)return;
  D.shift.coin=coin;D.shift.cash=cash;D.shift.pc=pc;D.shift.bank=bank;
  D.shift.total=coin+cash+pc+bank;
  D.exchanges=[];D.cashpoints=[];D.fillups=[];D.additions=[];
  saveState();
  ['h-coin','h-cash','h-pc','h-bank'].forEach(id=>document.getElementById(id).value='');
  D.inputs.home={};
  saveState();
  document.getElementById('update-expected-btn').style.display='none';
  renderHomeLog();renderKFLog();renderAddList();renderExchangeList();
  recalc();updateEstCalc();updateHomeEst();
  const btn=document.getElementById('update-expected-btn');
  btn.innerHTML='✓ Updated!';btn.disabled=true;btn.style.display='';
  setTimeout(()=>{btn.style.display='none';btn.innerHTML='↺ Update Expected to Current Count';},1800);
}

// ── Log Pagination ──
const LOG_PAGE_SIZE=5;
let _homeLogPage=0;

function renderHomeLog(){
  const all=[
    ...D.fillups.map((f,i)=>({type:'fillup',i,ts:f.ts||0,data:f})),
    ...D.additions.map((a,i)=>({type:'addition',i,ts:a.ts||0,data:a})),
    ...D.cashpoints.map((c,i)=>({type:'cashpoint',i,ts:c.ts||0,data:c}))
  ].sort((a,b)=>b.ts-a.ts);
  const el=document.getElementById('home-log');
  const total=all.length;
  document.getElementById('log-count-label').textContent=total>0?total+' entries':'';
  if(total===0){
    el.innerHTML=`<div class="empty" id="home-log-empty"><div class="empty-ico">📋</div>No entries yet</div>`;
    renderLogPagination('home-log-pagination',0,0,0);
    return;
  }
  const totalPages=Math.ceil(total/LOG_PAGE_SIZE);
  if(_homeLogPage>=totalPages)_homeLogPage=totalPages-1;
  const start=_homeLogPage*LOG_PAGE_SIZE;
  const pageItems=all.slice(start,start+LOG_PAGE_SIZE);
  el.innerHTML='';
  pageItems.forEach(entry=>{
    const d=entry.data,div=document.createElement('div');div.className='log-item';
    if(entry.type==='fillup'){
      div.innerHTML=`<div class="log-ico" style="background:var(--green-dim)">🔑</div>
        <div class="log-body"><div class="log-title">Key Fillup — Machine ${d.machine}</div><div class="log-meta">${d.coins} playcoins · ${fmt(d.coins*20)}</div></div>
        <div class="log-right"><div class="log-amt">${fmt(d.coins*20)}</div><div class="log-time">${d.date}</div></div>
        <button class="log-del" onclick="delFillup(${entry.i})">✕</button>`;
    } else if(entry.type==='cashpoint'){
      const fl=d.from==='bank'?'Bank/Card':'Cash';
      const isW=d.amount<0;
      const amtStr=(isW?'−':'+')+fmt(Math.abs(d.amount));
      div.innerHTML=`<div class="log-ico" style="background:var(--purp-dim)">🎲</div>
        <div class="log-body"><div class="log-title">Cashpoint<span class="cp-badge">${amtStr}</span></div><div class="log-meta">${isW?'Withdrawal':'Deposit'} · ${fl}</div></div>
        <div class="log-right"><div class="log-amt" style="color:${isW?'var(--blue)':'var(--purple)'}">${amtStr}</div><div class="log-time">${d.date}</div></div>
        <button class="log-del" onclick="delCashpoint(${entry.i})">✕</button>`;
    } else {
      const icon=d.type==='playcoin'?'🪙':'💵',title=d.type==='playcoin'?'Playcoins Added':'Cash Added';
      div.innerHTML=`<div class="log-ico" style="background:var(--teal-dim)">${icon}</div>
        <div class="log-body"><div class="log-title">${title}</div><div class="log-meta">Replenishment</div></div>
        <div class="log-right"><div class="log-amt">${fmt(d.amount)}</div><div class="log-time">${d.date}</div></div>
        <button class="log-del" onclick="delAddition(${entry.i})">✕</button>`;
    }
    el.appendChild(div);
  });
  renderLogPagination('home-log-pagination',_homeLogPage,totalPages,total,(p)=>{_homeLogPage=p;renderHomeLog();});
}

let _exListPage=0;
function renderExchangeList(){
  const total=D.exchanges.reduce((s,e)=>s+e.amount,0);
  document.getElementById('ex-count-label').textContent=D.exchanges.length>0?D.exchanges.length+' · '+fmt(total):'';
  const el=document.getElementById('ex-list');
  const allItems=[...D.exchanges].reverse().map((e,ri)=>({e,i:D.exchanges.length-1-ri}));
  if(allItems.length===0){el.innerHTML=`<div class="empty" id="ex-empty"><div class="empty-ico">🔄</div>No exchanges yet</div>`;renderLogPagination('ex-list-pagination',0,0,0);return;}
  const totalPages=Math.ceil(allItems.length/LOG_PAGE_SIZE);
  if(_exListPage>=totalPages)_exListPage=totalPages-1;
  const pageItems=allItems.slice(_exListPage*LOG_PAGE_SIZE,(_exListPage+1)*LOG_PAGE_SIZE);
  el.innerHTML='';
  pageItems.forEach(({e,i})=>{
    const d=document.createElement('div');d.className='log-item';
    d.innerHTML=`<div class="log-ico" style="background:var(--blue-dim)">🔄</div>
      <div class="log-body"><div class="log-title">Exchange</div><div class="log-meta">${CAT_LABELS[e.from]} → ${CAT_LABELS[e.to]}</div></div>
      <div class="log-right"><div class="log-amt">${fmt(e.amount)}</div><div class="log-time">${e.date}</div></div>
      <button class="log-del" onclick="delExchange(${i})">✕</button>`;
    el.appendChild(d);
  });
  renderLogPagination('ex-list-pagination',_exListPage,totalPages,allItems.length,(p)=>{_exListPage=p;renderExchangeList();});
}

let _cpListPage=0;
function renderCashpointList(){
  const total=D.cashpoints.reduce((s,c)=>s+c.amount,0);
  document.getElementById('cp-count-label').textContent=D.cashpoints.length>0?D.cashpoints.length+' · '+fmt(Math.abs(total)):'';
  const el=document.getElementById('cp-list');
  const allItems=[...D.cashpoints].reverse().map((c,ri)=>({c,i:D.cashpoints.length-1-ri}));
  if(allItems.length===0){el.innerHTML=`<div class="empty" id="cp-empty"><div class="empty-ico">🎲</div>No cashpoint entries</div>`;renderLogPagination('cp-list-pagination',0,0,0);return;}
  const totalPages=Math.ceil(allItems.length/LOG_PAGE_SIZE);
  if(_cpListPage>=totalPages)_cpListPage=totalPages-1;
  const pageItems=allItems.slice(_cpListPage*LOG_PAGE_SIZE,(_cpListPage+1)*LOG_PAGE_SIZE);
  el.innerHTML='';
  pageItems.forEach(({c,i})=>{
    const d=document.createElement('div');d.className='log-item';
    const fl=c.from==='bank'?'Bank/Card':'Cash';
    const isWithdrawal=c.amount<0;
    const amtStr=(isWithdrawal?'−':'+')+fmt(Math.abs(c.amount));
    const meta=isWithdrawal?`Withdrawal · ${fl}`:`Deposit · ${fl}`;
    const amtColor=isWithdrawal?'var(--blue)':'var(--purple)';
    d.innerHTML=`<div class="log-ico" style="background:var(--purp-dim)">🎲</div>
      <div class="log-body"><div class="log-title">Cashpoint</div><div class="log-meta">${meta}</div></div>
      <div class="log-right"><div class="log-amt" style="color:${amtColor}">${amtStr}</div><div class="log-time">${c.date}</div></div>
      <button class="log-del" onclick="delCashpoint(${i})">✕</button>`;
    el.appendChild(d);
  });
  renderLogPagination('cp-list-pagination',_cpListPage,totalPages,allItems.length,(p)=>{_cpListPage=p;renderCashpointList();});
}

let _addListPage=0;
function renderAddList(){
  const total=D.additions.reduce((s,a)=>s+a.amount,0);
  document.getElementById('add-count-label').textContent=D.additions.length>0?D.additions.length+' · '+fmt(total):'';
  const el=document.getElementById('add-list');
  const allItems=[...D.additions].reverse().map((a,ri)=>({a,i:D.additions.length-1-ri}));
  if(allItems.length===0){el.innerHTML=`<div class="empty" id="add-empty"><div class="empty-ico">➕</div>No additions yet</div>`;renderLogPagination('add-list-pagination',0,0,0);return;}
  const totalPages=Math.ceil(allItems.length/LOG_PAGE_SIZE);
  if(_addListPage>=totalPages)_addListPage=totalPages-1;
  const pageItems=allItems.slice(_addListPage*LOG_PAGE_SIZE,(_addListPage+1)*LOG_PAGE_SIZE);
  el.innerHTML='';
  pageItems.forEach(({a,i})=>{
    const icon=a.type==='playcoin'?'🪙':'💵',title=a.type==='playcoin'?'Playcoins Added':'Cash Added';
    const d=document.createElement('div');d.className='log-item';
    d.innerHTML=`<div class="log-ico" style="background:var(--teal-dim)">${icon}</div>
      <div class="log-body"><div class="log-title">${title}</div><div class="log-meta">Replenishment</div></div>
      <div class="log-right"><div class="log-amt">${fmt(a.amount)}</div><div class="log-time">${a.date}</div></div>
      <button class="log-del" onclick="delAddition(${i})">✕</button>`;
    el.appendChild(d);
  });
  renderLogPagination('add-list-pagination',_addListPage,totalPages,allItems.length,(p)=>{_addListPage=p;renderAddList();});
}

function renderLogPagination(containerId,currentPage,totalPages,totalItems,onPage){
  const el=document.getElementById(containerId);
  if(!el)return;
  if(totalPages<=1){el.innerHTML='';return;}
  el.innerHTML=`<div class="log-pagination">
    <button class="pag-btn" ${currentPage===0?'disabled':''} onclick="(${onPage.toString()})(${currentPage-1})">← Prev</button>
    <span class="pag-info">Page ${currentPage+1} of ${totalPages} · ${totalItems} total</span>
    <button class="pag-btn" ${currentPage>=totalPages-1?'disabled':''} onclick="(${onPage.toString()})(${currentPage+1})">Next →</button>
  </div>`;
}

function delFillup(i){
  Object.keys(_checkStates).forEach(k=>{if(k.startsWith(i+'_'))delete _checkStates[k];});
  _saveChecks();
  D.fillups.splice(i,1);saveState();renderHomeLog();renderKFLog();recalc();updateEstCalc();
}
function delExchange(i){D.exchanges.splice(i,1);saveState();renderHomeLog();renderExchangeList();recalc();updateEstCalc();}
function delCashpoint(i){D.cashpoints.splice(i,1);saveState();renderHomeLog();renderCashpointList();recalc();updateEstCalc();}
function delAddition(i){D.additions.splice(i,1);saveState();renderHomeLog();renderAddList();recalc();updateEstCalc();}

let _exFrom='cash',_exTo='pc';
const EXCHANGE_RULES={
  cash:{canGive:['pc','coin'],label:'Cash'},
  coin:{canGive:['cash','pc'],label:'Mønt'},
  pc:{canGive:['cash','coin'],label:'Playcoins',validate:v=>v%20===0&&v>0,validateMsg:'Playcoins must be multiples of 20 kr'},
  bank:{canGive:['cash','coin','pc'],label:'Bank'}
};

function selExFrom(type){
  document.querySelectorAll('.ex-from-buttons .tsb').forEach(b=>b.classList.remove('on'));
  const fromBtn=document.getElementById('ex-from-'+type);
  if(fromBtn)fromBtn.classList.add('on');
  _exFrom=type;
  const rules=EXCHANGE_RULES[type];let first=null;
  document.querySelectorAll('.ex-to-buttons .tsb').forEach(b=>{
    const t=b.id.replace('ex-to-',''),ok=rules.canGive.includes(t);
    b.disabled=!ok;b.classList.remove('on');if(ok&&!first)first=t;
  });
  if(first){const toBtn=document.getElementById('ex-to-'+first);if(toBtn)toBtn.classList.add('on');_exTo=first;}
  document.querySelectorAll('.ex-amt-input').forEach(el=>el.value='');
  document.querySelectorAll('.ex-hint-el').forEach(el=>el.style.display='none');
  document.querySelectorAll('.ex-save-btn').forEach(btn=>btn.disabled=true);
  exCalc();
}

function selExTo(type){
  const btn=document.getElementById('ex-to-'+type);
  if(btn&&btn.disabled)return;
  document.querySelectorAll('.ex-to-buttons .tsb').forEach(b=>b.classList.remove('on'));
  if(btn)btn.classList.add('on');
  _exTo=type;exCalc();
}

function exCalc(){
  // Support multiple instances (home page + shift page)
  const amtInputs=document.querySelectorAll('.ex-amt-input');
  const amt=parseFloat(amtInputs[0]?amtInputs[0].value:0)||0;
  document.querySelectorAll('.ex-hint-el').forEach(hint=>{
    const saveBtn=hint.parentElement.querySelector('.ex-save-btn')||document.querySelector('.ex-save-btn');
    const rules=EXCHANGE_RULES[_exFrom];
    if(rules.validate&&!rules.validate(amt)){
      if(amt>0){hint.className='hint error';hint.innerHTML=`<b>Error:</b> ${rules.validateMsg}`;hint.style.display='';}
      else hint.style.display='none';
      document.querySelectorAll('.ex-save-btn').forEach(b=>b.disabled=true);return;
    }
    if(amt<=0){hint.style.display='none';document.querySelectorAll('.ex-save-btn').forEach(b=>b.disabled=true);return;}

    if(_exFrom==='cash'&&_exTo==='coin'){
      hint.className='hint info';hint.style.display='';
      hint.innerHTML=`Give customer: <b>${fmt(amt)}</b> in coins (mønt)`;
    } else if(_exFrom==='pc'&&_exTo==='cash'){
      const cp=Math.floor(amt/50)*50,cn=amt-cp;
      hint.className='hint success';hint.style.display='';
      hint.innerHTML=cn>0?`Give customer: <b>${fmt(cp)}</b> cash + <b>${fmt(cn)}</b> mønt`:`Give customer: <b>${fmt(cp)}</b> cash`;
    } else if(_exTo==='pc'){
      const pcAmt=Math.floor(amt/20)*20,change=amt-pcAmt;
      if(change>0){hint.className='hint info';hint.style.display='';hint.innerHTML=`Give <b>${fmt(pcAmt)}</b> playcoins + <b>${fmt(change)}</b> change back`;}
      else hint.style.display='none';
    } else hint.style.display='none';
    document.querySelectorAll('.ex-save-btn').forEach(b=>b.disabled=false);
  });
}

function exAmtInput(){
  // sync all ex-amt-input fields
  const val=document.querySelectorAll('.ex-amt-input')[0]?.value||'';
  document.querySelectorAll('.ex-amt-input').forEach(el=>{if(el.value!==val)el.value=val;});
  exCalc();
}

function saveExchange(){
  const amt=parseFloat(document.querySelector('.ex-amt-input')?.value||0);
  if(isNaN(amt)||amt<=0){document.querySelectorAll('.ex-amt-input').forEach(el=>flash(el.id||'ex-amt'));return;}
  const rules=EXCHANGE_RULES[_exFrom];
  if(rules.validate&&!rules.validate(amt)){document.querySelectorAll('.ex-amt-input').forEach(el=>flash(el.id||'ex-amt'));return;}

  if(_exFrom==='cash'&&_exTo==='coin'){
    D.exchanges.push({from:'cash',to:'coin',amount:amt,date:nowFull(),ts:Date.now()});
  } else if(_exFrom==='pc'&&_exTo==='cash'){
    const cp=Math.floor(amt/50)*50,cn=amt-cp;
    D.exchanges.push({from:'pc',to:'cash',amount:cp,date:nowFull(),ts:Date.now()});
    if(cn>0)D.exchanges.push({from:'pc',to:'coin',amount:cn,date:nowFull(),ts:Date.now()});
  } else if(_exTo==='pc'){
    D.exchanges.push({from:_exFrom,to:'pc',amount:Math.floor(amt/20)*20,date:nowFull(),ts:Date.now()});
  } else {
    D.exchanges.push({from:_exFrom,to:_exTo,amount:amt,date:nowFull(),ts:Date.now()});
  }
  saveState();
  document.querySelectorAll('.ex-amt-input').forEach(el=>el.value='');
  document.querySelectorAll('.ex-hint-el').forEach(el=>el.style.display='none');
  document.querySelectorAll('.ex-save-btn').forEach(btn=>btn.disabled=true);
  renderExchangeList();renderHomeLog();recalc();updateEstCalc();
}

let _cpFrom='bank';
function selCpFrom(type){
  document.querySelectorAll('#cp-from-buttons .tsb').forEach(b=>b.classList.remove('on'));
  document.getElementById('cp-from-'+type).classList.add('on');_cpFrom=type;
  const lbl=document.getElementById('cp-amt-label');
  if(lbl) lbl.textContent=type==='cash'?'Amount (positive = deposit, negative = withdrawal)':'Cashpoint amount shown in system (kr)';
  cpCalc();
}
function cpCalc(){
  const raw=document.getElementById('cp-amt').value;
  const amt=parseFloat(raw)||0;
  const hint=document.getElementById('cp-hint'),saveBtn=document.getElementById('cp-save-btn');
  if(amt<0 && _cpFrom==='bank'){
    hint.className='hint error';hint.innerHTML='<b>Cannot withdraw from bank</b> — switch to Cash to record a withdrawal.';hint.style.display='';
    saveBtn.disabled=true;return;
  }
  const absAmt=Math.abs(amt);
  if(absAmt<20){
    if(absAmt>0){hint.className='hint error';hint.innerHTML='<b>Minimum:</b> 20 kr';hint.style.display='';}
    else hint.style.display='none';
    saveBtn.disabled=true;return;
  }
  const fl=_cpFrom==='bank'?'Bank/Card':'Cash';
  if(amt>0){
    hint.className='hint cashpoint';hint.style.display='';
    if(_cpFrom==='cash'){
      const cashPart=Math.floor(amt/50)*50;
      const coinPart=amt-cashPart;
      let splitStr='';
      if(cashPart>0&&coinPart>0) splitStr=` → <b>${fmt(cashPart)}</b> cash + <b>${fmt(coinPart)}</b> mønt`;
      else if(cashPart>0) splitStr=` → <b>${fmt(cashPart)}</b> cash`;
      else splitStr=` → <b>${fmt(coinPart)}</b> mønt`;
      hint.innerHTML=`Customer deposited <b>+${fmt(amt)}</b> via <b>Cash</b>${splitStr}`;
    } else {
      hint.innerHTML=`Customer deposited <b>+${fmt(amt)}</b> via <b>${fl}</b>. Adding to expected ${_cpFrom} balance.`;
    }
  } else {
    hint.className='hint info';hint.style.display='';
    hint.innerHTML=`Customer withdrew <b>${fmt(absAmt)}</b> from cashpoint in <b>Cash</b>. Subtracting from expected cash.`;
  }
  saveBtn.disabled=false;
}
function saveCashpoint(){
  const amt=parseFloat(document.getElementById('cp-amt').value);
  if(isNaN(amt)||Math.abs(amt)<20)return flash('cp-amt');
  if(amt<0&&_cpFrom==='bank')return flash('cp-amt');
  D.cashpoints.push({from:_cpFrom,amount:amt,date:nowFull(),ts:Date.now()});saveState();
  document.getElementById('cp-amt').value='';document.getElementById('cp-hint').style.display='none';document.getElementById('cp-save-btn').disabled=true;
  renderCashpointList();renderHomeLog();recalc();updateEstCalc();
}

function doAdd(type){
  D.additions.push({type,amount:10000,date:nowFull(),ts:Date.now()});saveState();
  renderAddList();renderHomeLog();recalc();updateEstCalc();updateHomeEst();
  const btn=event.currentTarget,orig=btn.innerHTML;
  btn.innerHTML='✓ Added!';btn.style.opacity='.6';
  setTimeout(()=>{btn.innerHTML=orig;btn.style.opacity='';},1300);
}

function updateEstCalc(){
  updateHomeEst();
}

let _kfType='kr';
function selType(btn,type){
  document.querySelectorAll('#page-machines .type-sel.cols-3 .tsb').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');_kfType=type;
  document.getElementById('kf-input-label').textContent={kr:'Win amount (kr)','1cr':'Credits on display','05cr':'Credits on display'}[type];
  document.getElementById('kf-val').value='';document.getElementById('kf-res').style.display='none';document.getElementById('kf-save-btn').disabled=true;
  stashInputs();
}
function kfCalc(){
  const raw=parseFloat(document.getElementById('kf-val').value);
  const res=document.getElementById('kf-res'),saveBtn=document.getElementById('kf-save-btn');
  if(isNaN(raw)||raw<=0){res.style.display='none';saveBtn.disabled=true;stashInputs();return;}
  let kr=0,coins=0;
  if(_kfType==='kr'){kr=raw;}
  else if(_kfType==='1cr'){kr=raw/2;}
  else{kr=raw/4;}
  coins=Math.ceil(Math.floor(kr/20)/5)*5||5;
  const paidOut=coins*20;
  const missingKr=paidOut-kr;
  document.getElementById('kfr-kr').textContent=kr.toLocaleString('no-NO')+' kr';
  document.getElementById('kfr-exact').textContent=missingKr>0.01?`Missing: ${Math.round(missingKr).toLocaleString('no-NO')} kr`:'—';
  document.getElementById('kfr-exact').style.color=missingKr>0.01?'var(--red)':'var(--sub)';
  document.getElementById('kfr-coins').textContent=coins+' playcoins';
  document.getElementById('kfr-val').textContent=fmt(paidOut);
  res.style.display='';saveBtn.disabled=false;stashInputs();
}

const _checkStates=JSON.parse(localStorage.getItem('ccc_checks')||'{}');
function _saveChecks(){localStorage.setItem('ccc_checks',JSON.stringify(_checkStates));}

function buildSteps(total){const MAX=200,steps=[];let rem=total;while(rem>0){const fill=Math.min(rem,MAX);steps.push({fill});rem-=fill;}return steps;}

let _kfLogPage=0;
function saveKF(){
  const raw=parseFloat(document.getElementById('kf-val').value);if(isNaN(raw)||raw<=0)return;
  const machine=document.getElementById('kf-machine').value.trim()||'Unknown';
  let kr=0,coins=0;
  if(_kfType==='kr'){kr=raw;}else if(_kfType==='1cr'){kr=raw/2;}else{kr=raw/4;}
  coins=Math.ceil(Math.floor(kr/20)/5)*5||5;
  D.fillups.push({machine,type:_kfType,inputVal:raw,kr,coins,date:nowFull(),ts:Date.now()});saveState();
  document.getElementById('kf-val').value='';document.getElementById('kf-res').style.display='none';document.getElementById('kf-save-btn').disabled=true;
  renderKFLog();renderHomeLog();recalc();updateEstCalc();updateHomeEst();
  const btn=document.getElementById('kf-save-btn');
  btn.innerHTML='✓ Saved!';btn.style.opacity='.6';setTimeout(()=>{btn.innerHTML='Save Fillup';btn.style.opacity='';},1500);
}
function renderKFLog(){
  const el=document.getElementById('kf-log-list');
  const total=D.fillups.length;
  document.getElementById('kf-log-count').textContent=total>0?total+' entries':'';
  if(total===0){
    el.innerHTML=`<div class="empty" id="kf-log-empty"><div class="empty-ico">🔑</div>No fillups saved</div>`;
    renderLogPagination('kf-log-pagination',0,0,0);
    return;
  }
  const totalPages=Math.ceil(total/LOG_PAGE_SIZE);
  if(_kfLogPage>=totalPages)_kfLogPage=totalPages-1;
  const allItems=[...D.fillups].reverse().map((f,ri)=>({f,i:D.fillups.length-1-ri}));
  const pageItems=allItems.slice(_kfLogPage*LOG_PAGE_SIZE,(_kfLogPage+1)*LOG_PAGE_SIZE);
  el.innerHTML='';
  const typeMap={kr:'KR','1cr':'1 Credit','05cr':'0.5 Credit'};
  pageItems.forEach(({f,i})=>{
    const d=document.createElement('div');d.className='mlog-item';
    const steps=buildSteps(f.coins);
    const stepsHtml=steps.map((s,si)=>{
      const key=`${i}_${si}`;
      const checked=_checkStates[key]?'checked':'';
      return `<label style="display:flex;align-items:center;gap:10px;padding:7px 0;border-top:1px solid var(--border);cursor:pointer;">
      <input type="checkbox" data-key="${key}" ${checked} style="width:16px;height:16px;accent-color:var(--green);flex-shrink:0;cursor:pointer;" onchange="_checkStates[this.dataset.key]=this.checked;_saveChecks()">
      <span style="flex:1;font-size:.77rem;color:var(--text)">Fill <b>${s.fill}</b> playcoins</span>
      <span style="font-size:.73rem;color:var(--sub);font-family:'JetBrains Mono',monospace">${(s.fill*20).toLocaleString('no-NO')} kr</span>
    </label>`;}).join('');
    const inputLabels={kr:'Kr', '1cr':'Credit (1 kr)', '05cr':'Credit (0.5 kr)'};
    const krStr = f.type!=='kr' ? ` = ${f.kr!=null?f.kr.toLocaleString('no-NO'):''} kr` : '';
    const inputStr=`<div style="font-size:.72rem;color:var(--sub);margin-top:2px">${inputLabels[f.type]||f.type}: <b style="color:var(--text)">${f.inputVal!=null?f.inputVal.toLocaleString('no-NO'):f.kr.toLocaleString('no-NO')}</b>${krStr}</div>`;
    d.innerHTML=`<div class="mlog-top">
      <div class="mlog-title">🔑 Machine ${f.machine}</div>
      <div style="display:flex;align-items:center;gap:6px"><span class="mlog-badge">${typeMap[f.type]||f.type}</span><button class="mlog-del" onclick="delFillup(${i})">✕</button></div>
    </div>
    <div class="mlog-detail"><span style="color:var(--text);font-weight:600">${f.coins} playcoins · ${fmt(f.coins*20)}</span>${inputStr}${stepsHtml}<div style="margin-top:6px;color:var(--muted);font-size:.65rem">${f.date}</div></div>`;
    el.appendChild(d);
  });
  renderLogPagination('kf-log-pagination',_kfLogPage,totalPages,total,(p)=>{_kfLogPage=p;renderKFLog();});
}

function sPreview(){
  const coin=g('s-coin'),cash=g('s-cash'),pc=g('s-pc'),bank=g('s-bank');
  document.getElementById('s-preview').textContent=fmt(coin+cash+pc+bank);stashInputs();
}
function setShift(){
  const coin=g('s-coin'),cash=g('s-cash'),pc=g('s-pc'),bank=g('s-bank');
  if(!coin&&!cash&&!pc&&!bank){
    showModal({icon:'⚠️',title:'No values entered',msg:'Enter at least one value before setting the start total.',buttons:[{label:'OK',style:'modal-btn-primary'}]});
    return;
  }
  D.shift={coin,cash,pc,bank,total:coin+cash+pc+bank,date:nowFull()};
  saveState();renderShiftInfo();recalc();updateEstCalc();updateHomeEst();
  const btn=event.currentTarget;btn.innerHTML='✓ Done!';btn.style.opacity='.7';
  setTimeout(()=>{btn.innerHTML='✓ Set as Start Total';btn.style.opacity='';},2000);
}
function renderShiftInfo(){
  const el=document.getElementById('shift-total-display'),date=document.getElementById('shift-date-display');
  if(D.shift){el.textContent=fmt(D.shift.total);el.className='ssv';date.textContent='Set: '+D.shift.date;}
  else{el.textContent='Not set';el.className='ssv idle';date.textContent='';}
}
function generateShiftPDF(){
  const f=fmt,now=nowFull();
  const exp=getExpected();
  const fridge=getFridgeTotal();
  const fridgeCash=Math.floor(fridge/50)*50;
  const fridgeCoin=fridge-fridgeCash;

  const all=[
    ...D.fillups.map((x,i)=>({type:'fillup',ts:x.ts||0,data:x})),
    ...D.additions.map((x,i)=>({type:'addition',ts:x.ts||0,data:x})),
    ...D.cashpoints.map((x,i)=>({type:'cashpoint',ts:x.ts||0,data:x})),
    ...D.exchanges.map((x,i)=>({type:'exchange',ts:x.ts||0,data:x})),
  ].sort((a,b)=>a.ts-b.ts);

  const CAT={cash:'Cash',pc:'Playcoins',coin:'Mønt',bank:'Bank'};

  let logRows='';
  all.forEach(e=>{
    const d=e.data;
    let label='',detail='',amount='';
    if(e.type==='fillup'){
      label='Key Fillup';detail=`Machine ${d.machine} — ${d.coins} coins`;amount=f(d.coins*20);
    } else if(e.type==='addition'){
      label=d.type==='playcoin'?'Playcoins Added':'Cash Added';detail='Replenishment';amount=f(d.amount);
    } else if(e.type==='cashpoint'){
      const isW=d.amount<0;
      label='Cashpoint';detail=`${isW?'Withdrawal':'Deposit'} via ${d.from==='bank'?'Bank/Card':'Cash'}`;
      amount=(isW?'−':'+')+f(Math.abs(d.amount));
    } else if(e.type==='exchange'){
      label='Exchange';detail=`${CAT[d.from]} → ${CAT[d.to]}`;amount=f(d.amount);
    }
    logRows+=`<tr><td>${d.date||''}</td><td>${label}</td><td>${detail}</td><td style="text-align:right;font-family:monospace">${amount}</td></tr>`;
  });

  let fridgeRows='';
  if(D.shop&&D.shop.sold){
    const products={sodavand:{n:'Sodavand',p:10},redbull:{n:'Redbull',p:20},vand:{n:'Vand',p:5},bounty:{n:'Bounty',p:10},bueno:{n:'Bueno',p:10},mars:{n:'Mars',p:10},snickers:{n:'Snickers',p:10},pringles:{n:'Pringles',p:10},lighter:{n:'Lighter',p:10}};
    Object.entries(products).forEach(([id,{n,p}])=>{
      const sold=D.shop.sold[id]||0;
      const start=D.shop.starts&&D.shop.starts[id]||0;
      if(sold>0||start>0){
        fridgeRows+=`<tr><td>${n}</td><td style="text-align:center">${start}</td><td style="text-align:center">${sold}</td><td style="text-align:center">${start-sold}</td><td style="text-align:right;font-family:monospace">${f(sold*p)}</td></tr>`;
      }
    });
  }

  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>Casino Shift Report</title>
  <style>
    body{font-family:Arial,sans-serif;font-size:13px;color:#111;padding:30px;max-width:720px;margin:0 auto}
    h1{font-size:20px;margin-bottom:2px;color:#1a1a2e}
    .meta{color:#666;font-size:12px;margin-bottom:24px}
    h2{font-size:14px;font-weight:700;margin:22px 0 8px;padding-bottom:4px;border-bottom:2px solid #eee;color:#1a1a2e}
    table{width:100%;border-collapse:collapse;margin-bottom:6px}
    th{background:#f4f4f8;text-align:left;padding:7px 10px;font-size:12px;color:#555;border-bottom:2px solid #ddd}
    td{padding:6px 10px;border-bottom:1px solid #eee;vertical-align:top}
    tr:last-child td{border-bottom:none}
    .summary-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:8px}
    .summary-box{background:#f8f8fc;border:1px solid #e0e0ec;border-radius:8px;padding:12px 14px}
    .summary-box .label{font-size:11px;color:#888;margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px}
    .summary-box .value{font-size:16px;font-weight:700;font-family:monospace;color:#1a1a2e}
    .summary-box .sub{font-size:11px;color:#3ecf8e;margin-top:3px}
    .green{color:#2a9d5c}.red{color:#e05454}
    .footer{margin-top:32px;font-size:11px;color:#aaa;text-align:center;border-top:1px solid #eee;padding-top:12px}
    @media print{body{padding:10px}}
  </style></head><body>
  <h1>Casino — Shift Report</h1>
  <div class="meta">Generated: ${now}${D.shift?` &nbsp;|&nbsp; Shift started: ${D.shift.date}`:''}</div>
  <h2>Summary</h2>
  <div class="summary-grid">
    <div class="summary-box"><div class="label">Start Total</div><div class="value">${D.shift?f(D.shift.total):'—'}</div></div>
    <div class="summary-box"><div class="label">Expected Total</div><div class="value">${f(exp.total)}</div></div>
    <div class="summary-box"><div class="label">Mont Expected</div><div class="value">${f(exp.coin)}</div>${fridgeCoin>0?`<div class="sub">incl. +${f(fridgeCoin)} fridge</div>`:''}</div>
    <div class="summary-box"><div class="label">Cash Expected</div><div class="value">${f(exp.cash)}</div>${fridgeCash>0?`<div class="sub">incl. +${f(fridgeCash)} fridge</div>`:''}</div>
    <div class="summary-box"><div class="label">Playcoins Expected</div><div class="value">${f(exp.pc)}</div></div>
    <div class="summary-box"><div class="label">Bank Expected</div><div class="value">${f(exp.bank)}</div></div>
  </div>
  ${fridge>0?`<h2>Fridge Revenue — ${f(fridge)}</h2>
  <table><thead><tr><th>Product</th><th style="text-align:center">Start</th><th style="text-align:center">Sold</th><th style="text-align:center">End</th><th style="text-align:right">Revenue</th></tr></thead>
  <tbody>${fridgeRows}</tbody></table>`:''}
  <h2>Transaction Log (${all.length} entries)</h2>
  ${all.length===0?'<p style="color:#999">No transactions recorded.</p>':`
  <table><thead><tr><th>Time</th><th>Type</th><th>Detail</th><th style="text-align:right">Amount</th></tr></thead>
  <tbody>${logRows}</tbody></table>`}
  <div class="footer">Casino Shift Report &nbsp;|&nbsp; ${now}</div>
  </body></html>`;

  const blob=new Blob([html],{type:'text/html'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=`Casino-Shift-${nowDate().replace(/\./g,'-')}.html`;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
}

function confirmReset(){
  showModal({
    icon:'🗑️',
    title:'Reset Shift',
    msg:'This clears all data for the day. Are you sure?',
    buttons:[
      {label:'Cancel',style:'modal-btn-ghost'},
      {label:'Reset',style:'modal-btn-danger',action:()=>{
        const hasData=D.shift||(D.fillups&&D.fillups.length)||(D.cashpoints&&D.cashpoints.length)||(D.exchanges&&D.exchanges.length)||(D.additions&&D.additions.length);
        if(hasData){
          showModal({
            icon:'📄',
            title:"Download Today's Report?",
            msg:"Save a copy of today's shift log before resetting.",
            buttons:[
              {label:'Skip & Reset',style:'modal-btn-ghost',action:doReset},
              {label:'Download & Reset',style:'modal-btn-green',action:()=>{generateShiftPDF();doReset();}},
            ]
          });
        } else {
          doReset();
        }
      }}
    ]
  });
}

function doReset(){
  D={shift:null,exchanges:[],cashpoints:[],fillups:[],additions:[],shop:{starts:{},sold:{},log:[]},inputs:{home:{},shift:{},machines:{}},kfType:'kr'};
  _homeLogPage=0;_exListPage=0;_cpListPage=0;_addListPage=0;_kfLogPage=0;
  Object.keys(_checkStates).forEach(k=>delete _checkStates[k]);
  _saveChecks();
  saveState();
  document.querySelectorAll('input[type=number],input[type=text]').forEach(el=>el.value='');
  document.getElementById('s-preview').textContent='0 kr';document.getElementById('h-current-total').textContent='0 kr';
  renderShiftInfo();renderHomeLog();renderExchangeList();renderCashpointList();renderAddList();renderKFLog();recalc();updateEstCalc();updateHomeEst();
}

// ── SHOP ──
const SHOP_PRODUCTS = [
  { id:'sodavand', name:'Sodavand', icon:'🥤', price:10, unit:'coin' },
  { id:'redbull',  name:'Redbull',  icon:'⚡', price:20, unit:'coin' },
  { id:'vand',     name:'Vand',     icon:'💧', price:5,  unit:'coin' },
  { id:'bounty',   name:'Bounty',   icon:'🍫', price:10, unit:'coin' },
  { id:'bueno',    name:'Bueno',    icon:'🍫', price:10, unit:'coin' },
  { id:'mars',     name:'Mars',     icon:'🍫', price:10, unit:'coin' },
  { id:'snickers', name:'Snickers', icon:'🍫', price:10, unit:'coin' },
  { id:'pringles', name:'Pringles', icon:'🍟', price:10, unit:'coin' },
  { id:'lighter',  name:'Lighter',  icon:'🔥', price:10, unit:'coin' },
];

function initShop(){
  if(!D.shop) D.shop={starts:{},sold:{}};
  SHOP_PRODUCTS.forEach(p=>{
    if(D.shop.starts[p.id]===undefined) D.shop.starts[p.id]=0;
    if(D.shop.sold[p.id]===undefined)   D.shop.sold[p.id]=0;
  });
}

function renderShopItems(){
  initShop();
  const el=document.getElementById('shop-items-list');
  el.innerHTML='';
  SHOP_PRODUCTS.forEach(p=>{
    const start=D.shop.starts[p.id]||0;
    const sold=D.shop.sold[p.id]||0;
    const end=start-sold;
    const revenue=sold*p.price;
    const div=document.createElement('div');
    div.className='shop-item';
    div.innerHTML=`
      <div class="shop-item-top">
        <div class="shop-item-icon">${p.icon}</div>
        <div class="shop-item-info">
          <div class="shop-item-name">${p.name}</div>
          <div class="shop-item-price">${p.price} kr each</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
          <div class="shop-start-row">
            <span style="font-size:.66rem;color:var(--sub)">Start:</span>
            <input class="shop-start-input" type="number" inputmode="numeric" min="0" placeholder="0"
              value="${start||''}" oninput="setShopStart('${p.id}',this.value)">
          </div>
          <div class="shop-item-controls">
            <button class="shop-counter-btn minus" onclick="shopSell('${p.id}',-1)">−</button>
            <div class="shop-count-display" id="shop-sold-${p.id}">${sold}</div>
            <button class="shop-counter-btn plus" onclick="shopSell('${p.id}',1)">+</button>
          </div>
        </div>
      </div>
      <div class="shop-item-row"><span class="sl">Sold</span><span class="sv">${sold} pcs</span></div>
      <div class="shop-item-row"><span class="sl">End count</span><span class="sv" id="shop-end-${p.id}" style="color:${end<0?'var(--red)':'var(--text)'}">${end}</span></div>
      <div class="shop-item-row"><span class="sl">Revenue</span><span class="sv" style="color:var(--green)">${revenue>0?revenue.toLocaleString('no-NO')+' kr':'—'}</span></div>`;
    el.appendChild(div);
  });
  renderShopSummary();
  updateHomeEst();
  const coin=g('h-coin'),cash=g('h-cash'),pc=g('h-pc'),bank=g('h-bank');
  if(coin||cash||pc||bank) recalc();
}

function setShopStart(id, val){
  initShop();
  D.shop.starts[id]=parseInt(val)||0;
  saveState();
  const sold=D.shop.sold[id]||0;
  const start=D.shop.starts[id]||0;
  const end=start-sold;
  const endEl=document.getElementById('shop-end-'+id);
  if(endEl){endEl.textContent=end;endEl.style.color=end<0?'var(--red)':'var(--text)';}
  renderShopSummary();
  updateHomeEst();
}

function _doShopSell(id, delta){
  initShop();
  D.shop.sold[id]=Math.max(0,(D.shop.sold[id]||0)+delta);
  if(delta>0){
    if(!D.shop.log)D.shop.log=[];
    D.shop.log.push({id,name:SHOP_PRODUCTS.find(p=>p.id===id).name,price:SHOP_PRODUCTS.find(p=>p.id===id).price,ts:Date.now(),date:nowFull()});
  } else {
    if(D.shop.log){
      const idx=[...D.shop.log].map((l,i)=>({l,i})).reverse().find(x=>x.l.id===id);
      if(idx)D.shop.log.splice(idx.i,1);
    }
  }
  saveState();
  renderShopItems();
  renderShopLog();
}

function shopSell(id, delta){
  initShop();
  if(delta<0){
    if(D.shop.sold[id]<=0)return;
    const productName=SHOP_PRODUCTS.find(p=>p.id===id).name;
    showModal({
      icon:'↩️',
      title:'Undo Sale',
      msg:`Remove 1 sale of ${productName}?`,
      buttons:[
        {label:'Cancel',style:'modal-btn-ghost'},
        {label:'Undo',style:'modal-btn-danger',action:()=>_doShopSell(id,delta)}
      ]
    });
    return;
  }
  _doShopSell(id,delta);
}

function renderShopSummary(){
  initShop();
  const totalRevenue=SHOP_PRODUCTS.reduce((s,p)=>s+(D.shop.sold[p.id]||0)*p.price,0);
  const summaryEl=document.getElementById('shop-summary-rows');
  const labelEl=document.querySelector('#shop-summary .est-home-label');
  if(totalRevenue===0){
    if(labelEl)labelEl.textContent='No sales recorded yet';
    if(summaryEl)summaryEl.innerHTML='';
    return;
  }
  if(labelEl)labelEl.textContent='Total revenue breakdown';
  const cashPart=Math.floor(totalRevenue/50)*50;
  const coinPart=totalRevenue-cashPart;
  let html='';
  SHOP_PRODUCTS.forEach(p=>{
    const sold=D.shop.sold[p.id]||0;
    if(sold===0)return;
    const rev=sold*p.price;
    const pCash=Math.floor(rev/50)*50;
    const pCoin=rev-pCash;
    let breakdown='';
    if(pCash>0&&pCoin>0) breakdown=` <span style="color:var(--sub);font-size:.68rem">(Cash: ${pCash.toLocaleString('no-NO')} kr + Coin: ${pCoin.toLocaleString('no-NO')} kr)</span>`;
    else if(pCash>0)      breakdown=` <span style="color:var(--sub);font-size:.68rem">(Cash: ${pCash.toLocaleString('no-NO')} kr)</span>`;
    else                  breakdown=` <span style="color:var(--sub);font-size:.68rem">(Coin: ${pCoin.toLocaleString('no-NO')} kr)</span>`;
    const start=D.shop.starts[p.id]||0;
    const end=start-sold;
    const endColor=end<0?'var(--red)':'var(--muted)';
    html+=`<div style="padding:7px 0;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:8px">
      <div>
        <div style="font-size:.82rem;color:var(--sub)">${p.icon} ${p.name}</div>
        <div style="font-size:.68rem;margin-top:2px;color:var(--muted)">Sold: <b style="color:var(--text)">${sold}</b> &nbsp;·&nbsp; End: <b style="color:${endColor}">${end}</b></div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-family:'JetBrains Mono',monospace;font-weight:600;font-size:.84rem;color:var(--text)">${rev.toLocaleString('no-NO')} kr</div>
        <div style="font-size:.67rem;color:var(--sub);margin-top:1px">${breakdown.replace(/<[^>]+>/g,'').replace(/[()]/g,'').trim()}</div>
      </div>
    </div>`;
  });
  html+=`<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border2);display:flex;justify-content:space-between;align-items:center">
    <span style="font-size:.78rem;font-weight:700;color:var(--green)">Total revenue</span>
    <span style="font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--green)">${totalRevenue.toLocaleString('no-NO')} kr</span>
  </div>`;
  if(cashPart>0||coinPart>0){
    const parts=[];
    if(cashPart>0) parts.push(`💵 ${cashPart.toLocaleString('no-NO')} kr cash`);
    if(coinPart>0) parts.push(`💰 ${coinPart.toLocaleString('no-NO')} kr coin`);
    html+=`<div style="margin-top:6px;font-size:.72rem;color:var(--sub);text-align:right">${parts.join(' + ')}</div>`;
  }
  if(summaryEl)summaryEl.innerHTML=html;
}

let _shopLogPage=0;
function renderShopLog(){
  initShop();
  const log=D.shop.log||[];
  const el=document.getElementById('shop-log');
  const countEl=document.getElementById('shop-log-count');
  if(countEl)countEl.textContent=log.length>0?log.length+' sales':'';
  if(!el)return;
  if(log.length===0){el.innerHTML=`<div class="empty"><div class="empty-ico">🛒</div>No sales yet</div>`;renderLogPagination('shop-log-pagination',0,0,0);return;}
  const totalPages=Math.ceil(log.length/LOG_PAGE_SIZE);
  if(_shopLogPage>=totalPages)_shopLogPage=totalPages-1;
  const allItems=[...log].reverse();
  const pageItems=allItems.slice(_shopLogPage*LOG_PAGE_SIZE,(_shopLogPage+1)*LOG_PAGE_SIZE);
  el.innerHTML='';
  pageItems.forEach(entry=>{
    const p=SHOP_PRODUCTS.find(x=>x.id===entry.id)||{icon:'🛒'};
    const d=document.createElement('div');d.className='log-item';
    d.innerHTML=`<div class="log-ico" style="background:var(--green-dim)">${p.icon}</div>
      <div class="log-body"><div class="log-title">${entry.name}</div><div class="log-meta">${entry.date}</div></div>
      <div class="log-right"><div class="log-amt" style="color:var(--green)">+${entry.price} kr</div></div>`;
    el.appendChild(d);
  });
  renderLogPagination('shop-log-pagination',_shopLogPage,totalPages,log.length,(p)=>{_shopLogPage=p;renderShopLog();});
}

// ── CHECKLIST ──
const CHECKLIST={
  opening:[
    {id:'op1',text:'Open shop'},
    {id:'op2',text:'Make sure all machines are on'},
    {id:'op3',text:'Make sure all lights are on'},
    {id:'op4',text:'Make sure all screens are on'},
    {id:'op5',text:'Make sure Top Table is on'},
    {id:'op6',text:'Vacuum and mop in shop'},
    {id:'op7',text:'Count counter and do entry'},
    {id:'op_reserve',text:'Count Reserve'},
    {id:'op8',text:'Count drinks and snacks and insert in file'},
    {id:'op9',text:'Clean bathroom if dirty'},
    {id:'op10',text:'Turn on AC'},
    {id:'op11',text:'Make coffee'},
  ],
  day:[
    {id:'dy1',text:'Clean smoke area'},
    {id:'dy2',text:'Wash cups'},
    {id:'dy3',text:'Sweep floor if dirty'},
    {id:'dy4',text:'Remove soda cans in shop'},
    {id:'dy5',text:'Bring back signs from machines that are not used'},
    {id:'dy6',text:'Clean machines with glas rens'},
    {id:'dy7',text:'Fill fridge'},
  ],
  closing:[
    {id:'cl1',text:'Clean smoke area (After customers are gone)'},
    {id:'cl6',text:'Clean bathroom',time:'22:15'},
    {id:'cl4',text:'Pickup trash',time:'22:35'},
    {id:'cl2',text:'Wash last cups',time:'23:00'},
    {id:'cl3',text:'Refill sugar/cream and get coffee ready for tomorrow',time:'23:00'},
    {id:'cl_kasse',text:'Clean kasse',time:'23:00'},
    {id:'cl7',text:'Do Counter entry — do not forget to print/delete and finalize',time:'23:20'},
    {id:'cl8',text:'Do drinks and snacks calculation and insert in file',time:'23:30'},
    {id:'cl5',text:'Sweep floor last time if dirty',time:'23:30'},
    {id:'cl9',text:'Turn off Touchsell'},
    {id:'cl10',text:'Turn off fridge lights'},
    {id:'cl11',text:'Make sure all screens are off'},
    {id:'cl12',text:'Make sure all machines are off'},
    {id:'cl13',text:'Turn off AC'},
    {id:'cl14',text:'Turn off Counting Machine'},
  ]
};

function loadChecklistState(){return JSON.parse(localStorage.getItem('ccc_checklist')||'{}');}
function saveChecklistState(state){localStorage.setItem('ccc_checklist',JSON.stringify(state));}

function renderChecklist(){
  const state=loadChecklistState();
  const groups={opening:'cl-opening',day:'cl-day',closing:'cl-closing'};
  const counts={opening:'cl-opening-count',day:'cl-day-count',closing:'cl-closing-count'};

  Object.entries(CHECKLIST).forEach(([group,items])=>{
    const el=document.getElementById(groups[group]);
    if(!el)return;
    el.innerHTML='';
    let done=0;

    if(group==='day'){
      items.forEach(item=>{
        const div=document.createElement('div');
        div.className='cl-item';
        div.style.cursor='default';
        div.innerHTML=`<span style="width:6px;height:6px;border-radius:50%;background:var(--accent);flex-shrink:0;margin:0 4px"></span>
          <span class="cl-item-text">${item.text}</span>`;
        el.appendChild(div);
      });
      const countEl=document.getElementById(counts[group]);
      if(countEl)countEl.textContent='';
      return;
    }
    items.forEach(item=>{
      const checked=!!state[item.id];
      if(checked)done++;
      const div=document.createElement('label');
      div.className='cl-item'+(checked?' done':'');
      div.innerHTML=`
        <input type="checkbox" ${checked?'checked':''} onchange="toggleCheck('${item.id}',this.checked)">
        <span class="cl-item-text">${item.text}</span>
        ${item.time?`<span class="cl-item-time">${item.time}</span>`:''}`;
      el.appendChild(div);
    });
    const countEl=document.getElementById(counts[group]);
    if(countEl)countEl.textContent=`${done}/${items.length}`;
  });

  checkBetbooksAlert();
}

function toggleCheck(id,checked){
  const state=loadChecklistState();
  state[id]=checked;
  saveChecklistState(state);
  const labels=document.querySelectorAll('.cl-item');
  labels.forEach(l=>{
    const cb=l.querySelector('input[type=checkbox]');
    if(cb&&cb.getAttribute('onchange')&&cb.getAttribute('onchange').includes(`'${id}'`)){
      l.classList.toggle('done',checked);
    }
  });
  renderChecklistCounts();
}

function renderChecklistCounts(){
  const state=loadChecklistState();
  const groups={opening:'cl-opening-count',closing:'cl-closing-count'};
  Object.entries(groups).forEach(([group,countId])=>{
    const items=CHECKLIST[group];
    const done=items.filter(i=>state[i.id]).length;
    const el=document.getElementById(countId);
    if(el)el.textContent=`${done}/${items.length}`;
  });
}

function clearChecklist(){
  showModal({
    icon:'↺',
    title:'Clear Checklist',
    msg:'Reset all checkboxes for today?',
    buttons:[
      {label:'Cancel',style:'modal-btn-ghost'},
      {label:'Clear All',style:'modal-btn-danger',action:()=>{
        saveChecklistState({});
        renderChecklist();
      }}
    ]
  });
}

function checkBetbooksAlert(){
  const el=document.getElementById('betbooks-alert');
  if(!el)return;
  const now=new Date();
  const day=now.getDay();
  const date=now.getDate();
  const lastDay=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
  const isMonday=day===1;
  const isLastDay=date===lastDay;
  el.style.display=(isMonday||isLastDay)?'block':'none';
}

// ── COFFEE TIMER ──
let _coffeeInterval=null;
let _coffeeEnd=null;

function loadCoffeeTimer(){
  const saved=localStorage.getItem('ccc_coffee');
  if(saved){
    const data=JSON.parse(saved);
    if(data.end&&Date.now()<data.end){
      _coffeeEnd=data.end;
      startCoffeeInterval();
    } else {
      localStorage.removeItem('ccc_coffee');
    }
  }
  updateCoffeeDisplay();
}

function coffeeTimerToggle(){
  if(_coffeeInterval){
    clearInterval(_coffeeInterval);
    _coffeeInterval=null;
    _coffeeEnd=null;
    localStorage.removeItem('ccc_coffee');
    document.getElementById('coffee-start-btn').textContent='Start Timer';
    document.getElementById('coffee-timer-status').textContent='Stopped';
    document.getElementById('coffee-timer-display').style.color='var(--accent)';
    updateCoffeeDisplay();
  } else {
    _coffeeEnd=Date.now()+(2*60*60*1000);
    localStorage.setItem('ccc_coffee',JSON.stringify({end:_coffeeEnd}));
    startCoffeeInterval();
    document.getElementById('coffee-start-btn').textContent='Stop Timer';
    document.getElementById('coffee-timer-status').textContent='Coffee started!';
  }
}

function startCoffeeInterval(){
  document.getElementById('coffee-start-btn').textContent='Stop Timer';
  _coffeeInterval=setInterval(()=>{
    const remaining=_coffeeEnd-Date.now();
    if(remaining<=0){
      clearInterval(_coffeeInterval);
      _coffeeInterval=null;
      _coffeeEnd=null;
      localStorage.removeItem('ccc_coffee');
      document.getElementById('coffee-timer-display').textContent='Done!';
      document.getElementById('coffee-timer-display').style.color='var(--green)';
      document.getElementById('coffee-timer-status').textContent='Coffee is ready!';
      document.getElementById('coffee-start-btn').textContent='Start Timer';
      showModal({icon:'☕',title:'Coffee Ready!',msg:'2 hours have passed. Time to make fresh coffee!',buttons:[{label:'Got it',style:'modal-btn-primary'}]});
      return;
    }
    updateCoffeeDisplay();
  },1000);
}

function updateCoffeeDisplay(){
  const el=document.getElementById('coffee-timer-display');
  const st=document.getElementById('coffee-timer-status');
  if(!el)return;
  if(!_coffeeEnd||!_coffeeInterval){
    el.textContent='2:00:00';
    el.style.color='var(--accent)';
    if(st&&!_coffeeInterval)st.textContent='Ready to start';
    return;
  }
  const remaining=Math.max(0,_coffeeEnd-Date.now());
  const h=Math.floor(remaining/3600000);
  const m=Math.floor((remaining%3600000)/60000);
  const s=Math.floor((remaining%60000)/1000);
  el.textContent=`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  const pct=remaining/(2*60*60*1000);
  el.style.color=pct>0.25?'var(--accent)':'var(--red)';
  if(st)st.textContent=`Coffee will be ready in ${h}h ${m}m`;
}

function coffeeTimerReset(){
  if(_coffeeInterval){clearInterval(_coffeeInterval);_coffeeInterval=null;}
  _coffeeEnd=null;
  localStorage.removeItem('ccc_coffee');
  document.getElementById('coffee-start-btn').textContent='Start Timer';
  document.getElementById('coffee-timer-status').textContent='Ready to start';
  document.getElementById('coffee-timer-display').style.color='var(--accent)';
  updateCoffeeDisplay();
}