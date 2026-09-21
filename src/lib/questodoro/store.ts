import { create } from "zustand";
import { localDay, shiftDay } from "@/lib/utils";
import {
  BREAK_DEFAULT_SECONDS,
  DRILL_BREAK_SECONDS,
  DRILL_WORK_SECONDS,
  WORK_DEFAULT_SECONDS,
  clampBreakSeconds,
  clampWorkSeconds,
  xpForWork,
} from "@/lib/questodoro/rules";

const STORAGE_KEY = "questodoro:v1";

export type Phase = "idle" | "work" | "break";
export type RunState = "stopped" | "running" | "paused";

export type QuestStats = {
  totalXp: number;
  todayXp: number;
  todayDate: string;
  highScore: number;
  streak: number;
  lastActiveDay: string | null;
  blocksToday: number;
  nick: string;
};

type PersistShape = QuestStats & {
  workSeconds: number;
  breakSeconds: number;
};

type QuestState = QuestStats & {
  hydrated: boolean;
  phase: Phase;
  runState: RunState;
  workSeconds: number;
  breakSeconds: number;
  remainingMs: number;
  endsAt: number | null;
  lastXpGain: number;
  banner: string | null;
  hydrate: () => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  setWorkMinutes: (minutes: number) => void;
  setBreakMinutes: (minutes: number) => void;
  armDrill: () => void;
  tick: (now: number) => void;
  setNick: (nick: string) => void;
  clearBanner: () => void;
};

function defaultStats(): QuestStats {
  return {
    totalXp: 0,
    todayXp: 0,
    todayDate: localDay(),
    highScore: 0,
    streak: 0,
    lastActiveDay: null,
    blocksToday: 0,
    nick: "",
  };
}

function readPersist(): PersistShape | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistShape>;
    const today = localDay();
    const todayXp = parsed.todayDate === today ? Number(parsed.todayXp) || 0 : 0;
    const blocksToday =
      parsed.todayDate === today ? Number(parsed.blocksToday) || 0 : 0;
    return {
      totalXp: Math.max(0, Number(parsed.totalXp) || 0),
      todayXp,
      todayDate: today,
      highScore: Math.max(0, Number(parsed.highScore) || 0),
      streak: Math.max(0, Number(parsed.streak) || 0),
      lastActiveDay: parsed.lastActiveDay ?? null,
      blocksToday,
      nick: typeof parsed.nick === "string" ? parsed.nick.slice(0, 16) : "",
      workSeconds: clampWorkSeconds(Number(parsed.workSeconds) || WORK_DEFAULT_SECONDS),
      breakSeconds: clampBreakSeconds(
        Number(parsed.breakSeconds) || BREAK_DEFAULT_SECONDS,
      ),
    };
  } catch {
    return null;
  }
}

function writePersist(state: PersistShape) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      totalXp: state.totalXp,
      todayXp: state.todayXp,
      todayDate: state.todayDate,
      highScore: state.highScore,
      streak: state.streak,
      lastActiveDay: state.lastActiveDay,
      blocksToday: state.blocksToday,
      nick: state.nick,
      workSeconds: state.workSeconds,
      breakSeconds: state.breakSeconds,
    }),
  );
}

function rollDay(stats: QuestStats): QuestStats {
  const today = localDay();
  if (stats.todayDate === today) return stats;
  return {
    ...stats,
    todayDate: today,
    todayXp: 0,
    blocksToday: 0,
  };
}

function applyWorkComplete(stats: QuestStats, xp: number): QuestStats {
  const rolled = rollDay(stats);
  const today = rolled.todayDate;
  const yesterday = shiftDay(today, -1);
  const firstToday = rolled.lastActiveDay !== today;
  let streak = rolled.streak;
  if (firstToday) {
    streak = rolled.lastActiveDay === yesterday ? rolled.streak + 1 : 1;
  }
  const todayXp = rolled.todayXp + xp;
  return {
    ...rolled,
    totalXp: rolled.totalXp + xp,
    todayXp,
    highScore: Math.max(rolled.highScore, todayXp),
    streak,
    lastActiveDay: today,
    blocksToday: rolled.blocksToday + 1,
  };
}

