-- ============================================================
-- THEIA Clone — Schéma Supabase
-- À exécuter dans l'éditeur SQL de votre projet Supabase
-- ============================================================

-- -------------------------------------------------------
-- 1. Table profiles (extension de auth.users)
-- -------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  role        text not null default 'student' check (role in ('admin', 'student')),
  created_at  timestamptz default now()
);

-- Trigger : créer le profil automatiquement à l'inscription
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'student')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- -------------------------------------------------------
-- 2. Table exams
-- -------------------------------------------------------
create table if not exists public.exams (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  duration    integer default 60,           -- durée en minutes
  questions   jsonb not null default '[]',  -- tableau de questions JSON
  created_by  uuid references auth.users(id),
  is_active   boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- -------------------------------------------------------
-- 3. Table exam_sessions
-- -------------------------------------------------------
create table if not exists public.exam_sessions (
  id           uuid primary key default gen_random_uuid(),
  exam_id      uuid not null references public.exams(id) on delete cascade,
  student_id   uuid not null references auth.users(id) on delete cascade,
  status       text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'cancelled')),
  answers      jsonb default '{}',        -- { questionId: answer }
  discordances jsonb default '[]',        -- tableau de discordances calculé
  final_note   numeric(5,2),             -- note /20
  total_points numeric(8,3),
  max_points   numeric(8,3),
  started_at   timestamptz default now(),
  submitted_at timestamptz,
  created_at   timestamptz default now()
);

-- Index pour les requêtes fréquentes
create index if not exists exam_sessions_student_idx on public.exam_sessions(student_id);
create index if not exists exam_sessions_exam_idx on public.exam_sessions(exam_id);
create unique index if not exists exam_sessions_unique_active
  on public.exam_sessions(exam_id, student_id)
  where status = 'in_progress';

-- -------------------------------------------------------
-- 4. Table anti_cheat_logs
-- -------------------------------------------------------
create table if not exists public.anti_cheat_logs (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.exam_sessions(id) on delete cascade,
  event_type      text not null,   -- tab_switch, page_leave, copy_attempt, etc.
  detail          text,
  violation_count integer default 1,
  created_at      timestamptz default now()
);

create index if not exists anti_cheat_logs_session_idx on public.anti_cheat_logs(session_id);

-- -------------------------------------------------------
-- 5. Row Level Security (RLS)
-- -------------------------------------------------------

-- profiles
alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Admins can read all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Service role can insert profiles"
  on public.profiles for insert
  with check (true);

-- exams
alter table public.exams enable row level security;

create policy "Anyone authenticated can read active exams"
  on public.exams for select
  using (auth.uid() is not null and is_active = true);

create policy "Admins can read all exams"
  on public.exams for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Admins can insert exams"
  on public.exams for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Admins can update exams"
  on public.exams for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Admins can delete exams"
  on public.exams for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- exam_sessions
alter table public.exam_sessions enable row level security;

create policy "Students can read own sessions"
  on public.exam_sessions for select
  using (auth.uid() = student_id);

create policy "Admins can read all sessions"
  on public.exam_sessions for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Students can insert own sessions"
  on public.exam_sessions for insert
  with check (auth.uid() = student_id);

create policy "Students can update own sessions"
  on public.exam_sessions for update
  using (auth.uid() = student_id);

-- anti_cheat_logs
alter table public.anti_cheat_logs enable row level security;

create policy "Students can insert own logs"
  on public.anti_cheat_logs for insert
  with check (
    exists (
      select 1 from public.exam_sessions s
      where s.id = session_id and s.student_id = auth.uid()
    )
  );

create policy "Admins can read all logs"
  on public.anti_cheat_logs for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- -------------------------------------------------------
-- 6. Créer un compte admin de démonstration
-- -------------------------------------------------------
-- À exécuter manuellement dans Authentication > Users
-- Email: admin@cesi.fr / Password: Admin1234!
-- Puis dans SQL :
--   update public.profiles set role = 'admin' where email = 'admin@cesi.fr';
