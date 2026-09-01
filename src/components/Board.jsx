import { BOARD_NOTE, PIP_SLOTS, TENSES } from "../engine/constants.js";
import {
  answeredCellKeys,
  cellAllowed,
  columnLabels,
  lastRoundResult,
  roundCellState,
  typedPips,
} from "../engine/board.js";

function Pips({ on }) {
  return (
    <span className="pips" aria-hidden="true">
      {Array.from({ length: PIP_SLOTS }, (_, index) => (
        <i key={index} className={index < on ? "is-on" : undefined} />
      ))}
    </span>
  );
}

export function Board({ settings, items = [], attempts = [], current, recap = false }) {
  const columns = columnLabels(settings);
  const rows = TENSES.filter((tense) => settings.tenses.includes(tense.id));
  const answered = answeredCellKeys(items);

  return (
    <div className="board-wrap">
      <div
        className={`board ${recap ? "board-recap" : ""}`}
        style={{ "--cols": columns.length }}
        aria-label={recap ? "This round, frozen" : "This round"}
      >
        <div className="board-corner" />
        {columns.map((column) => (
          <div className="board-col" key={column.id}>
            {column.label}
          </div>
        ))}
        {rows.map((row) => (
          <div className="board-row-wrap" key={row.id}>
            <div className="board-row-label">{row.boardLabel}</div>
            {columns.map((column) => {
              if (!cellAllowed(row.id, column.id)) {
                return <div key={column.id} className="cell cell-na" />;
              }
              if (recap) {
                const ok = lastRoundResult(items, row.id, column.id);
                const pips = typedPips(attempts, row.id, column.id);
                const tone = ok === true ? "ok" : ok === false ? "bad" : "empty";
                return (
                  <div
                    key={column.id}
                    className={`cell recap-cell cell-${tone}`}
                    title={`${row.label} · ${column.label}`}
                  >
                    <Pips on={pips} />
                  </div>
                );
              }
              const state = roundCellState(row.id, column.id, current, answered);
              return (
                <div
                  key={column.id}
                  className={`cell cell-${state}`}
                  title={`${row.label} · ${column.label}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      {recap ? null : <p className="board-note">{BOARD_NOTE}</p>}
    </div>
  );
}
