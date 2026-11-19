import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity,
  Image, StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Track, Artist, Album } from '../../types';
import { Colors } from '../../src/constants/colors';
import { JAMENDO_CLIENT_ID, PLACEHOLDER_ART } from '../../src/constants/config';
import {
  getTrendingTracks, getFeaturedTracks,
  getTrendingArtists, getNewAlbums, isJamendoConfigured,
} from '../../src/services/jamendo';
import { TrackCard } from '../../src/components/TrackCard';
import { ArtistCard } from '../../src/components/ArtistCard';
import { AlbumCard } from '../../src/components/AlbumCard';
import { SectionHeader } from '../../src/components/SectionHeader';
import { usePlayer } from '../../src/contexts/PlayerContext';
import { useLibrary } from '../../src/contexts/LibraryContext';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { play } = usePlayer();
  const { recentlyPlayed } = useLibrary();
  const [featured, setFeatured] = useState<Track[]>([]);
  const [trending, setTrending] = useState<Track[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      if (!isJamendoConfigured()) {
        setError('jamendo_not_configured');
        return;
      }
      const [f, t, a, al] = await Promise.all([
        getFeaturedTracks(10),
        getTrendingTracks(20),
        getTrendingArtists(15),
        getNewAlbums(15),
      ]);
      setFeatured(f);
      setTrending(t);
      setArtists(a);
      setAlbums(al);
    } catch (e: any) {
      setError(e.message ?? 'Could not load music. Check your internet connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const onRefresh = () => { setRefreshing(true); load(true); };

  const FeaturedCard = ({ item }: { item: Track }) => (
    <TouchableOpacity style={styles.featuredCard} onPress={() => play(item, featured)} activeOpacity={0.85}>
      <Image source={{ uri: item.albumArt || PLACEHOLDER_ART }} style={styles.featuredArt} />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.featuredInfo}>
        <Text style={styles.featuredTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.featuredArtist}>{item.artist}</Text>
      </View>
      <View style={styles.featuredPlayBtn}>
        <Ionicons name="play" size={20} color="#fff" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.appName}>TuneBaby</Text>
        </View>
        <TouchableOpacity style={styles.headerBtn}>
          <Ionicons name="notifications-outline" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
      >
        {/* Jamendo setup notice */}
        {error === 'jamendo_not_configured' && (
          <TouchableOpacity style={styles.setupBanner} onPress={() => router.push('/library')}>
            <Ionicons name="musical-notes" size={20} color={Colors.accent} />
            <View style={styles.setupBannerText}>
              <Text style={styles.setupBannerTitle}>Stream Free Music Online</Text>
              <Text style={styles.setupBannerSub}>Add your Jamendo API key to discover millions of free songs →</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Network error */}
        {error && error !== 'jamendo_not_configured' && (
          <View style={styles.errorBanner}>
            <Ionicons name="wifi-outline" size={18} color={Colors.warning} />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {/* Featured horizontal scroll */}
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={Colors.accent} />
            <Text style={styles.loadingText}>Loading music…</Text>
          </View>
        ) : featured.length > 0 ? (
          <>
            <SectionHeader title="Featured" />
            <FlatList
              horizontal
              data={featured}
              keyExtractor={(i) => i.id}
              renderItem={({ item }) => <FeaturedCard item={item} />}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
              showsHorizontalScrollIndicator={false}
            />
          </>
        ) : null}

        {/* Recently Played */}
        {recentlyPlayed.length > 0 && (
          <>
            <SectionHeader title="Recently Played" />
            {recentlyPlayed.slice(0, 5).map((track) => (
              <TrackCard key={track.id} track={track} queue={recentlyPlayed} />
            ))}
          </>
        )}

        {/* Trending Now */}
        {trending.length > 0 && (
          <>
            <SectionHeader title="Trending Now" />
            {trending.slice(0, 8).map((track) => (
              <TrackCard key={track.id} track={track} queue={trending} />
            ))}
          </>
        )}

        {/* Popular Artists */}
        {artists.length > 0 && (
          <>
            <SectionHeader title="Popular Artists" />
            <FlatList
              horizontal
              data={artists}
              keyExtractor={(i) => i.id}
              renderItem={({ item }) => <ArtistCard artist={item} />}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}
              showsHorizontalScrollIndicator={false}
            />
          </>
        )}

        {/* New Releases */}
        {albums.length > 0 && (
          <>
            <SectionHeader title="New Releases" />
            <FlatList
              horizontal
              data={albums}
              keyExtractor={(i) => i.id}
              renderItem={({ item }) => <AlbumCard album={item} />}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}
              showsHorizontalScrollIndicator={false}
            />
          </>
        )}

        {/* Local music notice when no Jamendo */}
        {error === 'jamendo_not_configured' && (
          <View style={styles.localNotice}>
            <Ionicons name="folder-open-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.localTitle}>Your device music is in Library</Text>
            <Text style={styles.localSub}>Import audio files from your device to start listening offline</Text>
            <TouchableOpacity style={styles.localBtn} onPress={() => router.push('/library')}>
              <Text style={styles.localBtnText}>Go to Library</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  greeting: { color: Colors.textSecondary, fontSize: 13 },
  appName: { color: Colors.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  headerBtn: { padding: 8 },
  setupBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    margin: 16, padding: 14, backgroundColor: Colors.card, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.accentDim,
  },
  setupBannerText: { flex: 1 },
  setupBannerTitle: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  setupBannerSub: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 16, padding: 12, backgroundColor: Colors.card, borderRadius: 8,
  },
  errorBannerText: { color: Colors.textSecondary, fontSize: 13, flex: 1 },
  loadingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 40, justifyContent: 'center',
  },
  loadingText: { color: Colors.textSecondary, fontSize: 14 },
  featuredCard: {
    width: 220, height: 150, borderRadius: 12, overflow: 'hidden',
    backgroundColor: Colors.card,
  },
  featuredArt: { width: '100%', height: '100%' },
  featuredInfo: { position: 'absolute', bottom: 36, left: 12, right: 12 },
  featuredTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  featuredArtist: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  featuredPlayBtn: {
    position: 'absolute', bottom: 10, right: 12,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  localNotice: { alignItems: 'center', padding: 32, gap: 12, marginTop: 24 },
  localTitle: { color: Colors.text, fontSize: 17, fontWeight: '600', textAlign: 'center' },
  localSub: { color: Colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  localBtn: { marginTop: 8, backgroundColor: Colors.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  localBtnText: { color: '#fff', fontWeight: '600' },
});
