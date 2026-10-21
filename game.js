/* COREBOUND — dependency-free browser prototype. No server, analytics or network calls. */
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
  frost: {name:'КРИО',icon:'❄',cost:70,range:166,dmg:12,rate:1.05,bullet:340,color:'#9ca5ff',desc:'Замедление'}
};
const MODULES = [
  {id:'force',icon:'⚡',title:'Перегрузка',text:'+25% урона всех башен',apply:s=>s.mods.damage*=1.25},
  {id:'rate',icon:'◈',title:'Ускоритель',text:'+20% скорости стрельбы',apply:s=>s.mods.rate*=1.20},
  {id:'range',icon:'◎',title:'Дальнобойность',text:'+18% радиуса атаки',apply:s=>s.mods.range*=1.18},
  {id:'cash',icon:'✦',title:'Ресурсный импульс',text:'+110 кредитов сейчас',apply:s=>s.money+=110},
  {id:'repair',icon:'✚',title:'Реконструкция',text:'Восстановить 40 HP ядра',apply:s=>s.hp=Math.min(s.maxHp,s.hp+40)},
  {id:'chain',icon:'⌁',title:'Резонанс',text:'+1 цель цепной молнии для импульсных башен',apply:s=>s.mods.chain=Math.min(3,s.mods.chain+1)},
  {id:'burn',icon:'♨',title:'Плазменный след',text:'+60% урона от горения',apply:s=>s.mods.burn*=1.6},
  {id:'bounty',icon:'◇',title:'Утилизация',text:'+25% кредитов за врагов',apply:s=>s.mods.bounty*=1.25}
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
let state, selectedPad=-1, pendingType=null, last=performance.now(), elapsed=0, toastTimeout=0, audioCtx=null, muted=true;
const saved=()=>{try{return JSON.parse(localStorage.getItem('corebound-save-v1'))||{shards:0,coreLevel:0}}catch{return {shards:0,coreLevel:0}}};
let meta=saved();
meta.shards=Math.max(0,Number(meta.shards)||0);meta.coreLevel=Math.min(15,Math.max(0,Number(meta.coreLevel)||0));
function persist(){try{localStorage.setItem('corebound-save-v1',JSON.stringify(meta))}catch{}}
function newState(){return {phase:'menu',wave:0,hp:100+meta.coreLevel*12,maxHp:100+meta.coreLevel*12,money:135+Math.min(meta.coreLevel,5)*8,kills:0,frames:0,waveTime:0,spawnIndex:0,spawnTotal:0,spawnGap:1.0,spawnTimer:0,selectedModule:[],enemies:[],towers:[],bullets:[],fx:[],mods:{damage:1,range:1,rate:1,chain:0,burn:1,bounty:1},speed:1};}
function init(){state=newState();selectedPad=-1;pendingType=null;updateMeta();updateUI();updateControls();}
function updateMeta(){$('shardCount').textContent=`${meta.shards} осколков`;$('metaBuy').textContent=`Усилить ядро · ${metaCost()}`;$('metaBuy').disabled=meta.shards<metaCost();}
function metaCost(){return 20+meta.coreLevel*15}
function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.classList.remove('show'),1700)}
function sound(freq=430,dur=.06,type='sine',vol=.035){if(muted)return;try{audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,audioCtx.currentTime);gain.gain.setValueAtTime(vol,audioCtx.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+dur);osc.connect(gain).connect(audioCtx.destination);osc.start();osc.stop(audioCtx.currentTime+dur)}catch{}}
function updateUI(){
 $('hpText').textContent=`${Math.max(0,Math.ceil(state.hp))} / ${state.maxHp}`;$('hpBar').style.width=`${Math.max(0,state.hp/state.maxHp)*100}%`;
 $('waveText').textContent=`${state.wave} / ∞`;$('moneyText').textContent=Math.floor(state.money);$('killsText').textContent=state.kills;
 $('gameStatus').textContent={menu:'Ожидание',plan:'Подготовка',combat:'Волна идёт',upgrade:'Выбор модуля',dead:'Ядро потеряно'}[state.phase];
 $('speedBtn').textContent=`▶ ${state.speed}×`;
 $('dockState').textContent={menu:'Не начато',plan:'Можно запускать',combat:'Оборона',upgrade:'Улучшение',dead:'Поражение'}[state.phase];
 const btn=$('nextWaveBtn');btn.disabled=state.phase!=='plan';btn.innerHTML=state.phase==='combat'?'Волна идёт…':'Запустить волну <span aria-hidden="true">→</span>';
}
function showModal(id,visible){$(id).classList.toggle('hidden',!visible)}
function start(){state=newState();state.phase='plan';selectedPad=-1;pendingType=null;['startModal','upgradeModal','deadModal'].forEach(id=>showModal(id,false));updateControls();updateUI();toast('Построй башни и запусти первую волну');}
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
 if(state.money<ty.cost){toast('Недостаточно кредитов');return false}
 if(state.towers.some(t=>t.pad===pad)){toast('Площадка занята');return false}
 state.money-=ty.cost;const [x,y]=pads[pad];
 state.towers.push({pad,x,y,type:key,level:1,cool:0,rotation:0});
 burst(x,y,ty.color,18);sound(560,.12,'triangle');updateUI();return true;
}
function updateControls(){
 const root=$('buildControls');root.replaceChildren();
 const title=$('selectionTitle'),hint=$('selectionHint');
 const chosen=selectedPad<0?null:state.towers.find(t=>t.pad===selectedPad);
 function action(name,cost,icon,color,callback,disabled=false){
  const el=document.createElement('button');el.className='toolbtn';el.disabled=disabled;
  el.innerHTML='<span class="icon" style="--tool-accent:'+color+'">'+icon+'</span><span class="toolcopy"><b>'+name+'</b><small>'+cost+'</small></span><span class="tool-arrow">›</span>';
  el.addEventListener('click',callback);root.appendChild(el);
 }
 if(chosen){
  const ty=TOWERS[chosen.type];title.textContent=ty.name+' · ур. '+chosen.level;
  hint.textContent='Урон '+Math.round(ty.dmg*(1+(chosen.level-1)*.52)*state.mods.damage)+' · Радиус '+Math.round(ty.range*state.mods.range);
  const cost=costFor(chosen);
  action('Улучшить',cost+' ◆','↑',ty.color,()=>{
   if(state.money<cost)return toast('Недостаточно кредитов');
   if(chosen.level>=6)return toast('Максимальный уровень');
   state.money-=cost;chosen.level++;burst(chosen.x,chosen.y,ty.color,18);sound(740,.15);updateControls();updateUI();
  },state.money<cost||chosen.level>=6);
  const refund=Math.round(ty.cost*.55+25*(chosen.level-1));
  action('Продать','+'+refund+' ◆','↶','#ed9d9d',()=>{
   state.towers=state.towers.filter(t=>t!==chosen);state.money+=refund;selectedPad=-1;
   burst(chosen.x,chosen.y,'#9ed6fa',12);updateControls();updateUI();
  });
  action('Закрыть','Другая позиция','×','#96a6a1',()=>{selectedPad=-1;pendingType=null;updateControls()});
  return;
 }
 if(pendingType){title.textContent=TOWERS[pendingType].name+' выбрана';hint.textContent='Коснись свободного узла, чтобы поставить башню';}
 else if(selectedPad>=0){title.textContent='Узел '+String(selectedPad+1).padStart(2,'0')+' · свободен';hint.textContent='Выбери башню — она появится на этом узле';}
 else{title.textContent='Выбери башню';hint.textContent='Затем коснись свободного узла на поле';}
 for(const [key,ty] of Object.entries(TOWERS)){
  const el=document.createElement('button');el.className='tower-card'+(pendingType===key?' is-armed':'');
  el.disabled=state.money<ty.cost;el.setAttribute('aria-pressed',String(pendingType===key));
  el.innerHTML='<span class="tower-glyph" style="--tower-accent:'+ty.color+'">'+ty.icon+'</span><span class="tower-detail"><b>'+ty.name+'</b><small>'+ty.desc+'</small></span><span class="tower-price">'+ty.cost+' ◆</span>';
  el.addEventListener('click',()=>{
   if(selectedPad>=0){if(buildTower(key,selectedPad)){pendingType=null;updateControls()}return}
   pendingType=pendingType===key?null:key;updateControls();
  });root.appendChild(el);
 }
}
function burst(x,y,color,n=8){for(let i=0;i<n;i++)state.fx.push({x,y,vx:rng(-100,100),vy:rng(-100,100),life:rng(.22,.65),max:.65,color,size:rng(1.5,4)})}
function shoot(t,target){const ty=TOWERS[t.type];t.cool=1/(ty.rate*state.mods.rate);t.rotation=Math.atan2(target.y-t.y,target.x-t.x);
 state.bullets.push({x:t.x+Math.cos(t.rotation)*19,y:t.y+Math.sin(t.rotation)*19,target:target.id,type:t.type,damage:ty.dmg*(1+(t.level-1)*.52)*state.mods.damage,speed:ty.bullet,color:ty.color,r:ty.name==='frost'?6:4});
 state.fx.push({x:t.x+Math.cos(t.rotation)*20,y:t.y+Math.sin(t.rotation)*20,vx:Math.cos(t.rotation)*40,vy:Math.sin(t.rotation)*40,life:.16,max:.16,color:ty.color,size:6});
 if(Math.random()<.16)sound(t.type==='ember'?220:540,.027,'sine',.012);
}
function damageEnemy(e,d){e.hp-=d;state.fx.push({x:e.x+rng(-8,8),y:e.y+rng(-8,8),vx:rng(-14,14),vy:rng(-40,-5),life:.25,max:.25,color:'#faf5eb',size:2});if(e.hp<=0){state.enemies.splice(state.enemies.indexOf(e),1);state.kills++;state.money+=Math.round(e.reward*state.mods.bounty);burst(e.x,e.y,e.type==='boss'?'#ff9478':'#7ddfff',e.type==='boss'?31:10);if(e.type==='boss')toast('БОСС УНИЧТОЖЕН');}}
function hitEnemy(b,e){damageEnemy(e,b.damage);if(b.type==='ember'&&e.hp>0){e.burn=2.4;e.burnDps=7*state.mods.burn*(1+b.damage/40)}if(b.type==='frost'&&e.hp>0)e.slow=Math.max(e.slow,2.3);
 if(b.type==='pulse'&&state.mods.chain){let origin=e,hits=[e.id];for(let n=0;n<state.mods.chain;n++){const near=state.enemies.filter(x=>!hits.includes(x.id)&&dist(x,origin)<116).sort((a,c)=>dist(a,origin)-dist(c,origin))[0];if(!near)break;state.fx.push({lightning:true,x:origin.x,y:origin.y,x2:near.x,y2:near.y,life:.17,max:.17,color:'#7fe5ff'});hits.push(near.id);damageEnemy(near,b.damage*.48);origin=near;}}}
