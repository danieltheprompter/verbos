# Player guide (prototype snapshot)

Screens and copy as implemented at `044396d`. This snapshot has **no XP, points, streaks, or loot**. Atlas fill on the profile is a checklist, not a score and not a lock.

**Back** is a text control on Play, Recap, Customize, Class set, Profile, and What you know. The wordmark on Play / Recap also returns Home.

## Home

Wordmark **VERBOS**. Lede: **The conjugation quiz.**

**First visit** (no finished round, no class set): one black **Play** button. No Warm-up, no Customize, no What you know, no Load class set.

**After a finished round** (`finishedRound`): the primary button is **Play again**. Text links: Customize, **What you know**, **Load class set**.

**After a class set is on the device** (`hasClassSet`): **Warm-up** and the **5 minutes** checkbox appear under Play. Copy: **Stops the round. Misses still just mark red.** The 5:00 setting is device-level (survives reload and class-set load). What you know still appears only after a finished round.

First Play (no class set, no prior finished round) uses the pack default: regulars, Presente and Pretérito, tú address, no extra column.

## Play

One prompt per board cell. Round length is `cellsFor(settings).length` (default board: two times × five persons = 10). Prompt order is shuffled each round.

Each item shows the infinitive and a clue (`tense · person`). Type the conjugated form and **Check**. Accent glyphs (á é í ó ú ü ñ) sit under the field. Accents are required: a form without the written accent does not match.

Blank Check does not count as a miss or a visit.

The play board starts empty. A square fills when you answer this round. Right / wrong is `data-result` on that cell (ok / bad). Sitting pips and career paint do not appear on the play board.

**Multiple choice** (Customize → Round) does not count toward knowing a form (`typed: false`).

Warm-up uses the same cells and pool, with MC and the per-item timer off. If **5 minutes** is on, a session clock (300s) rings **Bell — finish this item**; it does not fail the item.

## Recap

After the last item:

- Banner: **N of M** (hits this round).
- If there were misses: **Missed** plus short person labels.
- Line if any miss: **Play again for a new mix.**
- Line if clean: **Nailed it. Play again so it sticks.**
- Recap board shows this-round hit / miss colors.
- **Play again** remints infinitives on the same cells. Warm-up recap also offers **Done**.

## Customize

“Next round uses these.” Verb types are a multi-select checklist (“Pick any that apply.”) with a checkmark when selected: Regulars, High-frequency irregulars, Stem-changing, Spelling-change. Optional **Pick verbs** chips and **Paste a list**.

Times are grouped by mood (Indicative, Subjunctive, Commands). Pronouns: tú / vos / both, plus optional vosotros column.

Round option: Multiple choice — “Does not count toward knowing a form.”

Play from Customize starts a new sitting. Customize is never locked by atlas fill. If every selected form is already “you know this,” Play is disabled and the note is: **They already know these. Add another time or kind of verb.**

## Class set

Shareable Customize payload. The screen shows a plain-language summary (**People**, **Times**, **Verb types**, **List**). JSON is behind **Show code** / **Hide code**. **Copy class set** and **Load class set** still work.

Loading a class set applies types, tenses, picked verbs, custom list, address, and extra column. It does **not** write the 5:00 bell or wipe the atlas / attempt log. It clears the current sitting keys and sets `hasClassSet`.

## What you know / profile

Home **What you know** opens the career atlas (`Progress`). Profile title: **You, this device.** Lede: **This device. Not an account.**

Profile: display name, people on this device (add / switch), Next Play line, **Atlas fill** checks (“Checks, not locks. Customize always opens.”), a mini board with sitting marks, and **Clear the atlas**.

What you know: mood / verb-kind / ending filters and a career grid. States: **not enough yet**, **still learning**, **you know this**. Mini board sitting pips live here, not on Play.

A form is “you know this” after 5 of the last 7 **typed** attempts on that `formKey` (minimum 5 typed). Round 1 cannot mint that.
