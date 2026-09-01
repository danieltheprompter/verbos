export function Home({ finishedRound, onPlay, onTweak }) {
  return (
    <section className="home">
      <p className="eyebrow">v1</p>
      <h1 className="wordmark">VERBOS</h1>
      <p className="lede">The ultimate conjugation quiz.</p>
      <div className="home-actions">
        <button className="btn btn-primary" type="button" onClick={onPlay}>
          {finishedRound ? "Play again" : "Play"}
        </button>
        {finishedRound ? (
          <button className="btn btn-ghost" type="button" onClick={onTweak}>
            Tweak
          </button>
        ) : null}
      </div>
    </section>
  );
}
