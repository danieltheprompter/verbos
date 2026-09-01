import { progressReport } from "../engine/progress.js";

function Row({ row }) {
  return (
    <li>
      <strong>{row.name}</strong>
      <span className={`type-state is-${row.state}`}>{row.label}</span>
    </li>
  );
}

export function Progress({ attempts, onBack, onCustomize }) {
  const report = progressReport(attempts);

  return (
    <section className="panel">
      <header className="panel-head">
        <button className="text-back" type="button" onClick={onBack}>
          Back
        </button>
        <h1>Progress</h1>
        <p>How the forms are going. Not a scoreboard.</p>
      </header>

      {!attempts.length ? (
        <p className="done-note">Play a round first.</p>
      ) : (
        <>
          {report.strengths.length ? (
            <section>
              <h2 className="slice-title">Strengths</h2>
              <ul className="slice-list">
                {report.strengths.map((row) => (
                  <Row key={`${row.kind}-${row.id}`} row={row} />
                ))}
              </ul>
            </section>
          ) : null}

          {report.struggles.length ? (
            <section>
              <h2 className="slice-title">Needs work</h2>
              <ul className="slice-list">
                {report.struggles.map((row) => (
                  <Row key={`${row.kind}-${row.id}`} row={row} />
                ))}
              </ul>
            </section>
          ) : null}

          {report.tenses.map((group) => (
            <section key={group.id}>
              <h2 className="slice-title">{group.name}</h2>
              <ul className="slice-list">
                {group.rows.map((row) => (
                  <Row key={row.id} row={row} />
                ))}
              </ul>
            </section>
          ))}

          <section>
            <h2 className="slice-title">Person</h2>
            <ul className="slice-list">
              {report.persons.map((row) => (
                <Row key={row.id} row={row} />
              ))}
            </ul>
          </section>

          <section>
            <h2 className="slice-title">Verb type</h2>
            <ul className="slice-list">
              {report.types.map((row) => (
                <Row key={row.id} row={row} />
              ))}
            </ul>
          </section>
        </>
      )}

      <div className="home-actions">
        <button className="btn btn-ghost" type="button" onClick={onCustomize}>
          Customize
        </button>
        <button className="btn btn-ghost" type="button" onClick={onBack}>
          Back
        </button>
      </div>
    </section>
  );
}
