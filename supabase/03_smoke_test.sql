-- ============================================================================
-- Smoke test for submit_score().
--
-- Exercises the permission, the happy path, idempotency and each rejection
-- rule, then deletes everything it created. No row survives this script.
--
-- Safe to run against production as often as you like.
--
-- Every step must read PASS.
-- ============================================================================

drop table if exists smoke_results;
create temp table smoke_results (step text, result text);

do $$
declare
  v_oid    oid;
  v_first  uuid;
  v_second uuid;
  v_win    text := 'smoke-' || gen_random_uuid()::text;
begin
  -- ── 1. The function is there at all ──────────────────────────────────────
  select p.oid into v_oid
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'submit_score'
  limit 1;

  if v_oid is null then
    insert into smoke_results values ('1. submit_score exists', 'FAIL - not found');
    return;
  end if;
  insert into smoke_results values ('1. submit_score exists', 'PASS');

  -- ── 2. anon is allowed to call it ────────────────────────────────────────
  insert into smoke_results values (
    '2. anon can EXECUTE submit_score',
    case when has_function_privilege('anon', v_oid, 'EXECUTE')
         then 'PASS' else 'FAIL - grant missing' end
  );

  -- ── 3. A plausible run is accepted ───────────────────────────────────────
  v_first := public.submit_score(
    v_win, 'SMOKE', 5000, 12000, 1, 15,
    'elephant', 'es', 'smoke-test', 'desktop', '1.2.1'
  );
  insert into smoke_results values (
    '3. accepts a valid run',
    case when v_first is not null then 'PASS' else 'FAIL - returned null' end
  );

  -- ── 4. The row is really there, stamped by the server clock ──────────────
  insert into smoke_results values (
    '4. row landed with server created_at',
    case when exists (
      select 1 from public.leaderboard
      where id = v_first
        and player_name = 'SMOKE'
        and created_at > now() - interval '1 minute'
    ) then 'PASS' else 'FAIL' end
  );

  -- ── 5. Telemetry was split off into the private table ────────────────────
  insert into smoke_results values (
    '5. telemetry row written',
    case when exists (
      select 1 from public.leaderboard_telemetry
      where entry_id = v_first and user_agent = 'smoke-test'
    ) then 'PASS' else 'FAIL' end
  );

  -- ── 6. Replaying the same win id does not duplicate ──────────────────────
  --      This is the step that fails without the unique index on win_id.
  v_second := public.submit_score(
    v_win, 'SMOKE', 5000, 12000, 1, 15,
    'elephant', 'es', 'smoke-test', 'desktop', '1.2.1'
  );
  insert into smoke_results values (
    '6. idempotent on win_id',
    case when v_second = v_first then 'PASS'
         else 'FAIL - second call returned a different id' end
  );

  -- ── 7..9. Every rejection rule fires ─────────────────────────────────────
  begin
    perform public.submit_score(
      'smoke-' || gen_random_uuid()::text, 'CHEATER', 999999, 12000, 0, 15,
      'elephant', 'es'
    );
    insert into smoke_results values ('7. rejects score above ceiling', 'FAIL - accepted');
  exception when others then
    insert into smoke_results values ('7. rejects score above ceiling', 'PASS - ' || sqlerrm);
  end;

  begin
    perform public.submit_score(
      'smoke-' || gen_random_uuid()::text, 'CHEATER', 5000, 12345, 0, 15,
      'elephant', 'es'
    );
    insert into smoke_results values ('8. rejects a clock that never ticked', 'FAIL - accepted');
  exception when others then
    insert into smoke_results values ('8. rejects a clock that never ticked', 'PASS - ' || sqlerrm);
  end;

  begin
    -- 50k points after ten minutes of play is arithmetically impossible.
    perform public.submit_score(
      'smoke-' || gen_random_uuid()::text, 'CHEATER', 50000, 600000, 0, 15,
      'elephant', 'es'
    );
    insert into smoke_results values ('9. rejects score vs elapsed time', 'FAIL - accepted');
  exception when others then
    insert into smoke_results values ('9. rejects score vs elapsed time', 'PASS - ' || sqlerrm);
  end;

  -- ── Clean up. Telemetry follows via ON DELETE CASCADE. ───────────────────
  delete from public.leaderboard where win_id like 'smoke-%';

  insert into smoke_results values (
    '10. cleaned up after itself',
    case when not exists (
      select 1 from public.leaderboard where win_id like 'smoke-%'
    ) then 'PASS' else 'FAIL - smoke rows left behind' end
  );
end $$;

select step, result from smoke_results order by step;
