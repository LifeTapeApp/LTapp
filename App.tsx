// App.tsx
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

// supabase client (file you already set up)
import { supabase } from './supabase';

// Stores (you extracted these)
// Make sure these paths match where you placed them.
import { usePINStore } from './stores/pinStore';
import { useUserStore } from './stores/userStore';
import { useAppStateStore } from './stores/appStateStore';

// Theme constants from your theme.ts
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

// Prevent the splash screen from auto-hiding until we're ready
SplashScreen.preventAutoHideAsync();

// -----------------------------
// Font loading mapping (SF Pro Text files you confirmed)
// -----------------------------
// Files expected in ./assets/fonts:
// SF-Pro-Text-Regular.otf
// SF-Pro-Text-Medium.otf
// SF-Pro-Text-Semibold.otf
// SF-Pro-Text-Bold.otf
// SF-Pro-Text-Light.otf
// SF-Pro-Text-Thin.otf
// SF-Pro-Text-Black.otf
//
// These map to the family names used in your theme.
const loadAppFonts = async () =>
  Font.loadAsync({
    'Aniron': require('./assets/fonts/Aniron.ttf'), // keep logo font if you still use it
    'SF Pro Text': require('./assets/fonts/SF-Pro-Text-Regular.otf'),
    'SF Pro Text Medium': require('./assets/fonts/SF-Pro-Text-Medium.otf'),
    'SF Pro Text Semibold': require('./assets/fonts/SF-Pro-Text-Semibold.otf'),
    'SF Pro Text Bold': require('./assets/fonts/SF-Pro-Text-Bold.otf'),
    'SF Pro Text Light': require('./assets/fonts/SF-Pro-Text-Light.otf'),
    'SF Pro Text Thin': require('./assets/fonts/SF-Pro-Text-Thin.otf'),
    'SF Pro Text Black': require('./assets/fonts/SF-Pro-Text-Black.otf'),
  });

