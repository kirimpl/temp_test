/* VAYRHEX: DUST FRONT. Bespoke illustrated 2D battleground.
   Sprite assets are actual SVG image files under assets/art (not emoji/CSS shapes).
   Rendering-only replacement: all pathing, hitboxes, saves and rewards stay in game.js. */
(()=>{'use strict';
const PI=Math.PI, TAU=2*Math.PI;
const art={};
for(const key of ['pulse','ember','frost','arc','rail']){
 const img=new Image();img.decoding='async';img.src='assets/art/tower-'+key+'.svg';art[key]=img;
}
function line(g,p,w,c,dash){if(!p||!p.length)return;g.beginPath();g.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length;i++)g.lineTo(p[i][0],p[i][1]);g.lineCap='round';g.lineJoin='round';g.strokeStyle=c;g.lineWidth=w;g.setLineDash(dash||[]);g.stroke();g.setLineDash([])}
function circ(g,x,y,r,fill,stroke,width=1){g.beginPath();g.arc(x,y,r,0,TAU);if(fill){g.fillStyle=fill;g.fill()}if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.stroke()}}
function poly(g,x,y,r,n,angle,fill,stroke,width=1){g.beginPath();for(let k=0;k<n;k++){let a=angle+k*TAU/n;g[k?'lineTo':'moveTo'](x+Math.cos(a)*r,y+Math.sin(a)*r)}g.closePath();if(fill){g.fillStyle=fill;g.fill()}if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.stroke()}}
function terrain(g,w,h,paths,time){
 const bg=g.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#687b73');bg.addColorStop(.5,'#a59a7d');bg.addColorStop(1,'#7e7d70');g.fillStyle=bg;g.fillRect(0,0,w,h);
 // Sandstone / abandoned service pavement with directional grain.
 for(let i=0;i<54;i++){const x=(i*227+17)%w,y=(i*137+23)%h;const r=18+(i*7)%74;g.globalAlpha=.04+(i%5)*.012;poly(g,x,y,r,6,PI/6,i%2?'#2b4749':'#f5ddb6');}g.globalAlpha=1;
 for(let x=0;x<w;x+=45){line(g,[[x,0],[x,h]],.7,'#d4d3b51e')}
 for(let y=0;y<h;y+=45){line(g,[[0,y],[w,y]],.7,'#132e2a1c')}
 // Sparse concrete joints + rusted machinery. Static landmarks create recognizable place.
 for(const [x,y,k] of [[74,82,1],[315,90,.7],[860,63,.9],[145,472,1],[907,438,.7],[475,69,.6]]){
 g.save();g.translate(x,y);g.rotate(k*.22);g.fillStyle='#3b5554';g.fillRect(-19*k,-10*k,38*k,20*k);
 g.strokeStyle='#dfc6a0';g.lineWidth=2;g.strokeRect(-16*k,-7*k,32*k,14*k);
 g.fillStyle='#b88f6f';g.fillRect(-9*k,-4*k,18*k,8*k);g.restore();
 }
 paths.forEach((p,i)=>{
 line(g,p,49,'#334549');line(g,p,44,'#e9d7b7');line(g,p,39,'#8d8f7e');line(g,p,30,'#b1aa91');line(g,p,27,'#a7a189');
 g.save();g.setLineDash([4,28]);g.lineDashOffset=-((time*4+i*8)%32);line(g,p,3,'#5d6962');g.restore();
 line(g,p,47,'#e5dac244');
 });
 // Important base station silhouette, distinct from freebuild pads.
 g.fillStyle='#1a3337';g.fillRect(785,206,125,127);g.strokeStyle='#e3c8a0';g.lineWidth=4;g.strokeRect(792,213,111,113);
 for(const [x,y] of [[792,213],[903,213],[792,326],[903,326]]){circ(g,x,y,4,'#f0cca0')}
}
function socket(g,x,y,i,time,isSelected,occupied){
 g.save();g.translate(x,y);
 circ(g,2,9,35,'#24383d60');
 poly(g,0,0,33,8,PI/8,'#314b4c','#e1c7a7',3);
 poly(g,0,0,27,8,PI/8,'#708883','#253e42',4);
 poly(g,0,0,20,8,PI/8,occupied?'#31484a':'#263e44','#c5bda1',1.4);
 for(let j=0;j<8;j++){let a=j*TAU/8;circ(g,Math.cos(a)*28,Math.sin(a)*28,2.1,j%2?'#b99f80':'#e2d5bb')}
 if(!occupied){poly(g,0,0,8,4,PI/4,'#d7cbac');}
 if(isSelected){g.strokeStyle='#fff0c6';g.lineWidth=4;g.beginPath();g.arc(0,0,38,-PI*.55,PI*.45);g.stroke();}
 g.restore();
}
function reactor(g,time,hp,max){
 const x=842,y=270;
 g.save();g.translate(x,y);
 circ(g,0,4,92,'#102e3399');
 poly(g,0,0,84,8,PI/8,'#243b42','#ecd4ad',6);
 poly(g,0,0,72,8,PI/8,'#526c6a','#1e3d41',4);
 for(let i=0;i<8;i++){let a=i*TAU/8;g.save();g.translate(Math.cos(a)*70,Math.sin(a)*70);g.rotate(a);g.fillStyle='#e9c595';g.fillRect(-4,-10,8,20);g.restore();}
 poly(g,0,0,60,6,PI/6,'#263b40','#c4ba9c',3);
 poly(g,0,0,48,6,PI/6,'#d4c8a7','#223f42',4);
 poly(g,0,0,34,6,PI/6,'#3a6263','#f5e5c7',3);
 g.save();g.rotate(Math.sin(time*.4)*.09);poly(g,0,0,24,4,PI/4,'#f2ce91','#fff0c9',3);g.restore();
 circ(g,0,0,8,'#fff8d9');
 const ratio=Math.max(0,hp/max);g.strokeStyle=ratio<.3?'#bc614a':'#f3c28f';g.lineWidth=6;g.beginPath();g.arc(0,0,90,-PI/2,-PI/2+TAU*ratio);g.stroke();g.restore();
}
function tower(g,t,time,selected,range){
 g.save();g.translate(t.x,t.y);
 circ(g,2,10,31,'#182f3366');
 if(selected){circ(g,0,0,range,'#e6d19f11','#f3dfae99',1)}
 const img=art[t.type];const size=t.type==='rail'?83:t.type==='ember'?76:75;
 if(img?.complete&&img.naturalWidth){g.rotate(t.rotation||0);g.drawImage(img,-size/2,-size/2,size,size);}
 else{poly(g,0,0,30,8,PI/8,'#516c6b','#e5c89f',3);poly(g,0,0,15,4,PI/4,'#e6d2a2')}
 g.restore();
 for(let i=0;i<Math.min(t.level,6);i++){circ(g,t.x+(i-(Math.min(t.level,6)-1)/2)*8,t.y+34,2.8,'#f4d7a1')}
}
function enemy(g,e,time){
 g.save();g.translate(e.x,e.y);g.rotate(e.angle||0);
 const boss=e.type==='boss',tank=e.type==='tank',fast=e.type==='runner';
 const r=boss?25:tank?19:fast?12:15,main=boss?'#af594b':tank?'#927c68':fast?'#d5ab76':'#a06655';
 poly(g,0,4,r+7,boss?8:6,PI/6,'#293c3d','#f1d6ae',2);
 if(boss){for(let j=0;j<4;j++){const a=j*PI/2;poly(g,Math.cos(a)*31,Math.sin(a)*31,8,4,PI/4,'#9b4642','#ecc398',2)}poly(g,0,0,21,8,PI/8,main,'#e2aa86',3);}
 else if(tank){poly(g,0,0,17,4,PI/4,main,'#f0c99d',3);g.fillStyle='#bfa68c';g.fillRect(-7,-7,14,14)}
 else if(fast){poly(g,5,0,13,3,PI/3,main,'#ffe0a9',2);line(g,[[-15,-8],[-22,0],[-15,8]],3,'#f3d4a9')}
 else{poly(g,0,0,14,5,PI/5,main,'#f2be95',2);poly(g,0,0,7,4,PI/4,'#edbc9c')}
 g.restore();
 const bw=boss?68:38;g.fillStyle='#233438';g.fillRect(e.x-bw/2,e.y-e.r-15,bw,4);g.fillStyle=boss?'#e6a47c':'#e2c196';g.fillRect(e.x-bw/2,e.y-e.r-15,bw*Math.max(0,e.hp/e.maxHp),4);
}
function particle(g,f,opacity){
 const al=Math.max(0,f.life/f.max)*opacity;g.save();g.globalAlpha=al;
 if(f.lightning){line(g,[[f.x,f.y],[(f.x+f.x2)/2+6,(f.y+f.y2)/2-8],[f.x2,f.y2]],4,'#f8e9ba');}
 else{poly(g,f.x,f.y,Math.max(1,f.size*al),4,PI/4,f.color);}
 g.restore();
}
function projectile(g,b,opacity){
 g.save();g.globalAlpha=opacity;
 const dx=b.x-(b.originX??b.x),dy=b.y-(b.originY??b.y),a=Math.atan2(dy,dx);g.translate(b.x,b.y);g.rotate(a);
 const col={pulse:'#d8eee0',ember:'#efaf74',frost:'#dcecf7',arc:'#f4e5a5',rail:'#fff1d6'}[b.type]||'#f9dbad';
 if(b.type==='ember'){poly(g,0,0,9,3,0,col,'#c16d52',2);circ(g,-10,0,4,'#e1a074');}
 else if(b.type==='rail'){line(g,[[-49,0],[20,0]],5,'#e6c48f');line(g,[[-50,-1],[18,-1]],1,'#fff9e7');}
 else if(b.type==='arc'){line(g,[[-23,4],[-12,-5],[1,3],[14,-3]],3,col);}
 else if(b.type==='frost'){poly(g,0,0,11,4,PI/4,col,'#b7dce2',2);line(g,[[-19,0],[-10,0]],2,'#f1f6f1');}
 else{line(g,[[-18,0],[10,0]],4,col);line(g,[[0,-3],[0,3]],1,'#ffffff');}
 g.restore();
}
window.VayrhexArt={draw({ctx:g,W,H,state:s,elapsed:t,pads,paths,settings,selectedPad}){
 terrain(g,W,H,paths,t);
 const chosen=s.towers.find(q=>q.pad===selectedPad);
 pads.forEach(([x,y],i)=>socket(g,x,y,i,t,i===selectedPad,s.towers.some(q=>q.pad===i)));
 reactor(g,t,s.hp,s.maxHp);
 const ranges={pulse:177,ember:153,frost:166,arc:158,rail:220};
 s.towers.forEach(q=>tower(g,q,t,q===chosen,(ranges[q.type]||165)*(s.mods.range||1)));
 s.enemies.forEach(e=>enemy(g,e,t));
 const alpha=(settings.shotOpacity??70)/100,limit=settings.shotLimit??30;
 if(limit>0&&alpha>0){let n=0;for(let i=s.bullets.length-1;i>=0&&n<limit;i--,n++)projectile(g,s.bullets[i],alpha);}
 let n=0;for(let i=s.fx.length-1;i>=0&&n<110;i--,n++){const f=s.fx[i];if(f.shotFx&&(!limit||!alpha))continue;particle(g,f,f.shotFx?alpha:1);}
 }}
})();