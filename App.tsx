// App.tsx — final, cleaned, wired to your structure
import React, { useEffect, useState, useCallback, createContext, useContext, ReactNode } from 'react';
import Constants from 'expo-constants';
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

// project imports (paths you confirmed)
import { supabase } from './supabase';
import { usePINStore, useUserStore, useAppStateStore } from './stores'; // index exports stores
import {
  colors as themeColorsTokens,
  typography,
  spacing,
  dimensions,
  radii,
  shadows,
} from './constants/theme';

// screens (you confirmed these six exist)
import RecordScreen from './screens/RecordScreen';
import TimelineScreen from './screens/TimelineScreen';
import EntryDetailScreen from './screens/EntryDetailScreen';
import DarkSideScreen from './screens/DarkSideScreen';
import MenuScreen from './screens/MenuScreen';
import PINEntryScreen from './screens/PINEntryScreen';

// Keep splash until fonts/initialization done
SplashScreen.preventAutoHideAsync();

// -----------------------------
// Small Theme wrapper so other screens can `import { useTheme } from '../App'`
// (This allows gradual migration — you may remove later)
type ColorMode = 'light' | 'dark' | 'system';
type ThemeState = {
  colorMode: ColorMode;
  isDark: boolean;
  colors: typeof themeColorsTokens.light | typeof themeColorsTokens.dark;
  setColorMode: (m: ColorMode) => void;
  toggleColorMode: () => void;
};
const InternalThemeContext = createContext<ThemeState | undefined>(undefined);

export const useTheme = (): ThemeState => {
  const ctx = useContext(InternalThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
};

// We use the ThemeProvider exported from constants/theme for tokens (colors etc.).
// Wrap it and provide `useTheme` context so screens depending on that hook keep working.
const AppThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const system = useColorScheme();
  const [colorMode, setColorMode] = useState<ColorMode>('system');

  useEffect(() => {
    // Optionally: load saved color mode from persistent store
  }, []);

  const setColorMode = useCallback((m: ColorMode) => {
    setColorMode(m);
  }, []);

  const toggleColorMode = useCallback(() => {
    setColorMode((prev) => (prev === 'light' ? 'dark' : prev === 'dark' ? 'system' : 'light'));
  }, []);

  const isDark = colorMode === 'system' ? system === 'dark' : colorMode === 'dark';
  const colors = isDark ? themeColorsTokens.dark : themeColorsTokens.light;

  return (
    <InternalThemeContext.Provider value={{ colorMode, isDark, colors, setColorMode, toggleColorMode }}>
      <ExternalThemeProvider>{children}</ExternalThemeProvider>
    </InternalThemeContext.Provider>
  );
};

// -----------------------------
// Fonts to load (ensure files exist in ./assets/fonts)
const loadFonts = () =>
  Font.loadAsync({
    Aniron: require('./assets/fonts/Aniron.ttf'),
    'SF Pro Text': require('./assets/fonts/SF-Pro-Text-Regular.otf'),
    'SF Pro Text Medium': require('./assets/fonts/SF-Pro-Text-Medium.otf'),
    'SF Pro Text Semibold': require('./assets/fonts/SF-Pro-Text-Semibold.otf'),
    'SF Pro Text Bold': require('./assets/fonts/SF-Pro-Text-Bold.otf'),
    'SF Pro Text Light': require('./assets/fonts/SF-Pro-Text-Light.otf'),
    'SF Pro Text Thin': require('./assets/fonts/SF-Pro-Text-Thin.otf'),
    'SF Pro Text Black': require('./assets/fonts/SF-Pro-Text-Black.otf'),
  });

// -----------------------------
// Small debug helper (safe)
function DebugEnv() {
  useEffect(() => {
    if (__DEV__) {
      console.log('ENV supabase url:', Constants.expoConfig?.extra?.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL);
      console.log('ENV supabase key present?', Boolean(Constants.expoConfig?.extra?.supabaseAnonKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY));
    }
  }, []);
  return null;
}

