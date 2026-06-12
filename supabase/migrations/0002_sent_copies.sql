-- Sent copies for email-fallback sends (spec 08): a logged-in sender's note to
-- a non-Dearly recipient is stored with recipient_id = null instead of being
-- BCC'd to their email. Existing RLS already scopes such rows to the sender
-- (recipient predicates simply never match null).

alter table public.voice_notes
  alter column recipient_id drop not null;
