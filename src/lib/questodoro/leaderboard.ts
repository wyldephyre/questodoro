import { createServerFn } from "@tanstack/react-start";

export type BoardRow = {
  nick: string;
  score: number;
  postedAt: string;
};

const NICK_RE = /^[A-Za-z0-9][A-Za-z0-9 _.-]{1,15}$/;

function parsePost(input: unknown) {
  const raw = (input ?? {}) as { nick?: unknown; score?: unknown };
  const nick = String(raw.nick ?? "").trim();
  if (!NICK_RE.test(nick)) {
    throw new Error("Nick must be 2–16 letters, numbers, spaces, or _-.");
  }
  const score = Number(raw.score);
  if (!Number.isInteger(score) || score < 1 || score > 1_000_000) {
    throw new Error("Score must be a whole number from 1 to 1,000,000.");
  }
  return { nick, score };
}

export const getLeaderboard = createServerFn({ method: "GET" }).handler(
  async (): Promise<BoardRow[]> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ nick: string; score: number; posted_at: string }>`
      select nick, score, posted_at::text as posted_at
      from leaderboard
      order by score desc, posted_at asc
      limit 10
    `;
    return rows.map((row) => ({
      nick: row.nick,
      score: Number(row.score),
      postedAt: row.posted_at,
    }));
  },
);

export const postScore = createServerFn({ method: "POST" })
  .validator(parsePost)
  .handler(async ({ data }): Promise<BoardRow[]> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const nickKey = data.nick.toLowerCase();
    await sql`
      insert into leaderboard (nick, nick_key, score)
      values (${data.nick}, ${nickKey}, ${data.score})
      on conflict (nick_key) do update
        set nick = excluded.nick,
            score = greatest(leaderboard.score, excluded.score),
            posted_at = case
              when excluded.score >= leaderboard.score then now()
              else leaderboard.posted_at
            end
    `;
    const rows = await sql<{ nick: string; score: number; posted_at: string }>`
      select nick, score, posted_at::text as posted_at
      from leaderboard
      order by score desc, posted_at asc
      limit 10
    `;
    return rows.map((row) => ({
      nick: row.nick,
      score: Number(row.score),
      postedAt: row.posted_at,
    }));
  });