export const useQuestStore = create<QuestState>((set, get) => ({
  ...defaultStats(),
  hydrated: false,
  phase: "idle",
  runState: "stopped",
  workSeconds: WORK_DEFAULT_SECONDS,
  breakSeconds: BREAK_DEFAULT_SECONDS,
  remainingMs: WORK_DEFAULT_SECONDS * 1000,
  endsAt: null,
  lastXpGain: 0,
  banner: null,

  hydrate: () => {
    if (get().hydrated) return;
    const saved = readPersist();
    if (!saved) {
      set({ hydrated: true });
      return;
    }
    const rolled = rollDay(saved);
    set({
      ...rolled,
      workSeconds: saved.workSeconds,
      breakSeconds: saved.breakSeconds,
      remainingMs: saved.workSeconds * 1000,
      phase: "idle",
      runState: "stopped",
      endsAt: null,
      hydrated: true,
    });
  },

  start: () => {
    const s = get();
    if (s.runState === "running") return;
    const phase: Phase = s.phase === "break" ? "break" : "work";
    const remaining =
      s.runState === "paused"
        ? s.remainingMs
        : (phase === "break" ? s.breakSeconds : s.workSeconds) * 1000;
    set({
      phase,
      runState: "running",
      remainingMs: remaining,
      endsAt: Date.now() + remaining,
      banner: phase === "work" ? "ON THE LINE. HOLD THE BLOCK." : s.banner,
    });
  },

  pause: () => {
    const s = get();
    if (s.runState !== "running") return;
    const remaining = Math.max(0, (s.endsAt ?? Date.now()) - Date.now());
    set({
      runState: "paused",
      remainingMs: remaining,
      endsAt: null,
      banner: "HELD. RESUME WHEN READY.",
    });
  },

  reset: () => {
    const s = get();
    const remaining = s.workSeconds * 1000;
    set({
      phase: "idle",
      runState: "stopped",
      remainingMs: remaining,
      endsAt: null,
      banner: "RESET. STAND BY.",
    });
  },

  setWorkMinutes: (minutes: number) => {
    const s = get();
    if (s.runState !== "stopped") return;
    const workSeconds = clampWorkSeconds(minutes * 60);
    set({
      workSeconds,
      remainingMs: s.phase === "break" ? s.remainingMs : workSeconds * 1000,
    });
    writePersist({ ...get(), workSeconds, breakSeconds: get().breakSeconds });
  },

  setBreakMinutes: (minutes: number) => {
    const s = get();
    if (s.runState !== "stopped") return;
    const breakSeconds = clampBreakSeconds(minutes * 60);
    set({ breakSeconds });
    writePersist({ ...get(), workSeconds: get().workSeconds, breakSeconds });
  },

  armDrill: () => {
    const s = get();
    if (s.runState !== "stopped") return;
    set({
      workSeconds: DRILL_WORK_SECONDS,
      breakSeconds: DRILL_BREAK_SECONDS,
      remainingMs: DRILL_WORK_SECONDS * 1000,
      phase: "idle",
      banner: "DRILL ARMED. 15s WORK / 20s BREAK.",
    });
    writePersist({
      ...get(),
      workSeconds: DRILL_WORK_SECONDS,
      breakSeconds: DRILL_BREAK_SECONDS,
    });
  },

  tick: (now: number) => {
    const s = get();
    if (s.runState !== "running" || s.endsAt == null) return;
    const remaining = Math.max(0, s.endsAt - now);
    if (remaining > 0) {
      if (Math.abs(remaining - s.remainingMs) >= 200) {
        set({ remainingMs: remaining });
      }
      return;
    }

    if (s.phase === "work") {
      const xp = xpForWork(s.workSeconds);
      const next = applyWorkComplete(s, xp);
      writePersist({
        ...next,
        workSeconds: s.workSeconds,
        breakSeconds: s.breakSeconds,
      });
      set({
        ...next,
        phase: "break",
        runState: "running",
        remainingMs: s.breakSeconds * 1000,
        endsAt: now + s.breakSeconds * 1000,
        lastXpGain: xp,
        banner: `WORK COMPLETE. +${xp} XP BANKED.`,
      });
      return;
    }

    set({
      phase: "idle",
      runState: "stopped",
      remainingMs: s.workSeconds * 1000,
      endsAt: null,
      banner: "BREAK DONE. START THE NEXT BLOCK.",
    });
  },

  setNick: (nick: string) => {
    const next = nick.slice(0, 16);
    set({ nick: next });
    writePersist({ ...get(), nick: next });
  },

  clearBanner: () => set({ banner: null }),
}));
