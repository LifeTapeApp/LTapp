type PINState = {
  pin: string | null;
  isAppUnlocked: boolean;
  lastBackgroundTime: number | null;

  setPIN: (p: string) => void;
  hasAppPIN: () => boolean;
  unlockApp: () => void;
  lockApp: () => void;
  setLastBackgroundTime: (t: number) => void;
};

const usePINStore = create<PINState>()(
  persist(
    (set, get) => ({
      pin: null,
      isAppUnlocked: false,
      lastBackgroundTime: null,

      setPIN: (p) => set({ pin: p }),
      hasAppPIN: () => Boolean(get().pin),
      unlockApp: () => set({ isAppUnlocked: true }),
      lockApp: () => set({ isAppUnlocked: false }),
      setLastBackgroundTime: (t) => set({ lastBackgroundTime: t }),
    }),
    {
      name: "life-tape-pin-storage",
      storage: supabaseStorage,
    }
  )
);
