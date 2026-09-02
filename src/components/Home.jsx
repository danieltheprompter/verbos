import {
  CLASS_SET_LOAD,
  LEDE,
  WARMUP,
  WARMUP_BELL,
  WHAT_YOU_KNOW,
  WORDMARK,
  YOU,
} from "../engine/config.js";

export function Home({
  finishedRound,
  hasClassSet,
  warmupBell = false,
  onWarmupBell,
  onPlay,
  onWarmup,
  onCustomize,
  onProfile,
  onProgress,
  onClassSet,
}) {
  const opened = finishedRound || hasClassSet;

  return (
    <section className="home">
      <h1 className="wordmark">{WORDMARK}</h1>
      <p className="lede">{LEDE}</p>
      <div className="home-actions">
        <button className="btn btn-primary" type="button" onClick={onPlay}>
          {finishedRound ? "Play again" : "Play"}
        </button>
        {opened ? (
          <>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => onWarmup(warmupBell)}
            >
              {WARMUP}
            </button>
            {hasClassSet ? (
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
            ) : null}
            <button className="text-back" type="button" onClick={onProfile}>
              {YOU}
            </button>
            <button className="btn btn-ghost" type="button" onClick={onCustomize}>
              Customize
            </button>
            <button className="text-back" type="button" onClick={onProgress}>
              {WHAT_YOU_KNOW}
            </button>
          </>
        ) : null}
        {opened && onClassSet ? (
          <button className="text-back" type="button" onClick={onClassSet}>
            {CLASS_SET_LOAD}
          </button>
        ) : null}
      </div>
    </section>
  );
}
