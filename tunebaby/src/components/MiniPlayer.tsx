import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../contexts/PlayerContext';
import { useTheme } from '../contexts/ThemeContext';
import { MINI_PLAYER_HEIGHT, PLACEHOLDER_ART } from '../constants/config';

export function MiniPlayer() {
  const router = useRouter();
  const { colors } = useTheme();
  const { currentTrack, isPlaying, togglePlay, next, prev, isLoading, position, duration } = usePlayer();

  if (!currentTrack) return null;

  const progress = duration > 0 ? position / duration : 0;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.miniPlayer, borderTopColor: colors.tabBarBorder }]}
      onPress={() => router.push('/player')}
      activeOpacity={0.95}
    >
      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, progress * 100))}%`, backgroundColor: colors.accent }]} />
      </View>

      <View style={styles.row}>
        <Image
          source={{ uri: currentTrack.albumArt || PLACEHOLDER_ART }}
          style={[styles.art, { backgroundColor: colors.card }]}
        />
        <View style={styles.info}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{currentTrack.title}</Text>
          <Text style={[styles.artist, { color: colors.textSecondary }]} numberOfLines={1}>{currentTrack.artist}</Text>
        </View>
        <View style={styles.controls}>
          <TouchableOpacity onPress={prev} style={styles.btn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="play-skip-back" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={togglePlay} style={[styles.btn, styles.playBtn, { backgroundColor: colors.accent }]}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color="#fff" style={isPlaying ? undefined : { marginLeft: 2 }} />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={next} style={styles.btn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="play-skip-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    height: MINI_PLAYER_HEIGHT,
    borderTopWidth: 1,
  },
  progressTrack: { height: 2 },
  progressFill: { height: '100%' },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 12,
  },
  art: {
    width: 42,
    height: 42,
    borderRadius: 8,
  },
  info: { flex: 1 },
  title: { fontSize: 14, fontWeight: '600' },
  artist: { fontSize: 12, marginTop: 2 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  playBtn: { width: 38, height: 38, borderRadius: 19 },
});
