import { Check, ChevronDown, ChevronUp, Crosshair, Minus, Pause, Play, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MAX_LIVE_MISSIONS,
  MAX_MISSIONS,
  MISSION_LENGTH_MAX,
  MISSION_LENGTH_MIN,
  MISSION_LENGTH_STEP,
  SIDE_XP_DAILY_CAP,
  xpForMission,
  type Mission,
} from "@/lib/questodoro/missions";
import type { MissionRun } from "@/lib/questodoro/store";
import { cn, formatMmSs } from "@/lib/utils";

export function MissionsPanel({
  missions,
  selectedId,
  completedIds,
  missionStreak,
  sideXpToday,
  missionRuns,
  onSelect,
  onAdd,
  onUpdate,
  onRemove,
  onMove,
  onStart,
  onPause,
  onComplete,
  className,
}: {
  missions: Mission[];
  selectedId: string | null;
  completedIds: string[];
  missionStreak: number;
  sideXpToday: number;
  missionRuns: MissionRun[];
  onSelect: (id: string) => void;
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<Pick<Mission, "title" | "brief" | "seconds">>) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onStart: (id: string) => void;
  onPause: (id: string) => void;
  onComplete: (id: string) => void;
  className?: string;
}) {
  const liveCount = missionRuns.filter(
    (run) => run.runState === "running" || run.runState === "paused",
  ).length;
  const sideCapped = sideXpToday >= SIDE_XP_DAILY_CAP;
  return (
    <section
      className={cn(
        "flex min-h-0 flex-col rounded-xl bg-surface p-5 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_10%,transparent)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Crosshair className="size-4 text-olive" />
          <h2 className="font-display text-sm font-semibold uppercase tracking-kicker text-fg">
            Missions
          </h2>
        </div>
        <p className="font-display text-xs uppercase tracking-wider text-muted">
          {liveCount}/{MAX_LIVE_MISSIONS} live · {missionStreak} in a row
        </p>
      </div>
      <p className="mt-1 text-xs text-muted">
        On demand. Own clocks. Max {MAX_LIVE_MISSIONS} at once. Side XP{" "}
        {sideCapped ? "capped" : `${sideXpToday}/${SIDE_XP_DAILY_CAP}`} today.
      </p>

      <ol className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto">
        {missions.map((mission, index) => {
          const selected = mission.id === selectedId;
          const done = completedIds.includes(mission.id);
          const run = missionRuns.find((item) => item.id === mission.id);
          const active = Boolean(run && run.runState !== "stopped");
          const running = run?.runState === "running";
          const paused = run?.runState === "paused";
          const remaining = run ? run.remainingMs : mission.seconds * 1000;
          const missionXp = xpForMission(mission.seconds);
          const atLiveCap = !run && liveCount >= MAX_LIVE_MISSIONS;
          return (
            <li
              key={mission.id}
              className={cn(
                "rounded-md bg-well p-2",
                done
                  ? "shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-olive)_55%,transparent)]"
                  : selected
                    ? "shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-olive)_70%,transparent)]"
                    : "shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_10%,transparent)]",
              )}
            >
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-sm font-display text-xs font-semibold uppercase",
                    selected ? "bg-olive text-olive-fg" : "text-muted hover:bg-surface hover:text-fg",
                  )}
                  aria-label={`Select ${mission.title || "mission"}`}
                  aria-pressed={selected}
                  onClick={() => onSelect(mission.id)}
                >
                  {index + 1}
                </button>
                <Input
                  aria-label="Mission title"
                  value={mission.title}
                  maxLength={32}
                  className="h-10 min-h-10"
                  onChange={(event) => onUpdate(mission.id, { title: event.target.value })}
                />
                <button
                  type="button"
                  className="flex size-10 shrink-0 items-center justify-center rounded-sm text-muted hover:bg-surface hover:text-fg disabled:opacity-30"
                  aria-label="Move mission up"
                  disabled={index === 0}
                  onClick={() => onMove(mission.id, -1)}
                >
                  <ChevronUp className="size-4" />
                </button>
                <button
                  type="button"
                  className="flex size-10 shrink-0 items-center justify-center rounded-sm text-muted hover:bg-surface hover:text-fg disabled:opacity-30"
                  aria-label="Move mission down"
                  disabled={index === missions.length - 1}
                  onClick={() => onMove(mission.id, 1)}
                >
                  <ChevronDown className="size-4" />
                </button>
                <button
                  type="button"
                  className="flex size-10 shrink-0 items-center justify-center rounded-sm text-muted hover:bg-surface hover:text-ember disabled:opacity-30"
                  aria-label={`Remove ${mission.title || "mission"}`}
                  disabled={missions.length <= 1}
                  onClick={() => onRemove(mission.id)}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <Input
                aria-label="Mission brief"
                value={mission.brief}
                maxLength={80}
                placeholder="One-liner"
                className="mt-1 h-9 min-h-9"
                onChange={(event) => onUpdate(mission.id, { brief: event.target.value })}
              />
              <div className="mt-1 flex flex-wrap items-center gap-1">
                <div className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-1 rounded-md bg-surface px-2 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_10%,transparent)]">
                  <span className="font-display text-xs font-semibold uppercase tracking-kicker text-muted">
                    {active ? "Timer" : "Length"}
                  </span>
                  <div className="flex items-center">
                    {active ? (
                      <span className="px-2 font-display text-lg font-semibold tabular-nums text-fg">
                        {formatMmSs(remaining)}
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="flex size-9 items-center justify-center rounded-sm text-fg hover:bg-well disabled:opacity-40"
                          aria-label={`Decrease ${mission.title || "mission"} length`}
                          disabled={mission.seconds <= MISSION_LENGTH_MIN}
                          onClick={() =>
                            onUpdate(mission.id, {
                              seconds: mission.seconds - MISSION_LENGTH_STEP,
                            })
                          }
                        >
                          <Minus className="size-4" />
                        </button>
                        <span className="w-10 text-center font-display text-base font-semibold tabular-nums">
                          {mission.seconds}
                        </span>
                        <button
                          type="button"
                          className="flex size-9 items-center justify-center rounded-sm text-fg hover:bg-well disabled:opacity-40"
                          aria-label={`Increase ${mission.title || "mission"} length`}
                          disabled={mission.seconds >= MISSION_LENGTH_MAX}
                          onClick={() =>
                            onUpdate(mission.id, {
                              seconds: mission.seconds + MISSION_LENGTH_STEP,
                            })
                          }
                        >
                          <Plus className="size-4" />
                        </button>
                        <span className="w-5 font-display text-xs uppercase tracking-wider text-muted">
                          s
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <span className="w-12 shrink-0 text-right font-display text-xs tabular-nums text-olive">
                  +{missionXp}
                </span>
                {running ? (
                  <Button
                    type="button"
                    size="compact"
                    variant="secondary"
                    className="shrink-0"
                    onClick={() => onPause(mission.id)}
                  >
                    <Pause />
                    Pause
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="compact"
                    className="shrink-0"
                    disabled={running || atLiveCap}
                    onClick={() => onStart(mission.id)}
                  >
                    <Play />
                    {paused ? "Resume" : "Start"}
                  </Button>
                )}
                <Button
                  type="button"
                  size="compact"
                  variant={done ? "secondary" : "ember"}
                  className="shrink-0"
                  disabled={done}
                  onClick={() => onComplete(mission.id)}
                >
                  <Check />
                  {done ? "Completed" : "Complete"}
                </Button>
              </div>
            </li>
          );
        })}
      </ol>

      <Button
        type="button"
        variant="ghost"
        className="mt-2 w-full"
        disabled={missions.length >= MAX_MISSIONS}
        onClick={onAdd}
      >
        <Plus />
        Add mission
      </Button>
    </section>
  );
}
