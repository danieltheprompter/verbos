# VERBOS

The conjugation quiz.

This repository is a **playable prototype**. The quiz shell is language-agnostic. The shipped content pack is Spanish (`src/packs/spanish/`), including Rioplatense **vos**. There is no language picker yet.

**Prototype checkpoint (do not move):** tag `prototype-2026-09-02` (also `prototype-checkpoint`) at commit `044396d4120ed1e5a2c2a3bf93d856e490a332de`. That tag is a parachute only — not the base of every future commit. Keep stacking changes on the current branch. Check out the tag only if Daniel asks to revert.

## Run

```bash
npm install
npm run dev
```

Vite serves the app at [http://localhost:5173](http://localhost:5173).

```bash
npm test
```

## Restore the prototype (only if asked to revert)

Keep working on the current branch. Do not rebuild later work from this tag.

```bash
git checkout prototype-2026-09-02
```

`prototype-checkpoint` points at the same commit.

[Release: Prototype checkpoint 2026-09-02](https://github.com/danieltheprompter/verbos/releases/tag/prototype-2026-09-02)

## Practice and Journey

Home has two entries. **Practice** is the free loop (Play, Customize, What you know). First visit is one-tap Practice. **Journey** is a gated path of trials (unlocked by default for playtest). See [docs/JOURNEY.md](docs/JOURNEY.md).

## What this snapshot does

- First Home visit: **VERBOS**, “The conjugation quiz.”, one **Play** button.
- After a finished round: **Play again** plus text links (Customize, What you know, Load class set).
- Warm-up and the device **5 minutes** checkbox appear only after a class set is loaded.
- Each round is one prompt per board cell (`cellsFor(settings).length`). Cell order is shuffled. The play board starts empty and paints this round only.
- Each prompt picks an infinitive at random from the selected Customize / class-set verb pool. Play again remints; infinitives are not pinned to a person.
- Accents are required. No XP, points, streaks, or loot.

## Docs

- [docs/PROTOTYPE.md](docs/PROTOTYPE.md) — checkpoint SHA, date, revert only if asked
- [docs/PLAYER.md](docs/PLAYER.md) — screens and play loop
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — shell vs pack, file map, storage
- [docs/DATA.md](docs/DATA.md) — attempt log, formKey, settings, class-set payload
- [docs/CONSTRAINTS.md](docs/CONSTRAINTS.md) — freeze list for this snapshot
- [docs/JOURNEY.md](docs/JOURNEY.md) — Practice vs Journey, trial order, gate
