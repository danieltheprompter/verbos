import { TENSES, TYPE_LINE_BUCKETS, isSingleTypePool, typesInPool } from "../engine/constants.js";
import { cellsFor, columnLabels } from "../engine/board.js";
import { toyCellState, typeReadout } from "../engine/mastery.js";

export function Board({ settings, attempts, current, compact = false }) {
  const columns = columnLabels(settings);
  const rows = TENSES.filter((tense) => settings.tenses.includes(tense.id));
  const paintOwned = isSingleTypePool(settings);
  const singleType = paintOwned ? typesInPool(settings.pool)[0] : null;

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
            const state = toyCellState(attempts, row.id, column.id, {
              paintOwned,
              type: singleType,
            });
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

export function BoardLegend({ paintOwned = true }) {
  return (
    <ul className="legend">
      <li>
        <i className="cell cell-empty" /> empty
      </li>
      <li>
        <i className="cell cell-visit" /> visit
      </li>
      {paintOwned ? (
        <li>
          <i className="cell cell-owned" /> owned
        </li>
      ) : null}
    </ul>
  );
}

export function TypeReadout({ settings, attempts }) {
  if (isSingleTypePool(settings)) return null;
  const rows = typeReadout(attempts, TYPE_LINE_BUCKETS, cellsFor(settings));
  return (
    <p className="type-line" aria-label="Mastery by verb type">
      {rows.map((row, index) => (
        <span key={row.id}>
          {index ? " / " : ""}
          {row.label} {row.visits} visit ·{" "}
          <em className={`type-state ${row.owned ? "is-owned" : ""}`}>{row.owned} owned</em>
        </span>
      ))}
    </p>
  );
}
