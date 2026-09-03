import { JOURNEY, JOURNEY_LOCKED, LEDE, PRACTICE, WORDMARK } from "../engine/config.js";

export function Home({ journeyUnlocked = true, onPractice, onJourney }) {
  return (
    <section className="home">
      <h1 className="wordmark">{WORDMARK}</h1>
      <p className="lede">{LEDE}</p>
      <div className="home-actions">
        <button className="btn btn-primary" type="button" onClick={onPractice}>
          {PRACTICE}
        </button>
        <button
          className={`btn ${journeyUnlocked ? "btn-ghost" : "btn-ghost is-locked"}`}
          type="button"
          disabled={!journeyUnlocked}
          onClick={onJourney}
        >
          {JOURNEY}
        </button>
        {journeyUnlocked ? null : <p className="home-lock">{JOURNEY_LOCKED}</p>}
      </div>
    </section>
  );
}
