import { useState } from "react";
import { FARM_NOTE, TARGET_GROUPS, VERB_BUCKETS } from "../engine/constants.js";
import { allSelectedKnown } from "../engine/mastery.js";
import { verbsInBucket } from "../engine/verbs.js";
import { ClearProgress } from "./ClearProgress.jsx";

export function Customize({ settings, attempts = [], onSave, onBack, onProgress, onClear }) {
  const [draft, setDraft] = useState({
    ...settings,
    tenses: [...settings.tenses],
    types: [...(settings.types || ["regular"])],
    pickedVerbs: [...(settings.pickedVerbs || [])],
    customList: settings.customList || "",
    address: settings.address || "tu",
  });
  const [showPicker, setShowPicker] = useState(Boolean(draft.pickedVerbs.length));
  const farmingKnown = allSelectedKnown(draft, attempts);

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

  function toggleType(id) {
    setDraft((prev) => {
      const on = prev.types.includes(id);
      const next = on ? prev.types.filter((type) => type !== id) : [...prev.types, id];
      if (!next.length && !prev.pickedVerbs.length && !String(prev.customList || "").trim()) {
        return prev;
      }
      return { ...prev, types: next };
    });
  }

  function togglePicked(infinitive) {
    setDraft((prev) => {
      const on = prev.pickedVerbs.includes(infinitive);
      return {
        ...prev,
        pickedVerbs: on
          ? prev.pickedVerbs.filter((verb) => verb !== infinitive)
          : [...prev.pickedVerbs, infinitive],
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
        <legend>Verb set</legend>
        <div className="buckets">
          {VERB_BUCKETS.map((bucket) => (
            <button
              key={bucket.id}
              type="button"
              className={`bucket ${draft.types.includes(bucket.id) ? "is-on" : ""}`}
              onClick={() => toggleType(bucket.id)}
            >
              <strong>{bucket.label}</strong>
              <span>{bucket.examples}</span>
            </button>
          ))}
        </div>
        <button
          className="btn btn-ghost picker-toggle"
          type="button"
          onClick={() => setShowPicker((open) => !open)}
        >
          {showPicker ? "Hide verb picker" : "Pick verbs"}
        </button>
        {showPicker ? (
          <div className="verb-picker">
            {VERB_BUCKETS.map((bucket) => (
              <div key={bucket.id} className="picker-group">
                <p className="picker-label">{bucket.label}</p>
                <div className="chips">
                  {verbsInBucket(bucket.id).map((verb) => (
                    <button
                      key={verb.inf}
                      type="button"
                      className={`chip ${draft.pickedVerbs.includes(verb.inf) ? "is-on" : ""}`}
                      onClick={() => togglePicked(verb.inf)}
                    >
                      {verb.inf}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
        <label className="custom-list">
          <span>Paste a list</span>
          <textarea
            value={draft.customList}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, customList: event.target.value }))
            }
            rows={3}
            placeholder="hablar, ser, pedir"
            spellCheck="false"
          />
          <em>Picked and pasted verbs become the set for the next round.</em>
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
            Crutch only. Does not count toward knowing a form.
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
        {farmingKnown ? <p className="farm-note">{FARM_NOTE}</p> : null}
        <button
          className="btn btn-primary"
          type="button"
          disabled={farmingKnown}
          onClick={() => onSave(draft)}
        >
          Play
        </button>
        {onProgress ? (
          <button className="btn btn-ghost" type="button" onClick={onProgress}>
            What you know
          </button>
        ) : null}
        {onClear ? <ClearProgress onClear={onClear} /> : null}
        <button className="btn btn-ghost" type="button" onClick={onBack}>
          Back
        </button>
      </div>
    </section>
  );
}
