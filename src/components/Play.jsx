import { useEffect, useRef, useState } from "react";
import { TENSES } from "../engine/constants.js";
import { personLabel } from "../engine/board.js";
import { answersMatch } from "../engine/check.js";
import { makeDistractors } from "../engine/round.js";
import { Board, BoardLegend } from "./Board.jsx";

const ACCENTS = ["á", "é", "í", "ó", "ú", "ü", "ñ"];

export function Play({
  settings,
  attempts,
  items,
  onAttempt,
  onDone,
  onPlayAgain,
  onTweak,
}) {
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState("");
  const [result, setResult] = useState(null);
  const [choices, setChoices] = useState(() =>
    settings.mc ? makeDistractors(items[0]) : [],
  );
  const [left, setLeft] = useState(settings.timer ? settings.timerSec : null);
  const inputRef = useRef(null);
  const submitted = useRef(false);

  const item = items[index];
  const finished = index >= items.length;
  const tenseLabel = TENSES.find((tense) => tense.id === item?.tense)?.label;
  const correctCount = items.filter((entry) => entry.correct).length;

  useEffect(() => {
    if (!finished) inputRef.current?.focus();
  }, [index, finished, settings.mc]);

  useEffect(() => {
    if (!settings.timer || finished || result) return undefined;
    setLeft(settings.timerSec);
    const started = Date.now();
    const tick = window.setInterval(() => {
      const remain = settings.timerSec - (Date.now() - started) / 1000;
      setLeft(Math.max(0, remain));
      if (remain <= 0) {
        window.clearInterval(tick);
        judge("");
      }
    }, 80);
    return () => window.clearInterval(tick);
    // judge reads the current item via the render that started this timer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, settings.timer, settings.timerSec, finished, result]);

  function judge(raw) {
    if (submitted.current || !item) return;
    submitted.current = true;
    const ok = answersMatch(item.expected, raw);
    item.correct = ok;
    item.given = raw;
    setResult({ ok, expected: item.expected });
    onAttempt({
      tense: item.tense,
      person: item.person,
      verb: item.verb,
      correct: ok,
      typed: !settings.mc,
    });
  }

  function next() {
    if (!result) return;
    if (index + 1 >= items.length) {
      setIndex(items.length);
      onDone();
      return;
    }
    const upcoming = items[index + 1];
    submitted.current = false;
    setResult(null);
    setValue("");
    setChoices(settings.mc ? makeDistractors(upcoming) : []);
    setIndex((prev) => prev + 1);
  }

  function insertGlyph(glyph) {
    const field = inputRef.current;
    if (!field) {
      setValue((prev) => prev + glyph);
      return;
    }
    const start = field.selectionStart ?? value.length;
    const end = field.selectionEnd ?? value.length;
    const nextValue = value.slice(0, start) + glyph + value.slice(end);
    setValue(nextValue);
    requestAnimationFrame(() => {
      field.focus();
      const caret = start + glyph.length;
      field.setSelectionRange(caret, caret);
    });
  }

  if (finished) {
    return (
      <section className="play play-done">
        <header className="play-bar">
          <p className="wordmark-mini">VERBOS</p>
          <p className="progress">
            {correctCount} / {items.length}
          </p>
        </header>
        <Board settings={settings} attempts={attempts} />
        <BoardLegend />
        <p className="done-note">Visit is not owned. Owned is the only strength color.</p>
        <div className="home-actions">
          <button className="btn btn-primary" type="button" onClick={onPlayAgain}>
            Play again
          </button>
          <button className="btn btn-ghost" type="button" onClick={onTweak}>
            Tweak
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="play">
      <header className="play-bar">
        <p className="wordmark-mini">VERBOS</p>
        <p className="progress">
          {index + 1} / {items.length}
        </p>
      </header>

      <Board settings={settings} attempts={attempts} current={item} />

      {settings.timer ? (
        <div className="timer" aria-hidden="true">
          <i style={{ transform: `scaleX(${left / settings.timerSec})` }} />
        </div>
      ) : null}

      <div className="prompt">
        <p className="infinitive">{item.verb}</p>
        <p className="clue">
          {tenseLabel} · {personLabel(item.person)}
        </p>
      </div>

      {settings.mc ? (
        <div className="mc">
          {choices.map((choice) => {
            const show = Boolean(result);
            const isKey = choice === item.expected;
            const picked = result && answersMatch(choice, item.given || "");
            return (
              <button
                key={choice}
                type="button"
                className={`mc-btn ${show && isKey ? "is-ok" : ""} ${show && picked && !isKey ? "is-bad" : ""}`}
                disabled={Boolean(result)}
                onClick={() => judge(choice)}
              >
                {choice}
              </button>
            );
          })}
        </div>
      ) : (
        <form
          className="answer-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (result) next();
            else judge(value);
          }}
        >
          <input
            ref={inputRef}
            className="answer"
            data-result={result ? (result.ok ? "ok" : "bad") : undefined}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            spellCheck="false"
            enterKeyHint={result ? "go" : "done"}
            aria-label="Conjugated form"
            readOnly={Boolean(result)}
          />
          {result ? null : (
            <div className="accents">
              {ACCENTS.map((glyph) => (
                <button key={glyph} type="button" onClick={() => insertGlyph(glyph)}>
                  {glyph}
                </button>
              ))}
            </div>
          )}
        </form>
      )}

      {result ? (
        <div className="reveal">
          <p className="reveal-form">{result.expected}</p>
          <button className="btn btn-primary" type="button" onClick={next}>
            {index + 1 >= items.length ? "See board" : "Next"}
          </button>
        </div>
      ) : (
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => (settings.mc ? null : judge(value))}
          hidden={settings.mc}
        >
          Check
        </button>
      )}
    </section>
  );
}
