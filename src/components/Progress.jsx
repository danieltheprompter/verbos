import { useState } from "react";
import { ENDING_PATTERNS, FORM_COPY, MOODS, VERB_BUCKETS } from "../engine/constants.js";
import { atlasFillName, atlasPersons, buildAtlas } from "../engine/progress.js";
import { ClearProgress } from "./ClearProgress.jsx";

export function Progress({ attempts, onBack, onCustomize, onClear }) {
  const [mood, setMood] = useState("indicative");
  const [type, setType] = useState("regular");
  const [ending, setEnding] = useState("ar");
  const rows = buildAtlas(attempts, { mood, type, ending });
  const persons = atlasPersons(mood);

  return (
    <section className="panel">
      <header className="panel-head">
        <button className="text-back" type="button" onClick={onBack}>
          Back
        </button>
        <h1>What you know</h1>
        <p>An atlas of forms. Typed answers only.</p>
      </header>

      <div className="atlas-tabs" role="tablist" aria-label="Mood">
        {MOODS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={mood === item.id}
            className={`atlas-tab ${mood === item.id ? "is-on" : ""}`}
            onClick={() => setMood(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <fieldset className="atlas-filters">
        <legend>Kind of verb</legend>
        <div className="chips">
          {VERB_BUCKETS.map((bucket) => (
            <button
              key={bucket.id}
              type="button"
              className={`chip ${type === bucket.id ? "is-on" : ""}`}
              onClick={() => setType(bucket.id)}
            >
              {bucket.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="atlas-filters">
        <legend>Ending</legend>
        <div className="chips chips-2">
          {ENDING_PATTERNS.map((pattern) => (
            <button
              key={pattern.id}
              type="button"
              className={`chip ${ending === pattern.id ? "is-on" : ""}`}
              onClick={() => setEnding(pattern.id)}
            >
              {pattern.label}
            </button>
          ))}
        </div>
      </fieldset>

      <p className="atlas-fill">{atlasFillName(mood, type, ending)}</p>

      <div className="atlas" style={{ "--cols": persons.length }} aria-label={`${mood} atlas`}>
        <div className="board-corner" />
        {persons.map((person) => (
          <div className="board-col" key={person.id}>
            {person.label}
          </div>
        ))}
        {rows.map((row) => (
          <div className="board-row-wrap" key={row.tense}>
            <div className="board-row-label">{row.label}</div>
            {row.cells.map((cell) =>
              cell.allowed ? (
                <div
                  key={cell.person}
                  className={`atlas-cell is-${cell.state}`}
                  title={`${row.label} · ${cell.label}`}
                >
                  {cell.copy}
                </div>
              ) : (
                <div key={cell.person} className="atlas-cell is-na" />
              ),
            )}
          </div>
        ))}
      </div>

      <ul className="atlas-key">
        <li>{FORM_COPY.not_enough}</li>
        <li>{FORM_COPY.learning}</li>
        <li>{FORM_COPY.know}</li>
      </ul>

      {onClear ? (
        <section className="clear-block">
          <h2 className="slice-title">Reset</h2>
          <ClearProgress onClear={onClear} />
        </section>
      ) : null}

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
