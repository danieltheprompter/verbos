import { useRef, useState } from "react";
import { ClassSet } from "./components/ClassSet.jsx";
import { Customize } from "./components/Customize.jsx";
import { Home } from "./components/Home.jsx";
import { JourneyMap } from "./components/JourneyMap.jsx";
import { Play } from "./components/Play.jsx";
import { Practice } from "./components/Practice.jsx";
import { Profile } from "./components/Profile.jsx";
import { Progress } from "./components/Progress.jsx";
import { cellsFor } from "./engine/board.js";
import { DEFAULT_SETTINGS, WARMUP_BELL_SEC } from "./engine/constants.js";
import {
  currentJourneyId,
  isJourneyUnlocked,
  journeyMap,
  journeyPlayable,
  journeySettings,
  journeyTrial,
  trialSittingKeys,
} from "./engine/journey.js";
import { sittingIncomplete, sittingKeysFromAttempts, sittingKeysFromRound, uniqueFormKeys } from "./engine/mastery.js";
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
  rememberJourney,
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
  const [journeyId, setJourneyId] = useState(null);

  const profile = activeProfile(store);
  const playSettings =
    store.hasClassSet || profile.finishedRound ? store.settings : DEFAULT_SETTINGS;
  const journeyOn = isJourneyUnlocked(profile);

  function beginRound(nextItems, from, { mode, session, fresh }) {
    if (mode !== "journey") {
      setStore(rememberSitting(from, nextItems, { fresh }));
    } else {
      setStore(from);
    }
    setItems(nextItems);
    setPlayMode(mode);
    setSessionSec(session);
    setPlayId((id) => id + 1);
    setScreen("play");
  }

  function playAgain({ mode = playMode, session = null } = {}) {
    if (mode === "journey") {
      startJourney(journeyId || profile.journeyNodeId, { again: true });
      return;
    }
    const roundSettings = mode === "warmup" ? warmupSettings(playSettings) : playSettings;
    const need = cellsFor(roundSettings).length;
    let from = storeRef.current;
    let who = activeProfile(from);
    let pin = uniqueFormKeys(who.sittingKeys);
    if (pin.length !== need) {
      pin = sittingKeysFromRound(items, who.attempts, need);
      if (pin.length !== need) {
        pin = uniqueFormKeys(sittingKeysFromAttempts(who.attempts, cellsFor(roundSettings)));
      }
      if (pin.length === need) {
        from = rememberSitting(from, items || who.lastCells, { fresh: true, keys: pin });
        storeRef.current = from;
        who = activeProfile(from);
      }
    }
    let nextItems = null;
    if (pin.length === need) {
      try {
        nextItems = playAgainRound(pin, roundSettings, who.attempts, Math.random);
      } catch {
        nextItems = null;
      }
    }
    if (!nextItems) {
      const recovered = sittingKeysFromRound(items, who.attempts, need);
      if (recovered.length === need) {
        from = rememberSitting(from, items, { fresh: true, keys: recovered });
        storeRef.current = from;
        who = activeProfile(from);
        try {
          nextItems = playAgainRound(recovered, roundSettings, who.attempts, Math.random);
        } catch {
          nextItems = null;
        }
      }
    }
    if (!nextItems) {
      setScreen("practice");
      return;
    }
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
    const need = cellsFor(roundSettings).length;
    if (!newSitting && pin.length === need && sittingIncomplete(who.attempts, pin)) {
      playAgain({ mode, session });
      return;
    }
    const nextItems = buildRound(roundSettings, who.attempts, Math.random);
    if (!nextItems.length) {
      setScreen(mode === "warmup" ? "practice" : "customize");
      return;
    }
    beginRound(nextItems, from, { mode, session, fresh: true });
  }

  function openPractice() {
    if (!profile.finishedRound && !store.hasClassSet) {
      start();
      return;
    }
    setScreen("practice");
  }

  function startJourney(id, { again = false } = {}) {
    if (!journeyOn) {
      setScreen("home");
      return;
    }
    const who = activeProfile(storeRef.current);
    const trial = journeyTrial(id) || journeyTrial(currentJourneyId(who.attempts));
    if (!trial) {
      setScreen("journey");
      return;
    }
    if (!again && !journeyPlayable(trial, who.attempts) && trial.id !== who.journeyNodeId) {
      setScreen("journey");
      return;
    }
    const settings = journeySettings(trial);
    const stored = uniqueFormKeys(who.journeySittingKeys);
    const keys =
      again && stored.length
        ? stored
        : stored.length && who.journeyNodeId === trial.id
          ? stored
          : trialSittingKeys(trial);
    let nextItems = null;
    try {
      nextItems = playAgainRound(keys, settings, who.attempts, Math.random, { matchForm: true });
    } catch {
      nextItems = null;
    }
    if (!nextItems) {
      setScreen("journey");
      return;
    }
    const from = rememberJourney(storeRef.current, { nodeId: trial.id, keys });
    storeRef.current = from;
    setJourneyId(trial.id);
    beginRound(nextItems, from, { mode: "journey", session: null, fresh: false });
  }

  const journeyTrialSettings = journeyId ? journeySettings(journeyTrial(journeyId)) : null;
  const activePlaySettings =
    playMode === "warmup"
      ? warmupSettings(playSettings)
      : playMode === "journey"
        ? journeyTrialSettings || playSettings
        : playSettings;

  function leavePlay() {
    setScreen(playMode === "journey" ? "journey" : profile.finishedRound || store.hasClassSet ? "practice" : "home");
  }

  return (
    <main className="shell">
      {screen === "home" ? (
        <Home
          journeyUnlocked={journeyOn}
          onPractice={openPractice}
          onJourney={() => {
            if (!journeyOn) return;
            setScreen("journey");
          }}
        />
      ) : null}

      {screen === "practice" ? (
        <Practice
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
          onProgress={() => setScreen("progress")}
          onClassSet={() => setScreen("classset")}
          onBack={() => setScreen("home")}
        />
      ) : null}

      {screen === "journey" ? (
        <JourneyMap
          nodes={journeyMap(profile.attempts)}
          onPlay={(id) => startJourney(id)}
          onBack={() => setScreen("home")}
        />
      ) : null}

      {screen === "play" && items?.length ? (
        <Play
          key={playId}
          settings={activePlaySettings}
          items={items}
          attempts={profile.attempts}
          sittingKeys={playMode === "journey" ? profile.journeySittingKeys : profile.sittingKeys}
          mode={playMode === "journey" ? "play" : playMode}
          sessionSec={sessionSec}
          onAttempt={(attempt) => setStore((prev) => recordAttempt(prev, attempt))}
          onDone={() => {
            if (playMode === "warmup" || playMode === "journey") return;
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
          onHome={leavePlay}
        />
      ) : null}

      {screen === "customize" ? (
        <Customize
          settings={store.settings}
          attempts={profile.attempts}
          onBack={() => setScreen("practice")}
          onProgress={() => setScreen("progress")}
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
          onBack={() => setScreen("practice")}
          onLoad={(next) => {
            setStore((prev) => {
              const loaded = loadClassSet(prev, classSetFromSettings(next));
              return { ...loaded, warmupBell: Boolean(prev.warmupBell) };
            });
            setScreen("practice");
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
          sittingKeys={profile.sittingKeys}
          atlasKeys={profile.atlasKeys}
          settings={playSettings}
          onBack={() => setScreen("practice")}
          onCustomize={
            profile.finishedRound || store.hasClassSet ? () => setScreen("customize") : null
          }
          onClear={() => setStore((prev) => clearProgress(prev))}
        />
      ) : null}
    </main>
  );
}
