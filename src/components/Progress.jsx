import { useState } from "react";
import { FORM_COPY, RANK_PATH } from "../engine/config.js";
import { pack } from "../engine/pack.js";
import { atlasFillStats, atlasPersons, buildAtlas } from "../engine/progress.js";
import { ClearProgress } from "./ClearProgress.jsx";

export function Progress({ attempts, onBack, onCustomize, onClear }) {
  const [mood, setMood] = useState(pack.moods[0]?.id);
  const [type, setType] = useState(pack.verbBuckets[0]?.id);
  const [ending, setEnding] = useState(pack.endingPatterns[0]?.id);
  const rows = buildAtlas(attempts, { mood, type, ending });
  const persons = atlasPersons(mood);
  const fill = atlasFillStats(attempts, { mood, type, ending });

  return (
    <section className="panel career">
      <header className="panel-head career-head">
        <button className="text-back" type="button" onClick={onBack}>
          Back
        </button>
        <p className="career-kicker">What you know</p>
        <h1 className="atlas-rank">{fill.line}</h1>
        <ol className="rank-path" aria-label="Path">
          {RANK_PATH.map((rank) => (
            <li key={rank.id} className={rank.id === fill.rank ? "is-now" : ""}>
              {rank.label}
            </li>
          ))}
        </ol>
        <p className="atlas-fill">{fill.name}</p>
      </header>

      <div className="atlas-tabs" role="tablist" aria-label="Mood">
        {pack.moods.map((item) => (
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

      <div className="atlas-filters">
        <p className="times-mood">Kind of verb</p>
        <div className="chips">
          {pack.verbBuckets.map((bucket) => (
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
      </div>

      {pack.endingPatterns?.length ? (
        <div className="atlas-filters">
          <p className="times-mood">{pack.chrome?.endingFilter || "Ending"}</p>
          <div className="chips chips-2">
            {pack.endingPatterns.map((pattern) => (
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
        </div>
      ) : null}

      <div className="atlas" style={{ "--cols": persons.length }} aria-label={`${mood} atlas`}>
        <div className="board-corner" />
        {persons.map((person) => (
          <div className="board-col" key={person.id}>
            {(person.lines || [person.label]).map((line) => (
              <span key={line}>{line}</span>
            ))}
          </div>
        ))}
        {rows.map((row) => (
          <div className="board-row-wrap" key={row.tense}>
            <div className="board-row-label">{row.label}</div>
            {row.cells.map((cell) =>
              cell.allowed ? (
                <div
                  key={cell.person}
                  className={`atlas-cell is-${cell.state}${cell.opened ? " is-open" : ""}`}
                  title={`${row.label} · ${cell.label}`}
                  aria-label={`${row.label} · ${cell.label}: ${cell.copy}`}
                />
              ) : (
                <div key={cell.person} className="atlas-cell is-na" />
              ),
            )}
          </div>
        ))}
      </div>

      <ul className="atlas-key">
        <li>
          <i className="key-swatch is-not_enough" />
          {FORM_COPY.not_enough}
        </li>
        <li>
          <i className="key-swatch is-learning" />
          {FORM_COPY.learning}
        </li>
        <li>
          <i className="key-swatch is-know" />
          {FORM_COPY.know}
        </li>
      </ul>

      {onClear ? (
        <section className="clear-block">
          <p className="times-mood">Atlas</p>
          <ClearProgress onClear={onClear} />
        </section>
      ) : null}

      <div className="home-actions">
        {onCustomize ? (
          <button className="btn btn-ghost" type="button" onClick={onCustomize}>
            Customize
          </button>
        ) : null}
        <button className="btn btn-ghost" type="button" onClick={onBack}>
          Back
        </button>
      </div>
    </section>
  );
}
