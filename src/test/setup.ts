import "@testing-library/jest-dom/vitest";

// Tests never talk to real services; these keep lazily-constructed clients
// (Resend, Supabase) from throwing before the suites can mock them.
process.env.RESEND_API_KEY ||= "re_test_key";
process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY ||= "test-service-key";
