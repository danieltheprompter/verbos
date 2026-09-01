export function Home({ finishedRound, onPlay, onCustomize, onProgress }) {
  return (
    <section className="home">
      <h1 className="wordmark">VERBOS</h1>
      <p className="lede">The ultimate conjugation quiz.</p>
      <div className="home-actions">
        <button className="btn btn-primary" type="button" onClick={onPlay}>
          {finishedRound ? "Play again" : "Play"}
        </button>
        {finishedRound ? (
          <>
            <button className="btn btn-ghost" type="button" onClick={onCustomize}>
              Customize
            </button>
            <button className="btn btn-ghost" type="button" onClick={onProgress}>
              What you know
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}
