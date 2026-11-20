import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MiniPlayer } from '../../src/components/MiniPlayer';
import { useTheme } from '../../src/contexts/ThemeContext';
import { usePlayer } from '../../src/contexts/PlayerContext';
import { TAB_BAR_HEIGHT, MINI_PLAYER_HEIGHT } from '../../src/constants/config';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { currentTrack } = usePlayer();

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[styles.content, currentTrack ? { marginBottom: MINI_PLAYER_HEIGHT } : null]}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: colors.tabBar,
              borderTopColor: colors.tabBarBorder,
              borderTopWidth: 1,
              height: TAB_BAR_HEIGHT + insets.bottom,
              paddingBottom: insets.bottom,
            },
            tabBarActiveTintColor: colors.accent,
            tabBarInactiveTintColor: colors.textMuted,
            tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: 'Discover',
              tabBarIcon: ({ color, size }) => <Ionicons name="compass-outline" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="search"
            options={{
              title: 'Search',
              tabBarIcon: ({ color, size }) => <Ionicons name="search-outline" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="library"
            options={{
              title: 'Library',
              tabBarIcon: ({ color, size }) => <Ionicons name="library-outline" size={size} color={color} />,
            }}
          />
        </Tabs>
      </View>
      {currentTrack && (
        <View style={styles.miniPlayerWrapper}>
          <MiniPlayer />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
  miniPlayerWrapper: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
