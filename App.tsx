// App.tsx — cleaned / consolidated version
/**
 * Life Tape - Root Application
 * Voice-first, hands-free autobiography app
 *
 * Notes:
 * - Keeps PIN gating & Zustand persistence logic.
 * - Uses a local ThemeProvider wrapper (swap with your constants ThemeProvider if you have one).
 * - Keeps supabaseStorage here so the persist middleware works immediately.
 * - Import actual screens from ./screens/*.tsx (I referenced files you uploaded).
 */

import React, {
  useEffect,
  useState,
  useCallback,
  createContext,
  useContext,
  ReactNode,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  useColorScheme,
  TouchableOpacity,
  Vibration,
  Dimensions,
  Platform,
  AppState,
  AppStateStatus,
} from 'react-native';

import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Ionicons } from '@expo/vector-icons';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createClient } from '@supabase/supabase-js';

//
// Replace these with your constants theme exports (colors, typography, spacing, dimensions, shadows, etc.)
//
import {
  colors,
  typography,
  spacing,
  radii,
  shadows,
  dimensions,
  animations,
  zIndex,
} from './constants/theme';

//
// Screens (replace paths if you moved files)
//
import RecordScreen from './screens/RecordScreen';
import TimelineScreen from './screens/TimelineScreen';
import MenuScreen from './screens/MenuScreen';
import DarkSideScreen from './screens/DarkSideScreen';
import EntryDetailScreen from './screens/EntryDetailScreen';
import PINEntryScreen from './screens/PINEntryScreen'; // placeholder/minimal version you showed

// If you later have an index export for stores: import { usePINStore, useUserStore, useAppStateStore } from './stores';
//
// For now we'll re-create the stores inline (clean, identical API to what your app expects).
// If you already exported the stores from ./stores, remove these and import instead.
//

// Prevent splash screen from auto-hiding until we call hideAsync
SplashScreen.preventAutoHideAsync();

// ============================================================================
// SUPABASE - configuration
// ============================================================================
// If you already have a single source ./supabase.js that does createClient, use that instead.
// I'm providing a createClient here as a fallback so App runs immediately.

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://dmqkdjcbnurlfdnvyial.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtcWtkamNibnVybGZkbnZ5aWFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNDE1MTAsImV4cCI6MjA3OTkxNzUxMH0.CLHNCfaKu800NtIYwI_u_4dL_FvZcokS5nt7g_iF114';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================================
// supabaseStorage — minimal adapter for Zustand persist (uses public table `app_state`)
// ============================================================================

const supabaseStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.from('app_state').select('value').eq('key', name).single();
      if (error || !data) return null;
      // store expects string
      return JSON.stringify(data.value);
    } catch (err) {
      // swallow, persist middleware can fallback
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      // parse before upsert to ensure JSON stored in DB column is a real JSON object
      await supabase.from('app_state').upsert({ key: name, value: JSON.parse(value) });
    } catch (error) {
      console.error('supabaseStorage.setItem error', error);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await supabase.from('app_state').delete().eq('key', name);
    } catch (error) {
      console.error('supabaseStorage.removeItem error', error);
    }
  },
};

// ============================================================================
// Types used by stores
// ============================================================================

type ColorMode = 'light' | 'dark' | 'system';

interface PINState {
  appPIN: string | null;
  darkSidePIN: string | null;
  isAppUnlocked: boolean;
  isDarkSideUnlocked: boolean;
  lastBackgroundTime: number | null;

  setAppPIN: (pin: string) => void;
  setDarkSidePIN: (pin: string) => void;
  unlockApp: () => void;
  lockApp: () => void;
  unlockDarkSide: () => void;
  lockDarkSide: () => void;
  verifyAppPIN: (pin: string) => boolean;
  verifyDarkSidePIN: (pin: string) => boolean;
  hasAppPIN: () => boolean;
  hasDarkSidePIN: () => boolean;
  setLastBackgroundTime: (time: number | null) => void;
  clearPINs: () => void;
}

interface UserState {
  isOnboarded: boolean;
  hasCompletedTimeline: boolean;
  userId: string | null;
  email: string | null;
  displayName: string | null;
  titlePreference: 'ai' | 'manual';
  setOnboarded: (value: boolean) => void;
  setTimelineCompleted: (value: boolean) => void;
  setUser: (userId: string | null, email: string | null, displayName?: string | null) => void;
  setTitlePreference: (pref: 'ai' | 'manual') => void;
  clearUser: () => void;
}

