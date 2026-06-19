# Dearly Database Setup

## Pre-Production (Current)

Since production hasn't launched yet, we're using a simplified workflow:

### Single Schema File Approach
- **File**: `dev-schema.sql`
- **Usage**: Run this entire file in Supabase SQL Editor whenever you need to reset/recreate the database
- **Benefits**: Simple, fast, no migration tracking needed pre-production

### How to Reset Your Dev Database
1. Go to Supabase Dashboard → SQL Editor
2. Copy the entire contents of `dev-schema.sql`
3. Paste and run
4. Done! All tables, RLS policies, and triggers are created/updated

### The migrations/ Folder
- Currently empty (cleaned up 2026-06-18)
- Will be used once production goes live
- Old migrations (0001-0004) were consolidated into `dev-schema.sql`

## Post-Production (Future)

Once production launches, switch to proper migrations:

### Migration Workflow
1. Never modify `dev-schema.sql` again
2. Create timestamped migrations: `YYYYMMDD_description.sql`
3. Test migrations locally
4. Apply to production in order
5. Keep `dev-schema.sql` as historical reference

### Creating Migrations
```bash
# Example: adding a new column
# Create: supabase/migrations/20260620_add_user_bio.sql
ALTER TABLE profiles ADD COLUMN bio TEXT;
```

## Current Schema (as of 2026-06-18)

Includes:
- ✅ Profiles table with auto-creation trigger
- ✅ Voice notes table (supports in-app + email delivery)
- ✅ Conversation labels (nicknames/aliases)
- ✅ RLS policies (including profile reads for reply functionality)
- ✅ Storage bucket policies for voice notes

## Important Notes

- **RLS Policy Update (2026-06-18)**: Changed profiles RLS from "read own row" to "read any profile" to fix reply functionality. Users need to look up recipient emails when replying to voice notes.
- **Dev-only**: This single-file approach is only for development. Production will use proper migrations.
