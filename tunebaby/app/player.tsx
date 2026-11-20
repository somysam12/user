import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Image, StyleSheet,
  Dimensions, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../src/contexts/ThemeContext';
import { PLACEHOLDER_ART } from '../src/constants/config';
import { usePlayer } from '../src/contexts/PlayerContext';
import { useLibrary } from '../src/contexts/LibraryContext';

const { width: W } = Dimensions.get('window');

function fmt(secs: number): string {
  if (!isFinite(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function PlayerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const {
    currentTrack, isPlaying, togglePlay, next, prev,
    position, duration, isShuffled, repeatMode,
    toggleShuffle, toggleRepeat, seekTo, queue, isLoading, error, clearError,
  } = usePlayer();
  const { isLiked, likeTrack, unlikeTrack, downloadTrack, downloadedTracks } = useLibrary();
  const [downloading, setDownloading] = useState(false);

  if (!currentTrack) {
    router.back();
    return null;
  }

  const liked = isLiked(currentTrack.id);
  const isDownloaded = downloadedTracks.some((t) => t.id === currentTrack.id);
  const progress = duration > 0 ? Math.max(0, Math.min(1, position / duration)) : 0;

  const handleSeekPress = (evt: any, barWidth: number) => {
    if (barWidth <= 0) return;
    const x = evt.nativeEvent.locationX;
    seekTo((x / barWidth) * duration);
  };

  const handleDownload = async () => {
    if (isDownloaded || !currentTrack.downloadAllowed) {
      Alert.alert('Download unavailable', 'This track cannot be saved for offline use.');
      return;
    }
    setDownloading(true);
    try {
      await downloadTrack(currentTrack);
      Alert.alert('Saved', `"${currentTrack.title}" saved for offline listening.`);
    } catch (e: any) {
      Alert.alert('Download failed', e.message ?? 'Could not save track.');
    } finally { setDownloading(false); }
  };

  const toggleLike = () => {
    if (liked) unlikeTrack(currentTrack.id);
    else likeTrack(currentTrack);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 16, backgroundColor: colors.playerBg }]}>
      <LinearGradient
        colors={isDark ? [colors.cardAlt, colors.playerBg] : [colors.card, colors.playerBg]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 0.45 }}
      />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.topBtn}>
          <Ionicons name="chevron-down" size={28} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.topCenter}>
          <Text style={[styles.topLabel, { color: colors.textMuted }]}>NOW PLAYING</Text>
        </View>
        <View style={styles.topBtn} />
      </View>

      {/* Album art */}
      <View style={styles.artWrapper}>
        <View style={[styles.artShadow, { shadowColor: colors.accent }]}>
          <Image
            source={{ uri: currentTrack.albumArt || PLACEHOLDER_ART }}
            style={styles.art}
            resizeMode="cover"
          />
        </View>
      </View>

      {/* Track info + actions */}
      <View style={styles.infoRow}>
        <View style={styles.infoText}>
          <Text style={[styles.trackTitle, { color: colors.text }]} numberOfLines={1}>
            {currentTrack.title}
          </Text>
          <Text style={[styles.trackArtist, { color: colors.textSecondary }]} numberOfLines={1}>
            {currentTrack.artist}
          </Text>
          {currentTrack.isPreview && (
            <View style={[styles.previewBadge, { backgroundColor: colors.accentDim }]}>
              <Ionicons name="time-outline" size={11} color={colors.accent} />
              <Text style={[styles.previewBadgeText, { color: colors.accent }]}>30s Preview</Text>
            </View>
          )}
        </View>
        <View style={styles.actionBtns}>
          <TouchableOpacity onPress={toggleLike} style={styles.actionBtn}>
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={26}
              color={liked ? colors.liked : colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDownload} style={styles.actionBtn} disabled={isDownloaded || downloading}>
            {downloading ? (
              <ActivityIndicator size="small" color={colors.textSecondary} />
            ) : (
              <Ionicons
                name={isDownloaded ? 'checkmark-circle' : 'download-outline'}
                size={26}
                color={isDownloaded ? colors.success : colors.textSecondary}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Error */}
      {error && (
        <TouchableOpacity style={[styles.errorBar, { backgroundColor: colors.card }]} onPress={clearError}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.warning} />
          <Text style={[styles.errorText, { color: colors.warning }]} numberOfLines={2}>{error}</Text>
          <Ionicons name="close" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      )}

      {/* Seek bar */}
      <View style={styles.seekSection}>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.seekTouchArea}
          onPress={(e) => {
            const barWidth = W - 48;
            handleSeekPress(e, barWidth);
          }}
        >
          <View style={[styles.seekTrack, { backgroundColor: colors.border }]}>
            <View style={[styles.seekFill, { width: `${progress * 100}%`, backgroundColor: colors.accent }]} />
            <View style={[styles.seekThumb, { left: `${progress * 100}%`, backgroundColor: colors.accent }]} />
          </View>
        </TouchableOpacity>
        <View style={styles.timeRow}>
          <Text style={[styles.time, { color: colors.textMuted }]}>{fmt(position)}</Text>
          <Text style={[styles.time, { color: colors.textMuted }]}>{fmt(duration)}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity onPress={toggleShuffle} style={styles.ctrlBtn}>
          <Ionicons name="shuffle" size={23} color={isShuffled ? colors.accent : colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity onPress={prev} style={styles.ctrlBtn}>
          <Ionicons name="play-skip-back" size={30} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={togglePlay} style={[styles.playBtn, { backgroundColor: colors.accent }]} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={36} color="#fff" style={isPlaying ? undefined : { marginLeft: 4 }} />
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={next} style={styles.ctrlBtn}>
          <Ionicons name="play-skip-forward" size={30} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={toggleRepeat} style={styles.ctrlBtn}>
          <Ionicons
            name={repeatMode === 'one' ? 'repeat' : 'repeat'}
            size={23}
            color={repeatMode !== 'off' ? colors.accent : colors.textMuted}
          />
          {repeatMode === 'one' && (
            <View style={[styles.repeatDot, { backgroundColor: colors.accent }]} />
          )}
        </TouchableOpacity>
      </View>

      {queue.length > 1 && (
        <View style={styles.queueInfo}>
          <Ionicons name="list-outline" size={14} color={colors.textMuted} />
          <Text style={[styles.queueText, { color: colors.textMuted }]}>{queue.length} in queue</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 8 },
  topBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topCenter: { flex: 1, alignItems: 'center' },
  topLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  artWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 12 },
  artShadow: { shadowRadius: 20, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 8 } },
  art: { width: W - 72, height: W - 72, borderRadius: 20, backgroundColor: '#222' },
  artPlaying: { elevation: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 24, gap: 12, marginBottom: 8 },
  infoText: { flex: 1 },
  trackTitle: { fontSize: 21, fontWeight: '700', letterSpacing: -0.3 },
  trackArtist: { fontSize: 15, marginTop: 4 },
  previewBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 8 },
  previewBadgeText: { fontSize: 11, fontWeight: '600' },
  actionBtns: { flexDirection: 'row', gap: 2, paddingTop: 2 },
  actionBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  errorBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 20, marginBottom: 8, padding: 12, borderRadius: 12,
  },
  errorText: { flex: 1, fontSize: 12 },
  seekSection: { paddingHorizontal: 24, marginBottom: 4 },
  seekTouchArea: { paddingVertical: 14 },
  seekTrack: { height: 4, borderRadius: 2, position: 'relative' },
  seekFill: { height: '100%', borderRadius: 2 },
  seekThumb: {
    position: 'absolute', top: -6, marginLeft: -8,
    width: 16, height: 16, borderRadius: 8,
  },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  time: { fontSize: 12 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 8 },
  ctrlBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  playBtn: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    elevation: 8, shadowRadius: 16, shadowOpacity: 0.4,
  },
  repeatDot: {
    position: 'absolute', bottom: 6,
    width: 4, height: 4, borderRadius: 2,
  },
  queueInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingTop: 4 },
  queueText: { fontSize: 12 },
});
