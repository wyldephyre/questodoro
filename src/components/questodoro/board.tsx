import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Send,
  Target,
  Trophy,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhyreMark } from "@/components/questodoro/mark";
import { TimerRing } from "@/components/questodoro/timer-ring";
import {
  getLeaderboard,
  postScore,
  type BoardRow,
} from "@/lib/questodoro/leaderboard";
import {
  DRILL_WORK_SECONDS,
  rankFromXp,
  secondsToMinutesLabel,
  xpForWork,
} from "@/lib/questodoro/rules";
import { useQuestStore } from "@/lib/questodoro/store";
import { cn, formatMmSs } from "@/lib/utils";

function playPing(kind: "work" | "break") {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = kind === "work" ? 392 : 330;
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

function DurationStepper({
  label,
  seconds,
  onMinutes,
  disabled,
}: {
  label: string;
  seconds: number;
  onMinutes: (minutes: number) => void;
  disabled: boolean;
}) {
  const display = secondsToMinutesLabel(seconds);
  const minutes = Math.max(1, Math.round(seconds / 60));
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 rounded-md bg-well px-3 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_10%,transparent)]">
      <span className="font-display text-xs font-semibold uppercase tracking-kicker text-muted">
        {label}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-sm text-fg hover:bg-surface disabled:opacity-40"
          aria-label={`Decrease ${label}`}
          disabled={disabled || minutes <= 1}
          onClick={() => onMinutes(minutes - 1)}
        >
          <Minus className="size-4" />
        </button>
        <span className="w-10 text-center font-display text-lg font-semibold tabular-nums">
          {display}
        </span>
        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-sm text-fg hover:bg-surface disabled:opacity-40"
          aria-label={`Increase ${label}`}
          disabled={disabled || minutes >= (label === "Work" ? 90 : 30)}
          onClick={() => onMinutes(minutes + 1)}
        >
          <Plus className="size-4" />
        </button>
        <span className="w-8 font-display text-xs uppercase tracking-wider text-muted">
          {seconds < 60 ? "" : "min"}
        </span>
      </div>
    </div>
  );
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
    <div className="min-w-0 flex-1 rounded-md bg-well px-3 py-2 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_10%,transparent)]">
      <p className="font-display text-xs font-semibold uppercase tracking-kicker text-muted">
        {label}
      </p>
      <p className="font-display text-2xl font-semibold leading-none text-fg tabular-nums">
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
  const nick = useQuestStore((s) => s.nick);
  const banner = useQuestStore((s) => s.banner);
  const lastXpGain = useQuestStore((s) => s.lastXpGain);
  const start = useQuestStore((s) => s.start);
  const pause = useQuestStore((s) => s.pause);
  const reset = useQuestStore((s) => s.reset);
  const setWorkMinutes = useQuestStore((s) => s.setWorkMinutes);
  const setBreakMinutes = useQuestStore((s) => s.setBreakMinutes);
  const armDrill = useQuestStore((s) => s.armDrill);
  const tick = useQuestStore((s) => s.tick);
  const setNick = useQuestStore((s) => s.setNick);
  const clearBanner = useQuestStore((s) => s.clearBanner);

  const [rows, setRows] = useState<BoardRow[]>([]);
  const [boardState, setBoardState] = useState<"loading" | "live" | "offline">(
    "loading",
  );
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (runState !== "running") return;
    let frame = 0;
    const loop = () => {
      tick(Date.now());
      frame = window.requestAnimationFrame(loop);
    };
    frame = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frame);
  }, [runState, tick]);

  useEffect(() => {
    if (!banner) return;
    const t = window.setTimeout(() => clearBanner(), 4200);
    return () => window.clearTimeout(t);
  }, [banner, clearBanner]);

  useEffect(() => {
    if (!banner) return;
    if (banner.startsWith("WORK COMPLETE")) playPing("work");
    if (banner.startsWith("BREAK DONE")) playPing("break");
  }, [banner]);

  useEffect(() => {
    let alive = true;
    getLeaderboard()
      .then((list) => {
        if (!alive) return;
        setRows(list);
        setBoardState("live");
      })
      .catch(() => {
        if (!alive) return;
        setBoardState("offline");
      });
    return () => {
      alive = false;
    };
  }, []);

  const rank = useMemo(() => rankFromXp(totalXp), [totalXp]);
  const totalMs =
    phase === "break" ? breakSeconds * 1000 : workSeconds * 1000;
  const locked = runState !== "stopped";
  const onBreak = phase === "break";
  const drillArmed = workSeconds === DRILL_WORK_SECONDS;
  const nextBlockXp = xpForWork(workSeconds);
  const fillPct = Math.min(100, (rank.intoLevel / rank.xpPerLevel) * 100);

  async function onPostScore() {
    if (highScore < 1) {
      toast("Finish a work block first. High score is empty.");
      return;
    }
    const handle = nick.trim();
    if (handle.length < 2) {
      toast("Need a nick (2–16 characters) to post.");
      return;
    }
    setPosting(true);
    try {
      const list = await postScore({ data: { nick: handle, score: highScore } });
      setRows(list);
      setBoardState("live");
      toast(`Posted ${highScore} XP as ${handle}.`);
    } catch (err) {
      setBoardState("offline");
      toast(err instanceof Error ? err.message : "Board unreachable. Local score still counts.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <main className="min-h-dvh bg-bg text-fg lg:h-dvh lg:overflow-hidden">
      <Toaster
        theme="dark"
        position="bottom-center"
        toastOptions={{
          className: "font-sans !bg-surface !text-fg !border-border !rounded-md",
        }}
      />
      <div className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:h-dvh lg:gap-5 lg:py-5">
        <header className="flex flex-col gap-3 border-b border-border pb-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="stagger-item flex items-center gap-3">
            <PhyreMark className="size-12 shrink-0" />
            <div>
              <p className="font-display text-xs font-semibold uppercase tracking-kicker text-olive">
                Yard 3 · One Screen
              </p>
              <h1 className="font-display text-4xl font-semibold leading-none tracking-display text-fg sm:text-5xl">
                QUESTODORO
              </h1>
              <p className="mt-1 text-sm text-muted">
                Gamified Pomodoro focus board. Work earns the rank. Oorah.
              </p>
            </div>
          </div>
          <div className="stagger-item grid grid-cols-2 gap-2 sm:grid-cols-4 lg:max-w-xl lg:flex-1">
            <StatChip label="Level" value={rank.level} hint={`${rank.toNext} XP to next`} />
            <StatChip label="XP" value={totalXp} hint={`${todayXp} today`} />
            <StatChip label="Streak" value={streak} hint="Days with a finished work block" />
            <StatChip label="High" value={highScore} hint="Best XP in one day" />
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-5">
          <section className="stagger-item flex min-h-0 flex-col gap-4 rounded-xl bg-surface p-4 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_10%,transparent)] sm:p-5 lg:col-span-3">
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

            <TimerRing
              remainingMs={remainingMs}
              totalMs={totalMs}
              phase={phase}
              runState={runState}
            />

            <p
              className={cn(
                "text-center font-display text-sm font-semibold uppercase tracking-wider",
                banner ? "text-olive" : "text-muted",
              )}
              aria-live="polite"
            >
              {banner ??
                (onBreak
                  ? "Eyes off the glass. Then back on the line."
                  : runState === "paused"
                    ? "Held. Resume when ready."
                    : "Stand by. Start the work block.")}
            </p>

            {onBreak ? (
              <div className="flex items-start gap-3 rounded-lg bg-well p-4 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-ember)_35%,transparent)]">
                <Eye className="mt-0.5 size-5 shrink-0 text-ember" />
                <div>
                  <p className="font-display text-sm font-semibold uppercase tracking-wider text-fg">
                    Eye-drop · 20 / 20 / 20
                  </p>
                  <p className="mt-1 text-sm leading-normal text-muted">
                    Lock on a point 20 feet out for 20 seconds. Drop the
                    glass, not the mission. Then get back on the line.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <DurationStepper
                label="Work"
                seconds={workSeconds}
                onMinutes={setWorkMinutes}
                disabled={locked}
              />
              <DurationStepper
                label="Break"
                seconds={breakSeconds}
                onMinutes={setBreakMinutes}
                disabled={locked}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {runState === "running" ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="col-span-2 sm:col-span-1"
                  onClick={pause}
                >
                  <Pause />
                  Pause
                </Button>
              ) : (
                <Button
                  type="button"
                  className="col-span-2 sm:col-span-1"
                  onClick={start}
                >
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
                className="col-span-2 sm:col-span-2"
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

          <aside className="stagger-item flex min-h-0 flex-col gap-4 lg:col-span-2">
            <section className="rounded-xl bg-surface p-4 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_10%,transparent)] sm:p-5">
              <p className="font-display text-xs font-semibold uppercase tracking-kicker text-olive">
                Dossier
              </p>
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between font-display text-xs uppercase tracking-wider text-muted">
                  <span>Level {rank.level}</span>
                  <span className="tabular-nums">
                    {rank.intoLevel} / {rank.xpPerLevel}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-well">
                  <div
                    className="h-full rounded-full bg-olive transition-[width] duration-200 ease-out"
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
              </div>
              <ul className="mt-4 space-y-2 text-sm leading-normal text-muted">
                <li>
                  Finish a <span className="text-fg">work</span> block:{" "}
                  <span className="text-fg tabular-nums">
                    {nextBlockXp} XP
                  </span>{" "}
                  (4 XP per minute, minimum 4).
                </li>
                <li>
                  Level = 1 + floor(total XP / 200).
                </li>
                <li>
                  Streak counts consecutive days with at least one finished work
                  block.
                </li>
                <li>
                  High score = most XP earned in a single day.
                  {lastXpGain > 0 ? (
                    <span className="text-ember"> Last gain +{lastXpGain}.</span>
                  ) : null}
                </li>
              </ul>
            </section>

            <section className="flex min-h-0 flex-1 flex-col rounded-xl bg-surface p-4 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_10%,transparent)] sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Trophy className="size-4 text-olive" />
                  <h2 className="font-display text-sm font-semibold uppercase tracking-kicker text-fg">
                    Field board
                  </h2>
                </div>
                <p className="font-display text-xs uppercase tracking-wider text-muted">
                  {boardState === "offline"
                    ? "Offline"
                    : boardState === "loading"
                      ? "Linking"
                      : "Live"}
                </p>
              </div>
              <p className="mt-1 text-xs text-muted">
                Posts your high score (best single day). No accounts. Nick is a
                public handle only.
              </p>

              <ol className="mt-3 min-h-40 flex-1 space-y-1 overflow-auto">
                {boardState === "loading" ? (
                  <li className="text-sm text-muted">Pulling the board…</li>
                ) : rows.length === 0 ? (
                  <li className="text-sm text-muted">
                    No names on the board. Post first.
                  </li>
                ) : (
                  rows.map((row, i) => (
                    <li
                      key={`${row.nick}-${row.score}`}
                      className="flex items-center justify-between gap-3 rounded-sm bg-well px-3 py-2"
                    >
                      <span className="flex min-w-0 items-baseline gap-3">
                        <span className="w-5 font-display text-sm tabular-nums text-muted">
                          {i + 1}
                        </span>
                        <span className="truncate font-display text-sm font-semibold uppercase tracking-wider">
                          {row.nick}
                        </span>
                      </span>
                      <span className="font-display text-sm tabular-nums text-olive">
                        {row.score}
                      </span>
                    </li>
                  ))
                )}
              </ol>

              {boardState === "offline" ? (
                <p className="mt-2 text-xs text-ember">
                  Board unreachable. Local XP, level, streak, and high score
                  still count on this device.
                </p>
              ) : null}

              <form
                className="mt-3 flex flex-col gap-2 sm:flex-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  void onPostScore();
                }}
              >
                <label className="sr-only" htmlFor="quest-nick">
                  Nick
                </label>
                <Input
                  id="quest-nick"
                  name="nick"
                  autoComplete="nickname"
                  placeholder="Optional nick"
                  value={nick}
                  maxLength={16}
                  onChange={(event) => setNick(event.target.value)}
                />
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={posting || highScore < 1}
                >
                  <Send />
                  Post score
                </Button>
              </form>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
