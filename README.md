# Questodoro

One-screen gamified Pomodoro focus board. Work earns XP. Breaks drop the eyes, not the mission. Oorah.

Built for Hackyard Yard #3 (theme: **One Screen**). No routes, no tabs, no second page.

## What it does

- 25 / 5 timer on the board (change work and break lengths in place)
- Start, Pause, Reset on the same screen
- Finish a **work** block → XP, level, daily streak, personal high score
- Break shows a 20-20-20 eye-drop nudge (never “quit working”)
- Local XP / level / streak / high score live in `localStorage` (works offline)
- Optional nick + **Post Score** to a shared field board (no accounts)

## Rules (also printed on the board)

| Rule | How it counts |
| --- | --- |
| XP | 4 XP per minute of the finished work block (minimum 4) |
| Level | `1 + floor(total XP / 200)` |
| Streak | Consecutive local days with at least one finished work block |
| High score | Most XP earned in a **single day** |

Posting sends **nick + high score** only.

## Demo (stranger, one screen)

1. Open the live URL.
2. Hit **Drill 15s** (optional — shortens the work block for a live demo).
3. **Start**. When the work block ends, XP / level / streak / high score update in place.
4. Enter a nick. **Post score** to the field board.

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

Accounts, OAuth, chat, extra pages, native apps.
