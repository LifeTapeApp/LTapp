// src/lib/supabaseStorage.ts
import { supabase } from "./supabase";

export default {
  getItem: async (key: string) => {
    try {
      const r = await supabase.from("app_state").select("value").eq("key", key).single();
      if (r.error || !r.data) return null;
      return JSON.stringify(r.data.value);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await supabase.from("app_state").upsert({ key, value: JSON.parse(value) });
    } catch (e) {
      console.error("supabaseStorage setItem error:", e);
    }
  },
  removeItem: async (key: string) => {
    try {
      await supabase.from("app_state").delete().eq("key", key);
    } catch (e) {
      console.error("supabaseStorage removeItem error:", e);
    }
  },
};
