/* VAYRHEX — dependency-free browser prototype. No server, analytics or network calls. */
(() => {
'use strict';
const W = 960, H = 540, TAU = Math.PI * 2;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });
const $ = id => document.getElementById(id);
const palette = {cyan:'#62eaff', violet:'#b095ff', gold:'#ffd18b', red:'#ff7887', bg:'#080f1e'};
const TOWERS = {
  pulse: {name:'ИМПУЛЬС',icon:'✧',cost:60,range:177,dmg:19,rate:1.35,bullet:400,color:'#60e9fd',desc:'Универсальная башня'},
  ember: {name:'ПЛАМЯ',icon:'♨',cost:75,range:153,dmg:13,rate:1.65,bullet:330,color:'#ffad72',desc:'Ожог врагов'},
  frost: {name:'КРИО',icon:'❄',cost:70,range:166,dmg:12,rate:1.05,bullet:340,color:'#9ca5ff',desc:'Замедление'},
  arc: {name:'ДУГА',icon:'ϟ',cost:105,range:158,dmg:22,rate:0.85,bullet:460,color:'#caa5ff',desc:'Цепные разряды',unlockCost:75},
  rail: {name:'РЕЛЬС',icon:'◇',cost:135,range:220,dmg:64,rate:0.50,bullet:650,color:'#ffdb8b',desc:'Пробивает цели',unlockCost:150}
};
// Limited additive wave bonuses; repeating a combat module never multiplies power.
const MODULES=[
{id:'force',icon:'⚡',title:'Настройка мощности',text:'+6% к урону башен',max:4,apply:s=>s.mods.damage+=.06},
{id:'rate',icon:'◈',title:'Фазовый привод',text:'+5% к скорострельности',max:4,apply:s=>s.mods.rate+=.05},
{id:'range',icon:'◎',title:'Сенсорный массив',text:'+4% к дальности',max:3,apply:s=>s.mods.range+=.04},
{id:'cash',icon:'✦',title:'Логистика',text:'+35 кредитов сейчас',apply:s=>s.money+=35},
{id:'repair',icon:'✚',title:'Ремонтный импульс',text:'Восстановить 16 HP ядра',apply:s=>s.hp=Math.min(s.maxHp,s.hp+16)},
{id:'chain',icon:'⌁',title:'Контактный резонанс',text:'Импульс: +1 цель цепного разряда',max:1,apply:s=>s.mods.chain+=1},
{id:'burn',icon:'♨',title:'Стабилизация плазмы',text:'+15% к урону горения',max:3,apply:s=>s.mods.burn+=.15},
{id:'bounty',icon:'◇',title:'Сбор сплавов',text:'+7% кредитов за противника',max:4,apply:s=>s.mods.bounty+=.07}
];
const pads = [[184,147],[296,267],[395,120],[405,412],[512,270],[604,142],[612,403],[714,203],[738,356],[225,414]];
const paths = [
 [[-30,123],[112,123],[235,188],[355,183],[475,230],[634,231],[842,270]],
 [[-30,273],[145,273],[310,327],[434,292],[589,299],[710,270],[842,270]],
 [[-30,428],[121,428],[276,377],[397,350],[541,360],[683,311],[842,270]]
];
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function lenLine(a,b){return Math.hypot(b[0]-a[0],b[1]-a[1])}
const segments=paths.map(path=>{let l=0;return path.slice(1).map((p,i)=>{const d=lenLine(path[i],p); const seg={a:path[i],b:p,start:l,len:d};l+=d;return seg}).map(seg=>({...seg,total:l}));});
const lengths=segments.map(segs=>segs.reduce((n,sg)=>n+sg.len,0));
function getPoint(lane,t){const segs=segments[lane], d=Math.max(0,Math.min(1,t))*lengths[lane];let sg=segs[segs.length-1];for(const x of segs){if(d<x.start+x.len){sg=x;break;}}let r=Math.max(0,Math.min(1,(d-sg.start)/sg.len));return {x:sg.a[0]+(sg.b[0]-sg.a[0])*r,y:sg.a[1]+(sg.b[1]-sg.a[1])*r};}
function rr(x,y,w,h,r=6){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function rng(a,b){return Math.random()*(b-a)+a}
const stars=Array.from({length:95},(_,i)=>({x:(i*193+53)%W,y:(i*127+79)%H,r:.4+(i%4)*.3,tw:i/12}));
const particles=[];
let state, selectedPad=-1, pendingType=null, last=performance.now(), elapsed=0, toastTimeout=0, audioCtx=null, muted=false;
let musicBus=null, musicStarted=false, nextMusicNote=0, musicStep=0;
const SETTINGS_KEY='vayrhex-settings-v1';
// The preview provider is for UX testing only, with no actual ad impressions or revenue.
const isDemoHost=['localhost','127.0.0.1'].includes(location.hostname)||location.hostname.endsWith('.pages.dev');
const rewardProvider={
 mode:isDemoHost?'demo':'disabled',
 showRewarded({onOpen,onRewarded,onClose,onError}){
  if(!isDemoHost){onError?.(new Error('SDK не подключён'));return;}
  onOpen?.();
  setTimeout(()=>{onRewarded?.();onClose?.(true)},650);
 }
};

const DEFAULT_SETTINGS=Object.freeze({musicVolume:25,shotsVolume:45,shotLimit:30,shotOpacity:70});
function safeInt(v,fallback,min,max){const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.round(n))):fallback;}
function loadSettings(){try{const s=JSON.parse(localStorage.getItem(SETTINGS_KEY))||{};return {musicVolume:safeInt(s.musicVolume,25,0,100),shotsVolume:safeInt(s.shotsVolume,45,0,100),shotLimit:safeInt(s.shotLimit,30,0,120),shotOpacity:safeInt(s.shotOpacity,70,0,100)};}catch{return {...DEFAULT_SETTINGS};}}
let settings=loadSettings();
function saveSettings(){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings))}catch{}}
const RESEARCH=[
 {id:'plating',branch:'core',name:'Броня ядра',symbol:'⬡',desc:'+15 HP ядра за уровень',max:3,cost:[20,35,55]},
 {id:'repair',branch:'core',name:'Саморемонт',symbol:'+',desc:'+4 HP после каждой волны за уровень',max:2,cost:[45,75],requires:'plating'},
 {id:'reserve',branch:'core',name:'Резервный контур',symbol:'◈',desc:'+25 HP ядра за уровень',max:2,cost:[90,140],requires:'repair'},
 {id:'damage',branch:'weapons',name:'Мощность',symbol:'✦',desc:'+7% урона башен за уровень',max:3,cost:[20,35,55]},
 {id:'rate',branch:'weapons',name:'Приводы',symbol:'≫',desc:'+6% скорострельности за уровень',max:2,cost:[45,75],requires:'damage'},
 {id:'range',branch:'weapons',name:'Сенсоры',symbol:'◎',desc:'+5% дальности за уровень',max:2,cost:[90,140],requires:'rate'},
 {id:'capital',branch:'economy',name:'Резервы',symbol:'◆',desc:'+15 стартовых кредитов за уровень',max:3,cost:[20,35,55]},
 {id:'salvage',branch:'economy',name:'Утилизация',symbol:'↗',desc:'+6% кредитов за противника за уровень',max:2,cost:[45,75],requires:'capital'},
 {id:'extract',branch:'economy',name:'Экстракция',symbol:'◇',desc:'+10% осколков после забега за уровень',max:2,cost:[90,140],requires:'salvage'}
];
// Permanent research is data-driven: new towers only need a TOWERS entry and optional specialization.
const SPECIALIZATIONS = {
 pulse:{name:'Проводимость',description:'Цепь получает +1 цель за уровень'},
 ember:{name:'Катализатор',description:'Дольше горение и сильнее его урон'},
 frost:{name:'Кристаллизация',description:'Более долгий и сильный эффект замедления'},
 arc:{name:'Многоконтактный разряд',description:'Дополнительная цель для электрической цепи'},
 rail:{name:'Сквозной канал',description:'Дополнительная пробиваемая цель'}
};
const TOWER_RESEARCH = Object.fromEntries(Object.keys(TOWERS).map(key=>[key,[
 {id:'power',branch:'combat',name:'Калибровка урона',symbol:'+',desc:'+4% урона за уровень',max:5,cost:[14,24,38,55,78]},
 {id:'rate',branch:'combat',name:'Система подачи',symbol:'≫',desc:'+3% скорострельности за уровень',max:4,cost:[20,33,50,73],requires:{id:'power',level:1}},
 {id:'range',branch:'combat',name:'Наведение',symbol:'◎',desc:'+4% радиуса за уровень',max:4,cost:[24,38,60,88],requires:{id:'rate',level:1}},
 {id:'economy',branch:'systems',name:'Экономия сплавов',symbol:'◆',desc:'−4% цены строительства за уровень',max:3,cost:[24,38,58],requires:{id:'power',level:2}},
 {id:'special',branch:'systems',name:SPECIALIZATIONS[key].name,symbol:'⌁',desc:SPECIALIZATIONS[key].description,max:3,cost:[40,65,100],requires:{id:'range',level:1}},
 {id:'mastery',branch:'systems',name:'Серийный прототип',symbol:'✳',desc:'+8% урона и +1% скорости выстрела',max:1,cost:[165],requires:{id:'special',level:2}}
]]));
let activeResearchTab='general';
const researchLevel=id=>safeInt(meta.research?.[id],0,0,10);
const towerLevel=(key,id)=>researchLevel(`tower.${key}.${id}`);
const towerUnlocked=key=>!TOWERS[key]?.unlockCost || meta.unlockedTowers?.includes(key);
function towerStats(key,level=1){const ty=TOWERS[key];return {
 damage:ty.dmg*(1+(level-1)*.52)*state.mods.damage*(1+.04*towerLevel(key,'power'))*(towerLevel(key,'mastery')?1.08:1),
 rate:ty.rate*state.mods.rate*(1+.03*towerLevel(key,'rate'))*(towerLevel(key,'mastery')?1.01:1),
 range:ty.range*state.mods.range*(1+.04*towerLevel(key,'range')),
 price:Math.max(10,Math.round(ty.cost*(1-.04*towerLevel(key,'economy')))),
 special:towerLevel(key,'special')
};}


