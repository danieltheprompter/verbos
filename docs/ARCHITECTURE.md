# Architecture (prototype snapshot)

Accurate to `044396d`.

## Shell vs pack

The quiz loop is language-agnostic. `src/engine/pack.js` imports the active content pack and re-exports verbs, persons, tenses, and chrome. Spanish lives under `src/packs/spanish/` (`content.js` labels and defaults, `verbs.js` conjugation and pools).

A future language is another pack. Swap the import in `pack.js`. There is **no language picker** in this snapshot.

Spanish v1 includes Rioplatense **vos** as an address option (`tu` / `vos` / `both`) and as a person column when selected. Default address is `tu`.

Shell files must not hardcode language literals (tense ids, infinitives, “Spanish”). Isolation tests lock that.

## File map

| Path | Role |
| --- | --- |
| `src/main.jsx` | Mount |
| `src/App.jsx` | Screens, Play / Play again, sitting recovery |
| `src/components/Home.jsx` | First-visit Play; later Play again + links |
| `src/components/Play.jsx` | Prompt, check, recap |
| `src/components/Board.jsx` | This-round play / recap grid |
| `src/components/Customize.jsx` | Types, times, pronouns, class-set embed |
| `src/components/ClassSet.jsx` | Load / copy class set |
| `src/components/Profile.jsx` | Device people, atlas-fill checks |
| `src/components/Progress.jsx` | What you know (career atlas) |
| `src/components/MiniBoard.jsx` | Sitting pips + atlas paint (profile / atlas only) |
| `src/components/ClearProgress.jsx` | Clear the atlas |
| `src/engine/round.js` | `buildRound`, `playAgainRound`, `mapSittingKeys`, `pickVerb` |
| `src/engine/board.js` | `cellsFor`, columns, this-round cell state |
| `src/engine/mastery.js` | `formKey`, 5-of-7 typed window, sitting helpers |
| `src/engine/storage.js` | `localStorage`, profiles, class-set load |
| `src/engine/classSet.js` | Payload fields, summary lines |
| `src/engine/check.js` | Accents-required match |
| `src/engine/recap.js` | N of M, Missed, recap lines |
| `src/engine/warmup.js` | Warm-up settings, 5:00 bell |
| `src/engine/config.js` | Chrome copy, `STORAGE_KEY`, mastery constants |
| `src/engine/constants.js` | Re-exports + pack-derived defaults |
| `src/engine/levels.js` | Named atlas-fill checks (not locks) |
| `src/engine/progress.js` | Career atlas grid |
| `src/engine/miss.js` / pack `explainMiss` | Miss hints |
| `src/engine/verbs.js` | Re-export from the pack |
| `src/engine/random.js` | `pick`, `shuffle` |
| `src/packs/spanish/` | Spanish content and conjugation |

## Rounds

- Size is always `cellsFor(settings).length` (one cell = tense × person).
- First Play and fill paths shuffle cells, then `verbForCell` → `pickVerb` from `verbsForSettings(settings)`.
- Play again calls `playAgainRound` → `mapSittingKeys`. Sitting keys supply **cells** (mood/time/person → tense × person). Infinitives are a fresh `pickVerb` from the selected pool. Last-round infinitives are not pinned.
- `verbsForSettings`: if `pickedVerbs` or a custom list is set, that list is the pool; otherwise all verbs whose `type` is in `settings.types`.

## Play board vs atlas

- Play / recap `Board` uses `answeredCellKeys(items)` and `lastRoundResult`. Empty at round start. No sitting marks.
- What you know / Profile `MiniBoard` uses sitting marks and atlas paint.

## Storage and profiles

Key: `verbos.v1` (`STORAGE_KEY`). One blob on the device: settings, `hasClassSet`, `warmupBell`, active profile id, profiles (attempts capped at 400 each).

A profile has `attempts`, `finishedRound`, `lastCells`, `sittingKeys`, `atlasKeys`. Sitting keys are stored as `formKey` strings. Play again remints verbs onto those keys’ cells; it does not keep the same infinitive.

`warmupBell` is device-level. Class-set load and Customize save preserve it. Class-set JSON does not include timer or bell.

## Class set vs atlas

`loadClassSet` applies `CLASS_SET_FIELDS` only (`types`, `tenses`, `pickedVerbs`, `customList`, `address`, `extraColumn`), sets `hasClassSet`, clears **sitting** keys. It does **not** clear `atlasKeys` or `attempts`.

## 5:00 Warm-up

Home shows Warm-up + **5 minutes** only when `hasClassSet`. Checking the box sets `store.warmupBell`. Warm-up start passes `session: 300` when the box is on. Session expiry rings the bell; it does not mark the item wrong.
