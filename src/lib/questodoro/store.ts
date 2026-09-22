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
import {
  DEFAULT_MISSIONS,
  DEFAULT_REWARDS,
  MAX_MISSIONS,
  MAX_REWARDS,
  MAX_LIVE_MISSIONS,
  MISSION_XP,
  SIDE_XP_DAILY_CAP,
  xpForMission,
  type BreakMission,
  type Mission,
  type Reward,
  type RewardRule,
  newId,
  nextSelectedId,
  parseMissions,
  parseRewards,
  pickMission,
  clampMissionSeconds,
  syncRewardUnlocks,
  unlockContext,
} from "@/lib/questodoro/missions";

const STORAGE_KEY = "questodoro:v1";

export type Phase = "idle" | "work" | "break";
export type RunState = "stopped" | "running" | "paused";

export type MissionRun = {
  id: string;
  remainingMs: number;
  totalMs: number;
  endsAt: number | null;
  runState: RunState;
};

export type QuestStats = {
  totalXp: number;
  todayXp: number;
  todayDate: string;
  highScore: number;
  streak: number;
  lastActiveDay: string | null;
  blocksToday: number;
  nick: string;
  missionStreak: number;
  sideXpToday: number;
};

type PersistShape = QuestStats & {
  workSeconds: number;
  breakSeconds: number;
  missions: Mission[];
  rewards: Reward[];
  selectedMissionId: string | null;
  rotateIndex: number;
  completedIds: string[];
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
  lastMissionXp: number;
  banner: string | null;
  missions: Mission[];
  rewards: Reward[];
  selectedMissionId: string | null;
  rotateIndex: number;
  completedIds: string[];
  breakMission: BreakMission | null;
  missionRuns: MissionRun[];
  hydrate: () => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  checkIn: () => void;
  skipMission: () => void;
  selectMission: (id: string) => void;
  startMission: (id: string) => void;
  pauseMission: (id: string) => void;
  completeMission: (id: string) => void;
  addMission: () => void;
  updateMission: (id: string, patch: Partial<Pick<Mission, "title" | "brief" | "seconds">>) => void;
  removeMission: (id: string) => void;
  moveMission: (id: string, dir: -1 | 1) => void;
  addReward: (title: string, rule: RewardRule) => void;
  updateRewardTitle: (id: string, title: string) => void;
  removeReward: (id: string) => void;
  claimReward: (id: string) => void;
  setWorkMinutes: (minutes: number) => void;
  setBreakMinutes: (minutes: number) => void;
  armDrill: () => void;
  /** Work/break clock only. Must not read or write side-mission runs. */
  tickClock: (now: number) => void;
  /** Side-mission clocks only. Must not write the work/break clock. */
  tickMissions: (now: number) => void;
  tick: (now: number) => void;
  setNick: (nick: string) => void;
  clearBanner: () => void;
};

export function isAwaitingCheckIn(phase: Phase, runState: RunState) {
  return phase === "break" && runState === "stopped";
}

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
    missionStreak: 0,
    sideXpToday: 0,
  };
}

function persistFields(state: PersistShape): PersistShape {
  return {
    totalXp: state.totalXp,
    todayXp: state.todayXp,
    todayDate: state.todayDate,
    highScore: state.highScore,
    streak: state.streak,
    lastActiveDay: state.lastActiveDay,
    blocksToday: state.blocksToday,
    nick: state.nick,
    missionStreak: state.missionStreak,
    sideXpToday: state.sideXpToday,
    workSeconds: state.workSeconds,
    breakSeconds: state.breakSeconds,
    missions: state.missions,
    rewards: state.rewards,
    selectedMissionId: state.selectedMissionId,
    rotateIndex: state.rotateIndex,
    completedIds: state.completedIds,
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
    const missions = parseMissions(parsed.missions);
    const stats: QuestStats = {
      totalXp: Math.max(0, Number(parsed.totalXp) || 0),
      todayXp,
      todayDate: today,
      highScore: Math.max(0, Number(parsed.highScore) || 0),
      streak: Math.max(0, Number(parsed.streak) || 0),
      lastActiveDay: parsed.lastActiveDay ?? null,
      blocksToday,
      nick: typeof parsed.nick === "string" ? parsed.nick.slice(0, 16) : "",
      missionStreak: Math.max(0, Number(parsed.missionStreak) || 0),
      sideXpToday:
        parsed.todayDate === today
          ? Math.min(SIDE_XP_DAILY_CAP, Math.max(0, Number(parsed.sideXpToday) || 0))
          : 0,
    };
    const rewards = syncRewardUnlocks(parseRewards(parsed.rewards), {
      ...unlockContext(stats.totalXp, stats.streak, stats.missionStreak),
      today,
    });
    const selectedMissionId =
      typeof parsed.selectedMissionId === "string" ? parsed.selectedMissionId : null;
    return {
      ...stats,
      workSeconds: clampWorkSeconds(Number(parsed.workSeconds) || WORK_DEFAULT_SECONDS),
      breakSeconds: clampBreakSeconds(
        Number(parsed.breakSeconds) || BREAK_DEFAULT_SECONDS,
      ),
      missions,
      rewards,
      selectedMissionId:
        selectedMissionId && missions.some((m) => m.id === selectedMissionId)
          ? selectedMissionId
          : (missions[0]?.id ?? null),
      rotateIndex: Math.max(0, Number(parsed.rotateIndex) || 0),
      completedIds: Array.isArray(parsed.completedIds)
        ? parsed.completedIds.filter((id): id is string => typeof id === "string")
        : [],
    };
  } catch {
    return null;
  }
}

