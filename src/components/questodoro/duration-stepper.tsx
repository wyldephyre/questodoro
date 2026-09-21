import { Minus, Plus } from "lucide-react";
import { secondsToMinutesLabel } from "@/lib/questodoro/rules";
import { cn } from "@/lib/utils";

export function DurationStepper({
  label,
  seconds,
  onMinutes,
  disabled,
  maxMinutes,
  compact,
}: {
  label: string;
  seconds: number;
  onMinutes: (minutes: number) => void;
  disabled: boolean;
  maxMinutes: number;
  compact?: boolean;
}) {
  const display = secondsToMinutesLabel(seconds);
  const minutes = seconds < 60 ? 0 : Math.max(1, Math.round(seconds / 60));
  return (
    <div
      className={cn(
        "flex min-h-11 items-center justify-between gap-2 rounded-md px-2",
        compact
          ? "bg-surface shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_10%,transparent)]"
          : "bg-well px-3 shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_10%,transparent)]",
      )}
    >
      <span className="font-display text-xs font-semibold uppercase tracking-kicker text-muted">
        {label}
      </span>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          className={cn(
            "flex items-center justify-center rounded-sm text-fg hover:bg-well disabled:opacity-40",
            compact ? "size-9" : "size-10 hover:bg-surface",
          )}
          aria-label={`Decrease ${label}`}
          disabled={disabled || minutes <= 1}
          onClick={() => onMinutes(minutes - 1)}
        >
          <Minus className="size-4" />
        </button>
        <span
          className={cn(
            "text-center font-display font-semibold tabular-nums",
            compact ? "w-8 text-base" : "w-10 text-lg",
          )}
        >
          {display}
        </span>
        <button
          type="button"
          className={cn(
            "flex items-center justify-center rounded-sm text-fg hover:bg-well disabled:opacity-40",
            compact ? "size-9" : "size-10 hover:bg-surface",
          )}
          aria-label={`Increase ${label}`}
          disabled={disabled || minutes >= maxMinutes}
          onClick={() => onMinutes(Math.max(1, minutes) + 1)}
        >
          <Plus className="size-4" />
        </button>
        <span className="w-7 font-display text-xs uppercase tracking-wider text-muted">
          {seconds < 60 ? "s" : "min"}
        </span>
      </div>
    </div>
  );
}
