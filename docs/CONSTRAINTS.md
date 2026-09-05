# Constraints (prototype snapshot)

Freeze list for `044396d` / tag `prototype-2026-09-02`. Do not treat later docs commits as a new gameplay baseline.

## Product

- No XP, loot, streaks, points, grades-as-score, accounts, or SIS.
- Customize is never locked. Atlas fill is “Checks, not locks. Customize always opens.”
- First Home is Play only (wordmark + “The conjugation quiz.” + one Play).
- Accents are required (`answersMatch` does not strip diacritics).
- Spanish content ships first. The quiz shell stays language-agnostic. No language picker.
- Rioplatense vos is v1 Spanish content (address option + person), not a separate product.

## Play loop

- Round size = `cellsFor(settings).length`. One prompt per board cell.
- Shuffle cell order each round.
- Play board starts empty and paints this round only (no sitting pips on Play).
- Infinitive per prompt = random pick from `verbsForSettings(settings)`. Do not pin last round’s infinitive to a formKey or person.
- Play again uses `playAgainRound` (not `buildRound`) and remints verbs.
- Recap copy: misses **Play again for a new mix.** / clean **Nailed it. Play again so it sticks.** Banner is **N of M**. Misses line is **Missed …**.
- Multiple choice does not count toward knowing a form.
- Blank Check is not a miss or a visit.
- No miss-retry / red-tile targeting in this snapshot.

## Home and class set

- Warm-up and **5 minutes** only after a class set is on the device.
- What you know only after a finished round.
- 5:00 (`warmupBell`) is device-level. Class set must not write it or fail the item when it rings.
- Class set must not wipe the atlas (`atlasKeys` / attempts). It may clear sitting keys.

## Code boundaries

- Language literals stay in `src/packs/spanish/`. Not in `App.jsx`, Home, Customize, ClassSet, `config.js`, `round.js`, `Board.jsx`, `recap.js`, `storage.js`.
- Future languages are packs. Do not add a chrome language switch in this snapshot’s design.

## Checkpoint

Gameplay, UI copy, tests, and engine behavior at `044396d` are the tagged prototype. That tag is a parachute, not the base of every future commit. Keep stacking changes on the current branch unless Daniel asks to revert. Documentation after the tag must not retag or move `prototype-2026-09-02` / `prototype-checkpoint`.
