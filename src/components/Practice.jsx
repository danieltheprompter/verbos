import {
  CLASS_SET_LOAD,
  PRACTICE,
  WARMUP,
  WARMUP_BELL_HOME,
  WARMUP_BELL_LABEL,
  WHAT_YOU_KNOW,
} from "../engine/config.js";

export function Practice({
  finishedRound,
  hasClassSet,
  warmupBell = false,
  onWarmupBell,
  onPlay,
  onWarmup,
  onCustomize,
  onProgress,
  onClassSet,
  onBack,
}) {
  return (
    <section className="panel">
      <header className="panel-head">
        <button className="text-back" type="button" onClick={onBack}>
          Back
        </button>
        <h1>{PRACTICE}</h1>
      </header>
      <div className="home-actions">
        <button className="btn btn-primary" type="button" onClick={onPlay}>
          {finishedRound ? "Play again" : "Play"}
        </button>
        {hasClassSet ? (
          <div className="home-warmup">
            <button className="btn btn-ghost" type="button" onClick={() => onWarmup(warmupBell)}>
              {WARMUP}
            </button>
            <label className="warmup-bell">
              <input
                type="checkbox"
                checked={warmupBell}
                onChange={(event) => onWarmupBell?.(event.target.checked)}
              />
              <span>
                <strong>{WARMUP_BELL_LABEL}</strong>
                {WARMUP_BELL_HOME}
              </span>
            </label>
          </div>
        ) : null}
        <nav className="home-links">
          <button className="text-back" type="button" onClick={onCustomize}>
            Customize
          </button>
          {finishedRound ? (
            <button className="text-back" type="button" onClick={onProgress}>
              {WHAT_YOU_KNOW}
            </button>
          ) : null}
          {onClassSet ? (
            <button className="text-back" type="button" onClick={onClassSet}>
              {CLASS_SET_LOAD}
            </button>
          ) : null}
        </nav>
      </div>
    </section>
  );
}
