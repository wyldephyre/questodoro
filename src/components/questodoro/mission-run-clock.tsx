import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { xpForMission, type Mission } from "@/lib/questodoro/missions";
import type { MissionRun } from "@/lib/questodoro/store";
import { formatMmSs } from "@/lib/utils";

export function MissionRunClock({
  mission,
  run,
  onPause,
  onResume,
}: {
  mission: Mission | null;
  run: MissionRun;
  onPause: () => void;
  onResume: () => void;
}) {
  const pct = Math.max(0, Math.min(100, (run.remainingMs / Math.max(1, run.totalMs)) * 100));
  const running = run.runState === "running";
  const xp = mission ? xpForMission(mission.seconds) : 0;
  return (
    <div className="w-full rounded-lg bg-well p-3 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-ember)_45%,transparent)]">
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-xs font-semibold uppercase tracking-kicker text-ember">
          Side{mission ? ` · ${mission.title}` : ""}
        </p>
        <p className="font-display text-xs uppercase tracking-wider text-muted">
          {running ? "Counting" : "Held"}
          {xp > 0 ? ` · +${xp}` : ""}
        </p>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <p className="font-display text-4xl font-semibold leading-none tabular-nums text-fg">
          {formatMmSs(run.remainingMs)}
        </p>
        {running ? (
          <Button type="button" variant="secondary" size="compact" onClick={onPause}>
            <Pause />
            Pause
          </Button>
        ) : (
          <Button type="button" variant="ember" size="compact" onClick={onResume}>
            <Play />
            Resume
          </Button>
        )}
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface">
        <div
          className="h-full rounded-full bg-ember transition-[width] duration-200 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
