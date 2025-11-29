import React from 'react';
import { View } from 'react-native';
import Constants from 'expo-constants';

// Debug only inside the component (after Expo initializes)
function DebugEnv() {
  console.log("Supabase URL:", Constants.expoConfig?.extra?.supabaseUrl);
  console.log("Supabase Key:", Constants.expoConfig?.extra?.supabaseAnonKey);
  return null;
}

/**
 * Life Tape - Root Application
 * Voice-first, hands-free autobiography app
 */

import {
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

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Ionicons } from '@expo/vector-icons';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { supabase } from './supabase';
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

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// ============================================================================
// SUPABASE STORAGE ADAPTER FOR ZUSTAND
// ============================================================================

const supabaseStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('app_state')
        .select('value')
        .eq('key', name)
        .single();
      if (error || !data) return null;
      return JSON.stringify(data.value);
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await supabase
        .from('app_state')
        .upsert({ key: name, value: JSON.parse(value) });
    } catch (error) {
      console.error('supabaseStorage setItem error:', error);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await supabase.from('app_state').delete().eq('key', name);
    } catch (error) {
      console.error('supabaseStorage removeItem error:', error);
    }
  },
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type ColorMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  colorMode: ColorMode;
  isDark: boolean;
  colors: typeof colors.light | typeof colors.dark;
  setColorMode: (mode: ColorMode) => void;
  toggleColorMode: () => void;
}

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
  setUser: (userId: string, email: string, displayName?: string) => void;
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

// Navigation Types
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

// Dark side trigger phrases
const DARK_SIDE_TRIGGERS = ['real talk', 'truth', 'dark', 'brutal', 'fuck it'];

