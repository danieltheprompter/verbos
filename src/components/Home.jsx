import {
  CLASS_SET_LOAD,
  LEDE,
  PROFILE_TITLE,
  WARMUP,
  WARMUP_BELL,
  WORDMARK,
} from "../engine/config.js";

export function Home({
  finishedRound,
  hasClassSet,
  nextPlay,
  warmupBell = false,
  onWarmupBell,
  onPlay,
  onWarmup,
  onCustomize,
  onProfile,
  onClassSet,
}) {
  return (
    <section className="home">
      <h1 className="wordmark">{WORDMARK}</h1>
      <p className="lede">{LEDE}</p>
      {nextPlay ? <p className="next-play-home">{nextPlay}</p> : null}
      <div className="home-actions">
        <button className="btn btn-primary" type="button" onClick={onPlay}>
          {finishedRound ? "Play again" : "Play"}
        </button>
        {hasClassSet ? (
          <>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => onWarmup(warmupBell)}
            >
              {WARMUP}
            </button>
            <label className="switch warmup-bell">
              <input
                type="checkbox"
                checked={warmupBell}
                onChange={(event) => onWarmupBell?.(event.target.checked)}
              />
              <span>
                <strong>{WARMUP_BELL}</strong>
                Optional. Never fails the item.
              </span>
            </label>
          </>
        ) : null}
        {finishedRound ? (
          <button className="btn btn-ghost" type="button" onClick={onCustomize}>
            Customize
          </button>
        ) : null}
        <button className="text-back" type="button" onClick={onProfile}>
          {PROFILE_TITLE}
        </button>
        {onClassSet ? (
          <button className="text-back" type="button" onClick={onClassSet}>
            {CLASS_SET_LOAD}
          </button>
        ) : null}
      </div>
    </section>
  );
}
