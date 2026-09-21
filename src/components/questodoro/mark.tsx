export function PhyreMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <rect
        x="3"
        y="3"
        width="42"
        height="42"
        className="stroke-border"
        strokeWidth="1.5"
      />
      <path
        d="M24 8 L36 28 H28 L32 40 H16 L20 28 H12 Z"
        className="fill-olive"
      />
      <path d="M24 14 L30 26 H26 L28 34 H20 L22 26 H18 Z" className="fill-bg" />
    </svg>
  );
}
