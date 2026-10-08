(()=>{'use strict';
const $=id=>document.getElementById(id);
const canvas=$('arena'),ctx=canvas.getContext('2d');
const W=480,H=600,MAX_HP=150,STORAGE='lancers-ranker-factory-drafts-v1';
let roster={},rank=8,boss=null,player=null,mode='loading',clock=0,phase='idle',phaseTime=0,tech=null,aim=null,hit=false,attacks=0,feedback='',feedbackTime=0,last=0,keys=new Set(),stick={id:null,x:0,y:0,ox:0,oy:0},attackHeld=false,trail=[],result='';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const norm=(x,y)=>{const d=Math.hypot(x,y)||1;return{x:x/d,y:y/d}};
const ranks=()=>Object.keys(roster).map(Number).sort((a,b)=>b-a);
const sanitize=(r,k)=>r&&r.rank===Number(k)&&r.runtime==='draft'&&Array.isArray(r.techniques)&&r.techniques.length>0&&r.techniques.every(t=>Array.isArray(t)&&t.length===5&&['thrust','rush','sweep','projectile','orbit','combo'].includes(t[0])&&typeof t[1]==='string'&&t.slice(2).every(v=>Number.isFinite(v)&&v>0))&&Number.isFinite(r.hp)&&r.hp>0;
function saveBest(r,grade){try{const key='lancers-arena-best-'+r;const order={S:4,A:3,B:2,C:1};const prev=localStorage.getItem(key);if(!prev||order[grade]>order[prev])localStorage.setItem(key,grade)}catch(_){}}
function showOverlay(title,description,button){$('overlayTitle').textContent=title;$('overlayText').textContent=description;$('start').textContent=button;$('overlay').hidden=false}
function hideOverlay(){$('overlay').hidden=true}
function loadRank(n){
 rank=roster[n]?n:ranks()[0];const r=roster[rank];if(!r)return;
 boss={x:240,y:210,hp:r.hp,max:r.hp,angle:0,step:0,orbit:1};
 player={x:240,y:435,hp:MAX_HP,max:MAX_HP,inv:0,atk:0,dash:0,dashCD:0,dir:{x:0,y:-1}};
 mode='ready';clock=0;phase='idle';phaseTime=.8;tech=null;aim=null;hit=false;attacks=0;feedback='';feedbackTime=0;trail=[];result='';
 $('rankSelect').value=String(rank);$('bossName').textContent=r.displayName;
 $('bossInfo').textContent='戦闘型: '+r.behavior+' / 技 '+r.techniques.length+'種。赤い予告を避け、敵の硬直中に反撃してください。';
 $('phase').textContent='攻撃予告を見て回避';$('grade').textContent='—';updateHud();
 showOverlay(r.displayName,'赤い攻撃予告を避けて、敵に近づき「攻撃」。移動はWASD／矢印、スマホは左側ドラッグ。','戦闘開始');
}
function start(){if(!roster[rank])return;if(mode==='won'||mode==='lost')loadRank(rank);mode='playing';hideOverlay();last=performance.now()}
function finish(won){
 mode=won?'won':'lost';const r=roster[rank];const g=clock<=r.clearRank.s?'S':clock<=r.clearRank.a?'A':clock<=r.clearRank.b?'B':'C';
 result=won?g:'—';if(won)saveBest(rank,g);$('grade').textContent=won?'評価 '+g:'敗北';
 showOverlay(won?'RANK '+String(rank).padStart(2,'0')+' CLEAR':'敗北',won?'撃破 '+clock.toFixed(1)+'秒 / 評価 '+g+'。次のランカーに挑戦できます。':'予告の外側へ移動し、回避ボタンの無敵時間を活用してください。',won?'もう一度戦う':'再挑戦');
}
function next(){const rs=ranks(),i=rs.indexOf(rank);loadRank(rs[(i+1)%rs.length])}
function updateHud(){
 if(!boss||!player)return;
 $('time').textContent=clock.toFixed(1)+'s';
 $('bossBar').style.width=clamp(boss.hp/boss.max*100,0,100)+'%';
 $('playerBar').style.width=clamp(player.hp/player.max*100,0,100)+'%';
 $('bossHp').textContent=Math.ceil(Math.max(0,boss.hp))+'/'+Math.ceil(boss.max);
 $('playerHp').textContent=Math.ceil(Math.max(0,player.hp));
}
function chooseAttack(){
 const r=roster[rank],list=r.techniques;
 const offset=boss.hp<boss.max*.45?2:0;
 tech=list[(attacks+offset)%list.length];attacks++;
 phase='tell';phaseTime=clamp(tech[2],.3,2.5);hit=false;
 const dx=player.x-boss.x,dy=player.y-boss.y,d=norm(dx,dy);
 aim={x:boss.x,y:boss.y,dx:d.x,dy:d.y,tx:player.x,ty:player.y};
 $('phase').textContent='予告：'+tech[1]+'（赤い範囲から離れる）';
}
function isHitShape(x,y,t,a){
 if(!a||!t)return false;
 const dx=x-a.x,dy=y-a.y,along=dx*a.dx+dy*a.dy,side=Math.abs(dx*a.dy-dy*a.dx);
 switch(t[0]){
 case 'thrust':return along>=-12&&along<=290&&side<25;
 case 'rush':return along>=-24&&along<=340&&side<37;
 case 'projectile':return along>=-16&&along<=580&&side<21;
 case 'sweep':return Math.abs(Math.hypot(dx,dy)-108)<35;
 case 'combo':return Math.abs(Math.hypot(dx,dy)-96)<47;
 case 'orbit':return Math.abs(Math.hypot(dx,dy)-135)<34;
 default:return false;
 }
}
function moveBoss(dt){
 const r=roster[rank],v=norm(player.x-boss.x,player.y-boss.y),d=dist(player,boss);
 let speed=46,target=125;
 if(r.behavior==='guard-counter'){speed=35;target=105}
 if(r.behavior==='fire-dance'){speed=88;target=148}
 if(r.behavior==='speed-rush'){speed=112;target=110}
 if(r.behavior==='feint'){speed=70;target=145}
 if(r.behavior==='pierce'){speed=42;target=165}
 if(r.behavior==='range-control'){speed=67;target=205}
 if(r.behavior==='foresight'){speed=68;target=165}
 if(r.behavior==='adaptive'){speed=86;target=boss.hp<boss.max*.45?105:170}
 const radial=clamp((d-target)/65,-1,1),orbit=['fire-dance','feint','foresight','adaptive'].includes(r.behavior)?0.7:0.2;
 boss.x=clamp(boss.x+(v.x*radial-v.y*orbit)*speed*dt,32,448);
 boss.y=clamp(boss.y+(v.y*radial+v.x*orbit)*speed*dt,105,548);
}
function damagePlayer(n){
 if(player.inv>0)return;
 player.hp=Math.max(0,player.hp-n);player.inv=.68;
 feedback='被弾 -'+n;feedbackTime=.55;
 if(player.hp<=0)finish(false);
}
function strike(){
 if(mode!=='playing'||player.atk>0)return;
 player.atk=.29;const d=dist(player,boss);
 if(d<110){const damage=26;boss.hp=Math.max(0,boss.hp-damage);feedback='HIT '+damage;feedbackTime=.3;trail.push({x:boss.x,y:boss.y,t:.28});if(boss.hp<=0)finish(true)}
 else{feedback='届かない — 近づこう';feedbackTime=.4}
}
function dodge(){
 if(mode!=='playing'||player.dashCD>0)return;
 player.dash=.23;player.dashCD=1.15;player.inv=Math.max(player.inv,.28);
 const d=movement();if(Math.hypot(d.x,d.y)>.1)player.dir=d;
 feedback='DODGE';feedbackTime=.25;
}
function movement(){
 let x=0,y=0;
 if(keys.has('ArrowLeft')||keys.has('a'))x--;
 if(keys.has('ArrowRight')||keys.has('d'))x++;
 if(keys.has('ArrowUp')||keys.has('w'))y--;
 if(keys.has('ArrowDown')||keys.has('s'))y++;
 x+=stick.x;y+=stick.y;
 const len=Math.hypot(x,y);return len>.02?{x:x/Math.max(1,len),y:y/Math.max(1,len)}:{x:0,y:0};
}
function tick(dt){
 if(mode!=='playing')return;
 clock+=dt;player.inv=Math.max(0,player.inv-dt);player.atk=Math.max(0,player.atk-dt);player.dash=Math.max(0,player.dash-dt);player.dashCD=Math.max(0,player.dashCD-dt);feedbackTime=Math.max(0,feedbackTime-dt);
 const m=movement(),speed=player.dash>0?470:200;
 if(m.x||m.y)player.dir=m;
 player.x=clamp(player.x+m.x*speed*dt,22,458);player.y=clamp(player.y+m.y*speed*dt,95,555);
 if(attackHeld||keys.has('j')||keys.has(' '))strike();
 if(keys.has('k')&&player.dashCD<=0)dodge();
 if(phase==='idle')moveBoss(dt);
 phaseTime-=dt;
 if(phaseTime<=0){
  if(phase==='idle')chooseAttack();
  else if(phase==='tell'){phase='active';phaseTime=clamp(tech[3],.16,.9);$('phase').textContent='攻撃中：'+tech[1];if(tech[0]==='rush'){boss.x=clamp(aim.x+aim.dx*135,32,448);boss.y=clamp(aim.y+aim.dy*135,105,548)}}
  else if(phase==='active'){phase='recover';phaseTime=clamp(roster[rank].chance,.4,1.6);$('phase').textContent='反撃チャンス！';}
  else if(phase==='recover'){phase='idle';phaseTime=.18;}
 }
 if(phase==='active'&&!hit&&isHitShape(player.x,player.y,tech,aim)){
  hit=true;damagePlayer(tech[4]);
 }
 for(const v of trail)v.t-=dt;trail=trail.filter(v=>v.t>0);
 updateHud();
}
function shapeDraw(t,a,alpha,color){
 if(!t||!a)return;ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.strokeStyle=color;
 const kind=t[0],angle=Math.atan2(a.dy,a.dx);
 ctx.translate(a.x,a.y);ctx.rotate(angle);
 if(kind==='thrust'||kind==='rush'||kind==='projectile'){
  const len=kind==='projectile'?580:kind==='rush'?340:290,width=kind==='projectile'?42:kind==='rush'?74:50;
  ctx.fillRect(0,-width/2,len,width);
  ctx.strokeStyle='#ffe6d4';ctx.lineWidth=2;ctx.strokeRect(0,-width/2,len,width);
 }else{
  const radius=kind==='sweep'?108:kind==='combo'?96:135,thick=kind==='sweep'?70:kind==='combo'?94:68;
  ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.lineWidth=thick;ctx.stroke();
  ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.lineWidth=2;ctx.strokeStyle='#ffe6d4';ctx.stroke();
 }
 ctx.restore();
}
function draw(){
 ctx.fillStyle='#07101b';ctx.fillRect(0,0,W,H);
 ctx.fillStyle='#0d1c2c';ctx.fillRect(16,86,448,478);
 ctx.strokeStyle='#294259';ctx.lineWidth=2;ctx.strokeRect(16,86,448,478);
 ctx.strokeStyle='#203448';ctx.lineWidth=1;
 for(let x=32;x<470;x+=32){ctx.beginPath();ctx.moveTo(x,86);ctx.lineTo(x,564);ctx.stroke()}
 for(let y=94;y<565;y+=32){ctx.beginPath();ctx.moveTo(16,y);ctx.lineTo(464,y);ctx.stroke()}
 ctx.textAlign='center';ctx.font='800 12px sans-serif';ctx.fillStyle='#66839f';ctx.fillText('THE RANKER ARENA / PROTOTYPE',240,65);
 if(!boss||!player)return;
 if(phase==='tell')shapeDraw(tech,aim,.23+Math.sin(performance.now()/95)*.06,'#ff5e66');
 if(phase==='active')shapeDraw(tech,aim,.42,'#ffca6a');
 ctx.save();ctx.translate(boss.x,boss.y);
 ctx.shadowColor='#e4ae71';ctx.shadowBlur=18;
 ctx.fillStyle='#142338';ctx.strokeStyle='#f0c87d';ctx.lineWidth=4;
 ctx.beginPath();for(let i=0;i<6;i++){const a=Math.PI*i/3-Math.PI/2;const x=Math.cos(a)*25,y=Math.sin(a)*25;if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.closePath();ctx.fill();ctx.stroke();
 ctx.shadowBlur=0;ctx.strokeStyle='#e7c989';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(0,-30);ctx.lineTo(0,35);ctx.stroke();
 ctx.fillStyle='#fff0c7';ctx.beginPath();ctx.moveTo(0,-40);ctx.lineTo(-7,-24);ctx.lineTo(7,-24);ctx.closePath();ctx.fill();ctx.restore();
 ctx.save();ctx.translate(player.x,player.y);
 ctx.globalAlpha=player.inv>0&&Math.floor(performance.now()/80)%2?0.48:1;
 ctx.fillStyle=player.dash>0?'#e9f6ff':'#72c9e1';ctx.strokeStyle='#d3f4ff';ctx.lineWidth=3;
 ctx.beginPath();ctx.arc(0,0,18,0,Math.PI*2);ctx.fill();ctx.stroke();
 ctx.rotate(Math.atan2(player.dir.y,player.dir.x)+Math.PI/2);ctx.fillStyle='#d3f4ff';ctx.beginPath();ctx.moveTo(0,-26);ctx.lineTo(-8,-11);ctx.lineTo(8,-11);ctx.closePath();ctx.fill();
 if(player.atk>.10){ctx.strokeStyle='#e7c989';ctx.lineWidth=8;ctx.beginPath();ctx.arc(0,0,73,-Math.PI*.95,-Math.PI*.05);ctx.stroke()}
 ctx.restore();
 for(const v of trail){ctx.strokeStyle='#e7c989';ctx.globalAlpha=v.t/.28;ctx.lineWidth=5;ctx.beginPath();ctx.arc(v.x,v.y,36-v.t*36,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1}
 if(feedbackTime>0){ctx.textAlign='center';ctx.fillStyle='#f6d79b';ctx.font='900 19px sans-serif';ctx.fillText(feedback,240,120)}
 ctx.textAlign='left';ctx.font='700 11px sans-serif';ctx.fillStyle='#91a8bd';ctx.fillText('赤＝予告 / 金＝攻撃中',27,584);
}
function loop(now){const dt=Math.min(.04,(now-(last||now))/1000);last=now;tick(dt);draw();requestAnimationFrame(loop)}
function stickUpdate(e){
 const rect=canvas.getBoundingClientRect(),scale=W/rect.width;
 const x=(e.clientX-rect.left)*scale,y=(e.clientY-rect.top)*H/rect.height;
 const dx=x-stick.ox,dy=y-stick.oy,len=Math.hypot(dx,dy);
 stick.x=dx/Math.max(60,len);stick.y=dy/Math.max(60,len);
 $('stickKnob').style.transform='translate('+Math.round(stick.x*24)+'px,'+Math.round(stick.y*24)+'px)';
}
canvas.addEventListener('pointerdown',e=>{if(mode!=='playing'||stick.id!==null)return;const rect=canvas.getBoundingClientRect();if(e.clientX-rect.left>rect.width*.55)return;stick.id=e.pointerId;stick.ox=(e.clientX-rect.left)*W/rect.width;stick.oy=(e.clientY-rect.top)*H/rect.height;canvas.setPointerCapture(e.pointerId);stickUpdate(e)});
canvas.addEventListener('pointermove',e=>{if(stick.id===e.pointerId)stickUpdate(e)});
function stickRelease(e){if(stick.id!==e.pointerId)return;stick.id=null;stick.x=0;stick.y=0;$('stickKnob').style.transform='translate(0,0)'}
canvas.addEventListener('pointerup',stickRelease);canvas.addEventListener('pointercancel',stickRelease);window.addEventListener('blur',()=>{keys.clear();attackHeld=false;stick.id=null;stick.x=stick.y=0});
$('attack').addEventListener('pointerdown',e=>{e.preventDefault();attackHeld=true;strike()});
for(const name of ['pointerup','pointercancel','pointerleave'])$('attack').addEventListener(name,()=>attackHeld=false);
$('attack').addEventListener('click',()=>strike());
$('dodge').addEventListener('pointerdown',e=>{e.preventDefault();dodge()});
window.addEventListener('keydown',e=>{const k=e.key.length===1?e.key.toLowerCase():e.key;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','j','k','w','a','s','d'].includes(k))e.preventDefault();keys.add(k);if(k==='j'||k===' ')strike();if(k==='k')dodge();if(k==='Enter'&&mode!=='playing')start()});
window.addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));
$('start').onclick=start;$('restart').onclick=()=>loadRank(rank);$('next').onclick=next;$('rankSelect').onchange=e=>loadRank(Number(e.target.value));
async function boot(){
 try{
  let f;
  try{const r=await fetch('../config/lancers-tuning.json',{cache:'no-store'});if(!r.ok)throw Error('canonical HTTP '+r.status);f=(await r.json()).rankerFactory}
  catch(_){const r=await fetch('../config/ranker-factory.json',{cache:'no-store'});if(!r.ok)throw Error('設定を取得できません');f=await r.json()}
  if(!f||!f.drafts)throw Error('ランカー下書きがありません');
  roster={};for(const [k,r] of Object.entries(f.drafts))if(sanitize(r,k))roster[k]=r;
  // The Factory editor saves browser-local edits under this key.
  try{const saved=JSON.parse(localStorage.getItem(STORAGE)||'{}');for(const [k,r] of Object.entries(saved))if(sanitize(r,k)&&roster[k])roster[k]=r}catch(_){}
  if(ranks().length!==8)throw Error('試作ランカーが8体揃っていません（現在'+ranks().length+'体）');
  $('rankSelect').innerHTML='';for(const n of ranks()){const o=document.createElement('option');o.value=n;o.textContent='RANK '+String(n).padStart(2,'0')+' — '+roster[n].displayName;$('rankSelect').append(o)}
  const n=Number(new URLSearchParams(location.search).get('rank'));loadRank(roster[n]?n:8);
 }catch(e){mode='error';showOverlay('読み込みに失敗しました',String(e.message||e),'再読み込み');$('start').onclick=()=>location.reload()}
}
requestAnimationFrame(loop);boot();
})();
