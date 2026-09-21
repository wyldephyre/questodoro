-- Community field board. Unowned rows: nick is a public handle, not an account.
create table if not exists leaderboard (
  id         serial primary key,
  nick       text not null,
  nick_key   text not null unique,
  score      integer not null check (score >= 0 and score <= 1000000),
  posted_at  timestamptz not null default now()
);

create index if not exists leaderboard_score_idx
  on leaderboard (score desc, posted_at asc);
