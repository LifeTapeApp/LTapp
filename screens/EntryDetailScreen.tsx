/**

Life Tape - Entry Detail Screen
Full view of a single entry with playback, editing, and deletion
*/

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// UPDATED IMPORTS
import { useTheme } from '../theme/useTheme';
import useAppStateStore from '../stores/appStateStore';

import {
  colors,
  typography,
  spacing,
  radii,
  shadows,
} from '../constants/theme';

// ============================================================================
// TYPES
// ============================================================================
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type EntryDetailRouteProp = RouteProp<RootStackParamList, 'EntryDetail'>;
interface PlaybackState {
isPlaying: boolean;
position: number;
duration: number;
isLoaded: boolean;
}
// ============================================================================
// CONSTANTS
// ============================================================================
const { width: SCREEN_WIDTH } = Dimensions.get('window');
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
const formatFullDate = (timestamp: number): string => {
const date = new Date(timestamp);
return date.toLocaleDateString('en-US', {
weekday: 'long',
year: 'numeric',
month: 'long',
day: 'numeric',
});
};
const formatTime = (timestamp: number): string => {
return new Date(timestamp).toLocaleTimeString('en-US', {
hour: 'numeric',
minute: '2-digit',
hour12: true,
});
};
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
const formatPlaybackTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
// ============================================================================
// AUDIO PLAYER COMPONENT
// ============================================================================
interface AudioPlayerProps {
audioUri: string | null;
themeColors: typeof colors.light;
}
const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUri, themeColors }) => {
const [playbackState, setPlaybackState] = useState<PlaybackState>({
isPlaying: false,
position: 0,
duration: 0,
isLoaded: false,
});
const soundRef = useRef<Audio.Sound | null>(null);
const progressAnim = useRef(new Animated.Value(0)).current;
useEffect(() => {
return () => {
if (soundRef.current) {
soundRef.current.unloadAsync();
}
};
}, []);
const loadAudio = async (): Promise<boolean> => {
if (!audioUri) return false;
try {
  if (soundRef.current) {
    await soundRef.current.unloadAsync();
  }

  const { sound } = await Audio.Sound.createAsync(
    { uri: audioUri },
    { shouldPlay: false },
    onPlaybackStatusUpdate
  );

  soundRef.current = sound;
  return true;
} catch (error) {
  console.error('Error loading audio:', error);
  return false;
}
};
const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
if (!status.isLoaded) {
setPlaybackState(prev => ({ ...prev, isLoaded: false }));
return;
}
setPlaybackState({
  isPlaying: status.isPlaying,
  position: status.positionMillis,
  duration: status.durationMillis || 0,
  isLoaded: true,
});

if (status.durationMillis) {
  const progress = status.positionMillis / status.durationMillis;
  progressAnim.setValue(progress);
}

if (status.didJustFinish) {
  soundRef.current?.setPositionAsync(0);
  setPlaybackState(prev => ({ ...prev, isPlaying: false, position: 0 }));
  progressAnim.setValue(0);
}
};
const handlePlayPause = async () => {
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
if (!soundRef.current) {
  const loaded = await loadAudio();
  if (!loaded) return;
}

if (playbackState.isPlaying) {
  await soundRef.current?.pauseAsync();
} else {
  await soundRef.current?.playAsync();
}
};
const handleSeek = async (value: number) => {
if (!soundRef.current || !playbackState.duration) return;
const position = value * playbackState.duration;
await soundRef.current.setPositionAsync(position);
};
const handleSkipBack = async () => {
if (!soundRef.current) return;
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
const newPosition = Math.max(0, playbackState.position - 10000);
await soundRef.current.setPositionAsync(newPosition);
};
const handleSkipForward = async () => {
if (!soundRef.current) return;
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
const newPosition = Math.min(playbackState.duration, playbackState.position + 10000);
await soundRef.current.setPositionAsync(newPosition);
};
if (!audioUri) {
return (
<View style={[styles.playerContainer, { backgroundColor: themeColors.card }]}>
<Text style={[styles.noAudioText, { color: themeColors.textSecondary }]}>
No audio available
</Text>
</View>
);
}
const progressWidth = progressAnim.interpolate({
inputRange: [0, 1],
outputRange: ['0%', '100%'],
});
return (
<View style={[styles.playerContainer, { backgroundColor: themeColors.card }]}>
{/* Progress Bar */}
<View style={styles.progressContainer}>
<View style={[styles.progressTrack, { backgroundColor: themeColors.border }]}>
<Animated.View
style={[
styles.progressFill,
{
backgroundColor: themeColors.buttonPrimary,
width: progressWidth,
},
]}
/>
</View>
<View style={styles.timeLabels}>
<Text style={[styles.timeText, { color: themeColors.textSecondary }]}>
{formatPlaybackTime(playbackState.position)}
</Text>
<Text style={[styles.timeText, { color: themeColors.textSecondary }]}>
{formatPlaybackTime(playbackState.duration)}
</Text>
</View>
</View>
  {/* Controls */}
  <View style={styles.controlsContainer}>
    <TouchableOpacity
      style={styles.skipButton}
      onPress={handleSkipBack}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name="play-back" size={28} color={themeColors.textPrimary} />
      <Text style={[styles.skipLabel, { color: themeColors.textSecondary }]}>10s</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[styles.playButton, { backgroundColor: themeColors.buttonPrimary }]}
      onPress={handlePlayPause}
    >
      <Ionicons
        name={playbackState.isPlaying ? 'pause' : 'play'}
        size={32}
        color={themeColors.white}
      />
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.skipButton}
      onPress={handleSkipForward}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name="play-forward" size={28} color={themeColors.textPrimary} />
      <Text style={[styles.skipLabel, { color: themeColors.textSecondary }]}>10s</Text>
    </TouchableOpacity>
  </View>
