import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MiniPlayer } from '../../src/components/MiniPlayer';
import { Colors } from '../../src/constants/colors';
import { usePlayer } from '../../src/contexts/PlayerContext';
import { TAB_BAR_HEIGHT, MINI_PLAYER_HEIGHT } from '../../src/constants/config';

function TabLayout() {
  const insets = useSafeAreaInsets();
  const { currentTrack } = usePlayer();

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: Colors.tabBar,
              borderTopColor: Colors.tabBarBorder,
              borderTopWidth: 1,
              height: TAB_BAR_HEIGHT + insets.bottom,
              paddingBottom: insets.bottom,
            },
            tabBarActiveTintColor: Colors.accent,
            tabBarInactiveTintColor: Colors.textMuted,
            tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: 'Discover',
              tabBarIcon: ({ color, size }) => <Ionicons name="compass" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="search"
            options={{
              title: 'Search',
              tabBarIcon: ({ color, size }) => <Ionicons name="search" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="library"
            options={{
              title: 'Library',
              tabBarIcon: ({ color, size }) => <Ionicons name="library" size={size} color={color} />,
            }}
          />
        </Tabs>
      </View>
      {currentTrack && <MiniPlayer />}
    </View>
  );
}

export default TabLayout;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { flex: 1 },
});
