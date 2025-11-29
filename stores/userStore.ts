import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabaseStorage } from "../lib/supabaseStorage"; 

export type UserState = {
  isOnboarded: boolean;
  hasCompletedTimeline: boolean;
  userId: string | null;
  email: string | null;
  displayName: string | null;
  titlePreference: "ai" | "manual";

  setOnboarded: (v: boolean) => void;
  setTimelineCompleted: (v: boolean) => void;
  setUser: (id: string, email: string, displayName?: string) => void;
  setTitlePreference: (pref: "ai" | "manual") => void;
  clearUser: () => void;
};

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      isOnboarded: false,
      hasCompletedTimeline: false,
      userId: null,
      email: null,
      displayName: null,
      titlePreference: "ai",

      setOnboarded: (v) => set({ isOnboarded: v }),
      setTimelineCompleted: (v) => set({ hasCompletedTimeline: v }),

      setUser: (id, email, displayName) =>
        set({
          userId: id,
          email,
          displayName: displayName || null,
        }),

      setTitlePreference: (pref) => set({ titlePreference: pref }),

      clearUser: () =>
        set({
          isOnboarded: false,
          hasCompletedTimeline: false,
          userId: null,
          email: null,
          displayName: null,
          titlePreference: "ai",
        }),
    }),
    {
      name: "life-tape-user-storage",
      storage: supabaseStorage,
    }
  )
);
