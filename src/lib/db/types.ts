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
  recipient_id: string;
  sender_name: string;
  recipient_name: string;
  subject: string | null;
  storage_path: string;
  duration_seconds: number;
  listened_at: string | null;
  created_at: string;
}
