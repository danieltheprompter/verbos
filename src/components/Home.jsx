import {
  JOURNEY,
  JOURNEY_BLURB,
  JOURNEY_LOCKED,
  LEDE,
  PRACTICE,
  PRACTICE_BLURB,
  WHAT_YOU_KNOW,
  WORDMARK,
} from "../engine/config.js";

export function Home({
  journeyUnlocked = true,
  finishedRound = false,
  onPractice,
  onJourney,
  onKnow,
}) {
  return (
    <section className="home">
      <h1 className="wordmark">{WORDMARK}</h1>
      <p className="lede">{LEDE}</p>
      <div className="home-actions home-cards">
        <button className="home-card" type="button" onClick={onPractice}>
          <strong>{PRACTICE}</strong>
          <span>{PRACTICE_BLURB}</span>
        </button>
        <button
          className={`home-card ${journeyUnlocked ? "" : "is-locked"}`}
          type="button"
          disabled={!journeyUnlocked}
          onClick={onJourney}
        >
          <strong>{JOURNEY}</strong>
          <span>{JOURNEY_BLURB}</span>
        </button>
      </div>
      {journeyUnlocked ? null : <p className="home-lock">{JOURNEY_LOCKED}</p>}
      {finishedRound ? (
        <button className="text-back home-know" type="button" onClick={onKnow}>
          {WHAT_YOU_KNOW}
        </button>
      ) : null}
    </section>
  );
}
