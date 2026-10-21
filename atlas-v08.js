(function(){
'use strict';
const $=id=>document.getElementById(id);
const W=2750,H=2250,CX=1300,CY=1100;
const atlas={api:null,items:[],byId:new Map(),selected:'root',zoom:.74,x:0,y:0,pointers:new Map(),dragged:false,pinch:0,bound:false};
function level(n){const a=atlas.api;if(n.kind==='root')return 1;if(n.kind==='hub')return a.towerUnlocked(n.key)?1:0;return n.cat==='general'?a.researchLevel(n.key):a.towerLevel(n.key,n.nodeId)}
function requirement(n){const a=atlas.api;if(n.kind==='root')return {ok:true};
 if(n.kind==='hub'){if(a.towerUnlocked(n.key))return {ok:true};if(n.key==='arc'&&a.researchLevel('damage')<1)return {ok:false,reason:'Сначала изучи «Мощность»'};if(n.key==='rail'&&a.researchLevel('range')<1)return {ok:false,reason:'Сначала изучи «Сенсоры»'};return {ok:true};}
 if(n.cat!=='general'&&!a.towerUnlocked(n.key))return {ok:false,reason:'Сначала открой башню'};
 if(n.requires){const req=typeof n.requires==='string'?{id:n.requires,level:1}:n.requires;const l=n.cat==='general'?a.researchLevel(req.id):a.towerLevel(n.key,req.id);if(l<req.level){const dep=atlas.byId.get(n.cat==='general'?'g:'+req.id:'t:'+n.key+':'+req.id);return {ok:false,reason:'Нужно: '+(dep?dep.name:'предыдущее улучшение')+' · ур. '+req.level};}}
 return {ok:true};}
function state(n){const l=level(n),cap=n.kind==='research'?n.max:1;if(l>=cap)return 'owned';if(!requirement(n).ok)return 'locked';let cost=n.kind==='hub'?n.price:n.cost[l];return atlas.api.meta.shards>=cost?'ready':'unaffordable';}
function make(){const a=atlas.api;const all=[{id:'root',kind:'root',name:'Ядро системы',symbol:'⬡',desc:'Все направления связаны одним ядром. Выбери технологию, чтобы изучить её.',x:CX,y:CY,parent:null,color:'#bad688'}];
const xy={plating:[1080,915],repair:[910,745],reserve:[740,580],damage:[1300,845],rate:[1300,670],range:[1300,490],capital:[1515,920],salvage:[1685,755],extract:[1860,585]};
const colors={core:'#9fcabd',weapons:'#d9ba79',economy:'#a5c993'};
for(const n of a.RESEARCH){const dep=n.requires?(typeof n.requires==='string'?n.requires:n.requires.id):null;all.push({...n,id:'g:'+n.id,nodeId:n.id,key:n.id,kind:'research',cat:'general',parent:dep?'g:'+dep:'root',x:xy[n.id][0],y:xy[n.id][1],color:colors[n.branch]});}
const dirs={pulse:[715,1140,-1,0,'root'],ember:[940,1530,-.5,.866,'root'],frost:[1655,1530,.5,.866,'root'],arc:[1980,1090,1,0,'g:damage'],rail:[1730,330,.85,-.52,'g:range']};
const offset={power:[136,0],rate:[266,-35],range:[390,-35],economy:[250,145],special:[500,20],mastery:[610,45]};
for(const [key,ty] of Object.entries(a.TOWERS)){const [x,y,vx,vy,parent]=dirs[key];all.push({id:'hub:'+key,kind:'hub',key,parent,name:ty.name,desc:ty.desc,symbol:ty.icon,x,y,color:ty.color,price:ty.unlockCost||0});
 for(const n of a.TOWER_RESEARCH[key]){const [dist,side]=offset[n.id];const req=n.requires?(typeof n.requires==='string'?n.requires:n.requires.id):null;
 all.push({...n,id:'t:'+key+':'+n.id,kind:'research',nodeId:n.id,key,cat:key,parent:req?'t:'+key+':'+req:'hub:'+key,x:Math.round(x+vx*dist-vy*side),y:Math.round(y+vy*dist+vx*side),color:ty.color});}}
atlas.items=all;atlas.byId=new Map(all.map(n=>[n.id,n]));}
function paint(){const svg=$('atlasLines'),box=$('atlasNodes');svg.replaceChildren();box.replaceChildren();atlas.api.updateMeta();const nodes=atlas.items.filter(n=>n.kind==='research'),got=nodes.reduce((s,n)=>s+level(n),0),max=nodes.reduce((s,n)=>s+n.max,0);
$('researchTotal').textContent=got+' / '+max+' уровней · '+Object.keys(atlas.api.TOWERS).filter(atlas.api.towerUnlocked).length+' из '+Object.keys(atlas.api.TOWERS).length+' башен';
for(const n of atlas.items){if(!n.parent)continue;const p=atlas.byId.get(n.parent);if(!p)continue;const line=document.createElementNS('http://www.w3.org/2000/svg','path'),owned=level(n)>0&&level(p)>0;
line.setAttribute('d','M '+p.x+' '+p.y+' Q '+(p.x+n.x)/2+' '+(p.y+n.y)/2+' '+n.x+' '+n.y);line.setAttribute('class','atlas-link'+(owned?' is-traveled':'')+(state(n)==='ready'?' is-reachable':''));line.setAttribute('stroke',owned?n.color:'#536068');svg.append(line);}
for(const n of atlas.items){const btn=document.createElement('button'),status=state(n);btn.type='button';btn.className='atlas-node type-'+n.kind+' state-'+status+(atlas.selected===n.id?' is-selected':'');btn.dataset.node=n.id;btn.title=n.name;btn.style.cssText='left:'+n.x+'px;top:'+n.y+'px;--node-color:'+n.color;btn.setAttribute('aria-label',n.name);
const lv=n.kind==='research'?'<span class="atlas-node-level">'+level(n)+'/'+n.max+'</span>':'';
btn.innerHTML='<span class="atlas-node-face">'+(n.symbol||'⬡')+'</span>'+lv+'<span class="atlas-node-caption">'+n.name+'</span>';
btn.addEventListener('click',e=>{if(atlas.dragged){e.preventDefault();return;}choose(n.id)});box.append(btn);}
details();camera();}
function choose(id){if(!atlas.byId.has(id))return;atlas.selected=id;paint();}
function details(){const n=atlas.byId.get(atlas.selected),l=level(n),cap=n.kind==='research'?n.max:1,full=l>=cap,req=requirement(n),cost=n.kind==='hub'?n.price:n.kind==='research'&&!full?n.cost[l]:0;
$('atlasDetailType').textContent=n.kind==='root'?'НАЧАЛО':n.kind==='hub'?'НОВАЯ БАШНЯ':n.cat==='general'?'ОБЩЕЕ ИССЛЕДОВАНИЕ':'БАШНЯ · '+atlas.api.TOWERS[n.key].name;
$('atlasDetailLevel').textContent=n.kind==='root'?'ЦЕНТР':n.kind==='hub'?(full?'ОТКРЫТА':'ЗАКРЫТА'):l+' / '+cap;
$('atlasDetailIcon').textContent=n.symbol||'⬡';$('atlasDetailIcon').style.color=n.color;
$('atlasDetailName').textContent=n.name;$('atlasDetailDesc').textContent=n.desc;
const ticks=$('atlasDetailProgress');ticks.replaceChildren();if(n.kind==='research')for(let i=0;i<n.max;i++){const q=document.createElement('i');if(i<l)q.className='is-done';ticks.append(q);}
const needed=$('atlasDetailRequirement');needed.className='atlas-detail-requirement'+(!req.ok?' is-locked':'');needed.textContent=full?'':!req.ok?req.reason:atlas.api.meta.shards<cost?'Не хватает '+(cost-atlas.api.meta.shards)+' ◆':'Доступно для изучения';
const buy=$('atlasPurchase');buy.disabled=full||!req.ok||atlas.api.meta.shards<cost;buy.textContent=full?(n.kind==='root'?'Выбери узел':n.kind==='hub'?'Башня открыта':'Изучено полностью'):n.kind==='hub'?'Открыть башню · '+cost+' ◆':'Изучить · '+cost+' ◆';$('atlasDetailNote').textContent='Изученное сохраняется между забегами.';}
function purchase(){const a=atlas.api,n=atlas.byId.get(atlas.selected);if(!n||n.kind==='root')return;const l=level(n),cap=n.kind==='research'?n.max:1,cost=n.kind==='hub'?n.price:n.cost[l];
if(l>=cap||!requirement(n).ok||a.meta.shards<cost)return;a.meta.shards-=cost;if(n.kind==='hub'){if(!a.meta.unlockedTowers.includes(n.key))a.meta.unlockedTowers.push(n.key);}else{const key=n.cat==='general'?n.key:'tower.'+n.key+'.'+n.nodeId;a.meta.research[key]=l+1;}
a.persist();a.sound(780,.1,'triangle');paint();a.updateControls();}
function camera(){$('atlasWorld').style.transform='translate('+atlas.x+'px,'+atlas.y+'px) scale('+atlas.zoom+')';$('atlasScaleValue').textContent=Math.round(atlas.zoom*100)+'%';}
function center(wx=CX,wy=CY,scale=atlas.zoom){const r=$('atlasViewport').getBoundingClientRect();if(!r.width)return;atlas.zoom=scale;atlas.x=r.width/2-wx*scale;atlas.y=r.height/2-wy*scale;camera();}
function zoom(factor,x,y){const r=$('atlasViewport').getBoundingClientRect();x??=r.width/2;y??=r.height/2;const prev=atlas.zoom,next=Math.min(1.8,Math.max(.35,prev*factor)),wx=(x-atlas.x)/prev,wy=(y-atlas.y)/prev;atlas.zoom=next;atlas.x=x-wx*next;atlas.y=y-wy*next;camera();}
function fit(){const r=$('atlasViewport').getBoundingClientRect();if(r.width)center(W/2,H/2,Math.max(.35,Math.min(1.15,Math.min(r.width/(W+80),r.height/(H+80)))));}
function bind(){if(atlas.bound)return;atlas.bound=true;const view=$('atlasViewport');view.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;view.setPointerCapture(e.pointerId);atlas.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,id:e.target.closest('.atlas-node')?.dataset.node});atlas.dragged=false;if(atlas.pointers.size===2){const [u,v]=[...atlas.pointers.values()];atlas.pinch=Math.hypot(u.x-v.x,u.y-v.y);}});
view.addEventListener('pointermove',e=>{const p=atlas.pointers.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;if(Math.hypot(p.x-p.sx,p.y-p.sy)>6)atlas.dragged=true;if(atlas.pointers.size===1){atlas.x+=dx;atlas.y+=dy;camera();}else if(atlas.pointers.size===2){const [a,b]=[...atlas.pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(atlas.pinch){const r=view.getBoundingClientRect();zoom(d/atlas.pinch,(a.x+b.x)/2-r.left,(a.y+b.y)/2-r.top);}atlas.pinch=d;}});
function end(e){const p=atlas.pointers.get(e.pointerId),id=e.type==='pointerup'&&!atlas.dragged&&atlas.pointers.size===1?p?.id:null;atlas.pointers.delete(e.pointerId);atlas.pinch=0;if(id)choose(id);if(!atlas.pointers.size)setTimeout(()=>{atlas.dragged=false},0);}
view.addEventListener('pointerup',end);view.addEventListener('pointercancel',end);view.addEventListener('wheel',e=>{e.preventDefault();const r=view.getBoundingClientRect();zoom(Math.exp(-e.deltaY*.0012),e.clientX-r.left,e.clientY-r.top);},{passive:false});
$('atlasZoomIn').addEventListener('click',()=>zoom(1.24));$('atlasZoomOut').addEventListener('click',()=>zoom(1/1.24));$('atlasCenter').addEventListener('click',()=>center(CX,CY,.74));$('atlasFit').addEventListener('click',fit);$('atlasPurchase').addEventListener('click',purchase);
}
window.VayrhexAtlas={open(api){atlas.api=api;make();bind();atlas.selected='root';paint();requestAnimationFrame(()=>center(CX,CY,innerWidth<650?.70:.74));}};
})();
