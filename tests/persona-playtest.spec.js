const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Step 2 runs the same fight under three deterministic player-skill profiles.\nconst PERSONA = process.env.PERSONA || 'normal';
const ROUNDS = Number(process.env.ROUNDS || 10);
const MAX_BATTLE_MS = Number(process.env.MAX_BATTLE_MS || 90000);

const profiles = {
  beginner: {
    label: 'beginner',
    healBelow: 25,
    dangerReactionMs: 650,
    dodgeCooldownMs: 1500,
    attackMode: 'aggressive'
  },
  normal: {
    label: 'normal',
    healBelow: 35,
    dangerReactionMs: 280,
    dodgeCooldownMs: 950,
    attackMode: 'balanced'
  },
  skilled: {
    label: 'skilled',
    healBelow: 45,
    dangerReactionMs: 90,
    dodgeCooldownMs: 1250,
    attackMode: 'punish'
  }
};

const profile = profiles[PERSONA] || profiles.normal;

test.describe.configure({ mode: 'serial' });

test(`Step 2: ${PERSONA} persona x ${ROUNDS} battles`, async ({ page }) => {
  test.setTimeout(Math.max(240000, ROUNDS * (MAX_BATTLE_MS + 15000)));
  const out = path.join(process.cwd(), 'test-results', 'persona-playtest', PERSONA);
  fs.mkdirSync(out, { recursive: true });
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push(String(e)));

  await page.goto('/');
  await page.waitForFunction(() => typeof window.pyxelContext?.resolveInput === 'function', null, { timeout: 90000 });
  await page.evaluate(() => window.pyxelContext.resolveInput());
  await page.waitForFunction(() => {
    const h = document.querySelector('#lancer-shell');
    return !!h?.shadowRoot?.querySelector('#start') && !h.shadowRoot.querySelector('#start').disabled;
  }, null, { timeout: 90000 });

  const state = () => page.evaluate(() => {
    const r = document.querySelector('#lancer-shell')?.shadowRoot;
    if (!r) return null;
    const text = id => r.getElementById(id)?.textContent || '';
    return {
      hp: Number(text('hp-value')) || 0,
      bossHp: Number(text('boss-value').split('/')[0].trim()) || 0,
      stamina: Number(text('st-value')) || 0,
      potions: Number((text('potion-value').match(/[0-9]+/) || ['0'])[0]),
      combatState: r.getElementById('combat-state')?.dataset?.state || '',
      notice: text('notice'),
      overlay: !r.getElementById('overlay')?.hidden,
      panel: text('panel-kicker')
    };
  });

  const clickStart = async () => {
    await page.evaluate(() => document.querySelector('#lancer-shell')?.shadowRoot?.querySelector('#start')?.click());
    await page.waitForTimeout(800);
  };

  const rounds = [];
  for (let round = 1; round <= ROUNDS; round++) {
    await clickStart();
    const started = Date.now();
    let tick = 0;
    let dangerStarted = null;
    let lastDodgeAt = -99999;
    let previousCombatState = '';
    let dodgedThisDanger = false;
    let punishUntil = 0;
    const actions = { attack: 0, dodge: 0, heal: 0, chargedAttack: 0 };
    const samples = [];

    while (Date.now() - started < MAX_BATTLE_MS) {
      const s = await state();
      if (!s) break;
      const elapsed = Date.now() - started;
      samples.push({ t: +(elapsed / 1000).toFixed(1), ...s });
      if (s.overlay && /RANK 10 DEFEATED|TRY AGAIN/.test(s.panel)) break;

      if (s.combatState === 'danger' && previousCombatState !== 'danger') {
        dangerStarted = elapsed;
        dodgedThisDanger = false;
      }
      if (s.combatState !== 'danger') dangerStarted = null;
      if (s.combatState === 'chance' && previousCombatState !== 'chance') punishUntil = elapsed + 1100;

      const moveKey = ['KeyW','KeyD','KeyS','KeyA'][Math.floor(tick / 7) % 4];
      await page.keyboard.down(moveKey);

      let acted = false;
      if (s.hp > 0 && s.hp < profile.healBelow && s.potions > 0) {
        await page.keyboard.press('KeyC');
        actions.heal++;
        acted = true;
      }

      const dangerReady = s.combatState === 'danger'
        && dangerStarted !== null
        && elapsed - dangerStarted >= profile.dangerReactionMs
        && elapsed - lastDodgeAt >= profile.dodgeCooldownMs
        && (PERSONA !== 'skilled' || !dodgedThisDanger);

      if (!acted && dangerReady && s.stamina >= 22) {
        await page.keyboard.press('KeyX');
        actions.dodge++;
        lastDodgeAt = elapsed;
        if (PERSONA === 'skilled') dodgedThisDanger = true;
        acted = true;
      }

      if (!acted) {
        if (profile.attackMode === 'aggressive') {
          // Beginner keeps poking even when the situation is not ideal.
          if (tick % 2 === 0 && s.combatState !== 'danger') {
            await page.keyboard.press('KeyZ');
            actions.attack++;
          }
        } else if (profile.attackMode === 'balanced') {
          // Normal player attacks openings, but also takes occasional safe pokes.
          if (s.combatState === 'chance' || (s.combatState === 'watch' && s.stamina >= 35 && tick % 3 === 0)) {
            await page.keyboard.press('KeyZ');
            actions.attack++;
          }
        } else {
          // Skilled: one dodge per telegraph, then punish the post-attack opening.
          // Stop attacking below 30 stamina so a defensive dodge always remains available.
          const inPunishWindow = s.combatState === 'chance' || elapsed < punishUntil;
          if (inPunishWindow && s.stamina >= 55) {
            await page.keyboard.down('KeyZ');
            await page.waitForTimeout(260);
            await page.keyboard.up('KeyZ');
            actions.chargedAttack++;
            acted = true;
          } else if (inPunishWindow && s.stamina >= 30) {
            await page.keyboard.press('KeyZ');
            actions.attack++;
          } else if (s.combatState === 'watch' && s.stamina >= 65 && tick % 4 === 0) {
            await page.keyboard.press('KeyZ');
            actions.attack++;
          }
        }
      }

      await page.waitForTimeout(180);
      await page.keyboard.up(moveKey);
      await page.waitForTimeout(70);
      previousCombatState = s.combatState;
      tick++;
    }

    const final = await state();
    const elapsedSec = +((Date.now() - started) / 1000).toFixed(1);
    const result = final?.overlay
      ? (/RANK 10 DEFEATED/.test(final.panel) ? 'VICTORY' : /TRY AGAIN/.test(final.panel) ? 'DEFEAT' : 'FINISHED')
      : 'TIMEOUT';

    await page.screenshot({ path: path.join(out, `round-${String(round).padStart(2,'0')}.png`), fullPage: true });

    rounds.push({
      round,
      result,
      elapsedSec,
      final,
      actions,
      bossDamageDealt: Math.max(0, 600 - (final?.bossHp ?? 600)),
      potionsUsed: Math.max(0, 3 - (final?.potions ?? 3)),
      samples
    });

    if (round < ROUNDS) {
      // Victory/defeat exposes retry. A timeout is still in battle, so reload for a clean round.
      if (final?.overlay && /RANK 10 DEFEATED|TRY AGAIN/.test(final.panel)) {
        await page.evaluate(() => document.querySelector('#lancer-shell')?.shadowRoot?.querySelector('#start')?.click());
        await page.waitForTimeout(700);
        // The click above starts a retry immediately; return to selection by reloading to keep rounds identical.
      }
      await page.reload();
      await page.waitForFunction(() => typeof window.pyxelContext?.resolveInput === 'function', null, { timeout: 90000 });
      await page.evaluate(() => window.pyxelContext.resolveInput());
      await page.waitForFunction(() => {
        const h = document.querySelector('#lancer-shell');
        return !!h?.shadowRoot?.querySelector('#start') && !h.shadowRoot.querySelector('#start').disabled;
      }, null, { timeout: 90000 });
    }
  }

  const wins = rounds.filter(r => r.result === 'VICTORY').length;
  const defeats = rounds.filter(r => r.result === 'DEFEAT').length;
  const timeouts = rounds.filter(r => r.result === 'TIMEOUT').length;
  const avg = key => +(rounds.reduce((sum, r) => sum + Number(r[key] || 0), 0) / rounds.length).toFixed(1);
  const summary = {
    persona: PERSONA,
    profile,
    rounds: rounds.length,
    wins,
    defeats,
    timeouts,
    winRate: +(wins / rounds.length * 100).toFixed(1),
    averageBattleSec: avg('elapsedSec'),
    averageBossDamage: avg('bossDamageDealt'),
    averageFinalBossHp: +(rounds.reduce((s,r)=>s+(r.final?.bossHp ?? 600),0)/rounds.length).toFixed(1),
    averageFinalPlayerHp: +(rounds.reduce((s,r)=>s+(r.final?.hp ?? 0),0)/rounds.length).toFixed(1),
    averagePotionsUsed: avg('potionsUsed'),
    totalActions: rounds.reduce((a,r)=>{
      for (const k of Object.keys(a)) a[k] += r.actions[k] || 0;
      return a;
    }, { attack:0, dodge:0, heal:0, chargedAttack:0 }),
    consoleErrors
  };

  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({ summary, rounds }, null, 2));
  fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(summary, null, 2));
  expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  expect(rounds.length).toBe(ROUNDS);
});