interface RecordingEntry {
  id: string;
  transcript: string;
  title: string;
  tag: string | null;
  isDarkSide: boolean;
  createdAt: number;
  duration: number;
  audioUri: string | null;
}

interface AppStateStore {
  isListening: boolean;
  isRecording: boolean;
  currentTag: string | null;
  wakeWordDetected: boolean;
  silenceTimer: number;
  entries: RecordingEntry[];
  setListening: (value: boolean) => void;
  setRecording: (value: boolean) => void;
  setCurrentTag: (tag: string | null) => void;
  setWakeWordDetected: (value: boolean) => void;
  setSilenceTimer: (value: number) => void;
  addEntry: (entry: RecordingEntry) => void;
  deleteEntry: (id: string) => void;
  updateEntry: (id: string, updates: Partial<RecordingEntry>) => void;
  resetRecordingState: () => void;
  loadEntries: () => Promise<void>;
}

// ============================================================================
// Zustand stores (kept here for now — you can move these to ./stores and import)
// ============================================================================

export const usePINStore = create<PINState>()(
  persist(
    (set, get) => ({
      appPIN: null,
      darkSidePIN: null,
      isAppUnlocked: false,
      isDarkSideUnlocked: false,
      lastBackgroundTime: null,

      setAppPIN: (pin: string) => set({ appPIN: pin }),
      setDarkSidePIN: (pin: string) => set({ darkSidePIN: pin }),

      unlockApp: () => set({ isAppUnlocked: true }),
      lockApp: () => set({ isAppUnlocked: false, isDarkSideUnlocked: false }),

      unlockDarkSide: () => set({ isDarkSideUnlocked: true }),
      lockDarkSide: () => set({ isDarkSideUnlocked: false }),

      verifyAppPIN: (pin: string) => get().appPIN === pin,
      verifyDarkSidePIN: (pin: string) => get().darkSidePIN === pin,

      hasAppPIN: () => get().appPIN !== null,
      hasDarkSidePIN: () => get().darkSidePIN !== null,

      setLastBackgroundTime: (time: number | null) => set({ lastBackgroundTime: time }),

      clearPINs: () =>
        set({
          appPIN: null,
          darkSidePIN: null,
          isAppUnlocked: false,
          isDarkSideUnlocked: false,
        }),
    }),
    {
      name: 'life-tape-pin-storage',
      storage: supabaseStorage,
      partialize: (state) => ({
        appPIN: state.appPIN,
        darkSidePIN: state.darkSidePIN,
      }),
    }
  )
);

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      isOnboarded: false,
      hasCompletedTimeline: false,
      userId: null,
      email: null,
      displayName: null,
      titlePreference: 'ai',

      setOnboarded: (value: boolean) => set({ isOnboarded: value }),
      setTimelineCompleted: (value: boolean) => set({ hasCompletedTimeline: value }),

      setUser: (userId, email, displayName) => set({ userId, email, displayName: displayName || null }),

      setTitlePreference: (pref) => set({ titlePreference: pref }),

      clearUser: () =>
        set({
          userId: null,
          email: null,
          displayName: null,
          isOnboarded: false,
          hasCompletedTimeline: false,
          titlePreference: 'ai',
        }),
    }),
    {
      name: 'life-tape-user-storage',
      storage: supabaseStorage,
    }
  )
);

