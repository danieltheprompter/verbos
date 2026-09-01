import { useState } from "react";
import { POOL, TARGET_GROUPS } from "../engine/constants.js";

const POOLS = [
  { id: POOL.REGULARS, title: "Regulars", note: "Clean endings only." },
  { id: POOL.IRREGULARS, title: "Common irregulars", note: "Adds ser, ir, tener, hacer…" },
  {
    id: POOL.STEM,
    title: "Stem-changers & spelling changes",
    note: "Adds pensar, dormir, buscar…",
  },
];

export function Customize({ settings, onSave, onBack, onProgress }) {
  const [draft, setDraft] = useState({
    ...settings,
    tenses: [...settings.tenses],
    customList: settings.customList || "",
    address: settings.address || "tu",
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
    <section className="panel">
      <header className="panel-head">
        <button className="text-back" type="button" onClick={onBack}>
          Back
        </button>
        <h1>Customize</h1>
        <p>Next round uses these. First play stays one tap.</p>
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
        <label className="custom-list">
          <span>Custom infinitives</span>
          <textarea
            value={draft.customList}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, customList: event.target.value }))
            }
            rows={3}
            placeholder="hablar, ser, pedir"
            spellCheck="false"
          />
          <em>If this box has verbs, they are the set for the round.</em>
        </label>
      </fieldset>

      {TARGET_GROUPS.map((group) => (
        <fieldset key={group.id}>
          <legend>{group.label}</legend>
          <div className="chips">
            {group.items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`chip ${draft.tenses.includes(item.id) ? "is-on" : ""}`}
                onClick={() => toggleTense(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </fieldset>
      ))}

      <fieldset>
        <legend>Pronouns</legend>
        <div className="chips chips-3">
          {[
            { id: "tu", label: "tú" },
            { id: "vos", label: "vos" },
            { id: "both", label: "both" },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              className={`chip ${draft.address === option.id ? "is-on" : ""}`}
              onClick={() => setDraft((prev) => ({ ...prev, address: option.id }))}
            >
              {option.label}
            </button>
          ))}
        </div>
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
            Adds a column. Off by default.
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
            Crutch only. Does not count toward mastered.
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
        {onProgress ? (
          <button className="btn btn-ghost" type="button" onClick={onProgress}>
            Progress
          </button>
        ) : null}
        <button className="btn btn-ghost" type="button" onClick={onBack}>
          Back
        </button>
      </div>
    </section>
  );
}
