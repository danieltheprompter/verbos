import { useState } from "react";
import { Home } from "./components/Home.jsx";
import { Play } from "./components/Play.jsx";
import { Customize } from "./components/Customize.jsx";
import { Progress } from "./components/Progress.jsx";
import { DEFAULT_SETTINGS } from "./engine/constants.js";
import { buildRound } from "./engine/round.js";
import { clearProgress, loadState, markFinished, recordAttempt, saveSettings } from "./engine/storage.js";

export function App() {
  const [store, setStore] = useState(loadState);
  const [screen, setScreen] = useState("home");
  const [items, setItems] = useState(null);
  const [playId, setPlayId] = useState(0);
  const [lastCells, setLastCells] = useState([]);

  const settings = store.finishedRound ? store.settings : DEFAULT_SETTINGS;

  function start(nextSettings = settings, nextAttempts = store.attempts) {
    setItems(buildRound(nextSettings, nextAttempts, Math.random, undefined, lastCells));
    setPlayId((id) => id + 1);
    setScreen("play");
  }

  return (
    <main className="shell">
      {screen === "home" ? (
        <Home
          finishedRound={store.finishedRound}
          onPlay={() => start()}
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
          onDone={() => {
            setLastCells(items.map((item) => ({ tense: item.tense, person: item.person })));
            setStore((prev) => markFinished(prev));
          }}
          onPlayAgain={() => start()}
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
          onClear={() => setStore((prev) => clearProgress(prev))}
          onSave={(next) => {
            const saved = saveSettings(store, next);
            setStore(saved);
            start(next, saved.attempts);
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
