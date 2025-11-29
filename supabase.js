// supabase.js
import { createClient } from "@supabase/supabase-js";

/**
 * For Expo web builds on Vercel we rely on build-time env injection,
 * so process.env.* must be set by Vercel when bundling the app.
 *
 * Use EXPO_PUBLIC_* (Expo convention) or VITE_* depending on your build.
 */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // friendly runtime warning (not fatal) — good for debugging builds
  // console.warn("Supabase env missing:", { SUPABASE_URL, SUPABASE_ANON_KEY });
}

export const supabase = createClient(SUPABASE_URL ?? "", SUPABASE_ANON_KEY ?? "");
export default supabase;
