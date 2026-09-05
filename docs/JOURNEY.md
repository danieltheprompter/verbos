# Journey (V2 freeze)

Stacked on the current branch. The prototype tag is a **parachute only** — do not rebuild later work from `prototype-2026-09-02` / `044396d` unless Daniel asks to revert.

Practice stays the complete free product. Journey is a paid path with a gate hook. No XP, loot, lives, or streaks. Accents still required. Spanish pack only. Shell stays language-agnostic.

## Two modes

Home is **VERBOS**, tagline **The conjugation quiz.**, and two cards: **Practice** and **Journey**. **What you know** is a secondary link after a Practice round.

- **Practice** — today’s loop: Play, Customize, recap, What you know, Load class set, Warm-up after a class set. Never locked. First visit is one-tap Practice. After a Practice round, Play again lives in Practice.
- **Journey** — path of trials on an island atlas. Trial tense/type/verbs come from the catalog. Persons come from the **same saved Pronouns setting** as Practice Customize (`address` + extra column). Customize’s other fields stay Practice-only.

## Gate

`profile.journeyUnlocked` defaults to **true** so the path can be playtested. Checkout later flips it through `setJourneyUnlocked(state, false)`. No Stripe or prices in this snapshot. Trial 1 can stay a free taste later; do not build a paywall here.

If `journeyUnlocked` is false: Journey is a locked door. Practice still works.

## What you know vs atlas

- **What you know** is a checklist of Practice + Journey forms (`mood × time × person × type × ending`; address is the person: tú / vos). Copy: not enough yet / still learning / you know this. Not XP, not ranks, not a map.
- **Journey Map** is an SVG island atlas. Grammatical families are labeled islands (Presente, Pretérito, Imperfecto, Futuro/Condicional, Subjuntivo, Mandatos, Compounds). The required route 1–26 still runs underneath in pedagogy order.
- Node states: **beaten** (filled; Review stays playable) / **current** (unlocked, playable, pulses) / **ahead** (visible preview, not playable). Not a wall of padlocks. Concurrent current nodes can both pulse.
- First open: whole atlas and the route ahead are visible; trial 1 pulses.
- On mastery: the node fills, its route segment lights, the next required node pulses.
- Full mastery: the whole required route is lit; **Journey complete.**; Review on mastered nodes.

## Vos / vosotros (opt-in, then first-class)

Default Journey does **not** require vos or vosotros. Learners who never select them can complete required trials 1–26 with the standard person set and no missing-check guilt.

There are **no** Journey trials that only teach vos (no `id: "vos"` / `id: "vosotros"` side quests on the main path).

If the learner selects vos and/or the extra column (vosotros) on **Pronouns** — Practice Customize or the same chips on the Journey atlas; one saved setting — those persons are **first-class** on every applicable trial:

- same board cells
- same `sittingKeys`
- same beat rule (5 of last 7 typed, min 5; round 1 cannot mint)

Not weaker optional nodes. Switching the setting remints that trial’s sitting when the person set changes; fail/Play again keeps the same keys only when the person set is unchanged.

Haber on compounds still matches tú (`has`, not *habés*). No vos split on compounds.

## Trial sitting

Each trial is a small sitting: the trial’s times × verb type × the **effective** person set (standard persons, plus vos and/or vosotros only when selected). Beat = existing `youKnowThis` (5 of last 7 typed, min 5). Same sitting keys for that trial while the person set stays the same. Round 1 cannot mint. One clean round is not a beat.

If Practice already minted those keys, the node is already beaten. Do not force a re-type to proceed.

Fail: name the miss, finish the round, node stays current. Play again remints infinitives on the **same** sitting keys. Save/resume the same node. Never send back to trial 1. Never wipe the atlas. Never mint new keys on fail. Never XP.

Overweight weak cells only after that trial’s first complete pass (same engine as Practice).

## Order

Do not skip. Do not add pretérito anterior. Compounds 20–26 stay after simples.

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

- After 6+7: 8 and 9 may both be open.
- After 9+10: 11 plus an optional review.
- 13 opens when 12 is beaten.
- 17 may sit beside later presente (opens after 5). 18 stays after 14.
- 25 opens with 26 once 20 is beaten. 21 may sit beside 22.
- No subjunctive until 1–2 are beaten (14 also waits for 13).

## Play

Back from play, recap, and the atlas. Journey uses the same Play/recap board as Practice. Island labels and trial catalog live in `src/packs/spanish/journey.js`. Unlock math and atlas layout live in `src/engine/journey.js`.