const saved=()=>{try{return JSON.parse(localStorage.getItem('corebound-save-v1'))||{shards:0,coreLevel:0}}catch{return {shards:0,coreLevel:0}}};
let meta=saved();
meta.shards=Math.max(0,Number(meta.shards)||0);meta.coreLevel=Math.min(15,Math.max(0,Number(meta.coreLevel)||0));
meta.research=meta.research&&typeof meta.research==='object'&&!Array.isArray(meta.research)?meta.research:{};
meta.unlockedTowers=Array.isArray(meta.unlockedTowers)?meta.unlockedTowers.filter(key=>TOWERS[key]?.unlockCost):[];
meta.claimedRewardRuns=Array.isArray(meta.claimedRewardRuns)?meta.claimedRewardRuns.filter(x=>typeof x==='string').slice(-80):[];
function persist(){try{localStorage.setItem('corebound-save-v1',JSON.stringify(meta))}catch{}}
function newState(){const maxHp=100+meta.coreLevel*12+researchLevel('plating')*15+researchLevel('reserve')*25;
return {runId:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),rewardedClaimed:false,rewardedPending:false,rewardBase:0,rewardBonus:0,phase:'menu',wave:0,hp:maxHp,maxHp,money:135+Math.min(meta.coreLevel,5)*8+researchLevel('capital')*15,kills:0,frames:0,waveTime:0,spawnIndex:0,spawnTotal:0,spawnGap:1.0,spawnTimer:0,selectedModule:[],enemies:[],towers:[],bullets:[],fx:[],mods:{damage:1+researchLevel('damage')*.07,range:1+researchLevel('range')*.05,rate:1+researchLevel('rate')*.06,chain:0,burn:1,bounty:1+researchLevel('salvage')*.06},speed:1};}

function init(){state=newState();selectedPad=-1;pendingType=null;updateMeta();updateUI();updateControls();syncSettingsControls();}
function updateMeta(){$('shardCount').textContent=`${meta.shards} осколков`;const el=$('researchShards');if(el)el.textContent=meta.shards;}
function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.classList.remove('show'),1700)}
function prepareAudio(){try{if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();if(!musicBus){musicBus=audioCtx.createGain();musicBus.connect(audioCtx.destination);musicBus.gain.value=0;}if(!musicStarted){musicStarted=true;nextMusicNote=audioCtx.currentTime+.12;}applyMusicVolume();}catch{}}
function applyMusicVolume(){if(musicBus&&audioCtx)musicBus.gain.setTargetAtTime(muted||document.hidden?0:settings.musicVolume/100*.15,audioCtx.currentTime,.1);}
// Original minimal 8-step ambient sequence synthesized locally; no external audio assets.
function scheduleMusic(){if(!audioCtx||!musicBus||audioCtx.state!=='running'||!musicStarted)return;if(nextMusicNote<audioCtx.currentTime-.4)nextMusicNote=audioCtx.currentTime+.04;
const notes=[110,164.81,146.83,220,98,146.83,130.81,196];let steps=0;
while(nextMusicNote<audioCtx.currentTime+.2&&steps++<4){if(!document.hidden&&settings.musicVolume>0&&!muted&&state.phase!=='dead'&&state.phase!=='menu'){
const o=audioCtx.createOscillator(),g=audioCtx.createGain(),when=Math.max(nextMusicNote,audioCtx.currentTime+.002);
o.type='triangle';o.frequency.setValueAtTime(notes[musicStep%notes.length],when);g.gain.setValueAtTime(.0001,when);g.gain.exponentialRampToValueAtTime(.19,when+.07);g.gain.exponentialRampToValueAtTime(.0001,when+.67);o.connect(g).connect(musicBus);o.start(when);o.stop(when+.7);
}nextMusicNote+=.86;musicStep++;}}
function sound(freq=430,dur=.06,type='sine',vol=.035,kind='effects'){if(muted||settings.shotsVolume===0)return;try{if(!audioCtx)prepareAudio();const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,audioCtx.currentTime);gain.gain.setValueAtTime(Math.max(.0001,vol*settings.shotsVolume/100),audioCtx.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+dur);osc.connect(gain).connect(audioCtx.destination);osc.start();osc.stop(audioCtx.currentTime+dur)}catch{}}
function syncSettingsControls(){for(const key of ['musicVolume','shotsVolume','shotLimit','shotOpacity']){const input=$(key),label=$(key+'Text');if(!input||!label)continue;input.value=settings[key];label.textContent=String(settings[key])+(key==='shotLimit'?'':'%');}}
function updateSetting(key,value){const bounds={musicVolume:[0,100],shotsVolume:[0,100],shotLimit:[0,120],shotOpacity:[0,100]};settings[key]=safeInt(value,DEFAULT_SETTINGS[key],...bounds[key]);syncSettingsControls();saveSettings();if(key==='musicVolume'){prepareAudio();applyMusicVolume();}}
function openPanel(id){showModal('startModal',false);showModal(id,true);if(id==='researchModal')window.VayrhexAtlas.open({RESEARCH,TOWER_RESEARCH,TOWERS,meta,persist,updateMeta,updateControls,researchLevel,towerLevel,towerUnlocked,sound});}
function closePanel(id){showModal(id,false);showModal('startModal',true);updateMeta();}
function currentResearch(){return activeResearchTab==='general'?RESEARCH:(TOWER_RESEARCH[activeResearchTab]||[]);}
function researchRequirements(node){if(!node.requires)return true;const dep=typeof node.requires==='string'?{id:node.requires,level:1}:node.requires;
 const key=activeResearchTab==='general'?dep.id:`tower.${activeResearchTab}.${dep.id}`;return researchLevel(key)>=dep.level;}
