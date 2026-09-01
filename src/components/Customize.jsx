import { useState } from "react";
import { FARM_NOTE } from "../engine/config.js";
import { pack } from "../engine/pack.js";
import { allSelectedKnown } from "../engine/mastery.js";
import { verbsInBucket } from "../engine/verbs.js";

export function Customize({ settings, attempts = [], onSave, onBack, onProgress }) {
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
        <h1>Tweak</h1>
        <p>Next round uses these.</p>
      </header>

      <fieldset>
        <legend>Verbs</legend>
        <div className="buckets">
          {pack.verbBuckets.map((bucket) => (
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
          {showPicker ? "Hide picker" : "Pick verbs"}
        </button>
        {showPicker ? (
          <div className="verb-picker">
            {pack.verbBuckets.map((bucket) => (
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
            rows={2}
            placeholder={pack.pastePlaceholder}
            spellCheck="false"
          />
        </label>
      </fieldset>

      {pack.targetGroups.map((group) => (
        <fieldset key={group.id} className="times">
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
          {pack.addressOptions.map((option) => (
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
            <strong>{pack.persons.find((person) => person.optionalColumn)?.label}</strong>
            Extra column
          </span>
        </label>
      </fieldset>

      <fieldset className="play-options">
        <legend>Round</legend>
        <label className="switch">
          <input
            type="checkbox"
            checked={draft.mc}
            onChange={(event) => setDraft((prev) => ({ ...prev, mc: event.target.checked }))}
          />
          <span>
            <strong>Multiple choice</strong>
            Does not count toward knowing a form
          </span>
        </label>
        <label className="switch">
          <input
            type="checkbox"
            checked={draft.timer}
            onChange={(event) => setDraft((prev) => ({ ...prev, timer: event.target.checked }))}
          />
          <span>
            <strong>Timer</strong>
            Per item
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
        <button className="btn btn-ghost" type="button" onClick={onBack}>
          Back
        </button>
      </div>
    </section>
  );
}