function update(dt){elapsed+=dt;state.frames++;for(let i=state.fx.length-1;i>=0;i--){const f=state.fx[i];f.life-=dt;if(f.life<=0){state.fx.splice(i,1);continue;}if(!f.lightning){f.x+=f.vx*dt;f.y+=f.vy*dt;}}
 if(state.phase!=='combat')return;
 const delta=dt*state.speed;state.waveTime+=delta;state.spawnTimer-=delta;
 if(state.spawnIndex<state.spawnTotal&&state.spawnTimer<=0){spawnEnemy(state.spawnIndex++);state.spawnTimer+=state.spawnGap;}
 for(let i=state.enemies.length-1;i>=0;i--){const e=state.enemies[i];if(e.burn>0){e.burn-=delta;e.hp-=e.burnDps*delta;if(e.hp<=0){damageEnemy(e,0);continue;}}
 e.slow=Math.max(0,e.slow-delta);e.t+=(e.spd*(e.slow>0?.54:1)*delta)/lengths[e.lane];const p=getPoint(e.lane,e.t);e.angle=Math.atan2(p.y-e.y,p.x-e.x);e.x=p.x;e.y=p.y;
 if(e.t>=1){state.enemies.splice(i,1);state.hp-=e.impact;burst(842,270,'#ff8aa3',15);sound(130,.22,'sawtooth');if(state.hp<=0){die();return;}updateUI();}}
 for(const t of state.towers){t.cool-=delta;if(t.cool>0)continue;const ty=TOWERS[t.type],range=ty.range*state.mods.range;
 const target=state.enemies.filter(e=>dist(t,e)<range).sort((a,b)=>b.t-a.t)[0];if(target)shoot(t,target);}
 for(let i=state.bullets.length-1;i>=0;i--){const b=state.bullets[i],t=state.enemies.find(e=>e.id===b.target);if(!t){state.bullets.splice(i,1);continue;}const d=dist(b,t),travel=b.speed*delta;if(d<travel+t.r){hitEnemy(b,t);state.bullets.splice(i,1);updateUI();}else{b.x+=(t.x-b.x)/d*travel;b.y+=(t.y-b.y)/d*travel;}}
 if(state.spawnIndex===state.spawnTotal&&state.enemies.length===0){state.phase='upgrade';showUpgrades();updateUI();}
}
function showUpgrades(){const pick=MODULES.filter(m=>m.id!=='repair'||state.hp<state.maxHp);const options=[...pick].sort(()=>Math.random()-.5).slice(0,3);const root=$('upgradeCards');root.replaceChildren();options.forEach(m=>{const btn=document.createElement('button');btn.className='upgrade-card';btn.innerHTML=`<span>${m.icon}</span><b>${m.title}</b><small>${m.text}</small>`;btn.addEventListener('click',()=>{m.apply(state);state.selectedModule.push(m.id);state.phase='plan';state.money+=24+state.wave*3;showModal('upgradeModal',false);sound(810,.18,'triangle');toast(`Модуль установлен: ${m.title}`);updateUI();updateControls();});root.appendChild(btn);});showModal('upgradeModal',true);sound(870,.12);}
function die(){state.phase='dead';const shards=Math.max(2,Math.floor(state.wave*1.9+state.kills*.12));meta.shards+=shards;persist();$('resultWaves').textContent=Math.max(0,state.wave-1);$('resultKills').textContent=state.kills;$('resultShards').textContent=`+${shards}`;$('endDescription').textContent=`Волна ${state.wave} прорвала вашу оборону. Осколки сохранены для будущих забегов.`;showModal('deadModal',true);updateMeta();updateUI();sound(110,.4,'sawtooth');}
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
 if(t.pad===selectedPad){ctx.beginPath();ctx.arc(0,0,ty.range*state.mods.range,0,TAU);ctx.fillStyle=ty.color+'13';ctx.fill();ctx.strokeStyle=ty.color+'55';ctx.lineWidth=1.2;ctx.stroke();}
 ctx.shadowBlur=16;ctx.shadowColor=ty.color;circle(0,0,23,'#1c3045',ty.color,2);ctx.rotate(t.rotation);
 if(t.type==='pulse'){poly(0,0,15,6,Math.PI/6,'#1e4460',ty.color,2);ctx.fillStyle='#b7faff';rr(6,-5,24,10,3);ctx.fill();circle(7,0,8,ty.color);}
 else if(t.type==='ember'){poly(0,0,17,5,Math.PI/5,'#4d2d42',ty.color,2);ctx.fillStyle='#ffdd92';rr(7,-5,23,10,3);ctx.fill();circle(6,0,9,'#fa745a');}
 else{poly(0,0,17,6,0,'#34345c',ty.color,2);line([[0,0],[25,0]],ty.color,7);poly(2,0,10,6,0,'#d5dbff',ty.color,1.4)}
 ctx.rotate(-t.rotation);ctx.shadowBlur=0;for(let i=0;i<t.level&&i<6;i++)circle((i-(t.level-1)/2)*7,28,2.5,ty.color);ctx.restore();}}
