import React, { useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Track } from '../types';
import { useTheme } from '../src/contexts/ThemeContext';
import { useLibrary } from '../src/contexts/LibraryContext';
import { YT_INJECT_JS, buildMobileWatchUrl } from '../src/services/youtube';

export default function YouTubeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { addRecentlyPlayedTrack } = useLibrary();
  const params = useLocalSearchParams<{ v?: string; title?: string }>();

  const videoId = (params.v as string) || '';
  const title = (params.title as string) || 'YouTube';
  const [loading, setLoading] = useState(true);
  const vidRef = useRef<string>(videoId);
  const titleRef = useRef<string>(title);
  titleRef.current = title;

  const onMessage = useCallback((e: WebViewMessageEvent) => {
    try {
      const d = JSON.parse(e.nativeEvent.data);
      if (d.type === 'urlChange') {
        const m = String(d.url).match(/[?&]v=([a-zA-Z0-9_-]{11})/);
        const vid = m ? m[1] : null;
        if (vid && vid !== vidRef.current) {
          vidRef.current = vid;
          const track: Track = {
            id: `yt_${vid}`,
            title: titleRef.current || 'YouTube Video',
            artist: 'YouTube',
            artistId: 'youtube',
            album: '',
            albumId: '',
            albumArt: `https://img.youtube.com/vi/${vid}/mqdefault.jpg`,
            duration: 0,
            streamUrl: `https://www.youtube.com/watch?v=${vid}`,
            source: 'youtube',
          };
          addRecentlyPlayedTrack(track);
        }
      }
    } catch {}
  }, [addRecentlyPlayedTrack]);

  if (!videoId) {
    router.back();
    return null;
  }

  return (
    <View style={[s.root, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <View style={[s.topBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
          <Ionicons name="chevron-down" size={26} color={colors.text} />
        </TouchableOpacity>
        <View style={s.topCenter}>
          <Ionicons name="logo-youtube" size={16} color="#FF0000" />
          <Text style={[s.topTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
        </View>
        <View style={s.closeBtn} />
      </View>

      <View style={s.webWrap}>
        <WebView
          source={{ uri: buildMobileWatchUrl(videoId) }}
          style={s.web}
          javaScriptEnabled
          domStorageEnabled
          allowsFullscreenVideo
          mediaPlaybackRequiresUserAction={false}
          injectedJavaScriptBeforeContentLoaded={YT_INJECT_JS}
          onMessage={onMessage}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          userAgent="Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
        />
        {loading && (
          <View style={[s.loading, { backgroundColor: colors.bg + 'CC' }]}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        )}
      </View>

      <View style={[s.note, { backgroundColor: colors.card }]}>
        <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />
        <Text style={[s.noteText, { color: colors.textSecondary }]}>
          Streaming via YouTube. Keep this screen open for background audio.
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 8, borderBottomWidth: 1,
  },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 8 },
  topTitle: { fontSize: 15, fontWeight: '600', maxWidth: '80%' },
  webWrap: { flex: 1 },
  web: { flex: 1 },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  note: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  noteText: { flex: 1, fontSize: 12 },
});
