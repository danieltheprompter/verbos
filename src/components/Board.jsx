import { TENSES } from "../engine/constants.js";
import { cellAllowed, columnLabels } from "../engine/board.js";
import { roundCellState } from "../engine/mastery.js";

export function Board({ settings, fills = [], current }) {
  const columns = columnLabels(settings);
  const rows = TENSES.filter((tense) => settings.tenses.includes(tense.id));

  return (
    <div
      className="board"
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
          <div className="board-row-label">{row.short}</div>
          {columns.map((column) => {
            if (!cellAllowed(row.id, column.id)) {
              return <div key={column.id} className="cell cell-na" />;
            }
            const state = roundCellState(fills, current, row.id, column.id);
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
  );
}
