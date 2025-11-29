/**

Life Tape - Dark Side Screen
Private entries visible only after PIN verification
Purple-themed timeline for sensitive/private recordings
*/

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
View,
Text,
StyleSheet,
FlatList,
TouchableOpacity,
Animated,
RefreshControl,
TextInput,
Dimensions,
Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from "../theme/theme";
import { useAppStateStore } from "../stores/appStateStore";
import { usePINStore } from "../stores/pinStore";
import { RootStackParamList } from "../types/navigation";
import PINEntryScreen from "../screens/PINEntryScreen";
import {
colors,
typography,
spacing,
radii,
shadows,
dimensions,
animations,
} from '../constants/theme';
// ============================================================================
// TYPES
// ============================================================================
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
interface Entry {
id: string;
transcript: string;
title: string;
tag: string | null;
isDarkSide: boolean;
createdAt: number;
duration: number;
audioUri: string | null;
}
type SortType = 'newest' | 'oldest';
// ============================================================================
// CONSTANTS
// ============================================================================
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MARGIN = spacing.md;
// Dark Side color overrides
const getDarkSideColors = (isDark: boolean) => ({
  background: isDark ? '#0f0a1e' : '#1a0d33',
  canvas: isDark ? '#0f0a1e' : '#1a0d33',
  card: isDark ? '#1e1533' : '#2d1a4d',
  text: '#e6e0ff',
  textSecondary: '#b8a8ff',
  border: '#7f5af0',
  accent: '#7f5af0',
  tag: '#9d8cff',
  moonGlow: 'rgba(127, 90, 240, 0.3)',
});
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
const formatDate = (timestamp: number): string => {
const date = new Date(timestamp);
const now = new Date();
const diffMs = now.getTime() - date.getTime();
const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
if (diffDays === 0) {
return 'Today';
} else if (diffDays === 1) {
return 'Yesterday';
} else if (diffDays < 7) {
return date.toLocaleDateString('en-US', { weekday: 'long' });
} else {
return date.toLocaleDateString('en-US', {
month: 'short',
day: 'numeric',
year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
});
}
};
const formatTime = (timestamp: number): string => {
return new Date(timestamp).toLocaleTimeString('en-US', {
hour: 'numeric',
minute: '2-digit',
hour12: true,
});
};
const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
};
const groupEntriesByDate = (entries: Entry[]): Map<string, Entry[]> => {
const grouped = new Map<string, Entry[]>();
entries.forEach(entry => {
const dateKey = formatDate(entry.createdAt);
const existing = grouped.get(dateKey) || [];
grouped.set(dateKey, [...existing, entry]);
});
return grouped;
};
// ============================================================================
// ENTRY CARD COMPONENT (DARK SIDE THEMED)
// ============================================================================
interface DarkSideEntryCardProps {
entry: Entry;
onPress: () => void;
darkSideColors: ReturnType<typeof getDarkSideColors>;
}
const DarkSideEntryCard: React.FC<DarkSideEntryCardProps> = React.memo(
({ entry, onPress, darkSideColors }) => {
const scaleAnim = useRef(new Animated.Value(1)).current;
const handlePressIn = () => {
  Animated.spring(scaleAnim, {
    toValue: 0.98,
    useNativeDriver: true,
  }).start();
};

const handlePressOut = () => {
  Animated.spring(scaleAnim, {
    toValue: 1,
    friction: 3,
    useNativeDriver: true,
  }).start();
};

return (
  <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
    <TouchableOpacity
      style={[
        styles.entryCard,
        {
          backgroundColor: darkSideColors.card,
          borderColor: darkSideColors.border,
          borderWidth: 1,
        },
      ]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          {entry.tag && (
            <View style={[styles.tagChip, { backgroundColor: darkSideColors.tag }]}>
              <Text style={[styles.tagChipText, { color: '#ffffff' }]}>
                {entry.tag}
              </Text>
            </View>
          )}
          <View style={[styles.moonIndicator, { backgroundColor: darkSideColors.accent }]}>
            <Ionicons name="moon" size={12} color="#ffffff" />
          </View>
        </View>
        <Text style={[styles.cardTime, { color: darkSideColors.textSecondary }]}>
          {formatTime(entry.createdAt)}
        </Text>
      </View>

      {/* Title */}
      <Text
        style={[styles.cardTitle, { color: darkSideColors.text }]}
        numberOfLines={1}
      >
        {entry.title}
      </Text>

      {/* Transcript Preview */}
      <Text
        style={[styles.cardTranscript, { color: darkSideColors.textSecondary }]}
        numberOfLines={2}
      >
        {entry.transcript}
      </Text>

      {/* Card Footer */}
      <View style={styles.cardFooter}>
        <View style={styles.durationContainer}>
          <Ionicons name="time-outline" size={14} color={darkSideColors.textSecondary} />
          <Text style={[styles.durationText, { color: darkSideColors.textSecondary }]}>
            {formatDuration(entry.duration)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={darkSideColors.textSecondary} />
      </View>
    </TouchableOpacity>
  </Animated.View>
);
}
);
// ============================================================================
// DATE HEADER COMPONENT (DARK SIDE THEMED)
// ============================================================================
interface DateHeaderProps {
date: string;
count: number;
darkSideColors: ReturnType<typeof getDarkSideColors>;
}
const DateHeader: React.FC<DateHeaderProps> = React.memo(
({ date, count, darkSideColors }) => (
<View style={styles.dateHeader}>
<Text style={[styles.dateHeaderText, { color: darkSideColors.text }]}>
{date}
</Text>
<View style={[styles.entryCountBadge, { backgroundColor: darkSideColors.border }]}>
<Text style={[styles.entryCountText, { color: darkSideColors.text }]}>
{count} {count === 1 ? 'entry' : 'entries'}
</Text>
</View>
</View>
)
);
// ============================================================================
// EMPTY STATE COMPONENT
// ============================================================================
interface EmptyStateProps {
hasFilter: boolean;
darkSideColors: ReturnType<typeof getDarkSideColors>;
}
const EmptyState: React.FC<EmptyStateProps> = ({ hasFilter, darkSideColors }) => (
<View style={styles.emptyState}>
<View style={[styles.emptyIconContainer, { backgroundColor: darkSideColors.card }]}>
<Ionicons
name={hasFilter ? 'filter-outline' : 'moon-outline'}
size={48}
color={darkSideColors.accent}
/>
</View>
<Text style={[styles.emptyTitle, { color: darkSideColors.text }]}>
{hasFilter ? 'No matching entries' : 'No dark side entries'}
</Text>
<Text style={[styles.emptySubtitle, { color: darkSideColors.textSecondary }]}>
{hasFilter
? 'Try adjusting your search'
: 'Say "real talk", "truth", "dark", "brutal", or "fuck it" when recording to save here'}
</Text>
</View>
);
// ============================================================================
// DARK SIDE SCREEN COMPONENT
// ============================================================================
const DarkSideScreen: React.FC = () => {
const { isDark } = useTheme();
const navigation = useNavigation<NavigationProp>();
const { entries } = useAppStateStore();
const { isDarkSideUnlocked, hasDarkSidePIN, unlockDarkSide, lockDarkSide } = usePINStore();
// Get dark side themed colors
const darkSideColors = useMemo(() => getDarkSideColors(isDark), [isDark]);
// Local state
const [searchQuery, setSearchQuery] = useState('');
const [sortOrder, setSortOrder] = useState<SortType>('newest');
const [isRefreshing, setIsRefreshing] = useState(false);
const [showSearch, setShowSearch] = useState(false);
const [needsPINSetup, setNeedsPINSetup] = useState(false);
// Refs
const listRef = useRef<FlatList>(null);
const searchInputRef = useRef<TextInput>(null);
const fadeAnim = useRef(new Animated.Value(0)).current;
const glowAnim = useRef(new Animated.Value(0)).current;
// Check if PIN setup is needed
useEffect(() => {
if (!hasDarkSidePIN()) {
setNeedsPINSetup(true);
}
}, [hasDarkSidePIN]);
// Animate header glow
useEffect(() => {
if (isDarkSideUnlocked) {
Animated.loop(
Animated.sequence([
Animated.timing(glowAnim, {
toValue: 1,
duration: 2000,
useNativeDriver: true,
}),
Animated.timing(glowAnim, {
toValue: 0.3,
duration: 2000,
useNativeDriver: true,
}),
])
).start();
  Animated.timing(fadeAnim, {
    toValue: 1,
    duration: animations.fadeIn,
    useNativeDriver: true,
  }).start();
}
}, [isDarkSideUnlocked]);
// Lock dark side when leaving screen
useEffect(() => {
const unsubscribe = navigation.addListener('beforeRemove', () => {
lockDarkSide();
});
return unsubscribe;
}, [navigation, lockDarkSide]);
// Filter dark side entries only
const filteredEntries = useMemo(() => {
let result = entries.filter(entry => entry.isDarkSide);
// Apply search filter
if (searchQuery.trim()) {
  const query = searchQuery.toLowerCase();
  result = result.filter(
    entry =>
      entry.title.toLowerCase().includes(query) ||
      entry.transcript.toLowerCase().includes(query) ||
      (entry.tag && entry.tag.toLowerCase().includes(query))
  );
}

// Apply sort
result.sort((a, b) => {
  return sortOrder === 'newest'
    ? b.createdAt - a.createdAt
    : a.createdAt - b.createdAt;
});

return result;
}, [entries, searchQuery, sortOrder]);
// Group entries by date
const groupedEntries = useMemo(() => {
return groupEntriesByDate(filteredEntries);
}, [filteredEntries]);
// Create flat list data with headers
const listData = useMemo(() => {
const data: Array
{ type: 'header'; date: string; count: number } | { type: 'entry'; entry: Entry }
> = [];
groupedEntries.forEach((entries, date) => {
  data.push({ type: 'header', date, count: entries.length });
  entries.forEach(entry => {
    data.push({ type: 'entry', entry });
  });
});

return data;
}, [groupedEntries]);
// Handlers
const handleBack = useCallback(() => {
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
navigation.goBack();
}, [navigation]);
const handleRefresh = useCallback(async () => {
setIsRefreshing(true);
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
await new Promise(resolve => setTimeout(resolve, 1000));
setIsRefreshing(false);
}, []);
const handleEntryPress = useCallback(
(entryId: string) => {
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
navigation.navigate('EntryDetail', { entryId });
},
[navigation]
);
const handleSortToggle = useCallback(() => {
Haptics.selectionAsync();
setSortOrder(prev => (prev === 'newest' ? 'oldest' : 'newest'));
}, []);
const handleSearchToggle = useCallback(() => {
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
setShowSearch(prev => !prev);
if (!showSearch) {
setTimeout(() => searchInputRef.current?.focus(), 100);
} else {
setSearchQuery('');
}
}, [showSearch]);
const handleScrollToTop = useCallback(() => {
listRef.current?.scrollToOffset({ offset: 0, animated: true });
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}, []);
const handlePINSuccess = useCallback(() => {
setNeedsPINSetup(false);
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}, []);
const handlePINCancel = useCallback(() => {
navigation.goBack();
}, [navigation]);
// Render functions
const renderItem = useCallback(
({ item }: { item: (typeof listData)[0] }) => {
if (item.type === 'header') {
return (
<DateHeader date={item.date} count={item.count} darkSideColors={darkSideColors} />
);
}
return (
<DarkSideEntryCard
entry={item.entry}
onPress={() => handleEntryPress(item.entry.id)}
darkSideColors={darkSideColors}
/>
);
},
[darkSideColors, handleEntryPress]
);
const keyExtractor = useCallback((item: (typeof listData)[0]) => {
  return item.type === 'header' ? `header-${item.date}` : `entry-${item.entry.id}`;
}, []);
const renderListHeader = useCallback(
() => (
<View style={styles.listHeader}>
{/* Search Bar */}
{showSearch && (
<View style={[styles.searchContainer, { backgroundColor: darkSideColors.card }]}>
<Ionicons name="search" size={20} color={darkSideColors.textSecondary} />
<TextInput
ref={searchInputRef}
style={[styles.searchInput, { color: darkSideColors.text }]}
placeholder="Search dark side..."
placeholderTextColor={darkSideColors.textSecondary}
value={searchQuery}
onChangeText={setSearchQuery}
autoCapitalize="none"
autoCorrect={false}
/>
{searchQuery.length > 0 && (
<TouchableOpacity onPress={() => setSearchQuery('')}>
<Ionicons name="close-circle" size={20} color={darkSideColors.textSecondary} />
</TouchableOpacity>
)}
</View>
)}
    {/* Results Count & Sort */}
    <View style={styles.resultsBar}>
      <Text style={[styles.resultsCount, { color: darkSideColors.textSecondary }]}>
        {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
      </Text>
      <TouchableOpacity style={styles.sortButton} onPress={handleSortToggle}>
        <Ionicons
          name={sortOrder === 'newest' ? 'arrow-down' : 'arrow-up'}
          size={16}
          color={darkSideColors.accent}
        />
        <Text style={[styles.sortText, { color: darkSideColors.accent }]}>
          {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
        </Text>
      </TouchableOpacity>
    </View>
  </View>
),
[showSearch, searchQuery, sortOrder, filteredEntries.length, darkSideColors, handleSortToggle]
);
const renderListEmpty = useCallback(
() => <EmptyState hasFilter={searchQuery.length > 0} darkSideColors={darkSideColors} />,
[searchQuery, darkSideColors]
);
// Show PIN setup screen
if (needsPINSetup) {
return (
<PINEntryScreen
     mode="darkSideSetup"
     onSuccess={handlePINSuccess}
     onCancel={handlePINCancel}
     title="Secure Your Dark Side"
     subtitle="Create a separate 6-digit PIN to protect your private entries"
   />
);
}
// Show PIN entry screen
if (!isDarkSideUnlocked) {
return (
<PINEntryScreen
     mode="darkSide"
     onSuccess={handlePINSuccess}
     onCancel={handlePINCancel}
     title="Enter Dark Side"
     subtitle="Enter your Dark Side PIN to access private entries"
   />
);
}
// Glow opacity animation
const glowOpacity = glowAnim.interpolate({
inputRange: [0, 1],
outputRange: [0.3, 0.8],
});
return (
<View style={[styles.container, { backgroundColor: darkSideColors.background }]}>
<SafeAreaView style={styles.safeArea} edges={['top']}>
{/* Header with Moon Icon */}
<View style={[styles.header, { backgroundColor: darkSideColors.background }]}>
<TouchableOpacity style={styles.backButton} onPress={handleBack}>
<Ionicons name="arrow-back" size={24} color={darkSideColors.text} />
</TouchableOpacity>
      <TouchableOpacity style={styles.headerTitleContainer} onPress={handleScrollToTop}>
        <Animated.View style={[styles.moonGlow, { opacity: glowOpacity }]}>
          <View
            style={[styles.moonGlowInner, { backgroundColor: darkSideColors.moonGlow }]}
          />
        </Animated.View>
        <Ionicons
          name="moon"
          size={28}
          color={darkSideColors.accent}
          style={styles.moonIcon}
        />
        <Text style={[styles.headerTitle, { color: darkSideColors.text }]}>Dark Side</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.searchButton}
        onPress={handleSearchToggle}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name={showSearch ? 'close' : 'search'}
          size={24}
          color={darkSideColors.text}
        />
      </TouchableOpacity>
    </View>

    {/* Subtitle */}
    <View style={styles.subtitleContainer}>
      <Text style={[styles.subtitle, { color: darkSideColors.textSecondary }]}>
        Your private, unfiltered thoughts
      </Text>
    </View>

    {/* Entry List */}
    <Animated.View style={[styles.listContainer, { opacity: fadeAnim }]}>
      <FlatList
        ref={listRef}
        data={listData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderListEmpty}
        contentContainerStyle={[
          styles.listContent,
          listData.length === 0 && styles.emptyListContent,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={darkSideColors.accent}
            colors={[darkSideColors.accent]}
          />
        }
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={Platform.OS === 'android'}
      />
    </Animated.View>
  </SafeAreaView>
</View>
);
};
// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
container: {
flex: 1,
},
safeArea: {
flex: 1,
},
header: {
flexDirection: 'row',
justifyContent: 'space-between',
alignItems: 'center',
paddingHorizontal: dimensions.screenPaddingHorizontal,
paddingVertical: spacing.md,
},
backButton: {
padding: spacing.xs,
width: 40,
},
headerTitleContainer: {
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'center',
flex: 1,
},
moonGlow: {
position: 'absolute',
width: 60,
height: 60,
alignItems: 'center',
justifyContent: 'center',
},
moonGlowInner: {
width: 50,
height: 50,
borderRadius: 25,
},
moonIcon: {
marginRight: spacing.sm,
},
headerTitle: {
fontSize: typography.sizes.h3,
fontFamily: typography.fonts.bold,
},
searchButton: {
padding: spacing.xs,
width: 40,
alignItems: 'flex-end',
},
subtitleContainer: {
paddingHorizontal: dimensions.screenPaddingHorizontal,
paddingBottom: spacing.md,
},
subtitle: {
fontSize: typography.sizes.bodySmall,
fontFamily: typography.fonts.regular,
textAlign: 'center',
},
listContainer: {
flex: 1,
},
listContent: {
paddingHorizontal: dimensions.screenPaddingHorizontal,
paddingBottom: spacing.xxl,
},
emptyListContent: {
flexGrow: 1,
},
listHeader: {
marginBottom: spacing.md,
},
searchContainer: {
flexDirection: 'row',
alignItems: 'center',
paddingHorizontal: spacing.md,
paddingVertical: spacing.sm,
borderRadius: radii.input,
marginBottom: spacing.md,
},
searchInput: {
flex: 1,
fontSize: typography.sizes.body,
fontFamily: typography.fonts.regular,
marginLeft: spacing.sm,
paddingVertical: spacing.xs,
},
resultsBar: {
flexDirection: 'row',
justifyContent: 'space-between',
alignItems: 'center',
paddingVertical: spacing.sm,
},
resultsCount: {
fontSize: typography.sizes.bodySmall,
fontFamily: typography.fonts.regular,
},
sortButton: {
flexDirection: 'row',
alignItems: 'center',
gap: spacing.xs,
},
sortText: {
fontSize: typography.sizes.bodySmall,
fontFamily: typography.fonts.medium,
},
dateHeader: {
flexDirection: 'row',
justifyContent: 'space-between',
alignItems: 'center',
paddingVertical: spacing.md,
marginTop: spacing.md,
},
dateHeaderText: {
fontSize: typography.sizes.h5,
fontFamily: typography.fonts.semiBold,
},
entryCountBadge: {
paddingHorizontal: spacing.md,
paddingVertical: spacing.xs,
borderRadius: radii.full,
},
entryCountText: {
fontSize: typography.sizes.caption,
fontFamily: typography.fonts.medium,
},
entryCard: {
borderRadius: radii.card,
padding: spacing.lg,
marginBottom: CARD_MARGIN,
},
cardHeader: {
flexDirection: 'row',
justifyContent: 'space-between',
alignItems: 'center',
marginBottom: spacing.sm,
},
cardHeaderLeft: {
flexDirection: 'row',
alignItems: 'center',
gap: spacing.sm,
},
tagChip: {
paddingHorizontal: spacing.md,
paddingVertical: spacing.xxs,
borderRadius: radii.tag,
},
tagChipText: {
fontSize: typography.sizes.labelSmall,
fontFamily: typography.fonts.semiBold,
textTransform: 'uppercase',
},
moonIndicator: {
width: 24,
height: 24,
borderRadius: 12,
alignItems: 'center',
justifyContent: 'center',
},
cardTime: {
fontSize: typography.sizes.caption,
fontFamily: typography.fonts.regular,
},
cardTitle: {
fontSize: typography.sizes.title,
fontFamily: typography.fonts.bold,
marginBottom: spacing.xs,
textTransform: 'uppercase',
letterSpacing: typography.letterSpacing.wide,
},
cardTranscript: {
fontSize: typography.sizes.bodySmall,
fontFamily: typography.fonts.regular,
lineHeight: typography.sizes.bodySmall * typography.lineHeights.relaxed,
marginBottom: spacing.md,
},
cardFooter: {
flexDirection: 'row',
justifyContent: 'space-between',
alignItems: 'center',
},
durationContainer: {
flexDirection: 'row',
alignItems: 'center',
gap: spacing.xs,
},
durationText: {
fontSize: typography.sizes.caption,
fontFamily: typography.fonts.regular,
},
emptyState: {
flex: 1,
alignItems: 'center',
justifyContent: 'center',
paddingHorizontal: spacing.xxl,
paddingTop: spacing.giant,
},
emptyIconContainer: {
width: 96,
height: 96,
borderRadius: 48,
alignItems: 'center',
justifyContent: 'center',
marginBottom: spacing.xl,
},
emptyTitle: {
fontSize: typography.sizes.h4,
fontFamily: typography.fonts.semiBold,
marginBottom: spacing.sm,
textAlign: 'center',
},
emptySubtitle: {
fontSize: typography.sizes.body,
fontFamily: typography.fonts.regular,
textAlign: 'center',
lineHeight: typography.sizes.body * typography.lineHeights.relaxed,
},
});
export default DarkSideScreen;
