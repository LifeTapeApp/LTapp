import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabaseStorage } from "../lib/supabaseStorage";

export type PINState = {
  appPIN: string | null;
  darkSidePIN: string | null;

  isAppUnlocked: boolean;
  isDarkSideUnlocked: boolean;

  lastBackgroundTime: number | null;

  // Setters
  setAppPIN: (p: string) => void;
  setDarkSidePIN: (p: string) => void;

  // Unlocking
  unlockApp: () => void;
  lockApp: () => void;

  unlockDarkSide: () => void;
  lockDarkSide: () => void;

  // Validation
  verifyAppPIN: (p: string) => boolean;
  verifyDarkSidePIN: (p: string) => boolean;

  // Helpers
  hasAppPIN: () => boolean;
  hasDarkSidePIN: () => boolean;

  setLastBackgroundTime: (t: number | null) => void;

  clearPINs: () => void;
};

export const usePINStore = create<PINState>()(
  persist(
    (set, get) => ({
      appPIN: null,
      darkSidePIN: null,

      isAppUnlocked: false,
      isDarkSideUnlocked: false,

      lastBackgroundTime: null,

      // Setters
      setAppPIN: (p) => set({ appPIN: p }),
      setDarkSidePIN: (p) => set({ darkSidePIN: p }),

      // Unlock / Lock
      unlockApp: () => set({ isAppUnlocked: true }),
      lockApp: () => set({ isAppUnlocked: false, isDarkSideUnlocked: false }),

      unlockDarkSide: () => set({ isDarkSideUnlocked: true }),
      lockDarkSide: () => set({ isDarkSideUnlocked: false }),

      // Validation
      verifyAppPIN: (p) => get().appPIN === p,
      verifyDarkSidePIN: (p) => get().darkSidePIN === p,

      hasAppPIN: () => get().appPIN !== null,
      hasDarkSidePIN: () => get().darkSidePIN !== null,

      setLastBackgroundTime: (t) => set({ lastBackgroundTime: t }),

      clearPINs: () =>
        set({
          appPIN: null,
          darkSidePIN: null,
          isAppUnlocked: false,
          isDarkSideUnlocked: false,
        }),
    }),
    {
      name: "life-tape-pin-storage",
      storage: supabaseStorage,
      partialize: (state) => ({
        appPIN: state.appPIN,
        darkSidePIN: state.darkSidePIN,
      }),
    }
  )
);