function nodeLevel(node){return activeResearchTab==='general'?researchLevel(node.id):towerLevel(activeResearchTab,node.id);}
function renderResearch(){
 const body=$('researchBody'), oldScroll=body.scrollTop, nav=$('researchNavigation'), oldNavScroll=nav.scrollLeft;
 nav.replaceChildren();
 const options=[['general','Общее','⬡'],...Object.entries(TOWERS).map(([key,ty])=>[key,ty.name,ty.icon])];
 for(const [key,title,symbol] of options){
  const item=document.createElement('button');item.type='button';
  const isLocked=key!=='general'&&!towerUnlocked(key);
  item.className='research-tab'+(key===activeResearchTab?' is-current':'')+(isLocked?' is-unavailable':'');
  item.setAttribute('role','tab');item.setAttribute('aria-selected',String(key===activeResearchTab));item.dataset.tab=key;
  const count=key==='general'?RESEARCH.reduce((n,x)=>n+researchLevel(x.id),0):TOWER_RESEARCH[key].reduce((n,x)=>n+towerLevel(key,x.id),0);
  item.innerHTML=`<span class="tab-symbol">${symbol}</span><span class="tab-copy"><b>${title}</b><small>${isLocked?'Не открыта':count+' ур.'}</small></span>${isLocked?'<span class="tab-lock" aria-hidden="true">⌑</span>':''}`;
  item.addEventListener('click',()=>{activeResearchTab=key;renderResearch();body.scrollTop=0;item.focus({preventScroll:true});});nav.appendChild(item);
 }
 nav.scrollLeft=oldNavScroll;
 const selectedNav=nav.querySelector('.is-current');if(selectedNav){
  const left=selectedNav.offsetLeft,right=left+selectedNav.offsetWidth;
  if(left<nav.scrollLeft)nav.scrollLeft=left;
  else if(right>nav.scrollLeft+nav.clientWidth)nav.scrollLeft=right-nav.clientWidth;
 }
 const container=$('researchTree');container.replaceChildren();
 const isGeneral=activeResearchTab==='general';
 container.className='research-tree'+(!isGeneral?' tower-research-tree':'');
 updateMeta();
 const nodes=currentResearch(), levels=nodes.reduce((n,x)=>n+nodeLevel(x),0),maxLevels=nodes.reduce((n,x)=>n+x.max,0);
 const progress=Math.round(levels/Math.max(1,maxLevels)*100);
 if(!isGeneral&&!towerUnlocked(activeResearchTab)){
  const ty=TOWERS[activeResearchTab],el=document.createElement('section');el.className='research-unlock';
  el.style.setProperty('--tower-color',ty.color);
  el.innerHTML=`<div class="unlock-icon" aria-hidden="true">${ty.icon}</div><div class="unlock-description"><small>НЕИЗВЕСТНАЯ ТЕХНОЛОГИЯ / НОВАЯ БАШНЯ</small><h3>${ty.name}</h3><p>${ty.desc}. Разблокируй тип башни, чтобы строить её во время забега и исследовать собственную ветку модулей.</p><span class="unlock-index">06 исследований · постоянные улучшения</span></div>`;
  const unlock=document.createElement('button');unlock.className='research-unlock-button';unlock.disabled=meta.shards<ty.unlockCost;
  unlock.innerHTML=meta.shards<ty.unlockCost?`<span>Нужно ещё ${ty.unlockCost-meta.shards} ◆</span><strong>${ty.unlockCost} ◆</strong>`:`<span>Открыть башню</span><strong>${ty.unlockCost} ◆</strong>`;
  unlock.addEventListener('click',()=>{if(towerUnlocked(activeResearchTab)||meta.shards<ty.unlockCost)return;meta.shards-=ty.unlockCost;meta.unlockedTowers.push(activeResearchTab);persist();sound(700,.15,'triangle');renderResearch();updateControls();});
  el.append(unlock);container.append(el);
 } else {
  const overview=document.createElement('div');overview.className='research-overview';
  const accent=isGeneral?'#c5e887':TOWERS[activeResearchTab].color;
  overview.style.setProperty('--tower-color',accent);
  const name=isGeneral?'Система обороны':TOWERS[activeResearchTab].name;
  const symbol=isGeneral?'⬡':TOWERS[activeResearchTab].icon;
  const detail=isGeneral?'Развивай инфраструктуру, вооружение и экономику. Эти исследования влияют на все будущие забеги.':TOWERS[activeResearchTab].desc+'. Улучшения применяются ко всем построенным башням данного типа.';
  overview.innerHTML=`<div class="overview-symbol" aria-hidden="true"><span>${symbol}</span></div><div class="overview-description"><span class="overview-eyebrow">${isGeneral?'ОБЩАЯ МОДЕРНИЗАЦИЯ':'ОБОРУДОВАНИЕ / БАШНЯ'}</span><h3>${name}</h3><p>${detail}</p></div><div class="overview-meter"><span>ИССЛЕДОВАНО</span><strong>${progress}<small>%</small></strong><div class="meter-track"><i style="width:${progress}%"></i></div><small>${levels} / ${maxLevels} уровней</small></div>`;
  container.append(overview);
  const branches=isGeneral?[['core','Ядро'],['weapons','Оружие'],['economy','Экономика']]:[['combat','Баллистика'],['systems','Оснастка']];
  let branchIndex=0;
  for(const [branch,label] of branches){
   const items=nodes.filter(n=>n.branch===branch),col=document.createElement('section');col.className='research-branch';
   const title=document.createElement('div');title.className='branch-header';
   const earned=items.reduce((n,x)=>n+nodeLevel(x),0),total=items.reduce((n,x)=>n+x.max,0);
   title.innerHTML=`<span class="branch-index">${String(++branchIndex).padStart(2,'0')}</span><div class="branch-heading"><small>ВЕТКА ИССЛЕДОВАНИЙ</small><strong>${label}</strong></div><span class="branch-completion">${earned}<span> / ${total}</span></span>`;
   const list=document.createElement('div');list.className='branch-nodes';col.append(title,list);
   for(const [i,node] of items.entries()){
    const level=nodeLevel(node),locked=!researchRequirements(node),maxed=level>=node.max,cost=maxed?0:node.cost[level],enough=meta.shards>=cost;
    const box=document.createElement('article');
    box.className='research-node'+(locked?' is-locked':'')+(maxed?' is-maxed':'')+(!locked&&!maxed&&enough?' is-ready':'');
    const top=document.createElement('div');top.className='research-node-top';
    top.innerHTML=`<span class="research-symbol" aria-hidden="true">${node.symbol}</span><span class="research-node-heading"><small>МОДУЛЬ ${String(i+1).padStart(2,'0')}</small><strong class="research-node-name">${node.name}</strong></span><span class="research-level">${level}<span>/${node.max}</span></span>`;
    const desc=document.createElement('div');desc.className='research-node-desc';desc.textContent=node.desc;
    const pips=document.createElement('div');pips.className='research-pips';pips.setAttribute('aria-label',`Изучено уровней: ${level} из ${node.max}`);
    for(let k=0;k<node.max;k++){const pip=document.createElement('i');if(k<level)pip.className='is-filled';pips.append(pip);}
    const action=document.createElement('div');action.className='research-action';
    const button=document.createElement('button');button.className='research-purchase';button.disabled=locked||maxed||!enough;
    if(maxed){button.innerHTML='<span>Изучено полностью</span><strong>✓</strong>';}
    else if(locked){
     const requires=typeof node.requires==='string'?{id:node.requires,level:1}:node.requires;
     const prerequisite=nodes.find(n=>n.id===requires?.id);
     button.innerHTML=`<span>Требуется: ${prerequisite?.name||'предыдущий модуль'}</span><strong>⌑</strong>`;
    }else if(!enough){button.innerHTML=`<span>Не хватает ${cost-meta.shards} осколков</span><strong>${cost} ◆</strong>`;}
    else{button.innerHTML=`<span>Исследовать</span><strong>${cost} ◆ &nbsp; ↗</strong>`;}
    button.addEventListener('click',()=>{const current=nodeLevel(node);if(current>=node.max||!researchRequirements(node)||meta.shards<node.cost[current])return;meta.shards-=node.cost[current];const id=isGeneral?node.id:`tower.${activeResearchTab}.${node.id}`;meta.research[id]=current+1;persist();sound(780,.11,'triangle');renderResearch();});
    action.append(button);box.append(top,desc,pips,action);list.append(box);
   }
   container.append(col);
  }
 }
 $('researchTotal').textContent=`${levels} / ${maxLevels} ур. · ${Object.keys(TOWERS).filter(towerUnlocked).length} из ${Object.keys(TOWERS).length} башен`;
 body.scrollTop=oldScroll;
}

