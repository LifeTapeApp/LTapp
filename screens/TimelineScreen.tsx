/**

Life Tape - Timeline Screen
Displays all entries in chronological order with filtering by tags
*/

import React, { useState, useCallback, useMemo, useRef } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// UPDATED IMPORTS
import { useTheme } from '../theme/useTheme';
import useAppStateStore from '../stores/appStateStore';
import { RootStackParamList } from '../navigation/types';

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
type FilterType = 'all' | 'tagged' | string;
type SortType = 'newest' | 'oldest';
// ============================================================================
// CONSTANTS
// ============================================================================
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MARGIN = spacing.md;
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
// ENTRY CARD COMPONENT
// ============================================================================
interface EntryCardProps {
entry: Entry;
onPress: () => void;
themeColors: typeof colors.light;
}
const EntryCard: React.FC<EntryCardProps> = React.memo(({ entry, onPress, themeColors }) => {
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
backgroundColor: themeColors.card,
...shadows.card,
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
<View style={[styles.tagChip, { backgroundColor: themeColors.tag }]}>
<Text style={[styles.tagChipText, { color: themeColors.white }]}>
{entry.tag}
</Text>
</View>
)}
</View>
<Text style={[styles.cardTime, { color: themeColors.dateText }]}>
{formatTime(entry.createdAt)}
</Text>
</View>
    {/* Title */}
    <Text 
      style={[styles.cardTitle, { color: themeColors.textPrimary }]}
      numberOfLines={1}
    >
      {entry.title}
    </Text>
    
    {/* Transcript Preview */}
    <Text 
      style={[styles.cardTranscript, { color: themeColors.textSecondary }]}
      numberOfLines={2}
    >
      {entry.transcript}
    </Text>
    
    {/* Card Footer */}
    <View style={styles.cardFooter}>
      <View style={styles.durationContainer}>
        <Ionicons name="time-outline" size={14} color={themeColors.inactive} />
        <Text style={[styles.durationText, { color: themeColors.inactive }]}>
          {formatDuration(entry.duration)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={themeColors.inactive} />
    </View>
  </TouchableOpacity>
</Animated.View>
);
});
// ============================================================================
// DATE HEADER COMPONENT
// ============================================================================
interface DateHeaderProps {
date: string;
count: number;
themeColors: typeof colors.light;
}
const DateHeader: React.FC<DateHeaderProps> = React.memo(({ date, count, themeColors }) => (
<View style={styles.dateHeader}>
<Text style={[styles.dateHeaderText, { color: themeColors.textPrimary }]}>
{date}
</Text>
<View style={[styles.entryCountBadge, { backgroundColor: themeColors.warmPanel }]}>
<Text style={[styles.entryCountText, { color: themeColors.textPrimary }]}>
{count} {count === 1 ? 'entry' : 'entries'}
</Text>
</View>
</View>
));
// ============================================================================
// FILTER CHIP COMPONENT
// ============================================================================
interface FilterChipProps {
label: string;
isActive: boolean;
onPress: () => void;
themeColors: typeof colors.light;
}
const FilterChip: React.FC<FilterChipProps> = React.memo(({ label, isActive, onPress, themeColors }) => (
<TouchableOpacity
style={[
styles.filterChip,
{
backgroundColor: isActive ? themeColors.buttonPrimary : themeColors.card,
borderColor: isActive ? themeColors.buttonPrimary : themeColors.border,
},
]}
onPress={onPress}
activeOpacity={0.7}


<Text
  style={[
    styles.filterChipText,
    {
      color: isActive ? themeColors.white : themeColors.textSecondary,
    },
  ]}
>
  {label}
</Text>
  </TouchableOpacity>
));
// ============================================================================
// EMPTY STATE COMPONENT
// ============================================================================
interface EmptyStateProps {
hasFilter: boolean;
themeColors: typeof colors.light;
}
const EmptyState: React.FC<EmptyStateProps> = ({ hasFilter, themeColors }) => (
<View style={styles.emptyState}>
<View style={[styles.emptyIconContainer, { backgroundColor: themeColors.card }]}>
<Ionicons
name={hasFilter ? 'filter-outline' : 'mic-outline'}
size={48}
color={themeColors.inactive}
/>
</View>
<Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>
{hasFilter ? 'No matching entries' : 'No entries yet'}
</Text>
<Text style={[styles.emptySubtitle, { color: themeColors.textSecondary }]}>
{hasFilter
? 'Try adjusting your filters or search'
: 'Start recording your story by saying "Life Tape"'
}
</Text>
</View>
);
// ============================================================================
// TIMELINE SCREEN COMPONENT
// ============================================================================
const TimelineScreen: React.FC = () => {
const { colors: themeColors, isDark } = useTheme();
const navigation = useNavigation<NavigationProp>();
const { entries } = useAppStateStore();
// Local state
const [searchQuery, setSearchQuery] = useState('');
const [activeFilter, setActiveFilter] = useState<FilterType>('all');
const [sortOrder, setSortOrder] = useState<SortType>('newest');
const [isRefreshing, setIsRefreshing] = useState(false);
const [showSearch, setShowSearch] = useState(false);
// Refs
const listRef = useRef<FlatList>(null);
const searchInputRef = useRef<TextInput>(null);
// Get unique tags
const uniqueTags = useMemo(() => {
const tags = new Set<string>();
entries.forEach(entry => {
if (entry.tag && !entry.isDarkSide) {
tags.add(entry.tag);
}
});
return Array.from(tags).sort();
}, [entries]);
// Filter entries (excluding dark side entries from main timeline)
const filteredEntries = useMemo(() => {
let result = entries.filter(entry => !entry.isDarkSide);
// Apply search filter
if (searchQuery.trim()) {
  const query = searchQuery.toLowerCase();
  result = result.filter(entry =>
    entry.title.toLowerCase().includes(query) ||
    entry.transcript.toLowerCase().includes(query) ||
    (entry.tag && entry.tag.toLowerCase().includes(query))
  );
}

// Apply tag filter
if (activeFilter !== 'all') {
  result = result.filter(entry => entry.tag === activeFilter);
}

// Apply sort
result.sort((a, b) => {
  return sortOrder === 'newest' 
    ? b.createdAt - a.createdAt 
    : a.createdAt - b.createdAt;
});

return result;
}, [entries, searchQuery, activeFilter, sortOrder]);
// Group entries by date
const groupedEntries = useMemo(() => {
return groupEntriesByDate(filteredEntries);
}, [filteredEntries]);
// Create flat list data with headers
const listData = useMemo(() => {
const data: Array<{ type: 'header'; date: string; count: number } | { type: 'entry'; entry: Entry }> = [];
groupedEntries.forEach((entries, date) => {
  data.push({ type: 'header', date, count: entries.length });
  entries.forEach(entry => {
    data.push({ type: 'entry', entry });
  });
});

return data;
}, [groupedEntries]);
// Handlers
const handleRefresh = useCallback(async () => {
setIsRefreshing(true);
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
// Simulate refresh delay
await new Promise(resolve => setTimeout(resolve, 1000));
setIsRefreshing(false);
}, []);
const handleEntryPress = useCallback((entryId: string) => {
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
navigation.navigate('EntryDetail', { entryId });
}, [navigation]);
const handleFilterPress = useCallback((filter: FilterType) => {
Haptics.selectionAsync();
setActiveFilter(filter);
}, []);
const handleSortToggle = useCallback(() => {
Haptics.selectionAsync();
setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest');
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
// Render functions
const renderItem = useCallback(({ item }: { item: typeof listData[0] }) => {
if (item.type === 'header') {
return <DateHeader date={item.date} count={item.count} themeColors={themeColors} />;
}
return (
<EntryCard
entry={item.entry}
onPress={() => handleEntryPress(item.entry.id)}
themeColors={themeColors}
/>
);
}, [themeColors, handleEntryPress]);
const keyExtractor = useCallback((item: typeof listData[0]) => {
  return item.type === 'header' ? `header-${item.date}` : `entry-${item.entry.id}`;
}, []);
const renderListHeader = useCallback(() => (
<View style={styles.listHeader}>
{/* Search Bar */}
{showSearch && (
<View style={[styles.searchContainer, { backgroundColor: themeColors.card }]}>
<Ionicons name="search" size={20} color={themeColors.inactive} />
<TextInput
ref={searchInputRef}
style={[styles.searchInput, { color: themeColors.textPrimary }]}
placeholder="Search entries..."
placeholderTextColor={themeColors.inactive}
value={searchQuery}
onChangeText={setSearchQuery}
autoCapitalize="none"
autoCorrect={false}
/>
{searchQuery.length > 0 && (
<TouchableOpacity onPress={() => setSearchQuery('')}>
<Ionicons name="close-circle" size={20} color={themeColors.inactive} />
</TouchableOpacity>
)}
</View>
)}
  {/* Filter Chips */}
  <FlatList
    horizontal
    showsHorizontalScrollIndicator={false}
    data={['all', ...uniqueTags]}
    keyExtractor={(item) => item}
    contentContainerStyle={styles.filterContainer}
    renderItem={({ item }) => (
      <FilterChip
        label={item === 'all' ? 'All' : item}
        isActive={activeFilter === item}
        onPress={() => handleFilterPress(item)}
        themeColors={themeColors}
      />
    )}
  />
  
  {/* Results Count & Sort */}
  <View style={styles.resultsBar}>
    <Text style={[styles.resultsCount, { color: themeColors.textSecondary }]}>
      {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
    </Text>
    <TouchableOpacity style={styles.sortButton} onPress={handleSortToggle}>
      <Ionicons 
        name={sortOrder === 'newest' ? 'arrow-down' : 'arrow-up'} 
        size={16} 
        color={themeColors.buttonPrimary} 
      />
      <Text style={[styles.sortText, { color: themeColors.buttonPrimary }]}>
        {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
      </Text>
    </TouchableOpacity>
  </View>
</View>
), [
showSearch,
searchQuery,
uniqueTags,
activeFilter,
sortOrder,
filteredEntries.length,
themeColors,
handleFilterPress,
handleSortToggle,
]);
const renderListEmpty = useCallback(() => (
<EmptyState 
   hasFilter={searchQuery.length > 0 || activeFilter !== 'all'}
themeColors={themeColors}
/>
), [searchQuery, activeFilter, themeColors]);
return (
<SafeAreaView style={[styles.container, { backgroundColor: themeColors.canvas }]} edges={['top']}>
{/* Header */}
<View style={styles.header}>
<TouchableOpacity onPress={handleScrollToTop}>
<Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>
My Story
</Text>
</TouchableOpacity>
<TouchableOpacity
style={styles.searchButton}
onPress={handleSearchToggle}
hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
>
<Ionicons
name={showSearch ? 'close' : 'search'}
size={24}
color={themeColors.textPrimary}
/>
</TouchableOpacity>
</View>
  {/* Entry List */}
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
        tintColor={themeColors.buttonPrimary}
        colors={[themeColors.buttonPrimary]}
      />
    }
    initialNumToRender={10}
    maxToRenderPerBatch={10}
    windowSize={10}
    removeClippedSubviews={Platform.OS === 'android'}
  />
  
  {/* Bottom Spacer for Tab Bar */}
  <View style={{ height: dimensions.tabBarHeight }} />
</SafeAreaView>
);
};
// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
container: {
flex: 1,
},
header: {
flexDirection: 'row',
justifyContent: 'space-between',
alignItems: 'center',
paddingHorizontal: dimensions.screenPaddingHorizontal,
paddingVertical: spacing.lg,
},
headerTitle: {
fontSize: typography.sizes.h2,
fontFamily: typography.fonts.bold,
},
searchButton: {
padding: spacing.xs,
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
filterContainer: {
paddingVertical: spacing.sm,
gap: spacing.sm,
},
filterChip: {
paddingHorizontal: spacing.lg,
paddingVertical: spacing.sm,
borderRadius: radii.full,
borderWidth: 1,
marginRight: spacing.sm,
},
filterChipText: {
fontSize: typography.sizes.bodySmall,
fontFamily: typography.fonts.medium,
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
darkSideIndicator: {
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
export default TimelineScreen;
