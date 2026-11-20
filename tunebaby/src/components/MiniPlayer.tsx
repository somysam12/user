import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../contexts/PlayerContext';
import { useTheme } from '../contexts/ThemeContext';
import { MINI_PLAYER_HEIGHT, PLACEHOLDER_ART } from '../constants/config';
import { BlurView } from 'expo-blur';

export function MiniPlayer() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { currentTrack, isPlaying, togglePlay, next, isLoading, position, duration } = usePlayer();
  if (!currentTrack) return null;
  const progress = duration > 0 ? position / duration : 0;

  return (
    <TouchableOpacity style={[styles.container, { borderColor: colors.glassBorder }]} onPress={() => router.push('/player')} activeOpacity={0.92}>
      <BlurView intensity={70} tint={isDark ? 'dark' : 'light'} style={[styles.blur, { backgroundColor: colors.miniPlayer }]}>
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, progress * 100))}%`, backgroundColor: colors.accent }]} />
        </View>
        <View style={styles.row}>
          <Image source={{ uri: currentTrack.albumArt || PLACEHOLDER_ART }} style={[styles.art, { backgroundColor: colors.card }]} />
          <View style={styles.info}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{currentTrack.title}</Text>
            <Text style={[styles.artist, { color: colors.textSecondary }]} numberOfLines={1}>{currentTrack.artist}</Text>
          </View>
          <TouchableOpacity onPress={togglePlay} style={[styles.playBtn, { backgroundColor: colors.accent }]}>
            {isLoading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name={isPlaying ? 'pause' : 'play'} size={18} color="#fff" style={isPlaying ? undefined : { marginLeft: 2 }} />}
          </TouchableOpacity>
          <TouchableOpacity onPress={next} style={styles.nextBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="play-skip-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </BlurView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { height: MINI_PLAYER_HEIGHT, borderWidth: 1, borderRadius: 20, overflow: 'hidden' },
  blur: { flex: 1 },
  progressTrack: { height: 2 },
  progressFill: { height: '100%' },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 10 },
  art: { width: 42, height: 42, borderRadius: 13 },
  info: { flex: 1 },
  title: { fontSize: 13, fontWeight: '700' },
  artist: { fontSize: 11, marginTop: 3 },
  playBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  nextBtn: { width: 32, height: 36, alignItems: 'center', justifyContent: 'center' },
});
