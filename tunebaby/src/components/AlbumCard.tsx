import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Album } from '../../types';
import { Colors } from '../constants/colors';
import { PLACEHOLDER_ART } from '../constants/config';

interface Props {
  album: Album;
  size?: number;
}

export function AlbumCard({ album, size = 140 }: Props) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={[styles.container, { width: size }]}
      onPress={() => router.push(`/artist/${album.artistId}?album=${album.id}`)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: album.image || PLACEHOLDER_ART }}
        style={[styles.image, { width: size, height: size }]}
      />
      <Text style={styles.name} numberOfLines={2}>{album.name}</Text>
      <Text style={styles.artist} numberOfLines={1}>{album.artist}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  image: {
    borderRadius: 8,
    backgroundColor: Colors.card,
  },
  name: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '500',
  },
  artist: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
});
