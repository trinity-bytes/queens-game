-- ============================================================================
-- Leaderboard rebuild.
--
-- Supersedes the previous supabase_cleanup.sql and supabase_win_id_unique.sql.
--
-- Starting point, as reported by 00_inspect.sql: RLS was disabled and both
-- `anon` and `authenticated` held INSERT, UPDATE, DELETE and TRUNCATE on the
-- table. The only constraint was the primary key, there was no cleanup trigger,
-- and the table was not published to Realtime.
--
-- What changes:
--   * RLS on, and anon keeps SELECT only. UPDATE, DELETE and TRUNCATE go away.
--   * The client can no longer INSERT directly. All writes go through the
--     submit_score() function, which validates every field server-side.
--   * Telemetry (user agent, device type) moves to a private table that anon
--     cannot read, so it can never leak through SELECT or Realtime.
--   * Plausibility limits derived from the game engine become CHECK constraints.
--   * The top-100 cleanup trigger is installed for the first time, as
--     SECURITY DEFINER with a pinned search_path.
--   * The table is published to Realtime, so the live subscription in
--     Leaderboard.tsx starts working.
--   * The ranking query gets a covering index.
--   * `hints_used` is dropped: no source file has ever referenced it.
--
-- Existing rows are preserved: the old table is renamed to leaderboard_legacy
-- and its rows are copied in, clamped to the new constraints. Nothing is
-- dropped. Once the app is verified, leaderboard_legacy can be dropped by hand.
--
-- Run once in the Supabase SQL editor, AFTER 00_inspect.sql.
-- ============================================================================

begin;

-- ── 1. Retire the old objects ───────────────────────────────────────────────

-- Drop the old cleanup trigger wherever it currently lives.
do $$
begin
  if to_regclass('public.leaderboard') is not null then
    execute 'drop trigger if exists trigger_cleanup_leaderboard on public.leaderboard';
  end if;
end $$;

drop function if exists public.cleanup_leaderboard();

-- Rename the existing table out of the way, but only once: a second run must
-- not clobber a legacy table that already holds the original rows.
do $$
begin
  if to_regclass('public.leaderboard') is not null
     and to_regclass('public.leaderboard_legacy') is null then
    execute 'alter table public.leaderboard rename to leaderboard_legacy';

    -- A renamed table keeps its indexes, and index names are unique per schema
    -- rather than per table. Left in place, `leaderboard_win_id_unique` would
    -- make the CREATE INDEX IF NOT EXISTS below match on name and skip
    -- silently, leaving submit_score()'s ON CONFLICT with nothing to infer.
    if to_regclass('public.leaderboard_win_id_unique') is not null then
      execute 'alter index public.leaderboard_win_id_unique '
              'rename to leaderboard_legacy_win_id_unique';
    end if;
  end if;
end $$;

-- ── 2. Public leaderboard: only what the UI renders ─────────────────────────

create table if not exists public.leaderboard (
  id          uuid        primary key default gen_random_uuid(),
  win_id      text        not null,
  player_name text        not null,
  score       integer     not null,
  time_ms     integer     not null,
  mistakes    integer     not null default 0,
  -- Nullable on purpose: rows that predate move tracking carry no real value,
  -- and "unknown" is more honest than a fabricated one. New rows always set it.
  moves_count integer,
  grid_size   smallint    not null default 9,
  theme_used  text        not null,
  locale      text        not null default 'es',
  created_at  timestamptz not null default now(),

  -- The input field caps at 15 characters; enforce it where it counts.
  constraint leaderboard_name_len check (char_length(player_name) between 1 and 15),

  -- Scoring ceiling of the engine: combo caps at 5 and speedBonus at 1000, so
  -- 9 queens top out near 52.5k, plus a 10% final bonus. 60000 is unreachable.
  constraint leaderboard_score_range check (score between 0 and 60000),

  -- tickTimer only ever advances the clock in whole 1000ms steps.
  constraint leaderboard_time_range check (
    time_ms > 0 and time_ms <= 3600000 and time_ms % 1000 = 0
  ),

  constraint leaderboard_grid_range check (grid_size between 4 and 12),

  constraint leaderboard_moves_range check (
    moves_count is null or moves_count between grid_size and 5000
  ),
  constraint leaderboard_mistakes_ok check (
    mistakes >= 0 and (moves_count is null or mistakes <= moves_count)
  ),

  constraint leaderboard_win_id_len check (char_length(win_id) between 5 and 64)
);

