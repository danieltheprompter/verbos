import { useState } from "react";
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
  switchProfile,
} from "./engine/storage.js";

export function App() {
  const [store, setStore] = useState(loadState);
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
    from = store,
    mode = "play",
    session = null,
  } = {}) {
    const roundSettings = mode === "warmup" ? warmupSettings(nextSettings) : nextSettings;
    const who = activeProfile(from);
    const replayCells = replay && sameBoard(who.lastCells, roundSettings) ? who.lastCells : null;
    const nextItems = buildRound(roundSettings, who.attempts, Math.random, undefined, replayCells);
    if (!nextItems.length) {
      if (mode === "warmup") {
        setScreen("home");
        return;
      }
      setScreen("customize");
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
          onApplySet={(next) => setStore(saveSettings(store, next))}
          onSave={(next) => {
            const saved = saveSettings(store, next);
            start({
              nextSettings: next,
              replay: sameBoard(activeProfile(saved).lastCells, next),
              from: saved,
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
            setStore(loadClassSet(store, payload));
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
          onSwitch={(id) => setStore(switchProfile(store, id))}
          onAdd={() => setStore(addProfile(store))}
          onRename={(name) => setStore(renameProfile(store, name))}
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
