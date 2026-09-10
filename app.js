let D={shift:null,exchanges:[],cashpoints:[],fillups:[],additions:[],expenses:[],winners:[],auditLog:[],archived:{exchanges:[],cashpoints:[],fillups:[],additions:[]},inputs:{home:{},shift:{},machines:{}},settings:{fullName:'',shops:[],mailLanguage:'da',shopMachines:{},lastMachineShop:'',lastWinnerShop:''},kfType:'kr'};

function loadState(){
  const raw=localStorage.getItem('ccc_v5');
  if(raw){const l=JSON.parse(raw);D={...D,...l};if(!D.inputs)D.inputs={home:{},shift:{},machines:{}};if(!D.exchanges)D.exchanges=[];if(!D.cashpoints)D.cashpoints=[];if(!D.auditLog)D.auditLog=[];if(!D.expenses)D.expenses=[];if(!D.archived)D.archived={exchanges:[],cashpoints:[],fillups:[],additions:[]};if(!D.archived.exchanges)D.archived.exchanges=[];if(!D.archived.cashpoints)D.archived.cashpoints=[];if(!D.archived.fillups)D.archived.fillups=[];if(!D.archived.additions)D.archived.additions=[];if(!D.winners)D.winners=[];if(!D.settings)D.settings={fullName:'',shops:[],mailLanguage:'da'};if(!Array.isArray(D.settings.shops))D.settings.shops=[];if(!['da','en'].includes(D.settings.mailLanguage))D.settings.mailLanguage='da';delete D.settings.autoDownloadOnReset;delete D.settings.downloadFolderName;if(D.winner&&!Array.isArray(D.winner)){if(D.winner.amount&&D.winner.machineNr)D.winners.push(D.winner);delete D.winner;}}
}
function saveState(){localStorage.setItem('ccc_v5',JSON.stringify(D));}

loadState();
loadMachineDatabase();

// ── Haptic feedback ──
function haptic(style='light'){
  if(navigator.vibrate){
    const patterns={light:10,medium:20,heavy:40,success:[10,30,10]};
    navigator.vibrate(patterns[style]||10);
  }
}

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
  ensureSettings();
  restoreInputs();
  renderMachineShopOptions();
  if(D.kfType){
    _kfType=D.kfType;
    document.querySelectorAll('#page-machines .type-sel.cols-3 .tsb').forEach(b=>b.classList.remove('on'));
    const ab=document.getElementById('type-'+D.kfType);if(ab)ab.classList.add('on');
    document.getElementById('kf-input-label').textContent={kr:'Win amount (kr)','1cr':'Credits on display','05cr':'Credits on display'}[D.kfType]||'Win amount (kr)';
  }
  applyKFMachineLookup();
  selExFrom(_exFrom);
  // Init cashpoint sign button visibility (bank is default, sign not needed)
  const cpSb=document.getElementById('cp-sign-btn');
  if(cpSb)cpSb.style.visibility='hidden';
  renderShiftInfo();renderHomeLog();renderExchangeList();renderCashpointList();renderAddList();renderKFLog();
  renderShopItems();renderShopLog();renderExpenseList();
  // Saved settings live in localStorage with the rest of the app state. Rebuild
  // dependent controls on every cold start so saved shops are immediately available.
  renderWinnerShopOptions();
  recalc();updateEstCalc();updateHomeEst();renderShopSummary();fillExpectedIntoCount();
  loadCoffeeTimer();
  initMobileViewportRecovery();
});

function goPage(id,btn){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.nb').forEach(b=>b.classList.remove('on'));
  const page=document.getElementById('page-'+id);if(page)page.classList.add('on');
  if(btn&&btn.classList)btn.classList.add('on');
  if(id==='home'){fillExpectedIntoCount();recalc();renderHomeLog();renderExchangeList();renderShopSummary();}
  if(id==='machines'){renderMachineShopOptions();renderKFLog();renderAddList();applyKFMachineLookup();}
  if(id==='shift'){
    renderWinnerShopOptions();
    applyWinnerMachineLookup();
    renderShiftInfo();sPreview();renderCashpointList();renderExpenseList();renderWinnerLog();updateEstCalc();
  }
  if(id==='shop'){renderShopItems();renderShopLog();}
  if(id==='checklist'){renderChecklist();}
  if(id==='settings'){renderSettings();}
}

// ── iOS / mobile keyboard viewport recovery ──
// Safari/PWA can occasionally keep fixed UI anchored to the shortened keyboard
// viewport after the keyboard closes. Track the visual viewport and force a
// lightweight fixed-element reflow once it returns to full height.
function initMobileViewportRecovery(){
  const vv=window.visualViewport;
  const nav=document.querySelector('.nav');
  let keyboardWasOpen=false;
  let settleTimer=null;

  const recover=()=>{
    document.documentElement.style.setProperty('--app-visible-height',Math.round(window.innerHeight)+'px');
    if(!nav)return;
    nav.classList.add('viewport-refresh');
    requestAnimationFrame(()=>requestAnimationFrame(()=>nav.classList.remove('viewport-refresh')));
    // iOS sometimes leaves the layout viewport slightly scrolled after dismissing
    // the keyboard even though the page visually appears stationary.
    if(window.scrollY<4)window.scrollTo(0,0);
  };

  const sync=()=>{
    const visibleHeight=vv?vv.height:window.innerHeight;
    const fullHeight=window.innerHeight;
    const keyboardOpen=visibleHeight < fullHeight-120;
    document.body.classList.toggle('keyboard-open',keyboardOpen);
    if(keyboardWasOpen&&!keyboardOpen){
      clearTimeout(settleTimer);
      settleTimer=setTimeout(recover,80);
      setTimeout(recover,260);
    }
    keyboardWasOpen=keyboardOpen;
  };

  if(vv){vv.addEventListener('resize',sync);vv.addEventListener('scroll',sync);}
  window.addEventListener('resize',sync);
  document.addEventListener('focusout',e=>{
    if(e.target&&e.target.matches&&e.target.matches('input,select,textarea')){
      clearTimeout(settleTimer);
      settleTimer=setTimeout(recover,180);
    }
  });
  sync();
}

const g=id=>parseFloat(document.getElementById(id).value)||0;
const fmt=v=>Math.abs(Math.round(v)).toLocaleString('no-NO')+' kr';
const nowTime=()=>new Date().toLocaleTimeString('no-NO',{hour:'2-digit',minute:'2-digit'});
const nowDate=()=>new Date().toLocaleDateString('no-NO',{day:'2-digit',month:'2-digit',year:'numeric'});
const nowFull=()=>nowDate()+' '+nowTime();
const CAT_LABELS={cash:'Cash',pc:'Playcoins',coin:'Mønt',bank:'Bank'};

// ── Shop-specific machine directories ──
// This built-in seed belongs ONLY to Hvidovrevej 253A. Other shops start with an empty machine list.
// ID values are the last 4 characters from the machine serial list.
// denomination: '1cr' = 1 kr machine, '05cr' = 50 øre machine, 'kr' = regular kr entry.
// ── Shop-specific machine database ──
// Built-in shops and machines live in shops.json. User-added shops/machines stay in localStorage.
let BUILTIN_SHOPS={};
let MACHINE_DB_LOADED=false;
const DEFAULT_MACHINE_SHOP='Hvidovrevej 253A';

async function loadMachineDatabase(){
  try{
    const res=await fetch('shops.json',{cache:'no-store'});
    if(!res.ok)throw new Error('HTTP '+res.status);
    const data=await res.json();
    const next={};
    (Array.isArray(data.shops)?data.shops:[]).forEach(shop=>{
      const name=String(shop&&shop.name||'').trim();
      if(!name)return;
      next[name]={locked:shop.locked!==false,machines:(shop.machines&&typeof shop.machines==='object')?shop.machines:{}};
    });
    BUILTIN_SHOPS=next;
    MACHINE_DB_LOADED=true;
    migrateDatabaseShops();
    renderWinnerShopOptions();renderMachineShopOptions();
    if(document.getElementById('page-settings')?.classList.contains('on'))renderSettings();
    applyWinnerMachineLookup();applyKFMachineLookup();
  }catch(err){
    console.warn('Could not load shops.json',err);
    MACHINE_DB_LOADED=true;
  }
}

function getBuiltinShopNames(){return Object.keys(BUILTIN_SHOPS);}
function isBuiltinShop(shop){return !!(shop&&BUILTIN_SHOPS[shop]);}
function getAllShopNames(){
  const st=ensureSettings();
  return [...getBuiltinShopNames(),...st.shops.filter(x=>!isBuiltinShop(x))];
}
function migrateDatabaseShops(){
  const st=ensureSettings();
  const before=JSON.stringify({shops:st.shops,shopMachines:st.shopMachines});
  // v13 stored the Hvidovrevej seed in localStorage. shops.json is now the canonical source.
  st.shops=st.shops.filter(shop=>!isBuiltinShop(shop));
  getBuiltinShopNames().forEach(shop=>{delete st.shopMachines[shop];});
  st.machineDirectoryV14Migrated=true;
  const all=getAllShopNames();
  if(!st.lastMachineShop||!all.includes(st.lastMachineShop))st.lastMachineShop=all.includes(DEFAULT_MACHINE_SHOP)?DEFAULT_MACHINE_SHOP:(all[0]||'');
  if(st.lastWinnerShop&&!all.includes(st.lastWinnerShop))st.lastWinnerShop='';
  if(before!==JSON.stringify({shops:st.shops,shopMachines:st.shopMachines}))saveState();
}


function normalizeMachineNr(value){
  return String(value||'').trim().replace(/^0+/,'')||'0';
}

function getSelectedWinnerShop(){
  const el=document.getElementById('w-shop');
  return el?el.value.trim():'';
}

function getSelectedKFShop(){
  const el=document.getElementById('kf-shop');
  return el?el.value.trim():'';
}

function getShopMachineDirectory(shop){
  if(!shop)return{};
  if(isBuiltinShop(shop))return BUILTIN_SHOPS[shop].machines||{};
  const st=ensureSettings();
  return (st.shopMachines&&st.shopMachines[shop])||{};
}

function getMachineInfo(value,shop){
  const nr=normalizeMachineNr(value);
  const dir=getShopMachineDirectory(shop);
  return dir[nr]||null;
}

function applyKFMachineLookup(){
  const input=document.getElementById('kf-machine');
  const box=document.getElementById('kf-machine-info');
  const nameEl=document.getElementById('kf-machine-name');
  const idEl=document.getElementById('kf-machine-id');
  if(!input)return;
  const shop=getSelectedKFShop();
  const info=getMachineInfo(input.value,shop);
  if(info){
    if(box)box.style.display='';
    if(nameEl)nameEl.textContent=info.name;
    if(idEl)idEl.textContent=info.id;
    const btn=document.getElementById('type-'+info.denomination);
    if(btn&&_kfType!==info.denomination)selType(btn,info.denomination);
  }else{
    if(box)box.style.display='none';
    if(nameEl)nameEl.textContent='—';
    if(idEl)idEl.textContent='—';
  }
  stashInputs();
}

function applyWinnerMachineLookup(){
  const nrEl=document.getElementById('w-machine-nr');
  const idEl=document.getElementById('w-machine-id');
  const nameEl=document.getElementById('w-machine-name');
  if(!nrEl||!idEl||!nameEl)return;
  const info=getMachineInfo(nrEl.value,getSelectedWinnerShop());
  if(info){
    idEl.value=info.id;
    nameEl.value=info.name;
    idEl.dataset.autofilled='1';
    nameEl.dataset.autofilled='1';
  }else{
    if(idEl.dataset.autofilled==='1'){idEl.value='';delete idEl.dataset.autofilled;}
    if(nameEl.dataset.autofilled==='1'){nameEl.value='';delete nameEl.dataset.autofilled;}
  }
  saveWinner();
}


function flash(id){const el=document.getElementById(id);if(!el)return;el.style.borderColor='var(--red)';el.focus();setTimeout(()=>el.style.borderColor='',1600);}

// ── Split an amount into cash (notes) and mønt (coins) by Danish denominations ──
// Notes: 50, 100, 200, 500. Coins: 1, 2, 5, 10, 20.
// Strategy: greedily use notes first, remainder is coins.
// Always operates on a positive magnitude — direction (added/removed) is tracked separately via a `sign` field.
function splitExpenseDenominations(amount){
  const notes=[500,200,100,50];
  let rem=Math.round(amount);
  let cashPart=0;
  for(const n of notes){
    const count=Math.floor(rem/n);
    cashPart+=count*n;
    rem-=count*n;
  }
  return{cashPart,coinPart:rem};
}