-- Idempotency for score submission: one row per won game.
create unique index if not exists leaderboard_win_id_unique
  on public.leaderboard (win_id);

-- The ranking query is `where grid_size = ? order by score desc, time_ms asc`.
create index if not exists leaderboard_ranking_idx
  on public.leaderboard (grid_size, score desc, time_ms asc);

-- ── 3. Telemetry: private, never readable by the client ────────────────────

create table if not exists public.leaderboard_telemetry (
  entry_id          uuid primary key
                      references public.leaderboard(id) on delete cascade,
  user_agent        text,
  device_type       text,
  device_local_time timestamptz,
  app_version       text
);

-- ── 4. Carry the old rows over ─────────────────────────────────────────────

-- Values are clamped rather than filtered so no score is silently lost.
-- Legacy ids are not reused: the column type may differ from uuid.
do $$
begin
  if to_regclass('public.leaderboard_legacy') is not null
     and not exists (select 1 from public.leaderboard) then
    insert into public.leaderboard (
      win_id, player_name, score, time_ms, mistakes,
      moves_count, grid_size, theme_used, locale, created_at
    )
    select
      src.win_id,
      src.player_name,
      src.score,
      src.time_ms,
      -- A run cannot contain more mistakes than it contains moves.
      least(src.mistakes, coalesce(src.moves_count, src.mistakes)),
      src.moves_count,
      9,
      src.theme_used,
      src.locale,
      src.created_at
    from (
      select
        -- Reuse the original win id when it is usable, so idempotency still
        -- means something for rows that were submitted twice long ago.
        case
          when char_length(coalesce(trim(l.win_id), '')) between 5 and 64
            then trim(l.win_id)
          else 'legacy-' || gen_random_uuid()::text
        end                                                  as win_id,
        left(nullif(trim(l.player_name), ''), 15)             as player_name,
        least(60000, greatest(0, coalesce(l.score, 0)))       as score,
        least(3600000,
              greatest(1000, (coalesce(l.time_ms, 1000) / 1000) * 1000))
                                                             as time_ms,
        greatest(0, coalesce(l.mistakes, 0))                 as mistakes,
        -- moves_count defaulted to 0 before the counter shipped. That is
        -- "not recorded", not "zero moves" — keep it null.
        case
          when coalesce(l.moves_count, 0) >= 9 then least(5000, l.moves_count)
        end                                                  as moves_count,
        coalesce(nullif(trim(l.theme_used), ''), 'elephant')  as theme_used,
        coalesce(nullif(trim(l.locale), ''), 'es')            as locale,
        coalesce(l.created_at, now())                         as created_at
      from public.leaderboard_legacy l
      where nullif(trim(l.player_name), '') is not null
    ) src;
  end if;
end $$;

-- The legacy table still holds the original user agents, and it kept the
-- permissive grants it was created with. Close it before moving on.
do $$
begin
  if to_regclass('public.leaderboard_legacy') is not null then
    execute 'alter table public.leaderboard_legacy enable row level security';
    execute 'revoke all on public.leaderboard_legacy from anon, authenticated';
  end if;
end $$;

-- ── 5. Lock down access ────────────────────────────────────────────────────

alter table public.leaderboard           enable row level security;
alter table public.leaderboard_telemetry enable row level security;

revoke all on public.leaderboard           from anon, authenticated;
revoke all on public.leaderboard_telemetry from anon, authenticated;

-- Reading is open: every column on this table is already public by design.
grant select on public.leaderboard to anon, authenticated;

create policy leaderboard_public_read on public.leaderboard
  for select to anon, authenticated
  using (true);

-- No policy on leaderboard_telemetry: with RLS on and no policy, the client
-- reads nothing. Only SECURITY DEFINER functions can touch it.

-- ── 6. Top-100 cleanup, fixed ──────────────────────────────────────────────

