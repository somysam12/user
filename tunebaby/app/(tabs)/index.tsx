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
import { PLACEHOLDER_ART } from '../../src/constants/config';
import { getChartTracks, getChartArtists, getChartAlbums, getForYouTracks, getBollywoodTracks } from '../../src/services/deezer';
import { getSelectedArtists } from '../../src/services/storage';
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
  const [forYou, setForYou] = useState<Track[]>([]);
  const [bollywood, setBollywood] = useState<Track[]>([]);
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
      const selectedArtists = await getSelectedArtists();
      const [t, a, al, fy, bw] = await Promise.all([
        getChartTracks(20),
        getChartArtists(15),
        getChartAlbums(15),
        selectedArtists.length > 0 ? getForYouTracks(selectedArtists.map((id) => id.replace(/_/g, ' ')), 15) : Promise.resolve([]),
        getBollywoodTracks(15),
      ]);
      setFeatured(t.slice(0, 8));
      setTrending(t);
      setArtists(a);
      setAlbums(al);
      setForYou(fy);
      setBollywood(bw);
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
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={StyleSheet.absoluteFillObject} />
      <View style={styles.featuredInfo}>
        <Text style={styles.featuredTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.featuredArtist}>{item.artist}</Text>
      </View>
      <View style={styles.featuredPlayBtn}>
        <Ionicons name="play" size={20} color="#fff" />
      </View>
      {item.isPreview && (
        <View style={styles.featuredPreviewBadge}>
          <Text style={styles.featuredPreviewText}>30s Preview</Text>
        </View>
      )}
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
        {/* Preview source notice */}
        <View style={styles.sourceBanner}>
          <Ionicons name="musical-note" size={14} color={Colors.accent} />
          <Text style={styles.sourceBannerText}>
            Streaming via Deezer · 30-sec previews · No sign-in needed
          </Text>
        </View>

        {/* Error */}
        {error && (
          <TouchableOpacity style={styles.errorBanner} onPress={() => load()}>
            <Ionicons name="wifi-outline" size={18} color={Colors.warning} />
            <Text style={styles.errorBannerText}>{error} · Tap to retry</Text>
          </TouchableOpacity>
        )}

        {/* Loading */}
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={Colors.accent} />
            <Text style={styles.loadingText}>Loading top charts…</Text>
          </View>
        ) : (
          <>
            {/* Featured horizontal scroll */}
            {featured.length > 0 && (
              <>
                <SectionHeader title="Top Charts" onSeeAll={() => {}} />
                <FlatList
                  horizontal
                  data={featured}
                  keyExtractor={(i) => i.id}
                  renderItem={({ item }) => <FeaturedCard item={item} />}
                  contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
                  showsHorizontalScrollIndicator={false}
                />
              </>
            )}

            {/* Recently Played */}
            {recentlyPlayed.length > 0 && (
              <>
                <SectionHeader title="Recently Played" />
                {recentlyPlayed.slice(0, 5).map((track) => (
                  <TrackCard key={track.id} track={track} queue={recentlyPlayed} />
                ))}
              </>
            )}

            {/* For You — personalized by selected artists */}
            {forYou.length > 0 && (
              <>
                <SectionHeader title="For You" />
                {forYou.slice(0, 8).map((track) => (
                  <TrackCard key={track.id} track={track} queue={forYou} />
                ))}
              </>
            )}

            {/* Bollywood Top */}
            {bollywood.length > 0 && (
              <>
                <SectionHeader title="Bollywood Top" onSeeAll={() => router.push('/search')} />
                <FlatList
                  horizontal
                  data={bollywood}
                  keyExtractor={(i) => i.id}
                  renderItem={({ item }) => <FeaturedCard item={item} />}
                  contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
                  showsHorizontalScrollIndicator={false}
                />
              </>
            )}

            {/* Trending Now */}
            {trending.length > 0 && (
              <>
                <SectionHeader title="Global Trending" onSeeAll={() => router.push('/search')} />
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
                <SectionHeader title="Popular Albums" />
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
          </>
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
  sourceBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 16, marginBottom: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: Colors.accentDim, borderRadius: 20,
    alignSelf: 'flex-start',
  },
  sourceBannerText: { color: Colors.accent, fontSize: 11, fontWeight: '600' },
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
  featuredPreviewBadge: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  featuredPreviewText: { color: Colors.accent, fontSize: 10, fontWeight: '700' },
});
