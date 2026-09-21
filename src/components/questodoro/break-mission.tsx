import {
  CupSoda,
  Droplets,
  PencilLine,
  PersonStanding,
  ScanEye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MISSION_XP, type BreakMission, type Mission } from "@/lib/questodoro/missions";
import { cn } from "@/lib/utils";

function MissionIcon({ mission }: { mission: Mission }) {
  const hay = `${mission.id} ${mission.title}`.toLowerCase();
  const Icon = hay.includes("drop")
    ? Droplets
    : hay.includes("stretch")
      ? PersonStanding
      : hay.includes("water") || hay.includes("drink")
        ? CupSoda
        : hay.includes("focus") || hay.includes("far")
          ? ScanEye
          : PencilLine;
  return <Icon className="mt-0.5 size-5 shrink-0 text-ember" />;
}

export function BreakMissionCard({
  mission,
  status,
  awaiting,
  onCheckIn,
  onSkip,
}: {
  mission: Mission | null;
  status: BreakMission["status"] | null;
  awaiting: boolean;
  onCheckIn: () => void;
  onSkip: () => void;
}) {
  const pending = status === "pending" || (awaiting && status !== "done" && status !== "skipped");
  const done = status === "done";
  const skipped = status === "skipped";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg bg-well p-3",
        done
          ? "shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-olive)_45%,transparent)]"
          : "shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-ember)_35%,transparent)]",
      )}
    >
      <div className="flex items-start gap-3">
        {mission ? <MissionIcon mission={mission} /> : <ScanEye className="mt-0.5 size-5 shrink-0 text-ember" />}
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-semibold uppercase tracking-wider text-fg">
            {done
              ? "Mission complete"
              : skipped
                ? "Mission skipped"
                : mission
                  ? `Break mission · ${mission.title}`
                  : "Break rest"}
          </p>
          <p className="mt-1 text-sm leading-normal text-muted">
            {done
              ? `+${MISSION_XP} XP banked. Eyes off the glass, then back on the line.`
              : skipped
                ? "No mission XP. Rest still counts. Then get back on the line."
                : mission
                  ? `${mission.brief} · ${mission.seconds}s. Check in when it’s done.`
                  : "Check in to start the rest. Drop the glass, not the mission."}
          </p>
        </div>
      </div>

      {pending ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button
            type="button"
            variant="ember"
            size="lg"
            className="check-in-pulse sm:col-span-2"
            onClick={onCheckIn}
          >
            <ScanEye />
            Check in · +{MISSION_XP} XP
          </Button>
          <Button type="button" variant="ghost" size="lg" onClick={onSkip}>
            Skip
          </Button>
        </div>
      ) : null}
    </div>
  );
}
