-- Chat conversations: persist the recipient's email so email-only (non-Dearly)
-- threads can be replied to inline. Nullable; older rows stay null.
alter table public.voice_notes add column if not exists recipient_email text;
