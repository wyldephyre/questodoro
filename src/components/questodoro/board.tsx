import { useEffect, useMemo } from "react";
import {
  Pause,
  Play,
  RotateCcw,
  Target,
} from "lucide-react";
import { DurationStepper } from "@/components/questodoro/duration-stepper";
import { MissionRunClock } from "@/components/questodoro/mission-run-clock";
import { MissionsPanel } from "@/components/questodoro/missions-panel";
import { PhyreMark } from "@/components/questodoro/mark";
import { RewardsShelf } from "@/components/questodoro/rewards-shelf";
import { TimerRing } from "@/components/questodoro/timer-ring";
import { Button } from "@/components/ui/button";
import { SIDE_XP_DAILY_CAP } from "@/lib/questodoro/missions";
import {
  DRILL_WORK_SECONDS,
  rankFromXp,
  xpForWork,
} from "@/lib/questodoro/rules";
import {
  useQuestStore,
  yesterdayQuip,
} from "@/lib/questodoro/store";
import { cn, formatMmSs } from "@/lib/utils";

function playPing(kind: "work" | "break" | "mission") {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = kind === "work" ? 392 : kind === "mission" ? 523 : 330;
    gain.gain.value = 0.035;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.11);
    window.setTimeout(() => void ctx.close(), 250);
  } catch {
    /* audio optional */
  }
}

