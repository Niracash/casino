let D={shift:null,exchanges:[],cashpoints:[],fillups:[],additions:[],inputs:{home:{},shift:{},machines:{}},kfType:'kr'};

function loadState(){
  const raw=localStorage.getItem('ccc_v5');
  if(raw){
    const l=JSON.parse(raw);
    D={...D,...l};
    if(!D.inputs)D.inputs={home:{},shift:{},machines:{}};
    if(!D.exchanges)D.exchanges=[];
    if(!D.cashpoints)D.cashpoints=[];
    if(!D.additions)D.additions=[];
    if(!D.fillups)D.fillups=[];
  }
}
function saveState(){localStorage.setItem('ccc_v5',JSON.stringify(D));}

loadState();

// ── Modal ──
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
  restoreInputs();
  if(D.kfType){
    _kfType=D.kfType;
    document.querySelectorAll('#page-machines .type-sel.cols-3 .tsb').forEach(b=>b.classList.remove('on'));
    const ab=document.getElementById('type-'+D.kfType);if(ab)ab.classList.add('on');
    document.getElementById('kf-input-label').textContent={kr:'Win amount (kr)','1cr':'Credits on display','05cr':'Credits on display'}[D.kfType]||'Win amount (kr)';
  }
  selExFrom(_exFrom);
  renderShiftInfo();renderHomeLog();renderExchangeList();renderCashpointList();renderAddList();renderKFLog();
  renderShopItems();renderShopLog();
  recalc();updateEstCalc();updateHomeEst();renderShopSummary();fillExpectedIntoCount();
  loadCoffeeTimer();
  checkBetbooksAlert();
  const dateEl=document.getElementById('w-date');
  if(dateEl&&!dateEl.value)dateEl.value=nowDate();
});

