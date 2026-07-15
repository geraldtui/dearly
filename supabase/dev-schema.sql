-- ===========================================================================
-- Dearly — consolidated DEV schema (run once in the Supabase SQL editor).
--
-- Combines all migrations up to 2026-06-18:
-- - 0001 (accounts: profiles, voice_notes, auto-profile trigger)
-- - 0002 (nullable recipient for sent copies)
-- - 0003 (recipient_email for email-fallback contacts)
-- - 0004 (conversation_labels for nicknames/aliases)
-- - RLS fix (allow authenticated users to read profiles for reply functionality)
-- - pinned "Self Notes" thread (spec 26): conversation_labels.pinned + auto-seed + backfill
--
-- Idempotent: safe to re-run. For production, proper migrations will be created.
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

-- Allow authenticated users to read any profile (needed for reply functionality)
drop policy if exists "profiles: read own row" on public.profiles;
drop policy if exists "profiles: read any profile" on public.profiles;
create policy "profiles: read any profile"
  on public.profiles for select
  to authenticated
  using (true);

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
-- Auto-provision a profile row (+ a pinned "Self Notes" thread) for every new auth user
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

  insert into public.conversation_labels (owner_id, counterpart_key, nickname, pinned)
  values (new.id, 'id:' || new.id, 'Self Notes', true)
  on conflict (owner_id, counterpart_key) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- conversation_labels (spec 15): per-owner nickname + alias per counterpart
-- pinned (spec 26): keeps a thread (e.g. "Self Notes") at the top, always visible
-- ---------------------------------------------------------------------------
create table if not exists public.conversation_labels (
  owner_id uuid not null references public.profiles (id) on delete cascade,
  counterpart_key text not null,
  nickname text,
  my_alias text,
  pinned boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (owner_id, counterpart_key)
);

alter table public.conversation_labels add column if not exists pinned boolean not null default false;

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

-- Backfill: give every existing user a pinned "Self Notes" thread too.
-- New signups already get this from handle_new_user() above.
insert into public.conversation_labels (owner_id, counterpart_key, nickname, pinned)
select id, 'id:' || id, 'Self Notes', true from public.profiles
on conflict (owner_id, counterpart_key) do update set pinned = true;

-- ---------------------------------------------------------------------------
-- Private audio bucket (reads happen via service-role signed URLs)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('voice-notes', 'voice-notes', false)
on conflict (id) do nothing;
