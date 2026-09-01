import { DEFAULT_SETTINGS } from "../engine/constants.js";
import { columnLabels } from "../engine/board.js";
import { miniCellPaint } from "../engine/levels.js";
import { tenses as packTenses } from "../engine/pack.js";

export function MiniBoard({ attempts = [] }) {
  const columns = columnLabels(DEFAULT_SETTINGS);
  const rows = packTenses.filter((tense) => DEFAULT_SETTINGS.tenses.includes(tense.id));

  return (
    <div className="mini-board" style={{ "--cols": columns.length }} aria-label="Mini board">
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
            const paint = miniCellPaint(attempts, row.id, column.id);
            const know = paint === "know";
            return (
              <div
                key={column.id}
                className={`atlas-cell mini-cell${know ? " is-know is-open" : ""}`}
                title={`${row.label} · ${column.label}`}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
