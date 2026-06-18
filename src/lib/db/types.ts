/** Row shapes for the Dearly Accounts schema (supabase/migrations/0001_accounts.sql). */

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
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
