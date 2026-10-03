(function(){
"use strict";
const REPO="jirodasu/lancers-rankers-demo",PUBLIC="../config/lancers-tuning.json";
const $=id=>document.getElementById(id);
let waiting=false;

function setStatus(text,kind){
 const el=$("implementStatus");if(!el)return;el.textContent=text;el.className="implement-status "+(kind||"");
}
function sameConfig(a,b){
 const pick=v=>({ui:v?.ui||{},monster:v?.monster||{},sound:v?.sound||{}});
 return JSON.stringify(pick(a))===JSON.stringify(pick(b));
}
function summarize(a,b){
 const out=[];
 const walk=(x,y,p)=>{
  const keys=new Set([...Object.keys(x||{}),...Object.keys(y||{})]);
  for(const k of keys){
   if(["updatedAt","updatedBy"].includes(k))continue;
   const xv=x?.[k],yv=y?.[k],n=p?p+"."+k:k;
   if(xv&&yv&&typeof xv==="object"&&typeof yv==="object"&&!Array.isArray(xv)&&!Array.isArray(yv))walk(xv,yv,n);
   else if(JSON.stringify(xv)!==JSON.stringify(yv))out.push(n+": "+JSON.stringify(xv)+" → "+JSON.stringify(yv));
  }
 };
 walk(a,b,"");return out;
}
async function publicConfig(){
 const r=await fetch(PUBLIC+"?t="+Date.now(),{cache:"no-store"});
 if(!r.ok)throw new Error("正規設定を取得できません");
 return r.json();
}
function issueUrl(adopted,base,changes){
 const title="[LANCERS DEV IMPLEMENT] "+new Date().toLocaleString("ja-JP");
 const body=[
  "LANCERS DEV EDITOR からの実装リクエストです。",
  "",
  "**変更数:** "+changes.length,
  "",
  "変更概要:",
  ...changes.slice(0,20).map(x=>"- "+x),
  changes.length>20?"- …ほか "+(changes.length-20)+"件":"",
  "",
  "<!-- LANCERS_BASE_UPDATED_AT: "+base.updatedAt+" -->",
  "<!-- LANCERS_CANONICAL_START -->",
  "```json",
  JSON.stringify(adopted,null,2),
  "```",
  "<!-- LANCERS_CANONICAL_END -->",
  "",
  "このIssueを作成すると、所有者本人からのリクエストだけをGitHub Actionsが検証し、正規設定へ反映します。"
 ].filter(Boolean).join("\n");
 return "https://github.com/"+REPO+"/issues/new?title="+encodeURIComponent(title)+"&body="+encodeURIComponent(body);
}
async function waitForImplementation(adopted){
 if(waiting)return;waiting=true;
 const deadline=Date.now()+180000;
 while(Date.now()<deadline){
  await new Promise(r=>setTimeout(r,4500));
  try{
   const live=await publicConfig();
   if(live.updatedAt===adopted.updatedAt){
    window.lancersCanonical?.markImplemented?.(live);
    setStatus("実装完了。公開版もこの設定になりました","success");
    try{document.getElementById("game").contentWindow.location.reload()}catch(_){}
    waiting=false;return;
   }
  }catch(_){}
 }
 setStatus("GitHub側の処理待ちです。DATAの「GitHub正規設定を再読込」で後から確認できます","warn");waiting=false;
}
async function implement(){
 try{
  setStatus("最新の正規設定と差分を確認中…","busy");
  const base=await publicConfig(),loaded=window.lancersCanonical?.getCanonical?.();
  if(loaded?.updatedAt&&base.updatedAt!==loaded.updatedAt){
   setStatus("正規設定が更新されています。再読込してから実装してください","error");return;
  }
  const adopted=window.lancersCanonical?.buildAdopted?.();
  if(!adopted){setStatus("現在値を取得できません","error");return}
  if(sameConfig(base,adopted)){setStatus("変更なし。本編はすでにこの設定です","ready");return}
  const changes=summarize(base,adopted),url=issueUrl(adopted,base,changes);
  if(url.length>7800){
   setStatus("変更量が多いため実装データが大きすぎます。JSON保存を使ってください","error");return;
  }
  const w=window.open(url,"_blank","noopener");
  if(!w){setStatus("GitHub確認画面を開けませんでした。ポップアップを許可してください","error");return}
  setStatus("GitHub確認画面を開きました。「Submit new issue」で実装開始します","confirm");
  waitForImplementation(adopted);
 }catch(e){setStatus("実装準備に失敗: "+e.message,"error")}
}
function init(){
 $("implementCanonical").onclick=implement;
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();