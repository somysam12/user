import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Track } from '../../types';
import { useTheme } from '../../src/contexts/ThemeContext';
import { PLACEHOLDER_ART } from '../../src/constants/config';
import { usePlayer } from '../../src/contexts/PlayerContext';
import { useLibrary } from '../../src/contexts/LibraryContext';
import { isYouTubeTrack, youtubeIdFromTrack } from '../../src/services/youtube';
import { GlassCard } from '../../src/components/GlassCard';

function TrackRow({ track, onPress, colors }: { track: Track; onPress: () => void; colors: any }) {
  return (
    <TouchableOpacity style={[s.trackRow, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]} onPress={onPress} activeOpacity={0.78}>
      <Image source={{ uri: track.albumArt || PLACEHOLDER_ART }} style={s.trackRowArt} />
      <View style={s.trackRowInfo}><Text style={[s.trackRowTitle, { color: colors.text }]} numberOfLines={1}>{track.title}</Text><Text style={[s.trackRowArtist, { color: colors.textSecondary }]} numberOfLines={1}>{track.artist}</Text></View>
      <View style={[s.playIcon, { backgroundColor: colors.accentDim }]}><Ionicons name="play" size={15} color={colors.accent} /></View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets(); const router = useRouter(); const { colors, toggleTheme, isDark } = useTheme(); const { play } = usePlayer(); const { recentlyPlayed, likedTracks } = useLibrary();
  const getGreeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
  const handlePlay = (track: Track, list: Track[]) => { if (isYouTubeTrack(track)) { const vid = youtubeIdFromTrack(track); if (vid) { router.push(`/youtube?v=${vid}&title=${encodeURIComponent(track.title)}`); return; } } play(track, list); router.push('/player'); };
  const isEmpty = recentlyPlayed.length === 0 && likedTracks.length === 0;

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      <LinearGradient colors={[colors.auroraA, colors.bg, colors.auroraB]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFillObject, { opacity: isDark ? 0.45 : 0.7 }]} />
      <View style={[s.header, { paddingTop: insets.top + 10 }]}><View><Text style={[s.greeting, { color: colors.textSecondary }]}>{getGreeting()}</Text><Text style={[s.appName, { color: colors.text }]}>TuneBaby</Text></View><TouchableOpacity onPress={toggleTheme} style={[s.themeBtn, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}><Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={21} color={colors.text} /></TouchableOpacity></View>
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 150 }]} showsVerticalScrollIndicator={false}>
        <GlassCard style={s.hero} onPress={() => router.push('/(tabs)/search')}><LinearGradient colors={[colors.accent, colors.accentLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.heroGradient}><View style={s.heroCopy}><Text style={s.eyebrow}>YOUR DAILY SOUNDTRACK</Text><Text style={s.heroTitle}>Make room for your next favorite.</Text><Text style={s.heroSub}>Search, save and listen beautifully.</Text><View style={s.heroCta}><Ionicons name="search" size={15} color={colors.accent} /><Text style={[s.heroCtaText, { color: colors.accent }]}>Explore music</Text></View></View><Ionicons name="musical-notes" size={76} color="rgba(255,255,255,0.25)" style={s.heroIcon} /></LinearGradient></GlassCard>
        {isEmpty ? <View style={s.emptyState}><View style={[s.emptyIcon, { backgroundColor: colors.accentDim }]}><Ionicons name="sparkles-outline" size={34} color={colors.accent} /></View><Text style={[s.emptyTitle, { color: colors.text }]}>Your sound starts here</Text><Text style={[s.emptySubtitle, { color: colors.textSecondary }]}>Find a track, discover an artist, and build your personal listening space.</Text><TouchableOpacity style={[s.searchBtn, { backgroundColor: colors.accent }]} onPress={() => router.push('/(tabs)/search')}><Ionicons name="search" size={17} color="#fff" /><Text style={s.searchBtnText}>Find songs</Text></TouchableOpacity></View> : <>{recentlyPlayed.length > 0 && <View style={s.section}><View style={s.sectionHeader}><View style={[s.sectionIcon, { backgroundColor: colors.accentDim }]}><Ionicons name="time-outline" size={16} color={colors.accent} /></View><Text style={[s.sectionTitle, { color: colors.text }]}>Recently played</Text><Text style={[s.sectionCount, { color: colors.textMuted }]}>{recentlyPlayed.length}</Text></View>{recentlyPlayed.slice(0, 10).map((track) => <TrackRow key={track.id} track={track} colors={colors} onPress={() => handlePlay(track, recentlyPlayed)} />)}</View>}{likedTracks.length > 0 && <View style={s.section}><View style={s.sectionHeader}><View style={[s.sectionIcon, { backgroundColor: colors.accentDim }]}><Ionicons name="heart" size={16} color={colors.liked} /></View><Text style={[s.sectionTitle, { color: colors.text }]}>Liked songs</Text><Text style={[s.sectionCount, { color: colors.textMuted }]}>{likedTracks.length}</Text></View>{likedTracks.slice(0, 10).map((track) => <TrackRow key={track.id} track={track} colors={colors} onPress={() => handlePlay(track, likedTracks)} />)}</View>}</>}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14 }, greeting: { fontSize: 13, fontWeight: '600', letterSpacing: 0.2 }, appName: { fontSize: 30, fontWeight: '900', letterSpacing: -1.2, marginTop: 2 }, themeBtn: { width: 44, height: 44, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, scroll: { paddingHorizontal: 16 }, hero: { height: 186, marginBottom: 28 }, heroGradient: { flex: 1, padding: 22, justifyContent: 'center', overflow: 'hidden' }, heroCopy: { width: '78%' }, eyebrow: { color: 'rgba(255,255,255,0.72)', fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 10 }, heroTitle: { color: '#fff', fontSize: 25, lineHeight: 30, fontWeight: '900', letterSpacing: -0.6 }, heroSub: { color: 'rgba(255,255,255,0.80)', fontSize: 13, marginTop: 8 }, heroCta: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#fff', alignSelf: 'flex-start', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, marginTop: 16 }, heroCtaText: { fontSize: 12, fontWeight: '800' }, heroIcon: { position: 'absolute', right: -8, bottom: 10, transform: [{ rotate: '-16deg' }] }, section: { marginBottom: 22 }, sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 12, paddingHorizontal: 2 }, sectionIcon: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, sectionTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 }, sectionCount: { fontSize: 12, fontWeight: '700', marginLeft: 'auto' }, trackRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 9, borderRadius: 18, marginBottom: 8, borderWidth: 1 }, trackRowArt: { width: 52, height: 52, borderRadius: 14 }, trackRowInfo: { flex: 1 }, trackRowTitle: { fontSize: 14, fontWeight: '700' }, trackRowArtist: { fontSize: 12, marginTop: 4 }, playIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }, emptyState: { alignItems: 'center', paddingTop: 36, paddingHorizontal: 28 }, emptyIcon: { width: 74, height: 74, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 18 }, emptyTitle: { fontSize: 22, fontWeight: '900', marginBottom: 8 }, emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 24 }, searchBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, paddingVertical: 13, borderRadius: 22 }, searchBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