// -----------------------------
// PIN entry kept in its own screen (you already moved it to /screens)
// -----------------------------

// -----------------------------
// Navigation types
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
export type MainTabParamList = { Record: undefined; Timeline: undefined; Menu: undefined; };

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// -----------------------------
// Main Tabs
const MainTabs: React.FC = () => {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.divider,
          borderTopWidth: 1,
          height: dimensions.tabBarHeight,
          paddingBottom: Platform.OS === 'ios' ? spacing.lg : spacing.md,
          paddingTop: spacing.sm,
        },
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.inactive,
        tabBarLabelStyle: { fontFamily: typography.fonts.medium, fontSize: typography.sizes.tab },
        tabBarIcon: ({ focused, color }) => {
          let icon: keyof typeof Ionicons.glyphMap = 'menu';
          // @ts-ignore route available
          const name = (route as any).name;
          if (name === 'Record') icon = focused ? 'mic' : 'mic-outline';
          else if (name === 'Timeline') icon = focused ? 'time' : 'time-outline';
          else icon = focused ? 'menu' : 'menu-outline';
          return <Ionicons name={icon} size={dimensions.tabIconSize} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Record" component={RecordScreen} options={{ tabBarLabel: 'Record' }} />
      <Tab.Screen name="Timeline" component={TimelineScreen} options={{ tabBarLabel: 'Timeline' }} />
      <Tab.Screen name="Menu" component={MenuScreen} options={{ tabBarLabel: 'Menu' }} />
    </Tab.Navigator>
  );
};

// -----------------------------
// App navigation with PIN gating and simple placeholders for missing screens
const AppNavigation: React.FC = () => {
  const { isDark } = useTheme();
  const pinStore = usePINStore();
  const userStore = useUserStore();
  const appStateStore = useAppStateStore();

  const { isAppUnlocked, hasAppPIN, lockApp, setLastBackgroundTime } = pinStore;
  const { isOnboarded, hasCompletedTimeline } = userStore;
  const { loadEntries } = appStateStore;

  const [showPINEntry, setShowPINEntry] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // initial lock + load
    try { lockApp(); } catch {}
    loadEntries?.();
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    const handle = (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') {
        setLastBackgroundTime(Date.now());
      } else if (next === 'active') {
        if (hasAppPIN() && isOnboarded) {
          lockApp();
          setShowPINEntry(true);
        }
      }
    };
    const sub = AppState.addEventListener('change', handle);
    return () => sub.remove();
  }, [hasAppPIN, isOnboarded, lockApp, setLastBackgroundTime]);

  useEffect(() => {
    if (isInitialized && hasAppPIN() && !isAppUnlocked && isOnboarded) setShowPINEntry(true);
    else setShowPINEntry(false);
  }, [isInitialized, hasAppPIN, isAppUnlocked, isOnboarded]);

  const getInitial = (): keyof RootStackParamList => {
    if (!isOnboarded) return 'Onboarding';
    if (!hasCompletedTimeline) return 'TimelineBuilder';
    return 'Main';
  };

  if (showPINEntry) {
    return <PINEntryScreen mode="app" onSuccess={() => setShowPINEntry(false)} title="Welcome Back" subtitle="Enter your PIN to unlock Life Tape" />;
  }

  return (
    <NavigationContainer theme={isDark ? DarkNavigationTheme : LightNavigationTheme}>
      <Stack.Navigator initialRouteName={getInitial()} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={() => <SafeAreaView style={{flex:1,justifyContent:'center',alignItems:'center'}}><Text>Life Tape</Text></SafeAreaView>} />
        <Stack.Screen name="Onboarding" component={() => <SafeAreaView style={{flex:1,justifyContent:'center',alignItems:'center'}}><Text>Onboarding</Text></SafeAreaView>} />
        <Stack.Screen name="AccountCreation" component={() => <SafeAreaView style={{flex:1,justifyContent:'center',alignItems:'center'}}><Text>Account Creation</Text></SafeAreaView>} />
        <Stack.Screen name="TimelineBuilder" component={() => <SafeAreaView style={{flex:1,justifyContent:'center',alignItems:'center'}}><Text>Timeline Builder</Text></SafeAreaView>} />
        <Stack.Screen name="PINSetup" component={() => <PINEntryScreen mode="setup" onSuccess={() => {}} />} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="DarkSide" component={DarkSideScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Settings" component={() => <SafeAreaView style={{flex:1,justifyContent:'center',alignItems:'center'}}><Text>Settings</Text></SafeAreaView>} />
        <Stack.Screen name="TitlePreference" component={() => <SafeAreaView style={{flex:1,justifyContent:'center',alignItems:'center'}}><Text>Title Preference</Text></SafeAreaView>} />
        <Stack.Screen name="ChangePassword" component={() => <SafeAreaView style={{flex:1,justifyContent:'center',alignItems:'center'}}><Text>Change Password</Text></SafeAreaView>} />
        <Stack.Screen name="PrivacySecurity" component={() => <SafeAreaView style={{flex:1,justifyContent:'center',alignItems:'center'}}><Text>Privacy & Security</Text></SafeAreaView>} />
        <Stack.Screen name="Contact" component={() => <SafeAreaView style={{flex:1,justifyContent:'center',alignItems:'center'}}><Text>Contact</Text></SafeAreaView>} />
        <Stack.Screen name="SendInvite" component={() => <SafeAreaView style={{flex:1,justifyContent:'center',alignItems:'center'}}><Text>Send Invite</Text></SafeAreaView>} />
        <Stack.Screen name="DownloadStory" component={() => <SafeAreaView style={{flex:1,justifyContent:'center',alignItems:'center'}}><Text>Download Story</Text></SafeAreaView>} />
        <Stack.Screen name="EntryDetail" component={EntryDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// navigation themes
const LightNavigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: themeColorsTokens.light.buttonPrimary,
    background: themeColorsTokens.light.canvas,
    card: themeColorsTokens.light.card,
    text: themeColorsTokens.light.textPrimary,
    border: themeColorsTokens.light.border,
    notification: themeColorsTokens.light.accent,
  },
};
const DarkNavigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: themeColorsTokens.dark.buttonPrimary,
    background: themeColorsTokens.dark.canvas,
    card: themeColorsTokens.dark.card,
    text: themeColorsTokens.dark.textPrimary,
    border: themeColorsTokens.dark.border,
    notification: themeColorsTokens.dark.accent,
  },
};

