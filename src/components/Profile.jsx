import {
  ADD_PERSON,
  CLEAR_ATLAS,
  DISPLAY_NAME,
  DISPLAY_NAME_PLACEHOLDER,
  LEVELS_LEGEND,
  LEVELS_NOTE,
  NEXT_PLAY_LEGEND,
  PEOPLE_LEGEND,
  PROFILE_LEDE,
  PROFILE_TITLE,
} from "../engine/config.js";
import { namedLevels, nextPlayLine } from "../engine/levels.js";
import { allSelectedKnown } from "../engine/mastery.js";
import { profileName } from "../engine/storage.js";
import { ClearProgress } from "./ClearProgress.jsx";
import { MiniBoard } from "./MiniBoard.jsx";

export function Profile({
  profile,
  profiles,
  settings,
  onBack,
  onCustomize,
  onProgress,
  onPlay,
  onSwitch,
  onAdd,
  onRename,
  onClear,
}) {
  const levels = namedLevels(profile.attempts, profile.sittingKeys);
  const leftover = !allSelectedKnown(settings, profile.attempts);
  const nextLine = nextPlayLine(profile.attempts, leftover, settings);

  return (
    <section className="panel">
      <header className="panel-head">
        <button className="text-back" type="button" onClick={onBack}>
          Back
        </button>
        <h1>{PROFILE_TITLE}</h1>
        <p>{PROFILE_LEDE}</p>
      </header>

      <fieldset>
        <legend>{DISPLAY_NAME}</legend>
        <label className="custom-list">
          <span className="sr-only">{DISPLAY_NAME}</span>
          <input
            className="name-field"
            value={profile.name}
            placeholder={DISPLAY_NAME_PLACEHOLDER}
            onChange={(event) => onRename(event.target.value)}
            autoCapitalize="words"
            autoComplete="off"
            spellCheck="false"
            aria-label={DISPLAY_NAME}
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>{PEOPLE_LEGEND}</legend>
        <div className="chips">
          {profiles.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`chip ${item.id === profile.id ? "is-on" : ""}`}
              onClick={() => onSwitch(item.id)}
            >
              {profileName(item, profiles)}
            </button>
          ))}
        </div>
        <button className="btn btn-ghost" type="button" onClick={onAdd}>
          {ADD_PERSON}
        </button>
      </fieldset>

      <fieldset>
        <legend>{NEXT_PLAY_LEGEND}</legend>
        <p className="next-play-line">{nextLine}</p>
        <button className="btn btn-primary" type="button" onClick={onPlay}>
          Play
        </button>
      </fieldset>

      <fieldset>
        <legend>{LEVELS_LEGEND}</legend>
        <p className="levels-note">{LEVELS_NOTE}</p>
        <ul className="level-list">
          {levels.map((level) => (
            <li key={level.id} className={level.checked ? "is-checked" : ""}>
              <i aria-hidden="true">{level.checked ? "✓" : "○"}</i>
              <span>
                <strong>{level.name}</strong>
                {level.detail ? <em>{level.detail}</em> : null}
              </span>
            </li>
          ))}
        </ul>
      </fieldset>

      <MiniBoard attempts={profile.attempts} />

      <section className="clear-block">
        <p className="times-mood">Atlas</p>
        <ClearProgress onClear={onClear} />
      </section>

      <div className="home-actions">
        {onProgress ? (
          <button className="btn btn-ghost" type="button" onClick={onProgress}>
            What you know
          </button>
        ) : null}
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
