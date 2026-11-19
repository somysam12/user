import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../contexts/PlayerContext';
import { Colors } from '../constants/colors';
import { MINI_PLAYER_HEIGHT, PLACEHOLDER_ART } from '../constants/config';

export function MiniPlayer() {
  const router = useRouter();
  const { currentTrack, isPlaying, togglePlay, next, isLoading } = usePlayer();
  if (!currentTrack) return null;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => router.push('/player')}
      activeOpacity={0.9}
    >
      <View style={styles.progress} />
      <View style={styles.row}>
        <Image
          source={{ uri: currentTrack.albumArt || PLACEHOLDER_ART }}
          style={styles.art}
        />
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{currentTrack.title}</Text>
          <Text style={styles.artist} numberOfLines={1}>{currentTrack.artist}</Text>
        </View>
        <View style={styles.controls}>
          <TouchableOpacity onPress={togglePlay} style={styles.btn}>
            {isLoading ? (
              <ActivityIndicator size="small" color={Colors.text} />
            ) : (
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={24} color={Colors.text} />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={next} style={styles.btn}>
            <Ionicons name="play-skip-forward" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    height: MINI_PLAYER_HEIGHT,
    backgroundColor: Colors.miniPlayer,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    borderBottomWidth: 0,
  },
  progress: {
    height: 2,
    backgroundColor: Colors.accent,
    width: '30%',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 12,
  },
  art: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: Colors.card,
  },
  info: {
    flex: 1,
  },
  title: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  artist: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  btn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
