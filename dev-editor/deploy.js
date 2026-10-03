(function(){
"use strict";
const OWNER="jirodasu",REPO="lancers-rankers-demo",BRANCH="main",PATH="config/lancers-tuning.json";
const API=`https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`;
const PUBLIC="../config/lancers-tuning.json";
const $=id=>document.getElementById(id);
let token="",connectedAs="",busy=false;

function headers(){
 return {"Accept":"application/vnd.github+json","Authorization":"Bearer "+token,"X-GitHub-Api-Version":"2026-03-10"};
}
function setDeployStatus(text,kind){
 const el=$("deployStatus");el.textContent=text;el.className="deploy-status "+(kind||"");
}
function utf8b64(s){
 const bytes=new TextEncoder().encode(s);let out="",step=0x8000;
 for(let i=0;i<bytes.length;i+=step)out+=String.fromCharCode(...bytes.subarray(i,i+step));
 return btoa(out);
}
function b64utf8(s){
 const bin=atob((s||"").replace(/\s/g,"")),bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));
 return new TextDecoder().decode(bytes);
}
async function apiJson(url,opt={}){
 const r=await fetch(url,{...opt,headers:{...headers(),...(opt.headers||{})}});
 let data=null;try{data=await r.json()}catch(_){}
 if(!r.ok){
  const err=new Error(data?.message||("GitHub API "+r.status));err.status=r.status;throw err
 }
 return data;
}
async function connect(){
 const input=$("githubToken"),value=input.value.trim();
 if(!value){setDeployStatus("Fine-grained tokenを入力してください","warn");return}
 token=value;input.value="";
 setDeployStatus("GitHubへ接続確認中…","busy");
 try{
  const [user,file]=await Promise.all([
   apiJson("https://api.github.com/user"),
   apiJson(API+"?ref="+encodeURIComponent(BRANCH))
  ]);
  if(!file?.sha)throw new Error("正規設定を読み取れません");
  connectedAs=user.login||OWNER;
  $("githubConnect").textContent="再接続";
  $("githubIdentity").textContent="GitHub: "+connectedAs+" · tokenはこのタブのメモリ内だけで保持";
  $("implementCanonical").disabled=false;
  setDeployStatus("接続済み。本編へ実装できます","ready");
 }catch(e){
  token="";connectedAs="";$("implementCanonical").disabled=true;
  setDeployStatus(e.status===401?"トークンが無効です":e.status===403?"権限が不足しています（Contents: Read and write が必要）":"接続できません: "+e.message,"error");
 }
}
async function waitForPages(updatedAt){
 const deadline=Date.now()+120000;
 while(Date.now()<deadline){
  await new Promise(r=>setTimeout(r,4000));
  try{
   const r=await fetch(PUBLIC+"?implemented="+Date.now(),{cache:"no-store"});
   if(r.ok){const d=await r.json();if(d.updatedAt===updatedAt)return true}
  }catch(_){}
 }
 return false;
}
function diffSummary(oldCfg,newCfg){
 const changes=[];
 const walk=(a,b,path)=>{
  const keys=new Set([...Object.keys(a||{}),...Object.keys(b||{})]);
  for(const k of keys){
   if(["updatedAt","updatedBy"].includes(k))continue;
   const av=a?.[k],bv=b?.[k],p=path?path+"."+k:k;
   if(av&&bv&&typeof av==="object"&&typeof bv==="object"&&!Array.isArray(av)&&!Array.isArray(bv))walk(av,bv,p);
   else if(JSON.stringify(av)!==JSON.stringify(bv))changes.push(p+": "+JSON.stringify(av)+" → "+JSON.stringify(bv));
  }
 };
 walk(oldCfg,newCfg,"");return changes;
}
async function implement(){
 if(busy||!token)return;busy=true;$("implementCanonical").disabled=true;
 try{
  setDeployStatus("GitHubの最新正規設定を確認中…","busy");
  const remote=await apiJson(API+"?ref="+encodeURIComponent(BRANCH));
  const oldCfg=JSON.parse(b64utf8(remote.content));
  const loaded=window.lancersCanonical?.getCanonical?.();
  if(loaded?.updatedAt&&oldCfg.updatedAt!==loaded.updatedAt){
   throw new Error("別の更新が先に入っています。「GitHub正規設定を再読込」してから再実装してください。");
  }
  const adopted=window.lancersCanonical?.buildAdopted?.();
  if(!adopted)throw new Error("現在の調整値を取得できません");
  const changes=diffSummary(oldCfg,adopted);
  if(!changes.length){setDeployStatus("変更はありません。すでに本編と同じ設定です","ready");return}
  const preview=changes.slice(0,8).join("\n")+(changes.length>8?"\n…ほか "+(changes.length-8)+"件":"");
  if(!confirm("この変更を本編へ実装します。\n\n"+preview+"\n\nGitHub mainへ直接コミットしてよいですか？")){setDeployStatus("実装をキャンセルしました","");return}
  setDeployStatus("正規設定をGitHubへコミット中…","busy");
  const body={message:"Apply DEV EDITOR canonical tuning",content:utf8b64(JSON.stringify(adopted,null,2)+"\n"),sha:remote.sha,branch:BRANCH};
  const result=await apiJson(API,{method:"PUT",body:JSON.stringify(body),headers:{"Content-Type":"application/json"}});
  window.lancersCanonical?.markImplemented?.(adopted);
  $("lastImplementation").textContent="commit "+String(result.commit?.sha||"").slice(0,8)+" · "+changes.length+"項目変更";
  setDeployStatus("GitHubへ実装済み。公開版の反映を待っています…","busy");
  const deployed=await waitForPages(adopted.updatedAt);
  if(deployed){
   setDeployStatus("実装完了。公開版も最新設定です","success");
   try{document.getElementById("game").contentWindow.location.reload()}catch(_){}
  }else setDeployStatus("GitHubへの実装は完了。Pagesの公開反映はまだ確認できません","warn");
 }catch(e){
  setDeployStatus("実装できません: "+e.message,"error");
 }finally{busy=false;$("implementCanonical").disabled=!token}
}
function disconnect(){
 token="";connectedAs="";$("implementCanonical").disabled=true;$("githubIdentity").textContent="未接続 · tokenは保存しません";setDeployStatus("GitHub未接続","");$("githubConnect").textContent="接続"
}
function init(){
 $("githubConnect").onclick=connect;$("implementCanonical").onclick=implement;$("githubDisconnect").onclick=disconnect;
 $("githubToken").addEventListener("keydown",e=>{if(e.key==="Enter")connect()});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();