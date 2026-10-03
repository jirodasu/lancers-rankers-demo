(function(){
"use strict";
const CONFIG_URL="../config/lancers-tuning.json";
const PENDING_KEY="lancers-canonical-pending-v1";
const $=id=>document.getElementById(id);
let canonical=null;

function api(){return window.lancersDevEditor}
function clone(v){return JSON.parse(JSON.stringify(v))}
function normalizedUi(ui){
 const out={},base=api()?.getUiBaseline?.()||{};
 for(const [id,v] of Object.entries(ui||{})){
   const b=base[id];
   if(b&&Number(v.x)===Number(b.x)&&Number(v.y)===Number(b.y)&&Number(v.w)===Number(b.w)&&Number(v.h)===Number(b.h))continue;
   out[id]=clone(v);
 }
 return out;
}
function configOnly(v){return {ui:normalizedUi(v?.ui||{}),monster:clone(v?.monster||{}),sound:clone(v?.sound||{})}}
function stable(v){return JSON.stringify(v)}
function same(a,b){return stable(configOnly(a))===stable(configOnly(b))}
function pending(){try{return JSON.parse(localStorage.getItem(PENDING_KEY)||"null")}catch(_){return null}}
function setPending(v){localStorage.setItem(PENDING_KEY,JSON.stringify(v))}
function clearPending(){localStorage.removeItem(PENDING_KEY)}

function renderSync(){
 if(!canonical||!api())return;
 const cur=api().getState(),p=pending(),badge=$("canonicalSync"),meta=$("canonicalMeta");
 if(p&&same(p.canonical,canonical)){clearPending()}
 const active=pending();
 if(same(cur,canonical)){
   badge.textContent="GitHub同期済み";badge.className="canonical-sync synced";
   meta.textContent="正規設定 "+(canonical.updatedAt||"")+" を基準に編集中";
 }else if(active&&same(cur,active.canonical)){
   badge.textContent="採用済み・GitHub反映待ち";badge.className="canonical-sync pending";
   meta.textContent="この値が次の正規設定です。更新データをChatGPTへ渡すと以後の作業基準になります。";
 }else{
   badge.textContent="未確定の調整あり";badge.className="canonical-sync dirty";
   meta.textContent="現在の調整はまだ正規設定ではありません。「この状態を採用確定」で固定できます。";
 }
 $("copyCanonicalPayload").disabled=!active;
 $("downloadCanonicalPayload").disabled=!active;
}

function makeCanonical(){
 const state=configOnly(api().getState()),h=state.monster?.hectoran,base=canonical?.monster?.hectoran;
 if(h&&base){
   h.benikiba=h.benikiba||clone(base.benikiba||{});
   if(Number(h.flash)!==Number(base.flash))h.benikiba.flash=h.flash;
   ["normal","charge","break"].forEach(k=>{
     if(Number(h.hitstop?.[k])!==Number(base.hitstop?.[k])){h.benikiba.hitstop=h.benikiba.hitstop||{};h.benikiba.hitstop[k]=h.hitstop[k]}
     if(Number(h.recoil?.[k])!==Number(base.recoil?.[k])){h.benikiba.recoil=h.benikiba.recoil||{};h.benikiba.recoil[k]=h.recoil[k]}
   });
   if(Number(h.shakeFrames)!==Number(base.shakeFrames))h.benikiba.shakeFrames=h.shakeFrames;
 }
 return {
   schema:"lancers-tuning/v1",
   authority:"canonical",
   updatedAt:new Date().toISOString(),
   updatedBy:"LANCERS DEV EDITOR v0.5",
   ...state
 };
}
function makePayload(adopted){
 return {
   type:"LANCERS_CANONICAL_UPDATE",
   repository:"jirodasu/lancers-rankers-demo",
   path:"config/lancers-tuning.json",
   baseUpdatedAt:canonical?.updatedAt||null,
   instruction:"Replace the canonical tuning file with canonical exactly. Preserve these values during unrelated work. Then verify runtime consumption without rebalancing or normalizing them.",
   canonical:adopted
 };
}
function payloadText(p){
 return "LANCERS_CANONICAL_UPDATE\n"+JSON.stringify(p,null,2);
}
async function copyText(text){
 try{await navigator.clipboard.writeText(text);return true}catch(_){
  const ta=document.createElement("textarea");ta.value=text;ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.select();const ok=document.execCommand("copy");ta.remove();return ok
 }
}
async function adopt(){
 const adopted=makeCanonical(),p=makePayload(adopted);
 setPending({canonical:adopted,payload:p,createdAt:adopted.updatedAt});
 renderSync();
 const ok=await copyText(payloadText(p));
 api().setStatus(ok?"採用確定。ChatGPT用の正規更新データをコピーしました":"採用確定。DATAから更新データを保存してください",ok);
}
async function copyPayload(){
 const p=pending();if(!p)return;
 const ok=await copyText(payloadText(p.payload));
 api().setStatus(ok?"ChatGPT用の正規更新データをコピーしました":"コピーできませんでした",ok)
}
function downloadPayload(){
 const p=pending();if(!p)return;
 const a=document.createElement("a");
 a.href=URL.createObjectURL(new Blob([JSON.stringify(p.payload,null,2)],{type:"application/json"}));
 a.download="LANCERS_CANONICAL_UPDATE.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)
}
async function reloadCanonical(){
 try{
  const r=await fetch(CONFIG_URL+"?v="+Date.now(),{cache:"no-store"});
  if(!r.ok)throw new Error("HTTP "+r.status);
  const data=await r.json();
  if(data?.schema!=="lancers-tuning/v1")throw new Error("schema mismatch");
  canonical=data;window.lancersCanonicalConfig=clone(data);
  api().setState(configOnly(data));api().apply();renderSync();
  api().setStatus("GitHubの正規設定を読み込みました",true);
  return data;
 }catch(e){
  api().setStatus("正規設定を読み込めませんでした",false);throw e
 }
}
function bind(){
 $("adoptCanonical").onclick=adopt;
 $("copyCanonicalPayload").onclick=copyPayload;
 $("downloadCanonicalPayload").onclick=downloadPayload;
 $("reloadCanonical").onclick=reloadCanonical;
 document.addEventListener("input",e=>{if(e.target.matches('input[type="range"]'))queueMicrotask(renderSync)},true);
 document.addEventListener("change",()=>queueMicrotask(renderSync),true);
 const frame=$("game");frame?.addEventListener("load",()=>setTimeout(renderSync,1300));
 try{frame?.contentWindow.addEventListener("pointerup",()=>setTimeout(renderSync,0),false)}catch(_){}
}
window.lancersCanonicalReady=(async()=>{
 while(!api())await new Promise(r=>setTimeout(r,40));
 bind();
 try{return await reloadCanonical()}catch(_){renderSync();return null}
})();
function buildAdopted(){return makeCanonical()}
function getCanonical(){return canonical?clone(canonical):null}
function markImplemented(next){
 canonical=clone(next);window.lancersCanonicalConfig=clone(next);clearPending();renderSync();
}
window.lancersCanonical={renderSync,reloadCanonical,adopt,buildAdopted,getCanonical,markImplemented};
})();