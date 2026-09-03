import { useState } from "react";
import {
  CLASS_SET,
  CLASS_SET_BAD,
  CLASS_SET_COPY,
  CLASS_SET_HIDE,
  CLASS_SET_LOAD,
  CLASS_SET_NOTE,
  CLASS_SET_OK,
  CLASS_SET_SHOW,
} from "../engine/config.js";
import {
  applyClassSet,
  classSetFromSettings,
  classSetSummaryLines,
  encodeClassSet,
  parseClassSet,
} from "../engine/classSet.js";

export function ClassSet({ settings, hasClassSet, onBack, onLoad }) {
  const [draft, setDraft] = useState(() => encodeClassSet(classSetFromSettings(settings)));
  const [note, setNote] = useState(hasClassSet ? CLASS_SET_NOTE : "");
  const [showCode, setShowCode] = useState(false);
  const parsed = parseClassSet(draft);
  const summary = classSetSummaryLines(parsed || settings);

  function copySet() {
    const text = encodeClassSet(classSetFromSettings(settings));
    setDraft(text);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setNote(CLASS_SET_OK);
  }

  function loadSet() {
    const payload = parseClassSet(draft);
    if (!payload) {
      setNote(CLASS_SET_BAD);
      return;
    }
    onLoad(applyClassSet(settings, payload));
    setNote(CLASS_SET_OK);
  }

  return (
    <section className="panel">
      <header className="panel-head">
        <button className="text-back" type="button" onClick={onBack}>
          Back
        </button>
        <h1>{CLASS_SET}</h1>
        <p>{CLASS_SET_NOTE}</p>
      </header>

      <dl className="set-summary">
        {summary.map((line) => (
          <div key={line.label} className="set-summary-row">
            <dt>{line.label}</dt>
            <dd>{line.value}</dd>
          </div>
        ))}
      </dl>

      <button className="text-back" type="button" onClick={() => setShowCode((open) => !open)}>
        {showCode ? CLASS_SET_HIDE : CLASS_SET_SHOW}
      </button>

      {showCode ? (
        <label className="custom-list">
          <span>{CLASS_SET}</span>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={7}
            spellCheck="false"
            aria-label={CLASS_SET}
          />
        </label>
      ) : null}

      {note ? <p className="farm-note">{note}</p> : null}

      <div className="home-actions">
        <button className="btn btn-primary" type="button" onClick={loadSet}>
          {CLASS_SET_LOAD}
        </button>
        <button className="btn btn-ghost" type="button" onClick={copySet}>
          {CLASS_SET_COPY}
        </button>
        <button className="btn btn-ghost" type="button" onClick={onBack}>
          Back
        </button>
      </div>
    </section>
  );
}
