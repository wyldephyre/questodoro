import { formatMmSs } from "@/lib/utils";
import type { Phase, RunState } from "@/lib/questodoro/store";

type TimerRingProps = {
  remainingMs: number;
  totalMs: number;
  phase: Phase;
  runState: RunState;
};

const SIZE = 240;
const CX = 120;
const CY = 120;
const R = 98;
const CIRC = 2 * Math.PI * R;

export function TimerRing({
  remainingMs,
  totalMs,
  phase,
  runState,
}: TimerRingProps) {
  const safeTotal = Math.max(1, totalMs);
  const progress = Math.min(1, Math.max(0, remainingMs / safeTotal));
  const offset = CIRC * (1 - progress);
  const running = runState === "running";
  const onBreak = phase === "break";
  const label =
    phase === "break" ? "BREAK" : phase === "work" || running ? "WORK" : "STAND BY";
  const status =
    runState === "paused" ? "Paused" : running ? "Counting" : "Ready";

  return (
    <div className="relative mx-auto aspect-square w-full max-w-80 2xl:max-w-[22rem]">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="size-full"
        role="img"
        aria-label={`${label} ${formatMmSs(remainingMs)} remaining`}
      >
        <circle
          cx={CX}
          cy={CY}
          r={R}
          className="fill-none stroke-border"
          strokeWidth="10"
        />
        <circle
          cx={CX}
          cy={CY}
          r={R}
          className={onBreak ? "stroke-ember" : "stroke-olive"}
          fill="none"
          strokeWidth="10"
          strokeLinecap="butt"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${CX} ${CY})`}
          style={{
            transition: running
              ? "stroke-dashoffset 200ms linear"
              : "stroke-dashoffset var(--motion-fast) var(--ease-out)",
          }}
        />
        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
          const inner = i % 3 === 0 ? 86 : 90;
          const outer = 104;
          const x1 = Number((CX + Math.cos(angle) * inner).toFixed(2));
          const y1 = Number((CY + Math.sin(angle) * inner).toFixed(2));
          const x2 = Number((CX + Math.cos(angle) * outer).toFixed(2));
          const y2 = Number((CY + Math.sin(angle) * outer).toFixed(2));
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              className="stroke-muted"
              strokeWidth={i % 3 === 0 ? 2 : 1}
              opacity={0.55}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <p className="font-display text-xs font-semibold uppercase tracking-kicker text-muted">
          {label}
        </p>
        <p className="font-display text-6xl font-semibold leading-none tracking-tight text-fg tabular-nums 2xl:text-7xl">
          {formatMmSs(remainingMs)}
        </p>
        <p className="font-display text-xs uppercase tracking-wider text-muted">
          {status}
        </p>
      </div>
    </div>
  );
}
