import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, ScrollView, FlatList,
  TouchableOpacity, StyleSheet, ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Track, Artist, Album, SearchTab } from '../../types';
import { Colors } from '../../src/constants/colors';
import { GENRE_CATEGORIES } from '../../src/constants/config';
import { searchDeezer, getDeezerGenreTracks, DEEZER_GENRES } from '../../src/services/deezer';
import { searchITunes, searchITunesArtists, searchITunesAlbums } from '../../src/services/itunes';
import { TrackCard } from '../../src/components/TrackCard';
import { ArtistCard } from '../../src/components/ArtistCard';
import { AlbumCard } from '../../src/components/AlbumCard';
import { useLibrary } from '../../src/contexts/LibraryContext';
import { extractYouTubeId, isYouTubeUrl } from '../../src/services/youtube';

const TABS: { key: SearchTab; label: string }[] = [
  { key: 'tracks', label: 'Songs' },
  { key: 'artists', label: 'Artists' },
  { key: 'albums', label: 'Albums' },
];

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { localTracks } = useLibrary();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('tracks');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [ytVideoId, setYtVideoId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setTracks([]); setArtists([]); setAlbums([]);
      setHasSearched(false); setError(null);
      setYtVideoId(null);
      return;
    }

    // YouTube URL detection — open in YouTube app/browser
    if (isYouTubeUrl(q)) {
      const vid = extractYouTubeId(q);
      setYtVideoId(vid);
      setHasSearched(false);
      return;
    }

    setYtVideoId(null);
    setLoading(true); setError(null); setHasSearched(true);

    // Always search local/device tracks first
    const localMatches = localTracks.filter(
      (t) => t.title.toLowerCase().includes(q.toLowerCase()) ||
             t.artist.toLowerCase().includes(q.toLowerCase())
    );

    try {
      // Search Deezer (primary online) + iTunes (additional results) in parallel
      const [deezerRes, itunesTracks, itunesArtists, itunesAlbums] = await Promise.allSettled([
        searchDeezer(q),
        searchITunes(q, 20),
        searchITunesArtists(q, 10),
        searchITunesAlbums(q, 10),
      ]);

      const dz = deezerRes.status === 'fulfilled' ? deezerRes.value : { tracks: [], artists: [], albums: [] };
      const it = itunesTracks.status === 'fulfilled' ? itunesTracks.value : [];
      const itA = itunesArtists.status === 'fulfilled' ? itunesArtists.value : [];
      const itAl = itunesAlbums.status === 'fulfilled' ? itunesAlbums.value : [];

      // Merge, dedup by title+artist
      const seenTracks = new Set<string>();
      const allTracks: Track[] = [...localMatches, ...dz.tracks, ...it].filter((t) => {
        const key = `${t.title.toLowerCase()}_${t.artist.toLowerCase()}`;
        if (seenTracks.has(key)) return false;
        seenTracks.add(key);
        return true;
      });

      const seenArtists = new Set<string>();
      const allArtists: Artist[] = [...dz.artists, ...itA].filter((a) => {
        const key = a.name.toLowerCase();
        if (seenArtists.has(key)) return false;
        seenArtists.add(key);
        return true;
      });

      const seenAlbums = new Set<string>();
      const allAlbums: Album[] = [...dz.albums, ...itAl].filter((a) => {
        const key = `${a.name.toLowerCase()}_${a.artist.toLowerCase()}`;
        if (seenAlbums.has(key)) return false;
        seenAlbums.add(key);
        return true;
      });

      setTracks(allTracks);
      setArtists(allArtists);
      setAlbums(allAlbums);
      if (!allTracks.length && !allArtists.length && !allAlbums.length) setError('no_results');
    } catch (e: any) {
      setError(e.message ?? 'Search failed. Check your connection.');
      setTracks(localMatches);
    } finally {
      setLoading(false);
    }
  }, [localTracks]);

  const onChangeText = (text: string) => {
    setQuery(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(text), 500);
  };

  const onGenrePress = async (genreId: string) => {
    setQuery(genreId);
    setLoading(true); setHasSearched(true); setError(null);
    try {
      const deezerGenreId = DEEZER_GENRES[genreId];
      let results: Track[];
      if (deezerGenreId) {
        results = await getDeezerGenreTracks(deezerGenreId, 25);
      } else {
        results = await searchITunes(genreId, 25);
      }
      setTracks(results); setArtists([]); setAlbums([]);
      setActiveTab('tracks');
    } catch (e: any) {
      setError(e.message ?? 'Could not load genre.');
    } finally {
      setLoading(false);
    }
  };

  const openYouTube = (url: string) => {
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.youtube.com/watch?v=${extractYouTubeId(url)}`);
    });
  };

  const clearSearch = () => {
    setQuery(''); setTracks([]); setArtists([]); setAlbums([]);
    setHasSearched(false); setError(null); setYtVideoId(null);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
        <View style={styles.sourceChip}>
          <Ionicons name="globe-outline" size={12} color={Colors.accent} />
          <Text style={styles.sourceChipText}>Deezer + iTunes</Text>
        </View>
      </View>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.input}
          placeholder="Song name or YouTube link…"
          placeholderTextColor={Colors.textMuted}
          value={query}
          onChangeText={onChangeText}
          returnKeyType="search"
          onSubmitEditing={() => { clearTimeout(debounceRef.current); doSearch(query); }}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {loading && <ActivityIndicator size="small" color={Colors.accent} style={{ marginRight: 4 }} />}
        {query.length > 0 && !loading && (
          <TouchableOpacity onPress={clearSearch}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* YouTube link detected — open in YouTube app */}
      {ytVideoId && isYouTubeUrl(query) && (
        <TouchableOpacity style={styles.ytBanner} onPress={() => openYouTube(query)}>
          <Ionicons name="logo-youtube" size={22} color="#ff0000" />
          <View style={{ flex: 1 }}>
            <Text style={styles.ytBannerText}>YouTube link detected</Text>
            <Text style={styles.ytBannerSub}>Tap to open in YouTube app</Text>
          </View>
          <Ionicons name="open-outline" size={18} color={Colors.accent} />
        </TouchableOpacity>
      )}

      {/* Pre-search: genre grid */}
      {!hasSearched && (
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.browseTitle}>Browse by Genre</Text>
          <View style={styles.genreGrid}>
            {GENRE_CATEGORIES.map((g) => (
              <TouchableOpacity
                key={g.id}
                style={[styles.genreCard, { backgroundColor: g.color + '22', borderColor: g.color + '55' }]}
                onPress={() => onGenrePress(g.id)}
                activeOpacity={0.75}
              >
                <Text style={styles.genreEmoji}>{g.icon}</Text>
                <Text style={styles.genreName}>{g.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.onlineHint}>
            🎵 Online search works without any sign-in — powered by Deezer & iTunes previews
          </Text>
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Results */}
      {hasSearched && (
        <>
          {/* Tabs */}
          <View style={styles.tabs}>
            {TABS.map((tab) => {
              const count = tab.key === 'tracks' ? tracks.length : tab.key === 'artists' ? artists.length : albums.length;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                  onPress={() => setActiveTab(tab.key)}
                >
                  <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                    {tab.label} {count > 0 ? `(${count})` : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {error === 'no_results' ? (
            <View style={styles.noResults}>
              <Ionicons name="search-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.noResultsTitle}>No results for "{query}"</Text>
              <Text style={styles.noResultsSub}>Try different keywords</Text>
            </View>
          ) : error && error !== 'no_results' ? (
            <View style={styles.noResults}>
              <Ionicons name="wifi-outline" size={40} color={Colors.warning} />
              <Text style={styles.noResultsTitle}>Search unavailable</Text>
              <Text style={styles.noResultsSub}>{error}</Text>
            </View>
          ) : activeTab === 'tracks' ? (
            <FlatList
              data={tracks}
              keyExtractor={(i) => i.id}
              renderItem={({ item }) => <TrackCard track={item} queue={tracks} />}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={loading ? null : <View style={styles.noResults}><Text style={styles.noResultsSub}>No songs found</Text></View>}
              ListFooterComponent={<View style={{ height: 100 }} />}
            />
          ) : activeTab === 'artists' ? (
            <FlatList
              data={artists}
              keyExtractor={(i) => i.id}
              numColumns={3}
              renderItem={({ item }) => <ArtistCard artist={item} size="small" />}
              contentContainerStyle={styles.artistGrid}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={<View style={styles.noResults}><Text style={styles.noResultsSub}>No artists found</Text></View>}
              ListFooterComponent={<View style={{ height: 100 }} />}
            />
          ) : (
            <FlatList
              data={albums}
              keyExtractor={(i) => i.id}
              numColumns={2}
              renderItem={({ item }) => (
                <View style={styles.albumGridItem}>
                  <AlbumCard album={item} size={150} />
                </View>
              )}
              contentContainerStyle={{ padding: 16, gap: 16 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={<View style={styles.noResults}><Text style={styles.noResultsSub}>No albums found</Text></View>}
              ListFooterComponent={<View style={{ height: 100 }} />}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  headerTitle: { color: Colors.text, fontSize: 24, fontWeight: '800' },
  sourceChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.accentDim, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  sourceChipText: { color: Colors.accent, fontSize: 11, fontWeight: '600' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: Colors.card, borderRadius: 12, paddingHorizontal: 14, gap: 10, height: 46,
    borderWidth: 1, borderColor: Colors.border,
  },
  input: { flex: 1, color: Colors.text, fontSize: 15 },
  browseTitle: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600', paddingHorizontal: 16, marginBottom: 12, letterSpacing: 0.5, textTransform: 'uppercase' },
  genreGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10 },
  genreCard: { width: '45%', flexGrow: 1, padding: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center', gap: 8 },
  genreEmoji: { fontSize: 28 },
  genreName: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  onlineHint: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', marginHorizontal: 24, marginTop: 20, lineHeight: 18 },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.card },
  tabActive: { backgroundColor: Colors.accent },
  tabText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500' },
  tabTextActive: { color: '#fff' },
  noResults: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32, marginTop: 40 },
  noResultsTitle: { color: Colors.text, fontSize: 17, fontWeight: '600', textAlign: 'center' },
  noResultsSub: { color: Colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  artistGrid: { paddingHorizontal: 16, paddingVertical: 8, gap: 20 },
  albumGridItem: { flex: 1, padding: 8 },
  ytBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: '#ff000012', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#ff000030',
  },
  ytBannerText: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  ytBannerSub: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
});
