import { JOURNEY, JOURNEY_MAP } from "../engine/config.js";

export function JourneyMap({ nodes = [], onPlay, onBack }) {
  return (
    <section className="panel">
      <header className="panel-head">
        <button className="text-back" type="button" onClick={onBack}>
          Back
        </button>
        <h1>{JOURNEY}</h1>
        <p>{JOURNEY_MAP}</p>
      </header>
      <ol className="journey-path">
        {nodes.map((node) => (
          <li key={node.id} className={`journey-node is-${node.state}`}>
            <button
              type="button"
              disabled={node.state === "locked"}
              onClick={() => onPlay(node.id)}
            >
              <i aria-hidden="true" />
              <span>{node.label}</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
