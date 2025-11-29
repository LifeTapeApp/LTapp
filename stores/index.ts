// src/stores/index.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "../lib/supabase"; // if needed
import supabaseStorage from "../lib/supabaseStorage"; // see next snippet

// Example PIN store (copy your logic, no changes)
export const usePINStore = create(
  persist(
    (set, get) => ({
      appPIN: null,
      darkSidePIN: null,
      isAppUnlocked: false,
      isDarkSideUnlocked: false,
      // ... your methods unchanged
    }),
    { name: "life-tape-pin-storage", storage: supabaseStorage }
  )
);

// export other stores similarly...
