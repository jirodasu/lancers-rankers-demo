import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const base = 'http://127.0.0.1:8765';
const browser = await chromium.launch({headless:true});
const page = await browser.newPage({acceptDownloads:true});
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto(base+'/dev-editor/factory.html');
  await page.waitForFunction(() => document.getElementById('status')?.textContent.includes('正規設定'));
  await page.getByRole('button',{name:/魔槍のクーフェリン/}).click();
  assert.equal(await page.locator('#rank').inputValue(),'1');
  assert.equal(await page.locator('#name').inputValue(),'魔槍のクーフェリン');
  assert.equal(await page.locator('#name').isEnabled(),true,'Rank 1 should be an editable draft');
  assert.equal(await page.locator('#techs .tech').count(),5);
  await page.getByRole('button',{name:/旋槍のリゼル/}).click();
  assert.equal(await page.locator('#rank').inputValue(),'9');
  console.log('PASS Rank 1 draft is visible, editable and keeps five planned techniques');
  assert.equal(await page.locator('#name').isDisabled(),true,'legacy Rank 9 must be read-only');
  await page.getByRole('button',{name:/盾槍のアテリア/}).click();
  assert.equal(await page.locator('#rank').inputValue(),'8');
  assert.equal(await page.locator('#name').isEnabled(),true,'Rank 8 draft must be editable');
  assert.match(await page.locator('#playDraft').getAttribute('href'),/arena.html\?rank=8/);
  await page.locator('#name').fill('初心者の新ランカー');
  await page.reload();
  await page.waitForFunction(() => document.getElementById('status')?.textContent.includes('正規設定'));
  await page.getByRole('button',{name:/初心者の新ランカー/}).click();
  assert.equal(await page.locator('#name').inputValue(),'初心者の新ランカー','draft must persist after reload');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#exportTop').click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(),'ranker-factory.json');
  assert.equal(errors.length,0,'Factory JS errors: '+errors.join('; '));
  console.log('PASS Factory browser: legacy lock, eight drafts, autosave, export');
  const arena = await browser.newPage({viewport:{width:390,height:844}});
  const arenaErrors=[];
  arena.on('pageerror',e=>arenaErrors.push(e.message));
  try {
    await arena.goto(base+'/dev-editor/arena.html?rank=8');
    await arena.locator('#rankSelect option').first().waitFor();
    assert.equal(await arena.locator('#rankSelect option').count(),8,'all eight bosses must be selectable');
    for (const n of [8,7,6,5,4,3,2,1]) {
      await arena.locator('#rankSelect').selectOption(String(n));
      assert.equal(await arena.locator('#rankSelect').inputValue(),String(n));
      assert.ok((await arena.locator('#bossName').innerText()).length>=3);
      assert.ok(Number((await arena.locator('#bossHp').innerText()).split('/')[0])>0);
    }
    await arena.locator('#rankSelect').selectOption('8');
    await arena.locator('#start').click();
    await arena.keyboard.down('ArrowLeft');
    await arena.waitForTimeout(700);
    await arena.keyboard.up('ArrowLeft');
    assert.ok(parseFloat(await arena.locator('#time').innerText())>0,'battle clock must advance');
    await arena.locator('#attack').click();
    await arena.locator('#dodge').click();
    assert.equal(await arena.locator('#overlay').isVisible(),false,'fight must be active');
    assert.equal(arenaErrors.length,0,'Arena runtime JS errors: '+arenaErrors.join('; '));
    console.log('PASS Arena: eight bosses selectable, active battle, movement and attack/dodge controls');
  } finally { await arena.close(); }
  console.log('PASS Factory browser: legacy lock, draft creation, autosave, export');
  await page.goto(base+'/dev-editor/');
  assert.match(await page.title(),/GAME EDITOR/);
  assert.equal(await page.locator('link[rel="stylesheet"][href="./polish.css"]').count(),1,'Editor design system must actually load');
  assert.equal(await page.locator('#modeGame').getAttribute('aria-pressed'),'true');
  await page.locator('#modeFactory').click();
  await page.waitForURL('**/dev-editor/#rankers');
  assert.equal(await page.locator('#modeFactory').getAttribute('aria-pressed'),'true');
  const embedded=page.frameLocator('#factoryFrame');
  await embedded.locator('#name').waitFor();
  await embedded.getByRole('button',{name:/初心者の新ランカー/}).click();
  assert.equal(await embedded.locator('#name').inputValue(),'初心者の新ランカー');
  await page.locator('#modeGame').click();
  await page.waitForURL('**/dev-editor/#game');
  assert.equal(await page.locator('#gameStage').isVisible(),true);
  await page.locator('#modeFactory').click();
  assert.equal(await embedded.locator('#name').inputValue(),'初心者の新ランカー');
  await page.reload();
  await embedded.locator('#name').waitFor();
  await embedded.getByRole('button',{name:/初心者の新ランカー/}).click();
  assert.equal(await embedded.locator('#name').inputValue(),'初心者の新ランカー');
  console.log('PASS one editor URL, two modes, draft retained through switching/reload');
  assert.match(await page.locator('.brand').innerText(),/GAME EDITOR/);
  assert.doesNotMatch(await page.locator('.brand').innerText(),/LIVE TUNING \/ v0\.6/);
  assert.match(await embedded.locator('.inspector').innerText(),/5条件の参考予測/);
  console.log('PASS consistent branding and honest simulation labels');
  for (const width of [390, 768, 1440]) {
    const viewportPage = await browser.newPage({viewport:{width,height:844}});
    try {
      await viewportPage.goto(base+'/dev-editor/#rankers');
      await viewportPage.frameLocator('#factoryFrame').locator('#name').waitFor();
      const mode = viewportPage.locator('#modeFactory');
      assert.equal(await mode.isVisible(),true,'Factory mode button hidden at '+width);
      const rect=await mode.boundingBox();
      assert.ok(rect&&rect.x>=0&&rect.x+rect.width<=width+1,'Factory mode button clipped at '+width);
      const fontSize=await mode.evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
      assert.ok(fontSize>=12,'Mode label too small at '+width);
      const overflow=await viewportPage.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
      assert.ok(overflow<=2,'Outer editor horizontal overflow at '+width+': '+overflow);
      const factoryBody=viewportPage.frameLocator('#factoryFrame').locator('body');
      const innerOverflow=await factoryBody.evaluate(el=>el.ownerDocument.documentElement.scrollWidth-el.ownerDocument.defaultView.innerWidth);
      assert.ok(innerOverflow<=2,'Factory horizontal overflow at '+width+': '+innerOverflow);
      await viewportPage.locator('#modeGame').click();
      assert.equal(await viewportPage.locator('#modeGame').getAttribute('aria-pressed'),'true');
    } finally {
      await viewportPage.close();
    }
  }
  console.log('PASS responsive 390/768/1440 viewport and mode interaction');
  // Regression: a narrow, short iframe in a portrait phone is not a rotated phone.
  const runtimeSource=readFileSync('src/game03.txt','utf8');
  const orientationCode=runtimeSource.slice(runtimeSource.indexOf('function landscape(){'),runtimeSource.indexOf('function orientation(){'));
  assert.ok(orientationCode.startsWith('function landscape(){')&&orientationCode.includes('window.parent'));
  const orientationPage=await browser.newPage({viewport:{width:390,height:844}});
  try {
    await orientationPage.goto(base+'/dev-editor/');
    await orientationPage.locator('.device').evaluate(el=>{
      el.style.setProperty('width','360px','important');
      el.style.setProperty('height','220px','important');
      el.style.setProperty('min-height','0','important');
    });
    const preview=orientationPage.frameLocator('#game').locator('body');
    await preview.waitFor();
    const iframeGeometry=await preview.evaluate(()=>({w:innerWidth,h:innerHeight}));
    assert.ok(iframeGeometry.w>iframeGeometry.h,'Fixture must reproduce landscape-shaped iframe');
    const isRotated=()=>preview.evaluate((el,source)=>new Function(source+'; return landscape();')(),orientationCode);
    assert.equal(await isRotated(),false,'Portrait phone must not be blocked by landscape-shaped preview');
    await orientationPage.setViewportSize({width:844,height:390});
    assert.equal(await isRotated(),true,'Landscape phone must still pause');
    await orientationPage.goto(base+'/');
    assert.equal(await orientationPage.evaluate(source=>new Function(source+'; return landscape();')(),orientationCode),true,'Standalone landscape game must still pause');
    await orientationPage.setViewportSize({width:390,height:844});
    assert.equal(await orientationPage.evaluate(source=>new Function(source+'; return landscape();')(),orientationCode),false,'Standalone portrait game must remain playable');
    console.log('PASS orientation: portrait parent with landscape-shaped iframe, landscape parent and standalone');
  } finally {
    await orientationPage.close();
  }

  await page.route('**/config/lancers-tuning.json', route => route.fulfill({status:503,body:'offline'}));
  await page.route('**/config/ranker-factory.json', route => route.fulfill({status:503,body:'offline'}));
  await page.reload();
  await embedded.locator('#loadError').waitFor({state:'visible'});
  assert.equal(await embedded.locator('#retryLoadMain').isVisible(),true);
  await page.unroute('**/config/lancers-tuning.json');
  await page.unroute('**/config/ranker-factory.json');
  await embedded.locator('#retryLoadMain').click();
  await embedded.locator('#name').waitFor();
  await embedded.locator('#loadError').waitFor({state:'hidden'});
  console.log('PASS Factory offline error → retry recovery');
  await page.route('**/cdn.jsdelivr.net/**', route => route.abort());
  await page.goto(base+'/');
  await page.locator('#reload').waitFor({state:'visible',timeout:10000});
  assert.match(await page.locator('#boot-status').innerText(),/起動に失敗/);
  console.log('PASS game CDN error → visible retry');
} finally {
  await browser.close();
}
