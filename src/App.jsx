import { useState } from "react";
import { Home } from "./components/Home.jsx";
import { Play } from "./components/Play.jsx";
import { Customize } from "./components/Customize.jsx";
import { Progress } from "./components/Progress.jsx";
import { sameBoard } from "./engine/board.js";
import { DEFAULT_SETTINGS } from "./engine/constants.js";
import { buildRound } from "./engine/round.js";
import {
  clearProgress,
  loadState,
  markFinished,
  recordAttempt,
  rememberCells,
  saveSettings,
} from "./engine/storage.js";

export function App() {
  const [store, setStore] = useState(loadState);
  const [screen, setScreen] = useState("home");
  const [items, setItems] = useState(null);
  const [playId, setPlayId] = useState(0);

  const settings = store.finishedRound ? store.settings : DEFAULT_SETTINGS;

  function start({ nextSettings = settings, replay = false, from = store } = {}) {
    const replayCells = replay && sameBoard(from.lastCells, nextSettings) ? from.lastCells : null;
    const nextItems = buildRound(nextSettings, from.attempts, Math.random, undefined, replayCells);
    setStore(rememberCells(from, nextItems));
    setItems(nextItems);
    setPlayId((id) => id + 1);
    setScreen("play");
  }

  return (
    <main className="shell">
      {screen === "home" ? (
        <Home
          finishedRound={store.finishedRound}
          onPlay={() => start({ replay: store.finishedRound })}
          onCustomize={() => setScreen("customize")}
          onProgress={() => setScreen("progress")}
        />
      ) : null}

      {screen === "play" && items ? (
        <Play
          key={playId}
          settings={settings}
          items={items}
          attempts={store.attempts}
          onAttempt={(attempt) => setStore((prev) => recordAttempt(prev, attempt))}
          onDone={() => setStore((prev) => markFinished(prev))}
          onPlayAgain={() => start({ replay: true })}
          onCustomize={() => setScreen("customize")}
          onProgress={() => setScreen("progress")}
        />
      ) : null}

      {screen === "customize" ? (
        <Customize
          settings={store.settings}
          attempts={store.attempts}
          onBack={() => setScreen("home")}
          onProgress={() => setScreen("progress")}
          onSave={(next) => {
            const saved = saveSettings(store, next);
            start({
              nextSettings: next,
              replay: sameBoard(saved.lastCells, next),
              from: saved,
            });
          }}
        />
      ) : null}

      {screen === "progress" ? (
        <Progress
          attempts={store.attempts}
          onBack={() => setScreen("home")}
          onCustomize={() => setScreen("customize")}
          onClear={() => setStore((prev) => clearProgress(prev))}
        />
      ) : null}
    </main>
  );
}
