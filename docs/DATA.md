# Data shapes (prototype snapshot)

Taken from `044396d` (`src/engine/storage.js`, `mastery.js`, `classSet.js`, `config.js`, `packs/spanish/content.js`).

## Storage key

`verbos.v1`

Blob written by `saveState`:

```json
{
  "settings": {},
  "hasClassSet": false,
  "warmupBell": false,
  "sittingKeys": [],
  "atlasKeys": [],
  "activeProfileId": "p1",
  "profiles": []
}
```

Top-level `sittingKeys` / `atlasKeys` are copies of the active profile’s keys (legacy-friendly). Each profile’s `attempts` are sliced to the last 400 on write.

## Profile

`blankProfile`:

| Field | Meaning |
| --- | --- |
| `id` | Profile id |
| `name` | Display name (empty → “You”) |
| `attempts` | Attempt log |
| `finishedRound` | True after a non–warm-up round finishes |
| `lastCells` | Last sitting’s cells (`tense`, `person`, `type`, `ending`, `verb`) |
| `sittingKeys` | Current sitting `formKey` strings |
| `atlasKeys` | Career keys; kept when a class set clears sitting keys |

## Settings

Pack default (`defaultSettings` in `src/packs/spanish/content.js`):

| Field | Default |
| --- | --- |
| `types` | `["regular"]` |
| `tenses` | `["presente", "preterito"]` |
| `address` | `"tu"` (`"vos"` / `"both"` also valid) |
| `extraColumn` | `false` (vosotros when true) |
| `pickedVerbs` | `[]` |
| `customList` | `""` |
| `timer` | `false` |
| `timerSec` | `12` |
| `mc` | `false` |

`saveSettings` / `loadClassSet` keep the device `timer`, `timerSec`, `mc`, and `warmupBell` rather than taking them from a class-set payload.

## formKey

```
mood:time:person:type:ending
```

Example: `indicative:presente:yo:regular:ar`

Built by `formKey` / `itemFormKey` in `src/engine/mastery.js`. Type is the verb bucket (`regular`, `irregular`, `stem`, `spelling`). Ending is `ar` or `er_ir`.

Sitting keys are stored as these strings. At play time they select **cells** (tense × person). The infinitive is not part of the key and is not pinned.

Mastery (“you know this”): last 7 **typed** attempts on that formKey; need 5 correct; minimum 5 typed (`MASTERY_WINDOW` 7, `MASTERY_NEED` 5, `MASTERY_MIN` 5). Multiple-choice attempts set `typed: false` and do not count.

## Attempt log

`toLogAttempt` / Play `judge` write:

| Field | Source |
| --- | --- |
| `attempt_id` | UUID |
| `mood` | From tense or item |
| `time` | From tense or item |
| `tense` | Item tense id |
| `person` | Person id (`yo`, `tu`, `vos`, `el`, `nos`, `vosotros`, `ellos`) |
| `verb` | Infinitive |
| `verb_type` / `type` | Bucket |
| `ending_pattern` | `ar` or `er_ir` |
| `expected` | Target form |
| `given` | What was submitted |
| `correct` | Boolean |
| `typed` | `true` unless multiple choice |
| `latency_ms` | Time on the item, or `null` |
| `content_version` | `"v1"` |
| `ts` | Write time |

Blank Check does not write an attempt.

## Class-set payload

`CLASS_SET_FIELDS`: `types`, `tenses`, `pickedVerbs`, `customList`, `address`, `extraColumn`.

`classSetFromSettings` / `encodeClassSet`:

```json
{
  "v": 1,
  "types": ["regular"],
  "tenses": ["presente", "preterito"],
  "pickedVerbs": [],
  "customList": "",
  "address": "tu",
  "extraColumn": false
}
```

`parseClassSet` requires at least one known tense and at least one of: types, picked verbs, or a non-empty custom list. It ignores `timer`, `warmupBell`, and `sittingKeys`.

Plain-language summary lines: People, Times, Verb types, List (`classSetSummaryLines`).