let lastShopMoney=-1;
function updateUI(){
 if(lastShopMoney!==state.money&&state.phase!=='menu')updateControls();
 $('hpText').textContent=`${Math.max(0,Math.ceil(state.hp))} / ${state.maxHp}`;$('hpBar').style.width=`${Math.max(0,state.hp/state.maxHp)*100}%`;
 $('waveText').textContent=`${state.wave} / ∞`;$('moneyText').textContent=Math.floor(state.money);$('killsText').textContent=state.kills;
 $('gameStatus').textContent={menu:'Ожидание',plan:'Подготовка',combat:'Волна идёт',upgrade:'Выбор модуля',dead:'Ядро потеряно'}[state.phase];
 $('speedBtn').textContent=`▶ ${state.speed}×`;
 $('dockState').textContent={menu:'Не начато',plan:'Можно запускать',combat:'Оборона',upgrade:'Улучшение',dead:'Поражение'}[state.phase];
 const btn=$('nextWaveBtn');btn.disabled=state.phase!=='plan';btn.innerHTML=state.phase==='combat'?'Волна идёт…':`Запустить волну <span aria-hidden="true">→</span>`;
}
function showModal(id,visible){$(id).classList.toggle('hidden',!visible)}
function start(){prepareAudio();state=newState();state.phase='plan';selectedPad=-1;pendingType=null;['startModal','upgradeModal','deadModal'].forEach(id=>showModal(id,false));updateControls();updateUI();toast('Построй башни и запусти первую волну');}
function startWave(){if(state.phase!=='plan')return;state.wave+=1;state.phase='combat';state.spawnTotal=5+Math.floor(state.wave*2.8)+(state.wave%5===0?1:0);state.spawnIndex=0;state.spawnTimer=.2;state.spawnGap=Math.max(.4,1.12-state.wave*.032);state.waveTime=0;toast(`ВОЛНА ${state.wave} — ВНИМАНИЕ`);sound(320,.22,'triangle');updateUI();}
function enemyType(index){if(state.wave%5===0&&index===state.spawnTotal-1)return 'boss';if(state.wave>=3&&index%5===4)return 'tank';if(state.wave>=2&&index%4===2)return 'runner';return 'normal';}
function spawnEnemy(index){const lane=(index*7+state.wave)%3,type=enemyType(index),isBoss=type==='boss';const maxHp=(isBoss?440:type==='tank'?130:type==='runner'?44:70)*Math.pow(1.135,state.wave-1);const speed=(isBoss?31:type==='tank'?35:type==='runner'?77:54)*Math.pow(1.014,state.wave-1);const p=getPoint(lane,0);state.enemies.push({id:Math.random(),lane,type,t:0,x:p.x,y:p.y,hp:maxHp,maxHp,spd:speed,slow:0,burn:0,burnDps:0,r:isBoss?24:type==='tank'?19:type==='runner'?11:14,reward:isBoss?110:type==='tank'?22:type==='runner'?14:12,impact:isBoss?32:type==='tank'?17:10,angle:0});}
function selectPad(i){
 if(state.phase!=='plan'&&state.phase!=='combat')return;
 const existing=state.towers.find(t=>t.pad===i);
 if(pendingType&&!existing){buildTower(pendingType,i);pendingType=null;selectedPad=i;}
 else{selectedPad=i;pendingType=null;sound(600,.035)}
 updateControls();
}
function costFor(tower){return 40+25*tower.level}
function buildTower(key,pad){
 const ty=TOWERS[key];
 if(!ty||!towerUnlocked(key)){toast('Башня ещё не изучена');return false}
 const price=towerStats(key).price;
 if(state.money<price){toast('Недостаточно кредитов');return false}
 if(state.towers.some(t=>t.pad===pad)){toast('Площадка занята');return false}
 state.money-=price;
 const [x,y]=pads[pad];
 state.towers.push({pad,x,y,type:key,level:1,cool:0,rotation:0});
 burst(x,y,ty.color,18);sound(560,.12,'triangle');
 updateUI();return true;
}
function updateControls(){
 lastShopMoney=state.money;
 const root=$('buildControls');root.replaceChildren();
 const title=$('selectionTitle'),hint=$('selectionHint');
 const chosen=selectedPad<0?null:state.towers.find(t=>t.pad===selectedPad);
 function addAction(name,cost,icon,color,callback,disabled=false){
   const b=document.createElement('button');b.className='toolbtn';b.disabled=disabled;
   b.innerHTML=`<span class="icon" style="--tool-accent:${color}">${icon}</span><span class="toolcopy"><b>${name}</b><small>${cost}</small></span><span class="tool-arrow">›</span>`;
   b.addEventListener('click',callback);root.appendChild(b);
 }
 if(chosen){
   const ty=TOWERS[chosen.type];
   title.textContent=`${ty.name} · ур. ${chosen.level}`;
   const specs=towerStats(chosen.type,chosen.level);
   hint.textContent=`Урон ${Math.round(specs.damage)} · Радиус ${Math.round(specs.range)}`;
   const cost=costFor(chosen);
   addAction('Улучшить',`${cost} ◆`,'↑',ty.color,()=>{
     if(state.money<cost)return toast('Недостаточно кредитов');
     if(chosen.level>=6)return toast('Максимальный уровень');
     state.money-=cost;chosen.level++;chosen.cool=Math.min(chosen.cool,.1);burst(chosen.x,chosen.y,ty.color,18);sound(740,.15);updateControls();updateUI();
   },state.money<cost||chosen.level>=6);
   const refund=Math.round(towerStats(chosen.type).price*.55+25*(chosen.level-1));
   addAction('Продать',`+${refund} ◆`,'↶','#ed9d9d',()=>{
     state.towers=state.towers.filter(t=>t!==chosen);state.money+=refund;selectedPad=-1;
     burst(chosen.x,chosen.y,'#9ed6fa',12);updateControls();updateUI();
   });
   addAction('Закрыть','Другая позиция','×','#96a6a1',()=>{selectedPad=-1;pendingType=null;updateControls()});
   return;
 }
 if(pendingType){title.textContent=`${TOWERS[pendingType].name} выбрана`;hint.textContent='Коснись свободного узла, чтобы поставить башню';}
 else if(selectedPad>=0){title.textContent=`Узел ${String(selectedPad+1).padStart(2,'0')} · свободен`;hint.textContent='Выбери башню — она появится на этом узле';}
 else{title.textContent='Выбери башню';hint.textContent='Затем коснись свободного узла на поле';}
 $('towerCount').textContent=`${Object.keys(TOWERS).filter(towerUnlocked).length} / ${Object.keys(TOWERS).length} открыто`;
 for(const [key,ty] of Object.entries(TOWERS).filter(([key])=>towerUnlocked(key))){
   const b=document.createElement('button');
   const price=towerStats(key).price;
   b.className='tower-card'+(pendingType===key?' is-armed':'');b.dataset.tower=key;b.disabled=state.money<price;
   b.setAttribute('aria-pressed',String(pendingType===key));
   b.innerHTML=`<span class="tower-glyph" style="--tower-accent:${ty.color}">${ty.icon}</span><span class="tower-detail"><b>${ty.name}</b><small>${ty.desc}</small></span><span class="tower-price">${price} ◆</span>`;
   b.addEventListener('click',()=>{
     if(selectedPad>=0){if(buildTower(key,selectedPad)){pendingType=null;updateControls()}return}
     pendingType=pendingType===key?null:key;updateControls();
   });
   root.appendChild(b);
 }
}
function burst(x,y,color,n=8){for(let i=0;i<n;i++)state.fx.push({x,y,vx:rng(-100,100),vy:rng(-100,100),life:rng(.22,.65),max:.65,color,size:rng(1.5,4)})}
function shoot(t,target){const ty=TOWERS[t.type],specs=towerStats(t.type,t.level);t.cool=1/specs.rate;t.rotation=Math.atan2(target.y-t.y,target.x-t.x);
 state.bullets.push({originX:t.x,originY:t.y,x:t.x+Math.cos(t.rotation)*19,y:t.y+Math.sin(t.rotation)*19,target:target.id,type:t.type,damage:specs.damage,speed:ty.bullet,color:ty.color,r:ty.name==='frost'?6:4});
 state.fx.push({x:t.x+Math.cos(t.rotation)*20,y:t.y+Math.sin(t.rotation)*20,vx:Math.cos(t.rotation)*40,vy:Math.sin(t.rotation)*40,life:.16,max:.16,color:ty.color,size:6,shotFx:true});
 if(Math.random()<.16)sound(t.type==='ember'?220:540,.027,'sine',.012,'shots');
}
function damageEnemy(e,d){e.hp-=d;state.fx.push({x:e.x+rng(-8,8),y:e.y+rng(-8,8),vx:rng(-14,14),vy:rng(-40,-5),life:.25,max:.25,color:'#faf5eb',size:2});if(e.hp<=0){state.enemies.splice(state.enemies.indexOf(e),1);state.kills++;state.money+=Math.round(e.reward*state.mods.bounty);burst(e.x,e.y,e.type==='boss'?'#ff9478':'#7ddfff',e.type==='boss'?31:10);if(e.type==='boss')toast('БОСС УНИЧТОЖЕН');}}
function hitEnemy(b,e){const special=towerLevel(b.type,'special'),master=towerLevel(b.type,'mastery');
 // Damage is calculated regardless of whether visual projectiles are hidden in settings.
 const hitX=e.x,hitY=e.y;damageEnemy(e,b.damage);
 if(b.type==='ember'&&e.hp>0){e.burn=2.4+special*.3;e.burnDps=7*state.mods.burn*(1+b.damage/40)*(1+.17*special+.25*master)}
 if(b.type==='frost'&&e.hp>0){e.slow=Math.max(e.slow,2.3+special*.35);e.slowFactor=Math.min(e.slowFactor??.54,Math.max(.29,.54-special*.055-master*.03));}
 if(b.type==='rail'){
  let targets=1+special+master;const ox=b.originX,oy=b.originY,dx=hitX-ox,dy=hitY-oy,len=Math.hypot(dx,dy)||1;let candidates=state.enemies.filter(x=>x!==e&&x.hp>0).map(x=>({...x,proj:((x.x-ox)*dx+(x.y-oy)*dy)/len,offset:Math.abs((x.x-ox)*dy-(x.y-oy)*dx)/len})).filter(x=>x.proj>len-8&&x.offset<x.r+12).sort((a,c)=>a.proj-c.proj);
  for(const next of candidates.slice(0,targets)){const actual=state.enemies.find(x=>x.id===next.id);if(actual)damageEnemy(actual,b.damage*.52);}
 }

 if(b.type==='pulse'||b.type==='arc'){const hops=b.type==='arc'?1+special+master:state.mods.chain+special;let origin={x:hitX,y:hitY},hits=[e.id];for(let n=0;n<hops;n++){const near=state.enemies.filter(x=>!hits.includes(x.id)&&dist(x,origin)<116).sort((a,c)=>dist(a,origin)-dist(c,origin))[0];if(!near)break;state.fx.push({lightning:true,x:origin.x,y:origin.y,x2:near.x,y2:near.y,life:.17,max:.17,color:'#7fe5ff'});hits.push(near.id);damageEnemy(near,b.damage*(b.type==='arc'?.45:.42));origin=near;}}}
