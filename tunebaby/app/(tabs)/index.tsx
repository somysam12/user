import React from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity,
  Image, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Track } from '../../types';
import { useTheme } from '../../src/contexts/ThemeContext';
import { PLACEHOLDER_ART } from '../../src/constants/config';
import { usePlayer } from '../../src/contexts/PlayerContext';
import { useLibrary } from '../../src/contexts/LibraryContext';

function TrackRow({ track, onPress, colors }: { track: Track; onPress: () => void; colors: any }) {
  return (
    <TouchableOpacity style={[s.trackRow, { backgroundColor: colors.card }]} onPress={onPress} activeOpacity={0.7}>
      <Image
        source={{ uri: track.albumArt || PLACEHOLDER_ART }}
        style={s.trackRowArt}
      />
      <View style={s.trackRowInfo}>
        <Text style={[s.trackRowTitle, { color: colors.text }]} numberOfLines={1}>{track.title}</Text>
        <Text style={[s.trackRowArtist, { color: colors.textSecondary }]} numberOfLines={1}>{track.artist}</Text>
      </View>
      <Ionicons name="play-circle-outline" size={28} color={colors.accent} />
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, toggleTheme, isDark } = useTheme();
  const { play } = usePlayer();
  const { recentlyPlayed, likedTracks } = useLibrary();

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const handlePlay = (track: Track, list: Track[]) => {
    play(track, list);
    router.push('/player');
  };

  const isEmpty = recentlyPlayed.length === 0 && likedTracks.length === 0;

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={[s.greeting, { color: colors.textSecondary }]}>{getGreeting()}</Text>
          <Text style={[s.appName, { color: colors.text }]}>TuneBaby</Text>
        </View>
        <TouchableOpacity onPress={toggleTheme} style={s.themeBtn}>
          <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}>
        {isEmpty ? (
          <View style={s.emptyState}>
            <Ionicons name="musical-notes-outline" size={64} color={colors.textSecondary} style={{ marginBottom: 16 }} />
            <Text style={[s.emptyTitle, { color: colors.text }]}>No music yet</Text>
            <Text style={[s.emptySubtitle, { color: colors.textSecondary }]}>
              Go to Search, type a song name or paste a YouTube link to start listening
            </Text>
            <TouchableOpacity
              style={[s.searchBtn, { backgroundColor: colors.accent }]}
              onPress={() => router.push('/(tabs)/search')}
            >
              <Ionicons name="search" size={18} color="#fff" />
              <Text style={s.searchBtnText}>Find Songs</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {recentlyPlayed.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHeader}>
                  <Ionicons name="time-outline" size={18} color={colors.accent} />
                  <Text style={[s.sectionTitle, { color: colors.text }]}>Recently Played</Text>
                </View>
                {recentlyPlayed.slice(0, 15).map((track) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    colors={colors}
                    onPress={() => handlePlay(track, recentlyPlayed)}
                  />
                ))}
              </View>
            )}

            {likedTracks.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHeader}>
                  <Ionicons name="heart" size={18} color={colors.accent} />
                  <Text style={[s.sectionTitle, { color: colors.text }]}>Liked Songs</Text>
                </View>
                {likedTracks.slice(0, 15).map((track) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    colors={colors}
                    onPress={() => handlePlay(track, likedTracks)}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
  },
  greeting: { fontSize: 13, fontWeight: '500' },
  appName: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginTop: 2 },
  themeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 16 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  trackRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 10, borderRadius: 14, marginBottom: 8,
  },
  trackRowArt: { width: 50, height: 50, borderRadius: 10 },
  trackRowInfo: { flex: 1 },
  trackRowTitle: { fontSize: 15, fontWeight: '600' },
  trackRowArtist: { fontSize: 13, marginTop: 2 },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  searchBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 14, borderRadius: 30,
  },
  searchBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
