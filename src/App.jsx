import { useRef, useState } from "react";
import { ClassSet } from "./components/ClassSet.jsx";
import { Customize } from "./components/Customize.jsx";
import { Home } from "./components/Home.jsx";
import { Play } from "./components/Play.jsx";
import { Profile } from "./components/Profile.jsx";
import { Progress } from "./components/Progress.jsx";
import { sameBoard } from "./engine/board.js";
import { DEFAULT_SETTINGS, WARMUP_BELL_SEC } from "./engine/constants.js";
import { allSelectedKnown } from "./engine/mastery.js";
import { nextPlayLine } from "./engine/levels.js";
import { buildRound } from "./engine/round.js";
import { warmupSettings } from "./engine/warmup.js";
import {
  activeProfile,
  addProfile,
  clearProgress,
  loadClassSet,
  loadState,
  markFinished,
  recordAttempt,
  rememberCells,
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

  function start({
    nextSettings = playSettings,
    replay = false,
    mode = "play",
    session = null,
  } = {}) {
    const from = storeRef.current;
    const roundSettings = mode === "warmup" ? warmupSettings(nextSettings) : nextSettings;
    const who = activeProfile(from);
    const replayCells = replay && sameBoard(who.lastCells, roundSettings) ? who.lastCells : null;
    const nextItems = buildRound(roundSettings, who.attempts, Math.random, undefined, replayCells);
    if (!nextItems.length) {
      setScreen(mode === "warmup" ? "home" : "customize");
      return;
    }
    setStore(rememberCells(from, nextItems));
    setItems(nextItems);
    setPlayMode(mode);
    setSessionSec(session);
    setPlayId((id) => id + 1);
    setScreen("play");
  }

  return (
    <main className="shell">
      {screen === "home" ? (
        <Home
          finishedRound={profile.finishedRound}
          hasClassSet={store.hasClassSet}
          nextPlay={
            profile.finishedRound
              ? nextPlayLine(
                  profile.attempts,
                  !allSelectedKnown(playSettings, profile.attempts),
                  playSettings,
                )
              : ""
          }
          warmupBell={Boolean(store.warmupBell)}
          onWarmupBell={(on) => setStore((prev) => saveWarmupBell(prev, on))}
          onPlay={() => start({ replay: profile.finishedRound })}
          onWarmup={(bell) =>
            start({
              mode: "warmup",
              session: bell ? WARMUP_BELL_SEC : null,
            })
          }
          onCustomize={() => setScreen("customize")}
          onProfile={() => setScreen("profile")}
          onClassSet={() => setScreen("classset")}
        />
      ) : null}

      {screen === "play" && items?.length ? (
        <Play
          key={playId}
          settings={playMode === "warmup" ? warmupSettings(playSettings) : playSettings}
          items={items}
          attempts={profile.attempts}
          mode={playMode}
          sessionSec={sessionSec}
          onAttempt={(attempt) => setStore((prev) => recordAttempt(prev, attempt))}
          onDone={() => {
            if (playMode === "warmup") return;
            setStore((prev) => markFinished(prev));
          }}
          onPlayAgain={() =>
            start({
              replay: true,
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
          onApplySet={(next) => setStore((prev) => saveSettings(prev, next))}
          onSave={(next) => {
            const saved = saveSettings(storeRef.current, next);
            start({
              nextSettings: next,
              replay: sameBoard(activeProfile(saved).lastCells, next),
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
            const payload = {
              types: next.types,
              tenses: next.tenses,
              pickedVerbs: next.pickedVerbs,
              customList: next.customList,
              address: next.address,
              extraColumn: next.extraColumn,
            };
            setStore((prev) => loadClassSet(prev, payload));
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
          onCustomize={profile.finishedRound ? () => setScreen("customize") : null}
          onProgress={() => setScreen("progress")}
          onPlay={() => start({ replay: true })}
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
          onCustomize={profile.finishedRound ? () => setScreen("customize") : null}
          onClear={() => setStore((prev) => clearProgress(prev))}
        />
      ) : null}
    </main>
  );
}
