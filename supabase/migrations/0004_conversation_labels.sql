-- Conversation aliases & nicknames (spec 15): per-owner, per-counterpart labels.
-- `nickname` = how the owner privately labels the contact (display only).
-- `my_alias` = how the owner signs notes they send to the contact (sender_name).
-- `counterpart_key` matches the conversation key in src/lib/conversations.ts.
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
