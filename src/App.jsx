import { useRef, useState } from "react";
import { ClassSet } from "./components/ClassSet.jsx";
import { Customize } from "./components/Customize.jsx";
import { Home } from "./components/Home.jsx";
import { Play } from "./components/Play.jsx";
import { Profile } from "./components/Profile.jsx";
import { Progress } from "./components/Progress.jsx";
import { cellsFor } from "./engine/board.js";
import { DEFAULT_SETTINGS, WARMUP_BELL_SEC } from "./engine/constants.js";
import { itemFormKey, sameFormKeySet, sittingIncomplete, sittingKeysFromAttempts, uniqueFormKeys } from "./engine/mastery.js";
import { buildRound, playAgainRound } from "./engine/round.js";
import { classSetFromSettings } from "./engine/classSet.js";
import { warmupSettings } from "./engine/warmup.js";
import {
  activeProfile,
  addProfile,
  clearProgress,
  loadClassSet,
  loadState,
  markFinished,
  recordAttempt,
  rememberSitting,
  renameProfile,
  saveSettings,
  saveWarmupBell,
  switchProfile,
} from "./engine/storage.js";

export function App() {
  const [store, setStore] = useState(loadState);
  const storeRef = useRef(store);
  storeRef.current = store;
  const [screen, setScreen] = useState("home");
  const [items, setItems] = useState(null);
  const [playId, setPlayId] = useState(0);
  const [playMode, setPlayMode] = useState("play");
  const [sessionSec, setSessionSec] = useState(null);

  const profile = activeProfile(store);
  const playSettings =
    store.hasClassSet || profile.finishedRound ? store.settings : DEFAULT_SETTINGS;

  function beginRound(nextItems, from, { mode, session, fresh }) {
    const pin = uniqueFormKeys(activeProfile(from).sittingKeys);
    if (pin.length === 10 && !sameFormKeySet(nextItems.map(itemFormKey), pin)) {
      throw new Error("built round set ≠ sittingKeys");
    }
    setStore(rememberSitting(from, nextItems, { fresh }));
    setItems(nextItems);
    setPlayMode(mode);
    setSessionSec(session);
    setPlayId((id) => id + 1);
    setScreen("play");
  }

  function playAgain({ mode = "play", session = null } = {}) {
    const roundSettings = mode === "warmup" ? warmupSettings(playSettings) : playSettings;
    let from = storeRef.current;
    let who = activeProfile(from);
    let pin = uniqueFormKeys(who.sittingKeys);
    if (pin.length !== 10) {
      pin = uniqueFormKeys(sittingKeysFromAttempts(who.attempts, cellsFor(roundSettings)));
      if (pin.length !== 10) {
        throw new Error("Play again has no unique sittingKeys pin");
      }
      from = rememberSitting(from, who.lastCells, { fresh: true, keys: pin });
      storeRef.current = from;
      who = activeProfile(from);
    }
    const nextItems = playAgainRound(pin, roundSettings, who.attempts, Math.random);
    beginRound(nextItems, from, { mode, session, fresh: false });
  }

  function start({
    nextSettings = playSettings,
    mode = "play",
    session = null,
    newSitting = false,
  } = {}) {
    const roundSettings = mode === "warmup" ? warmupSettings(nextSettings) : nextSettings;
    const from = storeRef.current;
    const who = activeProfile(from);
    const pin = uniqueFormKeys(who.sittingKeys);
    if (!newSitting && pin.length === 10 && sittingIncomplete(who.attempts, pin)) {
      playAgain({ mode, session });
      return;
    }
    const nextItems = buildRound(roundSettings, who.attempts, Math.random);
    if (!nextItems.length) {
      setScreen(mode === "warmup" ? "home" : "customize");
      return;
    }
    beginRound(nextItems, from, { mode, session, fresh: true });
  }

  return (
    <main className="shell">
      {screen === "home" ? (
        <Home
          finishedRound={profile.finishedRound}
          hasClassSet={store.hasClassSet}
          warmupBell={Boolean(store.warmupBell)}
          onWarmupBell={(on) => setStore((prev) => saveWarmupBell(prev, on))}
          onPlay={() => start()}
          onWarmup={(bell) =>
            start({
              mode: "warmup",
              session: bell ? WARMUP_BELL_SEC : null,
            })
          }
          onCustomize={() => setScreen("customize")}
          onProfile={() => setScreen("profile")}
          onProgress={() => setScreen("progress")}
          onClassSet={() => setScreen("classset")}
        />
      ) : null}

      {screen === "play" && items?.length ? (
        <Play
          key={playId}
          settings={playMode === "warmup" ? warmupSettings(playSettings) : playSettings}
          items={items}
          attempts={profile.attempts}
          sittingKeys={profile.sittingKeys}
          mode={playMode}
          sessionSec={sessionSec}
          onAttempt={(attempt) => setStore((prev) => recordAttempt(prev, attempt))}
          onDone={() => {
            if (playMode === "warmup") return;
            setStore((prev) => markFinished(prev));
          }}
          onPlayAgain={() =>
            playAgain({
              mode: playMode,
              session: playMode === "warmup" ? sessionSec : null,
            })
          }
          onCustomize={() => setScreen("customize")}
          onProgress={() => setScreen("profile")}
          onHome={() => setScreen("home")}
        />
      ) : null}

      {screen === "customize" ? (
        <Customize
          settings={store.settings}
          attempts={profile.attempts}
          onBack={() => setScreen("home")}
          onProgress={() => setScreen("profile")}
          onApplySet={(next) =>
            setStore((prev) => {
              const loaded = loadClassSet(prev, classSetFromSettings(next));
              return { ...loaded, warmupBell: Boolean(prev.warmupBell) };
            })
          }
          onSave={(next) => {
            const saved = saveSettings(storeRef.current, next);
            storeRef.current = saved;
            setStore(saved);
            start({
              nextSettings: next,
              replay: false,
              newSitting: true,
            });
          }}
        />
      ) : null}

      {screen === "classset" ? (
        <ClassSet
          settings={store.settings}
          hasClassSet={store.hasClassSet}
          onBack={() => setScreen("home")}
          onLoad={(next) => {
            setStore((prev) => {
              const loaded = loadClassSet(prev, classSetFromSettings(next));
              return { ...loaded, warmupBell: Boolean(prev.warmupBell) };
            });
            setScreen("home");
          }}
        />
      ) : null}

      {screen === "profile" ? (
        <Profile
          profile={profile}
          profiles={store.profiles}
          settings={playSettings}
          onBack={() => setScreen("home")}
          onCustomize={
            profile.finishedRound || store.hasClassSet ? () => setScreen("customize") : null
          }
          onProgress={() => setScreen("progress")}
          onPlay={() => start()}
          onSwitch={(id) => setStore((prev) => switchProfile(prev, id))}
          onAdd={() => setStore((prev) => addProfile(prev))}
          onRename={(name) => setStore((prev) => renameProfile(prev, name))}
          onClear={() => setStore((prev) => clearProgress(prev))}
        />
      ) : null}

      {screen === "progress" ? (
        <Progress
          attempts={profile.attempts}
          onBack={() => setScreen("profile")}
          onCustomize={
            profile.finishedRound || store.hasClassSet ? () => setScreen("customize") : null
          }
          onClear={() => setStore((prev) => clearProgress(prev))}
        />
      ) : null}
    </main>
  );
}