export const useAppStateStore = create<AppStateStore>()(
  persist(
    (set, get) => ({
      isListening: false,
      isRecording: false,
      currentTag: null,
      wakeWordDetected: false,
      silenceTimer: 0,
      entries: [],

      setListening: (value) => set({ isListening: value }),
      setRecording: (value) => set({ isRecording: value }),
      setCurrentTag: (tag) => set({ currentTag: tag }),
      setWakeWordDetected: (value) => set({ wakeWordDetected: value }),
      setSilenceTimer: (value) => set({ silenceTimer: value }),

      addEntry: async (entry) => {
        try {
          const { data, error } = await supabase.from('entries').insert(entry).select().single();
          if (error || !data) {
            // fallback local
            set((state) => ({ entries: [entry, ...state.entries] }));
          } else {
            set((state) => ({ entries: [data, ...state.entries] }));
          }
        } catch (err) {
          console.error('addEntry error', err);
          set((state) => ({ entries: [entry, ...state.entries] }));
        }
      },

      updateEntry: async (id, updates) => {
        try {
          const { data, error } = await supabase
            .from('entries')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

          if (error || !data) {
            set((state) => ({
              entries: state.entries.map((e) => (e.id === id ? { ...e, ...updates } : e)),
            }));
          } else {
            set((state) => ({
              entries: state.entries.map((e) => (e.id === id ? data : e)),
            }));
          }
        } catch (err) {
          console.error('updateEntry error', err);
          set((state) => ({
            entries: state.entries.map((e) => (e.id === id ? { ...e, ...updates } : e)),
          }));
        }
      },

      deleteEntry: async (id) => {
        try {
          const { error } = await supabase.from('entries').delete().eq('id', id);
          if (error) throw error;
        } catch (err) {
          console.error('deleteEntry error', err);
        } finally {
          set((state) => ({ entries: state.entries.filter((e) => e.id !== id) }));
        }
      },

      loadEntries: async () => {
        try {
          const { data, error } = await supabase.from('entries').select('*').order('createdAt', { ascending: false });
          if (!error && data) {
            set({ entries: data });
          }
        } catch (err) {
          console.error('loadEntries error', err);
        }
      },

      resetRecordingState: () =>
        set({
          isRecording: false,
          currentTag: null,
          wakeWordDetected: false,
          silenceTimer: 0,
        }),
    }),
    {
      name: 'life-tape-entries-storage',
      storage: supabaseStorage,
      partialize: (state) => ({
        entries: state.entries,
      }),
    }
  )
);

// ============================================================================
// Theme provider (local/simple). Swap with your project's ThemeProvider if you already made one
// ============================================================================

type ThemeContextType = {
  colorMode: ColorMode;
  isDark: boolean;
  colors: typeof colors.light | typeof colors.dark;
  setColorMode: (mode: ColorMode) => void;
  toggleColorMode: () => void;
};

const InternalThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
  const ctx = useContext(InternalThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

const InternalThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [colorMode, setColorModeState] = useState<ColorMode>('system');

  useEffect(() => {
    // load from supabaseStorage optionally
    (async () => {
      try {
        const stored = await supabaseStorage.getItem('life-tape-color-mode');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (['light', 'dark', 'system'].includes(parsed)) {
            setColorModeState(parsed);
          }
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const setColorMode = useCallback(async (mode: ColorMode) => {
    setColorModeState(mode);
    try {
      await supabaseStorage.setItem('life-tape-color-mode', JSON.stringify(mode));
    } catch (e) {
      console.error('save color mode error', e);
    }
  }, []);

  const toggleColorMode = useCallback(() => {
    const next = colorMode === 'light' ? 'dark' : colorMode === 'dark' ? 'system' : 'light';
    setColorModeState(next);
  }, [colorMode]);

  const isDark = colorMode === 'system' ? systemColorScheme === 'dark' : colorMode === 'dark';
  const currentColors = isDark ? colors.dark : colors.light;

  const value: ThemeContextType = {
    colorMode,
    isDark,
    colors: currentColors,
    setColorMode,
    toggleColorMode,
  };

  return <InternalThemeContext.Provider value={value}>{children}</InternalThemeContext.Provider>;
};

// TODO: if you already exported a ThemeProvider from ./constants/theme, import & use it instead of InternalThemeProvider.

// ============================================================================
// NAVIGATION types and dark-theme wrappers
// ============================================================================

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  AccountCreation: undefined;
  TimelineBuilder: undefined;
  PINSetup: { mode: 'app' | 'darkSide' };
  PINEntry: { mode: 'app' | 'darkSide'; onSuccess?: () => void };
  Main: undefined;
  DarkSide: undefined;
  Settings: undefined;
  TitlePreference: undefined;
  ChangePassword: undefined;
  PrivacySecurity: undefined;
  Contact: undefined;
  SendInvite: undefined;
  DownloadStory: undefined;
  EntryDetail: { entryId: string };
};

export type MainTabParamList = {
  Record: undefined;
  Timeline: undefined;
  Menu: undefined;
};

const LightNavigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.light.buttonPrimary,
    background: colors.light.canvas,
    card: colors.light.card,
    text: colors.light.textPrimary,
    border: colors.light.border,
    notification: colors.light.accent,
  },
};

const DarkNavigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.dark.buttonPrimary,
    background: colors.dark.canvas,
    card: colors.dark.card,
    text: colors.dark.textPrimary,
    border: colors.dark.border,
    notification: colors.dark.accent,
  },
};

// ============================================================================
// PIN Entry and Placeholder screens
// ============================================================================

