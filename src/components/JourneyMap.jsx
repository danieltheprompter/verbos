import {
  JOURNEY,
  JOURNEY_DONE,
  JOURNEY_MAP,
  JOURNEY_REVIEW,
} from "../engine/config.js";
import { pack } from "../engine/pack.js";

function nodeMark(node) {
  if (node.optional) return "R";
  return node.id;
}

export function JourneyMap({
  atlas,
  address,
  extraColumn = false,
  onPronouns,
  onPlay,
  onBack,
}) {
  const extraPerson = pack.persons.find((person) => person.optionalColumn);
  const isles = atlas?.islands || [];
  const nodes = atlas?.nodes || [];
  const route = atlas?.route || [];

  return (
    <section className="panel atlas-panel">
      <header className="panel-head">
        <button className="text-back" type="button" onClick={onBack}>
          Back
        </button>
        <h1>{JOURNEY}</h1>
        <p>{atlas?.complete ? JOURNEY_DONE : JOURNEY_MAP}</p>
      </header>

      {pack.addressOptions?.length || extraPerson ? (
        <fieldset className="atlas-persons">
          <legend>{pack.chrome?.personLegend || "Persons"}</legend>
          {pack.addressOptions?.length ? (
            <div className="chips chips-3">
              {pack.addressOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`chip ${address === option.id ? "is-on" : ""}`}
                  onClick={() => onPronouns?.({ address: option.id, extraColumn })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
          {extraPerson ? (
            <label className="switch">
              <input
                type="checkbox"
                checked={Boolean(extraColumn)}
                onChange={(event) =>
                  onPronouns?.({ address, extraColumn: event.target.checked })
                }
              />
              <span>
                <strong>{extraPerson.label}</strong>
                {pack.chrome?.extraColumn || "Extra column"}
              </span>
            </label>
          ) : null}
        </fieldset>
      ) : null}

      <div className={`atlas ${atlas?.complete ? "is-done" : ""}`}>
        <svg
          className="atlas-svg"
          viewBox="0 0 900 640"
          role="img"
          aria-label={JOURNEY_MAP}
        >
          {isles.map((isle) => (
            <g key={isle.id} className="atlas-isle">
              <ellipse cx={isle.x} cy={isle.y} rx={isle.rx} ry={isle.ry} />
              <text x={isle.x} y={isle.y - isle.ry + 22}>
                {isle.label}
              </text>
            </g>
          ))}
          {route.map((seg) => (
            <line
              key={`${seg.from}-${seg.to}`}
              className={`atlas-route ${seg.lit ? "is-lit" : ""}`}
              x1={seg.x1}
              y1={seg.y1}
              x2={seg.x2}
              y2={seg.y2}
            />
          ))}
          {nodes.map((node) => (
            <g
              key={node.id}
              className={`atlas-node is-${node.state} ${node.playable ? "is-playable" : ""}`}
              transform={`translate(${node.x} ${node.y})`}
              role={node.playable ? "button" : "img"}
              tabIndex={node.playable ? 0 : undefined}
              onClick={() => {
                if (node.playable) onPlay(node.id);
              }}
              onKeyDown={(event) => {
                if (!node.playable) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onPlay(node.id);
                }
              }}
            >
              <title>
                {node.state === "beaten" ? `${JOURNEY_REVIEW}: ${node.label}` : node.label}
              </title>
              <circle r="16" />
              <text y="5">{nodeMark(node)}</text>
            </g>
          ))}
        </svg>
      </div>
    </section>
  );
}