function writePersist(state: PersistShape) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persistFields(state)));
}

function rollDay(stats: QuestStats): QuestStats {
  const today = localDay();
  if (stats.todayDate === today) return stats;
  return {
    ...stats,
    todayDate: today,
    todayXp: 0,
    blocksToday: 0,
    sideXpToday: 0,
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

function applyBonusXp(stats: QuestStats, xp: number): QuestStats {
  const rolled = rollDay(stats);
  const todayXp = rolled.todayXp + xp;
  return {
    ...rolled,
    totalXp: rolled.totalXp + xp,
    todayXp,
    highScore: Math.max(rolled.highScore, todayXp),
  };
}

function withUnlocks<T extends PersistShape>(state: T): T {
  const rewards = syncRewardUnlocks(state.rewards, {
    ...unlockContext(state.totalXp, state.streak, state.missionStreak),
    today: state.todayDate,
  });
  return { ...state, rewards };
}

function persistNow() {
  const s = useQuestStore.getState();
  writePersist(persistFields(s));
}

function dropRun(runs: MissionRun[], id: string) {
  return runs.filter((run) => run.id !== id);
}

/** Insert or replace without moving the run. Tick used to append, which reshuffled the clocks under the work ring. */
function replaceRun(runs: MissionRun[], run: MissionRun) {
  const idx = runs.findIndex((item) => item.id === run.id);
  if (idx < 0) return [...runs, run];
  const next = runs.slice();
  next[idx] = run;
  return next;
}

function statPatch(stats: QuestStats): QuestStats {
  return {
    totalXp: stats.totalXp,
    todayXp: stats.todayXp,
    todayDate: stats.todayDate,
    highScore: stats.highScore,
    streak: stats.streak,
    lastActiveDay: stats.lastActiveDay,
    blocksToday: stats.blocksToday,
    nick: stats.nick,
    missionStreak: stats.missionStreak,
    sideXpToday: stats.sideXpToday,
  };
}

function awardMissionComplete(s: QuestState, id: string): Partial<QuestState> {
  const mission = s.missions.find((m) => m.id === id);
  const missionRuns = dropRun(s.missionRuns, id);
  if (!mission) return { missionRuns };
  if (s.completedIds.includes(id)) return { missionRuns };

  const rolled = rollDay(s);
  const room = Math.max(0, SIDE_XP_DAILY_CAP - rolled.sideXpToday);
  const awarded = Math.min(xpForMission(mission.seconds), room);
  const stats =
    awarded > 0
      ? { ...applyBonusXp(rolled, awarded), sideXpToday: rolled.sideXpToday + awarded }
      : { ...rolled, sideXpToday: rolled.sideXpToday };
  const next = withUnlocks({
    ...s,
    ...stats,
    missionStreak: s.missionStreak + 1,
    selectedMissionId: id,
    completedIds: [...s.completedIds, id],
  });
  writePersist(persistFields(next));
  return {
    ...statPatch(next),
    rewards: next.rewards,
    selectedMissionId: next.selectedMissionId,
    completedIds: next.completedIds,
    missionRuns,
    lastMissionXp: awarded,
    banner:
      awarded <= 0
        ? `MISSION DONE: ${mission.title.toUpperCase()}. SIDE XP CAPPED (${SIDE_XP_DAILY_CAP}/DAY).`
        : `MISSION COMPLETE: ${mission.title.toUpperCase()}. +${awarded} XP.`,
  };
}

function beginBreakFromWork(s: QuestState, stats: QuestStats, workXp: number, now: number) {
  const picked = pickMission(s.missions, s.rotateIndex, s.selectedMissionId);
  const next = withUnlocks({
    ...s,
    ...stats,
    workSeconds: s.workSeconds,
    breakSeconds: s.breakSeconds,
    missions: s.missions,
    rewards: s.rewards,
    selectedMissionId: picked?.id ?? s.selectedMissionId,
    rotateIndex: s.rotateIndex,
    completedIds: s.completedIds,
  });
  writePersist(persistFields(next));
  // Clock fields only. Side runs stay on their own engine.
  return {
    ...statPatch(next),
    rewards: next.rewards,
    selectedMissionId: next.selectedMissionId,
    phase: "break" as const,
    runState: "running" as const,
    remainingMs: s.breakSeconds * 1000,
    endsAt: now + s.breakSeconds * 1000,
    lastXpGain: workXp,
    breakMission: null,
    banner: `WORK COMPLETE. +${workXp} XP. REST STARTED.`,
  };
}

function resolveMission(
  s: QuestState,
  outcome: "done" | "skipped",
): Partial<QuestState> {
  const remaining =
    s.runState === "paused" || s.runState === "running"
      ? s.remainingMs
      : s.breakSeconds * 1000;
  const currentId = s.breakMission?.id ?? s.selectedMissionId;
  const selectedMissionId = nextSelectedId(s.missions, currentId);
  let stats: QuestStats = s;
  let lastMissionXp = 0;
  let missionStreak = s.missionStreak;
  if (outcome === "done" && s.breakMission?.status === "pending") {
    lastMissionXp = MISSION_XP;
    missionStreak = s.missionStreak + 1;
    stats = applyBonusXp(s, MISSION_XP);
  } else if (outcome === "skipped" && s.breakMission?.status === "pending") {
    missionStreak = 0;
  }
  const next = withUnlocks({
    ...s,
    ...stats,
    missionStreak,
    selectedMissionId,
    rotateIndex: s.rotateIndex + 1,
    completedIds:
      outcome === "done" && s.breakMission?.id
        ? Array.from(new Set([...s.completedIds, s.breakMission.id]))
        : s.completedIds,
  });
  writePersist(persistFields(next));
  const title =
    s.missions.find((m) => m.id === s.breakMission?.id)?.title ?? "mission";
  return {
    ...next,
    phase: "break",
    runState: "running",
    remainingMs: remaining,
    endsAt: Date.now() + remaining,
    lastMissionXp,
    breakMission: s.breakMission
      ? { id: s.breakMission.id, status: outcome }
      : null,
    banner:
      outcome === "done"
        ? `MISSION COMPLETE: ${title.toUpperCase()}. +${MISSION_XP} XP.`
        : "MISSION SKIPPED. REST STILL COUNTS. BACK ON THE LINE AFTER.",
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
  lastMissionXp: 0,
  banner: null,
  missions: DEFAULT_MISSIONS.map((m) => ({ ...m })),
  rewards: DEFAULT_REWARDS.map((r) => ({ ...r })),
  selectedMissionId: DEFAULT_MISSIONS[0]?.id ?? null,
  rotateIndex: 0,
  completedIds: [],
  breakMission: null,
  missionRuns: [],

  hydrate: () => {
    if (get().hydrated) return;
    const saved = readPersist();
    if (!saved) {
      set({ hydrated: true });
      return;
    }
    const rolled = rollDay(saved);
    const next = withUnlocks({ ...saved, ...rolled });
    set({
      ...next,
      remainingMs: saved.workSeconds * 1000,
      phase: "idle",
      runState: "stopped",
      endsAt: null,
      breakMission: null,
      missionRuns: [],
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
      banner: phase === "work" ? "ON THE LINE. HOLD THE BLOCK." : "REST. MISSIONS STAY ON DEMAND.",
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
    set({
      phase: "idle",
      runState: "stopped",
      remainingMs: s.workSeconds * 1000,
      endsAt: null,
      breakMission: null,
      banner: "RESET. STAND BY.",
    });
  },

  checkIn: () => {
    const s = get();
    if (s.phase !== "break") return;
    if (s.breakMission?.status === "done") return;
    if (s.breakMission?.status === "skipped") {
      if (s.runState === "stopped") {
        set({
          runState: "running",
          remainingMs: s.breakSeconds * 1000,
          endsAt: Date.now() + s.breakSeconds * 1000,
        });
      }
      return;
    }
    if (!isAwaitingCheckIn(s.phase, s.runState) && s.breakMission?.status !== "pending") {
      return;
    }
    set(resolveMission(s, "done"));
  },

  skipMission: () => {
    const s = get();
    if (s.phase !== "break") return;
    if (s.breakMission?.status !== "pending") {
      if (isAwaitingCheckIn(s.phase, s.runState)) {
        set({
          runState: "running",
          remainingMs: s.breakSeconds * 1000,
          endsAt: Date.now() + s.breakSeconds * 1000,
          banner: "REST STARTED. NO MISSION ON DECK.",
        });
      }
      return;
    }
    set(resolveMission(s, "skipped"));
  },

  selectMission: (id: string) => {
    const s = get();
    if (!s.missions.some((m) => m.id === id)) return;
    const breakMission =
      s.phase === "break" && s.breakMission?.status === "pending"
        ? { id, status: "pending" as const }
        : s.breakMission;
    set({ selectedMissionId: id, breakMission });
    persistNow();
  },

  completeMission: (id: string) => {
    const s = get();
    set(awardMissionComplete(s, id));
    persistNow();
  },

  startMission: (id: string) => {
    const s = get();
    const mission = s.missions.find((m) => m.id === id);
    if (!mission) return;
    const existing = s.missionRuns.find((run) => run.id === id);
    if (existing?.runState === "running") return;
    const liveCount = s.missionRuns.filter(
      (run) => run.runState === "running" || run.runState === "paused",
    ).length;
    if (!existing && liveCount >= MAX_LIVE_MISSIONS) {
      set({ banner: "MAX 3 SIDE MISSIONS LIVE." });
      return;
    }
    const remaining =
      existing?.runState === "paused"
        ? Math.max(0, existing.remainingMs)
        : mission.seconds * 1000;
    if (remaining <= 0) {
      set(awardMissionComplete(s, id));
      persistNow();
      return;
    }
    const run: MissionRun = {
      id,
      remainingMs: remaining,
      totalMs: existing?.totalMs ?? remaining,
      endsAt: Date.now() + remaining,
      runState: "running",
    };
    set({
      selectedMissionId: id,
      missionRuns: replaceRun(s.missionRuns, run),
      completedIds: s.completedIds.filter((item) => item !== id),
      banner: `SIDE MISSION LIVE: ${mission.title.toUpperCase()}.`,
    });
  },

  pauseMission: (id: string) => {
    const s = get();
    const existing = s.missionRuns.find((run) => run.id === id);
    if (!existing || existing.runState !== "running") return;
    const remaining = Math.max(0, (existing.endsAt ?? Date.now()) - Date.now());
    set({
      missionRuns: replaceRun(s.missionRuns, {
        ...existing,
        runState: "paused",
        remainingMs: remaining,
        endsAt: null,
      }),
      banner: "MISSION HELD.",
    });
  },

  addMission: () => {
    const s = get();
    if (s.missions.length >= MAX_MISSIONS) return;
    const mission: Mission = {
      id: newId("m"),
      title: "Custom",
      brief: "Your one-liner.",
      seconds: 30,
    };
    set({ missions: [...s.missions, mission], selectedMissionId: mission.id });
    persistNow();
  },

  updateMission: (id, patch) => {
    const s = get();
    const missions = s.missions.map((m) => {
      if (m.id !== id) return m;
      return {
        ...m,
        title: patch.title !== undefined ? patch.title.slice(0, 32) : m.title,
        brief: patch.brief !== undefined ? patch.brief.slice(0, 80) : m.brief,
        seconds:
          patch.seconds === undefined
            ? m.seconds
            : clampMissionSeconds(patch.seconds),
      };
    });
    set({ missions });
    persistNow();
  },

  removeMission: (id) => {
    const s = get();
    const missions = s.missions.filter((m) => m.id !== id);
    const selectedMissionId =
      s.selectedMissionId === id ? (missions[0]?.id ?? null) : s.selectedMissionId;
    const breakMission =
      s.breakMission?.id === id
        ? selectedMissionId
          ? { id: selectedMissionId, status: s.breakMission.status }
          : null
        : s.breakMission;
    set({
      missions,
      selectedMissionId,
      breakMission,
      missionRuns: dropRun(s.missionRuns, id),
    });
    persistNow();
  },

  moveMission: (id, dir) => {
    const s = get();
    const idx = s.missions.findIndex((m) => m.id === id);
    const next = idx + dir;
    if (idx < 0 || next < 0 || next >= s.missions.length) return;
    const missions = s.missions.slice();
    const [row] = missions.splice(idx, 1);
    missions.splice(next, 0, row);
    set({ missions });
    persistNow();
  },

  addReward: (title, rule) => {
    const s = get();
    if (s.rewards.length >= MAX_REWARDS) return;
    const trimmed = title.trim().slice(0, 32);
    if (trimmed.length < 2) return;
    const reward: Reward = {
      id: newId("r"),
      title: trimmed,
      rule,
      unlockedAt: null,
      claimed: false,
    };
    const rewards = syncRewardUnlocks([...s.rewards, reward], {
      ...unlockContext(s.totalXp, s.streak, s.missionStreak),
      today: s.todayDate,
    });
    set({ rewards });
    persistNow();
  },

  updateRewardTitle: (id, title) => {
    const s = get();
    const rewards = s.rewards.map((r) =>
      r.id === id ? { ...r, title: title.slice(0, 32) } : r,
    );
    set({ rewards });
    persistNow();
  },

  removeReward: (id) => {
    set({ rewards: get().rewards.filter((r) => r.id !== id) });
    persistNow();
  },

  claimReward: (id) => {
    const s = get();
    const rewards = s.rewards.map((r) => {
      if (r.id !== id) return r;
      if (!r.unlockedAt && !r.claimed) return r;
      return { ...r, claimed: !r.claimed };
    });
    set({ rewards });
    persistNow();
  },

  setWorkMinutes: (minutes: number) => {
    const s = get();
    if (s.runState !== "stopped" || s.phase === "break") return;
    const workSeconds = clampWorkSeconds(minutes * 60);
    set({
      workSeconds,
      remainingMs: workSeconds * 1000,
    });
    persistNow();
  },

  setBreakMinutes: (minutes: number) => {
    const s = get();
    if (s.runState !== "stopped" || s.phase === "break") return;
    const breakSeconds = clampBreakSeconds(minutes * 60);
    set({ breakSeconds });
    persistNow();
  },

  armDrill: () => {
    const s = get();
    if (s.runState !== "stopped" || s.phase === "break") return;
    set({
      workSeconds: DRILL_WORK_SECONDS,
      breakSeconds: DRILL_BREAK_SECONDS,
      remainingMs: DRILL_WORK_SECONDS * 1000,
      phase: "idle",
      banner: "DRILL ARMED. 15s WORK / 20s BREAK.",
    });
    persistNow();
  },

  tickClock: (now: number) => {
    const s = get();
    if (s.runState !== "running" || s.endsAt == null) return;
    const remaining = Math.max(0, s.endsAt - now);
    if (remaining <= 0) {
      if (s.phase === "work") {
        const xp = xpForWork(s.workSeconds);
        const stats = applyWorkComplete(s, xp);
        set(beginBreakFromWork(s, stats, xp, now));
      } else {
        set({
          phase: "idle",
          runState: "stopped",
          remainingMs: s.workSeconds * 1000,
          endsAt: null,
          breakMission: null,
          banner: "BREAK DONE. START THE NEXT BLOCK.",
        });
      }
      return;
    }
    if (Math.abs(remaining - s.remainingMs) >= 200) {
      set({ remainingMs: remaining });
    }
  },

  tickMissions: (now: number) => {
    const s = get();
    const expired: string[] = [];
    let changed = false;
    const missionRuns = s.missionRuns.map((run) => {
      if (run.runState !== "running" || run.endsAt == null) return run;
      const left = Math.max(0, run.endsAt - now);
      if (left <= 0) {
        expired.push(run.id);
        return run;
      }
      if (Math.abs(left - run.remainingMs) >= 200) {
        changed = true;
        return { ...run, remainingMs: left };
      }
      return run;
    });
    if (changed) set({ missionRuns });
    for (const id of expired) {
      set(awardMissionComplete(get(), id));
    }
  },

  tick: (now: number) => {
    get().tickClock(now);
    get().tickMissions(now);
  },

  setNick: (nick: string) => {
    set({ nick: nick.slice(0, 16) });
    persistNow();
  },

  clearBanner: () => set({ banner: null }),
}));

export function activeBreakMission(state: {
  missions: Mission[];
  breakMission: BreakMission | null;
  selectedMissionId: string | null;
  rotateIndex: number;
}) {
  if (state.breakMission) {
    return state.missions.find((m) => m.id === state.breakMission?.id) ?? null;
  }
  return pickMission(state.missions, state.rotateIndex, state.selectedMissionId);
}
