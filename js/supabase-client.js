import { createClient } from "@supabase/supabase-js";
const SUPABASE_URL = "https://yvtxizwkidvwrxujcdqq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2dHhpendraWR2d3J4dWpjZHFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTczMzAsImV4cCI6MjEwNDAzMzMzMH0.zMXIWDePmQHFZrnJYIFecai682XRwDksI-_SaO7tCC0";
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export {
  supabaseClient
};
