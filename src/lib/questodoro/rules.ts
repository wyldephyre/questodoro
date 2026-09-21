export const WORK_DEFAULT_SECONDS = 25 * 60;
export const BREAK_DEFAULT_SECONDS = 5 * 60;
export const WORK_MIN_SECONDS = 60;
export const WORK_MAX_SECONDS = 90 * 60;
export const BREAK_MIN_SECONDS = 60;
export const BREAK_MAX_SECONDS = 30 * 60;
export const DRILL_WORK_SECONDS = 15;
export const DRILL_BREAK_SECONDS = 20;

/** 4 XP per minute of the work block. Every finished block pays at least 4. */
export const XP_PER_MINUTE = 4;
export const XP_PER_BLOCK_MIN = 4;
/** Level 1 starts at 0 XP. Every 200 XP raises rank by one. */
export const XP_PER_LEVEL = 200;

export function xpForWork(workSeconds: number) {
  const minutes = Math.max(1, Math.ceil(workSeconds / 60));
  return Math.max(XP_PER_BLOCK_MIN, XP_PER_MINUTE * minutes);
}

export function rankFromXp(totalXp: number) {
  const safe = Math.max(0, Math.floor(totalXp));
  const level = Math.floor(safe / XP_PER_LEVEL) + 1;
  const intoLevel = safe % XP_PER_LEVEL;
  return {
    level,
    intoLevel,
    xpPerLevel: XP_PER_LEVEL,
    toNext: XP_PER_LEVEL - intoLevel,
  };
}

export function clampWorkSeconds(seconds: number) {
  if (seconds === DRILL_WORK_SECONDS) return DRILL_WORK_SECONDS;
  return Math.min(WORK_MAX_SECONDS, Math.max(WORK_MIN_SECONDS, Math.round(seconds)));
}

export function clampBreakSeconds(seconds: number) {
  if (seconds === DRILL_BREAK_SECONDS) return DRILL_BREAK_SECONDS;
  return Math.min(BREAK_MAX_SECONDS, Math.max(BREAK_MIN_SECONDS, Math.round(seconds)));
}

export function secondsToMinutesLabel(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.round(seconds / 60);
  return `${mins}`;
}