create or replace function public.cleanup_leaderboard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.leaderboard
  where id not in (
    select id
    from public.leaderboard
    order by score desc, time_ms asc
    limit 100
  );
  -- AFTER ... FOR EACH STATEMENT: the return value is ignored.
  return null;
end;
$$;

create trigger trigger_cleanup_leaderboard
after insert on public.leaderboard
for each statement
execute function public.cleanup_leaderboard();

-- Postgres grants EXECUTE to PUBLIC on every new function. Postgres refuses to
-- invoke a trigger function from plain SQL, so this is not exploitable — but a
-- SECURITY DEFINER function has no business sitting on the client's callable
-- surface at all. Take it back.
revoke all on function public.cleanup_leaderboard()
  from public, anon, authenticated;

-- ── 7. The only way to write a score ───────────────────────────────────────

create or replace function public.submit_score(
  p_win_id      text,
  p_player_name text,
  p_score       integer,
  p_time_ms     integer,
  p_mistakes    integer,
  p_moves_count integer,
  p_theme_used  text,
  p_locale      text,
  p_user_agent  text default null,
  p_device_type text default null,
  p_app_version text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text := left(trim(coalesce(p_player_name, '')), 15);
  v_id   uuid;
begin
  if char_length(v_name) < 1 then
    raise exception 'invalid player name';
  end if;

  if char_length(coalesce(p_win_id, '')) not between 5 and 64 then
    raise exception 'invalid win id';
  end if;

  -- The clock only moves in whole seconds, so anything else was hand-made.
  if p_time_ms is null or p_time_ms <= 0
     or p_time_ms > 3600000 or p_time_ms % 1000 <> 0 then
    raise exception 'invalid time';
  end if;

  if p_moves_count is null or p_moves_count < 9 or p_moves_count > 5000 then
    raise exception 'invalid move count';
  end if;

  if p_mistakes is null or p_mistakes < 0 or p_mistakes > p_moves_count then
    raise exception 'invalid mistake count';
  end if;

  if p_score is null or p_score < 0 or p_score > 60000 then
    raise exception 'invalid score';
  end if;

  -- tickTimer drains points every second, so a high score and a long game are
  -- mutually exclusive. This is deliberately loose: it rejects the impossible,
  -- not the merely impressive.
  if p_score > greatest(0, 60000 - (p_time_ms / 1000) * 50) then
    raise exception 'score inconsistent with elapsed time';
  end if;

  -- Crude global flood guard. There is no per-user identity to key on here.
  if (select count(*) from public.leaderboard
      where created_at > now() - interval '1 minute') > 20 then
    raise exception 'too many submissions, try again shortly';
  end if;

  insert into public.leaderboard (
    win_id, player_name, score, time_ms, mistakes,
    moves_count, grid_size, theme_used, locale, created_at
  )
  values (
    p_win_id, v_name, p_score, p_time_ms, p_mistakes,
    p_moves_count, 9,
    coalesce(nullif(trim(p_theme_used), ''), 'elephant'),
    coalesce(nullif(trim(p_locale), ''), 'es'),
    now()  -- never the client's clock
  )
  on conflict (win_id) do nothing
  returning id into v_id;

  -- Replayed submission: hand back the row that already won the race.
  if v_id is null then
    select id into v_id from public.leaderboard where win_id = p_win_id;
    return v_id;
  end if;

  insert into public.leaderboard_telemetry (
    entry_id, user_agent, device_type, device_local_time, app_version
  )
  values (
    v_id, left(p_user_agent, 512), left(p_device_type, 16), now(),
    left(p_app_version, 16)
  )
  on conflict (entry_id) do nothing;

  return v_id;
end;
$$;

revoke all on function public.submit_score(
  text, text, integer, integer, integer, integer, text, text, text, text, text
) from public;

grant execute on function public.submit_score(
  text, text, integer, integer, integer, integer, text, text, text, text, text
) to anon, authenticated;

-- ── 8. Realtime ────────────────────────────────────────────────────────────

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'leaderboard'
  ) then
    execute 'alter publication supabase_realtime add table public.leaderboard';
  end if;
end $$;

commit;

-- After verifying the app against the new schema:
--   drop table public.leaderboard_legacy;
