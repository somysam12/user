import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Track } from '../../types';
import { Colors } from '../constants/colors';
import { PLACEHOLDER_ART } from '../constants/config';
import { usePlayer } from '../contexts/PlayerContext';
import { useLibrary } from '../contexts/LibraryContext';

interface Props {
  track: Track;
  queue?: Track[];
  showIndex?: number;
  compact?: boolean;
  onLongPress?: () => void;
}

export function TrackCard({ track, queue, showIndex, compact = false, onLongPress }: Props) {
  const { play, currentTrack, isPlaying } = usePlayer();
  const { isLiked, likeTrack, unlikeTrack } = useLibrary();
  const isCurrent = currentTrack?.id === track.id;
  const liked = isLiked(track.id);
  const isPreview = track.isPreview === true;

  const handlePlay = () => play(track, queue ?? [track]);

  const toggleLike = () => {
    if (liked) unlikeTrack(track.id);
    else likeTrack(track);
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <TouchableOpacity
      style={[styles.container, compact && styles.compact, isCurrent && styles.active]}
      onPress={handlePlay}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={styles.left}>
        {showIndex !== undefined ? (
          <Text style={[styles.index, isCurrent && styles.indexActive]}>
            {isCurrent && isPlaying ? '▶' : showIndex + 1}
          </Text>
        ) : (
          <View style={styles.artWrapper}>
            <Image source={{ uri: track.albumArt || PLACEHOLDER_ART }} style={styles.art} />
            {isCurrent && isPlaying && (
              <View style={styles.artOverlay}>
                <Ionicons name="musical-notes" size={14} color={Colors.accent} />
              </View>
            )}
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={[styles.title, isCurrent && styles.titleActive]} numberOfLines={1}>{track.title}</Text>
        <Text style={styles.artist} numberOfLines={1}>{track.artist}</Text>
      </View>
      <View style={styles.right}>
        {isPreview && <Text style={styles.previewBadge}>30s</Text>}
        {!isPreview && track.duration > 0 && <Text style={styles.duration}>{formatDuration(track.duration)}</Text>}
        <TouchableOpacity onPress={toggleLike} style={styles.likeBtn}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color={liked ? Colors.liked : Colors.textMuted} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 12,
  },
  compact: {
    paddingVertical: 7,
  },
  active: {
    backgroundColor: Colors.accentDim,
    borderRadius: 10,
  },
  left: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artWrapper: {
    width: 44,
    height: 44,
    position: 'relative',
  },
  art: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: Colors.card,
  },
  artOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  index: {
    color: Colors.textMuted,
    fontSize: 14,
    width: 24,
    textAlign: 'center',
  },
  indexActive: {
    color: Colors.accent,
  },
  info: {
    flex: 1,
  },
  title: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  titleActive: {
    color: Colors.accent,
  },
  artist: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  duration: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  previewBadge: {
    color: Colors.accent,
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: Colors.accentDim,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  likeBtn: {
    padding: 4,
  },
});
