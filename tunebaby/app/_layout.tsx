import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { PlayerProvider } from '../src/contexts/PlayerContext';
import { LibraryProvider } from '../src/contexts/LibraryContext';
import { Colors } from '../src/constants/colors';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <LibraryProvider>
        <PlayerProvider>
          <StatusBar style="light" backgroundColor={Colors.bg} />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="player"
              options={{ presentation: 'modal', headerShown: false, animation: 'slide_from_bottom' }}
            />
            <Stack.Screen name="artist/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="playlist/[id]" options={{ headerShown: false }} />
          </Stack>
        </PlayerProvider>
      </LibraryProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
