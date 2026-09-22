# Questodoro

One-screen gamified Pomodoro focus board. Work earns XP. Missions are on demand. Oorah.

Built for Hackyard Yard #3 (theme: **One Screen**). No routes, no tabs, no second page.

**Repo:** [github.com/wyldephyre/questodoro](https://github.com/wyldephyre/questodoro)

## What it does

- 25 / 5 timer on the board (change work and break lengths in place)
- Start, Pause, Reset on the same screen
- Finish a **work** block → XP, level, daily streak, personal high score. Rest starts on the work clock.
- Missions are **on demand** and independent of the work clock. Each has its own Start / Pause / Complete. Live missions show under the work ring.
- Side missions run on their own clocks (max 3 at once). Complete pays scaled XP (2–20, about 1 per 5 seconds), capped at 100 side XP per day.
- **Bribe shelf**: type a reward, pick an unlock rule (level, day streak, or check-ins in a row), stamp CLAIMED yourself.
- Local XP / missions / rewards live in `localStorage` (works offline)
- Optional nick + **Post Score** to a shared field board (no accounts)

## Rules (also printed on the board)

| Rule | How it counts |
| --- | --- |
| Work XP | 4 XP per minute of the finished work block (minimum 4) |
| Side XP | Scaled from the mission length (2–20). Ceiling 100 side XP per day |
| Level | `1 + floor(total XP / 200)` |
| Day streak | Consecutive local days with at least one finished work block |
| Mission streak | Consecutive check-ins in a row (skip resets it) |
| High score | Most XP earned in a **single day** |

Posting sends **nick + high score** only.

## Demo (stranger, one screen)

1. Open the live URL.
2. Hit **Drill 15s** (optional — 15s work / 20s break).
3. **Start**. When the work block ends, XP / level / streak / high score update.
4. When the work block ends, XP updates and rest starts. Side missions keep running on their own clocks.
5. Edit missions and bribes on the right. They survive refresh.
6. Enter a nick. **Post score** to the field board.

## Run locally

```bash
npm install
npm run dev
```

Dev server: `http://localhost:8080`.

```bash
npm run build
npm run typecheck
```

## Deploy

Vercel (TanStack Start / Vite). Set `DATABASE_URL` to a Postgres instance so the shared field board persists. Without it, local score still works; posting may no-op.

## Out of scope

Accounts, OAuth, chat, extra pages, native apps, voice, stickers, calendars.
