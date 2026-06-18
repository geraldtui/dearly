import "@testing-library/jest-dom/vitest";

// Tests never talk to real services; these keep lazily-constructed clients
// (SES SMTP transport, Supabase) from throwing before the suites can mock them.
process.env.SES_SMTP_HOST ||= "email-smtp.us-east-1.amazonaws.com";
process.env.SES_SMTP_USER ||= "test-smtp-user";
process.env.SES_SMTP_PASSWORD ||= "test-smtp-pass";
process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY ||= "test-service-key";
