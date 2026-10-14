import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const base='http://127.0.0.1:8765';
mkdirSync('qa-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
const errors=[],trace=[];
page.on('pageerror',e=>errors.push('pageerror '+e.message));
page.on('console',m=>{if(m.type()==='error')errors.push('console '+m.text())});
page.on('requestfailed',r=>errors.push('request '+r.url()+' '+r.failure()?.errorText));
const snapshot=async(label)=>{
  const data=await page.evaluate(()=>{const root=document.getElementById('lancer-shell')?.shadowRoot;return {boot:document.getElementById('boot-status')?.textContent,error:document.getElementById('error')?.textContent,game:!!root,overlay:root?.getElementById('overlay')?.hidden,loading:root?.getElementById('load-label')?.textContent,rank:root?.getElementById('rank-number')?.textContent,mode:root?.getElementById('panel-title')?.textContent,notice:root?.getElementById('notice')?.textContent,hp:root?.getElementById('hp-value')?.textContent,bossHp:root?.getElementById('boss-value')?.textContent,buttons:root?.querySelectorAll('[data-select-rank]').length}});
  trace.push({label,data});
  await page.screenshot({path:'qa-artifacts/'+label+'.png'});
  return data;
};
try{
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>document.getElementById('lancer-shell')||!document.getElementById('boot')?.disabled||document.getElementById('reload')?.hidden===false,null,{timeout:90000}).catch(()=>{});
  if(!await page.locator('#lancer-shell').count() && await page.locator('#boot').isEnabled()){
    await page.locator('#boot').click({timeout:2500}).catch(async e=>{
      if(!await page.locator('#lancer-shell').count())errors.push('boot click: '+e.message.slice(0,160));
    });
  }
  await page.waitForFunction(()=>!!document.getElementById('lancer-shell')||document.getElementById('reload')?.hidden===false,null,{timeout:45000}).catch(()=>{});
  await snapshot('01-initial');
  const shell=page.locator('#lancer-shell');
  if(await shell.count()){
    const root=page.locator('#lancer-shell').locator('#overlay');
    await page.waitForFunction(()=>document.getElementById('lancer-shell')?.shadowRoot?.getElementById('start')?.disabled===false,{timeout:30000}).catch(()=>{});
    for(const rank of [6,5,4,3,2,1]){
      await page.locator('#lancer-shell').locator('[data-select-rank="'+rank+'"]').click({timeout:3000}).catch(e=>errors.push('select '+rank+' '+e.message.slice(0,130)));
      await page.waitForTimeout(300);
      await snapshot('02-select-'+rank);
    }
    await page.locator('#lancer-shell').locator('#start').click({timeout:3000}).catch(e=>errors.push('start '+e.message.slice(0,130)));
    await page.waitForTimeout(1600);
    await snapshot('03-battle-start');
    await page.keyboard.down('ArrowRight');await page.waitForTimeout(900);await page.keyboard.up('ArrowRight');
    await page.locator('#lancer-shell').locator('#attack').tap();
    await page.waitForTimeout(220);
    await page.locator('#lancer-shell').locator('#dodge').tap();
    await page.waitForTimeout(1600);
    await snapshot('04-after-input');
    await page.locator('#lancer-shell').locator('#pause').click({timeout:3000}).catch(()=>{});
    await page.waitForTimeout(350);
    await snapshot('05-pause');
  }
}finally{
  writeFileSync('qa-artifacts/trace.json',JSON.stringify({trace,errors},null,2));
  console.log('MAIN GAME QA TRACE',JSON.stringify({trace,errors}));
  await browser.close();
}
const byLabel=Object.fromEntries(trace.map(t=>[t.label,t.data]));
if(!byLabel['01-initial']?.game)throw new Error('Main game never mounted');
for(const rank of [6,5,4,3,2,1]){
  if(byLabel['02-select-'+rank]?.rank!==String(rank))throw new Error('Rank '+rank+' was not selected through UI');
}
if(byLabel['03-battle-start']?.overlay!==true)throw new Error('Battle did not start from the title');
if(!(Number(byLabel['04-after-input']?.hp)<Number(byLabel['03-battle-start']?.hp)))throw new Error('Battle did not advance to a damage event');
if(byLabel['05-pause']?.overlay!==false)throw new Error('Pause did not open');
console.log('PASS MAIN GAME: boot, six rank selections, battle damage and pause in Chromium');

