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
import { useTheme } from '../../src/contexts/ThemeContext';
import { PLACEHOLDER_ART } from '../../src/constants/config';
import {
  getITunesTopSongs, getChartArtists, getChartAlbums,
  getForYouTracks, getBollywoodTracks,
} from '../../src/services/itunes';
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
  const { colors, toggleTheme, isDark } = useTheme();
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
        getITunesTopSongs(20),
        getChartArtists(15),
        getChartAlbums(15),
        selectedArtists.length > 0
          ? getForYouTracks(selectedArtists.map((id) => id.replace(/_/g, ' ')), 15)
          : Promise.resolve([]),
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
    <TouchableOpacity style={[styles.featuredCard, { backgroundColor: colors.card }]} onPress={() => play(item, featured)} activeOpacity={0.85}>
      <Image source={{ uri: item.albumArt || PLACEHOLDER_ART }} style={styles.featuredArt} />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={StyleSheet.absoluteFillObject} />
      <View style={styles.featuredInfo}>
        <Text style={styles.featuredTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.featuredArtist}>{item.artist}</Text>
      </View>
      <View style={[styles.featuredPlayBtn, { backgroundColor: colors.accent }]}>
        <Ionicons name="play" size={20} color="#fff" />
      </View>
      {item.isPreview && (
        <View style={styles.featuredPreviewBadge}>
          <Text style={styles.featuredPreviewText}>30s</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>{getGreeting()}</Text>
          <Text style={[styles.appName, { color: colors.text }]}>TuneBaby</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.card }]} onPress={toggleTheme}>
            <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* Source badge */}
        <View style={[styles.sourceBanner, { backgroundColor: colors.accentDim }]}>
          <Ionicons name="musical-note" size={13} color={colors.accent} />
          <Text style={[styles.sourceBannerText, { color: colors.accent }]}>iTunes previews — no sign-in needed</Text>
        </View>

        {error && (
          <TouchableOpacity style={[styles.errorBanner, { backgroundColor: colors.card }]} onPress={() => load()}>
            <Ionicons name="wifi-outline" size={16} color={colors.warning} />
            <Text style={[styles.errorBannerText, { color: colors.textSecondary }]}>{error} — tap to retry</Text>
          </TouchableOpacity>
        )}

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading charts…</Text>
          </View>
        ) : (
          <>
            {featured.length > 0 && (
              <>
                <SectionHeader title="Top Charts" />
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

            {recentlyPlayed.length > 0 && (
              <>
                <SectionHeader title="Recently Played" />
                {recentlyPlayed.slice(0, 5).map((track) => (
                  <TrackCard key={track.id} track={track} queue={recentlyPlayed} />
                ))}
              </>
            )}

            {forYou.length > 0 && (
              <>
                <SectionHeader title="For You" />
                {forYou.slice(0, 8).map((track) => (
                  <TrackCard key={track.id} track={track} queue={forYou} />
                ))}
              </>
            )}

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

            {trending.length > 0 && (
              <>
                <SectionHeader title="Global Trending" onSeeAll={() => router.push('/search')} />
                {trending.slice(0, 8).map((track) => (
                  <TrackCard key={track.id} track={track} queue={trending} />
                ))}
              </>
            )}

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

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  greeting: { fontSize: 13 },
  appName: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', gap: 8 },
  headerBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  sourceBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 20, marginBottom: 8, marginTop: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    alignSelf: 'flex-start',
  },
  sourceBannerText: { fontSize: 11, fontWeight: '600' },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 16, padding: 12, borderRadius: 10,
  },
  errorBannerText: { fontSize: 13, flex: 1 },
  loadingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 40, justifyContent: 'center',
  },
  loadingText: { fontSize: 14 },
  featuredCard: { width: 220, height: 150, borderRadius: 14, overflow: 'hidden' },
  featuredArt: { width: '100%', height: '100%' },
  featuredInfo: { position: 'absolute', bottom: 36, left: 12, right: 12 },
  featuredTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  featuredArtist: { color: 'rgba(255,255,255,0.72)', fontSize: 12, marginTop: 2 },
  featuredPlayBtn: {
    position: 'absolute', bottom: 10, right: 12,
    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
  },
  featuredPreviewBadge: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
  },
  featuredPreviewText: { color: '#FF6B4A', fontSize: 10, fontWeight: '700' },
});
