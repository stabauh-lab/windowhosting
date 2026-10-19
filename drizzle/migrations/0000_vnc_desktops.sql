create type public.app_role as enum ('admin','user');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique(user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id=_user_id and role=_role)
$$;

-- first user becomes admin
create or replace function public.handle_new_user_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles where role='admin') then
    insert into public.user_roles(user_id, role) values (new.id, 'admin');
  end if;
  insert into public.user_roles(user_id, role) values (new.id, 'user') on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created_role after insert on auth.users
for each row execute function public.handle_new_user_role();

create table public.desktops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  os text not null,
  vnc_url text not null,
  enabled boolean not null default true,
  assigned_to uuid,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.desktops to authenticated;
grant all on public.desktops to service_role;
alter table public.desktops enable row level security;
create policy "admin all" on public.desktops for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "own session" on public.desktops for select to authenticated
  using (assigned_to = auth.uid() and expires_at > now());

create or replace function public.list_available_os()
returns table(os text, available bigint, total bigint)
language sql stable security definer set search_path = public as $$
  select os,
    count(*) filter (where assigned_to is null or expires_at is null or expires_at <= now()),
    count(*)
  from public.desktops where enabled group by os order by os
$$;

create or replace function public.claim_desktop(_os text)
returns uuid language plpgsql security definer set search_path = public as $$
declare _id uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select id into _id from public.desktops
    where assigned_to = auth.uid() and expires_at > now() limit 1;
  if _id is not null then return _id; end if;
  select id into _id from public.desktops
    where enabled and os = _os and (assigned_to is null or expires_at is null or expires_at <= now())
    order by random() limit 1 for update skip locked;
  if _id is null then raise exception 'No desktop available for this OS right now'; end if;
  update public.desktops set assigned_to = auth.uid(), expires_at = now() + interval '60 minutes' where id = _id;
  return _id;
end $$;

create or replace function public.release_desktop()
returns void language sql security definer set search_path = public as $$
  update public.desktops set assigned_to = null, expires_at = null where assigned_to = auth.uid();
$$;

revoke execute on function public.list_available_os() from anon;
revoke execute on function public.claim_desktop(text) from anon;
revoke execute on function public.release_desktop() from anon;