const PlaceholderScreen: React.FC<{ name: string }> = ({ name }) => {
  const { colors: themeColors } = useTheme();
  return (
    <SafeAreaView style={[styles.placeholder, { backgroundColor: themeColors.canvas }]}>
      <Text style={[styles.placeholderText, { color: themeColors.textPrimary, fontFamily: typography.fonts.medium }]}>
        {name}
      </Text>
    </SafeAreaView>
  );
};

const SplashScreenComponent = () => <PlaceholderScreen name="Life Tape" />;
const OnboardingScreen = () => <PlaceholderScreen name="Onboarding" />;
const AccountCreationScreen = () => <PlaceholderScreen name="Account Creation" />;
const TimelineBuilderScreen = () => <PlaceholderScreen name="Timeline Builder" />;
const SettingsScreen = () => <PlaceholderScreen name="Settings" />;
const TitlePreferenceScreen = () => <PlaceholderScreen name="Title Preference" />;
const ChangePasswordScreen = () => <PlaceholderScreen name="Change Password" />;
const PrivacySecurityScreen = () => <PlaceholderScreen name="Privacy & Security" />;
const ContactScreen = () => <PlaceholderScreen name="Contact" />;
const SendInviteScreen = () => <PlaceholderScreen name="Send Invite" />;
const DownloadStoryScreen = () => <PlaceholderScreen name="Download Story" />;

// ============================================================================
// Tab Navigator
// ============================================================================

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabs: React.FC = () => {
  const { colors: themeColors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: themeColors.card,
          borderTopColor: themeColors.divider,
          borderTopWidth: 1,
          height: dimensions.tabBarHeight,
          paddingBottom: Platform.OS === 'ios' ? spacing.lg : spacing.md,
          paddingTop: spacing.sm,
        },
        tabBarActiveTintColor: themeColors.tabActive,
        tabBarInactiveTintColor: themeColors.inactive,
        tabBarLabelStyle: {
          fontFamily: typography.fonts.medium,
          fontSize: typography.sizes.tab,
        },
        tabBarIcon: ({ focused, color }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          if (route.name === 'Record') iconName = focused ? 'mic' : 'mic-outline';
          else if (route.name === 'Timeline') iconName = focused ? 'time' : 'time-outline';
          else iconName = focused ? 'menu' : 'menu-outline';
          return <Ionicons name={iconName} size={dimensions.tabIconSize} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Record" component={RecordScreen} options={{ tabBarLabel: 'Record' }} />
      <Tab.Screen name="Timeline" component={TimelineScreen} options={{ tabBarLabel: 'Timeline' }} />
      <Tab.Screen name="Menu" component={MenuScreen} options={{ tabBarLabel: 'Menu' }} />
    </Tab.Navigator>
  );
};

// ============================================================================
// App Navigation with PIN gate
// ============================================================================

