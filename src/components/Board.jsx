import { BOARD_NOTE, PIP_SLOTS } from "../engine/config.js";
import { tenses as packTenses } from "../engine/pack.js";
import {
  answeredCellKeys,
  cellAllowed,
  cellPips,
  columnLabels,
  roundCellState,
} from "../engine/board.js";

function Pips({ count, slots = PIP_SLOTS, tick = false }) {
  return (
    <span className="pips" aria-label={`${count} of ${slots}`}>
      {Array.from({ length: slots }, (_, index) => (
        <i
          key={index}
          className={index < count ? `is-on${tick ? " is-tick" : ""}` : ""}
          style={tick && index < count ? { animationDelay: `${index * 70}ms` } : undefined}
        />
      ))}
    </span>
  );
}

export function Board({
  settings,
  items = [],
  current,
  attempts = [],
  showPips = false,
  pipTick = false,
  land = null,
  flick = null,
  lockIn = false,
}) {
  const columns = columnLabels(settings);
  const rows = packTenses.filter((tense) => settings.tenses.includes(tense.id));
  const answered = answeredCellKeys(items);

  return (
    <div className={`board-wrap ${showPips ? "is-recap" : ""}`}>
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
        {rows.map((row) => (
          <div className="board-row-wrap" key={row.id}>
            <div className="board-row-label">{row.boardLabel}</div>
            {columns.map((column) => {
              if (!cellAllowed(row.id, column.id)) {
                return <div key={column.id} className="cell cell-na" />;
              }
              const state = roundCellState(row.id, column.id, current, answered);
              const pips = showPips ? cellPips(attempts, row.id, column.id) : 0;
              const isLand = Boolean(
                land && land.tense === row.id && land.person === column.id,
              );
              const isFlick =
                (flick?.axis === "col" && flick.person === column.id) ||
                (flick?.axis === "row" && flick.tense === row.id);
              return (
                <div
                  key={column.id}
                  className={`cell cell-${state}${isLand ? " is-land" : ""}${
                    isFlick ? ` is-flick is-flick-${flick.axis}` : ""
                  }`}
                  title={`${row.label} · ${column.label}`}
                >
                  {showPips ? <Pips count={pips} tick={pipTick} /> : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {showPips ? null : <p className="board-note">{BOARD_NOTE}</p>}
    </div>
  );
}
