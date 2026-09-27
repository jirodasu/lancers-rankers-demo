const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test('Rank 10: one autonomous baseline playthrough', async ({ page }) => {
  test.setTimeout(180000);
  const out = path.join(process.cwd(), 'test-results', 'ai-playtest');
  fs.mkdirSync(out, { recursive: true });
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push(String(e)));

  await page.goto('/');
  await page.waitForFunction(() => window.pyxelContext?.resolveInput, null, { timeout: 90000 });

  // Pyxel's canvas can cover the visual boot button after loading.
  // Trigger the existing button handler directly so the test does not depend on z-index.
  await page.evaluate(() => document.getElementById('boot')?.click());

  await page.waitForFunction(() => {
    const h = document.querySelector('#lancer-shell');
    const start = h?.shadowRoot?.querySelector('#start');
    return start && !start.disabled;
  }, null, { timeout: 90000 });

  const state = () => page.evaluate(() => {
    const h = document.querySelector('#lancer-shell');
    const r = h?.shadowRoot;
    if (!r) return null;
    const text = id => r.getElementById(id)?.textContent || '';
    return {
      hp: Number(text('hp-value')) || 0,
      bossHp: Number((text('boss-value').match(/^\\d+/) || ['0'])[0]),
      stamina: Number(text('st-value')) || 0,
      notice: text('notice'),
      overlay: !r.getElementById('overlay')?.hidden,
      panel: text('panel-kicker')
    };
  });

  await page.evaluate(() => document.querySelector('#lancer-shell')?.shadowRoot?.querySelector('#start')?.click());
  await page.waitForTimeout(800);

  const log = [];
  const started = Date.now();
  let tick = 0;
  while (Date.now() - started < 90000) {
    const s = await state();
    if (!s) break;
    log.push({ t: +((Date.now() - started) / 1000).toFixed(1), ...s });
    if (s.overlay && /RANK 10 DEFEATED|TRY AGAIN/.test(s.panel)) break;

    const moveKey = ['KeyW','KeyD','KeyS','KeyA'][Math.floor(tick / 8) % 4];
    await page.keyboard.down(moveKey);
    if (s.hp > 0 && s.hp < 35) {
      await page.keyboard.press('KeyC');
    } else if (/離れろ/.test(s.notice)) {
      await page.keyboard.press('KeyX');
    } else {
      await page.keyboard.press('KeyZ');
    }
    await page.waitForTimeout(220);
    await page.keyboard.up(moveKey);
    await page.waitForTimeout(80);
    tick++;
  }

  const final = await state();
  await page.screenshot({ path: path.join(out, 'final.png'), fullPage: true });
  const report = {
    generatedAt: new Date().toISOString(),
    persona: 'baseline-bot-v1',
    result: final?.panel || 'TIMEOUT',
    elapsedSec: +((Date.now() - started) / 1000).toFixed(1),
    final,
    samples: log,
    consoleErrors
  };
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  expect(log.length).toBeGreaterThan(0);
});
