import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { MiniPlayer } from '../../src/components/MiniPlayer';
import { useTheme } from '../../src/contexts/ThemeContext';
import { usePlayer } from '../../src/contexts/PlayerContext';
import { TAB_BAR_HEIGHT, MINI_PLAYER_HEIGHT } from '../../src/constants/config';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { currentTrack } = usePlayer();

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}> 
      <View style={[styles.content, currentTrack ? { marginBottom: MINI_PLAYER_HEIGHT + 8 } : null]}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              position: 'absolute',
              left: 14,
              right: 14,
              bottom: Math.max(insets.bottom, 8),
              height: TAB_BAR_HEIGHT,
              borderTopWidth: 0,
              borderRadius: 28,
              backgroundColor: 'transparent',
              elevation: 0,
            },
            tabBarBackground: () => (
              <BlurView
                tint={isDark ? 'dark' : 'light'}
                intensity={78}
                style={[styles.tabBackground, { backgroundColor: colors.tabBar, borderColor: colors.tabBarBorder }]}
              />
            ),
            tabBarActiveTintColor: colors.accent,
            tabBarInactiveTintColor: colors.textMuted,
            tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginBottom: 4 },
            tabBarIconStyle: { marginTop: 5 },
          }}
        >
          <Tabs.Screen name="index" options={{ title: 'Discover', tabBarIcon: ({ color, size }) => <Ionicons name="sparkles-outline" size={size} color={color} /> }} />
          <Tabs.Screen name="search" options={{ title: 'Search', tabBarIcon: ({ color, size }) => <Ionicons name="search-outline" size={size} color={color} /> }} />
          <Tabs.Screen name="library" options={{ title: 'Library', tabBarIcon: ({ color, size }) => <Ionicons name="albums-outline" size={size} color={color} /> }} />
        </Tabs>
      </View>
      {currentTrack && <View style={styles.miniPlayerWrapper}><MiniPlayer /></View>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
  tabBackground: { ...StyleSheet.absoluteFillObject, borderWidth: 1, borderRadius: 28 },
  miniPlayerWrapper: { position: 'absolute', left: 12, right: 12, bottom: 82 },
});
