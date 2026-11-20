import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, ScrollView, FlatList,
  TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import WebView from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Track, Artist, Album, SearchTab } from '../../types';
import { useTheme } from '../../src/contexts/ThemeContext';
import { GENRE_CATEGORIES } from '../../src/constants/config';
import { searchAll, searchITunes } from '../../src/services/itunes';
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
  const { colors } = useTheme();
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
      setHasSearched(false); setError(null); setYtVideoId(null);
      return;
    }

    if (isYouTubeUrl(q)) {
      setYtVideoId(extractYouTubeId(q));
      setHasSearched(false);
      return;
    }

    setYtVideoId(null);
    setLoading(true); setError(null); setHasSearched(true);

    const localMatches = localTracks.filter(
      (t) => t.title.toLowerCase().includes(q.toLowerCase()) ||
             t.artist.toLowerCase().includes(q.toLowerCase())
    );

    try {
      const results = await searchAll(q);
      const seenTracks = new Set<string>();
      const allTracks: Track[] = [...localMatches, ...results.tracks].filter((t) => {
        const key = `${t.title.toLowerCase()}_${t.artist.toLowerCase()}`;
        if (seenTracks.has(key)) return false;
        seenTracks.add(key);
        return true;
      });

      setTracks(allTracks);
      setArtists(results.artists);
      setAlbums(results.albums);
      if (!allTracks.length && !results.artists.length && !results.albums.length)
        setError('no_results');
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
    setQuery(genreId); setLoading(true); setHasSearched(true); setError(null); setYtVideoId(null);
    try {
      const results = await searchITunes(genreId, 25);
      setTracks(results); setArtists([]); setAlbums([]);
      setActiveTab('tracks');
    } catch (e: any) {
      setError(e.message ?? 'Could not load genre.');
    } finally { setLoading(false); }
  };

  const clearSearch = () => {
    setQuery(''); setTracks([]); setArtists([]); setAlbums([]);
    setHasSearched(false); setError(null); setYtVideoId(null);
  };

  const s = makeStyles(colors);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Search</Text>
        <View style={[s.sourceChip, { backgroundColor: colors.accentDim }]}>
          <Ionicons name="musical-note-outline" size={12} color={colors.accent} />
          <Text style={[s.sourceChipText, { color: colors.accent }]}>iTunes</Text>
        </View>
      </View>

      {/* Search bar */}
      <View style={[s.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={[s.input, { color: colors.text }]}
          placeholder="Song name or YouTube link…"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={onChangeText}
          returnKeyType="search"
          onSubmitEditing={() => { clearTimeout(debounceRef.current); doSearch(query); }}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {loading && <ActivityIndicator size="small" color={colors.accent} />}
        {query.length > 0 && !loading && (
          <TouchableOpacity onPress={clearSearch}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* YouTube in-app player */}
      {ytVideoId && (
        <View style={s.ytContainer}>
          <View style={s.ytHeader}>
            <Ionicons name="logo-youtube" size={18} color="#FF0000" />
            <Text style={[s.ytHeaderText, { color: colors.text }]}>YouTube — Live Stream</Text>
            <TouchableOpacity onPress={clearSearch} style={s.ytClose}>
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <WebView
            source={{ uri: `https://www.youtube.com/embed/${ytVideoId}?autoplay=1&playsinline=1&rel=0` }}
            style={s.ytWebView}
            allowsFullscreenVideo
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            domStorageEnabled
          />
          <View style={[s.ytNote, { backgroundColor: colors.card }]}>
            <Ionicons name="information-circle-outline" size={13} color={colors.textMuted} />
            <Text style={[s.ytNoteText, { color: colors.textMuted }]}>
              Streaming via YouTube — not downloaded
            </Text>
          </View>
        </View>
      )}

      {/* Pre-search: genre grid */}
      {!hasSearched && !ytVideoId && (
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={[s.browseTitle, { color: colors.textSecondary }]}>Browse Genres</Text>
          <View style={s.genreGrid}>
            {GENRE_CATEGORIES.map((g) => (
              <TouchableOpacity
                key={g.id}
                style={[s.genreCard, { backgroundColor: g.color + '20', borderColor: g.color + '50' }]}
                onPress={() => onGenrePress(g.id)}
                activeOpacity={0.75}
              >
                <View style={[s.genreIconBox, { backgroundColor: g.color + '30' }]}>
                  <Ionicons name={g.icon} size={22} color={g.color} />
                </View>
                <Text style={[s.genreName, { color: colors.text }]}>{g.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[s.onlineHint, { color: colors.textMuted }]}>
            Powered by iTunes 30-sec previews. Paste a YouTube URL to stream it here.
          </Text>
          <View style={{ height: 120 }} />
        </ScrollView>
      )}

      {/* Results */}
      {hasSearched && (
        <>
          <View style={s.tabs}>
            {TABS.map((tab) => {
              const count = tab.key === 'tracks' ? tracks.length : tab.key === 'artists' ? artists.length : albums.length;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[s.tab, { backgroundColor: activeTab === tab.key ? colors.accent : colors.card }]}
                  onPress={() => setActiveTab(tab.key)}
                >
                  <Text style={[s.tabText, { color: activeTab === tab.key ? '#fff' : colors.textSecondary }]}>
                    {tab.label}{count > 0 ? ` (${count})` : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {error === 'no_results' ? (
            <View style={s.noResults}>
              <Ionicons name="search-outline" size={48} color={colors.textMuted} />
              <Text style={[s.noResultsTitle, { color: colors.text }]}>No results for "{query}"</Text>
              <Text style={[s.noResultsSub, { color: colors.textSecondary }]}>Try different keywords</Text>
            </View>
          ) : error && error !== 'no_results' ? (
            <View style={s.noResults}>
              <Ionicons name="wifi-outline" size={40} color={colors.warning} />
              <Text style={[s.noResultsTitle, { color: colors.text }]}>Search unavailable</Text>
              <Text style={[s.noResultsSub, { color: colors.textSecondary }]}>{error}</Text>
            </View>
          ) : activeTab === 'tracks' ? (
            <FlatList
              data={tracks}
              keyExtractor={(i) => i.id}
              renderItem={({ item }) => <TrackCard track={item} queue={tracks} />}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={loading ? null : <View style={s.noResults}><Text style={[s.noResultsSub, { color: colors.textSecondary }]}>No songs found</Text></View>}
              ListFooterComponent={<View style={{ height: 120 }} />}
            />
          ) : activeTab === 'artists' ? (
            <FlatList
              data={artists}
              keyExtractor={(i) => i.id}
              numColumns={3}
              renderItem={({ item }) => <ArtistCard artist={item} size="small" />}
              contentContainerStyle={s.artistGrid}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={<View style={s.noResults}><Text style={[s.noResultsSub, { color: colors.textSecondary }]}>No artists found</Text></View>}
              ListFooterComponent={<View style={{ height: 120 }} />}
            />
          ) : (
            <FlatList
              data={albums}
              keyExtractor={(i) => i.id}
              numColumns={2}
              renderItem={({ item }) => (
                <View style={s.albumGridItem}>
                  <AlbumCard album={item} size={150} />
                </View>
              )}
              contentContainerStyle={{ padding: 16, gap: 16 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={<View style={s.noResults}><Text style={[s.noResultsSub, { color: colors.textSecondary }]}>No albums found</Text></View>}
              ListFooterComponent={<View style={{ height: 120 }} />}
            />
          )}
        </>
      )}
    </View>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
    headerTitle: { color: colors.text, fontSize: 24, fontWeight: '800' },
    sourceChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    sourceChipText: { fontSize: 11, fontWeight: '600' },
    searchBar: {
      flexDirection: 'row', alignItems: 'center',
      marginHorizontal: 16, marginBottom: 12,
      borderRadius: 14, paddingHorizontal: 14, gap: 10, height: 48,
      borderWidth: 1,
    },
    input: { flex: 1, fontSize: 15 },
    ytContainer: { marginHorizontal: 16, marginBottom: 10 },
    ytHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    ytHeaderText: { flex: 1, fontSize: 13, fontWeight: '600' },
    ytClose: { padding: 4 },
    ytWebView: { width: '100%', height: 210, borderRadius: 12, overflow: 'hidden' },
    ytNote: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 8, marginTop: 6 },
    ytNoteText: { fontSize: 11 },
    browseTitle: { fontSize: 12, fontWeight: '700', paddingHorizontal: 20, marginBottom: 12, letterSpacing: 0.6, textTransform: 'uppercase' },
    genreGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, gap: 10 },
    genreCard: { width: '45%', flexGrow: 1, padding: 14, borderRadius: 14, borderWidth: 1, alignItems: 'center', gap: 10 },
    genreIconBox: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    genreName: { fontSize: 13, fontWeight: '600' },
    onlineHint: { fontSize: 12, textAlign: 'center', marginHorizontal: 24, marginTop: 20, lineHeight: 18 },
    tabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
    tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
    tabText: { fontSize: 13, fontWeight: '500' },
    noResults: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32, marginTop: 40 },
    noResultsTitle: { fontSize: 17, fontWeight: '600', textAlign: 'center' },
    noResultsSub: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
    artistGrid: { paddingHorizontal: 16, paddingVertical: 8, gap: 20 },
    albumGridItem: { flex: 1, padding: 8 },
  });
}
