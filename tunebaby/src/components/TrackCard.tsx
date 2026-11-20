import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Track } from '../../types';
import { useTheme } from '../contexts/ThemeContext';
import { PLACEHOLDER_ART } from '../constants/config';
import { usePlayer } from '../contexts/PlayerContext';
import { useLibrary } from '../contexts/LibraryContext';
import { isYouTubeTrack, youtubeIdFromTrack } from '../services/youtube';

interface Props { track: Track; queue?: Track[]; showIndex?: number; compact?: boolean; onLongPress?: () => void; }

export function TrackCard({ track, queue, showIndex, compact = false, onLongPress }: Props) {
  const router = useRouter();
  const { colors } = useTheme();
  const { play, currentTrack, isPlaying } = usePlayer();
  const { isLiked, likeTrack, unlikeTrack } = useLibrary();
  const isCurrent = currentTrack?.id === track.id;
  const liked = isLiked(track.id);

  const handlePlay = () => {
    if (isYouTubeTrack(track)) {
      const vid = youtubeIdFromTrack(track);
      if (vid) { router.push(`/youtube?v=${vid}&title=${encodeURIComponent(track.title)}`); return; }
    }
    play(track, queue ?? [track]);
  };
  const toggleLike = () => liked ? unlikeTrack(track.id) : likeTrack(track);
  const formatDuration = (secs: number) => `${Math.floor(secs / 60)}:${Math.floor(secs % 60).toString().padStart(2, '0')}`;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: isCurrent ? colors.accentDim : colors.glass, borderColor: isCurrent ? colors.accent + '55' : colors.glassBorder }, compact && styles.compact]}
      onPress={handlePlay} onLongPress={onLongPress} activeOpacity={0.78}
    >
      <View style={styles.left}>
        {showIndex !== undefined ? <Text style={[styles.index, { color: isCurrent ? colors.accent : colors.textMuted }]}>{isCurrent && isPlaying ? '♪' : showIndex + 1}</Text> : (
          <View style={styles.artWrapper}>
            <Image source={{ uri: track.albumArt || PLACEHOLDER_ART }} style={[styles.art, { backgroundColor: colors.card }]} />
            {isCurrent && isPlaying && <View style={styles.artOverlay}><Ionicons name="musical-notes" size={14} color="#fff" /></View>}
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={[styles.title, { color: isCurrent ? colors.accent : colors.text }]} numberOfLines={1}>{track.title}</Text>
        <Text style={[styles.artist, { color: colors.textSecondary }]} numberOfLines={1}>{track.artist}</Text>
      </View>
      <View style={styles.right}>
        {track.isPreview ? <View style={[styles.previewBadge, { backgroundColor: colors.accentDim }]}><Text style={[styles.previewText, { color: colors.accent }]}>30s</Text></View> : track.duration > 0 ? <Text style={[styles.duration, { color: colors.textMuted }]}>{formatDuration(track.duration)}</Text> : null}
        <TouchableOpacity onPress={toggleLike} style={styles.likeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}><Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color={liked ? colors.liked : colors.textMuted} /></TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, gap: 12, marginHorizontal: 16, marginBottom: 8, borderRadius: 18, borderWidth: 1 },
  compact: { paddingVertical: 7 },
  left: { width: 44, alignItems: 'center', justifyContent: 'center' },
  artWrapper: { width: 44, height: 44, position: 'relative' },
  art: { width: 44, height: 44, borderRadius: 13 },
  artOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  index: { fontSize: 14, width: 24, textAlign: 'center', fontWeight: '700' },
  info: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700' },
  artist: { fontSize: 12, marginTop: 3 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  duration: { fontSize: 11 },
  previewBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 7 },
  previewText: { fontSize: 10, fontWeight: '800' },
  likeBtn: { padding: 4 },
});
