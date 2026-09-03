# Journey (V2 freeze)

Stacked on the current branch. The prototype tag is a **parachute only** — do not rebuild later work from `prototype-2026-09-02` / `044396d` unless Daniel asks to revert.

Practice stays the complete free product. Journey is a paid path with a gate hook. No XP, loot, lives, or streaks. Accents still required. Spanish pack only. Shell stays language-agnostic.

## Two modes

Home is **VERBOS**, tagline **The conjugation quiz.**, and two entries: **Practice** and **Journey**.

- **Practice** — today’s loop: Play, Customize, recap, What you know, Load class set, Warm-up after a class set. Never locked. First visit is one-tap Practice. After a Practice round, Play again lives in Practice.
- **Journey** — path of trials. Settings come from the trial, not Customize. Customize is Practice-only.

## Gate

`profile.journeyUnlocked` defaults to **true** so the path can be playtested. Checkout later flips it through `setJourneyUnlocked(state, false)`. No Stripe or prices in this snapshot.

If `journeyUnlocked` is false: Journey is a locked door. Practice still works.

## What you know vs Map

- **What you know** is a checklist of Practice + Journey forms (`mood × time × person × type × ending`; address is the person: tú / vos). Copy: not enough yet / still learning / you know this. Not XP, not ranks, not a map.
- **Journey Map** is a path of nodes: beaten / current / locked. Not a 2×N grid and not the atlas. Beaten nodes light. Current is the next playable (concurrent nodes can both be current). Completing the last required node lights the full required path.

## Trial sitting

Each trial is a small sitting: one time × one verb type × persons yo, tú, él, nosotros, ellos (unless the trial is commands). Beat = existing `youKnowThis` (5 of last 7 typed, min 5). Same sitting keys for that trial. Round 1 cannot mint. One clean round is not a beat.

If Practice already minted those keys, the node is already beaten. Do not force a re-type to proceed.

Fail: name the miss, finish the round, node stays current. Play again remints infinitives on the **same** sitting keys. Save/resume the same node. Never send back to trial 1. Never wipe the atlas. Never mint new keys on fail. Never XP.

Overweight weak cells only after that trial’s first complete pass (same engine as Practice).

## Order

Do not skip. Do not add pretérito anterior.

1. Presente regulars -ar
2. Presente regulars -er/-ir
3. Presente ser/estar/ir
4. Presente high-freq tener, hacer
5. Presente stem-changers
6. Pretérito regulars -ar
7. Pretérito regulars -er/-ir
8. Pretérito spelling-change
9. Pretérito irregulars ser/ir, tener, estar, hacer, poder
10. Imperfecto regulars + ser/ir/ver
11. Pretérito vs imperfecto contrast (mixed)
12. Futuro
13. Condicional
14. Subjuntivo presente regulars
15. Subjuntivo presente irregulars
16. Subjuntivo imperfecto -ra only
17. Mandatos affirmative tú
18. Mandatos negative tú (after 14)
19. Mandatos usted/ustedes
20. Indicative perfecto regular participles
21. Indicative perfecto high-freq irregular participles (hecho, dicho, escrito, puesto, visto, vuelto)
22. Indicative pluscuamperfecto
23. Subjuntivo perfecto (after 14)
24. Subjuntivo pluscuamperfecto -ra (after 16+22)
25. Futuro perfecto
26. Condicional perfecto

### Concurrent (only these)

- After 1: optional vos presente side track (not required). hablas ≠ hablás.
- After 6+7: 8 and 9 may both be open.
- After 9+10: 11 plus an optional review.
- 13 opens when 12 is beaten.
- 17 may sit beside later presente (opens after 5). 18 stays after 14.
- 25 opens with 26 once 20 is beaten. 21 may sit beside 22.
- Vosotros is an optional side after 1, never a gate.
- No subjunctive until 1–2 are beaten (14 also waits for 13).
- Haber on compounds matches tú (`has`, not *habés). No vos split on compounds.

## Play

Back from play, recap, and the map. Journey uses the same Play/recap board as Practice. Trial catalog and labels live in `src/packs/spanish/journey.js`. Unlock math lives in `src/engine/journey.js`.
