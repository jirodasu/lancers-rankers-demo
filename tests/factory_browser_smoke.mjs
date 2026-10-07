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
  console.log('EDITOR URL',page.url(),'TITLE',await page.title(),'FACTORY LINK COUNT',await page.locator('a.factory-tab').count());
  await page.locator('a.factory-tab').click();
  await page.waitForURL('**/dev-editor/factory.html');
  console.log('PASS DEV EDITOR → FACTORY navigation');
} finally {
  await browser.close();
}