function drawEnemies(){for(const e of state.enemies){ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.angle);
 const color=e.type==='boss'?'#ff6d89':e.type==='tank'?'#d498ff':e.type==='runner'?'#ffce8b':'#f68d86';ctx.shadowColor=color;ctx.shadowBlur=e.type==='boss'?23:10;
 if(e.type==='boss'){poly(0,0,26,8,Math.PI/8,'#632c5a',color,3);poly(4,0,17,4,Math.PI/4,'#ffb0ba','#fff',1);for(let a=0;a<4;a++){const k=a*TAU/4;poly(Math.cos(k)*34,Math.sin(k)*34,6,3,k,'#fb769c',null);}}
 else if(e.type==='tank'){poly(0,0,19,6,0,'#52375d',color,2);poly(1,0,10,4,Math.PI/4,color);}
 else if(e.type==='runner'){poly(0,0,14,3,Math.PI/3,'#674525',color,2);}
 else{poly(0,0,14,6,0,'#5c344b',color,2);poly(2,0,7,4,Math.PI/4,color);}
 if(e.slow>0)circle(0,0,e.r+5,null,'#abbaffbb',1.5);if(e.burn>0)circle(0,0,e.r+7,null,'#ff985b99',1.5);
 ctx.restore();const bw=e.type==='boss'?68:40,bh=4;ctx.fillStyle='#2b2936';ctx.fillRect(e.x-bw/2,e.y-e.r-13,bw,bh);ctx.fillStyle=e.type==='boss'?'#ffc0b3':'#ff9d9e';ctx.fillRect(e.x-bw/2,e.y-e.r-13,Math.max(0,e.hp/e.maxHp)*bw,bh);}}
