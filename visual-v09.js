/* VAYRHEX original procedural visual module. Keeps physics and saves entirely in game.js. */
(()=>{'use strict';
const TAU=Math.PI*2,C={ink:'#091a1b',bone:'#e5dcc2',mint:'#9bd5c1',copper:'#cf9364',blue:'#a7c3cd',red:'#c87564'};
function line(g,p,c,w=1){g.beginPath();g.moveTo(...p[0]);p.slice(1).forEach(q=>g.lineTo(...q));g.strokeStyle=c;g.lineWidth=w;g.lineCap='butt';g.lineJoin='bevel';g.stroke()}
function shape(g,x,y,r,n,a,fill,stroke,width=1){g.beginPath();for(let i=0;i<n;i++){const q=a+i*TAU/n;g[i?'lineTo':'moveTo'](x+Math.cos(q)*r,y+Math.sin(q)*r)}g.closePath();if(fill){g.fillStyle=fill;g.fill()}if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.stroke()}}
function dot(g,x,y,r,c){g.beginPath();g.arc(x,y,r,0,TAU);g.fillStyle=c;g.fill()}
function label(g,s,x,y,c='#b7c9b4',size=10,align='left'){g.font='bold '+size+'px monospace';g.textBaseline='middle';g.textAlign=align;g.fillStyle=c;g.fillText(s,x,y)}
function board(g,w,h,t,paths){
 const b=g.createLinearGradient(0,0,w,h);b.addColorStop(0,'#0a1c1e');b.addColorStop(.6,'#0d2020');b.addColorStop(1,'#112223');g.fillStyle=b;g.fillRect(0,0,w,h);
 g.strokeStyle='#82b09b12';g.lineWidth=1;for(let x=12;x<w;x+=24){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke()}for(let y=11;y<h;y+=24){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke()}
 for(let i=0;i<68;i++){let x=(i*127+39)%w,y=(i*217+45)%h;dot(g,x,y,i%9===0?2:1,'#8ca69b65')}
 for(let i=0;i<20;i++){let x=35+(i*223)%865,y=40+(i*179)%425;line(g,[[x-9,y],[x+9,y]],'#728d8140');line(g,[[x,y-9],[x,y+9]],'#728d8140')}
 g.strokeStyle='#5d7f71';g.lineWidth=2;g.strokeRect(9,9,w-18,h-18);g.strokeStyle='#6f948368';g.lineWidth=1;g.strokeRect(17,17,w-34,h-34);
 for(const [x,y,sx,sy] of [[20,20,1,1],[w-20,20,-1,1],[20,h-20,1,-1],[w-20,h-20,-1,-1]])line(g,[[x,y+16*sy],[x,y],[x+16*sx,y]],C.copper,2);
 paths.forEach((p,i)=>{line(g,p,'#061415',43);line(g,p,'#54776d',39);line(g,p,'#153338',35);line(g,p,'#75877c5b',30);line(g,p,'#0b2123',26);line(g,p,'#132a2b',17);g.save();g.setLineDash([10,22]);g.lineDashOffset=-(t*11+i*9)%32;line(g,p,'#d5a47b7c',1.2);g.restore()});
 label(g,'TOPOLOGY // STATION 01',34,35);label(g,'RETURN / 003',32,h-34,'#cb9a6f');label(g,'VX / 09',w-32,h-34,'#a5c0a9',10,'right');
}
function socket(g,x,y,i,t,sel,built){g.save();g.translate(x,y);dot(g,0,0,33,'#0a1719');g.strokeStyle=sel?'#eac491':'#60817b';g.lineWidth=sel?3:1.6;g.beginPath();g.arc(0,0,30,0,TAU);g.stroke();shape(g,0,0,25,8,Math.PI/8,'#132c30','#648980',2);shape(g,0,0,19,8,Math.PI/8,'#10262a','#47665d',1);if(!built){shape(g,0,0,8,4,Math.PI/4,'#8a9476','#cbb18b',2)}for(let k=0;k<8;k++){let a=k*TAU/8+t*.04;dot(g,Math.cos(a)*29,Math.sin(a)*29,1.8,k%2?'#638679':'#c5a87d')}if(sel){g.strokeStyle=C.copper;g.lineWidth=2;g.beginPath();g.arc(0,0,38,t*.24,t*.24+Math.PI*1.3);g.stroke()}g.restore()}
function core(g,t,hp,maxHp){const x=842,y=270;g.save();g.translate(x,y);dot(g,0,0,86,'#29494452');for(let i=0;i<12;i++){const a=i*TAU/12;shape(g,Math.cos(a)*77,Math.sin(a)*77,5,4,Math.PI/4,i%3===0?'#d5a879':'#274640')}dot(g,0,0,69,'#0a2124');shape(g,0,0,64,8,Math.PI/8,'#1b3435','#c9a06b',3);g.save();g.rotate(t*.12);shape(g,0,0,54,8,Math.PI/8,'#163d3e','#8eab97',2);g.restore();g.save();g.rotate(-t*.32);shape(g,0,0,38,4,Math.PI/4,'#2b5750','#e0d2aa',3);g.restore();shape(g,0,0,26,6,t*.14,'#a5cfc0','#f3e3bd',2);dot(g,0,0,8,'#fcf0c9');g.beginPath();g.arc(0,0,83,-Math.PI/2,-Math.PI/2+TAU*Math.max(0,hp/maxHp));g.strokeStyle=hp/maxHp<.3?C.red:'#ebd1a2';g.lineWidth=6;g.stroke();g.restore();label(g,'REACTOR / 01',x,y+100,'#dbba91',11,'center')}
function turret(g,t){const c={pulse:'#98d6ce',ember:'#e4a371',frost:'#a6c9d3',arc:'#e0cb93',rail:'#ebdfc2'}[t.type]||C.bone;g.save();g.translate(t.x,t.y);shape(g,0,0,27,8,Math.PI/8,'#17292a','#728e7f',2);for(let i=0;i<4;i++){g.save();g.rotate(i*Math.PI/2);g.fillStyle='#c9aa7f';g.fillRect(19,-3,9,6);g.restore()}g.rotate(t.rotation||0);
 if(t.type==='pulse'){shape(g,0,0,16,4,Math.PI/4,'#315b55',c,2);g.fillStyle='#b5d8c7';g.fillRect(4,-5,29,10);g.fillStyle='#efdcb7';g.fillRect(26,-3,8,6)}
 if(t.type==='ember'){shape(g,0,0,17,5,-Math.PI/2,'#664438',c,2);g.fillStyle='#db9265';g.fillRect(5,-11,26,22);g.fillStyle='#f1c093';g.fillRect(28,-6,11,12)}
 if(t.type==='frost'){shape(g,0,0,20,6,Math.PI/6,'#354751',c,2);g.fillStyle='#bed3d3';g.beginPath();g.moveTo(-2,-9);g.lineTo(36,-4);g.lineTo(36,4);g.lineTo(-2,9);g.closePath();g.fill()}
 if(t.type==='arc'){shape(g,0,0,18,8,Math.PI/8,'#524f42',c,2);for(let s of [-1,1]){g.fillStyle=c;g.fillRect(5,s*10-3,25,5);dot(g,31,s*10,5,'#f3d7a5')}}
 if(t.type==='rail'){shape(g,0,0,19,4,Math.PI/4,'#3c4542',c,2);g.fillStyle='#c5c6b3';g.fillRect(-8,-8,47,5);g.fillRect(-8,3,47,5);g.fillStyle='#e9bd8b';g.fillRect(24,-3,24,6)}
 g.restore();for(let i=0;i<Math.min(t.level,6);i++)dot(g,t.x+(i-(Math.min(t.level,6)-1)/2)*7,t.y+29,2.5,'#e0c38a')}
function enemy(g,e,t){const boss=e.type==='boss',tank=e.type==='tank',runner=e.type==='runner';const clr=boss?'#d98075':tank?'#b9a184':runner?'#e8c18c':'#b77969';g.save();g.translate(e.x,e.y);g.rotate(e.angle||0);shape(g,0,0,boss?26:tank?20:runner?13:15,boss?8:6,Math.PI/6,'#202325',clr,2);
 if(boss){shape(g,0,0,20,8,t*.2,'#834640','#e0b28b',2);shape(g,0,0,10,4,Math.PI/4,'#f0d4a7')}
 else if(tank){shape(g,0,0,15,4,Math.PI/4,'#695d50','#e7c39b',2)}
 else if(runner){shape(g,4,0,12,3,0,'#ac8457','#ffda9c',2)}
 else{shape(g,0,0,10,5,Math.PI/5,'#6d4442','#d9a68d',2);g.fillStyle='#e8bd98';g.fillRect(-4,-4,8,8)}g.restore();
 const bw=boss?65:39;g.fillStyle='#14191b';g.fillRect(e.x-bw/2,e.y-e.r-14,bw,4);g.fillStyle=clr;g.fillRect(e.x-bw/2,e.y-e.r-14,Math.max(0,e.hp/e.maxHp)*bw,4)}
function project(g,b){const x=b.x,y=b.y,ox=b.originX??x,oy=b.originY??y;const a=Math.atan2(y-oy,x-ox),ux=Math.cos(a),uy=Math.sin(a);
 if(b.type==='pulse'){line(g,[[x-ux*19,y-uy*19],[x+ux*11,y+uy*11]],'#7fd8cc',3);line(g,[[x-ux*5,y-uy*5],[x+ux*6,y+uy*6]],'#f9eee0',1)}
 else if(b.type==='ember'){shape(g,x,y,7,3,a,'#ffc58b','#b96f44',1);for(let k=1;k<4;k++)dot(g,x-ux*k*8,y-uy*k*8,5-k,'#b57251')}
 else if(b.type==='frost'){shape(g,x,y,9,4,Math.PI/4+a,'#abc9d3','#f0f0dd',2);line(g,[[x-ux*15,y-uy*15],[x-ux*5,y-uy*5]],'#7eaeac',2)}
 else if(b.type==='arc'){let p=[];for(let i=0;i<6;i++){let u=i/5;p.push([x-ux*32*u+uy*(i%2?4:-4),y-uy*32*u-ux*(i%2?4:-4)])}line(g,p,'#f6d7a0',3);line(g,p,'#fff4cf',1)}
 else if(b.type==='rail'){line(g,[[x-ux*56,y-uy*56],[x+ux*19,y+uy*19]],'#a8c5c0',5);line(g,[[x-ux*40,y-uy*40],[x+ux*19,y+uy*19]],'#f7deb4',2)}
 else dot(g,x,y,3,'#ecd4a1')}
function effects(g,s,settings){const alpha=(settings.shotOpacity??70)/100,cap=settings.shotLimit??30;if(cap&&alpha){const n=Math.min(s.bullets.length,cap),step=Math.max(1,Math.ceil(s.bullets.length/Math.max(n,1)));let k=0;for(let i=s.bullets.length-1;i>=0&&k<n;i-=step){g.save();g.globalAlpha=alpha;project(g,s.bullets[i]);g.restore();k++}}
 let num=0;for(let i=s.fx.length-1;i>=0&&num<70;i--){const f=s.fx[i];if(f.shotFx&&(!cap||!alpha))continue;g.save();g.globalAlpha=Math.max(0,f.life/f.max)*(f.shotFx?alpha:1);if(f.lightning){line(g,[[f.x,f.y],[(f.x+f.x2)/2+5,(f.y+f.y2)/2-5],[f.x2,f.y2]],'#f0d39f',3)}else shape(g,f.x,f.y,Math.max(1,f.size*f.life/f.max),4,Math.PI/4,f.color);g.restore();num++}}
function draw({ctx:g,W:w,H:h,state:s,elapsed:t,pads,paths,settings,selectedPad}){board(g,w,h,t,paths);pads.forEach(([x,y],i)=>socket(g,x,y,i,t,i===selectedPad,s.towers.some(a=>a.pad===i)));core(g,t,s.hp,s.maxHp);s.towers.forEach(a=>turret(g,a));s.enemies.forEach(a=>enemy(g,a,t));effects(g,s,settings);if(s.phase==='combat')label(g,'THREATS '+String(s.enemies.length).padStart(2,'0'),w-33,34,C.copper,11,'right');if(selectedPad>=0){let t=s.towers.find(a=>a.pad===selectedPad);if(t){let ranges={pulse:177,ember:153,frost:166,arc:158,rail:220};g.save();g.setLineDash([6,10]);g.beginPath();g.arc(t.x,t.y,(ranges[t.type]||170)*(s.mods.range||1),0,TAU);g.fillStyle='#a0c6b108';g.fill();g.strokeStyle='#dfbb8077';g.stroke();g.restore()}}}
window.VayrhexArt={draw};
})();
