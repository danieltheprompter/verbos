import { useState } from "react";
import { Home } from "./components/Home.jsx";
import { Play } from "./components/Play.jsx";
import { Tweak } from "./components/Tweak.jsx";
import { DEFAULT_SETTINGS } from "./engine/constants.js";
import { buildRound } from "./engine/round.js";
import { loadState, markFinished, recordAttempt, saveSettings } from "./engine/storage.js";

export function App() {
  const [store, setStore] = useState(loadState);
  const [screen, setScreen] = useState("home");
  const [items, setItems] = useState(null);
  const [playId, setPlayId] = useState(0);

  const settings = store.finishedRound ? store.settings : DEFAULT_SETTINGS;

  function start(nextSettings = settings, nextAttempts = store.attempts) {
    setItems(buildRound(nextSettings, nextAttempts));
    setPlayId((id) => id + 1);
    setScreen("play");
  }

  return (
    <main className="shell">
      {screen === "home" ? (
        <Home
          finishedRound={store.finishedRound}
          onPlay={() => start()}
          onTweak={() => setScreen("tweak")}
        />
      ) : null}

      {screen === "play" && items ? (
        <Play
          key={playId}
          settings={settings}
          attempts={store.attempts}
          items={items}
          onAttempt={(attempt) => setStore((prev) => recordAttempt(prev, attempt))}
          onDone={() => setStore((prev) => markFinished(prev))}
          onPlayAgain={() => start()}
          onTweak={() => setScreen("tweak")}
        />
      ) : null}

      {screen === "tweak" ? (
        <Tweak
          settings={store.settings}
          onBack={() => setScreen("home")}
          onSave={(next) => {
            const saved = saveSettings(store, next);
            setStore(saved);
            start(next, saved.attempts);
          }}
        />
      ) : null}
    </main>
  );
}