function drawFX(){for(const b of state.bullets){ctx.save();ctx.shadowColor=b.color;ctx.shadowBlur=15;circle(b.x,b.y,b.r,b.color);circle(b.x,b.y,b.r*.38,'white');ctx.restore();}for(const f of state.fx){ctx.globalAlpha=Math.max(0,f.life/f.max);if(f.lightning){line([[f.x,f.y],[f.x2,f.y2]],f.color,4*ctx.globalAlpha);line([[f.x,f.y],[f.x2,f.y2]],'#ffffff',1.5);}else circle(f.x,f.y,f.size*ctx.globalAlpha,f.color)}ctx.globalAlpha=1;}
function drawVignette(){const g=ctx.createRadialGradient(W/2,H/2,100,W/2,H/2,580);g.addColorStop(0,'#00000000');g.addColorStop(1,'#030714ad');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 if(state.phase==='combat'){ctx.font='bold 11px system-ui';ctx.textAlign='left';ctx.fillStyle='#a2c8da';ctx.fillText(`HOSTILES // ${state.enemies.length} ACTIVE`,20,23);ctx.fillText(`INCOMING // ${Math.max(0,state.spawnTotal-state.spawnIndex)}`,20,40);}}
function draw(){drawBackground();drawPads();drawCore();drawTowers();drawEnemies();drawFX();drawVignette();}
function tick(now){const delta=Math.min(.045,(now-last)/1000);last=now;update(delta);draw();requestAnimationFrame(tick)}
canvas.addEventListener('pointerdown',ev=>{if(state.phase!=='plan'&&state.phase!=='combat')return;const rect=canvas.getBoundingClientRect(),px=(ev.clientX-rect.left)/rect.width*W,py=(ev.clientY-rect.top)/rect.height*H;
 let best=-1,dmin=Number.POSITIVE_INFINITY;pads.forEach((p,i)=>{const d=Math.hypot(px-p[0],py-p[1]);if(d<dmin){dmin=d;best=i;}});if(dmin<53)selectPad(best);else{selectedPad=-1;pendingType=null;updateControls();}});
