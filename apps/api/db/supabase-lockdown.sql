-- Supabase 공개 API(PostgREST) 잠그기 — Supabase SQL Editor에서 한 번 실행한다.
--
-- 왜: 이 앱의 테이블은 Hibernate(ddl-auto: update)가 public 스키마에 만든다. Supabase는 public 스키마를
--     REST API(https://<프로젝트>.supabase.co/rest/v1/…)로 자동 공개하고, 그 열쇠인 anon key는 "공개해도 되는 키"다.
--     Hibernate가 만든 테이블은 RLS가 꺼져 있으므로, 잠그지 않으면 anon key만으로 members(이메일·전화·비밀번호 해시)
--     ·inquiries·bookings 등을 읽고 쓸 수 있다. 앱은 이 REST API를 쓰지 않는다(Spring Boot가 DATABASE_URL로 직접 접속).
-- 영향: Spring Boot는 테이블 소유자 계정(postgres)으로 접속하므로 RLS의 영향을 받지 않는다. Storage(사진 파일)는
--     storage 스키마라 그대로다. happiness-admin이 같은 DB를 anon/authenticated 키로 REST 조회한다면 그쪽이 막힌다 —
--     그 경우 실행 전에 확인할 것.
-- 여러 번 실행해도 된다.

-- 0) 먼저 현재 상태 확인 (rls_enabled가 false인 줄이 노출 대상)
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relrowsecurity, c.relname;

-- 1) public 스키마의 모든 테이블에 RLS 켜기 (정책이 없으므로 anon/authenticated는 아무 행도 못 본다)
do $$
declare t record;
begin
  for t in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
  loop
    execute format('alter table public.%I enable row level security', t.relname);
  end loop;
end $$;

-- 2) 공개 역할의 테이블 권한 회수 (RLS와 이중 방어)
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

-- 3) 앞으로 Hibernate가 새로 만드는 테이블도 자동으로 RLS를 켠다
create or replace function public.enable_rls_on_new_table() returns event_trigger
language plpgsql as $$
declare obj record;
begin
  for obj in select * from pg_event_trigger_ddl_commands()
             where command_tag = 'CREATE TABLE' and schema_name = 'public'
  loop
    execute format('alter table %s enable row level security', obj.object_identity);
  end loop;
end $$;

drop event trigger if exists enable_rls_on_new_table;
create event trigger enable_rls_on_new_table on ddl_command_end
  when tag in ('CREATE TABLE') execute function public.enable_rls_on_new_table();

-- 4) 다시 확인 — 모든 줄이 rls_enabled = true 여야 한다
select count(*) filter (where not c.relrowsecurity) as tables_without_rls
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r';
