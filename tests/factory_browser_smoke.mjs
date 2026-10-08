import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const base = 'http://127.0.0.1:8765';
const browser = await chromium.launch({headless:true});
const page = await browser.newPage({acceptDownloads:true});
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto(base+'/dev-editor/factory.html');
  await page.waitForFunction(() => document.getElementById('status')?.textContent.includes('正規設定'));
  assert.equal(await page.locator('#rank').inputValue(),'9');
  assert.equal(await page.locator('#name').isDisabled(),true,'legacy Rank 9 must be read-only');
  await page.locator('#clone').click();
  assert.equal(await page.locator('#rank').inputValue(),'8');
  assert.equal(await page.locator('#name').isEnabled(),true,'draft must be editable');
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
  console.log('PASS Factory browser: legacy lock, draft creation, autosave, export');
  await page.goto(base+'/dev-editor/');
  assert.match(await page.title(),/GAME EDITOR/);
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
