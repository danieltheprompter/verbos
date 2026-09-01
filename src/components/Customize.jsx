import { useState } from "react";
import { TARGET_GROUPS, VERB_BUCKETS } from "../engine/constants.js";

export function Customize({ settings, onSave, onBack, onProgress }) {
  const [draft, setDraft] = useState({
    ...settings,
    tenses: [...settings.tenses],
    buckets: settings.buckets?.length ? [...settings.buckets] : ["regular"],
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

  function toggleBucket(id) {
    setDraft((prev) => {
      const on = prev.buckets.includes(id);
      if (on && prev.buckets.length === 1) return prev;
      return {
        ...prev,
        buckets: on ? prev.buckets.filter((bucket) => bucket !== id) : [...prev.buckets, id],
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
        <legend>Verb sets</legend>
        <div className="steps">
          {VERB_BUCKETS.map((bucket) => (
            <button
              key={bucket.id}
              type="button"
              className={`step ${draft.buckets.includes(bucket.id) ? "is-on" : ""}`}
              onClick={() => toggleBucket(bucket.id)}
            >
              <strong>{bucket.label}</strong>
              <span>{bucket.examples}</span>
            </button>
          ))}
        </div>
        <label className="custom-list">
          <span>Pick specific verbs</span>
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
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, mc: event.target.checked }))
            }
          />
          <span>
            <strong>Multiple choice</strong>
            Crutch only. Does not count toward knowing a cell.
          </span>
        </label>
      </fieldset>

      <fieldset>
        <legend>Timer</legend>
        <label className="switch">
          <input
            type="checkbox"
            checked={draft.timer}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, timer: event.target.checked }))
            }
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
