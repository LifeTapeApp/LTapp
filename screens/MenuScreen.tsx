// ./screens/MenuScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// theme + stores
import { useTheme } from '../App'; // App exports useTheme (same file)
import { useUserStore } from '../stores/userStore';
import { usePINStore } from '../stores/pinStore';
import { useAppStateStore } from '../stores/appStateStore';
import { typography, spacing, colors, radii } from '../constants/theme';

const MenuScreen: React.FC = () => {
  const { colors: themeColors } = useTheme();
  const navigation = useNavigation();
  const { clearUser } = useUserStore();
  const { clearPINs } = usePINStore();
  const { clearEntries } = useAppStateStore();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          // Clear client state
          clearUser?.();
          clearPINs?.();
          clearEntries?.();
          // TODO: also sign out of Supabase auth if using
          // supabase.auth.signOut();
          navigation.reset?.({ index: 0, routes: [{ name: 'Onboarding' as any }] });
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.canvas }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.header, { color: themeColors.textPrimary }]}>Menu</Text>

        <TouchableOpacity style={[styles.item, { backgroundColor: themeColors.card }]} onPress={() => navigation.navigate('Settings' as any)}>
          <Ionicons name="settings-outline" size={20} color={themeColors.textPrimary} />
          <Text style={[styles.itemText, { color: themeColors.textPrimary }]}>Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.item, { backgroundColor: themeColors.card }]} onPress={() => navigation.navigate('TitlePreference' as any)}>
          <Ionicons name="bookmark-outline" size={20} color={themeColors.textPrimary} />
          <Text style={[styles.itemText, { color: themeColors.textPrimary }]}>Title Preference</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.item, { backgroundColor: themeColors.card }]} onPress={() => navigation.navigate('ChangePassword' as any)}>
          <Ionicons name="key-outline" size={20} color={themeColors.textPrimary} />
          <Text style={[styles.itemText, { color: themeColors.textPrimary }]}>Change Password</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.item, { backgroundColor: themeColors.card }]} onPress={() => navigation.navigate('PrivacySecurity' as any)}>
          <Ionicons name="shield-checkmark-outline" size={20} color={themeColors.textPrimary} />
          <Text style={[styles.itemText, { color: themeColors.textPrimary }]}>Privacy & Security</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.item, { backgroundColor: themeColors.card }]} onPress={() => navigation.navigate('Contact' as any)}>
          <Ionicons name="mail-outline" size={20} color={themeColors.textPrimary} />
          <Text style={[styles.itemText, { color: themeColors.textPrimary }]}>Contact</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.item, { backgroundColor: themeColors.card }]} onPress={() => navigation.navigate('SendInvite' as any)}>
          <Ionicons name="person-add-outline" size={20} color={themeColors.textPrimary} />
          <Text style={[styles.itemText, { color: themeColors.textPrimary }]}>Send Invite</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.item, { backgroundColor: themeColors.card }]} onPress={() => navigation.navigate('DownloadStory' as any)}>
          <Ionicons name="download-outline" size={20} color={themeColors.textPrimary} />
          <Text style={[styles.itemText, { color: themeColors.textPrimary }]}>Download Story</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.item, { backgroundColor: themeColors.card }]} onPress={() => navigation.navigate('DarkSide' as any)}>
          <Ionicons name="moon-outline" size={20} color={themeColors.textPrimary} />
          <Text style={[styles.itemText, { color: themeColors.textPrimary }]}>Dark Side</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.item, { backgroundColor: themeColors.card }]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={themeColors.textPrimary} />
          <Text style={[styles.itemText, { color: themeColors.textPrimary }]}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.xl },
  header: { fontFamily: typography.fonts.logo, fontSize: typography.sizes.h2, marginBottom: spacing.lg },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
  },
  itemText: { marginLeft: spacing.md, fontFamily: typography.fonts.regular, fontSize: typography.sizes.body },
});

export default MenuScreen;
