# QA 2026-10-14 — main Pyxel game (v5.4.0)

## Scope / provenance

- Production baseline: main `7017a6da`, v5.4.0.
- Browser: GitHub Actions Ubuntu Chromium, Playwright viewport 390×844, `isMobile:true`, `hasTouch:true`. Not an iPhone or Safari.
- Local HTTP preview on runner (127.0.0.1:8765). Not a production Pages playtest.
- User input through rendered DOM controls, no direct mutation of Python boss state.
- Canonical tuning and rank 10–8 balance not changed.

## QA-001: launch button blocked by Pyxel canvas (P1)

**Before:** on baseline test branch, Pyxel runtime reported `ゲームを起動` button enabled, but real browser click timed out: `<canvas id="canvas"> ... intercepts pointer events`. The title/game could not be reached by the test's normal click. Reproduced in two QA runs; evidence: GitHub Actions `38562064401`, `38562349810`.

**Root cause (high confidence):** bootstrap panel lacked an explicit stacking layer while Pyxel's runtime canvas overlapped the button.

**Fix:** add `position:relative;z-index:2147483646` to `#boot-panel` in `index.html`. The game shell already uses `z-index:2147483647` so it remains in front after launch.

**After:** Actions run `38562613664` successfully used the real Chromium browser to mount the main Pyxel shell, select ranks 6/5/4/3/2/1 through UI, start rank 1 battle, observe player HP 100→80, and open pause. Ten screenshots plus trace JSON saved as artifact `main-game-qa`. A later run adds explicit assertions and touch-button input.

**Status:** browser regression verified for local Chromium; iPhone Safari and public GitHub Pages not verified. Occasional `net::ERR_ABORTED` on an audio request is recorded but not demonstrated as a gameplay fault.

## Open issues / limits

- Rank 6–1 boss AI each need five **full combat** playthroughs and controlled comparisons of optimal vs generic tactics. Existing 30 state-machine simulations are not full playthroughs.
- No measured win rate, damage comparison or clear time; do not claim boss-specific design is validated.
- Portrait Chromium smoke does not establish real iPhone Safari touch performance, sound, screen overlap or gesture cancellation.
- Victory/defeat/retry loops, all weapon choices, wall-charge hitbox alignment and long-press charge timing remain to be exercised through the main game's normal UI.
- Test's `pageerror`, console and failed-request logs are preserved. Evidence is available from Actions artifacts rather than copied to the repository.

## QA acceptance gates

1. Boot is interactable even when Pyxel creates a canvas.
2. Rank 6–1 selection changes visible boss identity and HP.
3. Battle can start through the title screen, advance to a damage event, and pause through the UI.
4. The gameplay code and canonical tuning for ranks 10–8 remain unchanged.
5. Do not label the six bosses `QA-complete` until full combat and iPhone tests pass.
