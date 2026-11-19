import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Image, StyleSheet,
  PanResponder, Dimensions, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../src/constants/colors';
import { PLACEHOLDER_ART } from '../src/constants/config';
import { usePlayer } from '../src/contexts/PlayerContext';
import { useLibrary } from '../src/contexts/LibraryContext';

const { width: SCREEN_W } = Dimensions.get('window');

function formatTime(secs: number): string {
  if (!isFinite(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function PlayerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentTrack, isPlaying, togglePlay, next, prev, position, duration, isShuffled, repeatMode, toggleShuffle, toggleRepeat, seekTo, queue, isLoading, error, clearError } = usePlayer();
  const { isLiked, likeTrack, unlikeTrack, downloadTrack, downloadedTracks } = useLibrary();
  const [seekDragging, setSeekDragging] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const seekBarRef = useRef<View>(null);
  const seekBarX = useRef(0);
  const seekBarW = useRef(0);

  if (!currentTrack) {
    router.back();
    return null;
  }

  const liked = isLiked(currentTrack.id);
  const isDownloaded = downloadedTracks.some((t) => t.id === currentTrack.id);
  const progress = duration > 0 ? (seekDragging ? seekValue : position) / duration : 0;

  const handleSeekPress = (evt: any) => {
    if (seekBarW.current <= 0) return;
    const x = evt.nativeEvent.locationX;
    const ratio = Math.max(0, Math.min(1, x / seekBarW.current));
    seekTo(ratio * duration);
  };

  const handleDownload = async () => {
    if (isDownloaded) return;
    if (!currentTrack.downloadAllowed) {
      Alert.alert('Download unavailable', 'This track cannot be downloaded.');
      return;
    }
    setDownloading(true);
    try {
      await downloadTrack(currentTrack);
      Alert.alert('Downloaded', `"${currentTrack.title}" saved for offline listening.`);
    } catch (e: any) {
      Alert.alert('Download failed', e.message ?? 'Could not download.');
    } finally {
      setDownloading(false);
    }
  };

  const toggleLike = () => {
    if (liked) unlikeTrack(currentTrack.id);
    else likeTrack(currentTrack);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <LinearGradient
        colors={[Colors.cardAlt, Colors.bg]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 0.5 }}
      />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.topBtn}>
          <Ionicons name="chevron-down" size={28} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.topCenter}>
          <Text style={styles.topLabel}>Now Playing</Text>
        </View>
        <TouchableOpacity style={styles.topBtn}>
          <Ionicons name="ellipsis-horizontal" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Album art */}
      <View style={styles.artWrapper}>
        <Image
          source={{ uri: currentTrack.albumArt || PLACEHOLDER_ART }}
          style={[styles.art, isPlaying && styles.artPlaying]}
          resizeMode="cover"
        />
      </View>

      {/* Track info + actions */}
      <View style={styles.infoRow}>
        <View style={styles.infoText}>
          <Text style={styles.trackTitle} numberOfLines={1}>{currentTrack.title}</Text>
          <Text style={styles.trackArtist} numberOfLines={1}>{currentTrack.artist}</Text>
        </View>
        <View style={styles.actionBtns}>
          <TouchableOpacity onPress={toggleLike} style={styles.actionBtn}>
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={24} color={liked ? Colors.liked : Colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDownload} style={styles.actionBtn} disabled={isDownloaded || downloading}>
            {downloading ? (
              <ActivityIndicator size="small" color={Colors.textSecondary} />
            ) : (
              <Ionicons name={isDownloaded ? 'checkmark-circle' : 'download-outline'} size={24} color={isDownloaded ? Colors.success : Colors.textSecondary} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Error */}
      {error && (
        <TouchableOpacity style={styles.errorBar} onPress={clearError}>
          <Ionicons name="alert-circle-outline" size={16} color={Colors.warning} />
          <Text style={styles.errorText} numberOfLines={2}>{error}</Text>
          <Ionicons name="close" size={16} color={Colors.textMuted} />
        </TouchableOpacity>
      )}

      {/* Seek bar */}
      <View style={styles.seekSection}>
        <TouchableOpacity
          style={styles.seekBar}
          activeOpacity={1}
          onPress={handleSeekPress}
          ref={seekBarRef}
          onLayout={(e) => { seekBarW.current = e.nativeEvent.layout.width; seekBarX.current = e.nativeEvent.layout.x; }}
        >
          <View style={styles.seekTrack}>
            <View style={[styles.seekFill, { width: `${Math.max(0, Math.min(100, progress * 100))}%` }]} />
            <View style={[styles.seekThumb, { left: `${Math.max(0, Math.min(100, progress * 100))}%` }]} />
          </View>
        </TouchableOpacity>
        <View style={styles.timeRow}>
          <Text style={styles.time}>{formatTime(position)}</Text>
          <Text style={styles.time}>{formatTime(duration)}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity onPress={toggleShuffle} style={styles.ctrlBtn}>
          <Ionicons name="shuffle" size={22} color={isShuffled ? Colors.accent : Colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity onPress={prev} style={styles.ctrlBtn}>
          <Ionicons name="play-skip-back" size={28} color={Colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={togglePlay}
          style={styles.playBtn}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={34} color="#fff" style={isPlaying ? undefined : { marginLeft: 3 }} />
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={next} style={styles.ctrlBtn}>
          <Ionicons name="play-skip-forward" size={28} color={Colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={toggleRepeat} style={styles.ctrlBtn}>
          <Ionicons
            name={repeatMode === 'one' ? 'repeat-outline' : 'repeat'}
            size={22}
            color={repeatMode !== 'off' ? Colors.accent : Colors.textMuted}
          />
          {repeatMode === 'one' && <View style={styles.repeatOneDot} />}
        </TouchableOpacity>
      </View>

      {/* Queue info */}
      {queue.length > 1 && (
        <View style={styles.queueInfo}>
          <Ionicons name="list" size={14} color={Colors.textMuted} />
          <Text style={styles.queueText}>{queue.length} songs in queue</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.playerBg },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 8 },
  topBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topCenter: { flex: 1, alignItems: 'center' },
  topLabel: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  artWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 16 },
  art: { width: SCREEN_W - 80, height: SCREEN_W - 80, borderRadius: 16, backgroundColor: Colors.card },
  artPlaying: { shadowColor: Colors.accent, shadowRadius: 24, shadowOpacity: 0.5, elevation: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, gap: 12, marginBottom: 8 },
  infoText: { flex: 1 },
  trackTitle: { color: Colors.text, fontSize: 20, fontWeight: '700' },
  trackArtist: { color: Colors.textSecondary, fontSize: 15, marginTop: 4 },
  actionBtns: { flexDirection: 'row', gap: 4 },
  actionBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  errorBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 8, padding: 10,
    backgroundColor: Colors.card, borderRadius: 10,
  },
  errorText: { flex: 1, color: Colors.warning, fontSize: 12 },
  seekSection: { paddingHorizontal: 24, marginBottom: 8 },
  seekBar: { paddingVertical: 12 },
  seekTrack: { height: 4, backgroundColor: Colors.border, borderRadius: 2, position: 'relative' },
  seekFill: { height: '100%', backgroundColor: Colors.accent, borderRadius: 2 },
  seekThumb: {
    position: 'absolute', top: -6, marginLeft: -8,
    width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.accent,
  },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  time: { color: Colors.textMuted, fontSize: 12 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 8 },
  ctrlBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  playBtn: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.accent, shadowRadius: 16, shadowOpacity: 0.5, elevation: 8,
  },
  repeatOneDot: {
    position: 'absolute', bottom: 6, width: 4, height: 4,
    borderRadius: 2, backgroundColor: Colors.accent,
  },
  queueInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingBottom: 8 },
  queueText: { color: Colors.textMuted, fontSize: 12 },
});