function goPage(id,btn){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.nb').forEach(b=>b.classList.remove('on'));
  document.getElementById('page-'+id).classList.add('on');btn.classList.add('on');
  if(id==='home'){fillExpectedIntoCount();recalc();renderHomeLog();renderExchangeList();renderShopSummary();}
  if(id==='machines'){renderKFLog();renderAddList();}
  if(id==='shift'){
    renderShiftInfo();sPreview();renderCashpointList();updateEstCalc();
    const dateEl=document.getElementById('w-date');
    if(dateEl&&!dateEl.value)dateEl.value=nowDate();
  }
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
    if(e.from==='cash'&&e.to==='coin'){cash-=e.amount;coin+=e.amount;return;}
    if(e.from==='cash'&&e.to==='pc'){
      cash+=e.amount;
      pc-=e.pcOut||Math.floor(e.amount/20)*20;
      coin-=(e.coinChange||(e.amount-Math.floor(e.amount/20)*20));
      return;
    }
    if(e.from==='bank')bank+=e.amount;
    if(e.from==='pc')pc+=e.amount;
    if(e.from==='coin')coin+=e.amount;
    if(e.to==='cash')cash-=e.amount;
    if(e.to==='pc')pc-=e.amount;
    if(e.to==='coin'&&e.from!=='cash')coin-=e.amount;
    if(e.to==='bank')bank-=e.amount;
  });
  D.cashpoints.forEach(cp=>{
    if(cp.from==='bank')bank+=cp.amount;
    if(cp.from==='cash'){
      if(cp.amount>=0){
        const cashPart=Math.floor(cp.amount/50)*50;
        const coinPart=cp.amount-cashPart;
        cash+=cashPart;coin+=coinPart;
      }else{cash+=cp.amount;}
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

function renderHomeFridgeMini(){renderShopSummary();}

function updateHomeEst(){
  const exp=getExpected();
  const fridge=getFridgeTotal();
  const fridgeCash=fridge>0?Math.floor(fridge/50)*50:0;
  const fridgeCoin=fridge>0?fridge-fridgeCash:0;
  const setV=(id,v,fridgePart)=>{
    const el=document.getElementById(id);if(!el)return;
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
  renderShopSummary();
}

function updateHomeHints(){
  const exp=getExpected();
  const fridge=getFridgeTotal();
  const fridgeCash=fridge>0?Math.floor(fridge/50)*50:0;
  const fridgeCoin=fridge>0?fridge-fridgeCash:0;
  const setH=(id,base,fridgePart)=>{
    const el=document.getElementById(id);if(!el)return;
    if(!D.shift){el.innerHTML='';return;}
    const baseStr=`Expected: <span>${Math.round(base).toLocaleString('no-NO')} kr</span>`;
    const fridgeStr=fridgePart>0?` <span style="color:var(--green)">(+${fridgePart.toLocaleString('no-NO')} kr fridge = ${Math.round(base+fridgePart).toLocaleString('no-NO')} kr)</span>`:'';
    el.innerHTML=baseStr+fridgeStr;
  };
  setH('h-coin-hint',exp.coin,fridgeCoin);
  setH('h-cash-hint',exp.cash,fridgeCash);
  setH('h-pc-hint',exp.pc,0);
  setH('h-bank-hint',exp.bank,0);
}

function fillExpectedIntoCount(){
  if(!D.shift)return;
  const exp=getExpected();
  const set=(id,v)=>{
    const el=document.getElementById(id);if(!el)return;
    el.value=Math.round(v)>0?Math.round(v):'';
  };
  set('h-coin',exp.coin);
  set('h-cash',exp.cash);
  set('h-pc',exp.pc);
  set('h-bank',exp.bank);
  stashInputs();
  recalc();
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
  const fridgeStr=fridge>0?` <span style="color:var(--green);font-size:.75rem">(+${fridge.toLocaleString('no-NO')} kr fridge)</span>`:'';
  bp.innerHTML=physStr+fridgeStr;
  bp.className=physDiff>0?'bv green':physDiff<0?'bv red':'bv muted';

  if(bf){
    if(fridge<=0){bf.textContent='—';bf.className='bv muted';}
    else{bf.textContent=fridge.toLocaleString('no-NO')+' kr';bf.className='bv green';}
  }

  if(!hasCurrent){
    ba.textContent='—';ba.className='bv muted';db.className='diff idle';dv.textContent='—';
    ds.textContent='Expected: '+fmt(expected)+' · Count your drawer';
    hp.className='hdr-pill idle';hp.textContent='Shift active';
    if(updBtn)updBtn.style.display='none';
    return;
  }

  const diffNoFridge=current-expected;
  const diffWithFridge=current-expected-fridge;
  const absDiffNoFridge=Math.abs(Math.round(diffNoFridge));
  const absDiffWithFridge=Math.abs(Math.round(diffWithFridge));

  if(absDiffNoFridge<1){
    db.className='diff ok';
    if(fridge>0){
      dv.innerHTML='0 kr <span style="color:var(--sub);font-size:.75rem">without fridge</span>';
      ds.textContent='Drawer matches expected (excluding fridge revenue)';
    }else{
      dv.innerHTML='0 kr';ds.textContent='Drawer matches perfectly';
    }
    hp.className='hdr-pill ok';hp.textContent='Balanced ✓';
    ba.textContent='0 kr ✓';ba.className='bv green';
    if(updBtn){updBtn.style.display='';updBtn.disabled=false;}
  }else if(absDiffWithFridge<1){
    db.className='diff ok';
    dv.innerHTML=`<span style="font-size:1.3rem">0 kr</span> <span style="color:var(--green);font-size:.72rem">with fridge</span>`;
    ds.textContent=`Off by ${fmt(absDiffNoFridge)} without fridge · fridge brings it to zero`;
    hp.className='hdr-pill ok';hp.textContent='Balanced with fridge ✓';
    ba.innerHTML=`<span style="color:var(--sub);font-size:.8rem">−${fmt(absDiffNoFridge)}</span> <span style="color:var(--green);font-size:.75rem">(+fridge: 0)</span>`;
    ba.className='bv';
    if(updBtn)updBtn.style.display='none';
  }else{
    db.className='diff off';
    const showVal=diffNoFridge;
    dv.innerHTML=(showVal>0?'+':'−')+fmt(showVal);
    let subText=(showVal>0?'Over by ':'Short by ')+fmt(showVal)+' · expected '+fmt(expected);
    if(fridge>0)subText+=` · with fridge: ${diffWithFridge>0?'+':'−'}${fmt(diffWithFridge)}`;
    ds.textContent=subText;
    hp.className='hdr-pill off';hp.textContent='Off '+fmt(absDiffNoFridge);
    ba.textContent=(showVal>0?'+':'−')+fmt(showVal);ba.className=showVal>0?'bv green':'bv red';
    if(updBtn)updBtn.style.display='none';
  }
  updateEstCalc();
}

function updateExpectedFromCount(){
  const coin=g('h-coin'),cash=g('h-cash'),pc=g('h-pc'),bank=g('h-bank');
  const hasCurrent=coin>0||cash>0||pc>0||bank>0;
  if(!D.shift||!hasCurrent)return;
  const exp=getExpected();
  const diff=Math.abs(Math.round((coin+cash+pc+bank)-exp.total));
  if(diff>=1)return;
  // Update shift baseline ONLY — all transaction logs stay completely intact
  D.shift.coin=Math.round(exp.coin);
  D.shift.cash=Math.round(exp.cash);
  D.shift.pc=Math.round(exp.pc);
  D.shift.bank=Math.round(exp.bank);
  D.shift.total=Math.round(exp.total);
  saveState();
  renderHomeLog();renderKFLog();renderAddList();renderExchangeList();renderCashpointList();
  recalc();updateEstCalc();updateHomeEst();renderShopSummary();
  const btn=document.getElementById('update-expected-btn');
  btn.innerHTML