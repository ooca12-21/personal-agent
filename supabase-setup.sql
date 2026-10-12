-- Personal Agent: one private document per authenticated account.
-- No anonymous access. No service-role key in the website.
begin;
create table if not exists public.agent_documents (
 user_id uuid primary key references auth.users(id) on delete cascade,
 revision bigint not null default 1 check (revision > 0),
 payload jsonb not null,
 updated_at timestamptz not null default now(),
 constraint agent_document_shape check (
  coalesce(jsonb_typeof(payload)='object' and jsonb_typeof(payload->'tasks')='array'
  and jsonb_typeof(payload->'history')='array' and jsonb_typeof(payload->'trash')='array'
  and jsonb_typeof(payload->'tags')='array',false) and octet_length(payload::text)<=1048576)
);
alter table public.agent_documents enable row level security;
revoke all on public.agent_documents from anon, authenticated;
grant select, insert, update on public.agent_documents to authenticated;
create policy "Read own document" on public.agent_documents for select to authenticated
 using ((select auth.uid())=user_id);
create policy "Create own document" on public.agent_documents for insert to authenticated
 with check ((select auth.uid())=user_id);
create policy "Update own document" on public.agent_documents for update to authenticated
 using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
-- Serialized compare-and-swap prevents a stale device overwriting newer data.
create or replace function public.agent_sync(expected_revision bigint, new_payload jsonb)
returns table(applied boolean, revision bigint, payload jsonb)
language plpgsql security invoker set search_path='' as $$
declare caller uuid:=auth.uid(); current_row public.agent_documents%rowtype;
begin
 if caller is null then raise exception 'Authentication required' using errcode='42501'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(caller::text,0));
 select d.* into current_row from public.agent_documents d where d.user_id=caller;
 if not found then
  if expected_revision<>0 then raise exception 'Missing cloud document'; end if;
  insert into public.agent_documents(user_id,payload) values(caller,new_payload) returning * into current_row;
  return query select true,current_row.revision,current_row.payload;
 elsif current_row.revision=expected_revision then
  update public.agent_documents d set payload=new_payload,revision=d.revision+1,updated_at=now()
   where d.user_id=caller returning d.* into current_row;
  return query select true,current_row.revision,current_row.payload;
 else
  return query select false,current_row.revision,current_row.payload;
 end if;
end; $$;
revoke all on function public.agent_sync(bigint,jsonb) from public,anon;
grant execute on function public.agent_sync(bigint,jsonb) to authenticated;
commit;
