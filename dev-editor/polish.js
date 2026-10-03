(function(){
"use strict";
const $=id=>document.getElementById(id);
function toast(message){
 let t=$("craft-toast");if(!t){t=document.createElement("div");t.id="craft-toast";t.setAttribute("role","status");t.setAttribute("aria-live","polite");document.body.appendChild(t)}
 t.textContent=message;t.classList.remove("show");requestAnimationFrame(()=>t.classList.add("show"));clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove("show"),1800)
}
function rangePaint(el){
 const min=Number(el.min||0),max=Number(el.max||100),v=Number(el.value||0),p=max===min?0:(v-min)/(max-min)*100;
 el.style.setProperty("--range-p",p+"%")
}
function enhanceRanges(){
 document.querySelectorAll('input[type="range"]').forEach(el=>{rangePaint(el);el.addEventListener("input",()=>{rangePaint(el);el.closest(".row")?.classList.add("tuning")});el.addEventListener("change",()=>{el.closest(".row")?.classList.remove("tuning");toast("調整を記録しました")})})
}
function enhanceA11y(){
 document.querySelector("header")?.setAttribute("role","banner");
 $("status")?.setAttribute("aria-live","polite");
 document.querySelector(".tabs")?.setAttribute("role","tablist");
 const tabs=[...document.querySelectorAll(".tab")];
 tabs.forEach((b,i)=>{
  b.setAttribute("role","tab");b.setAttribute("aria-controls","pane-"+b.dataset.tab);b.setAttribute("aria-selected",b.classList.contains("active")?"true":"false");b.setAttribute("tabindex",b.classList.contains("active")?"0":"-1");b.id="tab-"+b.dataset.tab;
  b.addEventListener("click",()=>tabs.forEach(x=>{x.setAttribute("aria-selected",x===b?"true":"false");x.setAttribute("tabindex",x===b?"0":"-1")}));
  b.addEventListener("keydown",e=>{if(!["ArrowLeft","ArrowRight","Home","End"].includes(e.key))return;e.preventDefault();let n=e.key==="Home"?0:e.key==="End"?tabs.length-1:(i+(e.key==="ArrowRight"?1:-1)+tabs.length)%tabs.length;tabs[n].click();tabs[n].focus()})
 });
 document.querySelectorAll(".pane").forEach(p=>{p.setAttribute("role","tabpanel");const n=p.id.replace("pane-","");p.setAttribute("aria-labelledby","tab-"+n)});
 document.querySelectorAll(".row").forEach(row=>{const label=row.querySelector("label"),input=row.querySelector("input,select");if(label&&input&&!input.getAttribute("aria-label"))input.setAttribute("aria-label",label.textContent.trim())});
 [["bootGame","本編を起動"],["reloadGame","本編を再読み込み"],["undoHistory","調整を元に戻す"],["redoHistory","調整をやり直す"]].forEach(([id,label])=>$(id)?.setAttribute("aria-label",label));
}
function keymap(e){
 const tag=(e.target.tagName||"").toLowerCase(),typing=tag==="input"&&e.target.type!=="range"||tag==="textarea";
 if(typing)return;
 const mod=e.metaKey||e.ctrlKey;
 if(mod&&e.key.toLowerCase()==="z"){e.preventDefault();if(e.shiftKey)window.lancersDevHistory?.redo();else window.lancersDevHistory?.undo();toast(e.shiftKey?"Redo":"Undo");return}
 if(mod&&e.key.toLowerCase()==="y"){e.preventDefault();window.lancersDevHistory?.redo();toast("Redo");return}
 if(mod&&e.key.toLowerCase()==="s"){e.preventDefault();$("saveLocal")?.click();toast("セッションを保存しました");return}
 if(e.altKey&&/^[1-5]$/.test(e.key)){e.preventDefault();document.querySelectorAll(".tab")[Number(e.key)-1]?.click();return}
 if(e.key==="Escape")$("stopBgm")?.click()
}
function installCraftFeedback(){
 const style=document.createElement("style");style.textContent=`
 input[type=range]{appearance:none;background:linear-gradient(90deg,var(--gold) 0 var(--range-p,50%),#26394f var(--range-p,50%) 100%);height:3px;border-radius:4px;margin:10px 0}
 input[type=range]::-webkit-slider-thumb{appearance:none;width:15px;height:15px;border-radius:50%;background:#f0d59b;border:3px solid #111b28;box-shadow:0 0 0 1px #a98d55,0 3px 9px #0008;transition:transform .14s var(--ease),box-shadow .14s}
 input[type=range]:hover::-webkit-slider-thumb,.row.tuning input[type=range]::-webkit-slider-thumb{transform:scale(1.16);box-shadow:0 0 0 1px #d9ba79,0 0 0 5px rgba(217,186,121,.09),0 4px 12px #0008}
 .row.tuning output{color:#fff1c9;text-shadow:0 0 14px rgba(217,186,121,.3)}
 #craft-toast{position:fixed;z-index:3000;left:50%;bottom:22px;transform:translate(-50%,12px);opacity:0;pointer-events:none;padding:9px 13px;border:1px solid #3d536c;border-radius:99px;background:rgba(9,17,27,.92);backdrop-filter:blur(12px);box-shadow:0 12px 38px #0008;color:#cbd9e6;font:700 10px/1 system-ui;letter-spacing:.05em;transition:opacity .2s var(--ease),transform .2s var(--ease)}
 #craft-toast.show{opacity:1;transform:translate(-50%,0)}
 .device iframe{opacity:.985;transition:opacity .25s}.device:hover iframe{opacity:1}
 @media(prefers-reduced-motion:reduce){#craft-toast{transition:none!important}}
 `;document.head.appendChild(style)
}
function init(){
 installCraftFeedback();enhanceRanges();enhanceA11y();document.addEventListener("keydown",keymap);
 const observer=new MutationObserver(()=>document.querySelectorAll('input[type="range"]').forEach(rangePaint));observer.observe(document.body,{subtree:true,childList:true});
 const brand=document.querySelector(".brand small");if(brand)brand.textContent="LIVE TUNING / v0.5 · IMPLEMENT";
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();