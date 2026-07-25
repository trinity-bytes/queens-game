-- ============================================================================
-- Read-only inventory of the current leaderboard setup.
--
-- Run this FIRST in the Supabase SQL editor. It changes nothing; it just
-- reports what already exists so the rebuild in 01_rebuild_leaderboard.sql
-- can be reviewed against reality.
--
-- Returns a single result set: (section, detail).
-- ============================================================================

with tables as (
  select 'table' as section,
         format('%s (rls_enabled=%s)', c.relname, c.relrowsecurity) as detail
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'v', 'm')
    and c.relname like '%leaderboard%'
),

columns as (
  select 'column' as section,
         format('%s.%s : %s%s%s',
                table_name,
                column_name,
                data_type,
                case when is_nullable = 'NO' then ' NOT NULL' else '' end,
                coalesce(' DEFAULT ' || column_default, '')) as detail
  from information_schema.columns
  where table_schema = 'public'
    and table_name like '%leaderboard%'
),

constraints as (
  select 'constraint' as section,
         format('%s : %s', c.conname, pg_get_constraintdef(c.oid)) as detail
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname like '%leaderboard%'
),

indexes as (
  select 'index' as section,
         indexdef as detail
  from pg_indexes
  where schemaname = 'public'
    and tablename like '%leaderboard%'
),

policies as (
  select 'policy' as section,
         format('%s on %s | cmd=%s | roles=%s | using=%s | check=%s',
                policyname, tablename, cmd, roles::text,
                coalesce(qual, '-'), coalesce(with_check, '-')) as detail
  from pg_policies
  where schemaname = 'public'
    and tablename like '%leaderboard%'
),

triggers as (
  select 'trigger' as section,
         pg_get_triggerdef(tg.oid) as detail
  from pg_trigger tg
  join pg_class t on t.oid = tg.tgrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and not tg.tgisinternal
    and t.relname like '%leaderboard%'
),

functions as (
  select 'function' as section,
         format('%s | security_definer=%s | search_path=%s',
                p.proname,
                p.prosecdef,
                coalesce(array_to_string(p.proconfig, ', '), 'NOT SET')) as detail
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
),

function_grants as (
  select 'function_grant' as section,
         format('%s -> %s on %s()', grantee, privilege_type, routine_name) as detail
  from information_schema.routine_privileges
  where routine_schema = 'public'
    and grantee in ('anon', 'authenticated', 'public')
),

grants as (
  select 'grant' as section,
         format('%s -> %s on %s', grantee, privilege_type, table_name) as detail
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name like '%leaderboard%'
    and grantee in ('anon', 'authenticated', 'public')
),

column_grants as (
  select 'column_grant' as section,
         format('%s -> %s on %s.%s', grantee, privilege_type, table_name, column_name) as detail
  from information_schema.column_privileges
  where table_schema = 'public'
    and table_name like '%leaderboard%'
    and grantee in ('anon', 'authenticated', 'public')
),

realtime as (
  select 'realtime' as section,
         format('%s is published on %s', tablename, pubname) as detail
  from pg_publication_tables
  where schemaname = 'public'
    and tablename like '%leaderboard%'
),

rows_present as (
  select 'row_count' as section,
         format('leaderboard has %s rows', count(*)::text) as detail
  from public.leaderboard
)

select section, detail from tables
union all select section, detail from columns
union all select section, detail from constraints
union all select section, detail from indexes
union all select section, detail from policies
union all select section, detail from triggers
union all select section, detail from functions
union all select section, detail from function_grants
union all select section, detail from grants
union all select section, detail from column_grants
union all select section, detail from realtime
union all select section, detail from rows_present
order by section, detail;
