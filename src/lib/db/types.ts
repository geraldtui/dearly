/** Row shapes for the Sona Accounts schema (supabase/migrations/0001_accounts.sql). */

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
}

export interface ThreadLabel {
  owner_id: string;
  /** Matches the thread key in src/lib/threads.ts. */
  counterpart_key: string;
  /** How the owner privately labels the contact (display only). */
  nickname: string | null;
  /** How the owner signs notes they send to the contact. */
  my_alias: string | null;
  /** True to keep this thread pinned at the top of the sidebar (e.g. "Self Notes"). */
  pinned: boolean;
  updated_at: string;
}

export interface VoiceNote {
  id: string;
  sender_id: string | null;
  /** Null for email-fallback sends stored as the sender's copy only. */
  recipient_id: string | null;
  sender_name: string;
  recipient_name: string;
  /** Recipient's email; persisted so email-only threads can be replied to. */
  recipient_email: string | null;
  subject: string | null;
  storage_path: string;
  duration_seconds: number;
  listened_at: string | null;
  created_at: string;
}
