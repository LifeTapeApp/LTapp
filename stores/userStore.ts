type UserState = {
  isOnboarded: boolean;
  hasCompletedTimeline: boolean;
  setOnboarded: (v: boolean) => void;
  setTimelineCompleted: (v: boolean) => void;
};

const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      isOnboarded: false,
      hasCompletedTimeline: false,
      setOnboarded: (v) => set({ isOnboarded: v }),
      setTimelineCompleted: (v) => set({ hasCompletedTimeline: v }),
    }),
    {
      name: "life-tape-user-storage",
      storage: supabaseStorage,
    }
  )
);