// ============================================================================
// ZUSTAND STORES
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

      setUser: (userId: string, email: string, displayName?: string) =>
        set({ userId, email, displayName: displayName || null }),

      setTitlePreference: (pref: 'ai' | 'manual') => set({ titlePreference: pref }),

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

      setListening: (value: boolean) => set({ isListening: value }),
      setRecording: (value: boolean) => set({ isRecording: value }),
      setCurrentTag: (tag: string | null) => set({ currentTag: tag }),
      setWakeWordDetected: (value: boolean) => set({ wakeWordDetected: value }),
      setSilenceTimer: (value: number) => set({ silenceTimer: value }),

      addEntry: async (entry: RecordingEntry) => {
        const { data, error } = await supabase
          .from('entries')
          .insert(entry)
          .select()
          .single();

        if (error) {
          console.error('addEntry error:', error);
          // Fallback to local state
          set((state) => ({ entries: [entry, ...state.entries] }));
        } else if (data) {
          set((state) => ({ entries: [data, ...state.entries] }));
        }
      },

      updateEntry: async (id: string, updates: Partial<RecordingEntry>) => {
        const { data, error } = await supabase
          .from('entries')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('updateEntry error:', error);
          // Fallback to local state
          set((state) => ({
            entries: state.entries.map((e) => (e.id === id ? { ...e, ...updates } : e)),
          }));
        } else if (data) {
          set((state) => ({
            entries: state.entries.map((e) => (e.id === id ? data : e)),
          }));
        }
      },

      deleteEntry: async (id: string) => {
        const { error } = await supabase.from('entries').delete().eq('id', id);

        if (error) {
          console.error('deleteEntry error:', error);
        }
        // Always update local state
        set((state) => ({ entries: state.entries.filter((e) => e.id !== id) }));
      },

      loadEntries: async () => {
        const { data, error } = await supabase
          .from('entries')
          .select('*')
          .order('createdAt', { ascending: false });

        if (error) {
          console.error('loadEntries error:', error);
        } else if (data) {
          set({ entries: data });
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
// THEME CONTEXT
// ============================================================================

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [colorMode, setColorModeState] = useState<ColorMode>('system');

  useEffect(() => {
    const loadColorMode = async () => {
      try {
        const stored = await supabaseStorage.getItem('life-tape-color-mode');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (['light', 'dark', 'system'].includes(parsed)) {
            setColorModeState(parsed as ColorMode);
          }
        }
      } catch (error) {
        console.error('Failed to load color mode:', error);
      }
    };
    loadColorMode();
  }, []);

  const setColorMode = useCallback(async (mode: ColorMode) => {
    setColorModeState(mode);
    try {
      await supabaseStorage.setItem('life-tape-color-mode', JSON.stringify(mode));
    } catch (error) {
      console.error('Failed to save color mode:', error);
    }
  }, []);

  const toggleColorMode = useCallback(() => {
    const nextMode = colorMode === 'light' ? 'dark' : colorMode === 'dark' ? 'system' : 'light';
    setColorMode(nextMode);
  }, [colorMode, setColorMode]);

  const isDark = colorMode === 'system' ? systemColorScheme === 'dark' : colorMode === 'dark';
  const currentColors = isDark ? colors.dark : colors.light;

  const value: ThemeContextType = {
    colorMode,
    isDark,
    colors: currentColors,
    setColorMode,
    toggleColorMode,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

// ============================================================================
// NAVIGATION THEMES
// ============================================================================

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
// PIN ENTRY COMPONENT
// ============================================================================

interface PINEntryScreenProps {
  mode: 'app' | 'darkSide' | 'setup' | 'darkSideSetup';
  onSuccess: () => void;
  onCancel?: () => void;
  title?: string;
  subtitle?: string;
}

export const PINEntryScreen: React.FC<PINEntryScreenProps> = ({
  mode,
  onSuccess,
  onCancel,
  title,
  subtitle,
}) => {
  const { colors: themeColors } = useTheme();
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    verifyAppPIN,
    verifyDarkSidePIN,
    setAppPIN,
    setDarkSidePIN,
    unlockApp,
    unlockDarkSide,
  } = usePINStore();

  const isSetup = mode === 'setup' || mode === 'darkSideSetup';
  const maxLength = 6;

  const displayTitle =
    title ||
    (isSetup
      ? mode === 'setup'
        ? 'Create Your PIN'
        : 'Create Dark Side PIN'
      : mode === 'app'
      ? 'Enter Your PIN'
      : 'Enter Dark Side PIN');

  const displaySubtitle =
    subtitle ||
    (isSetup
      ? isConfirming
        ? 'Confirm your 6-digit PIN'
        : 'Enter a 6-digit PIN to secure your Life Tape'
      : 'Enter your 6-digit PIN to continue');

  const handleKeyPress = useCallback(
    (key: string) => {
      Vibration.vibrate(10);
      setError(null);

      if (key === 'delete') {
        if (isConfirming) {
          setConfirmPin((prev) => prev.slice(0, -1));
        } else {
          setPin((prev) => prev.slice(0, -1));
        }
        return;
      }

      const currentPin = isConfirming ? confirmPin : pin;
      if (currentPin.length >= maxLength) return;

      const newPin = currentPin + key;

      if (isConfirming) {
        setConfirmPin(newPin);

        if (newPin.length === maxLength) {
          if (newPin === pin) {
            if (mode === 'setup') {
              setAppPIN(newPin);
              unlockApp();
            } else {
              setDarkSidePIN(newPin);
              unlockDarkSide();
            }
            onSuccess();
          } else {
            setError('PINs do not match. Try again.');
            setConfirmPin('');
            Vibration.vibrate([0, 50, 50, 50]);
          }
        }
      } else {
        setPin(newPin);

        if (isSetup) {
          if (newPin.length === maxLength) {
            setIsConfirming(true);
          }
        } else {
          if (newPin.length === maxLength) {
            const isValid = mode === 'app' ? verifyAppPIN(newPin) : verifyDarkSidePIN(newPin);

            if (isValid) {
              if (mode === 'app') {
                unlockApp();
              } else {
                unlockDarkSide();
              }
              onSuccess();
            } else {
              setError('Incorrect PIN. Try again.');
              setPin('');
              Vibration.vibrate([0, 50, 50, 50]);
            }
          }
        }
      }
    },
    [
      pin,
      confirmPin,
      isConfirming,
      isSetup,
      mode,
      verifyAppPIN,
      verifyDarkSidePIN,
      setAppPIN,
      setDarkSidePIN,
      unlockApp,
      unlockDarkSide,
      onSuccess,
    ]
  );

  const currentPin = isConfirming ? confirmPin : pin;
  const keypadNumbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'];

  return (
    <SafeAreaView style={[styles.pinContainer, { backgroundColor: themeColors.canvas }]}>
      <View style={[styles.pinContent, { paddingTop: insets.top + spacing.xl }]}>
        <View style={styles.pinHeader}>
          <Text
            style={[
              styles.pinTitle,
              { color: themeColors.textPrimary, fontFamily: typography.fonts.bold },
            ]}
          >
            {displayTitle}
          </Text>
          <Text
            style={[
              styles.pinSubtitle,
              { color: themeColors.textSecondary, fontFamily: typography.fonts.regular },
            ]}
          >
            {displaySubtitle}
          </Text>
        </View>

        <View style={styles.pinDotsContainer}>
          {Array.from({ length: maxLength }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.pinDot,
                {
                  backgroundColor:
                    index < currentPin.length ? themeColors.buttonPrimary : 'transparent',
                  borderColor:
                    index < currentPin.length ? themeColors.buttonPrimary : themeColors.border,
                },
              ]}
            />
          ))}
        </View>

        {error && (
          <Text
            style={[
              styles.pinError,
              { color: themeColors.error, fontFamily: typography.fonts.medium },
            ]}
          >
            {error}
          </Text>
        )}

        <View style={styles.keypadContainer}>
          {keypadNumbers.map((key, index) => {
            if (key === '') {
              return <View key={index} style={styles.keypadEmptySpace} />;
            }

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.keypadKey,
                  {
                    backgroundColor: themeColors.card,
                  },
                ]}
                onPress={() => handleKeyPress(key)}
                activeOpacity={0.7}
              >
                {key === 'delete' ? (
                  <Ionicons name="backspace-outline" size={28} color={themeColors.textPrimary} />
                ) : (
                  <Text
                    style={[
                      styles.keypadKeyText,
                      { color: themeColors.textPrimary, fontFamily: typography.fonts.medium },
                    ]}
                  >
                    {key}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {onCancel && (
          <TouchableOpacity style={styles.pinCancelButton} onPress={onCancel}>
            <Text
              style={[
                styles.pinCancelText,
                { color: themeColors.buttonPrimary, fontFamily: typography.fonts.medium },
              ]}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

// ============================================================================
// PLACEHOLDER SCREENS
// ============================================================================

const PlaceholderScreen: React.FC<{ name: string }> = ({ name }) => {
  const { colors: themeColors } = useTheme();
  return (
    <SafeAreaView style={[styles.placeholder, { backgroundColor: themeColors.canvas }]}>
      <Text
        style={[
          styles.placeholderText,
          { color: themeColors.textPrimary, fontFamily: typography.fonts.medium },
        ]}
      >
        {name}
      </Text>
    </SafeAreaView>
  );
};

// Import actual screens or use placeholders
const SplashScreenComponent = () => <PlaceholderScreen name="Life Tape" />;
const OnboardingScreen = () => <PlaceholderScreen name="Onboarding" />;
const AccountCreationScreen = () => <PlaceholderScreen name="Account Creation" />;
const TimelineBuilderScreen = () => <PlaceholderScreen name="Timeline Builder" />;
const RecordScreen = () => <PlaceholderScreen name="Record" />;
const TimelineScreen = () => <PlaceholderScreen name="Timeline" />;
const MenuScreen = () => <PlaceholderScreen name="Menu" />;
const DarkSideScreen = () => <PlaceholderScreen name="Dark Side" />;
const SettingsScreen = () => <PlaceholderScreen name="Settings" />;
const TitlePreferenceScreen = () => <PlaceholderScreen name="Title Preference" />;
const ChangePasswordScreen = () => <PlaceholderScreen name="Change Password" />;
const PrivacySecurityScreen = () => <PlaceholderScreen name="Privacy & Security" />;
const ContactScreen = () => <PlaceholderScreen name="Contact" />;
const SendInviteScreen = () => <PlaceholderScreen name="Send Invite" />;
const DownloadStoryScreen = () => <PlaceholderScreen name="Download Story" />;
const EntryDetailScreen = () => <PlaceholderScreen name="Entry Detail" />;

// PINSetup Screen Component
const PINSetupScreen: React.FC = () => {
  return (
    <PINEntryScreen
      mode="setup"
      onSuccess={() => {}}
      title="Secure Your Story"
      subtitle="Create a 6-digit PIN to protect your Life Tape"
    />
  );
};

// ============================================================================
// NAVIGATORS
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

          if (route.name === 'Record') {
            iconName = focused ? 'mic' : 'mic-outline';
          } else if (route.name === 'Timeline') {
            iconName = focused ? 'time' : 'time-outline';
          } else {
            iconName = focused ? 'menu' : 'menu-outline';
          }

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
// APP NAVIGATION WITH PIN GATE
// ============================================================================

const AppNavigation: React.FC = () => {
  const { isDark } = useTheme();
  const { isAppUnlocked, hasAppPIN, lockApp, setLastBackgroundTime } = usePINStore();
  const { isOnboarded, hasCompletedTimeline } = useUserStore();
  const { loadEntries } = useAppStateStore();
  const [showPINEntry, setShowPINEntry] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Lock app on mount and load entries
  useEffect(() => {
    lockApp();
    loadEntries();
    setIsInitialized(true);
  }, []);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        setLastBackgroundTime(Date.now());
      } else if (nextAppState === 'active') {
        if (hasAppPIN() && isOnboarded) {
          lockApp();
          setShowPINEntry(true);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [hasAppPIN, isOnboarded, lockApp, setLastBackgroundTime]);

  // Show PIN entry if needed
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
        <Stack.Screen name="PINSetup" component={PINSetupScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen
          name="DarkSide"
          component={DarkSideScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
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
// STATUS BAR MANAGER
// ============================================================================

const StatusBarManager: React.FC = () => {
  const { isDark } = useTheme();

  return (
    <StatusBar
      barStyle={isDark ? 'light-content' : 'dark-content'}
      backgroundColor="transparent"
      translucent
    />
  );
};

// ============================================================================
// ROOT APP COMPONENT
// ============================================================================

const App: React.FC = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const systemColorScheme = useColorScheme();

  useEffect(() => {
    const loadFonts = async () => {
      try {
        await Font.loadAsync({
          Aniron: require('./assets/fonts/Aniron.ttf'),
        });
        setFontsLoaded(true);
      } catch (error) {
        console.error('Error loading Aniron:', error);
        setFontsLoaded(true);
      }
    };

    loadFonts();
  }, []);

  useEffect(() => {
    const prepare = async () => {
      if (fontsLoaded) {
        setAppReady(true);
        await SplashScreen.hideAsync();
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
      <ThemeProvider>
        <StatusBarManager />
        <AppNavigation />
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const KEYPAD_KEY_SIZE = Math.min(
  (SCREEN_WIDTH - spacing.xl * 2 - spacing.md * 2) / 3,
  dimensions.pinKeySize
);

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
// EXPORTS
// ============================================================================

export { DARK_SIDE_TRIGGERS, supabase };
export default App;
