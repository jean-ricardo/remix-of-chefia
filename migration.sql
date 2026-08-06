-- 1. Create teams table
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique default substr(md5(random()::text), 1, 8),
  created_at timestamp with time zone default now()
);

-- 2. Add team_id to team_members and activities
alter table public.team_members add column team_id uuid references public.teams(id);
alter table public.activities add column team_id uuid references public.teams(id);

-- 3. Grants
grant select, insert, update, delete on public.teams to authenticated;
grant all on public.teams to service_role;
grant select on public.teams to anon;

-- 4. Enable RLS
alter table public.teams enable row level security;

-- 5. Policies for teams
create policy "Users can see their own team"
on public.teams
for select
to authenticated
using (
  exists (
    select 1 from public.team_members
    where team_members.user_id = auth.uid()
    and team_members.team_id = teams.id
  )
  OR
  invite_code is not null
);
