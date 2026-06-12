-- Dearly Accounts epic: profiles, voice_notes, RLS, profile trigger, audio bucket.
-- Apply via the Supabase SQL editor or `supabase db push`.

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique check (email = lower(btrim(email))),
  display_name text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own row"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: update own row"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- voice_notes
-- ---------------------------------------------------------------------------
create table public.voice_notes (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references public.profiles (id) on delete set null,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  sender_name text not null default '',
  recipient_name text not null default '',
  subject text,
  storage_path text not null,
  duration_seconds int not null default 0,
  listened_at timestamptz,
  created_at timestamptz not null default now()
);

create index voice_notes_recipient_idx on public.voice_notes (recipient_id, created_at desc);
create index voice_notes_sender_idx on public.voice_notes (sender_id, created_at desc);

alter table public.voice_notes enable row level security;

create policy "voice_notes: participants can read"
  on public.voice_notes for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "voice_notes: sender inserts own"
  on public.voice_notes for insert
  with check (auth.uid() = sender_id);

-- Recipient may update (used to set listened_at).
create policy "voice_notes: recipient updates"
  on public.voice_notes for update
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Private audio bucket (no public access; reads happen via signed URLs minted
-- server-side with the service role).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('voice-notes', 'voice-notes', false)
on conflict (id) do nothing;
