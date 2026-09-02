import { BOARD_NOTE } from "../engine/config.js";
import { tenses as packTenses } from "../engine/pack.js";
import {
  answeredCellKeys,
  cellAllowed,
  columnLabels,
  roundCellState,
} from "../engine/board.js";
import { sittingCellMarks, sittingVisitCellKeys } from "../engine/mastery.js";

export function Board({
  settings,
  items = [],
  attempts = [],
  sittingKeys = [],
  current,
  recap = false,
  land = null,
  lockIn = false,
}) {
  const columns = columnLabels(settings);
  const rows = packTenses.filter((tense) => settings.tenses.includes(tense.id));
  const answered = new Set([
    ...answeredCellKeys(items),
    ...sittingVisitCellKeys(attempts, sittingKeys),
  ]);
  return (
    <div className={`board-wrap${recap ? " is-recap" : ""}`}>
      <div
        className={`board${lockIn ? " is-snap" : ""}`}
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
        {rows.map((row) => {
          return (
            <div className="board-row-wrap" key={row.id}>
              <div className="board-row-label">
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
                const sittingMarks = sittingCellMarks(
                  attempts,
                  row.id,
                  column.id,
                  sittingKeys,
                );
                const answeredHere = answered.has(`${row.id}:${column.id}`);
                const marks = sittingMarks || (answeredHere ? 1 : 0);
                return (
                  <div
                    key={column.id}
                    className={`cell cell-${state}${isLand ? " is-land" : ""}`}
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
      {false ? <p className="board-note">{BOARD_NOTE}</p> : null}
    </div>
  );
}
