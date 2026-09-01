import { TENSES } from "../engine/constants.js";
import { columnLabels } from "../engine/board.js";
import { cellState } from "../engine/mastery.js";

export function Board({ settings, attempts, current, compact = false }) {
  const columns = columnLabels(settings);
  const rows = TENSES.filter((tense) => settings.tenses.includes(tense.id));

  return (
    <div
      className={`board ${compact ? "board-compact" : ""}`}
      style={{ "--cols": columns.length }}
      aria-label="Conjugation board"
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
            const state = cellState(attempts, row.id, column.id);
            const active =
              current && current.tense === row.id && current.person === column.id;
            return (
              <div
                key={column.id}
                className={`cell cell-${state}${active ? " cell-now" : ""}`}
                title={`${row.label} · ${column.label}`}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function BoardLegend() {
  return (
    <ul className="legend">
      <li>
        <i className="cell cell-empty" /> empty
      </li>
      <li>
        <i className="cell cell-visit" /> visit
      </li>
      <li>
        <i className="cell cell-owned" /> owned
      </li>
    </ul>
  );
}
