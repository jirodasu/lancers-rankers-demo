# Lancers Rankers — repository agent rules

## Canonical tuning source of truth

Before changing gameplay presentation, UI layout, hit feel, hit effects, shake, hitstop, or sound tuning, read:

`config/lancers-tuning.json`

That file is the canonical adopted tuning state produced by LANCERS DEV EDITOR.

Rules:

1. Treat values in `config/lancers-tuning.json` as authoritative over duplicated/fallback values embedded in HTML, CSS, or Python source.
2. Unrelated work must preserve every canonical tuning value. Do not "clean up", normalize, rebalance, or restore an older hard-coded value unless the user explicitly asks for that tuning change.
3. When the user supplies a DEV EDITOR adoption payload (`LANCERS_CANONICAL_UPDATE`), update `config/lancers-tuning.json` first, then make only the runtime changes required to consume it.
4. Runtime hard-coded values are fallbacks for compatibility; they are not permission to overwrite canonical values.
5. If canonical configuration and runtime behavior disagree, report the mismatch and fix consumption rather than silently changing the canonical configuration.
6. Preserve the editor's history/snapshot data when it is supplied, but only the adopted `config` object becomes production authority.
7. Do not introduce new balance numbers or feel changes without explicit user approval.

## DEV EDITOR

The editor lives at `dev-editor/`. Its "採用確定" action creates a handoff payload for ChatGPT/Codex. GitHub Pages cannot commit repository content without authenticated write access, so an editor state is not repository-canonical until `config/lancers-tuning.json` is committed.

When doing any future Lancers task, inspect the canonical tuning file before editing relevant source files.
