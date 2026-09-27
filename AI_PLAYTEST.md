# AI Playtest — Step 1

This is the smallest automated playtest loop for the Rank 10 browser demo.

## What it does
1. Starts the repository locally.
2. Opens the game at a 390x844 mobile viewport in Chromium.
3. Boots Pyxel and starts the Rank 10 battle.
4. Drives the existing keyboard controls (WASD, Z, X, C).
5. Uses the game's visible HUD as telemetry.
6. Saves a final screenshot and JSON report.
7. Runs from GitHub Actions on demand and on relevant pull requests.

## Run on Windows
Install Node.js first, then from the repository folder:

    npm install
    npx playwright install chromium
    npm run test:play

Evidence is written to:

    test-results/ai-playtest/final.png
    test-results/ai-playtest/report.json

## Scope
This first version is deliberately a deterministic baseline bot, not an LLM making frame-by-frame decisions. It proves that the real browser build can be booted, controlled, observed and reported automatically. Step 2 can add multiple personas and richer combat telemetry; Step 3 can feed the report to Codex for proposed fixes.