// -----------------------------
// App root
const App: React.FC = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const systemColorScheme = useColorScheme();

  useEffect(() => {
    (async () => {
      try {
        await loadFonts();
      } catch (err) {
        console.warn('fonts failed', err);
      } finally {
        setFontsLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (fontsLoaded) {
        setAppReady(true);
        try { await SplashScreen.hideAsync(); } catch {}
      }
    })();
  }, [fontsLoaded]);

  if (!appReady) {
    const bg = systemColorScheme === 'dark' ? themeColorsTokens.dark.canvas : themeColorsTokens.light.canvas;
    const text = systemColorScheme === 'dark' ? themeColorsTokens.dark.textPrimary : themeColorsTokens.light.textPrimary;
    const button = themeColorsTokens.light.buttonPrimary;
    return (
      <View style={[styles.loadingContainer, { backgroundColor: bg }]}>
        <ActivityIndicator size="large" color={button} />
        <Text style={[styles.loadingText, { color: text }]}>Loading Life Tape...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <DebugEnv />
        <StatusBar barStyle={systemColorScheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        <AppNavigation />
      </AppThemeProvider>
    </SafeAreaProvider>
  );
};

// -----------------------------
// Styles
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const KEYPAD_KEY_SIZE = Math.min((SCREEN_WIDTH - spacing.xl * 2 - spacing.md * 2) / 3, dimensions.pinKeySize);

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: spacing.lg, fontSize: typography.sizes.body, fontFamily: typography.fonts.regular },
  // (PIN / keypad / small pieces kept in each screen)
});

export { supabase };
export default App;
