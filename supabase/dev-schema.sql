-- ===========================================================================
-- Dearly — consolidated DEV schema (run once in the Supabase SQL editor).
--
-- Combines migrations 0001 (accounts) + 0002 (nullable recipient) + 0003
-- (recipient_email). Idempotent: safe to re-run, and works whether the tables
-- already exist or not. We'll split this back into ordered migrations when the
-- production database goes live.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique check (email = lower(btrim(email))),
  display_name text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles: read own row" on public.profiles;
create policy "profiles: read own row"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles: update own row" on public.profiles;
create policy "profiles: update own row"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- voice_notes
-- ---------------------------------------------------------------------------
create table if not exists public.voice_notes (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references public.profiles (id) on delete set null,
  recipient_id uuid references public.profiles (id) on delete cascade,
  sender_name text not null default '',
  recipient_name text not null default '',
  recipient_email text,
  subject text,
  storage_path text not null,
  duration_seconds int not null default 0,
  listened_at timestamptz,
  created_at timestamptz not null default now()
);

-- Bring an already-created table up to date (0002 + 0003).
alter table public.voice_notes alter column recipient_id drop not null;
alter table public.voice_notes add column if not exists recipient_email text;

create index if not exists voice_notes_recipient_idx on public.voice_notes (recipient_id, created_at desc);
create index if not exists voice_notes_sender_idx on public.voice_notes (sender_id, created_at desc);

alter table public.voice_notes enable row level security;

drop policy if exists "voice_notes: participants can read" on public.voice_notes;
create policy "voice_notes: participants can read"
  on public.voice_notes for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

drop policy if exists "voice_notes: sender inserts own" on public.voice_notes;
create policy "voice_notes: sender inserts own"
  on public.voice_notes for insert
  with check (auth.uid() = sender_id);

drop policy if exists "voice_notes: recipient updates" on public.voice_notes;
create policy "voice_notes: recipient updates"
  on public.voice_notes for update
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

drop policy if exists "voice_notes: participants can delete" on public.voice_notes;
create policy "voice_notes: participants can delete"
  on public.voice_notes for delete
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- ---------------------------------------------------------------------------
-- Auto-provision a profile row for every new auth user
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    lower(btrim(new.email)),
    coalesce(new.raw_user_meta_data ->> 'display_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- conversation_labels (spec 15): per-owner nickname + alias per counterpart
-- ---------------------------------------------------------------------------
create table if not exists public.conversation_labels (
  owner_id uuid not null references public.profiles (id) on delete cascade,
  counterpart_key text not null,
  nickname text,
  my_alias text,
  updated_at timestamptz not null default now(),
  primary key (owner_id, counterpart_key)
);

alter table public.conversation_labels enable row level security;

drop policy if exists "conversation_labels: owner reads" on public.conversation_labels;
create policy "conversation_labels: owner reads"
  on public.conversation_labels for select
  using (auth.uid() = owner_id);

drop policy if exists "conversation_labels: owner inserts" on public.conversation_labels;
create policy "conversation_labels: owner inserts"
  on public.conversation_labels for insert
  with check (auth.uid() = owner_id);

drop policy if exists "conversation_labels: owner updates" on public.conversation_labels;
create policy "conversation_labels: owner updates"
  on public.conversation_labels for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "conversation_labels: owner deletes" on public.conversation_labels;
create policy "conversation_labels: owner deletes"
  on public.conversation_labels for delete
  using (auth.uid() = owner_id);

-- ---------------------------------------------------------------------------
-- Private audio bucket (reads happen via service-role signed URLs)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('voice-notes', 'voice-notes', false)
on conflict (id) do nothing;
