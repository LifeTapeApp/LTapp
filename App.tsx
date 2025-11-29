// App.tsx - chunk 1/5
import React, {
  useEffect,
  useState,
  useCallback,
  createContext,
  useContext,
  ReactNode,
} from 'react';
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

// app client & stores (ensure these files export the names used)
import { supabase } from './supabase';
import { usePINStore } from './stores/pinStore';
import { useUserStore } from './stores/userStore';
import { useAppStateStore } from './stores/appStateStore';

// theme constants
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

// real screens
import RecordScreen from './screens/RecordScreen';
import TimelineScreen from './screens/TimelineScreen';
import MenuScreen from './screens/MenuScreen';
import DarkSideScreen from './screens/DarkSideScreen';
import EntryDetailScreen from './screens/EntryDetailScreen';

// Prevent splash from auto-hiding until fonts & init done
SplashScreen.preventAutoHideAsync();

// -----------------------------
// Fonts loader (SF Pro Text mapping confirmed)
// -----------------------------
const loadAppFonts = async () =>
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
// Debug helper (safe, optional)
// -----------------------------
function DebugEnv() {
  useEffect(() => {
    if (__DEV__) {
      console.log('Supabase URL:', Constants.expoConfig?.extra?.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL);
      console.log('Supabase Key present?', Boolean(Constants.expoConfig?.extra?.supabaseAnonKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY));
    }
  }, []);
  return null;
}

