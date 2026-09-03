# Prototype checkpoint

This is a **playable prototype**, not a final product. A major overhaul is planned.

This checkpoint is a **parachute**, not the base of every future commit. Keep stacking changes on the current branch and preserve prior work. Check out the tag / `044396d` only if Daniel asks to revert.

## Frozen commit

| | |
| --- | --- |
| SHA | `044396d4120ed1e5a2c2a3bf93d856e490a332de` |
| Short | `044396d` |
| Message | Randomize each prompt's infinitive from the selected verb pool. |
| Branch | `cursor/verbos-v1-quiz-0e7d` |
| Pull request | https://github.com/danieltheprompter/verbos/pull/1 |
| Date on the tag | 2026-09-02 |

## Tags

Annotated tags. **Do not move them** onto later commits (including this docs commit).

| Tag | Points at |
| --- | --- |
| `prototype-2026-09-02` | `044396d` |
| `prototype-checkpoint` | `044396d` (same commit) |

Tag message: “Playable prototype checkpoint. Do not move this tag.”

- https://github.com/danieltheprompter/verbos/releases/tag/prototype-2026-09-02
- https://github.com/danieltheprompter/verbos/releases/tag/prototype-checkpoint
- [GitHub Release](https://github.com/danieltheprompter/verbos/releases/tag/prototype-2026-09-02) titled **Prototype checkpoint 2026-09-02**

## What this build is

- Randomized prompt order (shuffle cells each round).
- Randomized infinitive per prompt from `verbsForSettings(settings)` (Customize / class-set types and list).
- Play board empty at round start; paints this round only.
- Home cleanup: first visit is Play only; tagline “The conjugation quiz.”
- Recap: misses **Play again for a new mix.** / clean **Nailed it. Play again so it sticks.**

## How to revert (only if asked)

Do not start later work from this tag. Subsequent commits stay on the current branch.

If Daniel explicitly asks to revert:

```bash
git fetch origin tag prototype-2026-09-02
git checkout prototype-2026-09-02
```

Or:

```bash
git checkout 044396d4120ed1e5a2c2a3bf93d856e490a332de
```

`prototype-checkpoint` is an alias for the same SHA.

Docs on the PR branch after this checkpoint describe that SHA. They do not change gameplay.