</View>
);
};
// ============================================================================
// ENTRY DETAIL SCREEN COMPONENT
// ============================================================================
const EntryDetailScreen: React.FC = () => {
const { colors: themeColors, isDark } = useTheme();
const navigation = useNavigation<NavigationProp>();
const route = useRoute<EntryDetailRouteProp>();
const { entryId } = route.params;
const { entries, updateEntry, deleteEntry } = useAppStateStore();
// Find the entry
const entry = entries.find(e => e.id === entryId);
// Local state
const [isEditing, setIsEditing] = useState(false);
const [editedTitle, setEditedTitle] = useState(entry?.title || '');
const [editedTranscript, setEditedTranscript] = useState(entry?.transcript || '');
const [editedTag, setEditedTag] = useState(entry?.tag || '');
// Refs
const scrollViewRef = useRef<ScrollView>(null);
const fadeAnim = useRef(new Animated.Value(0)).current;
useEffect(() => {
Animated.timing(fadeAnim, {
toValue: 1,
duration: animations.fadeIn,
useNativeDriver: true,
}).start();
}, []);
useEffect(() => {
if (entry) {
setEditedTitle(entry.title);
setEditedTranscript(entry.transcript);
setEditedTag(entry.tag || '');
}
}, [entry]);
// Handlers
const handleBack = useCallback(() => {
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
navigation.goBack();
}, [navigation]);
const handleEdit = useCallback(() => {
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
setIsEditing(true);
}, []);
const handleCancelEdit = useCallback(() => {
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
setIsEditing(false);
if (entry) {
setEditedTitle(entry.title);
setEditedTranscript(entry.transcript);
setEditedTag(entry.tag || '');
}
}, [entry]);
const handleSaveEdit = useCallback(() => {
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
updateEntry(entryId, {
  title: editedTitle.trim().toUpperCase(),
  transcript: editedTranscript.trim(),
  tag: editedTag.trim() || null,
});

setIsEditing(false);
}, [entryId, editedTitle, editedTranscript, editedTag, updateEntry]);
const handleDelete = useCallback(() => {
Alert.alert(
'Delete Entry',
'Are you sure you want to delete this entry? This action cannot be undone.',
[
{
text: 'Cancel',
style: 'cancel',
},
{
text: 'Delete',
style: 'destructive',
onPress: () => {
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
deleteEntry(entryId);
navigation.goBack();
},
},
]
);
}, [entryId, deleteEntry, navigation]);
const handleShare = useCallback(async () => {
if (!entry) return;
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

try {
  await Share.share({
    title: entry.title,
    message: `${entry.title}\n\n${entry.transcript}\n\n— Recorded on Life Tape`,
  });
} catch (error) {
  console.error('Share error:', error);
}
}, [entry]);
// If entry not found
if (!entry) {
return (
<SafeAreaView style={[styles.container, { backgroundColor: themeColors.canvas }]}>
<View style={styles.header}>
<TouchableOpacity style={styles.backButton} onPress={handleBack}>
<Ionicons name="arrow-back" size={24} color={themeColors.textPrimary} />
</TouchableOpacity>
</View>
<View style={styles.notFoundContainer}>
<Ionicons name="alert-circle-outline" size={64} color={themeColors.inactive} />
<Text style={[styles.notFoundText, { color: themeColors.textPrimary }]}>
Entry not found
</Text>
<TouchableOpacity
style={[styles.goBackButton, { backgroundColor: themeColors.buttonPrimary }]}
onPress={handleBack}
>
<Text style={[styles.goBackButtonText, { color: themeColors.white }]}>
Go Back
</Text>
</TouchableOpacity>
</View>
</SafeAreaView>
);
}
return (
<SafeAreaView style={[styles.container, { backgroundColor: themeColors.canvas }]} edges={['top']}>
<KeyboardAvoidingView
style={styles.keyboardAvoid}
behavior={Platform.OS === 'ios' ? 'padding' : undefined}
>
{/* Header */}
<View style={styles.header}>
<TouchableOpacity style={styles.backButton} onPress={handleBack}>
<Ionicons name="arrow-back" size={24} color={themeColors.textPrimary} />
</TouchableOpacity>
      <View style={styles.headerActions}>
        {isEditing ? (
          <>
            <TouchableOpacity style={styles.headerButton} onPress={handleCancelEdit}>
              <Text style={[styles.headerButtonText, { color: themeColors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={handleSaveEdit}>
              <Text style={[styles.headerButtonText, { color: themeColors.buttonPrimary }]}>
                Save
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={handleShare}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="share-outline" size={22} color={themeColors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={handleEdit}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="pencil-outline" size={22} color={themeColors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={handleDelete}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="trash-outline" size={22} color={themeColors.error} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>

    <Animated.ScrollView
      ref={scrollViewRef}
      style={[styles.scrollView, { opacity: fadeAnim }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Meta Info */}
      <View style={styles.metaContainer}>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={16} color={themeColors.textSecondary} />
          <Text style={[styles.metaText, { color: themeColors.textSecondary }]}>
            {formatFullDate(entry.createdAt)}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={16} color={themeColors.textSecondary} />
          <Text style={[styles.metaText, { color: themeColors.textSecondary }]}>
            {formatTime(entry.createdAt)} • {formatDuration(entry.duration)}
          </Text>
        </View>
      </View>

      {/* Tags */}
      <View style={styles.tagsContainer}>
        {isEditing ? (
          <View style={styles.editTagContainer}>
            <Text style={[styles.editLabel, { color: themeColors.textSecondary }]}>Tag</Text>
            <TextInput
              style={[
                styles.tagInput,
                {
                  backgroundColor: themeColors.input,
                  color: themeColors.textPrimary,
                  borderColor: themeColors.border,
                },
              ]}
              value={editedTag}
              onChangeText={setEditedTag}
              placeholder="Enter tag..."
              placeholderTextColor={themeColors.inactive}
            />
          </View>
        ) : (
          <>
            {entry.tag && (
              <View style={[styles.tagBadge, { backgroundColor: themeColors.tag }]}>
                <Text style={[styles.tagBadgeText, { color: themeColors.white }]}>
                  {entry.tag}
                </Text>
              </View>
            )}
            {entry.isDarkSide && (
              <View style={[styles.darkSideBadge, { backgroundColor: '#8b5cf6' }]}>
                <Ionicons name="moon" size={14} color="#fff" />
                <Text style={[styles.darkSideBadgeText, { color: '#fff' }]}>Dark Side</Text>
              </View>
            )}
          </>
        )}
      </View>

      {/* Title */}
      {isEditing ? (
        <View style={styles.editTitleContainer}>
          <Text style={[styles.editLabel, { color: themeColors.textSecondary }]}>Title</Text>
          <TextInput
            style={[
              styles.titleInput,
              {
                backgroundColor: themeColors.input,
                color: themeColors.textPrimary,
                borderColor: themeColors.border,
              },
            ]}
            value={editedTitle}
            onChangeText={setEditedTitle}
            placeholder="Enter title..."
            placeholderTextColor={themeColors.inactive}
            autoCapitalize="characters"
            maxLength={50}
          />
          <Text style={[styles.charCount, { color: themeColors.inactive }]}>
            {editedTitle.length}/50
          </Text>
        </View>
      ) : (
        <Text style={[styles.title, { color: themeColors.textPrimary }]}>
          {entry.title}
        </Text>
      )}

      {/* Audio Player */}
      <AudioPlayer audioUri={entry.audioUri} themeColors={themeColors} />

      {/* Transcript */}
      <View style={styles.transcriptContainer}>
        <Text style={[styles.sectionLabel, { color: themeColors.textSecondary }]}>
          Transcript
        </Text>
        {isEditing ? (
          <TextInput
            style={[
              styles.transcriptInput,
              {
                backgroundColor: themeColors.input,
                color: themeColors.textPrimary,
                borderColor: themeColors.border,
              },
            ]}
            value={editedTranscript}
            onChangeText={setEditedTranscript}
            placeholder="Enter transcript..."
            placeholderTextColor={themeColors.inactive}
            multiline
            textAlignVertical="top"
          />
        ) : (
          <View style={[styles.transcriptCard, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.transcriptText, { color: themeColors.textPrimary }]}>
              {entry.transcript}
            </Text>
          </View>
        )}
      </View>

      {/* Bottom Spacer */}
      <View style={{ height: spacing.giant }} />
    </Animated.ScrollView>
  </KeyboardAvoidingView>
</SafeAreaView>
);
};
// ============================================================================
// STYLES
// ============================================================================
const PLAY_BUTTON_SIZE = 64;
const styles = StyleSheet.create({
container: {
flex: 1,
},
keyboardAvoid: {
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
},
headerActions: {
flexDirection: 'row',
alignItems: 'center',
gap: spacing.md,
},
headerButton: {
paddingVertical: spacing.xs,
paddingHorizontal: spacing.sm,
},
headerButtonText: {
fontSize: typography.sizes.body,
fontFamily: typography.fonts.medium,
},
headerIconButton: {
padding: spacing.xs,
},
scrollView: {
flex: 1,
},
scrollContent: {
paddingHorizontal: dimensions.screenPaddingHorizontal,
},
metaContainer: {
marginBottom: spacing.lg,
},
metaRow: {
flexDirection: 'row',
alignItems: 'center',
gap: spacing.sm,
marginBottom: spacing.xs,
},
metaText: {
fontSize: typography.sizes.bodySmall,
fontFamily: typography.fonts.regular,
},
tagsContainer: {
flexDirection: 'row',
flexWrap: 'wrap',
gap: spacing.sm,
marginBottom: spacing.lg,
},
tagBadge: {
paddingHorizontal: spacing.lg,
paddingVertical: spacing.sm,
borderRadius: radii.tag,
},
tagBadgeText: {
fontSize: typography.sizes.tag,
fontFamily: typography.fonts.semiBold,
textTransform: 'uppercase',
},
darkSideBadge: {
flexDirection: 'row',
alignItems: 'center',
gap: spacing.xs,
paddingHorizontal: spacing.lg,
paddingVertical: spacing.sm,
borderRadius: radii.tag,
},
darkSideBadgeText: {
fontSize: typography.sizes.tag,
fontFamily: typography.fonts.semiBold,
},
editTagContainer: {
flex: 1,
},
editLabel: {
fontSize: typography.sizes.caption,
fontFamily: typography.fonts.medium,
marginBottom: spacing.xs,
textTransform: 'uppercase',
letterSpacing: typography.letterSpacing.wide,
},
tagInput: {
fontSize: typography.sizes.body,
fontFamily: typography.fonts.regular,
paddingHorizontal: spacing.md,
paddingVertical: spacing.sm,
borderRadius: radii.input,
borderWidth: 1,
},
editTitleContainer: {
marginBottom: spacing.xl,
},
titleInput: {
fontSize: typography.sizes.h4,
fontFamily: typography.fonts.bold,
paddingHorizontal: spacing.md,
paddingVertical: spacing.md,
borderRadius: radii.input,
borderWidth: 1,
textTransform: 'uppercase',
},
charCount: {
fontSize: typography.sizes.caption,
fontFamily: typography.fonts.regular,
textAlign: 'right',
marginTop: spacing.xs,
},
title: {
fontSize: typography.sizes.h3,
fontFamily: typography.fonts.bold,
textTransform: 'uppercase',
letterSpacing: typography.letterSpacing.wide,
marginBottom: spacing.xl,
lineHeight: typography.sizes.h3 * typography.lineHeights.tight,
},
playerContainer: {
borderRadius: radii.card,
padding: spacing.lg,
marginBottom: spacing.xl,
...shadows.card,
},
noAudioText: {
fontSize: typography.sizes.body,
fontFamily: typography.fonts.regular,
textAlign: 'center',
paddingVertical: spacing.xl,
},
progressContainer: {
marginBottom: spacing.lg,
},
progressTrack: {
height: 4,
borderRadius: 2,
overflow: 'hidden',
},
progressFill: {
height: '100%',
borderRadius: 2,
},
timeLabels: {
flexDirection: 'row',
justifyContent: 'space-between',
marginTop: spacing.sm,
},
timeText: {
fontSize: typography.sizes.caption,
fontFamily: typography.fonts.regular,
},
controlsContainer: {
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'center',
gap: spacing.xxl,
},
skipButton: {
alignItems: 'center',
},
skipLabel: {
fontSize: typography.sizes.labelSmall,
fontFamily: typography.fonts.regular,
marginTop: spacing.xxs,
},
playButton: {
width: PLAY_BUTTON_SIZE,
height: PLAY_BUTTON_SIZE,
borderRadius: PLAY_BUTTON_SIZE / 2,
alignItems: 'center',
justifyContent: 'center',
...shadows.md,
},
transcriptContainer: {
marginBottom: spacing.xl,
},
sectionLabel: {
fontSize: typography.sizes.caption,
fontFamily: typography.fonts.medium,
marginBottom: spacing.sm,
textTransform: 'uppercase',
letterSpacing: typography.letterSpacing.wide,
},
transcriptCard: {
borderRadius: radii.card,
padding: spacing.lg,
...shadows.sm,
},
transcriptText: {
fontSize: typography.sizes.body,
fontFamily: typography.fonts.regular,
lineHeight: typography.sizes.body * typography.lineHeights.relaxed,
},
transcriptInput: {
fontSize: typography.sizes.body,
fontFamily: typography.fonts.regular,
paddingHorizontal: spacing.md,
paddingVertical: spacing.md,
borderRadius: radii.input,
borderWidth: 1,
minHeight: 200,
lineHeight: typography.sizes.body * typography.lineHeights.relaxed,
},
notFoundContainer: {
flex: 1,
alignItems: 'center',
justifyContent: 'center',
paddingHorizontal: spacing.xxl,
},
notFoundText: {
fontSize: typography.sizes.h4,
fontFamily: typography.fonts.semiBold,
marginTop: spacing.lg,
marginBottom: spacing.xl,
},
goBackButton: {
paddingHorizontal: spacing.xxl,
paddingVertical: spacing.md,
borderRadius: radii.button,
},
goBackButtonText: {
fontSize: typography.sizes.button,
fontFamily: typography.fonts.semiBold,
},
});
export default EntryDetailScreen;