// -----------------------------
// Theme context provider
// -----------------------------
type ColorMode = 'light' | 'dark' | 'system';
interface ThemeContextType {
  colorMode: ColorMode;
  isDark: boolean;
  colors: typeof colors.light | typeof colors.dark;
  setColorMode: (m: ColorMode) => void;
  toggleColorMode: () => void;
}
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const system = useColorScheme();
  const [colorMode, setColorModeState] = useState<ColorMode>('system');

  useEffect(() => {
    // If you persist color mode in store, load here and setColorModeState.
  }, []);

  const setColorMode = useCallback((mode: ColorMode) => {
    setColorModeState(mode);
    // persist if desired
  }, []);

  const toggleColorMode = useCallback(() => {
    const next = colorMode === 'light' ? 'dark' : colorMode === 'dark' ? 'system' : 'light';
    setColorModeState(next);
  }, [colorMode]);

  const isDark = colorMode === 'system' ? system === 'dark' : colorMode === 'dark';
  const currentColors = isDark ? colors.dark : colors.light;

  return (
    <ThemeContext.Provider value={{ colorMode, isDark, colors: currentColors, setColorMode, toggleColorMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
// App.tsx - chunk 2/5

// -----------------------------
// PIN entry component (keeps your existing logic)
// -----------------------------
interface PINEntryScreenProps {
  mode: 'app' | 'darkSide' | 'setup' | 'darkSideSetup';
  onSuccess: () => void;
  onCancel?: () => void;
  title?: string;
  subtitle?: string;
}

export const PINEntryScreen: React.FC<PINEntryScreenProps> = ({ mode, onSuccess, onCancel, title, subtitle }) => {
  const { colors: themeColors } = useTheme();
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
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

  const displayTitle = title || (isSetup ? (mode === 'setup' ? 'Create Your PIN' : 'Create Dark Side PIN') : mode === 'app' ? 'Enter Your PIN' : 'Enter Dark Side PIN');
  const displaySubtitle = subtitle || (isSetup ? (isConfirming ? 'Confirm your 6-digit PIN' : 'Enter a 6-digit PIN to secure your Life Tape') : 'Enter your 6-digit PIN to continue');

  const handleKeyPress = useCallback((key: string) => {
    Vibration.vibrate(10);
    setError(null);
    if (key === 'delete') {
      if (isConfirming) setConfirmPin((p) => p.slice(0, -1));
      else setPin((p) => p.slice(0, -1));
      return;
    }
    const current = isConfirming ? confirmPin : pin;
    if (current.length >= maxLength) return;
    const next = current + key;
    if (isConfirming) {
      setConfirmPin(next);
      if (next.length === maxLength) {
        if (next === pin) {
          if (mode === 'setup') { setAppPIN(next); unlockApp(); } else { setDarkSidePIN(next); unlockDarkSide(); }
          onSuccess();
        } else {
          setError('PINs do not match. Try again.'); setConfirmPin(''); Vibration.vibrate([0, 50, 50]);
        }
      }
    } else {
      setPin(next);
      if (isSetup && next.length === maxLength) setIsConfirming(true);
      if (!isSetup && next.length === maxLength) {
        const valid = mode === 'app' ? verifyAppPIN(next) : verifyDarkSidePIN(next);
        if (valid) { if (mode === 'app') unlockApp(); else unlockDarkSide(); onSuccess(); }
        else { setError('Incorrect PIN. Try again.'); setPin(''); Vibration.vibrate([0, 50, 50]); }
      }
    }
  }, [pin, confirmPin, isConfirming, isSetup, mode, verifyAppPIN, verifyDarkSidePIN, setAppPIN, setDarkSidePIN, unlockApp, unlockDarkSide, onSuccess]);

  const currentPin = isConfirming ? confirmPin : pin;
  const keypadNumbers = ['1','2','3','4','5','6','7','8','9','','0','delete'];

  return (
    <SafeAreaView style={[styles.pinContainer, { backgroundColor: themeColors.canvas }]}>
      <View style={[styles.pinContent, { paddingTop: insets.top + spacing.xl }]}>
        <View style={styles.pinHeader}>
          <Text style={[styles.pinTitle, { color: themeColors.textPrimary, fontFamily: typography.fonts.bold }]}>{displayTitle}</Text>
          <Text style={[styles.pinSubtitle, { color: themeColors.textSecondary, fontFamily: typography.fonts.regular }]}>{displaySubtitle}</Text>
        </View>

        <View style={styles.pinDotsContainer}>
          {Array.from({ length: maxLength }).map((_, i) => (
            <View key={i} style={[styles.pinDot, { backgroundColor: i < currentPin.length ? themeColors.buttonPrimary : 'transparent', borderColor: i < currentPin.length ? themeColors.buttonPrimary : themeColors.border }]} />
          ))}
        </View>

        {error && <Text style={[styles.pinError, { color: themeColors.error, fontFamily: typography.fonts.medium }]}>{error}</Text>}

        <View style={styles.keypadContainer}>
          {keypadNumbers.map((k, idx) => k === '' ? <View key={idx} style={styles.keypadEmptySpace} /> : (
            <TouchableOpacity key={idx} style={[styles.keypadKey, { backgroundColor: themeColors.card }]} onPress={() => handleKeyPress(k)} activeOpacity={0.75}>
              {k === 'delete' ? <Ionicons name="backspace-outline" size={28} color={themeColors.textPrimary} /> : <Text style={[styles.keypadKeyText, { color: themeColors.textPrimary, fontFamily: typography.fonts.medium }]}>{k}</Text>}
            </TouchableOpacity>
          ))}
        </View>

        {onCancel && <TouchableOpacity style={styles.pinCancelButton} onPress={onCancel}><Text style={[styles.pinCancelText, { color: themeColors.buttonPrimary, fontFamily: typography.fonts.medium }]}>Cancel</Text></TouchableOpacity>}
      </View>
    </SafeAreaView>
  );
};

// -----------------------------
// Navigation types & MainTabs
// -----------------------------
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
        tabBarLabelStyle: { fontFamily: typography.fonts.medium, fontSize: typography.sizes.tab },
        tabBarIcon: ({ focused, color }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'menu';
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
// App.tsx - chunk 3/5

// Navigation theme objects (light/dark)
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

// App navigation with PIN gating and initial load
const AppNavigation: React.FC = () => {
  const { isDark } = useTheme();
  const { isAppUnlocked, hasAppPIN, lockApp, setLastBackgroundTime } = usePINStore();
  const { isOnboarded, hasCompletedTimeline } = useUserStore();
  const { loadEntries } = useAppStateStore();
  const [showPINEntry, setShowPINEntry] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // initial lock & load
    lockApp();
    loadEntries?.();
    setIsInitialized(true);
  }, []);

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
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [hasAppPIN, isOnboarded, lockApp, setLastBackgroundTime]);

  useEffect(() => {
    if (isInitialized && hasAppPIN() && !isAppUnlocked && isOnboarded) setShowPINEntry(true);
    else setShowPINEntry(false);
  }, [isInitialized, hasAppPIN, isAppUnlocked, isOnboarded]);

  const getInitialRoute = (): keyof RootStackParamList => {
    if (!isOnboarded) return 'Onboarding';
    if (!hasCompletedTimeline) return 'TimelineBuilder';
    return 'Main';
  };

  if (showPINEntry) {
    return <PINEntryScreen mode="app" onSuccess={() => setShowPINEntry(false)} title="Welcome Back" subtitle="Enter your PIN to unlock Life Tape" />;
  }

  return (
    <NavigationContainer theme={isDark ? DarkNavigationTheme : LightNavigationTheme}>
      <Stack.Navigator initialRouteName={getInitialRoute()} screenOptions={{ headerShown: false, animation: 'fade' }}>
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

// Status bar manager
const StatusBarManager: React.FC = () => {
  const { isDark } = useTheme();
  return <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />;
};
// App.tsx - chunk 4/5

const App: React.FC = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const systemColorScheme = useColorScheme();

  useEffect(() => {
    (async () => {
      try {
        await loadAppFonts();
      } catch (err) {
        console.warn('Font load failed:', err);
      } finally {
        setFontsLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (fontsLoaded) {
        setAppReady(true);
        try { await SplashScreen.hideAsync(); } catch (e) {}
      }
    })();
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
        <DebugEnv />
        <StatusBarManager />
        <AppNavigation />
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

// Styles (kept from your original, trimmed where possible)
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const KEYPAD_KEY_SIZE = Math.min((SCREEN_WIDTH - spacing.xl * 2 - spacing.md * 2) / 3, dimensions.pinKeySize);

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: spacing.lg, fontSize: typography.sizes.body, fontFamily: typography.fonts.regular },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: typography.sizes.h3 },
  pinContainer: { flex: 1 },
  pinContent: { flex: 1, paddingHorizontal: spacing.xl, alignItems: 'center' },
  pinHeader: { alignItems: 'center', marginBottom: spacing.xxxl },
  pinTitle: { fontSize: typography.sizes.h2, marginBottom: spacing.sm, textAlign: 'center' },
  pinSubtitle: { fontSize: typography.sizes.body, textAlign: 'center', lineHeight: typography.sizes.body * typography.lineHeights.relaxed },
  pinDotsContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: spacing.xl },
  pinDot: { width: dimensions.pinDotSize, height: dimensions.pinDotSize, borderRadius: dimensions.pinDotSize / 2, borderWidth: 2, marginHorizontal: dimensions.pinDotSpacing / 2 },
  pinError: { fontSize: typography.sizes.bodySmall, marginBottom: spacing.lg, textAlign: 'center' },
  keypadContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: KEYPAD_KEY_SIZE * 3 + spacing.md * 2, marginTop: spacing.xl },
  keypadKey: { width: KEYPAD_KEY_SIZE, height: KEYPAD_KEY_SIZE, borderRadius: KEYPAD_KEY_SIZE / 2, justifyContent: 'center', alignItems: 'center', margin: spacing.xs, ...shadows.sm },
  keypadKeyText: { fontSize: typography.sizes.h2 },
  keypadEmptySpace: { width: KEYPAD_KEY_SIZE, height: KEYPAD_KEY_SIZE, margin: spacing.xs },
  pinCancelButton: { marginTop: spacing.xxl, padding: spacing.md },
  pinCancelText: { fontSize: typography.sizes.body },
});

export { supabase };
export default App;
