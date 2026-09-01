import { useState } from "react";
import { ATLAS_LABEL, FAMILIES, VERB_BUCKETS } from "../engine/constants.js";
import { atlasGrid, atlasMoods } from "../engine/progress.js";

const TYPE_FILTERS = [{ id: "", label: "All kinds" }, ...VERB_BUCKETS];
const FAMILY_FILTERS = [{ id: "", label: "All endings" }, ...FAMILIES];

export function Progress({ attempts, onBack, onCustomize }) {
  const [mood, setMood] = useState("indicative");
  const [type, setType] = useState("");
  const [family, setFamily] = useState("");
  const grid = atlasGrid(attempts, mood, {
    type: type || undefined,
    family: family || undefined,
  });

  return (
    <section className="panel">
      <header className="panel-head">
        <button className="text-back" type="button" onClick={onBack}>
          Back
        </button>
        <h1>Progress</h1>
        <p>Times × persons. Filter by kind of verb and -ar vs -er / -ir.</p>
      </header>

      <fieldset>
        <legend>Mood</legend>
        <div className="chips chips-3">
          {atlasMoods().map((item) => (
            <button
              key={item.id}
              type="button"
              className={`chip ${mood === item.id ? "is-on" : ""}`}
              onClick={() => setMood(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Kind of verb</legend>
        <div className="chips">
          {TYPE_FILTERS.map((item) => (
            <button
              key={item.id || "all-type"}
              type="button"
              className={`chip ${type === item.id ? "is-on" : ""}`}
              onClick={() => setType(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>-ar vs -er / -ir</legend>
        <div className="chips chips-3">
          {FAMILY_FILTERS.map((item) => (
            <button
              key={item.id || "all-family"}
              type="button"
              className={`chip ${family === item.id ? "is-on" : ""}`}
              onClick={() => setFamily(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div
        className="board atlas"
        style={{ "--cols": grid.columns.length }}
        aria-label={`${mood} atlas`}
      >
        <div className="board-corner" />
        {grid.columns.map((column) => (
          <div className="board-col" key={column.id}>
            {column.label}
          </div>
        ))}
        {grid.rows.map((row) => (
          <div className="board-row-wrap" key={row.id}>
            <div className="board-row-label">{row.short}</div>
            {row.cells.map((cell) => (
              <div
                key={cell.person}
                className={`cell cell-${cell.state}`}
                title={cell.label}
              />
            ))}
          </div>
        ))}
      </div>

      <ul className="legend atlas-key">
        {Object.entries(ATLAS_LABEL).map(([state, label]) => (
          <li key={state}>
            <i className={`cell cell-${state}`} /> {label}
          </li>
        ))}
      </ul>
      <p className="done-note">
        A cell is tense × person × kind of verb × -ar vs -er / -ir. tú and vos stay
        separate.
      </p>

      <div className="home-actions">
        <button className="btn btn-ghost" type="button" onClick={onCustomize}>
          Customize
        </button>
        <button className="btn btn-ghost" type="button" onClick={onBack}>
          Back
        </button>
      </div>
    </section>
  );
}
