import { useEffect, useRef, useState } from "react";
import { CONTENT_VERSION, WARMUP_BELL_NOTE, WORDMARK } from "../engine/config.js";
import { moodOf, pack, personLabel, tenseLabel, timeOf } from "../engine/pack.js";
import { answersMatch, isBlankAnswer } from "../engine/check.js";
import { explainMiss } from "../engine/miss.js";
import { recapStory } from "../engine/recap.js";
import { makeDistractors } from "../engine/round.js";
import { formatBellClock, timerExpireAction, timerFailsItem } from "../engine/warmup.js";
import { endingPattern, verbType } from "../engine/verbs.js";
import { Board } from "./Board.jsx";

export function Play({
  settings,
  items,
  attempts = [],
  sittingKeys = [],
  mode = "play",
  sessionSec = null,
  onAttempt,
  onDone,
  onPlayAgain,
  onCustomize,
  onProgress,
  onHome,
}) {
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState("");
  const [result, setResult] = useState(null);
  const [choices, setChoices] = useState(() =>
    settings.mc && mode !== "warmup" ? makeDistractors(items[0]) : [],
  );
  const warmup = mode === "warmup";
  const useMc = settings.mc && !warmup;
  const useItemTimer = settings.timer && !warmup;
  const [left, setLeft] = useState(useItemTimer ? settings.timerSec : null);
  const [sessionLeft, setSessionLeft] = useState(sessionSec);
  const [bell, setBell] = useState(false);
  const [land, setLand] = useState(null);
  const [visitCounts, setVisitCounts] = useState({});
  const [flick, setFlick] = useState(null);
  const [lockIn, setLockIn] = useState(false);
  const [showMiss, setShowMiss] = useState(false);
  const [motion, setMotion] = useState("");
  const [log, setLog] = useState(attempts);
  const inputRef = useRef(null);
  const playAgainRef = useRef(null);
  const submitted = useRef(false);
  const startedAt = useRef(Date.now());

  const item = items[index];
  const finished = index >= items.length;

  useEffect(() => {
    startedAt.current = Date.now();
  }, [index]);

  useEffect(() => {
    if (!finished) inputRef.current?.focus();
  }, [index, finished, useMc]);

  useEffect(() => {
    if (!useItemTimer || finished || result) return undefined;
    setLeft(settings.timerSec);
    const started = Date.now();
    const tick = window.setInterval(() => {
      const remain = settings.timerSec - (Date.now() - started) / 1000;
      setLeft(Math.max(0, remain));
      if (remain <= 0) {
        window.clearInterval(tick);
        const action = timerExpireAction({ session: false });
        if (timerFailsItem(action)) judge("", { force: true });
      }
    }, 80);
    return () => window.clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, useItemTimer, settings.timerSec, finished, result]);

  useEffect(() => {
    if (!sessionSec || finished) return undefined;
    const started = Date.now();
    const tick = window.setInterval(() => {
      const remain = sessionSec - (Date.now() - started) / 1000;
      setSessionLeft(Math.max(0, remain));
      if (remain <= 0) {
        window.clearInterval(tick);
        const action = timerExpireAction({ session: true });
        if (!timerFailsItem(action)) setBell(true);
      }
    }, 80);
    return () => window.clearInterval(tick);
  }, [sessionSec, finished]);

  useEffect(() => {
    if (!finished) return undefined;
    playAgainRef.current?.focus();
    const onKey = (event) => {
      if (event.key !== "Enter") return;
      if (event.defaultPrevented) return;
      if (event.target?.closest?.("button, a, input, textarea")) return;
      event.preventDefault();
      onPlayAgain?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finished, onPlayAgain]);

  function pulse(nextFlick, nextMotion) {
    setFlick(nextFlick);
    setMotion(nextMotion);
    window.setTimeout(() => {
      setFlick(null);
      setMotion("");
    }, 340);
  }

  function finishRound() {
    setIndex(items.length);
    onDone();
  }

  function judge(raw, { force = false } = {}) {
    if (submitted.current || !item) return;
    if (!force && isBlankAnswer(raw)) return;
    submitted.current = true;
    const ok = answersMatch(item.expected, raw);
    item.correct = ok;
    item.given = raw;
    const miss = ok ? null : explainMiss(item.expected, raw, item);
    setResult({ ok, expected: item.expected, miss });
    setShowMiss(Boolean(miss));
    const cell = `${item.tense}:${item.person}`;
    setVisitCounts((prev) => ({ ...prev, [cell]: (prev[cell] || 0) + 1 }));
    setLand({ tense: item.tense, person: item.person });
    if (!ok && miss?.kind === "person") {
      pulse({ axis: "col" }, "");
    } else if (!ok && miss?.kind === "time") {
      pulse({ axis: "row" }, "");
    } else if (!ok && miss?.kind === "accent") {
      pulse(null, "accent");
    } else if (!ok && miss?.kind === "stem") {
      pulse(null, "stem");
    }
    if (index + 1 >= items.length) setLockIn(true);
    const verb_type = item.type || item.verb_type || verbType(item.verb);
    const ending_pattern = item.ending_pattern || endingPattern(item.verb);
    const entry = {
      attempt_id: globalThis.crypto?.randomUUID?.(),
      mood: item.mood || moodOf(item.tense),
      time: item.time || timeOf(item.tense),
      tense: item.tense,
      person: item.person,
      verb: item.verb,
      verb_type,
      type: verb_type,
      ending_pattern,
      expected: item.expected,
      given: raw,
      correct: ok,
      typed: !useMc,
      latency_ms: Date.now() - startedAt.current,
      content_version: CONTENT_VERSION,
    };
    setLog((prev) => [...prev, entry]);
    onAttempt(entry);
  }

  function next() {
    if (!result) return;
    if (bell || index + 1 >= items.length) {
      finishRound();
      return;
    }
    submitted.current = false;
    setResult(null);
    setShowMiss(false);
    setValue("");
    setLand(null);
    setChoices(useMc ? makeDistractors(items[index + 1]) : []);
    startedAt.current = Date.now();
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
    const story = recapStory(items, log, sittingKeys);
    return (
      <section className="play play-done is-glance">
        <header className="play-bar">
          <button type="button" className="wordmark-mini play-home" onClick={onHome}>
            {WORDMARK}
          </button>
          <button className="text-back" type="button" onClick={onHome}>
            Back
          </button>
        </header>
        <h1 className="recap-head">{story.banner}</h1>
        {story.head ? <p className="recap-hdmi">{story.head}</p> : null}
        <Board
          settings={settings}
          items={items}
          attempts={log}
          sittingKeys={sittingKeys}
          visitCounts={visitCounts}
          recap
        />
        <p className="recap-sub">{story.line}</p>
        <div className="home-actions">
          <button ref={playAgainRef} className="btn btn-primary" type="button" onClick={onPlayAgain}>
            Play again
          </button>
          {warmup ? (
            <button className="btn btn-ghost" type="button" onClick={onHome}>
              Done
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="play">
      <header className="play-bar">
        <button type="button" className="wordmark-mini play-home" onClick={onHome}>
          {WORDMARK}
        </button>
        <button className="text-back" type="button" onClick={onHome}>
          Back
        </button>
      </header>

      <Board
        settings={settings}
        items={items}
        attempts={log}
        sittingKeys={sittingKeys}
        visitCounts={visitCounts}
        current={item}
        land={land}
        lockIn={lockIn}
      />

      {useItemTimer ? (
        <div className="timer" aria-hidden="true">
          <i style={{ transform: `scaleX(${left / settings.timerSec})` }} />
        </div>
      ) : null}

      {sessionSec ? (
        <p className={`session-bell${bell ? " is-rang" : ""}`}>
          {bell ? WARMUP_BELL_NOTE : formatBellClock(sessionLeft)}
        </p>
      ) : null}

      <div className="prompt">
        <p className={`infinitive${motion === "stem" ? " is-rattle" : ""}`}>{item.verb}</p>
        <p className="clue">
          {tenseLabel(item.tense)} · {personLabel(item.person)}
        </p>
      </div>

      {useMc ? (
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
            event.stopPropagation();
            if (result) next();
            else judge(value);
          }}
        >
          <input
            ref={inputRef}
            className={`answer${motion === "accent" ? " is-drop" : ""}${
              flick?.axis === "col" ? " is-flick-col" : flick?.axis === "row" ? " is-flick-row" : ""
            }`}
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
              {pack.accents.map((glyph) => (
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
          {showMiss && result.miss ? <p className="miss">{result.miss.message}</p> : null}
          <p className="reveal-form">{result.expected}</p>
          <button className="btn btn-primary" type="button" onClick={next}>
            Next
          </button>
        </div>
      ) : (
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => (useMc ? null : judge(value))}
          hidden={useMc}
        >
          Check
        </button>
      )}
    </section>
  );
}