function getExpected(){
  if(!D.shift)return{coin:0,cash:0,pc:0,bank:0,total:0};
  let coin=D.shift.coin,cash=D.shift.cash,pc=D.shift.pc,bank=D.shift.bank;
  D.additions.forEach(a=>{if(a.type==='cash')cash+=a.amount;else if(a.type==='playcoin')pc+=a.amount;});
  D.exchanges.forEach(e=>{
    if(e.from==='cash'&&e.to==='coin'){
      cash+=e.amount; coin-=e.amount; return;
    }
    if(e.from==='cash'&&e.to==='pc'){
      cash+=e.amount;
      pc-=e.pcOut||Math.floor(e.amount/20)*20;
      coin-=(e.coinChange||(e.amount-Math.floor(e.amount/20)*20));
      return;
    }
    if(e.from==='coin'&&e.to==='cash'){
      // Customer gives coins, we give notes out; coin remainder goes back to customer
      const cashOut=e.cashOut!=null?e.cashOut:Math.floor(e.amount/50)*50;
      coin+=e.amount; // we receive all coins from customer
      cash-=cashOut;  // we give notes out of drawer
      return;
    }
    if(e.from==='bank'&&e.to==='cash'){
      // Bank→cash: notes come from cash drawer, remainder from mønt
      const cashOut=Math.floor(e.amount/50)*50;
      const coinOut=e.amount-cashOut;
      bank+=e.amount; cash-=cashOut; if(coinOut)coin-=coinOut; return;
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

  // Fridge denomination shift:
  // Every full 50 kr of paid fridge revenue moves 50 kr from expected cash to expected mønt.
  // The total expected drawer value stays unchanged; only the expected denomination changes.
  // Example: cash 13,500 / mønt 400 + 50 kr fridge => cash 13,450 / mønt 450,
  // while the UI can still show the 50 kr fridge amount next to cash as "(+50)".
  const {cashPart:fridgeFifties}=getFridgeCashConversion();
  if(fridgeFifties>0){
    coin+=fridgeFifties;
    cash-=fridgeFifties;
  }

  // Unexpected changes: sign = -1 (removed from drawer) or +1 (added to drawer). Legacy entries with no
  // sign default to -1 (removal) to preserve the old "expense" behavior.
  if(D.expenses){D.expenses.forEach(e=>{
    const sign=e.sign||-1;
    cash+=sign*(e.cashPart||0);
    coin+=sign*(e.coinPart||0);
  });}
  return{coin,cash,pc,bank,total:coin+cash+pc+bank};
}

function stashInputs(){
  D.inputs.home={coin:document.getElementById('h-coin').value,cash:document.getElementById('h-cash').value,pc:document.getElementById('h-pc').value,bank:document.getElementById('h-bank').value};
  D.inputs.shift={coin:document.getElementById('s-coin').value,cash:document.getElementById('s-cash').value,pc:document.getElementById('s-pc').value,bank:document.getElementById('s-bank').value};
  D.inputs.machines={machine:document.getElementById('kf-machine').value,val:document.getElementById('kf-val').value,shop:getSelectedKFShop()};
  D.kfType=_kfType;saveState();
}

function restoreInputs(){
  const set=(id,v)=>{const el=document.getElementById(id);if(el&&v!=null&&v!=='')el.value=v;};
  if(D.inputs.home){set('h-coin',D.inputs.home.coin);set('h-cash',D.inputs.home.cash);set('h-pc',D.inputs.home.pc);set('h-bank',D.inputs.home.bank);}
  if(D.inputs.shift){set('s-coin',D.inputs.shift.coin);set('s-cash',D.inputs.shift.cash);set('s-pc',D.inputs.shift.pc);set('s-bank',D.inputs.shift.bank);}
  if(D.inputs.machines){set('kf-machine',D.inputs.machines.machine);set('kf-val',D.inputs.machines.val);}
  restoreWinner();
}

function saveWinner(){
  // No-op: winner fields are not auto-saved as drafts.
  // Winners are only committed to D.winners when the email is sent.
}

function restoreWinner(){
  // Fields start blank — winners are stored in D.winners log, not as a draft.
  const dateEl=document.getElementById('w-date');
  if(dateEl&&!dateEl.value)dateEl.value=nowDate();
  renderWinnerLog();
}

function renderWinnerLog(){
  const el=document.getElementById('winner-log-list');
  if(!el)return;
  const winners=D.winners||[];
  if(winners.length===0){
    el.innerHTML='<div class="empty"><div class="empty-ico">🏆</div>No winners saved yet</div>';
    return;
  }
  el.innerHTML='';
  [...winners].reverse().forEach((w,ri)=>{
    const i=winners.length-1-ri;
    const d=document.createElement('div');
    d.className='log-item';
    d.innerHTML=`<div class="log-ico" style="background:var(--green-dim)">🏆</div>
      <div class="log-body">
        <div class="log-title">${w.amount} kr — ${w.shop}</div>
        <div class="log-meta">Machine ${w.machineNr}${w.machineId?' · ID: '+w.machineId:''} · ${w.machineName}${w.gameName?' · '+w.gameName:''}</div>
        <div class="log-meta" style="margin-top:2px;color:var(--muted)">${w.date}</div>
      </div>
      <button class="log-del" onclick="delWinner(${i})">✕</button>`;
    el.appendChild(d);
  });
}

function delWinner(i){
  showModal({title:'Remove winner',msg:'Remove this winner from the log and report?',buttons:[
    {label:'Cancel',style:'modal-btn-ghost'},
    {label:'Remove',style:'modal-btn-danger',action:()=>{
      D.winners.splice(i,1);
      if(_activeWinnerIndex===i)_activeWinnerIndex=null;
      else if(_activeWinnerIndex!=null&&_activeWinnerIndex>i)_activeWinnerIndex--;
      saveState();renderWinnerLog();
    }}
  ]});
}

function getFridgeTotal(){
  if(!D.shop||!D.shop.sold)return 0;
  const products={sodavand:10,redbull:20,vand:5,bounty:10,bueno:10,mars:10,snickers:10,pringles:10,lighter:5};
  return Object.entries(products).reduce((s,[id,price])=>s+(D.shop.sold[id]||0)*price,0);
}

// ── Fridge revenue buckets ──
// Full 50 kr blocks are shown as the fridge "(+...)" cash amount; any remainder stays on the mønt side.
// getExpected() separately applies the denomination shift requested for each full 50: +50 mønt / -50 cash.
function getFridgeYesterdayMoney(){
  return Math.max(0,Math.round((D.shop&&D.shop.yesterdayMoney)||0));
}

function getFridgeCombinedTotal(){
  return getFridgeYesterdayMoney()+getFridgeTotal();
}

function getFridgeCashConversion(){
  const yesterday=getFridgeYesterdayMoney();
  const today=getFridgeTotal();
  // Only count NEW 50 kr thresholds crossed today. Example: yesterday 85 + today 15 = 100,
  // so one new 50 kr transfer is triggered today (from the 50-level to the 100-level).
  const startBlocks=Math.floor(yesterday/50);
  const endBlocks=Math.floor((yesterday+today)/50);
  const cashPart=Math.max(0,(endBlocks-startBlocks)*50);
  const coinPart=Math.max(0,today-cashPart);
  return{cashPart,coinPart};
}

function renderHomeFridgeMini(){renderShopSummary();}

function updateHomeEst(){
  const exp=getExpected();
  const {cashPart:fridgeCash,coinPart:fridgeCoin}=getFridgeCashConversion();

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
  renderShopSummary();
}

function updateHomeHints(){
  const exp=getExpected();
  const {cashPart:fridgeCash,coinPart:fridgeCoin}=getFridgeCashConversion();
  const setH=(id,base,fridgePart)=>{
    const el=document.getElementById(id);if(!el)return;
    if(!D.shift){el.innerHTML='';return;}
    const baseStr=`Expected: <span>${Math.round(base).toLocaleString('no-NO')} kr</span>`;
    const fridgeStr=fridgePart>0?` <span style="color:var(--green)">(+${fridgePart.toLocaleString('no-NO')} kr fridge)</span>`:'';
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
  const ids=['h-coin','h-cash','h-pc','h-bank'];
  const vals=[exp.coin,exp.cash,exp.pc,exp.bank];
  ids.forEach((id,i)=>{
    const el=document.getElementById(id);
    if(!el)return;
    const rounded=Math.round(vals[i]);
    const prev=parseFloat(el.value)||0;
    el.value=rounded>0?rounded:'';
    // Flash green if value changed
    if(Math.round(prev)!==rounded){
      el.style.borderColor='var(--accent)';
      el.style.background='var(--accent-dim)';
      setTimeout(()=>{el.style.borderColor='';el.style.background='';},700);
    }
  });
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

  if(!D.shift){
    db.className='diff idle';dv.textContent='—';ds.textContent='Set your start of shift first';
    hp.className='hdr-pill idle';hp.textContent='No shift';br.classList.remove('on');
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
    } else {
      dv.innerHTML='0 kr';
      ds.textContent='Drawer matches perfectly';
    }
    hp.className='hdr-pill ok';hp.textContent='Balanced ✓';
    ba.textContent='0 kr ✓';ba.className='bv green';
  } else if(absDiffWithFridge<1){
    db.className='diff ok';
    dv.innerHTML=`<span style="font-size:1.3rem">0 kr</span> <span style="color:var(--green);font-size:.72rem">with fridge</span>`;
    ds.textContent=`Off by ${fmt(absDiffNoFridge)} without fridge · +${fridge.toLocaleString('no-NO')} kr fridge brings it to zero`;
    hp.className='hdr-pill ok';hp.textContent='Balanced with fridge ✓';
    ba.innerHTML=`<span style="color:var(--sub);font-size:.8rem">−${fmt(absDiffNoFridge)}</span> <span style="color:var(--green);font-size:.75rem">(+fridge: 0)</span>`;
    ba.className='bv';
  } else {
    db.className='diff off';
    const showVal=diffNoFridge;
    dv.innerHTML=(showVal>0?'+':'−')+fmt(showVal);
    let subText=(showVal>0?'Over by ':'Short by ')+fmt(showVal)+' · expected '+fmt(expected);
    if(fridge>0) subText+=` · with fridge: ${diffWithFridge>0?'+':'−'}${fmt(diffWithFridge)}`;
    ds.textContent=subText;
    hp.className='hdr-pill off';hp.textContent='Off '+fmt(absDiffNoFridge);
    ba.textContent=(showVal>0?'+':'−')+fmt(showVal);ba.className=showVal>0?'bv green':'bv red';
  }
  updateEstCalc();
}

const COUNT_BALANCE_META={
  coin:{id:'h-coin',label:'Mønt',step:1,note:'Danish coins can make any whole-kr amount.'},
  cash:{id:'h-cash',label:'Cash',step:50,note:'Cash must be a multiple of 50 kr (50/100/200/500 notes).'},
  pc:{id:'h-pc',label:'Playcoins',step:20,note:'Playcoins must be a multiple of 20 kr (1 playcoin = 20 kr).'},
  bank:{id:'h-bank',label:'Bank',step:1,note:'Bank can balance any whole-kr amount.'}
};

function getBalanceTarget(type){
  if(!D.shift||!COUNT_BALANCE_META[type])return null;
  const exp=getExpected();
  const values={coin:g('h-coin'),cash:g('h-cash'),pc:g('h-pc'),bank:g('h-bank')};
  const otherTotal=Object.entries(values).reduce((sum,[k,v])=>k===type?sum:sum+v,0);
  return Math.round(exp.total-otherTotal);
}

function confirmBalanceCount(type){
  if(!D.shift){
    showModal({title:'No active shift',msg:'Set the start of shift first.',buttons:[{label:'OK',style:'modal-btn-primary'}]});
    return;
  }
  const meta=COUNT_BALANCE_META[type];
  if(!meta)return;
  const target=getBalanceTarget(type);
  const old=Math.round(g(meta.id));
  if(target==null)return;

  if(target<0){
    showModal({title:'Cannot balance '+meta.label,msg:'Required amount: '+target.toLocaleString('no-NO')+' kr.',buttons:[{label:'OK',style:'modal-btn-primary'}]});
    return;
  }
  if(target%meta.step!==0){
    showModal({title:'Cannot balance '+meta.label,msg:'Required amount: '+target.toLocaleString('no-NO')+' kr. Choose another box.',buttons:[{label:'OK',style:'modal-btn-primary'}]});
    return;
  }
  if(target===old){
    showModal({title:meta.label+' is balanced',msg:old.toLocaleString('no-NO')+' kr. No change needed.',buttons:[{label:'OK',style:'modal-btn-primary'}]});
    return;
  }

  showModal({
    title:'Update '+meta.label+'?',
    msg:`${old.toLocaleString('no-NO')} kr → ${target.toLocaleString('no-NO')} kr`,
    buttons:[
      {label:'Cancel',style:'modal-btn-ghost'},
      {label:'Update',style:'modal-btn-primary',action:()=>applyBalanceCount(type,target)}
    ]
  });
}

function applyBalanceCount(type,target){
  const meta=COUNT_BALANCE_META[type];
  if(!meta)return;
  const el=document.getElementById(meta.id);
  if(!el)return;
  el.value=target;
  el.style.borderColor='var(--green)';
  el.style.background='var(--green-dim)';
  setTimeout(()=>{el.style.borderColor='';el.style.background='';},900);
  stashInputs();
  recalc();
}

// ── Log Pagination ──
const LOG_PAGE_SIZE=5;
let _homeLogPage=0;

function renderHomeLog(){
  const all=[
    ...D.fillups.map((f,i)=>({type:'fillup',i,ts:f.ts||0,data:f})),
    ...D.additions.map((a,i)=>({type:'addition',i,ts:a.ts||0,data:a})),
    ...(D.expenses||[]).map((e,i)=>({type:'expense',i,ts:e.ts||0,data:e})),
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
        <div class="log-body"><div class="log-title">Key Fillup — Machine ${d.machine}${d.machineName?' · '+d.machineName:''}</div><div class="log-meta">${d.shop?d.shop+' · ':''}${d.machineId?'ID: '+d.machineId+' · ':''}${d.coins} playcoins · ${fmt(d.coins*20)}</div></div>
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
    } else if(entry.type==='expense'){
      const isAdd=(d.sign||-1)>0;
      const c=d.cashPart||0,m=d.coinPart||0;
      const metaStr=(()=>{
        const sgn=isAdd?'+':'−';
        if(c&&m)return sgn+c.toLocaleString('no-NO')+' kr cash · '+sgn+m.toLocaleString('no-NO')+' kr mønt';
        if(c)return sgn+c.toLocaleString('no-NO')+' kr cash';
        return sgn+m.toLocaleString('no-NO')+' kr mønt';
      })();
      div.innerHTML=`<div class="log-ico" style="background:${isAdd?'var(--green-dim)':'var(--red-dim)'}">💸</div>
        <div class="log-body"><div class="log-title">${isAdd?'Added':'Removed'} — ${d.reason||'No reason'}</div><div class="log-meta">${metaStr}</div></div>
        <div class="log-right"><div class="log-amt" style="color:${isAdd?'var(--green)':'var(--red)'}">${isAdd?'+':'−'}${fmt(d.amount)}</div><div class="log-time">${d.date}</div></div>
        <button class="log-del" onclick="delExpense(${entry.i})">✕</button>`;
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

// ── Unexpected Change List ──
let _expenseListPage=0;
function renderExpenseList(){
  const expenses=D.expenses||[];
  const total=expenses.reduce((s,e)=>s+((e.sign||-1)*e.amount),0);
  const countEl=document.getElementById('expense-count-label');
  if(countEl)countEl.textContent=expenses.length>0?expenses.length+' · '+(total>=0?'+':'−')+fmt(total):'';
  const el=document.getElementById('expense-list');
  if(!el)return;
  const allItems=[...expenses].reverse().map((e,ri)=>({e,i:expenses.length-1-ri}));
  if(allItems.length===0){el.innerHTML=`<div class="empty"><div class="empty-ico">💸</div>No entries yet</div>`;renderLogPagination('expense-list-pagination',0,0,0);return;}
  const totalPages=Math.ceil(allItems.length/LOG_PAGE_SIZE);
  if(_expenseListPage>=totalPages)_expenseListPage=totalPages-1;
  const pageItems=allItems.slice(_expenseListPage*LOG_PAGE_SIZE,(_expenseListPage+1)*LOG_PAGE_SIZE);
  el.innerHTML='';
  pageItems.forEach(({e,i})=>{
    const isAdd=(e.sign||-1)>0;
    const d=document.createElement('div');d.className='log-item';
    const c=e.cashPart||0,m=e.coinPart||0;
    const metaStr=(()=>{
      const sgn=isAdd?'+':'−';
      if(c&&m)return sgn+c.toLocaleString('no-NO')+' kr cash · '+sgn+m.toLocaleString('no-NO')+' kr mønt';
      if(c)return sgn+c.toLocaleString('no-NO')+' kr cash';
      return sgn+m.toLocaleString('no-NO')+' kr mønt';
    })();
    d.innerHTML=`<div class="log-ico" style="background:${isAdd?'var(--green-dim)':'var(--red-dim)'}">💸</div>
      <div class="log-body"><div class="log-title">${e.reason||(isAdd?'Added':'Removed')}</div><div class="log-meta">${metaStr}</div></div>
      <div class="log-right"><div class="log-amt" style="color:${isAdd?'var(--green)':'var(--red)'}">${isAdd?'+':'−'}${fmt(e.amount)}</div><div class="log-time">${e.date}</div></div>
      <button class="log-del" onclick="delExpense(${i})">✕</button>`;
    el.appendChild(d);
  });
  renderLogPagination('expense-list-pagination',_expenseListPage,totalPages,allItems.length,(p)=>{_expenseListPage=p;renderExpenseList();});
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

function auditLog(action,type,data){
  if(!D.auditLog)D.auditLog=[];
  D.auditLog.push({action,type,data:JSON.parse(JSON.stringify(data)),ts:Date.now(),date:nowFull()});
  saveState();
}

function delFillup(i){
  showModal({title:'Remove entry',msg:'Are you sure you want to remove this fillup? This will affect the calculation.',buttons:[
    {label:'Cancel',style:'modal-btn-ghost'},
    {label:'Remove',style:'modal-btn-danger',action:()=>{
      auditLog('delete','fillup',D.fillups[i]);
      Object.keys(_checkStates).forEach(k=>{if(k.startsWith(i+'_'))delete _checkStates[k];});
      _saveChecks();
      D.fillups.splice(i,1);saveState();renderHomeLog();renderKFLog();recalc();updateEstCalc();fillExpectedIntoCount();
    }}
  ]});
}
function delExchange(i){
  showModal({title:'Remove entry',msg:'Are you sure you want to remove this exchange? This will affect the calculation.',buttons:[
    {label:'Cancel',style:'modal-btn-ghost'},
    {label:'Remove',style:'modal-btn-danger',action:()=>{
      auditLog('delete','exchange',D.exchanges[i]);
      D.exchanges.splice(i,1);saveState();renderHomeLog();renderExchangeList();recalc();updateEstCalc();fillExpectedIntoCount();
    }}
  ]});
}
function delCashpoint(i){
  showModal({title:'Remove entry',msg:'Are you sure you want to remove this cashpoint entry? This will affect the calculation.',buttons:[
    {label:'Cancel',style:'modal-btn-ghost'},
    {label:'Remove',style:'modal-btn-danger',action:()=>{
      auditLog('delete','cashpoint',D.cashpoints[i]);
      D.cashpoints.splice(i,1);saveState();renderHomeLog();renderCashpointList();recalc();updateEstCalc();fillExpectedIntoCount();
    }}
  ]});
}
function delAddition(i){
  showModal({title:'Remove entry',msg:'Are you sure you want to remove this addition? This will affect the calculation.',buttons:[
    {label:'Cancel',style:'modal-btn-ghost'},
    {label:'Remove',style:'modal-btn-danger',action:()=>{
      auditLog('delete','addition',D.additions[i]);
      D.additions.splice(i,1);saveState();renderHomeLog();renderAddList();recalc();updateEstCalc();fillExpectedIntoCount();
    }}
  ]});
}
function delExpense(i){
  showModal({title:'Remove entry',msg:'Remove this unexpected change entry? This will affect the calculation.',buttons:[
    {label:'Cancel',style:'modal-btn-ghost'},
    {label:'Remove',style:'modal-btn-danger',action:()=>{
      if(!D.expenses)D.expenses=[];
      D.expenses.splice(i,1);saveState();renderHomeLog();renderExpenseList();recalc();updateEstCalc();fillExpectedIntoCount();
    }}
  ]});
}

// ── Unexpected Change save ──
// _expSign: -1 = money removed from drawer, +1 = money added to drawer. Defaults to removal (matches old "Expense" behavior).
let _expSign=-1;

function expAmtToggleSign(){
  _expSign*=-1;
  const btn=document.getElementById('exp-sign-btn');
  if(btn){
    btn.textContent=_expSign>0?'+':'−';
    btn.style.color=_expSign>0?'var(--green)':'var(--red)';
    btn.style.borderColor=_expSign>0?'var(--green-mid)':'var(--red-mid)';
    btn.style.background=_expSign>0?'var(--green-dim)':'var(--red-dim)';
  }
  expCalcHint();
}

function saveExpense(){
  const amt=parseFloat(document.getElementById('exp-amt').value);
  const reason=document.getElementById('exp-reason').value.trim();
  if(isNaN(amt)||amt<=0)return flash('exp-amt');
  if(!reason)return flash('exp-reason');
  if(!D.expenses)D.expenses=[];
  const{cashPart:eCash,coinPart:eCoin}=splitExpenseDenominations(amt);
  D.expenses.push({amount:amt,sign:_expSign,reason,cashPart:eCash,coinPart:eCoin,date:nowFull(),ts:Date.now()});
  saveState();
  document.getElementById('exp-amt').value='';
  document.getElementById('exp-reason').value='';
  document.getElementById('exp-save-btn').disabled=true;
  // Reset sign back to default (removal) after each save
  _expSign=-1;
  const sb=document.getElementById('exp-sign-btn');
  if(sb){sb.textContent='−';sb.style.color='var(--red)';sb.style.borderColor='var(--red-mid)';sb.style.background='var(--red-dim)';}
  renderExpenseList();renderHomeLog();recalc();updateEstCalc();fillExpectedIntoCount();
  haptic('success');
}

function expCalcHint(){
  const amt=parseFloat(document.getElementById('exp-amt').value)||0;
  const reason=(document.getElementById('exp-reason').value||'').trim();
  const btn=document.getElementById('exp-save-btn');
  const hint=document.getElementById('exp-hint');
  if(amt>0){
    if(hint){
      hint.style.display='block';
      hint.style.color=_expSign>0?'var(--green)':'var(--red)';
      hint.innerHTML=_expSign>0?`+${fmt(amt)} added to expected cash balance`:`−${fmt(amt)} removed from expected cash balance`;
    }
  } else {
    if(hint)hint.style.display='none';
  }
  if(btn)btn.disabled=!(amt>0&&reason.length>0);
}

function expReasonInput(){
  expCalcHint();
}

let _exFrom='cash',_exTo='pc';
const EXCHANGE_RULES={
  cash:{canGive:['pc','coin'],label:'Cash'},
  coin:{canGive:['pc','cash'],label:'Mønt'},
  pc:{canGive:['cash','coin'],label:'Playcoins',validate:v=>v%20===0&&v>0,validateMsg:'Playcoins must be multiples of 20 kr'},
  bank:{canGive:['pc','cash','coin'],label:'Bank'}
};

const DANISH_COIN_DENOMS=[20,10,5,2,1];
const DANISH_CASH_DENOMS=[500,200,100,50];
const PLAYCOIN_VALUE=20;

function denomBreakdown(amount,denoms){
  let rem=Math.max(0,Math.round(amount));
  const parts=[];
  denoms.forEach(d=>{const n=Math.floor(rem/d);if(n){parts.push(`${n}×${d}`);rem-=n*d;}});
  return{parts,remainder:rem,text:parts.join(' + ')};
}
function playcoinText(value){
  const count=Math.floor(value/PLAYCOIN_VALUE);
  return `${count} playcoin${count===1?'':'s'} (${fmt(value)})`;
}
function coinText(value){
  const b=denomBreakdown(value,DANISH_COIN_DENOMS);
  return `${fmt(value)} mønt${b.text?` (${b.text})`:''}`;
}
function cashText(value){
  const b=denomBreakdown(value,DANISH_CASH_DENOMS);
  return `${fmt(value)} cash${b.text?` (${b.text})`:''}`;
}

function validateExchange(from,to,amt){
  if(isNaN(amt)||amt<=0)return null;
  if(!Number.isInteger(amt))return 'Amounts must be whole kroner';
  if(from==='cash'&&amt%50!==0)return 'Cash received must be Danish notes: 50, 100, 200 or 500 kr';
  if(from==='pc'&&amt%PLAYCOIN_VALUE!==0)return 'Playcoins must be multiples of 20 kr (1 playcoin = 20 kr)';
  if(to==='cash'&&amt<50)return 'At least 50 kr is needed to give cash notes; smaller remainder is returned as mønt';
  return null;
}

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
  const amtInputs=document.querySelectorAll('.ex-amt-input');
  const amt=parseFloat(amtInputs[0]?amtInputs[0].value:0)||0;
  document.querySelectorAll('.ex-hint-el').forEach(hint=>{
    const err=validateExchange(_exFrom,_exTo,amt);
    if(err){
      if(amt>0){hint.className='ex-hint-el error';hint.innerHTML=`<b>Error:</b> ${err}`;hint.style.display='block';}
      else hint.style.display='none';
      document.querySelectorAll('.ex-save-btn').forEach(b=>b.disabled=true);return;
    }
    if(amt<=0){hint.style.display='none';document.querySelectorAll('.ex-save-btn').forEach(b=>b.disabled=true);return;}

    hint.className='ex-hint-el success';hint.style.display='block';
    if(_exTo==='pc'){
      const pcAmt=Math.floor(amt/PLAYCOIN_VALUE)*PLAYCOIN_VALUE;
      const change=amt-pcAmt;
      const receive=_exFrom==='cash'?`+${fmt(amt)} cash`:_exFrom==='coin'?`+${fmt(amt)} mønt`:`+${fmt(amt)} bank`;
      hint.innerHTML=`Give customer <b>${playcoinText(pcAmt)}</b>${change>0?` + <b>${coinText(change)}</b> back`:''} · ${receive}, −${fmt(pcAmt)} pc${change>0?`, −${fmt(change)} mønt`:''}`;
    } else if(_exTo==='cash'){
      const cashPart=Math.floor(amt/50)*50;
      const coinPart=amt-cashPart;
      const receive=_exFrom==='pc'?`+${fmt(amt)} pc`:_exFrom==='coin'?`+${fmt(amt)} mønt`:`+${fmt(amt)} bank`;
      hint.innerHTML=`Give customer <b>${cashText(cashPart)}</b>${coinPart>0?` + <b>${coinText(coinPart)}</b> back`:''} · ${receive}, −${fmt(cashPart)} cash${coinPart>0?`, −${fmt(coinPart)} mønt`:''}`;
    } else if(_exTo==='coin'){
      hint.innerHTML=`Give customer <b>${coinText(amt)}</b> · +${fmt(amt)} ${_exFrom==='cash'?'cash':_exFrom==='pc'?'pc':'bank'}, −${fmt(amt)} mønt`;
    } else hint.style.display='none';
    document.querySelectorAll('.ex-save-btn').forEach(b=>b.disabled=false);
  });
}

function exAmtInput(){
  const val=document.querySelectorAll('.ex-amt-input')[0]?.value||'';
  document.querySelectorAll('.ex-amt-input').forEach(el=>{if(el.value!==val)el.value=val;});
  exCalc();
}

function saveExchange(){
  const amt=parseFloat(document.querySelector('.ex-amt-input')?.value||0);
  if(isNaN(amt)||amt<=0){document.querySelectorAll('.ex-amt-input').forEach(el=>flash(el.id||'ex-amt'));return;}
  const err=validateExchange(_exFrom,_exTo,amt);
  if(err){document.querySelectorAll('.ex-amt-input').forEach(el=>flash(el.id||'ex-amt'));return;}

  if(_exFrom==='cash'&&_exTo==='coin'){
    D.exchanges.push({from:'cash',to:'coin',amount:amt,date:nowFull(),ts:Date.now()});
  } else if(_exFrom==='cash'&&_exTo==='pc'){
    const pcAmt=Math.floor(amt/PLAYCOIN_VALUE)*PLAYCOIN_VALUE;
    const change=amt-pcAmt;
    D.exchanges.push({from:'cash',to:'pc',amount:amt,pcOut:pcAmt,coinChange:change,date:nowFull(),ts:Date.now()});
  } else if(_exFrom==='pc'&&_exTo==='cash'){
    const cp=Math.floor(amt/50)*50,cn=amt-cp;
    D.exchanges.push({from:'pc',to:'cash',amount:cp,date:nowFull(),ts:Date.now()});
    if(cn>0)D.exchanges.push({from:'pc',to:'coin',amount:cn,date:nowFull(),ts:Date.now()});
  } else if(_exFrom==='bank'&&_exTo==='cash'){
    // e.g. 128 bank → 100 cash out + 28 mønt out
    const cashOut=Math.floor(amt/50)*50;
    const coinOut=amt-cashOut;
    D.exchanges.push({from:'bank',to:'cash',amount:amt,cashOut,coinOut,date:nowFull(),ts:Date.now()});
  } else if(_exFrom==='coin'&&_exTo==='cash'){
    // e.g. 120 mønt → 100 cash out + 20 mønt back to customer
    const cashPart=Math.floor(amt/50)*50;
    const coinPart=amt-cashPart;
    D.exchanges.push({from:'coin',to:'cash',amount:amt,cashOut:cashPart,coinBack:coinPart,date:nowFull(),ts:Date.now()});
  } else if(_exTo==='pc'){
    // e.g. bank 410 → 400 playcoins + 10 coin change back to customer
    const pcAmt=Math.floor(amt/PLAYCOIN_VALUE)*PLAYCOIN_VALUE;
    const change=amt-pcAmt;
    D.exchanges.push({from:_exFrom,to:'pc',amount:pcAmt,date:nowFull(),ts:Date.now()});
    if(change>0){
      // We give change back in mønt — so coin decreases (we give coin to customer)
      D.exchanges.push({from:_exFrom,to:'coin',amount:change,coinChange:change,date:nowFull(),ts:Date.now()});
    }
  } else {
    D.exchanges.push({from:_exFrom,to:_exTo,amount:amt,date:nowFull(),ts:Date.now()});
  }
  saveState();
  document.querySelectorAll('.ex-amt-input').forEach(el=>el.value='');
  document.querySelectorAll('.ex-hint-el').forEach(el=>el.style.display='none');
  document.querySelectorAll('.ex-save-btn').forEach(btn=>btn.disabled=true);
  D.exchanges.slice(-2).forEach(e=>auditLog('add','exchange',e));
  haptic('medium');
  renderExchangeList();renderHomeLog();recalc();updateEstCalc();fillExpectedIntoCount();
}

let _cpFrom='bank';
function selCpFrom(type){
  document.querySelectorAll('#cp-from-buttons .tsb').forEach(b=>b.classList.remove('on'));
  document.getElementById('cp-from-'+type).classList.add('on');_cpFrom=type;
  const lbl=document.getElementById('cp-amt-label');
  if(lbl) lbl.textContent=type==='cash'?'Amount paid out or deposited (use +/− to set direction)':'Cashpoint amount shown in system (kr)';
  // Reset sign to positive when switching types
  _cpSign=1;
  const sb=document.getElementById('cp-sign-btn');
  if(sb){sb.textContent='+';sb.style.color='var(--green)';sb.style.borderColor='var(--green-mid)';sb.style.background='var(--green-dim)';}
  // Show/hide sign button — only meaningful for cash
  if(sb) sb.style.visibility=type==='cash'?'visible':'hidden';
  document.getElementById('cp-amt').value='';
  document.getElementById('cp-hint').style.display='none';
  document.getElementById('cp-save-btn').disabled=true;
  cpCalc();
}

// ── +/- toggle for cashpoint numeric input ──
let _cpSign=1; // 1 = positive (deposit), -1 = negative (withdrawal/payout)
function cpToggleSign(){
  _cpSign*=-1;
  const btn=document.getElementById('cp-sign-btn');
  if(btn){
    btn.textContent=_cpSign>0?'+':'−';
    btn.style.color=_cpSign>0?'var(--green)':'var(--red)';
    btn.style.borderColor=_cpSign>0?'var(--green-mid)':'var(--red-mid)';
    btn.style.background=_cpSign>0?'var(--green-dim)':'var(--red-dim)';
  }
  cpCalc();
}

function cpCalc(){
  const raw=document.getElementById('cp-amt').value;
  const absAmt=parseFloat(raw)||0;
  // For cash: apply sign. For bank: always positive.
  const amt=_cpFrom==='cash'?absAmt*_cpSign:absAmt;
  const hint=document.getElementById('cp-hint'),saveBtn=document.getElementById('cp-save-btn');
  if(absAmt<20){
    if(absAmt>0){hint.className='error';hint.innerHTML='<b>Minimum:</b> 20 kr';hint.style.display='block';}
    else hint.style.display='none';
    saveBtn.disabled=true;return;
  }
  if(_cpFrom==='cash'){
    if(amt>0){
      // Deposit: customer brings cash in
      const cashPart=Math.floor(amt/50)*50;
      const coinPart=amt-cashPart;
      let splitStr='';
      if(cashPart>0&&coinPart>0) splitStr=` → <b>${fmt(cashPart)}</b> cash + <b>${fmt(coinPart)}</b> mønt`;
      else if(cashPart>0) splitStr=` → <b>${fmt(cashPart)}</b> cash`;
      else splitStr=` → <b>${fmt(coinPart)}</b> mønt`;
      hint.className='cashpoint';hint.style.display='block';
      hint.innerHTML=`Customer deposited <b>+${fmt(amt)}</b> via <b>Cash</b>${splitStr}`;
    } else {
      // Withdrawal/payout: we give customer cash from drawer
      hint.className='info';hint.style.display='block';
      hint.innerHTML=`We pay out <b>${fmt(absAmt)}</b> cash to customer from drawer. Expected cash −${fmt(absAmt)}.`;
    }
  } else {
    hint.className='cashpoint';hint.style.display='block';
    hint.innerHTML=`Customer deposited <b>+${fmt(absAmt)}</b> via <b>Bank/Card</b>. Adding to expected bank balance.`;
  }
  saveBtn.disabled=false;
}

function saveCashpoint(){
  const raw=parseFloat(document.getElementById('cp-amt').value);
  if(isNaN(raw)||raw<=0)return flash('cp-amt');
  const amt=_cpFrom==='cash'?raw*_cpSign:raw;
  if(Math.abs(amt)<20)return flash('cp-amt');
  D.cashpoints.push({from:_cpFrom,amount:amt,date:nowFull(),ts:Date.now()});saveState();
  document.getElementById('cp-amt').value='';document.getElementById('cp-hint').style.display='none';document.getElementById('cp-save-btn').disabled=true;
  // Reset sign
  _cpSign=1;
  const sb=document.getElementById('cp-sign-btn');
  if(sb){sb.textContent='+';sb.style.color='var(--green)';sb.style.borderColor='var(--green-mid)';sb.style.background='var(--green-dim)';}
  haptic('medium');
  renderCashpointList();renderHomeLog();recalc();updateEstCalc();fillExpectedIntoCount();
}

function doAdd(type){
  D.additions.push({type,amount:10000,date:nowFull(),ts:Date.now()});saveState();
  haptic('success');
  renderAddList();renderHomeLog();recalc();updateEstCalc();updateHomeEst();fillExpectedIntoCount();
  const btn=event.currentTarget,orig=btn.innerHTML;
  btn.innerHTML='✓ Added!';btn.style.opacity='.6';
  setTimeout(()=>{btn.innerHTML=orig;btn.style.opacity='';},1300);
}

function updateEstCalc(){updateHomeEst();}

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
  const machineShop=getSelectedKFShop();
  const machineInfo=getMachineInfo(machine,machineShop);
  let kr=0,coins=0;
  if(_kfType==='kr'){kr=raw;}else if(_kfType==='1cr'){kr=raw/2;}else{kr=raw/4;}
  coins=Math.ceil(Math.floor(kr/20)/5)*5||5;
  D.fillups.push({machine,shop:machineShop,machineName:machineInfo?machineInfo.name:'',machineId:machineInfo?machineInfo.id:'',type:_kfType,inputVal:raw,kr,coins,date:nowFull(),ts:Date.now()});saveState();
  document.getElementById('kf-val').value='';document.getElementById('kf-res').style.display='none';document.getElementById('kf-save-btn').disabled=true;
  haptic('success');
  renderKFLog();renderHomeLog();recalc();updateEstCalc();updateHomeEst();fillExpectedIntoCount();
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
    const inputLabels={kr:'Kr','1cr':'Credit (1 kr)','05cr':'Credit (0.5 kr)'};
    const krStr=f.type!=='kr'?` = ${f.kr!=null?f.kr.toLocaleString('no-NO'):''} kr`:'';
    const inputStr=`<div style="font-size:.72rem;color:var(--sub);margin-top:2px">${inputLabels[f.type]||f.type}: <b style="color:var(--text)">${f.inputVal!=null?f.inputVal.toLocaleString('no-NO'):f.kr.toLocaleString('no-NO')}</b>${krStr}</div>`;
    d.innerHTML=`<div class="mlog-top">
      <div class="mlog-title">🔑 Machine ${f.machine}${f.machineName?` · ${f.machineName}`:''}</div>
      <div style="display:flex;align-items:center;gap:6px"><span class="mlog-badge">${typeMap[f.type]||f.type}</span><button class="mlog-del" onclick="delFillup(${i})">✕</button></div>
    </div>
    <div class="mlog-detail">${f.shop?`<div style="font-size:.7rem;color:var(--sub);margin-bottom:3px">Shop: <b style="color:var(--text)">${f.shop}</b></div>`:''}${f.machineId?`<div style="font-size:.7rem;color:var(--sub);margin-bottom:3px">ID: <b style="color:var(--text)">${f.machineId}</b></div>`:''}<span style="color:var(--text);font-weight:600">${f.coins} playcoins · ${fmt(f.coins*20)}</span>${inputStr}${stepsHtml}<div style="margin-top:6px;color:var(--muted);font-size:.65rem">${f.date}</div></div>`;
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
    showModal({title:'No values entered',msg:'Enter at least one value before setting the start total.',buttons:[{label:'OK',style:'modal-btn-primary'}]});
    return;
  }
  const total=coin+cash+pc+bank;
  D.shift={coin,cash,pc,bank,total,originalTotal:total,originalCoin:coin,originalCash:cash,originalPc:pc,originalBank:bank,date:nowFull()};
  saveState();renderShiftInfo();recalc();updateEstCalc();updateHomeEst();haptic('success');
  const btn=event.currentTarget;btn.innerHTML='✓ Done!';btn.style.opacity='.7';
  setTimeout(()=>{btn.innerHTML='✓ Set as Start Total';btn.style.opacity='';},2000);
}
function lockShiftInputs(locked){
  ['s-coin','s-cash','s-pc','s-bank'].forEach(id=>{
    const el=document.getElementById(id);
    if(!el)return;
    el.readOnly=locked;
    el.style.opacity=locked?'0.4':'1';
    el.style.cursor=locked?'not-allowed':'';
    el.style.pointerEvents=locked?'none':'';
  });
  const btn=document.querySelector('#page-shift .btn-primary');
  if(btn){btn.disabled=locked;btn.style.opacity=locked?'0.3':'';}
  const preview=document.getElementById('s-preview');
  if(preview)preview.style.opacity=locked?'0.4':'1';
}
function renderShiftInfo(){
  const el=document.getElementById('shift-total-display'),date=document.getElementById('shift-date-display');
  if(D.shift){
    const displayTotal=D.shift.originalTotal!=null?D.shift.originalTotal:D.shift.total;
    el.textContent=fmt(displayTotal);el.className='ssv';date.textContent='Set: '+D.shift.date;
    lockShiftInputs(true);
  } else {
    el.textContent='Not set';el.className='ssv idle';date.textContent='';
    lockShiftInputs(false);
  }
}

function generateShiftPDF(options={}){
  const f=fmt;
  // Use shift date for the filename / title
  const shiftDate=D.shift?D.shift.date.split(' ')[0]:nowDate();
  const reportTitle=`${shiftDate}`;

  const exp=getExpected();
  // Expected total WITHOUT bank
  const expNoBank=exp.coin+exp.cash+exp.pc;

  const fridge=getFridgeTotal();
  const fridgeYesterday=getFridgeYesterdayMoney();
  const fridgeCombined=fridgeYesterday+fridge;
  const {cashPart:fridgeCash,coinPart:fridgeCoin}=getFridgeCashConversion();

  const archived=D.archived||{exchanges:[],cashpoints:[],fillups:[],additions:[]};
  const allFillups=[...(archived.fillups||[]),...D.fillups];
  const allAdditions=[...(archived.additions||[]),...D.additions];
  const allCashpoints=[...(archived.cashpoints||[]),...D.cashpoints];
  const allExchanges=[...(archived.exchanges||[]),...D.exchanges];
  const allExpenses=D.expenses||[];

  const CAT={cash:'Cash',pc:'Playcoins',coin:'Mønt',bank:'Bank'};

  // ── Chronological replay ──
  // This mirrors getExpected() exactly, so the "Expected after" column always matches
  // what the homepage's Expected Amounts panel would have shown at that moment.
  // The snapshot is attached directly onto each event object (not looked up by timestamp),
  // so two entries created in the same millisecond (e.g. a split pc→cash+mønt exchange)
  // never overwrite each other's snapshot.
  const runningEvents=[
    ...allFillups.map(x=>({type:'fillup',ts:x.ts||0,data:x})),
    ...allAdditions.map(x=>({type:'addition',ts:x.ts||0,data:x})),
    ...allCashpoints.map(x=>({type:'cashpoint',ts:x.ts||0,data:x})),
    ...allExchanges.map(x=>({type:'exchange',ts:x.ts||0,data:x})),
    ...allExpenses.map(x=>({type:'expense',ts:x.ts||0,data:x})),
  ].sort((a,b)=>a.ts-b.ts);

  let rCoin=D.shift?D.shift.coin:0;
  let rCash=D.shift?D.shift.cash:0;
  let rPc=D.shift?D.shift.pc:0;
  let rBank=D.shift?D.shift.bank:0;

  runningEvents.forEach(ev=>{
    const d=ev.data;
    if(ev.type==='addition'){
      if(d.type==='cash'){rCash+=d.amount;}
      else if(d.type==='playcoin'){rPc+=d.amount;}
    } else if(ev.type==='cashpoint'){
      if(d.from==='bank'){rBank+=d.amount;}
      else if(d.from==='cash'){
        if(d.amount>=0){
          const cp=Math.floor(d.amount/50)*50,cn=d.amount-cp;
          rCash+=cp;rCoin+=cn;
        } else {rCash+=d.amount;}
      }
    } else if(ev.type==='fillup'){
      rPc-=d.coins*20;
    } else if(ev.type==='exchange'){
      if(d.from==='cash'&&d.to==='coin'){
        rCash+=d.amount;rCoin-=d.amount;
      } else if(d.from==='cash'&&d.to==='pc'){
        rCash+=d.amount;
        rPc-=d.pcOut||Math.floor(d.amount/20)*20;
        const chg=d.coinChange||(d.amount-Math.floor(d.amount/20)*20);
        if(chg)rCoin-=chg;
      } else if(d.from==='coin'&&d.to==='cash'){
        const cashOut=d.cashOut!=null?d.cashOut:Math.floor(d.amount/50)*50;
        rCoin+=d.amount;rCash-=cashOut;
      } else if(d.from==='bank'&&d.to==='cash'){
        const cashOut=Math.floor(d.amount/50)*50;
        const coinOut=d.amount-cashOut;
        rBank+=d.amount;rCash-=cashOut;if(coinOut)rCoin-=coinOut;
      } else {
        if(d.from==='bank')rBank+=d.amount;
        if(d.from==='pc')rPc+=d.amount;
        if(d.from==='coin')rCoin+=d.amount;
        if(d.to==='cash')rCash-=d.amount;
        if(d.to==='pc')rPc-=d.amount;
        if(d.to==='coin'&&d.from!=='cash')rCoin-=d.amount;
        if(d.to==='bank')rBank-=d.amount;
      }
    } else if(ev.type==='expense'){
      const sign=d.sign||-1;
      rCash+=sign*(d.cashPart||0);
      rCoin+=sign*(d.coinPart||0);
    }
    ev.snapshot={coin:rCoin,cash:rCash,pc:rPc,bank:rBank};
  });

  const expCellHtml=(snap)=>{
    if(!snap)return'—';
    return `<span style="font-size:10px;color:#555">Mønt: <b>${Math.round(snap.coin).toLocaleString('no-NO')} kr</b> &nbsp;·&nbsp; Cash: <b>${Math.round(snap.cash).toLocaleString('no-NO')} kr</b> &nbsp;·&nbsp; Playcoins: <b>${Math.round(snap.pc).toLocaleString('no-NO')} kr</b> &nbsp;·&nbsp; Bank: <b>${Math.round(snap.bank).toLocaleString('no-NO')} kr</b></span>`;
  };

  const todayEntries=[...runningEvents].filter(ev=>ev.type!=='exchange').sort((a,b)=>b.ts-a.ts);
  const exchangeEntries=[...runningEvents].filter(ev=>ev.type==='exchange').sort((a,b)=>b.ts-a.ts);

  let logRows='';
  todayEntries.forEach(ev=>{
    const d=ev.data;
    let label='',detail='',amount='';
    if(ev.type==='fillup'){
      label='Key Fillup';detail=`${d.shop?d.shop+' — ':''}Machine ${d.machine}${d.machineName?' · '+d.machineName:''}${d.machineId?' · ID '+d.machineId:''} — ${d.coins} coins`;amount=f(d.coins*20);
    } else if(ev.type==='addition'){
      label=d.type==='playcoin'?'Playcoins Added':'Cash Added';detail='Replenishment';amount=f(d.amount);
    } else if(ev.type==='cashpoint'){
      const isW=d.amount<0;
      label='Cashpoint';detail=`${isW?'Withdrawal':'Deposit'} via ${d.from==='bank'?'Bank/Card':'Cash'}`;
      amount=(isW?'−':'+')+f(Math.abs(d.amount));
    } else if(ev.type==='expense'){
      const isAdd=(d.sign||-1)>0;
      label=isAdd?'Unexpected Change (Added)':'Unexpected Change (Removed)';
      detail=d.reason||'—';
      amount=(isAdd?'+':'−')+f(d.amount);
    }
    logRows+=`<tr><td>${d.date||''}</td><td>${label}</td><td>${detail}</td><td style="text-align:right;font-family:monospace">${amount}</td><td style="text-align:right">${expCellHtml(ev.snapshot)}</td></tr>`;
  });

  let exchangeRows='';
  exchangeEntries.forEach(ev=>{
    const d=ev.data;
    let detail='';
    if(d.from==='cash'&&d.to==='pc') detail='Cash → Playcoins';
    else if(d.from==='cash'&&d.to==='coin') detail='Cash → Mønt';
    else if(d.from==='pc'&&d.to==='cash') detail='Playcoins → Cash';
    else if(d.from==='pc'&&d.to==='coin') detail='Playcoins → Mønt';
    else detail=`${CAT[d.from]||d.from} → ${CAT[d.to]||d.to}`;
    exchangeRows+=`<tr><td>${d.date||''}</td><td>${detail}</td><td style="text-align:right;font-family:monospace">${f(d.amount)}</td><td style="text-align:right">${expCellHtml(ev.snapshot)}</td></tr>`;
  });

  let fridgeRows='';
  let totalStart=0,totalSold=0,totalFree=0,totalEnd=0,totalRev=0;
  if(D.shop){
    const products={sodavand:{n:'Sodavand',p:10},redbull:{n:'Redbull',p:20},vand:{n:'Vand',p:5},bounty:{n:'Bounty',p:10},bueno:{n:'Bueno',p:10},mars:{n:'Mars',p:10},snickers:{n:'Snickers',p:10},pringles:{n:'Pringles',p:10},lighter:{n:'Lighter',p:5}};
    Object.entries(products).forEach(([id,{n,p}])=>{
      const sold=(D.shop.sold&&D.shop.sold[id])||0;
      const start=(D.shop.starts&&D.shop.starts[id])||0;
      const free=(D.shop.freeTakes&&D.shop.freeTakes[id])||0;
      const end=start-sold-free;
      const rev=sold*p;
      const freeNames=((D.shop&&D.shop.log)||[]).filter(l=>l.id===id&&l.free).map(l=>l.takenBy).filter(Boolean);
      let soldCell;
      if(free>0){const namesStr=freeNames.length>0?` (${freeNames.join(', ')})`:'';soldCell=`${sold} + ${free} free${namesStr}`;}
      else soldCell=`${sold}`;
      totalStart+=start;totalSold+=sold;totalFree+=free;totalEnd+=end;totalRev+=rev;
      fridgeRows+=`<tr><td>${n}</td><td style="text-align:center">${start}</td><td>${soldCell}</td><td style="text-align:center">${end}</td><td style="text-align:right;font-family:monospace">${f(rev)}</td></tr>`;
    });
    fridgeRows+=`<tr style="background:#f4f4f8;font-weight:700;border-top:2px solid #ccc"><td>Total</td><td></td><td colspan="2" style="text-align:right;font-family:monospace;font-size:13px">${totalRev.toLocaleString('no-NO')} + ${fridgeYesterday.toLocaleString('no-NO')} →</td><td style="text-align:right;font-family:monospace;font-size:14px">${fridgeCombined.toLocaleString('no-NO')} kr</td></tr>`;
  }

  // Winners log — all saved winners
  const allWinners=D.winners||[];
  const winnerRows=allWinners.map(w=>`
    <tr>
      <td><b>${w.amount} kr</b></td>
      <td>${w.date||''}</td>
      <td>${w.machineNr||''}</td>
      <td>${w.machineId||''}</td>
      <td>${w.machineName||''}</td>
      <td>${w.gameName||''}</td>
      <td>${w.shop||''}</td>
    </tr>`).join('');
  const winnerSection=allWinners.length>0?`
  <h2>Winner Report (${allWinners.length})</h2>
  <table><thead><tr><th>Amount</th><th>Date</th><th>Machine Nr</th><th>Machine ID</th><th>Machine Name</th><th>Game Name</th><th>Shop</th></tr></thead>
  <tbody>${winnerRows}</tbody></table>`:'';

  const displayStartTotal=D.shift
    ?((D.shift.originalCoin!=null?D.shift.originalCoin:D.shift.coin)||0)
      +((D.shift.originalCash!=null?D.shift.originalCash:D.shift.cash)||0)
      +((D.shift.originalPc!=null?D.shift.originalPc:D.shift.pc)||0)
    :0;

  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>${reportTitle}</title>
  <style>
    body{font-family:Arial,sans-serif;font-size:13px;color:#111;padding:30px;max-width:760px;margin:0 auto}
    h1{font-size:20px;margin-bottom:2px;color:#1a1a2e}
    .meta{color:#666;font-size:12px;margin-bottom:24px}
    h2{font-size:14px;font-weight:700;margin:22px 0 8px;padding-bottom:4px;border-bottom:2px solid #eee;color:#1a1a2e}
    table{width:100%;border-collapse:collapse;margin-bottom:6px}
    th{background:#f4f4f8;text-align:left;padding:7px 10px;font-size:12px;color:#555;border-bottom:2px solid #ddd}
    td{padding:6px 10px;border-bottom:1px solid #eee;vertical-align:top;font-size:12px}
    tr:last-child td{border-bottom:none}
    .summary-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:8px}
    .summary-box{background:#f8f8fc;border:1px solid #e0e0ec;border-radius:8px;padding:12px 14px}
    .summary-box .label{font-size:11px;color:#888;margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px}
    .summary-box .value{font-size:16px;font-weight:700;font-family:monospace;color:#1a1a2e}
    .summary-box .sub{font-size:11px;color:#3ecf8e;margin-top:3px}
    .footer{margin-top:32px;font-size:11px;color:#aaa;text-align:center;border-top:1px solid #eee;padding-top:12px}
    .exp-col{background:#fafbff}
    /* Print styles */
    @media print{
      button{display:none!important}
      @page{margin:12mm 10mm}
      tr{page-break-inside:avoid}
      h2{page-break-after:avoid}
    }
  </style></head><body>
  <h1>${reportTitle}</h1>
  <div class="meta">Casino</div>
  <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
    <button onclick="window.close()" style="padding:8px 18px;background:#fff;color:#1a1a2e;border:1px solid #1a1a2e;border-radius:6px;cursor:pointer;font-size:13px">← Back</button>
    <button onclick="window.print()" style="padding:8px 18px;background:#1a1a2e;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px">🖨 Save as PDF</button>
  </div>
  <h2>Summary</h2>
  <div class="summary-grid">
    <div class="summary-box"><div class="label">Start Total (excl. bank)</div><div class="value">${D.shift?f(displayStartTotal):'—'}</div></div>
    <div class="summary-box"><div class="label">Expected (Mønt + Cash + PC)</div><div class="value">${f(expNoBank)}</div></div>
    <div class="summary-box"><div class="label">Mønt Expected</div><div class="value">${f(exp.coin)}</div>${fridgeCoin>0?`<div class="sub">+ ${f(fridgeCoin)} fridge</div>`:''}</div>
    <div class="summary-box"><div class="label">Cash Expected</div><div class="value">${f(exp.cash)}</div>${fridgeCash>0?`<div class="sub">+ ${f(fridgeCash)} fridge</div>`:''}</div>
    <div class="summary-box"><div class="label">Playcoins Expected</div><div class="value">${f(exp.pc)}</div></div>
    <div class="summary-box"><div class="label">Bank Expected</div><div class="value">${f(exp.bank)}</div></div>
  </div>
  <h2>Fridge</h2>
  <table><thead><tr><th>Items</th><th style="text-align:center">Start</th><th>Sold</th><th style="text-align:center">End</th><th style="text-align:right">Amount</th></tr></thead>
  <tbody>${fridgeRows}</tbody></table>
  <div style="text-align:right;color:#777;font-size:11px;margin-bottom:8px">Today + yesterday money = fridge total</div>
  <h2>Today's Log (${todayEntries.length} entries)</h2>
  ${todayEntries.length===0?'<p style="color:#999">No entries recorded.</p>':`
  <table><thead><tr><th>Time</th><th>Type</th><th>Detail</th><th style="text-align:right">Amount</th><th style="text-align:right" class="exp-col">Expected after</th></tr></thead>
  <tbody>${logRows}</tbody></table>`}
  <h2>Exchange Log (${exchangeEntries.length} entries)</h2>
  ${exchangeEntries.length===0?'<p style="color:#999">No exchanges recorded.</p>':`
  <table><thead><tr><th>Time</th><th>Detail</th><th style="text-align:right">Amount</th><th style="text-align:right" class="exp-col">Expected after</th></tr></thead>
  <tbody>${exchangeRows}</tbody></table>`}

  ${winnerSection}
  <div class="footer">${reportTitle} &nbsp;|&nbsp; Casino</div>
  </body></html>`;

  const filename=`Casino Shift Report ${reportTitle.replaceAll('/','-')}.html`;
  if(options&&options.returnData)return{html,filename};
  const blob=new Blob([html],{type:'text/html'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.target='_blank';a.rel='noopener';
  document.body.appendChild(a);a.click();
  document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url),10000);
}

function confirmReset(){
  showModal({
    icon:'🗑️',
    title:'Reset Shift',
    msg:'This clears all data for the day. Are you sure?',
    buttons:[
      {label:'Cancel',style:'modal-btn-ghost'},
      {label:'Reset',style:'modal-btn-danger',action:async()=>{
        const archived=D.archived||{exchanges:[],cashpoints:[],fillups:[],additions:[]};
        const hasArchived=(archived.exchanges&&archived.exchanges.length)||(archived.cashpoints&&archived.cashpoints.length)||(archived.fillups&&archived.fillups.length)||(archived.additions&&archived.additions.length);
        const hasData=D.shift||(D.fillups&&D.fillups.length)||(D.cashpoints&&D.cashpoints.length)||(D.exchanges&&D.exchanges.length)||(D.additions&&D.additions.length)||(D.expenses&&D.expenses.length)||hasArchived;
        if(hasData){
          showModal({
            icon:'📄',
            title:"Download Today's Report?",
            msg:"Save a copy of today's shift log before resetting. The browser/device chooses where the downloaded file is saved.",
            buttons:[
              {label:'Skip & Reset',style:'modal-btn-ghost',action:doReset},
              {label:'Download & Reset',style:'modal-btn-green',action:()=>{generateShiftPDF();doReset();}},
            ]
          });
        } else doReset();
      }}
    ]
  });
}

function doReset(){
  const savedSettings={...(D.settings||{fullName:'',shops:[],mailLanguage:'da'})};delete savedSettings.autoDownloadOnReset;delete savedSettings.downloadFolderName;
  D={shift:null,exchanges:[],cashpoints:[],fillups:[],additions:[],expenses:[],winners:[],auditLog:[],archived:{exchanges:[],cashpoints:[],fillups:[],additions:[]},shop:{starts:{},sold:{},freeTakes:{},log:[],yesterdayMoney:0},inputs:{home:{},shift:{},machines:{}},settings:savedSettings,kfType:'kr'};
  _homeLogPage=0;_exListPage=0;_cpListPage=0;_addListPage=0;_kfLogPage=0;_expenseListPage=0;
  Object.keys(_checkStates).forEach(k=>delete _checkStates[k]);
  _saveChecks();
  saveChecklistState({});
  saveState();
  document.querySelectorAll('#page-home input[type=number],#page-home input[type=text],#page-machines input[type=number],#page-machines input[type=text],#page-shift input[type=number],#page-shift input[type=text],#page-shop input[type=number],#page-shop input[type=text]').forEach(el=>el.value='');
  document.getElementById('s-preview').textContent='0 kr';document.getElementById('h-current-total').textContent='0 kr';
  _cpSign=1;const sb=document.getElementById('cp-sign-btn');if(sb){sb.textContent='+';sb.style.color='var(--green)';sb.style.borderColor='var(--green-mid)';sb.style.background='var(--green-dim)';}
  _expSign=-1;const eb=document.getElementById('exp-sign-btn');if(eb){eb.textContent='−';eb.style.color='var(--red)';eb.style.borderColor='var(--red-mid)';eb.style.background='var(--red-dim)';}
  renderShiftInfo();renderHomeLog();renderExchangeList();renderCashpointList();renderAddList();renderKFLog();renderExpenseList();renderChecklist();renderWinnerShopOptions();renderMachineShopOptions();recalc();updateEstCalc();updateHomeEst();
}

// ── SETTINGS / PERSISTENT PROFILE ──
function ensureSettings(){
  if(!D.settings)D.settings={fullName:'',shops:[],mailLanguage:'da',shopMachines:{},lastMachineShop:'',lastWinnerShop:''};
  const st=D.settings;
  if(!Array.isArray(st.shops))st.shops=[];
  if(!st.shopMachines||typeof st.shopMachines!=='object'||Array.isArray(st.shopMachines))st.shopMachines={};
  if(!['da','en'].includes(st.mailLanguage))st.mailLanguage='da';
  // User-created shops only live here. Built-in database shops are merged at render/lookup time.
  st.shops=[...new Map(st.shops.map(x=>[String(x).trim().toLowerCase(),String(x).trim()])).values()].filter(Boolean);
  st.shops.forEach(shop=>{if(!st.shopMachines[shop])st.shopMachines[shop]={};});
  if(MACHINE_DB_LOADED){
    st.shops=st.shops.filter(shop=>!isBuiltinShop(shop));
    getBuiltinShopNames().forEach(shop=>{delete st.shopMachines[shop];});
    const all=[...getBuiltinShopNames(),...st.shops];
    if(st.lastMachineShop&&!all.includes(st.lastMachineShop))st.lastMachineShop='';
    if(st.lastWinnerShop&&!all.includes(st.lastWinnerShop))st.lastWinnerShop='';
  }
  return st;
}

let _settingsOpenMachineShop='';
function renderSettings(){
  const st=ensureSettings();
  const name=document.getElementById('set-full-name');if(name&&document.activeElement!==name)name.value=st.fullName||'';
  const lang=document.getElementById('set-mail-language');if(lang)lang.value=st.mailLanguage||'da';
  const list=document.getElementById('settings-shop-list');
  if(!list)return;
  list.innerHTML='';

  // Database shops: visible and usable, but protected from removal/editing in Settings.
  getBuiltinShopNames().forEach(shop=>{
    const machines=getShopMachineDirectory(shop),count=Object.keys(machines).length;
    const wrap=document.createElement('div');wrap.className='settings-shop-block';
    wrap.innerHTML=`<div class="settings-list-row"><div style="min-width:0"><div style="font-weight:600">${escapeHtml(shop)} <span class="settings-db-badge">Database</span></div><div class="settings-value">${count} machine${count===1?'':'s'} · built-in</div></div><div class="settings-shop-actions"><button type="button" class="settings-manage" onclick="toggleDatabaseShopMachines('${escapeHtml(shop)}')">${_settingsOpenMachineShop===shop?'Close':'Machines'}</button></div></div>`;
    if(_settingsOpenMachineShop===shop){
      const editor=document.createElement('div');editor.className='settings-machine-editor';
      const rows=Object.entries(machines).sort((a,b)=>Number(a[0])-Number(b[0])).map(([nr,m])=>`<div class="settings-machine-row"><div class="settings-machine-main"><b>#${escapeHtml(nr)}</b><span>${escapeHtml(m.name||'')}</span><small>ID ${escapeHtml(m.id||'—')} · ${machineTypeLabel(m.denomination)}</small></div></div>`).join('');
      editor.innerHTML=`<div class="settings-db-note">Built-in machine data comes from shops.json and cannot be removed in Settings.</div><div class="settings-machine-list">${rows||'<div class="settings-empty">No machines in database</div>'}</div>`;
      wrap.appendChild(editor);
    }
    list.appendChild(wrap);
  });

  // User shops: fully editable/removable and kept in localStorage.
  st.shops.forEach((shop,i)=>{
    const machines=st.shopMachines[shop]||{};
    const count=Object.keys(machines).length;
    const wrap=document.createElement('div');wrap.className='settings-shop-block';
    wrap.innerHTML=`<div class="settings-list-row"><div style="min-width:0"><div style="font-weight:600">${escapeHtml(shop)}</div><div class="settings-value">${count} machine${count===1?'':'s'}</div></div><div class="settings-shop-actions"><button type="button" class="settings-manage" onclick="toggleShopMachines(${i})">${_settingsOpenMachineShop===shop?'Close':'Machines'}</button><button type="button" class="settings-remove" onclick="removeSavedShop(${i})">✕</button></div></div>`;
    if(_settingsOpenMachineShop===shop){
      const editor=document.createElement('div');editor.className='settings-machine-editor';
      const rows=Object.entries(machines).sort((a,b)=>Number(a[0])-Number(b[0])).map(([nr,m])=>`<div class="settings-machine-row"><div class="settings-machine-main"><b>#${escapeHtml(nr)}</b><span>${escapeHtml(m.name||'')}</span><small>ID ${escapeHtml(m.id||'—')} · ${machineTypeLabel(m.denomination)}</small></div><div class="settings-machine-actions"><button type="button" onclick="editSettingsMachine(${i},'${escapeHtml(nr)}')">Edit</button><button type="button" class="danger" onclick="removeSettingsMachine(${i},'${escapeHtml(nr)}')">✕</button></div></div>`).join('');
      editor.innerHTML=`<div class="settings-machine-form"><input type="text" id="sm-nr-${i}" inputmode="numeric" placeholder="Machine nr"><input type="text" id="sm-name-${i}" placeholder="Machine name"><input type="text" id="sm-id-${i}" placeholder="ID (last 4)"><select id="sm-type-${i}"><option value="kr">KR</option><option value="1cr">1 kr</option><option value="05cr">50 øre</option></select><button class="btn btn-primary" type="button" onclick="saveSettingsMachine(${i})">Save machine</button></div><div class="settings-machine-list">${rows||'<div class="settings-empty">No machines saved for this shop</div>'}</div>`;
      wrap.appendChild(editor);
    }
    list.appendChild(wrap);
  });
  if(!getBuiltinShopNames().length&&!st.shops.length)list.innerHTML='<div class="settings-empty">No shop locations saved</div>';
}
function toggleDatabaseShopMachines(shop){_settingsOpenMachineShop=_settingsOpenMachineShop===shop?'':shop;renderSettings();}
function machineTypeLabel(type){return type==='1cr'?'1 kr':type==='05cr'?'50 øre':'KR';}
function saveSettingsField(field,value){const st=ensureSettings();st[field]=value;saveState();}
function addSavedShop(){
  const input=document.getElementById('set-shop-input');if(!input)return;
  const name=input.value.trim();if(!name)return;
  const st=ensureSettings();
  if(!getAllShopNames().some(s=>s.toLowerCase()===name.toLowerCase())){st.shops.push(name);st.shopMachines[name]={};}
  input.value='';saveState();renderSettings();renderWinnerShopOptions();renderMachineShopOptions();
}
function removeSavedShop(i){
  const st=ensureSettings();const shop=st.shops[i];if(!shop)return;
  showModal({title:'Remove shop?',msg:`${shop} and its ${Object.keys(st.shopMachines[shop]||{}).length} saved machines will be removed.`,buttons:[{label:'Cancel',style:'modal-btn-ghost'},{label:'Remove',style:'modal-btn-danger',action:()=>{st.shops.splice(i,1);delete st.shopMachines[shop];if(st.lastMachineShop===shop)st.lastMachineShop='';if(st.lastWinnerShop===shop)st.lastWinnerShop='';if(_settingsOpenMachineShop===shop)_settingsOpenMachineShop='';saveState();renderSettings();renderWinnerShopOptions();renderMachineShopOptions();}}]});
}
function toggleShopMachines(i){const shop=ensureSettings().shops[i];_settingsOpenMachineShop=_settingsOpenMachineShop===shop?'':shop;renderSettings();}
function saveSettingsMachine(i){
  const st=ensureSettings(),shop=st.shops[i];if(!shop)return;
  const nr=normalizeMachineNr(document.getElementById(`sm-nr-${i}`).value);
  const name=document.getElementById(`sm-name-${i}`).value.trim();
  const idRaw=document.getElementById(`sm-id-${i}`).value.trim();
  const type=document.getElementById(`sm-type-${i}`).value;
  if(!nr||nr==='0'){flash(`sm-nr-${i}`);return;} if(!name){flash(`sm-name-${i}`);return;} if(!idRaw){flash(`sm-id-${i}`);return;}
  st.shopMachines[shop][nr]={name,id:idRaw.slice(-4),denomination:['kr','1cr','05cr'].includes(type)?type:'kr'};
  saveState();renderSettings();applyWinnerMachineLookup();applyKFMachineLookup();
}
function editSettingsMachine(i,nr){
  const st=ensureSettings(),shop=st.shops[i],m=(st.shopMachines[shop]||{})[nr];if(!m)return;
  document.getElementById(`sm-nr-${i}`).value=nr;document.getElementById(`sm-name-${i}`).value=m.name||'';document.getElementById(`sm-id-${i}`).value=m.id||'';document.getElementById(`sm-type-${i}`).value=m.denomination||'kr';
  document.getElementById(`sm-name-${i}`).focus();
}
function removeSettingsMachine(i,nr){
  const st=ensureSettings(),shop=st.shops[i];if(!shop)return;
  delete st.shopMachines[shop][nr];saveState();renderSettings();applyWinnerMachineLookup();applyKFMachineLookup();
}
function renderWinnerShopOptions(){
  const sel=document.getElementById('w-shop');if(!sel)return;
  const st=ensureSettings(),shops=getAllShopNames(),current=sel.value||st.lastWinnerShop||'';
  sel.innerHTML='<option value="">Choose saved shop</option>'+shops.map(x=>`<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`).join('');
  if(shops.includes(current))sel.value=current;else if(shops.length===1)sel.value=shops[0];
  if(sel.value)st.lastWinnerShop=sel.value;
}
function winnerShopChanged(){const st=ensureSettings();st.lastWinnerShop=getSelectedWinnerShop();saveState();applyWinnerMachineLookup();saveWinner();}
function renderMachineShopOptions(){
  const sel=document.getElementById('kf-shop');if(!sel)return;
  const st=ensureSettings(),shops=getAllShopNames();const current=sel.value||(D.inputs.machines&&D.inputs.machines.shop)||st.lastMachineShop||'';
  sel.innerHTML='<option value="">Choose shop</option>'+shops.map(x=>`<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`).join('');
  if(shops.includes(current))sel.value=current;else if(shops.length===1)sel.value=shops[0];
  if(sel.value)st.lastMachineShop=sel.value;
}
function kfShopChanged(){const st=ensureSettings();st.lastMachineShop=getSelectedKFShop();saveState();applyKFMachineLookup();stashInputs();}
function escapeHtml(v){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}


// ── SHOP ──
const SHOP_PRODUCTS=[
  {id:'sodavand',name:'Sodavand',icon:'🥤',price:10,unit:'coin'},
  {id:'redbull',name:'Redbull',icon:'⚡',price:20,unit:'coin'},
  {id:'vand',name:'Vand',icon:'💧',price:5,unit:'coin'},
  {id:'bounty',name:'Bounty',icon:'🍫',price:10,unit:'coin'},
  {id:'bueno',name:'Bueno',icon:'🍫',price:10,unit:'coin'},
  {id:'mars',name:'Mars',icon:'🍫',price:10,unit:'coin'},
  {id:'snickers',name:'Snickers',icon:'🍫',price:10,unit:'coin'},
  {id:'pringles',name:'Pringles',icon:'🍟',price:10,unit:'coin'},
  {id:'lighter',name:'Lighter',icon:'🔥',price:5,unit:'coin'},
];

function initShop(){
  if(!D.shop)D.shop={starts:{},sold:{},freeTakes:{},log:[],yesterdayMoney:0};
  if(!D.shop.freeTakes)D.shop.freeTakes={};
  if(D.shop.yesterdayMoney===undefined)D.shop.yesterdayMoney=0;
  SHOP_PRODUCTS.forEach(p=>{
    if(D.shop.starts[p.id]===undefined)D.shop.starts[p.id]=0;
    if(D.shop.sold[p.id]===undefined)D.shop.sold[p.id]=0;
    if(D.shop.freeTakes[p.id]===undefined)D.shop.freeTakes[p.id]=0;
  });
}

function setFridgeYesterdayMoney(val){
  initShop();
  const n=Math.max(0,Math.round(parseFloat(val)||0));
  D.shop.yesterdayMoney=n;
  saveState();
  renderShopSummary();
  recalc();
  updateHomeEst();
}

function renderFridgeCarryInput(){
  initShop();
  const el=document.getElementById('fridge-yesterday-money');
  if(el&&document.activeElement!==el)el.value=D.shop.yesterdayMoney||'';
}

function renderShopItems(){
  initShop();
  renderFridgeCarryInput();
  const el=document.getElementById('shop-items-list');
  el.innerHTML='';
  SHOP_PRODUCTS.forEach(p=>{
    const start=D.shop.starts[p.id]||0;
    const sold=D.shop.sold[p.id]||0;
    const free=D.shop.freeTakes[p.id]||0;
    const end=start-sold-free;
    const revenue=sold*p.price;

    const freeLogs=(D.shop.log||[]).map((l,i)=>({...l,_i:i})).filter(l=>l.id===p.id&&l.free);
    let freeTakersHtml='';
    if(freeLogs.length>0){
      freeTakersHtml=`<div style="margin-top:6px;padding:6px 0;border-top:1px solid var(--border)">
        <div style="font-size:.6rem;color:var(--sub);text-transform:uppercase;letter-spacing:.8px;font-weight:700;margin-bottom:5px">Free takes</div>
        ${freeLogs.map(l=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:3px 0;gap:8px">
          <span style="font-size:.75rem;color:var(--accent)">${l.takenBy||'—'} <span style="color:var(--muted);font-size:.65rem">· ${l.date||''}</span></span>
          <button onclick="delFreeTake('${p.id}',${l._i})" style="background:var(--red-dim);border:1px solid var(--red-mid);color:var(--red);border-radius:5px;font-size:.62rem;padding:3px 8px;cursor:pointer;font-family:'Inter',sans-serif;font-weight:600">Undo</button>
        </div>`).join('')}
      </div>`;
    }

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
            <button class="shop-counter-btn plus" onclick="shopSell('${p.id}',1);haptic('light')">+</button>
          </div>
          <button class="shop-free-btn" onclick="shopFreeTake('${p.id}')">Take (free)</button>
        </div>
      </div>
      <div class="shop-item-row"><span class="sl">Sold (paid)</span><span class="sv">${sold} pcs</span></div>
      <div class="shop-item-row"><span class="sl">Free takes</span><span class="sv" style="color:${free>0?'var(--accent)':'var(--muted)'}">${free} pcs</span></div>
      <div class="shop-item-row"><span class="sl">End count</span><span class="sv" id="shop-end-${p.id}" style="color:${end<0?'var(--red)':'var(--text)'}">${end}</span></div>
      <div class="shop-item-row"><span class="sl">Revenue</span><span class="sv" style="color:var(--green)">${revenue>0?revenue.toLocaleString('no-NO')+' kr':'—'}</span></div>
      ${freeTakersHtml}`;
    el.appendChild(div);
  });
  renderShopSummary();
  updateHomeEst();
  const coin=g('h-coin'),cash=g('h-cash'),pc=g('h-pc'),bank=g('h-bank');
  if(coin||cash||pc||bank) recalc();
}

function setShopStart(id,val){
  initShop();
  D.shop.starts[id]=parseInt(val)||0;
  saveState();
  const sold=D.shop.sold[id]||0;
  const free=D.shop.freeTakes[id]||0;
  const start=D.shop.starts[id]||0;
  const end=start-sold-free;
  const endEl=document.getElementById('shop-end-'+id);
  if(endEl){endEl.textContent=end;endEl.style.color=end<0?'var(--red)':'var(--text)';}
  renderShopSummary();
  updateHomeEst();
}

function _doShopSell(id,delta){
  initShop();
  D.shop.sold[id]=Math.max(0,(D.shop.sold[id]||0)+delta);
  if(delta>0){
    if(!D.shop.log)D.shop.log=[];
    D.shop.log.push({id,name:SHOP_PRODUCTS.find(p=>p.id===id).name,price:SHOP_PRODUCTS.find(p=>p.id===id).price,ts:Date.now(),date:nowFull()});
  } else {
    if(D.shop.log){
      const idx=[...D.shop.log].map((l,i)=>({l,i})).reverse().find(x=>x.l.id===id&&!x.l.free);
      if(idx)D.shop.log.splice(idx.i,1);
    }
  }
  saveState();
  renderShopItems();
  renderShopLog();
  renderHomeFridgeMini();
}

function shopSell(id,delta){
  initShop();
  if(delta>0)haptic('light');
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

function delFreeTake(id,logIndex){
  initShop();
  const product=SHOP_PRODUCTS.find(p=>p.id===id);
  if(!product)return;
  const entry=D.shop.log&&D.shop.log[logIndex];
  if(!entry||!entry.free)return;
  const takenBy=entry.takenBy||'someone';
  showModal({
    icon:'↩️',
    title:'Remove Free Take',
    msg:`Remove free take of ${product.name} by ${takenBy}?`,
    buttons:[
      {label:'Cancel',style:'modal-btn-ghost'},
      {label:'Remove',style:'modal-btn-danger',action:()=>{
        D.shop.log.splice(logIndex,1);
        D.shop.freeTakes[id]=Math.max(0,(D.shop.freeTakes[id]||1)-1);
        saveState();
        renderShopItems();
        renderShopLog();
        renderHomeFridgeMini();
      }}
    ]
  });
}

function showNameModal(productName,onConfirm){
  document.getElementById('modal-icon').textContent='🎁';
  document.getElementById('modal-icon').style.display='block';
  document.getElementById('modal-title').textContent='Free Take — '+productName;
  const msgEl=document.getElementById('modal-msg');
  msgEl.innerHTML=`<div style="margin-bottom:12px">Who's taking this item?</div>
    <input id="free-take-name" type="text" placeholder="Enter name" style="width:100%;background:#0c0d12;border:1px solid #2e3141;border-radius:8px;color:#e8eaf2;font-size:.95rem;padding:11px 12px;outline:none;font-family:'Inter',sans-serif" autocomplete="off">`;
  const btnsEl=document.getElementById('modal-btns');
  btnsEl.innerHTML='';
  const cancelBtn=document.createElement('button');
  cancelBtn.className='modal-btn modal-btn-ghost';
  cancelBtn.textContent='Cancel';
  cancelBtn.onclick=()=>closeModal();
  const okBtn=document.createElement('button');
  okBtn.className='modal-btn modal-btn-primary';
  okBtn.textContent='Confirm Take';
  okBtn.onclick=()=>{
    const name=document.getElementById('free-take-name').value.trim();
    if(!name){
      const inp=document.getElementById('free-take-name');
      inp.style.borderColor='#f06b6b';inp.focus();
      setTimeout(()=>{inp.style.borderColor='';},1600);return;
    }
    closeModal();onConfirm(name);
  };
  btnsEl.appendChild(cancelBtn);btnsEl.appendChild(okBtn);
  document.getElementById('modal-overlay').classList.add('show');
  setTimeout(()=>{const inp=document.getElementById('free-take-name');if(inp)inp.focus();},120);
}

function shopFreeTake(id){
  initShop();
  const product=SHOP_PRODUCTS.find(p=>p.id===id);
  if(!product)return;
  showNameModal(product.name,(name)=>{
    D.shop.freeTakes[id]=(D.shop.freeTakes[id]||0)+1;
    if(!D.shop.log)D.shop.log=[];
    D.shop.log.push({id,name:product.name,price:product.price,free:true,takenBy:name,ts:Date.now(),date:nowFull()});
    saveState();
    renderShopItems();renderShopLog();renderHomeFridgeMini();
  });
}

function renderShopSummary(){
  initShop();
  const totalRevenue=SHOP_PRODUCTS.reduce((s,p)=>s+(D.shop.sold[p.id]||0)*p.price,0);
  const yesterdayMoney=getFridgeYesterdayMoney();
  const combinedRevenue=yesterdayMoney+totalRevenue;
  const totalFree=SHOP_PRODUCTS.reduce((s,p)=>s+(D.shop.freeTakes[p.id]||0),0);

  const targets=[
    {summaryEl:document.getElementById('shop-summary-rows'),labelEl:document.querySelector('#shop-summary .est-home-label')},
    {summaryEl:document.getElementById('home-shop-summary-rows'),labelEl:document.getElementById('home-shop-summary-label')},
  ];

  if(totalRevenue===0&&totalFree===0&&yesterdayMoney===0){
    targets.forEach(({summaryEl,labelEl})=>{
      if(labelEl)labelEl.textContent='No sales recorded yet';
      if(summaryEl)summaryEl.innerHTML='';
    });
    return;
  }

  const {cashPart,coinPart}=getFridgeCashConversion();
  let html='';
  SHOP_PRODUCTS.forEach(p=>{
    const sold=D.shop.sold[p.id]||0;
    const free=D.shop.freeTakes[p.id]||0;
    if(sold===0&&free===0)return;
    const rev=sold*p.price;
    const pCash=Math.floor(rev/50)*50;
    const pCoin=rev-pCash;
    let breakdown='';
    if(rev===0){breakdown='Free only';}
    else if(pCash>0&&pCoin>0) breakdown=`Cash: ${pCash.toLocaleString('no-NO')} kr + Coin: ${pCoin.toLocaleString('no-NO')} kr`;
    else if(pCash>0) breakdown=`Cash: ${pCash.toLocaleString('no-NO')} kr`;
    else breakdown=`Coin: ${pCoin.toLocaleString('no-NO')} kr`;
    const start=D.shop.starts[p.id]||0;
    const end=start-sold-free;
    const endColor=end<0?'var(--red)':'var(--muted)';
    const freeNames=(D.shop.log||[]).filter(l=>l.id===p.id&&l.free).map(l=>l.takenBy).filter(Boolean);
    const freeNamesStr=freeNames.length>0?` <span style="color:var(--accent)">(${freeNames.join(', ')})</span>`:'';
    html+=`<div style="padding:7px 0;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:8px">
      <div>
        <div style="font-size:.82rem;color:var(--sub)">${p.icon} ${p.name}</div>
        <div style="font-size:.68rem;margin-top:2px;color:var(--muted)">Sold: <b style="color:var(--text)">${sold}</b>${free>0?` + <b style="color:var(--accent)">${free} free</b>${freeNamesStr}`:''} &nbsp;·&nbsp; End: <b style="color:${endColor}">${end}</b></div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-family:'JetBrains Mono',monospace;font-weight:600;font-size:.84rem;color:var(--text)">${rev.toLocaleString('no-NO')} kr</div>
        <div style="font-size:.67rem;color:var(--sub);margin-top:1px">${breakdown}</div>
      </div>
    </div>`;
  });
  html+=`<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border2)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
      <span style="font-size:.72rem;color:var(--sub)">Today's sales</span>
      <span style="font-family:'JetBrains Mono',monospace;font-size:.78rem;color:var(--text)">${totalRevenue.toLocaleString('no-NO')} kr</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px">
      <span style="font-size:.72rem;color:var(--sub)">Money from yesterday</span>
      <span style="font-family:'JetBrains Mono',monospace;font-size:.78rem;color:var(--text)">${yesterdayMoney.toLocaleString('no-NO')} kr</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding-top:8px;border-top:1px solid var(--border2)">
      <span style="font-size:.78rem;font-weight:700;color:var(--green)">Fridge total</span>
      <span style="font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--green)">${totalRevenue.toLocaleString('no-NO')} + ${yesterdayMoney.toLocaleString('no-NO')} → ${combinedRevenue.toLocaleString('no-NO')} kr</span>
    </div>
  </div>`;
  if(totalFree>0){
    html+=`<div style="margin-top:4px;display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:.72rem;color:var(--accent)">Free takes (no revenue)</span>
      <span style="font-family:'JetBrains Mono',monospace;font-weight:600;font-size:.78rem;color:var(--accent)">${totalFree} pcs</span>
    </div>`;
  }
  // Show cash/coin breakdown of fridge revenue
  const parts=[];
  if(cashPart>0) parts.push(`💵 ${cashPart.toLocaleString('no-NO')} kr cash`);
  if(coinPart>0) parts.push(`💰 ${coinPart.toLocaleString('no-NO')} kr coin`);
  if(parts.length>0){
    html+=`<div style="margin-top:6px;font-size:.72rem;color:var(--sub);text-align:right">${parts.join(' + ')}</div>`;
  }

  targets.forEach(({summaryEl,labelEl})=>{
    if(labelEl)labelEl.textContent='Today + yesterday';
    if(summaryEl)summaryEl.innerHTML=html;
  });
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
    if(entry.free){
      // Show product icon instead of gift, and "Free" label instead of amount
      d.innerHTML=`<div class="log-ico" style="background:var(--accent-dim)">${p.icon}</div>
        <div class="log-body"><div class="log-title">${entry.name} <span style="font-size:.6rem;font-weight:700;padding:2px 7px;border-radius:999px;background:var(--accent-dim);color:var(--accent);border:1px solid var(--accent-mid);margin-left:4px;vertical-align:middle">FREE</span></div><div class="log-meta">Taken by <b style="color:var(--text)">${entry.takenBy||'—'}</b> · ${entry.date}</div></div>
        <div class="log-right"><div class="log-amt" style="color:var(--accent)">Free</div></div>`;
    } else {
      d.innerHTML=`<div class="log-ico" style="background:var(--green-dim)">${p.icon}</div>
        <div class="log-body"><div class="log-title">${entry.name}</div><div class="log-meta">${entry.date}</div></div>
        <div class="log-right"><div class="log-amt" style="color:var(--green)">+${entry.price} kr</div></div>`;
    }
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
    {id:'op5',text:'Make sure top tavle is on'},
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
    
    {id:'cl6',text:'Clean bathroom',time:'22:15'},
    {id:'cl4',text:'Pickup trash',time:'22:35'},
    {id:'cl3',text:'Refill sugar/cream and get coffee ready for tomorrow',time:'23:00'},
    {id:'cl_kasse',text:'Clean kasse',time:'23:00'},
    {id:'cl2',text:'Wash last cups',time:'23:15'},
    {id:'cl7',text:'Do Counter entry — do not forget to print/delete and finalize',time:'23:20'},
    {id:'cl8',text:'Do drinks and snacks calculation and insert in file',time:'23:30'},
    {id:'cl1',text:'Clean smoke area (After customers are gone)'},
    {id:'cl5',text:'Sweep floor last time if dirty'},
    {id:'cl13',text:'Turn off AC'},
    {id:'cl9',text:'Turn off Touchsell'},
    {id:'cl14',text:'Turn off Counting Machine'},
    {id:'cl10',text:'Turn off fridge light'},
    {id:'cl11',text:'Make sure all screens are off'},
    {id:'cl12',text:'Make sure all machines are off'},
  ]
};

function getChecklistItems(group){
  const items=[...(CHECKLIST[group]||[])];
  const now=new Date();
  const y=now.getFullYear();
  const m=String(now.getMonth()+1).padStart(2,'0');
  const d=String(now.getDate()).padStart(2,'0');
  const dateKey=`${y}-${m}-${d}`;
  const reminderText='⚠️ IMPORTANT: Print and delete on Betbooks and GWT machine';
  const lastDay=new Date(y,now.getMonth()+1,0).getDate();

  // Monday: important reminder is the very first opening item.
  if(group==='opening'&&now.getDay()===1){
    items.unshift({
      id:`important_monday_${dateKey}`,
      text:reminderText,
      important:true
    });
  }

  // Last calendar day of the month: important reminder is the very last closing item.
  if(group==='closing'&&now.getDate()===lastDay){
    items.push({
      id:`important_monthend_${dateKey}`,
      text:reminderText,
      important:true
    });
  }

  return items;
}

function loadChecklistState(){return JSON.parse(localStorage.getItem('ccc_checklist')||'{}');}
function saveChecklistState(state){localStorage.setItem('ccc_checklist',JSON.stringify(state));}

function renderChecklist(){
  const state=loadChecklistState();
  const groups={opening:'cl-opening',day:'cl-day',closing:'cl-closing'};
  const counts={opening:'cl-opening-count',day:'cl-day-count',closing:'cl-closing-count'};
  Object.keys(CHECKLIST).forEach(group=>{
    const items=getChecklistItems(group);
    const el=document.getElementById(groups[group]);
    if(!el)return;
    el.innerHTML='';
    let done=0;
    if(group==='day'){
      items.forEach(item=>{
        const div=document.createElement('div');
        div.className='cl-item';div.style.cursor='default';
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
      div.className='cl-item'+(item.important?' important':'')+(checked?' done':'');
      div.innerHTML=`
        <input type="checkbox" ${checked?'checked':''} onchange="toggleCheck('${item.id}',this.checked)">
        <span class="cl-item-text">${item.text}</span>
        ${item.time?`<span class="cl-item-time">${item.time}</span>`:''}`;
      el.appendChild(div);
    });
    const countEl=document.getElementById(counts[group]);
    if(countEl)countEl.textContent=`${done}/${items.length}`;
  });
}

function toggleCheck(id,checked){
  haptic('light');
  const state=loadChecklistState();
  state[id]=checked;saveChecklistState(state);
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
    const items=getChecklistItems(group);
    const done=items.filter(i=>state[i.id]).length;
    const el=document.getElementById(countId);
    if(el)el.textContent=`${done}/${items.length}`;
  });
}

// Kept as a compatibility no-op for older cached HTML/app versions.
// Important Betbooks/GWT reminders now live directly in the checklist.
function checkBetbooksAlert(){}

// ── COFFEE TIMER ──
let _coffeeInterval=null;
let _coffeeEnd=null;

function loadCoffeeTimer(){
  const saved=localStorage.getItem('ccc_coffee');
  if(saved){
    const data=JSON.parse(saved);
    if(data.end&&Date.now()<data.end){_coffeeEnd=data.end;startCoffeeInterval();}
    else localStorage.removeItem('ccc_coffee');
  }
  updateCoffeeDisplay();
}

function coffeeTimerToggle(){
  if(_coffeeInterval){
    clearInterval(_coffeeInterval);_coffeeInterval=null;_coffeeEnd=null;
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
      clearInterval(_coffeeInterval);_coffeeInterval=null;_coffeeEnd=null;
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
    el.textContent='2:00:00';el.style.color='var(--accent)';
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
  _coffeeEnd=null;localStorage.removeItem('ccc_coffee');
  document.getElementById('coffee-start-btn').textContent='Start Timer';
  document.getElementById('coffee-timer-status').textContent='Ready to start';
  document.getElementById('coffee-timer-display').style.color='var(--accent)';
  updateCoffeeDisplay();
}

// ── WINNER EMAIL ──

// While winner fields remain filled, opening mail again updates the same saved winner
// instead of creating duplicates. Clear Fields starts a fresh winner entry.
let _activeWinnerIndex=null;

function clearWinnerFields(){
  _activeWinnerIndex=null;
  ['w-amount','w-machine-nr','w-machine-id','w-machine-name','w-game-name'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const shop=document.getElementById('w-shop');if(shop)shop.value='';
  const dateEl=document.getElementById('w-date');if(dateEl)dateEl.value=nowDate();
}

function buildWinnerMailData(){
  const amount=document.getElementById('w-amount').value.trim();
  const machineNr=document.getElementById('w-machine-nr').value.trim();
  const machineId=document.getElementById('w-machine-id').value.trim();
  const machineName=document.getElementById('w-machine-name').value.trim();
  const gameName=document.getElementById('w-game-name').value.trim();
  const shop=document.getElementById('w-shop').value.trim();
  const date=document.getElementById('w-date').value.trim()||nowDate();
  if(!amount){flash('w-amount');return null;}if(!date){flash('w-date');return null;}if(!machineNr){flash('w-machine-nr');return null;}if(!machineId){flash('w-machine-id');return null;}if(!machineName){flash('w-machine-name');return null;}if(!gameName){flash('w-game-name');return null;}if(!shop){flash('w-shop');return null;}
  const st=ensureSettings();const fullName=(st.fullName||'').trim();
  const lang=st.mailLanguage==='en'?'en':'da';
  const subject=lang==='en'?`We have a win of ${amount} kr - ${shop}`:`Vi har en gevinst på ${amount} kr - ${shop}`;
  const body=lang==='en'
    ?`Dear Casino,

We have a win of ${amount} kr today.

Shop: ${shop}
Amount: ${amount} kr
Date: ${date}
Machine number: ${machineNr}
Machine ID: ${machineId}
Machine name: ${machineName}
Game name: ${gameName}

Kind regards
${fullName}`
    :`Kære Casino,

Vi har en gevinst på ${amount} kr i dag.

Butik: ${shop}
Beløb: ${amount} kr
Dato: ${date}
Maskin nummer: ${machineNr}
Maskin ID: ${machineId}
Maskin navn: ${machineName}
Spil navn: ${gameName}

Med venlig hilsen
${fullName}`;
  return{amount,date,machineNr,machineId,machineName,gameName,shop,subject,body};
}
function openWinnerMail(app,data){
  const to='kundeservice@casinohouse.dk';
  const subject=encodeURIComponent(data.subject),body=encodeURIComponent(data.body),recipient=encodeURIComponent(to);
  if(app==='gmail'){
    const ua=navigator.userAgent||'';
    if(/android/i.test(ua)){
      // Open the installed Gmail Android app directly. If Gmail is not installed, Android may show that no app can handle it.
      window.location.href=`intent://co?to=${recipient}&subject=${subject}&body=${body}#Intent;scheme=googlegmail;package=com.google.android.gm;end`;
    } else if(/iphone|ipad|ipod/i.test(ua)){
      // Gmail's iOS URL scheme opens the installed Gmail app directly.
      window.location.href=`googlegmail:///co?to=${recipient}&subject=${subject}&body=${body}`;
    } else {
      // Desktop has no Gmail app URL scheme, so use Gmail on the web there.
      window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${recipient}&su=${subject}&body=${body}`,'_blank','noopener');
    }
  }
  else if(app==='outlook'){
    const ua=navigator.userAgent||'';
    if(/android/i.test(ua)||/iphone|ipad|ipod/i.test(ua)){
      // Open the installed Microsoft Outlook app directly on mobile.
      window.location.href=`ms-outlook://compose?to=${recipient}&subject=${subject}&body=${body}`;
    } else {
      // Desktop fallback uses Outlook on the web.
      window.open(`https://outlook.live.com/mail/0/deeplink/compose?to=${recipient}&subject=${subject}&body=${body}`,'_blank','noopener');
    }
  }
  else window.location.href=`mailto:${recipient}?subject=${subject}&body=${body}`;
}
function commitWinnerAndOpen(app,data){
  if(!D.winners)D.winners=[];
  const winner={amount:data.amount,date:data.date,machineNr:data.machineNr,machineId:data.machineId,machineName:data.machineName,gameName:data.gameName,shop:data.shop};
  if(_activeWinnerIndex!=null&&D.winners[_activeWinnerIndex]){
    D.winners[_activeWinnerIndex]=winner;
  } else {
    D.winners.push(winner);
    _activeWinnerIndex=D.winners.length-1;
  }
  saveState();renderWinnerLog();openWinnerMail(app,data);
  // Intentionally keep all fields filled so the user can return, correct them,
  // and open the mail app again. Use Clear Fields to start a new winner.
}
function sendWinnerEmail(){
  const data=buildWinnerMailData();if(!data)return;
  showModal({icon:'✉️',title:'Choose mail app',msg:'Which mail app do you want to open?',buttons:[
    {label:'Default mail app',style:'modal-btn-primary',action:()=>commitWinnerAndOpen('default',data)},
    {label:'Gmail app',style:'modal-btn-ghost',action:()=>commitWinnerAndOpen('gmail',data)},
    {label:'Outlook',style:'modal-btn-ghost',action:()=>commitWinnerAndOpen('outlook',data)},
    {label:'Cancel',style:'modal-btn-ghost'}
  ]});
}

