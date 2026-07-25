-- ============================================================================
-- Fix: the unique index on leaderboard.win_id was never actually created.
--
-- 01_rebuild_leaderboard.sql renames the original table to leaderboard_legacy.
-- A renamed table keeps its indexes, including `leaderboard_win_id_unique`.
-- Index names are unique per schema, not per table, so the later
--
--   create unique index if not exists leaderboard_win_id_unique
--     on public.leaderboard (win_id);
--
-- found that name already in use, matched on the NAME rather than the
-- definition, and silently did nothing. The post-migration inventory shows it:
--   CREATE UNIQUE INDEX leaderboard_win_id_unique ON public.leaderboard_legacy
--
-- Consequence: submit_score() ends in `on conflict (win_id) do nothing`, and
-- ON CONFLICT with an explicit target requires a matching unique index to infer
-- from. Without it every call fails with:
--   "there is no unique or exclusion constraint matching the ON CONFLICT
--    specification"
--
-- Run once in the Supabase SQL editor, after 01_rebuild_leaderboard.sql.
-- ============================================================================

begin;

-- Move the legacy index off the name it is squatting on.
do $$
begin
  if to_regclass('public.leaderboard_win_id_unique') is not null then
    execute 'alter index public.leaderboard_win_id_unique '
            'rename to leaderboard_legacy_win_id_unique';
  end if;
end $$;

-- Create it where it was always meant to go.
--
-- Deliberately NOT partial. The legacy version was `where win_id is not null`
-- because the column was nullable there; here win_id is NOT NULL, and ON
-- CONFLICT cannot infer a partial index unless the query repeats its predicate.
create unique index if not exists leaderboard_win_id_unique
  on public.leaderboard (win_id);

commit;
