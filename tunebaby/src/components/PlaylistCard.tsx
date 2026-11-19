import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Playlist } from '../../types';
import { Colors } from '../constants/colors';

interface Props {
  playlist: Playlist;
  onLongPress?: () => void;
}

export function PlaylistCard({ playlist, onLongPress }: Props) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => router.push(`/playlist/${playlist.id}`)}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={styles.artWrapper}>
        {playlist.coverArt ? (
          <Image source={{ uri: playlist.coverArt }} style={styles.art} />
        ) : (
          <View style={styles.artPlaceholder}>
            <Ionicons name="musical-notes" size={28} color={Colors.accent} />
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{playlist.name}</Text>
        <Text style={styles.count}>{playlist.trackIds.length} song{playlist.trackIds.length !== 1 ? 's' : ''}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 14,
  },
  artWrapper: {
    width: 52,
    height: 52,
    borderRadius: 8,
    overflow: 'hidden',
  },
  art: {
    width: 52,
    height: 52,
  },
  artPlaceholder: {
    width: 52,
    height: 52,
    backgroundColor: Colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '500',
  },
  count: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },
});
