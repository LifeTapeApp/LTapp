import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "../supabase";
import { supabaseStorage } from "../lib/supabaseStorage";

export type Entry = {
  id: string;
  title: string;
  transcript: string;
  audioUrl?: string;
  createdAt: number;
  tags?: string[];
};

export type AppState = {
  // Recording & listening state
  isRecording: boolean;
  isListening: boolean;
  wakeWordDetected: boolean;

  recordingTranscript: string;
  title: string;
  tags: string[];

  // Entries
  entries: Entry[];
  loadEntries: () => Promise<void>;
  addEntry: (e: Entry) => void;
  updateEntry: (id: string, updates: Partial<Entry>) => void;
  deleteEntry: (id: string) => void;
  clearEntries: () => void;

  // Setters
  startRecording: () => void;
  stopRecording: () => void;
  setTranscript: (t: string) => void;
  clearTranscript: () => void;
  setTitle: (t: string) => void;
  setTags: (t: string[]) => void;
  setWakeWordDetected: (v: boolean) => void;
};

export const useAppStateStore = create<AppState>()(
  persist(
    (set, get) => ({
      // --- Recording state ---
      isRecording: false,
      isListening: false,
      wakeWordDetected: false,

      recordingTranscript: "",
      title: "",
      tags: [],

      // --- Entries ---
      entries: [],

      // Load entries from Supabase "entries" table
      loadEntries: async () => {
        try {
          const { data, error } = await supabase
            .from("entries")
            .select("*")
            .order("createdAt", { ascending: false });

          if (!error && data) {
            set({ entries: data as Entry[] });
          }
        } catch (err) {
          console.warn("Failed to load entries:", err);
        }
      },

      addEntry: (e) => set({ entries: [e, ...get().entries] }),

      updateEntry: (id, updates) =>
        set({
          entries: get().entries.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
        }),

      deleteEntry: (id) =>
        set({
          entries: get().entries.filter((e) => e.id !== id),
        }),

      clearEntries: () => set({ entries: [] }),

      // --- Setters for recording and transcription ---
      startRecording: () => set({ isRecording: true }),
      stopRecording: () =>
        set({
          isRecording: false,
          isListening: false,
          wakeWordDetected: false,
        }),

      setTranscript: (t) => set({ recordingTranscript: t }),
      clearTranscript: () => set({ recordingTranscript: "" }),

      setTitle: (t) => set({ title: t }),
      setTags: (t) => set({ tags: t }),
      setWakeWordDetected: (v) => set({ wakeWordDetected: v }),
    }),
    {
      name: "life-tape-entries-storage",
      storage: supabaseStorage,
    }
  )
);