const AppNavigation: React.FC = () => {
  const { isDark } = useTheme();
  const { isAppUnlocked, hasAppPIN, lockApp, setLastBackgroundTime } = usePINStore();
  const { isOnboarded, hasCompletedTimeline } = useUserStore();
  const { loadEntries } = useAppStateStore();

  const [showPINEntry, setShowPINEntry] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // on app mount lock app and load entries
    lockApp();
    loadEntries();
    setIsInitialized(true);
  }, []);

  // handle background -> active transitions
  useEffect(() => {
    const handler = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        setLastBackgroundTime(Date.now());
      } else if (nextAppState === 'active') {
        if (hasAppPIN() && isOnboarded) {
          lockApp();
          setShowPINEntry(true);
        }
      }
    };

    const sub = AppState.addEventListener('change', handler);
    return () => sub.remove();
  }, [hasAppPIN, isOnboarded, lockApp, setLastBackgroundTime]);

  useEffect(() => {
    if (isInitialized && hasAppPIN() && !isAppUnlocked && isOnboarded) {
      setShowPINEntry(true);
    } else {
      setShowPINEntry(false);
    }
  }, [isInitialized, hasAppPIN, isAppUnlocked, isOnboarded]);

  const getInitialRoute = (): keyof RootStackParamList => {
    if (!isOnboarded) return 'Onboarding';
    if (!hasCompletedTimeline) return 'TimelineBuilder';
    return 'Main';
  };

  if (showPINEntry) {
    return (
      <PINEntryScreen
        mode="app"
        onSuccess={() => setShowPINEntry(false)}
        title="Welcome Back"
        subtitle="Enter your PIN to unlock Life Tape"
      />
    );
  }

  return (
    <NavigationContainer theme={isDark ? DarkNavigationTheme : LightNavigationTheme}>
      <Stack.Navigator
        initialRouteName={getInitialRoute()}
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreenComponent} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="AccountCreation" component={AccountCreationScreen} />
        <Stack.Screen name="TimelineBuilder" component={TimelineBuilderScreen} />
        <Stack.Screen name="PINSetup" component={() => <PINEntryScreen mode="setup" onSuccess={() => {}} />} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="DarkSide" component={DarkSideScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="TitlePreference" component={TitlePreferenceScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        <Stack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
        <Stack.Screen name="Contact" component={ContactScreen} />
        <Stack.Screen name="SendInvite" component={SendInviteScreen} />
        <Stack.Screen name="DownloadStory" component={DownloadStoryScreen} />
        <Stack.Screen name="EntryDetail" component={EntryDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// ============================================================================
// StatusBar manager and root App
// ============================================================================

const StatusBarManager: React.FC = () => {
  const { isDark } = useTheme();
  return <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />;
};

const App: React.FC = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const systemColorScheme = useColorScheme();

  useEffect(() => {
    const loadFonts = async () => {
      try {
        // load any fonts used by your theme; Aniron is optional; SF Pro you added to assets/fonts — load what you need
        await Font.loadAsync({
          Aniron: require('./assets/fonts/Aniron.ttf'),
          // optionally load SF-Pro files if you added them to /assets/fonts:
          // 'SF-Pro-Text-Regular': require('./assets/fonts/SF-Pro-Text-Regular.otf'),
        });
        setFontsLoaded(true);
      } catch (error) {
        console.error('Error loading fonts', error);
        setFontsLoaded(true); // don't block app if font fails
      }
    };

    loadFonts();
  }, []);

  useEffect(() => {
    const prepare = async () => {
      if (fontsLoaded) {
        setAppReady(true);
        try {
          await SplashScreen.hideAsync();
        } catch (_) {
          // expo-splash-screen hide may fail on web — ignore
        }
      }
    };
    prepare();
  }, [fontsLoaded]);

  if (!appReady) {
    const bgColor = systemColorScheme === 'dark' ? colors.dark.canvas : colors.light.canvas;
    const textColor = systemColorScheme === 'dark' ? colors.dark.textPrimary : colors.light.textPrimary;
    const buttonColor = colors.light.buttonPrimary;
    return (
      <View style={[styles.loadingContainer, { backgroundColor: bgColor }]}>
        <ActivityIndicator size="large" color={buttonColor} />
        <Text style={[styles.loadingText, { color: textColor }]}>Loading Life Tape...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <InternalThemeProvider>
        <StatusBarManager />
        <AppNavigation />
      </InternalThemeProvider>
    </SafeAreaProvider>
  );
};

// ============================================================================
// Styles (kept minimal)
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const KEYPAD_KEY_SIZE = Math.min((SCREEN_WIDTH - spacing.xl * 2 - spacing.md * 2) / 3, dimensions.pinKeySize);

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.lg,
    fontSize: typography.sizes.body,
    fontFamily: typography.fonts.regular,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: typography.sizes.h3,
  },
  pinContainer: {
    flex: 1,
  },
  pinContent: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  pinHeader: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  pinTitle: {
    fontSize: typography.sizes.h2,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  pinSubtitle: {
    fontSize: typography.sizes.body,
    textAlign: 'center',
    lineHeight: typography.sizes.body * typography.lineHeights.relaxed,
  },
  pinDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  pinDot: {
    width: dimensions.pinDotSize,
    height: dimensions.pinDotSize,
    borderRadius: dimensions.pinDotSize / 2,
    borderWidth: 2,
    marginHorizontal: dimensions.pinDotSpacing / 2,
  },
  pinError: {
    fontSize: typography.sizes.bodySmall,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  keypadContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: KEYPAD_KEY_SIZE * 3 + spacing.md * 2,
    marginTop: spacing.xl,
  },
  keypadKey: {
    width: KEYPAD_KEY_SIZE,
    height: KEYPAD_KEY_SIZE,
    borderRadius: KEYPAD_KEY_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    margin: spacing.xs,
    ...shadows.sm,
  },
  keypadKeyText: {
    fontSize: typography.sizes.h2,
  },
  keypadEmptySpace: {
    width: KEYPAD_KEY_SIZE,
    height: KEYPAD_KEY_SIZE,
    margin: spacing.xs,
  },
  pinCancelButton: {
    marginTop: spacing.xxl,
    padding: spacing.md,
  },
  pinCancelText: {
    fontSize: typography.sizes.body,
  },
});

// ============================================================================
// Exports
export { supabase };
export default App;
