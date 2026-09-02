import { BOARD_NOTE } from "../engine/config.js";
import { tenses as packTenses } from "../engine/pack.js";
import {
  answeredCellKeys,
  cellAllowed,
  columnLabels,
  roundCellState,
} from "../engine/board.js";
import { sittingCellMarks } from "../engine/mastery.js";

export function Board({
  settings,
  items = [],
  attempts = [],
  sittingKeys = [],
  current,
  recap = false,
  land = null,
  flick = null,
  lockIn = false,
}) {
  const columns = columnLabels(settings);
  const rows = packTenses.filter((tense) => settings.tenses.includes(tense.id));
  const answered = answeredCellKeys(items);

  return (
    <div className={`board-wrap${recap ? " is-recap" : ""}`}>
      <div
        className={`board${lockIn ? " is-snap" : ""}`}
        style={{ "--cols": columns.length }}
        aria-label="This round"
      >
        <div className="board-corner" />
        {columns.map((column) => (
          <div
            className={`board-col${
              flick?.axis === "col" && flick.person === column.id ? " is-flick is-flick-col" : ""
            }`}
            key={column.id}
          >
            {column.lines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </div>
        ))}
        {rows.map((row) => {
          const rowFlick = flick?.axis === "row" && flick.tense === row.id;
          return (
            <div className="board-row-wrap" key={row.id}>
              <div
                className={`board-row-label${rowFlick ? " is-flick is-flick-row" : ""}`}
              >
                {row.boardLabel}
              </div>
              {columns.map((column) => {
                if (!cellAllowed(row.id, column.id)) {
                  return <div key={column.id} className="cell cell-na" />;
                }
                const state = roundCellState(row.id, column.id, current, answered);
                const isLand = Boolean(
                  land && land.tense === row.id && land.person === column.id,
                );
                const colFlick = flick?.axis === "col" && flick.person === column.id;
                const axis = colFlick ? "col" : rowFlick ? "row" : null;
                const marks = recap ? sittingCellMarks(attempts, row.id, column.id, sittingKeys) : 0;
                return (
                  <div
                    key={column.id}
                    className={`cell cell-${state}${isLand ? " is-land" : ""}${
                      axis ? ` is-flick is-flick-${axis}` : ""
                    }`}
                    title={`${row.label} · ${column.label}`}
                  >
                    {marks ? (
                      <span className="cell-marks" aria-hidden="true">
                        {Array.from({ length: marks }, (_, index) => (
                          <i key={index} />
                        ))}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      {recap ? null : <p className="board-note">{BOARD_NOTE}</p>}
    </div>
  );
}
