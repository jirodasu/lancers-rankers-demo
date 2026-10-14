# Rank 6–1 combat redesign / v5.4.0

This is an implementation specification, **not** a claim of human or iPhone playtest completion. Ranks 10–8 and canonical tuning are unchanged.

| Rank | Observe | Decide | Input | Punish window | Failure cue |
| --- | --- | --- | --- | --- | --- |
| 6 Akileon | Straight committed rush and arena rim | Lure toward wall | Move to rim, sidestep late | 2.65s after crash (vs 0.24s normal) | "壁に当てれば長い隙" |
| 5 Jiran | Three silhouettes, real one's steady crest | Which silhouette is real? | Approach bright center, attack | 1.60s after mirage attack | "FAKE" if assist targets a decoy |
| 4 Murgal | Guard ring | Quick jab before charge | Normal thrust then charged thrust | 2.40s break | "PARRY" on early charge |
| 3 Lugray | Long lance telegraph, inner dead zone | Stay within inner radius | Close distance instead of retreating | 1.55s if within 28px during prep | "遠距離光槍" |
| 2 Ordin | TRACK then LOCK | Dodge after aim freezes | Delay dodge until final 0.17s | 0.70s | "早く避けると狙い直される" |
| 1 Cu-Ferin | Alternating RUSH, GUARD, TRACK | Switch between prior solutions | Wall bait, jab→charge, delayed dodge | Stance-dependent | Distinct stance labels |

## State transition sketches

- **6** idle → prep → committed dash → wall crash (2.65s) / missed charge (0.24s) → idle.
- **5** idle → mirage prep (three silhouettes) → attack → exposed real body (1.60s) → idle. Auto-target assist targets nearest silhouette, not omnisciently the real boss.
- **4** idle/guard → lane prep → attack → short recover → idle; normal strike during guard → break (2.40s) → idle. Charged strike during guard is parried.
- **3** idle at 68px → lane prep → attack → short recover → idle; approach within 28px during prep → cancelled attack + 1.55s recover.
- **2** idle → tracking prep → lock last 0.17s → lane attack → recover → idle.
- **1** idle → alternating wall/guard/oracle prep → stance-specific attack → recover → idle; normal strike in guard prep → break → idle.

## Visual contract

Telegraph and collision geometry share the same `new_boss_hit` primitives. The specialized tells include rank-6 crash sparks, rank-5 translucent decoys with a real-body crest, rank-4 shield ring, rank-3 inner-zone indicator, rank-2 TRACK/LOCK label, rank-1 stance indicator. Animation uses the existing Pyxel palette and spear silhouettes.

## Testing and limitations

- Automated test: five deterministic state-machine runs for each of six ranks (30 runs), plus controlled rank-2 late-lock and rank-3 close-range checks. Existing rank-7, title, and startup regressions remain in CI.
- These are **not** 30 full interactive playthroughs and do not prove improved win rates, difficulty balance, or iPhone touch ergonomics.
- Next acceptance gate: scripted player input with comparative tactics (correct vs wrong) for all six ranks, measured hit count, damage, and clear time; iPhone portrait capture; real-world 5+ full combat runs per boss. Do not label that gate passed without evidence.
