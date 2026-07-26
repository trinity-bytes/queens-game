-- Difficulty-aware scoring.
--
-- The old engine paid for speed, so this schema assumed a long game and a
-- high score were mutually exclusive:
--
--   if p_score > greatest(0, 60000 - (p_time_ms / 1000) * 50) then ...
--
-- That ceiling reaches zero at twenty minutes, which means a genuinely hard
-- puzzle solved slowly could not be saved at all — the win was simply
-- rejected. It is the same speed-equals-skill assumption the client just shed,
-- and it has to go with it, or every hard win starts failing to save.
--
-- What replaces it is stricter, not looser. The client now derives a score
-- from two things the server can see: the puzzle's difficulty band and the
-- number of wrong queens. So the exact value is recomputable here, and the
-- check below reproduces it instead of guessing at a bound.
--
-- Run this whole file in the Supabase SQL editor. It is idempotent.

begin;

-- 1. New columns -------------------------------------------------------------

alter table public.leaderboard
  add column if not exists difficulty_band  text,
  add column if not exists difficulty_score integer;

comment on column public.leaderboard.difficulty_band is
  'Player-facing band from the logical solver: gentle, tricky or brutal.';
comment on column public.leaderboard.difficulty_score is
  'Raw signal behind the band — lookahead deductions the puzzle required.';

-- Behavioural record of the solve. Kept beside the telemetry table rather than
-- in leaderboard, because it is research data for calibrating scoring, not
-- something the board ever displays.
create table if not exists public.leaderboard_solve_log (
  entry_id          uuid primary key
                      references public.leaderboard (id) on delete cascade,
  -- Elapsed ms at each queen placed, and whether it was right. The gaps
  -- between these describe the shape of a solve, which is the part that
  -- distinguishes deduction from luck.
  placements        jsonb  not null default '[]'::jsonb,
  x_marks_placed    integer not null default 0,
  peak_x_marks      integer not null default 0,
  -- Puzzles walked away from before this win. Without it, a player rerolling
  -- for an easy board is indistinguishable from one who solved what they got.
  puzzles_abandoned integer not null default 0
);

alter table public.leaderboard_solve_log enable row level security;

-- 2. Retire the speed-based ceiling -----------------------------------------

alter table public.leaderboard
  drop constraint if exists leaderboard_score_range;

-- 2000 points per queen at the top band multiplier of 2.4, so a 12x12 board
-- tops out at 57,600. Still a hard bound, just not a clock-driven one.
alter table public.leaderboard
  add constraint leaderboard_score_range
  check (score between 0 and 57600);

-- 3. Recompute the score instead of bounding it ------------------------------

create or replace function public.band_multiplier(p_band text)
returns numeric
language sql
immutable
as $$
  select case p_band
    when 'gentle' then 1.0
    when 'tricky' then 1.6
    when 'brutal' then 2.4
  end;
$$;

comment on function public.band_multiplier(text) is
  'Mirrors BAND_MULTIPLIER in src/store/gameStore.ts. Change both together.';

commit;

-- 4. Writer ------------------------------------------------------------------
--
-- submit_score stays the only writer. The signature gains the difficulty and
-- the solve log; the time-versus-score check is replaced by an exact
-- recomputation of what the client claimed.
--
-- The old signature is dropped rather than replaced: create or replace with
-- different parameters would leave an overload behind, and an old client
-- could keep reaching the version with the speed ceiling still in it.

drop function if exists public.submit_score(
  text, text, integer, integer, integer, integer, text, text, text, text, text
);

create or replace function public.submit_score(
  p_win_id           text,
  p_player_name      text,
  p_score            integer,
  p_time_ms          integer,
  p_mistakes         integer,
  p_moves_count      integer,
  p_theme_used       text,
  p_locale           text,
  p_difficulty_band  text,
  p_difficulty_score integer,
  p_grid_size        smallint default 9,
  p_placements       jsonb   default '[]'::jsonb,
  p_x_marks_placed   integer default 0,
  p_peak_x_marks     integer default 0,
  p_abandoned        integer default 0,
  p_user_agent       text    default null,
  p_device_type      text    default null,
  p_app_version      text    default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name     text := left(trim(coalesce(p_player_name, '')), 15);
  v_id       uuid;
  v_value    integer;
  v_accuracy numeric;
  v_expected integer;
begin
  if v_name = '' then
    raise exception 'invalid name';
  end if;

  if p_time_ms is null or p_time_ms <= 0
     or p_time_ms > 3600000 or p_time_ms % 1000 <> 0 then
    raise exception 'invalid time';
  end if;

  if p_moves_count is null or p_moves_count < 9 or p_moves_count > 5000 then
    raise exception 'invalid move count';
  end if;

  if p_mistakes is null or p_mistakes < 0 or p_mistakes > 500 then
    raise exception 'invalid mistake count';
  end if;

  if p_grid_size is null or p_grid_size not between 4 and 12 then
    raise exception 'invalid grid size';
  end if;

  if public.band_multiplier(p_difficulty_band) is null then
    raise exception 'invalid difficulty band';
  end if;

  -- The score is a pure function of the board and the mistakes, so it is
  -- checked by recomputing it rather than by bounding it. This is the whole
  -- reason the band travels with the submission.
  v_value    := round(2000 * p_grid_size * public.band_multiplier(p_difficulty_band));
  v_accuracy := greatest(0.2, 1 - 0.08 * p_mistakes);
  v_expected := round(v_value * v_accuracy);

  if p_score is null or p_score <> v_expected then
    raise exception 'score does not match difficulty and mistakes (expected %, got %)',
      v_expected, p_score;
  end if;

  insert into public.leaderboard (
    win_id, player_name, score, time_ms, mistakes, moves_count,
    grid_size, theme_used, locale, difficulty_band, difficulty_score
  )
  values (
    p_win_id, v_name, p_score, p_time_ms, p_mistakes, p_moves_count,
    p_grid_size, p_theme_used, p_locale, p_difficulty_band, p_difficulty_score
  )
  on conflict (win_id) do nothing
  returning id into v_id;

  -- Already submitted: return the original row rather than erroring, so a
  -- double tap on Save is harmless.
  if v_id is null then
    select id into v_id from public.leaderboard where win_id = p_win_id;
    return v_id;
  end if;

  insert into public.leaderboard_telemetry (
    entry_id, user_agent, device_type, device_local_time, app_version
  )
  values (v_id, p_user_agent, p_device_type, now(), p_app_version);

  insert into public.leaderboard_solve_log (
    entry_id, placements, x_marks_placed, peak_x_marks, puzzles_abandoned
  )
  values (
    v_id, coalesce(p_placements, '[]'::jsonb),
    greatest(0, coalesce(p_x_marks_placed, 0)),
    greatest(0, coalesce(p_peak_x_marks, 0)),
    greatest(0, coalesce(p_abandoned, 0))
  );

  return v_id;
end;
$$;

-- Same grant shape as before: anon may call the writer, never touch the tables.
revoke all on function public.submit_score from public;
grant execute on function public.submit_score to anon, authenticated;
