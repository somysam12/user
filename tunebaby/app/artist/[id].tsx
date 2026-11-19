import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Track, Album } from '../../types';
import { Colors } from '../../src/constants/colors';
import { PLACEHOLDER_ART } from '../../src/constants/config';
import { getArtistTracks, getArtistAlbums } from '../../src/services/jamendo';
import { TrackCard } from '../../src/components/TrackCard';
import { AlbumCard } from '../../src/components/AlbumCard';
import { SectionHeader } from '../../src/components/SectionHeader';
import { ErrorState } from '../../src/components/ErrorState';
import { usePlayer } from '../../src/contexts/PlayerContext';

export default function ArtistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { play } = usePlayer();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [t, a] = await Promise.all([getArtistTracks(id), getArtistAlbums(id)]);
        setTracks(t);
        setAlbums(a);
      } catch (e: any) {
        setError(e.message ?? 'Could not load artist.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const artistName = tracks[0]?.artist ?? 'Artist';
  const artistImage = tracks[0]?.albumArt ?? PLACEHOLDER_ART;
  const displayTracks = showAll ? tracks : tracks.slice(0, 5);

  if (loading) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <ErrorState message={error} onRetry={() => { setError(null); setLoading(true); }} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.artHeader}>
          <Image source={{ uri: artistImage }} style={styles.headerArt} />
          <LinearGradient colors={['transparent', Colors.bg]} style={StyleSheet.absoluteFillObject} />
          <View style={[styles.headerOverlay, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={Colors.text} />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <Text style={styles.artistName}>{artistName}</Text>
              <Text style={styles.artistMeta}>{tracks.length} songs · {albums.length} albums</Text>
            </View>
          </View>
        </View>

        {/* Shuffle play */}
        {tracks.length > 0 && (
          <TouchableOpacity
            style={styles.shuffleBtn}
            onPress={() => {
              const shuffled = [...tracks].sort(() => Math.random() - 0.5);
              play(shuffled[0], shuffled);
            }}
          >
            <Ionicons name="shuffle" size={18} color="#fff" />
            <Text style={styles.shuffleBtnText}>Shuffle Play</Text>
          </TouchableOpacity>
        )}

        {/* Top tracks */}
        {tracks.length > 0 && (
          <>
            <SectionHeader title="Popular" />
            {displayTracks.map((track, idx) => (
              <TrackCard key={track.id} track={track} queue={tracks} showIndex={idx} />
            ))}
            {tracks.length > 5 && (
              <TouchableOpacity style={styles.showMoreBtn} onPress={() => setShowAll((s) => !s)}>
                <Text style={styles.showMoreText}>{showAll ? 'Show less' : `Show all ${tracks.length} songs`}</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Albums */}
        {albums.length > 0 && (
          <>
            <SectionHeader title="Albums" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 16, paddingBottom: 8 }}>
              {albums.map((album) => (
                <AlbumCard key={album.id} album={album} size={130} />
              ))}
            </ScrollView>
          </>
        )}

        {tracks.length === 0 && albums.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No music found for this artist</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  artHeader: { height: 280, position: 'relative', backgroundColor: Colors.card },
  headerArt: { width: '100%', height: '100%', opacity: 0.7 },
  headerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, padding: 16, justifyContent: 'space-between' },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  headerInfo: { gap: 4 },
  artistName: { color: '#fff', fontSize: 28, fontWeight: '800' },
  artistMeta: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  shuffleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center',
    marginVertical: 16, paddingHorizontal: 28, paddingVertical: 12,
    backgroundColor: Colors.accent, borderRadius: 24,
  },
  shuffleBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  showMoreBtn: { alignItems: 'center', paddingVertical: 12 },
  showMoreText: { color: Colors.accent, fontSize: 14, fontWeight: '500' },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { color: Colors.textSecondary, fontSize: 15 },
});
