import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Artist } from '../../types';
import { Colors } from '../constants/colors';
import { PLACEHOLDER_ART } from '../constants/config';

interface Props {
  artist: Artist;
  size?: 'small' | 'medium' | 'large';
}

export function ArtistCard({ artist, size = 'medium' }: Props) {
  const router = useRouter();
  const dim = size === 'small' ? 72 : size === 'medium' ? 90 : 120;

  return (
    <TouchableOpacity
      style={[styles.container, { width: dim + 20 }]}
      onPress={() => router.push(`/artist/${artist.id}`)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: artist.image || PLACEHOLDER_ART }}
        style={[styles.image, { width: dim, height: dim, borderRadius: dim / 2 }]}
      />
      <Text style={styles.name} numberOfLines={2}>{artist.name}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
  },
  image: {
    backgroundColor: Colors.card,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  name: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});