// -----------------------------
// Small debug helper (optional)
// -----------------------------
function DebugEnv() {
  // Safe: reading Constants only inside a component / runtime
  // will not crash bundler when Constants is not available during server-side build.
  // Keep this in temporarily to confirm environment values in Vercel/EAS.
  // Remove when you no longer need to debug env.
  useEffect(() => {
    // Only log in dev builds
    if (__DEV__) {
      console.log('Supabase URL:', Constants.expoConfig?.extra?.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL);
      console.log('Supabase Key:', Constants.expoConfig?.extra?.supabaseAnonKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
    }
  }, []);
  return null;
}

// -----------------------------
// Types & helpers
// -----------------------------
type ColorMode = 'light' | 'dark' | 'system';

// -----------------------------
// ThemeContext (keeps your theme/provider logic local & straightforward)
// -----------------------------
interface ThemeContextType {
  colorMode: ColorMode;
  isDark: boolean;
  colors: typeof colors.light | typeof colors.dark;
  setColorMode: (mode: ColorMode) => void;
  toggleColorMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [colorMode, setColorModeState] = useState<ColorMode>('system');

  useEffect(() => {
    // You might want to load saved color mode from persistent storage (Zustand or supabaseStorage).
    // If you've stored that elsewhere, keep that logic outside this provider and call setColorModeState accordingly.
  }, []);

  const setColorMode = useCallback(async (mode: ColorMode) => {
    setColorModeState(mode);
    // persist if needed
  }, []);

  const toggleColorMode = useCallback(() => {
    const next = colorMode === 'light' ? 'dark' : colorMode === 'dark' ? 'system' : 'light';
    setColorMode(next);
  }, [colorMode, setColorMode]);

  const isDark = colorMode === 'system' ? systemColorScheme === 'dark' : colorMode === 'dark';
  const currentColors = isDark ? colors.dark : colors.light;

  return (
    <ThemeContext.Provider
      value={{
        colorMode,
        isDark,
        colors: currentColors,
        setColorMode,
        toggleColorMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

// -----------------------------
// PIN Entry component (kept inlined for simplicity)
// -----------------------------
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
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use your extracted stores
  const { verifyAppPIN, verifyDarkSidePIN, setAppPIN, setDarkSidePIN, unlockApp, unlockDarkSide } = usePINStore();

  const isSetup = mode === 'setup' || mode === 'darkSideSetup';
  const maxLength = 6;

  const displayTitle =
    title ||
    (isSetup ? (mode === 'setup' ? 'Create Your PIN' : 'Create Dark Side PIN') : mode === 'app' ? 'Enter Your PIN' : 'Enter Dark Side PIN');

  const displaySubtitle =
    subtitle || (isSetup ? (isConfirming ? 'Confirm your 6-digit PIN' : 'Enter a 6-digit PIN to secure your Life Tape') : 'Enter your 6-digit PIN to continue');

  const handleKeyPress = useCallback(
    (key: string) => {
      Vibration.vibrate(10);
      setError(null);

      if (key === 'delete') {
        if (isConfirming) setConfirmPin((p) => p.slice(0, -1));
        else setPin((p) => p.slice(0, -1));
        return;
      }

      const currentPin = isConfirming ? confirmPin : pin;
      if (currentPin.length >= maxLength) return;

      const next = currentPin + key;

      if (isConfirming) {
        setConfirmPin(next);
        if (next.length === maxLength) {
          if (next === pin) {
            if (mode === 'setup') {
              setAppPIN(next);
              unlockApp();
            } else {
              setDarkSidePIN(next);
              unlockDarkSide();
            }
            onSuccess();
          } else {
            setError('PINs do not match. Try again.');
            setConfirmPin('');
            Vibration.vibrate([0, 50, 50]);
          }
        }
      } else {
        setPin(next);
        if (isSetup && next.length === maxLength) setIsConfirming(true);

        if (!isSetup && next.length === maxLength) {
          const isValid = mode === 'app' ? verifyAppPIN(next) : verifyDarkSidePIN(next);
          if (isValid) {
            mode === 'app' ? unlockApp() : unlockDarkSide();
            onSuccess();
          } else {
            setError('Incorrect PIN. Try again.');
            setPin('');
            Vibration.vibrate([0, 50, 50]);
          }
        }
      }
    },
    [pin, confirmPin, isConfirming, isSetup, mode, verifyAppPIN, verifyDarkSidePIN, setAppPIN, setDarkSidePIN, unlockApp, unlockDarkSide, onSuccess]
  );

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
            <View
              key={i}
              style={[
                styles.pinDot,
                {
                  backgroundColor: i < currentPin.length ? themeColors.buttonPrimary : 'transparent',
                  borderColor: i < currentPin.length ? themeColors.buttonPrimary : themeColors.border,
                },
              ]}
            />
          ))}
        </View>

        {error && <Text style={[styles.pinError, { color: themeColors.error, fontFamily: typography.fonts.medium }]}>{error}</Text>}

        <View style={styles.keypadContainer}>
          {keypadNumbers.map((k, idx) =>
            k === '' ? <View key={idx} style={styles.keypadEmptySpace} /> : (
              <TouchableOpacity
                key={idx}
                style={[styles.keypadKey, { backgroundColor: themeColors.card }]}
                onPress={() => handleKeyPress(k)}
                activeOpacity={0.75}
              >
                {k === 'delete' ? (
                  <Ionicons name="backspace-outline" size={28} color={themeColors.textPrimary} />
                ) : (
                  <Text style={[styles.keypadKeyText, { color: themeColors.textPrimary, fontFamily: typography.fonts.medium }]}>{k}</Text>
                )}
              </TouchableOpacity>
            )
          )}
        </View>

        {onCancel && (
          <TouchableOpacity style={styles.pinCancelButton} onPress={onCancel}>
            <Text style={[styles.pinCancelText, { color: themeColors.buttonPrimary, fontFamily: typography.fonts.medium }]}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

// -----------------------------
// Placeholder screens (keeps navigation working while you develop actual screens)
// Replace these with imports from ./screens/* when ready
// -----------------------------
const PlaceholderScreen: React.FC<{ name: string }> = ({ name }) => {
  const { colors: themeColors } = useTheme();
  return (
    <SafeAreaView style={[styles.placeholder, { backgroundColor: themeColors.canvas }]}>
      <Text style={[styles.placeholderText, { color: themeColors.textPrimary, fontFamily: typography.fonts.medium }]}>{name}</Text>
    </SafeAreaView>
  );
};

// If you already have real screen files, import them instead.
// Example:
// import RecordScreen from './screens/RecordScreen';
const SplashScreenComponent = () => <PlaceholderScreen name="Life Tape" />;
const OnboardingScreen = () => <PlaceholderScreen name="Onboarding" />;
const AccountCreationScreen = () => <PlaceholderScreen name="Account Creation" />;
const TimelineBuilderScreen = () => <PlaceholderScreen name="Timeline Builder" />;
// If you DO have real screens, replace these placeholders:
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

// -----------------------------
// Navigation setup
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

export type MainTabParamList = {
  Record: undefined;
  Timeline: undefined;
  Menu: undefined;
};

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

// -----------------------------
// App navigation with PIN gating logic
// -----------------------------
const AppNavigation: React.FC = () => {
  const { isDark } = useTheme();
  const { isAppUnlocked, hasAppPIN, lockApp, setLastBackgroundTime } = usePINStore();
  const { isOnboarded, hasCompletedTimeline } = useUserStore();
  const { loadEntries } = useAppStateStore();
  const [showPINEntry, setShowPINEntry] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // on mount: lock app and load entries
    lockApp();
    // loadEntries might be a no-op until you implement real loading
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

// Navigation themes
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

// -----------------------------
// StatusBar manager
// -----------------------------
const StatusBarManager: React.FC = () => {
  const { isDark } = useTheme();
  return <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />;
};

// -----------------------------
// Root App component
// -----------------------------
const App: React.FC = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const systemColorScheme = useColorScheme();

  useEffect(() => {
    // load fonts
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
        try {
          await SplashScreen.hideAsync();
        } catch (err) {
          // ignore if splash already hidden
        }
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

// -----------------------------
// Styles
// -----------------------------
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

// -----------------------------
// Exports
// -----------------------------
export { supabase };
export default App;
