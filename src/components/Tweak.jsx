import { useState } from "react";
import { POOL, TENSES } from "../engine/constants.js";

const POOLS = [
  { id: POOL.REGULARS, title: "Regulars", note: "Clean endings only." },
  { id: POOL.IRREGULARS, title: "High-frequency irregulars", note: "Adds ser, ir, tener, hacer…" },
  { id: POOL.STEM, title: "Stem-changers + spelling", note: "Adds pensar, dormir, buscar…" },
];

export function Tweak({ settings, onSave, onBack }) {
  const [draft, setDraft] = useState({
    ...settings,
    tenses: [...settings.tenses],
  });

  function toggleTense(id) {
    setDraft((prev) => {
      const on = prev.tenses.includes(id);
      if (on && prev.tenses.length === 1) return prev;
      return {
        ...prev,
        tenses: on ? prev.tenses.filter((tense) => tense !== id) : [...prev.tenses, id],
      };
    });
  }

  return (
    <section className="tweak">
      <header className="tweak-head">
        <h1>Tweak</h1>
        <p>One screen. Next round uses these.</p>
      </header>

      <fieldset>
        <legend>Verb pool</legend>
        <div className="steps">
          {POOLS.map((pool) => (
            <button
              key={pool.id}
              type="button"
              className={`step ${draft.pool === pool.id ? "is-on" : ""}`}
              onClick={() => setDraft((prev) => ({ ...prev, pool: pool.id }))}
            >
              <strong>{pool.title}</strong>
              <span>{pool.note}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Tenses</legend>
        <div className="chips">
          {TENSES.map((tense) => (
            <button
              key={tense.id}
              type="button"
              className={`chip ${draft.tenses.includes(tense.id) ? "is-on" : ""}`}
              onClick={() => toggleTense(tense.id)}
            >
              {tense.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Persons</legend>
        <label className="switch">
          <input
            type="checkbox"
            checked={draft.vos}
            onChange={(event) => setDraft((prev) => ({ ...prev, vos: event.target.checked }))}
          />
          <span>
            <strong>vos</strong>
            Replaces tú. Rioplatense forms in the same slot.
          </span>
        </label>
        <label className="switch">
          <input
            type="checkbox"
            checked={draft.vosotros}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, vosotros: event.target.checked }))
            }
          />
          <span>
            <strong>vosotros</strong>
            Adds a sixth column. Off by default.
          </span>
        </label>
      </fieldset>

      <fieldset>
        <legend>Answer</legend>
        <label className="switch">
          <input
            type="checkbox"
            checked={draft.mc}
            onChange={(event) => setDraft((prev) => ({ ...prev, mc: event.target.checked }))}
          />
          <span>
            <strong>Multiple choice</strong>
            Crutch only. Never counts toward owned.
          </span>
        </label>
      </fieldset>

      <fieldset>
        <legend>Timer</legend>
        <label className="switch">
          <input
            type="checkbox"
            checked={draft.timer}
            onChange={(event) => setDraft((prev) => ({ ...prev, timer: event.target.checked }))}
          />
          <span>
            <strong>Per-item timer</strong>
            Hidden until you turn it on.
          </span>
        </label>
        {draft.timer ? (
          <div className="chips">
            {[8, 12, 16].map((sec) => (
              <button
                key={sec}
                type="button"
                className={`chip ${draft.timerSec === sec ? "is-on" : ""}`}
                onClick={() => setDraft((prev) => ({ ...prev, timerSec: sec }))}
              >
                {sec}s
              </button>
            ))}
          </div>
        ) : null}
      </fieldset>

      <div className="home-actions">
        <button className="btn btn-primary" type="button" onClick={() => onSave(draft)}>
          Play
        </button>
        <button className="btn btn-ghost" type="button" onClick={onBack}>
          Back
        </button>
      </div>
    </section>
  );
}
