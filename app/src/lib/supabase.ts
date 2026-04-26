import { createClient } from "@supabase/supabase-js";

// Anon key is public (designed to be exposed in client-side apps); fine to embed
// directly so that builds without a populated `.env` still produce a working app.
const FALLBACK_URL = "https://pybmkjhfwxurrlwxhdxo.supabase.co";
const FALLBACK_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5Ym1ramhmd3h1cnJsd3hoZHhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNzYzMzQsImV4cCI6MjA5Mjc1MjMzNH0.EkafAmCpfXxg0N-deg5kcuYrF3LIIOlRJbl-CYuhus8";

const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || FALLBACK_URL;
const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || FALLBACK_ANON_KEY;

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
);

export const SUPABASE_PROJECT_URL = SUPABASE_URL;
