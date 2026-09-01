import { STATE_LABEL, TENSES, TYPE_LINE_BUCKETS } from "../engine/constants.js";
import { cellAllowed, cellsFor, columnLabels } from "../engine/board.js";
import { toyCellState, typeReadout } from "../engine/mastery.js";
import { activeTypes, isSingleTypePool } from "../engine/verbs.js";

export function Board({ settings, attempts, current, compact = false }) {
  const columns = columnLabels(settings);
  const rows = TENSES.filter((tense) => settings.tenses.includes(tense.id));
  const paintOwned = isSingleTypePool(settings);
  const ownedType = paintOwned ? activeTypes(settings)[0] : null;

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
            if (!cellAllowed(row.id, column.id)) {
              return <div key={column.id} className="cell cell-na" />;
            }
            const state = toyCellState(attempts, row.id, column.id, {
              paintOwned,
              type: ownedType,
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
        <i className="cell cell-visit" /> practiced
      </li>
      {paintOwned ? (
        <li>
          <i className="cell cell-owned" /> mastered
        </li>
      ) : null}
    </ul>
  );
}

function typeLineState(row) {
  if (!row.visits) return "empty";
  if (row.owned > 0 && row.owned === row.visits) return "owned";
  return "visit";
}

export function TypeReadout({ settings, attempts }) {
  if (isSingleTypePool(settings)) return null;
  const rows = typeReadout(attempts, TYPE_LINE_BUCKETS, cellsFor(settings));
  return (
    <p className="type-line" aria-label="Progress by verb type">
      {rows.map((row, index) => (
        <span key={row.id}>
          {index ? <span className="type-dot"> · </span> : null}
          {row.label}{" "}
          <em className={`type-state is-${typeLineState(row)}`}>
            {STATE_LABEL[typeLineState(row)]}
          </em>
        </span>
      ))}
    </p>
  );
}
