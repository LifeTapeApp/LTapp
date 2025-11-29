// ============================================================================
// IMPORTS
// ============================================================================

import React, {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  ReactNode,
} from "react";

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
} from "react-native";

import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";

import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import Constants from "expo-constants";
import * as Font from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { Ionicons } from "@expo/vector-icons";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { supabase } from "./supabase";
import {
  colors,
  typography,
  spacing,
  radii,
  shadows,
  dimensions,
  animations,
  zIndex,
} from "./constants/theme";

// Prevent auto hide of the splash screen
SplashScreen.preventAutoHideAsync();

// ============================================================================
// DEBUG ENV (web-safe)
// ============================================================================

function DebugEnv() {
  // This avoids "Constants is not defined" errors on the web
  const cfg = Constants.expoConfig?.extra;
  console.log("Supabase URL:", cfg?.supabaseUrl);
  console.log("Supabase Key:", cfg?.supabaseAnonKey);
  return null;
}

// ============================================================================
// SUPABASE ZUSTAND STORAGE ADAPTER
// ============================================================================

const supabaseStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from("app_state")
        .select("value")
        .eq("key", name)
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
        .from("app_state")
        .upsert({ key: name, value: JSON.parse(value) });
    } catch (error) {
      console.error("supabaseStorage setItem error:", error);
    }
  },

  removeItem: async (name: string): Promise<void> => {
    try {
      await supabase.from("app_state").delete().eq("key", name);
    } catch (error) {
      console.error("supabaseStorage removeItem error:", error);
    }
  },
};
// ============================================================================
// ZUSTAND STORES
// ============================================================================

// ----------------------------
// THEME STORE
// ----------------------------
type ThemeState = {
  isDark: boolean;
  toggleTheme: () => void;
};

const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      isDark: false,
      toggleTheme: () => set({ isDark: !get().isDark }),
    }),
    {
      name: "life-tape-theme",
      storage: supabaseStorage,
    }
  )
);

// Wrapper to access theme values easily
const ThemeContext = createContext<any>(null);

const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { isDark } = useThemeStore();
  const themeColors = isDark ? colors.dark : colors.light;

  return (
    <ThemeContext.Provider value={{ isDark, colors: themeColors }}>
      {children}
    </ThemeContext.Provider>
  );
};

const useTheme = () => useContext(ThemeContext);

// ----------------------------
// USER STORE
// ----------------------------
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

// ----------------------------
// PIN STORE
// ----------------------------
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

// ----------------------------
// APP STATE STORE (entries, recordings, etc.)
// ----------------------------
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
// ============================================================================
// PLACEHOLDER SCREENS (minimal versions, safe to replace later)
// ============================================================================

const PlaceholderScreen: React.FC<{ name: string }> = ({ name }) => {
  const { colors: themeColors } = useTheme();

  return (
    <SafeAreaView
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: themeColors.canvas,
      }}
    >
      <Text
        style={{
          color: themeColors.textPrimary,
          fontFamily: typography.fonts.medium,
          fontSize: typography.sizes.h3,
        }}
      >
        {name}
      </Text>
    </SafeAreaView>
  );
};

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

// ============================================================================
// PIN SETUP SCREEN (uses your existing PINEntryScreen logic)
// ============================================================================

const PINSetupScreen: React.FC = () => (
  <PINEntryScreen
    mode="setup"
    onSuccess={() => {}}
    title="Secure Your Story"
    subtitle="Create a 6-digit PIN to protect your Life Tape"
  />
);

// ============================================================================
// NAVIGATION SETUP
// ============================================================================

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

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
          paddingBottom: Platform.OS === "ios" ? spacing.lg : spacing.md,
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

          switch (route.name) {
            case "Record":
              iconName = focused ? "mic" : "mic-outline";
              break;
            case "Timeline":
              iconName = focused ? "time" : "time-outline";
              break;
            default:
              iconName = focused ? "menu" : "menu-outline";
          }

          return <Ionicons name={iconName} size={dimensions.tabIconSize} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Record" component={RecordScreen} />
      <Tab.Screen name="Timeline" component={TimelineScreen} />
      <Tab.Screen name="Menu" component={MenuScreen} />
    </Tab.Navigator>
  );
};

// ============================================================================
// APP NAVIGATION + PIN LOCK SYSTEM
// ============================================================================