$('playBtn').addEventListener('click',start);$('restartBtn').addEventListener('click',start);$('nextWaveBtn').addEventListener('click',startWave);
$('speedBtn').addEventListener('click',()=>{state.speed=state.speed===1?2:1;updateUI();});
$('muteBtn').addEventListener('click',()=>{muted=!muted;$('muteBtn').textContent=muted?'♪̸':'♪';$('muteBtn').setAttribute('aria-label',muted?'Включить звук':'Выключить звук');if(!muted)sound(660,.1);});
$('fullscreenBtn').addEventListener('click',async()=>{try{if(document.fullscreenElement){await document.exitFullscreen();}else{await document.querySelector('.gamebox').requestFullscreen();}}catch{toast('Полноэкранный режим недоступен — поверни телефон горизонтально');}});
document.addEventListener('fullscreenchange',()=>{$('fullscreenBtn').setAttribute('aria-label',document.fullscreenElement?'Выйти из полного экрана':'Полноэкранный режим');});
$('metaBuy').addEventListener('click',()=>{const cost=metaCost();if(meta.shards<cost)return;meta.shards-=cost;meta.coreLevel++;persist();state.maxHp=100+meta.coreLevel*12;state.hp=state.maxHp;updateMeta();updateUI();toast('Усиление ядра приобретено!');sound(740,.12);});
window.addEventListener('keydown',ev=>{if(['Enter',' '].includes(ev.key)&&state.phase==='plan'&&ev.target.tagName!=='BUTTON'){ev.preventDefault();startWave();}if(ev.key==='Escape'){selectedPad=-1;updateControls();}});
init();requestAnimationFrame(tick);
})();
