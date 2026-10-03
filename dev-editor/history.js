(function(){
"use strict";
const STORE="lancers-dev-editor-history-v02",$=id=>document.getElementById(id);
let entries=[],cursor=-1,snapshots=[],baseline=null,lastSerialized="",suppress=false;
const labels={x:"UI X",y:"UI Y",w:"UI 幅",h:"UI 高さ",flash:"被弾表示",fxScale:"FX倍率",fxLife:"FX時間",hsNormal:"通常 HITSTOP",hsCharge:"溜め HITSTOP",hsBreak:"BREAK HITSTOP",recoilNormal:"通常リアクション",recoilCharge:"溜めリアクション",recoilBreak:"BREAKリアクション",shakePx:"画面揺れ強度",shakeFrames:"画面揺れ時間",fxType:"HITエフェクト種類",seVolume:"SE音量",fileNormal:"通常HIT SE",fileCharge:"溜めHIT SE",fileBreak:"BREAK SE",fileBgm:"BGM"};
const paths={flash:"monster.hectoran.flash",fxScale:"monster.hectoran.fxScale",fxLife:"monster.hectoran.fxLife",hsNormal:"monster.hectoran.hitstop.normal",hsCharge:"monster.hectoran.hitstop.charge",hsBreak:"monster.hectoran.hitstop.break",recoilNormal:"monster.hectoran.recoil.normal",recoilCharge:"monster.hectoran.recoil.charge",recoilBreak:"monster.hectoran.recoil.break",shakePx:"monster.hectoran.shakePx",shakeFrames:"monster.hectoran.shakeFrames",fxType:"monster.hectoran.fxType",seVolume:"sound.volume",fileNormal:"sound.files.normal",fileCharge:"sound.files.charge",fileBreak:"sound.files.break",fileBgm:"sound.files.bgm"};
function api(){return window.lancersDevEditor} function clone(v){return JSON.parse(JSON.stringify(v))}
function current(){return api()?clone(api().getState()):null} function serial(v){return JSON.stringify(v)}
function valAt(o,path){try{return path.split(".").reduce((a,k)=>a[k],o)}catch(_){return undefined}}
function describe(before,after,source){
 const id=source&&source.id||"";
 if(["x","y","w","h"].includes(id)){const tid=$("target").value,t=after.ui?.[tid],b=before.ui?.[tid],key=id;return `${$("target").selectedOptions[0].text} / ${labels[id]}: ${b?.[key]??"-"} → ${t?.[key]??"-"}`}
 if(paths[id])return `${labels[id]}: ${valAt(before,paths[id])} → ${valAt(after,paths[id])}`;
 return "パラメーター調整";
}
function persist(){localStorage.setItem(STORE,JSON.stringify({entries,cursor,snapshots,baseline}))}
function loadPersisted(){try{const d=JSON.parse(localStorage.getItem(STORE)||"null");if(d){entries=d.entries||[];cursor=Number.isInteger(d.cursor)?d.cursor:entries.length-1;snapshots=d.snapshots||[];baseline=d.baseline||null}}catch(_){}}
function record(source,label){
 if(suppress||!api())return;const now=current(),s=serial(now);if(!now||s===lastSerialized)return;
 const before=cursor>=0?entries[cursor].state:(baseline||now);if(cursor<entries.length-1)entries=entries.slice(0,cursor+1);
 entries.push({id:Date.now()+"-"+Math.random().toString(36).slice(2,7),time:new Date().toISOString(),label:label||describe(before,now,source),state:now});
 if(entries.length>200)entries.shift();cursor=entries.length-1;lastSerialized=s;persist();render();
}
function restore(st,msg){if(!api()||!st)return;suppress=true;api().setState(clone(st));api().apply();lastSerialized=serial(current());suppress=false;if(msg)api().setStatus(msg,true);render()}
function undo(){if(cursor<0)return;const target=cursor===0?(baseline||entries[0].state):entries[cursor-1].state;cursor--;restore(target,"1つ前の調整へ戻しました");persist()}
function redo(){if(cursor>=entries.length-1)return;cursor++;restore(entries[cursor].state,"調整をやり直しました");persist()}
function fmt(t){return new Date(t).toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function render(){
 const list=$("historyList");if(!list)return;$("undoHistory").disabled=cursor<0;$("redoHistory").disabled=cursor>=entries.length-1;$("historyCount").textContent=entries.length+"件";
 list.innerHTML=entries.length?entries.slice().reverse().map((e,ri)=>{const i=entries.length-1-ri,a=i===cursor;return `<button class="history-item ${a?"current":""}" data-history-index="${i}"><span>${fmt(e.time)}</span><b>${esc(e.label)}</b>${a?"<em>現在</em>":""}</button>`}).join(""):'<div class="history-empty">まだ調整履歴はありません</div>';
 list.querySelectorAll("[data-history-index]").forEach(b=>b.onclick=()=>{cursor=Number(b.dataset.historyIndex);restore(entries[cursor].state,"選択した履歴へ復元しました");persist()});
 const sl=$("snapshotList");sl.innerHTML=snapshots.length?snapshots.slice().reverse().map(s=>`<div class="snapshot"><div><b>${esc(s.name)}</b><span>${fmt(s.time)} · ${esc(s.rating||"未評価")}</span><small>${esc(s.note||"")}</small></div><button data-snap="${s.id}">復元</button></div>`).join(""):'<div class="history-empty">保存した案はありません</div>';
 sl.querySelectorAll("[data-snap]").forEach(b=>b.onclick=()=>{const s=snapshots.find(x=>x.id===b.dataset.snap);if(s)restore(s.state,"「"+s.name+"」を復元しました")});
}
function saveSnapshot(){const name=$("snapshotName").value.trim()||"案 "+(snapshots.length+1);snapshots.push({id:Date.now()+"s",time:new Date().toISOString(),name,rating:$("snapshotRating").value,note:$("snapshotNote").value.trim(),state:current()});$("snapshotName").value="";$("snapshotNote").value="";persist();render();api().setStatus("「"+name+"」を保存しました",true)}
function exportPayload(){return {format:"lancers-dev-editor-v0.2",config:current(),history:{entries,cursor,snapshots,baseline}}}
function downloadJson(){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(exportPayload(),null,2)],{type:"application/json"}));a.download="lancers-dev-config-with-history.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function importPayload(obj){if(!obj||!obj.config)return false;suppress=true;api().setState(obj.config);api().apply();suppress=false;const h=obj.history||{};entries=h.entries||[];cursor=Number.isInteger(h.cursor)?h.cursor:entries.length-1;snapshots=h.snapshots||[];baseline=h.baseline||clone(obj.config);lastSerialized=serial(current());persist();render();return true}
function init(){
 if(!api()){setTimeout(init,150);return}loadPersisted();baseline=baseline||current();lastSerialized=serial(current());
 $("undoHistory").onclick=undo;$("redoHistory").onclick=redo;$("saveSnapshot").onclick=saveSnapshot;
 $("clearHistory").onclick=()=>{if(confirm("調整履歴を消去しますか？ 名前付きスナップショットは残します。")){entries=[];cursor=-1;baseline=current();lastSerialized=serial(baseline);persist();render()}};
 document.addEventListener("change",e=>{if(labels[e.target.id])setTimeout(()=>record(e.target),0)},true);
 ["resetTarget","resetUI"].forEach(id=>$(id)?.addEventListener("click",e=>setTimeout(()=>record(e.target,e.target.textContent.trim()),0)));
 const frame=$("game");function hookFrame(){try{frame.contentWindow.addEventListener("pointerup",()=>setTimeout(()=>record(null,"UIをドラッグ移動"),0),false)}catch(_){}}
 frame.addEventListener("load",()=>setTimeout(hookFrame,1200));hookFrame();
 $("downloadJson").onclick=downloadJson;
 $("importJson").onchange=function(){const f=this.files[0];if(!f)return;f.text().then(t=>{const obj=JSON.parse(t);if(importPayload(obj))api().setStatus("履歴付きJSONを読み込みました",true);else{api().setState(obj);api().apply();record(null,"JSONを読み込み");api().setStatus("JSONを読み込みました",true)}}).catch(()=>api().setStatus("JSONを読み込めませんでした",false))};
 $("saveLocal").onclick=function(){localStorage.setItem("lancers-dev-editor",JSON.stringify(current()));persist();api().setStatus("設定と調整履歴を保存しました",true)};
 $("loadLocal").addEventListener("click",()=>setTimeout(()=>{lastSerialized=serial(current());render()},0));
 window.lancersDevHistory={record,undo,redo,exportPayload,importPayload};render();
}
init();
})();