const AppNavigation: React.FC = () => {
  const { isDark } = useTheme();
  const { isAppUnlocked, hasAppPIN, lockApp, setLastBackgroundTime } = usePINStore();
  const { isOnboarded, hasCompletedTimeline } = useUserStore();
  const { loadEntries } = useAppStateStore();

  const [showPINEntry, setShowPINEntry] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Lock app on mount + load saved entries
  useEffect(() => {
    lockApp();
    loadEntries();
    setIsInitialized(true);
  }, []);

  // Lock when app goes background
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background") {
        setLastBackgroundTime(Date.now());
      }

      if (state === "active") {
        if (hasAppPIN() && isOnboarded) {
          lockApp();
          setShowPINEntry(true);
        }
      }
    });

    return () => sub.remove();
  }, [hasAppPIN, isOnboarded, lockApp, setLastBackgroundTime]);

  // Show PIN entry when needed
  useEffect(() => {
    if (isInitialized && hasAppPIN() && !isAppUnlocked && isOnboarded) {
      setShowPINEntry(true);
    } else {
      setShowPINEntry(false);
    }
  }, [isInitialized, hasAppPIN, isAppUnlocked, isOnboarded]);

  // Routing logic
  const getInitialRoute = () => {
    if (!isOnboarded) return "Onboarding";
    if (!hasCompletedTimeline) return "TimelineBuilder";
    return "Main";
  };

  // PIN lock screen
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
        screenOptions={{ headerShown: false, animation: "fade" }}
      >
        <Stack.Screen name="Splash" component={SplashScreenComponent} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="AccountCreation" component={AccountCreationScreen} />
        <Stack.Screen name="TimelineBuilder" component={TimelineBuilderScreen} />
        <Stack.Screen name="PINSetup" component={PINSetupScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="DarkSide" component={DarkSideScreen} />
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
      barStyle={isDark ? "light-content" : "dark-content"}
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

  // Load Fonts
  useEffect(() => {
    const loadFonts = async () => {
      try {
        await Font.loadAsync({
          Aniron: require("./assets/fonts/Aniron.ttf"),
        });
      } catch (error) {
        console.error("Error loading Aniron:", error);
      } finally {
        setFontsLoaded(true);
      }
    };

    loadFonts();
  }, []);

  // Hide Splash When Ready
  useEffect(() => {
    const prepare = async () => {
      if (fontsLoaded) {
        setAppReady(true);
        await SplashScreen.hideAsync();
      }
    };

    prepare();
  }, [fontsLoaded]);

  // Initial 'loading' fallback screen
  if (!appReady) {
    const bgColor =
      systemColorScheme === "dark" ? colors.dark.canvas : colors.light.canvas;
    const textColor =
      systemColorScheme === "dark"
        ? colors.dark.textPrimary
        : colors.light.textPrimary;

    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: bgColor,
        }}
      >
        <ActivityIndicator size="large" color={colors.light.buttonPrimary} />
        <Text
          style={{
            color: textColor,
            marginTop: spacing.lg,
            fontFamily: typography.fonts.regular,
            fontSize: typography.sizes.body,
          }}
        >
          Loading Life Tape...
        </Text>
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const KEYPAD_KEY_SIZE = Math.min(
  (SCREEN_WIDTH - spacing.xl * 2 - spacing.md * 2) / 3,
  dimensions.pinKeySize
);

const styles = StyleSheet.create({
  pinContainer: { flex: 1 },
  pinContent: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
  },
  pinHeader: { alignItems: "center", marginBottom: spacing.xxxl },
  pinTitle: { fontSize: typography.sizes.h2, marginBottom: spacing.sm, textAlign: "center" },
  pinSubtitle: {
    fontSize: typography.sizes.body,
    textAlign: "center",
    lineHeight: typography.sizes.body * typography.lineHeights.relaxed,
  },
  pinDotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
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
    textAlign: "center",
  },
  keypadContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    width: KEYPAD_KEY_SIZE * 3 + spacing.md * 2,
    marginTop: spacing.xl,
  },
  keypadKey: {
    width: KEYPAD_KEY_SIZE,
    height: KEYPAD_KEY_SIZE,
    borderRadius: KEYPAD_KEY_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    margin: spacing.xs,
    ...shadows.sm,
  },
  keypadKeyText: { fontSize: typography.sizes.h2 },
  keypadEmptySpace: {
    width: KEYPAD_KEY_SIZE,
    height: KEYPAD_KEY_SIZE,
    margin: spacing.xs,
  },
  pinCancelButton: { marginTop: spacing.xxl, padding: spacing.md },
  pinCancelText: { fontSize: typography.sizes.body },
});

// ============================================================================
// EXPORTS
// ============================================================================

export { DARK_SIDE_TRIGGERS, supabase };
export default App;
