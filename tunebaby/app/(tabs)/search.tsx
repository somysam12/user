import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import WebView, { WebViewNavigation, WebViewMessageEvent } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Track } from '../../types';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useLibrary } from '../../src/contexts/LibraryContext';
import { extractYouTubeId, isYouTubeUrl } from '../../src/services/youtube';

function buildYouTubeSearchUrl(query: string) {
  return `https://m.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%3D%3D`;
}

function buildYouTubeMobileUrl(videoId: string) {
  return `https://m.youtube.com/watch?v=${videoId}&autoplay=1`;
}

function extractVideoIdFromUrl(url: string): string | null {
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];
  return null;
}

// Injected before page load:
// 1. Spoof Page Visibility API → YouTube won't pause when screen turns off
// 2. Poll URL changes → reliably track which video is playing (SPA navigation)
const INJECT_JS = `
(function() {
  try {
    // --- Screen-off fix: spoof Page Visibility so YouTube never pauses ---
    Object.defineProperty(document, 'hidden', { get: () => false, configurable: true });
    Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true });
    // Block visibilitychange events before YouTube's handlers see them
    document.addEventListener('visibilitychange', function(e) {
      e.stopImmediatePropagation();
    }, true);

    // --- Recently played: poll URL and postMessage when it changes ---
    var _lastUrl = '';
    setInterval(function() {
      var url = location.href;
      if (url !== _lastUrl) {
        _lastUrl = url;
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
          JSON.stringify({ type: 'urlChange', url: url })
        );
      }
    }, 800);
  } catch(e) {}
})();
true;
`;

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { addRecentlyPlayedTrack } = useLibrary();

  const [query, setQuery] = useState('');
  const [webViewUrl, setWebViewUrl] = useState<string | null>(null);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const currentVideoIdRef = useRef<string | null>(null);
  const queryRef = useRef('');

  queryRef.current = query;

  const handleSearch = useCallback(() => {
    const q = query.trim();
    if (!q) return;
    if (isYouTubeUrl(q)) {
      const vid = extractYouTubeId(q);
      if (vid) {
        currentVideoIdRef.current = vid;
        setCurrentVideoId(vid);
        setWebViewUrl(buildYouTubeMobileUrl(vid));
      }
    } else {
      currentVideoIdRef.current = null;
      setCurrentVideoId(null);
      setWebViewUrl(buildYouTubeSearchUrl(q));
    }
  }, [query]);

  // Handle postMessage from injected JS (URL change tracking)
  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'urlChange') {
        const vid = extractVideoIdFromUrl(data.url);
        if (vid && vid !== currentVideoIdRef.current) {
          currentVideoIdRef.current = vid;
          setCurrentVideoId(vid);
          const track: Track = {
            id: `yt_${vid}`,
            title: queryRef.current || 'YouTube Video',
            artist: 'YouTube',
            artistId: 'youtube',
            album: '',
            albumId: '',
            albumArt: `https://img.youtube.com/vi/${vid}/mqdefault.jpg`,
            duration: 0,
            streamUrl: `https://www.youtube.com/watch?v=${vid}`,
            source: 'itunes',
            isPreview: false,
          };
          addRecentlyPlayedTrack(track);
        }
      }
    } catch {}
  }, [addRecentlyPlayedTrack]);

  // Also catch navigation state change as a fallback
  const handleNavigationChange = useCallback((navState: WebViewNavigation) => {
    const vid = extractVideoIdFromUrl(navState.url);
    if (vid && vid !== currentVideoIdRef.current) {
      currentVideoIdRef.current = vid;
      setCurrentVideoId(vid);
      const track: Track = {
        id: `yt_${vid}`,
        title: queryRef.current || 'YouTube Video',
        artist: 'YouTube',
        artistId: 'youtube',
        album: '',
        albumId: '',
        albumArt: `https://img.youtube.com/vi/${vid}/mqdefault.jpg`,
        duration: 0,
        streamUrl: `https://www.youtube.com/watch?v=${vid}`,
        source: 'itunes',
        isPreview: false,
      };
      addRecentlyPlayedTrack(track);
    }
  }, [addRecentlyPlayedTrack]);

  const handleClose = () => {
    setWebViewUrl(null);
    currentVideoIdRef.current = null;
    setCurrentVideoId(null);
  };

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      {/* Search bar */}
      <View style={[s.searchBar, { paddingTop: insets.top + 8, backgroundColor: colors.bg }]}>
        <View style={[s.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
          <TextInput
            style={[s.input, { color: colors.text }]}
            placeholder="Song name or YouTube URL..."
            placeholderTextColor={colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); handleClose(); }}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={[s.searchBtn, { backgroundColor: colors.accent }]} onPress={handleSearch}>
          <Text style={s.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      {webViewUrl ? (
        <View style={s.webViewContainer}>
          <View style={[s.webViewTopBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            {currentVideoId ? (
              <Ionicons name="play-circle-outline" size={18} color={colors.accent} />
            ) : (
              <Ionicons name="logo-youtube" size={18} color="#FF0000" />
            )}
            <Text style={[s.webViewTopBarText, { color: colors.text }]} numberOfLines={1}>
              {currentVideoId ? 'Playing on YouTube' : `Results for "${query}"`}
            </Text>
            <TouchableOpacity
              onPress={currentVideoId ? () => {
                currentVideoIdRef.current = null;
                setCurrentVideoId(null);
                setWebViewUrl(buildYouTubeSearchUrl(query));
              } : handleClose}
              style={s.closeBtn}
            >
              <Ionicons name={currentVideoId ? 'arrow-back' : 'close'} size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <WebView
            ref={webViewRef}
            source={{ uri: webViewUrl }}
            style={s.webView}
            javaScriptEnabled
            domStorageEnabled
            allowsFullscreenVideo
            mediaPlaybackRequiresUserAction={false}
            injectedJavaScriptBeforeContentLoaded={INJECT_JS}
            onMessage={handleMessage}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            onNavigationStateChange={handleNavigationChange}
            userAgent="Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
          />

          {isLoading && (
            <View style={[s.loadingOverlay, { backgroundColor: colors.bg + 'CC' }]}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={[s.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={s.placeholder}>
          <Ionicons name="logo-youtube" size={56} color="#FF0000" style={{ marginBottom: 16, opacity: 0.8 }} />
          <Text style={[s.placeholderTitle, { color: colors.text }]}>Search YouTube</Text>
          <Text style={[s.placeholderSub, { color: colors.textSecondary }]}>
            Type any song name and tap Search.{'\n'}Or paste a YouTube URL to play it directly.
          </Text>
          <View style={s.examplesWrap}>
            {['Arijit Singh', 'Tum Hi Ho', 'Shape of You', 'Kesariya'].map((ex) => (
              <TouchableOpacity
                key={ex}
                style={[s.exampleChip, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => {
                  setQuery(ex);
                  currentVideoIdRef.current = null;
                  setCurrentVideoId(null);
                  setTimeout(() => setWebViewUrl(buildYouTubeSearchUrl(ex)), 50);
                }}
              >
                <Ionicons name="musical-note-outline" size={13} color={colors.accent} />
                <Text style={[s.exampleText, { color: colors.text }]}>{ex}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingBottom: 12,
  },
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 14, borderWidth: 1,
  },
  input: { flex: 1, fontSize: 15, padding: 0 },
  searchBtn: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14 },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  webViewContainer: { flex: 1 },
  webViewTopBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1,
  },
  webViewTopBarText: { flex: 1, fontSize: 14, fontWeight: '500' },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  webView: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  loadingText: { fontSize: 13 },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  placeholderTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  placeholderSub: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  examplesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  exampleChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
  },
  exampleText: { fontSize: 13, fontWeight: '500' },
});
