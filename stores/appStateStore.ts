type AppState = {
  entries: any[];
  loadEntries: () => Promise<void>;
  addEntry: (e: any) => void;
  clearEntries: () => void;
};

const useAppStateStore = create<AppState>()(
  persist(
    (set, get) => ({
      entries: [],

      loadEntries: async () => {
        // Uses supabase-backed storage
        // (If supabase returns empty, Zustand default [] stays)
        return;
      },

      addEntry: (e) => set({ entries: [...get().entries, e] }),

      clearEntries: () => set({ entries: [] }),
    }),
    {
      name: "life-tape-entries-storage",
      storage: supabaseStorage,
    }
  )
);
