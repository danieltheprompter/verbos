import { FORM_COPY, WHAT_YOU_KNOW } from "../engine/config.js";
import { pack, personLabel, tenseFor, tenseLabel } from "../engine/pack.js";
import { knowChecklist } from "../engine/progress.js";
import { specsForSettings, formKey } from "../engine/mastery.js";
import { trialSittingKeys, journeyCatalog } from "../engine/journey.js";
import { ClearProgress } from "./ClearProgress.jsx";

function labelFor(row) {
  const tense = tenseFor(row.mood, row.time);
  const type = pack.verbBuckets.find((bucket) => bucket.id === row.type)?.label || row.type;
  const ending = pack.endingPatterns.find((pattern) => pattern.id === row.ending)?.label || row.ending;
  return `${tenseLabel(tense)} · ${personLabel(row.person)} · ${type} · ${ending}`;
}

export function Progress({
  attempts,
  sittingKeys = [],
  atlasKeys = [],
  settings,
  onBack,
  onCustomize,
  onClear,
}) {
  const practiceKeys = (settings ? specsForSettings(settings) : []).map((spec) => formKey(spec));
  const journeyKeys = journeyCatalog().flatMap((trial) => trialSittingKeys(trial));
  const keys = [...practiceKeys, ...journeyKeys, ...atlasKeys, ...sittingKeys];
  const rows = knowChecklist(attempts, keys);

  return (
    <section className="panel career">
      <header className="panel-head">
        <button className="text-back" type="button" onClick={onBack}>
          Back
        </button>
        <h1>{WHAT_YOU_KNOW}</h1>
      </header>

      <ul className="know-list">
        {rows.map((row) => (
          <li key={row.key} className={`know-row is-${row.state}`}>
            <span>{labelFor(row)}</span>
            <em>{row.copy}</em>
          </li>
        ))}
      </ul>

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
