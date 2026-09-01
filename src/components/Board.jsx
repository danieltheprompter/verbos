import { BOARD_NOTE, PIP_SLOTS } from "../engine/config.js";
import { tenses as packTenses } from "../engine/pack.js";
import {
  answeredCellKeys,
  cellAllowed,
  cellPips,
  columnLabels,
  roundCellState,
} from "../engine/board.js";

function Pips({ count, slots = PIP_SLOTS }) {
  return (
    <span className="pips" aria-label={`${count} of ${slots}`}>
      {Array.from({ length: slots }, (_, index) => (
        <i key={index} className={index < count ? "is-on" : ""} />
      ))}
    </span>
  );
}

export function Board({ settings, items = [], current, attempts = [], showPips = false }) {
  const columns = columnLabels(settings);
  const rows = packTenses.filter((tense) => settings.tenses.includes(tense.id));
  const answered = answeredCellKeys(items);

  return (
    <div className={`board-wrap ${showPips ? "is-recap" : ""}`}>
      <div
        className="board"
        style={{ "--cols": columns.length }}
        aria-label="This round"
      >
        <div className="board-corner" />
        {columns.map((column) => (
          <div className="board-col" key={column.id}>
            {column.lines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </div>
        ))}
        {rows.map((row) => (
          <div className="board-row-wrap" key={row.id}>
            <div className="board-row-label">{row.boardLabel}</div>
            {columns.map((column) => {
              if (!cellAllowed(row.id, column.id)) {
                return <div key={column.id} className="cell cell-na" />;
              }
              const state = roundCellState(row.id, column.id, current, answered);
              const pips = showPips ? cellPips(attempts, row.id, column.id) : 0;
              return (
                <div
                  key={column.id}
                  className={`cell cell-${state}`}
                  title={`${row.label} · ${column.label}`}
                >
                  {showPips ? <Pips count={pips} /> : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p className="board-note">{BOARD_NOTE}</p>
    </div>
  );
}
