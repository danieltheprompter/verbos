import { BOARD_NOTE, TENSES } from "../engine/constants.js";
import { answeredCellKeys, cellAllowed, columnLabels, roundCellState } from "../engine/board.js";

export function Board({ settings, items = [], current, compact = false }) {
  const columns = columnLabels(settings);
  const rows = TENSES.filter((tense) => settings.tenses.includes(tense.id));
  const answered = answeredCellKeys(items);

  return (
    <div className="board-wrap">
      <div
        className={`board ${compact ? "board-compact" : ""}`}
        style={{ "--cols": columns.length }}
        aria-label="This round"
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
      <p className="board-note">{BOARD_NOTE}</p>
    </div>
  );
}