function update(dt){elapsed+=dt;state.frames++;for(let i=state.fx.length-1;i>=0;i--){const f=state.fx[i];f.life-=dt;if(f.life<=0){state.fx.splice(i,1);continue;}if(!f.lightning){f.x+=f.vx*dt;f.y+=f.vy*dt;}}
 if(state.phase!=='combat')return;
 const delta=dt*state.speed;state.waveTime+=delta;state.spawnTimer-=delta;
 if(state.spawnIndex<state.spawnTotal&&state.spawnTimer<=0){spawnEnemy(state.spawnIndex++);state.spawnTimer+=state.spawnGap;}
 for(let i=state.enemies.length-1;i>=0;i--){const e=state.enemies[i];if(e.burn>0){e.burn-=delta;e.hp-=e.burnDps*delta;if(e.hp<=0){damageEnemy(e,0);continue;}}
 e.slow=Math.max(0,e.slow-delta);e.t+=(e.spd*(e.slow>0?(e.slowFactor??.54):1)*delta)/lengths[e.lane];const p=getPoint(e.lane,e.t);e.angle=Math.atan2(p.y-e.y,p.x-e.x);e.x=p.x;e.y=p.y;
 if(e.t>=1){state.enemies.splice(i,1);state.hp-=e.impact;burst(842,270,'#ff8aa3',15);sound(130,.22,'sawtooth');if(state.hp<=0){die();return;}updateUI();}}
 for(const t of state.towers){t.cool-=delta;if(t.cool>0)continue;const ty=TOWERS[t.type],range=ty.range*state.mods.range;
 const target=state.enemies.filter(e=>dist(t,e)<towerStats(t.type,t.level).range).sort((a,b)=>b.t-a.t)[0];if(target)shoot(t,target);}
 for(let i=state.bullets.length-1;i>=0;i--){const b=state.bullets[i],t=state.enemies.find(e=>e.id===b.target);if(!t){state.bullets.splice(i,1);continue;}const d=dist(b,t),travel=b.speed*delta;if(d<travel+t.r){hitEnemy(b,t);state.bullets.splice(i,1);updateUI();}else{b.x+=(t.x-b.x)/d*travel;b.y+=(t.y-b.y)/d*travel;}}
 if(state.spawnIndex===state.spawnTotal&&state.enemies.length===0){state.hp=Math.min(state.maxHp,state.hp+4*researchLevel('repair'));state.phase='upgrade';showUpgrades();updateUI();}
}
function moduleCount(id){return state.selectedModule.filter(x=>x===id).length;}
function availableModules(){return MODULES.filter(m=>(!m.max||moduleCount(m.id)<m.max)&&(m.id!=='repair'||state.hp<=state.maxHp-5));}
function showUpgrades(){
 const options=[...availableModules()];
 for(let i=options.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[options[i],options[j]]=[options[j],options[i]];}
 const root=$('upgradeCards');root.replaceChildren();
 options.slice(0,3).forEach(m=>{
  const level=moduleCount(m.id),btn=document.createElement('button');btn.className='upgrade-card';
  const stacks=m.max?'<i class="module-stacks">Уровень '+(level+1)+' из '+m.max+'</i>':'';
  btn.innerHTML='<span>'+m.icon+'</span><b>'+m.title+'</b><small>'+m.text+'</small>'+stacks+'<i>ВЫБРАТЬ ↗</i>';
  btn.addEventListener('click',()=>{
   if(state.phase!=='upgrade'||(m.max&&moduleCount(m.id)>=m.max))return;
   m.apply(state);state.selectedModule.push(m.id);state.phase='plan';state.money+=24+state.wave*3;
   showModal('upgradeModal',false);sound(810,.18,'triangle');toast('Модуль: '+m.title);updateUI();updateControls();
  });root.appendChild(btn);
 });showModal('upgradeModal',true);sound(870,.12);
}
function updateRewardUI(){
 const button=$('rewardBonusBtn'),note=$('rewardBonusNote');
 const used=state.rewardedClaimed||meta.claimedRewardRuns.includes(state.runId);
 button.hidden=rewardProvider.mode!=='demo';button.disabled=used||state.rewardedPending;
 button.textContent=used?'Бонус уже получен':state.rewardedPending?'Проверяем событие…':'Тест: получить +'+state.rewardBonus+' ◆';
 note.textContent=used?'Дополнительные осколки начислены один раз.':rewardProvider.mode==='demo'?'Тестовый режим Cloudflare: настоящая реклама не показывается.':'Бонус недоступен: рекламный SDK ещё не подключён.';
}
function die(){
 if(state.phase==='dead')return;
 state.phase='dead';
 const shards=Math.max(2,Math.floor((state.wave*1.9+state.kills*.12)*(1+.1*researchLevel('extract'))));
 state.rewardBase=shards;state.rewardBonus=Math.max(1,Math.floor(shards*.30));
 meta.shards+=shards;persist();
 $('resultWaves').textContent=Math.max(0,state.wave-1);$('resultKills').textContent=state.kills;$('resultShards').textContent='+'+shards;
 $('endDescription').textContent='Волна '+state.wave+' прорвала оборону. Осколки сохранены — бонус за просмотр необязателен.';
 updateRewardUI();showModal('deadModal',true);updateMeta();updateUI();sound(110,.4,'sawtooth');
}
function claimRewardBonus(){
 if(state.phase!=='dead'||state.rewardedClaimed||state.rewardedPending||meta.claimedRewardRuns.includes(state.runId))return;
 if(rewardProvider.mode!=='demo')return;
 const requestedRun=state.runId,bonus=state.rewardBonus;
 state.rewardedPending=true;updateRewardUI();
 rewardProvider.showRewarded({
  onOpen:()=>{},
  onRewarded:()=>{
   if(state.runId!==requestedRun||state.phase!=='dead'||meta.claimedRewardRuns.includes(requestedRun))return;
   meta.claimedRewardRuns.push(requestedRun);meta.claimedRewardRuns=meta.claimedRewardRuns.slice(-80);
   meta.shards+=bonus;state.rewardedClaimed=true;persist();updateMeta();updateRewardUI();
   toast('Демо-награда: +'+bonus+' осколков');
  },
  onClose:()=>{if(state.runId===requestedRun){state.rewardedPending=false;updateRewardUI();}},
  onError:()=>{if(state.runId===requestedRun){state.rewardedPending=false;updateRewardUI();toast('Бонус недоступен');}}
 });
}
function circle(x,y,r,fill,stroke,width=1){ctx.beginPath();ctx.arc(x,y,r,0,TAU);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}}
function line(points,color,width){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke()}
function poly(x,y,r,n,rotation,fill,stroke,width=1){ctx.beginPath();for(let i=0;i<n;i++){const a=rotation+i*TAU/n;ctx[i?'lineTo':'moveTo'](x+Math.cos(a)*r,y+Math.sin(a)*r)}ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
function drawBackground(){const grad=ctx.createLinearGradient(0,0,W,H);grad.addColorStop(0,'#0b1b2b');grad.addColorStop(.42,'#0c1527');grad.addColorStop(1,'#19122e');ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
 ctx.save();ctx.strokeStyle='#31546a19';ctx.lineWidth=1;for(let x=0;x<W;x+=35){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(let y=0;y<H;y+=35){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}ctx.restore();
 for(const s of stars){ctx.globalAlpha=.18+(.15+.15*Math.sin(elapsed*.8+s.tw));circle(s.x,s.y,s.r,'#8adfff');}ctx.globalAlpha=1;
 const fade=ctx.createRadialGradient(822,271,5,822,271,330);fade.addColorStop(0,'#3b5f9c13');fade.addColorStop(1,'#00000000');ctx.fillStyle=fade;ctx.fillRect(0,0,W,H);
 for(let i=0;i<paths.length;i++){const path=paths[i];line(path,'#062b3f',42);line(path,'#2f5360',33);line(path,'#243b50',26);line(path,'#2e5862',1.5);ctx.save();ctx.setLineDash([4,19]);ctx.lineDashOffset=-(elapsed*21)%23;line(path,'#95cadd29',1.4);ctx.restore();}
 ctx.strokeStyle='#5b9eb823';ctx.lineWidth=2;for(const pos of [[90,50],[320,45],[815,80],[83,482],[868,462]]){poly(pos[0],pos[1],25,6,Math.PI/6,null,'#456b812a',1);circle(pos[0],pos[1],6,'#31516566');}
}
function drawPads(){pads.forEach(([x,y],i)=>{const selected=i===selectedPad,t=state.towers.find(t=>t.pad===i);const p=1+.045*Math.sin(elapsed*2+i);
 ctx.save();ctx.translate(x,y);ctx.scale(p,p);ctx.shadowBlur=selected?21:6;ctx.shadowColor=selected?palette.cyan:'#48e5fa44';circle(0,0,31,'#142c3a','#365d72',2);circle(0,0,25,'#102638',selected?'#78eafb':'#498291',selected?3:1.4);poly(0,0,19,6,Math.PI/6,'#18324a',t?'#87d8ff':'#426d83',1.4);if(!t){ctx.globalAlpha=.72;poly(0,0,8,4,Math.PI/4,null,'#7cbbd1',1.8);ctx.globalAlpha=1;}
 if(selected){ctx.strokeStyle='#9afaff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,36,elapsed*.6,elapsed*.6+Math.PI*1.3);ctx.stroke();}
 ctx.restore();});}
function drawCore(){const x=842,y=270;ctx.save();ctx.translate(x,y);ctx.shadowColor='#55e7ff';ctx.shadowBlur=35+Math.sin(elapsed*3)*10;
 circle(0,0,83,'#1a5a7730');circle(0,0,69,'#245b7744','#3d8299',2);ctx.save();ctx.rotate(elapsed*.15);for(let i=0;i<6;i++){const a=i*TAU/6;poly(Math.cos(a)*53,Math.sin(a)*53,8,4,a,'#172e40','#4e9dba',1.5)}ctx.restore();
 ctx.save();ctx.rotate(-elapsed*.22);poly(0,0,52,6,Math.PI/6,'#132e4a','#4f9ba8',3);ctx.restore();ctx.save();ctx.rotate(elapsed*.4);poly(0,0,36,4,Math.PI/4,'#237b9e','#75edff',2.5);ctx.restore();poly(0,0,25,6,Math.PI/6,'#c6ffff','#ecffff',2);circle(0,0,8,'#fff');ctx.restore();
 const ratio=Math.max(0,state.hp/state.maxHp);ctx.beginPath();ctx.arc(x,y,73,-Math.PI/2,-Math.PI/2+TAU*ratio);ctx.strokeStyle=ratio<.3?'#ff6e88':'#79efff';ctx.lineWidth=5;ctx.stroke();ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.fillStyle='#bfe9f1';ctx.fillText('CORE',x,y+94);
}
function drawTowers(){for(const t of state.towers){const ty=TOWERS[t.type];ctx.save();ctx.translate(t.x,t.y);
 if(t.pad===selectedPad){ctx.beginPath();ctx.arc(0,0,towerStats(t.type,t.level).range,0,TAU);ctx.fillStyle=ty.color+'13';ctx.fill();ctx.strokeStyle=ty.color+'55';ctx.lineWidth=1.2;ctx.stroke();}
 ctx.shadowBlur=16;ctx.shadowColor=ty.color;circle(0,0,23,'#1c3045',ty.color,2);ctx.rotate(t.rotation);
 if(t.type==='pulse'){poly(0,0,15,6,Math.PI/6,'#1e4460',ty.color,2);ctx.fillStyle='#b7faff';rr(6,-5,24,10,3);ctx.fill();circle(7,0,8,ty.color);}
 else if(t.type==='ember'){poly(0,0,17,5,Math.PI/5,'#4d2d42',ty.color,2);ctx.fillStyle='#ffdd92';rr(7,-5,23,10,3);ctx.fill();circle(6,0,9,'#fa745a');}
 else if(t.type==='frost'){poly(0,0,17,6,0,'#34345c',ty.color,2);line([[0,0],[25,0]],ty.color,7);poly(2,0,10,6,0,'#d5dbff',ty.color,1.4)}
 else if(t.type==='arc'){poly(0,0,17,6,Math.PI/6,'#312846',ty.color,2);line([[3,-11],[23,0],[3,11]],ty.color,3);poly(4,0,8,4,Math.PI/4,'#e8d7ff',ty.color,1.3)}
 else if(t.type==='rail'){poly(0,0,19,4,Math.PI/4,'#48402e',ty.color,2);rr(4,-6,32,12,2);ctx.fillStyle='#a8854d';ctx.fill();line([[5,-4],[33,-4]],'#ffebaf',2);line([[5,4],[33,4]],'#ffebaf',2)}
 ctx.rotate(-t.rotation);ctx.shadowBlur=0;for(let i=0;i<t.level&&i<6;i++)circle((i-(t.level-1)/2)*7,28,2.5,ty.color);ctx.restore();}}
function drawEnemies(){for(const e of state.enemies){ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.angle);
 const color=e.type==='boss'?'#ff6d89':e.type==='tank'?'#d498ff':e.type==='runner'?'#ffce8b':'#f68d86';ctx.shadowColor=color;ctx.shadowBlur=e.type==='boss'?23:10;
 if(e.type==='boss'){poly(0,0,26,8,Math.PI/8,'#632c5a',color,3);poly(4,0,17,4,Math.PI/4,'#ffb0ba','#fff',1);for(let a=0;a<4;a++){const k=a*TAU/4;poly(Math.cos(k)*34,Math.sin(k)*34,6,3,k,'#fb769c',null);}}
 else if(e.type==='tank'){poly(0,0,19,6,0,'#52375d',color,2);poly(1,0,10,4,Math.PI/4,color);}
 else if(e.type==='runner'){poly(0,0,14,3,Math.PI/3,'#674525',color,2);}
 else{poly(0,0,14,6,0,'#5c344b',color,2);poly(2,0,7,4,Math.PI/4,color);}
 if(e.slow>0)circle(0,0,e.r+5,null,'#abbaffbb',1.5);if(e.burn>0)circle(0,0,e.r+7,null,'#ff985b99',1.5);
 ctx.restore();const bw=e.type==='boss'?68:40,bh=4;ctx.fillStyle='#2b2936';ctx.fillRect(e.x-bw/2,e.y-e.r-13,bw,bh);ctx.fillStyle=e.type==='boss'?'#ffc0b3':'#ff9d9e';ctx.fillRect(e.x-bw/2,e.y-e.r-13,Math.max(0,e.hp/e.maxHp)*bw,bh);}}
function drawFX(){const cap=settings.shotLimit,alpha=settings.shotOpacity/100;
 if(cap>0&&alpha>0){const bullets=state.bullets;const n=Math.min(bullets.length,cap);const stride=Math.max(1,Math.ceil(bullets.length/n));let seen=0;
 for(let i=bullets.length-1;i>=0&&seen<n;i-=stride){const b=bullets[i];ctx.save();ctx.globalAlpha=alpha;ctx.shadowColor=b.color;ctx.shadowBlur=12*alpha;circle(b.x,b.y,b.r,b.color);circle(b.x,b.y,b.r*.38,'white');ctx.restore();seen++;}}
 // Secondary particles are deliberately capped with a common opacity ceiling.
 const fxCap=Math.min(110,Math.max(12,Math.round(settings.shotLimit*1.5)));const particles=state.fx;
 for(let i=Math.max(0,particles.length-fxCap);i<particles.length;i++){const f=particles[i];ctx.globalAlpha=Math.max(0,f.life/f.max)*(f.shotFx?alpha:1);if(f.shotFx&&(cap===0||alpha===0))continue;
 if(f.lightning){line([[f.x,f.y],[f.x2,f.y2]],f.color,4*ctx.globalAlpha);line([[f.x,f.y],[f.x2,f.y2]],'#ffffff',1.5);}else circle(f.x,f.y,f.size*ctx.globalAlpha,f.color)}ctx.globalAlpha=1;}

function drawVignette(){const g=ctx.createRadialGradient(W/2,H/2,100,W/2,H/2,580);g.addColorStop(0,'#00000000');g.addColorStop(1,'#030714ad');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 if(state.phase==='combat'){ctx.font='bold 11px system-ui';ctx.textAlign='left';ctx.fillStyle='#a2c8da';ctx.fillText(`HOSTILES // ${state.enemies.length} ACTIVE`,20,23);ctx.fillText(`INCOMING // ${Math.max(0,state.spawnTotal-state.spawnIndex)}`,20,40);}}
function draw(){if(window.VayrhexArt?.draw){window.VayrhexArt.draw({ctx,W,H,state,elapsed,pads,paths,settings,selectedPad});return;}drawBackground();drawPads();drawCore();drawTowers();drawEnemies();drawFX();drawVignette();}
function tick(now){const delta=Math.min(.045,(now-last)/1000);last=now;update(delta);scheduleMusic();draw();requestAnimationFrame(tick)}
canvas.addEventListener('contextmenu',ev=>ev.preventDefault());
canvas.addEventListener('pointerdown',ev=>{if(state.phase!=='plan'&&state.phase!=='combat')return;const rect=canvas.getBoundingClientRect(),px=(ev.clientX-rect.left)/rect.width*W,py=(ev.clientY-rect.top)/rect.height*H;
 let best=-1,dmin=Number.POSITIVE_INFINITY;pads.forEach((p,i)=>{const d=Math.hypot(px-p[0],py-p[1]);if(d<dmin){dmin=d;best=i;}});if(dmin<53)selectPad(best);else{selectedPad=-1;pendingType=null;updateControls();}});
$('playBtn').addEventListener('click',start);$('restartBtn').addEventListener('click',start);$('rewardBonusBtn').addEventListener('click',claimRewardBonus);$('nextWaveBtn').addEventListener('click',startWave);
$('speedBtn').addEventListener('click',()=>{state.speed=state.speed===1?2:1;updateUI();});
$('muteBtn').addEventListener('click',()=>{muted=!muted;$('muteBtn').textContent=muted?'♪̸':'♪';$('muteBtn').setAttribute('aria-label',muted?'Включить звук':'Выключить звук');prepareAudio();applyMusicVolume();if(!muted)sound(660,.1);});
$('fullscreenBtn').addEventListener('click',async()=>{try{if(document.fullscreenElement){await document.exitFullscreen();}else{await document.querySelector('.gamebox').requestFullscreen();}}catch{toast('Полноэкранный режим недоступен — поверни телефон горизонтально');}});
document.addEventListener('fullscreenchange',()=>{$('fullscreenBtn').setAttribute('aria-label',document.fullscreenElement?'Выйти из полного экрана':'Полноэкранный режим');});
$('settingsBtn').addEventListener('click',()=>openPanel('settingsModal'));
$('researchBtn').addEventListener('click',()=>openPanel('researchModal'));
for(const key of ['musicVolume','shotsVolume','shotLimit','shotOpacity'])$(key).addEventListener('input',ev=>updateSetting(key,ev.target.value));
for(const [button,id] of [['settingsClose','settingsModal'],['settingsDone','settingsModal'],['researchClose','researchModal'],['researchDone','researchModal']])$(button).addEventListener('click',()=>closePanel(id));
document.addEventListener('visibilitychange',()=>{if(audioCtx&&audioCtx.state==='running'&&document.hidden)audioCtx.suspend();else if(!document.hidden&&audioCtx&&musicStarted)audioCtx.resume();applyMusicVolume();});

window.addEventListener('keydown',ev=>{if(['Enter',' '].includes(ev.key)&&state.phase==='plan'&&ev.target.tagName!=='BUTTON'){ev.preventDefault();startWave();}if(ev.key==='Escape'){if(!$('settingsModal').classList.contains('hidden')){closePanel('settingsModal');return;}if(!$('researchModal').classList.contains('hidden')){closePanel('researchModal');return;}selectedPad=-1;updateControls();}});
init();requestAnimationFrame(tick);
})();