function StatChip({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="min-w-0 flex-1 rounded-md bg-well px-4 py-3 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_10%,transparent)]">
      <p className="font-display text-xs font-semibold uppercase tracking-kicker text-muted">
        {label}
      </p>
      <p className="font-display text-2xl font-semibold leading-none text-fg tabular-nums 2xl:text-3xl">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function QuestodoroBoard() {
  const hydrate = useQuestStore((s) => s.hydrate);
  const phase = useQuestStore((s) => s.phase);
  const runState = useQuestStore((s) => s.runState);
  const remainingMs = useQuestStore((s) => s.remainingMs);
  const workSeconds = useQuestStore((s) => s.workSeconds);
  const breakSeconds = useQuestStore((s) => s.breakSeconds);
  const totalXp = useQuestStore((s) => s.totalXp);
  const todayXp = useQuestStore((s) => s.todayXp);
  const highScore = useQuestStore((s) => s.highScore);
  const streak = useQuestStore((s) => s.streak);
  const blocksToday = useQuestStore((s) => s.blocksToday);
  const banner = useQuestStore((s) => s.banner);
  const lastXpGain = useQuestStore((s) => s.lastXpGain);
  const lastMissionXp = useQuestStore((s) => s.lastMissionXp);
  const missions = useQuestStore((s) => s.missions);
  const rewards = useQuestStore((s) => s.rewards);
  const selectedMissionId = useQuestStore((s) => s.selectedMissionId);
  const missionStreak = useQuestStore((s) => s.missionStreak);
  const sideXpToday = useQuestStore((s) => s.sideXpToday);
  const completedIds = useQuestStore((s) => s.completedIds);
  const missionRuns = useQuestStore((s) => s.missionRuns);
  const start = useQuestStore((s) => s.start);
  const pause = useQuestStore((s) => s.pause);
  const reset = useQuestStore((s) => s.reset);
  const selectMission = useQuestStore((s) => s.selectMission);
  const startMission = useQuestStore((s) => s.startMission);
  const pauseMission = useQuestStore((s) => s.pauseMission);
  const completeMission = useQuestStore((s) => s.completeMission);
  const addMission = useQuestStore((s) => s.addMission);
  const updateMission = useQuestStore((s) => s.updateMission);
  const removeMission = useQuestStore((s) => s.removeMission);
  const moveMission = useQuestStore((s) => s.moveMission);
  const addReward = useQuestStore((s) => s.addReward);
  const updateRewardTitle = useQuestStore((s) => s.updateRewardTitle);
  const removeReward = useQuestStore((s) => s.removeReward);
  const claimReward = useQuestStore((s) => s.claimReward);
  const setWorkMinutes = useQuestStore((s) => s.setWorkMinutes);
  const setBreakMinutes = useQuestStore((s) => s.setBreakMinutes);
  const armDrill = useQuestStore((s) => s.armDrill);
  const tickClock = useQuestStore((s) => s.tickClock);
  const tickMissions = useQuestStore((s) => s.tickMissions);
  const rollIfNeeded = useQuestStore((s) => s.rollIfNeeded);
  const clearBanner = useQuestStore((s) => s.clearBanner);
  const todayRollup = useQuestStore((s) => s.todayRollup);
  const yesterday = useQuestStore((s) => s.yesterday);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const missionLive = missionRuns.some((run) => run.runState === "running");

  useEffect(() => {
    if (runState !== "running") return;
    let frame = 0;
    const loop = () => {
      tickClock(Date.now());
      frame = window.requestAnimationFrame(loop);
    };
    frame = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frame);
  }, [runState, tickClock]);

  useEffect(() => {
    if (!missionLive) return;
    let frame = 0;
    const loop = () => {
      tickMissions(Date.now());
      frame = window.requestAnimationFrame(loop);
    };
    frame = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frame);
  }, [missionLive, tickMissions]);

  useEffect(() => {
    if (!banner) return;
    const t = window.setTimeout(() => clearBanner(), 4200);
    return () => window.clearTimeout(t);
  }, [banner, clearBanner]);

  useEffect(() => {
    if (!banner) return;
    if (banner.startsWith("WORK COMPLETE")) playPing("work");
    if (banner.startsWith("MISSION COMPLETE") || banner.startsWith("MISSION DONE")) playPing("mission");
    if (banner.startsWith("BREAK DONE")) playPing("break");
  }, [banner]);

  useEffect(() => {
    const id = window.setInterval(() => rollIfNeeded(), 30_000);
    return () => window.clearInterval(id);
  }, [rollIfNeeded]);

  const rank = useMemo(() => rankFromXp(totalXp), [totalXp]);
  const totalMs =
    phase === "break" ? breakSeconds * 1000 : workSeconds * 1000;
  const locked = runState !== "stopped";
  const drillArmed = workSeconds === DRILL_WORK_SECONDS;
  const nextBlockXp = xpForWork(workSeconds);
  const fillPct = Math.min(100, (rank.intoLevel / rank.xpPerLevel) * 100);
  const missionOrder = useMemo(() => {
    const order = new Map<string, number>();
    missions.forEach((mission, index) => order.set(mission.id, index));
    return order;
  }, [missions]);
  const liveRuns = missionRuns
    .filter((run) => run.runState === "running" || run.runState === "paused")
    .slice()
    .sort(
      (a, b) => (missionOrder.get(a.id) ?? 0) - (missionOrder.get(b.id) ?? 0),
    );

  const yesterdayTotal = yesterday ? yesterday.totalXp : null;
  const todayTotal = todayRollup.totalXp;
  const delta = yesterdayTotal == null ? null : todayTotal - yesterdayTotal;
  const quip = yesterdayQuip(todayTotal, yesterdayTotal);
  const quipTone =
    yesterdayTotal == null ? "text-muted" : delta != null && delta < 0 ? "text-ember" : "text-olive";

  return (
    <main className="min-h-dvh bg-bg text-fg 2xl:h-dvh 2xl:overflow-hidden">
      <div className="mx-auto flex min-h-dvh w-full max-w-board flex-col gap-5 px-4 py-4 2xl:h-dvh 2xl:gap-6 2xl:px-10 2xl:py-6">
        <header className="flex shrink-0 flex-col gap-4 border-b border-border pb-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
          <div className="stagger-item flex items-center gap-4">
            <PhyreMark className="size-14 shrink-0" />
            <div>
              <p className="font-display text-xs font-semibold uppercase tracking-kicker text-olive">
                Yard 3 · One Screen
              </p>
              <h1 className="font-display text-5xl font-semibold leading-none tracking-display text-fg 2xl:text-6xl">
                QUESTODORO
              </h1>
              <p className="mt-1 text-sm text-muted">
                Work earns the rank. Missions are on demand. Oorah.
              </p>
            </div>
          </div>
          <div className="stagger-item grid w-full grid-cols-2 gap-3 sm:grid-cols-4 2xl:max-w-3xl 2xl:flex-1">
            <StatChip label="Level" value={rank.level} hint={`${rank.toNext} XP to next`} />
            <StatChip label="XP" value={totalXp} hint={`${todayXp} today`} />
            <StatChip label="Streak" value={streak} hint="Days with a finished work block" />
            <StatChip label="High" value={highScore} hint="Best XP in one day" />
          </div>
        </header>

        <div className="flex shrink-0 flex-col gap-2">
          <div className="h-2 overflow-hidden rounded-full bg-well">
            <div
              className="h-full rounded-full bg-olive transition-[width] duration-200 ease-out"
              style={{ width: `${fillPct}%` }}
            />
          </div>
          <p className="font-display text-xs uppercase tracking-wider text-muted">
            Level {rank.level} · {rank.intoLevel} / {rank.xpPerLevel} · Work {nextBlockXp} XP ·
            Side XP {sideXpToday}/{SIDE_XP_DAILY_CAP}
            {sideXpToday >= SIDE_XP_DAILY_CAP ? " · Capped" : ""}
            {lastXpGain > 0 ? ` · Last work +${lastXpGain}` : ""}
            {lastMissionXp > 0 ? ` · Last mission +${lastMissionXp}` : ""}
          </p>
        </div>

        <section className="stagger-item flex shrink-0 flex-col gap-3 rounded-xl bg-surface px-4 py-3 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_10%,transparent)] sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-display text-xs font-semibold uppercase tracking-kicker text-muted">
              Yesterday you
            </p>
            <p className={cn("font-display text-sm font-semibold uppercase tracking-wider", quipTone)}>
              {quip}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[22rem]">
            <div className="rounded-md bg-well px-3 py-2">
              <p className="font-display text-xs font-semibold uppercase tracking-kicker text-muted">
                Today
              </p>
              <p className="font-display text-2xl font-semibold leading-none tabular-nums text-fg">
                {todayTotal}
              </p>
            </div>
            <div className="rounded-md bg-well px-3 py-2">
              <p className="font-display text-xs font-semibold uppercase tracking-kicker text-muted">
                Yesterday
              </p>
              <p className="font-display text-2xl font-semibold leading-none tabular-nums text-fg">
                {yesterdayTotal == null ? "--" : yesterdayTotal}
              </p>
            </div>
            <div className="rounded-md bg-well px-3 py-2">
              <p className="font-display text-xs font-semibold uppercase tracking-kicker text-muted">
                Delta
              </p>
              <p className={cn("font-display text-2xl font-semibold leading-none tabular-nums", quipTone)}>
                {delta == null ? "--" : `${delta > 0 ? "+" : ""}${delta}`}
              </p>
            </div>
          </div>
        </section>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 2xl:grid-cols-3 2xl:gap-5">
          <section className="stagger-item flex min-h-0 flex-col gap-4 rounded-xl bg-surface p-4 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_10%,transparent)] 2xl:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-muted">
                <Target className="size-4 text-olive" />
                <p className="font-display text-xs font-semibold uppercase tracking-kicker">
                  Mission clock
                </p>
              </div>
              <p className="font-display text-xs uppercase tracking-wider text-muted">
                {blocksToday} work {blocksToday === 1 ? "block" : "blocks"} today
              </p>
            </div>

            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4">
              <TimerRing
                remainingMs={remainingMs}
                totalMs={totalMs}
                phase={phase}
                runState={runState}
              />

              {liveRuns.length > 0 ? (
                <div className="flex w-full flex-col gap-2">
                  {liveRuns.map((run) => (
                    <MissionRunClock
                      key={run.id}
                      mission={missions.find((m) => m.id === run.id) ?? null}
                      run={run}
                      onPause={() => pauseMission(run.id)}
                      onResume={() => startMission(run.id)}
                    />
                  ))}
                </div>
              ) : null}

              <p
                className={cn(
                  "text-center font-display text-sm font-semibold uppercase tracking-wider",
                  banner ? "text-olive" : "text-muted",
                )}
                aria-live="polite"
              >
                {banner ??
                  (phase === "break"
                    ? "Rest. Missions stay on demand."
                    : runState === "paused"
                      ? "Held. Resume when ready."
                      : phase === "work" && runState === "running"
                        ? "On the line. Hold the block."
                        : "Stand by. Start the work block.")}
              </p>
            </div>

            {locked ? null : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DurationStepper
                  label="Work"
                  seconds={workSeconds}
                  onMinutes={setWorkMinutes}
                  disabled={locked}
                  maxMinutes={90}
                />
                <DurationStepper
                  label="Break"
                  seconds={breakSeconds}
                  onMinutes={setBreakMinutes}
                  disabled={locked}
                  maxMinutes={30}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 2xl:grid-cols-4">
              {runState === "running" ? (
                <Button type="button" variant="secondary" onClick={pause}>
                  <Pause />
                  Pause
                </Button>
              ) : (
                <Button type="button" onClick={start}>
                  <Play className="ml-0.5" />
                  {runState === "paused" ? "Resume" : "Start"}
                </Button>
              )}
              <Button type="button" variant="secondary" onClick={reset}>
                <RotateCcw />
                Reset
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="col-span-2 2xl:col-span-2"
                disabled={locked}
                onClick={armDrill}
              >
                {drillArmed ? "Drill armed · 15s" : "Drill 15s"}
              </Button>
            </div>
            <p className="sr-only" aria-live="polite">
              {phase} {formatMmSs(remainingMs)}
            </p>
          </section>

          <MissionsPanel
            className="stagger-item"
            missions={missions}
            selectedId={selectedMissionId}
            completedIds={completedIds}
            missionStreak={missionStreak}
            sideXpToday={sideXpToday}
            missionRuns={missionRuns}
            onSelect={selectMission}
            onAdd={addMission}
            onUpdate={updateMission}
            onRemove={removeMission}
            onMove={moveMission}
            onStart={startMission}
            onPause={pauseMission}
            onComplete={completeMission}
          />

          <RewardsShelf
            className="stagger-item h-full min-h-0 flex-1"
            rewards={rewards}
            onAdd={addReward}
            onRename={updateRewardTitle}
            onRemove={removeReward}
            onClaim={claimReward}
          />
        </div>
      </div>
    </main>
  );
}
