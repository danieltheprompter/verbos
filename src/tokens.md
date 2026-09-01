# VERBOS tokens

Shared names for web (`src/tokens.css`) and later iOS. Light-first. Paper / ink / owned-rust.

| Token | Use |
| --- | --- |
| `--color-paper`, `--color-paper-2` | Page |
| `--color-ink`, `--color-ink-soft`, `--color-rule` | Type and lines |
| `--color-empty`, `--color-well` | Unfinished square |
| `--color-visit` | This-round fill (not right/wrong) |
| `--color-owned` | Only strength color (you know this) |
| `--color-now`, `--color-now-ring` | Active square |
| `--color-ok`, `--color-bad` | Input only |
| `--type-display` | Wordmark, infinitive, board labels |
| `--type-ui` | Buttons, notes |
| `--space-1` … `--space-6` | Rhythm |
| `--radius-cell`, `--radius-board`, `--radius-pill` | Toy vs chrome |
| `--motion-visit` (180ms), `--motion-owned` (220ms) | Land / lock |
| `--motion-flick` (220ms), `--motion-snap` (180ms) | Miss flick / board snap |
| `--motion-recap` (1600ms) | Recap beat |

Cell states on the round board: **empty / visit**. **owned** is atlas only. Right/wrong never paints a cell.
