import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, PermissionsAndroid, Platform, Linking, Alert } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import { PlaybackService } from '../src/services/PlaybackService';
import { PlayerProvider } from '../src/contexts/PlayerContext';
import { LibraryProvider } from '../src/contexts/LibraryContext';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import { getOnboarded } from '../src/services/storage';

TrackPlayer.registerPlaybackService(() => PlaybackService);

async function requestAppPermissions() {
  if (Platform.OS !== 'android') return;

  const permsToRequest: string[] = [];

  if (Platform.Version >= 33) {
    permsToRequest.push(
      PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
    );
  } else {
    permsToRequest.push(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
    );
  }

  if (Platform.Version >= 31) {
    permsToRequest.push(
      'android.permission.BLUETOOTH_CONNECT',
      'android.permission.BLUETOOTH_SCAN',
    );
  }

  if (permsToRequest.length > 0) {
    await PermissionsAndroid.requestMultiple(permsToRequest as any);
  }

  if (Platform.Version >= 30) {
    try {
      Linking.canOpenURL('package:com.tunebaby.music').then((can) => {
        if (can) {
          Alert.alert(
            'All Files Access',
            'TuneBaby needs All Files Access for your music library.',
            [
              { text: 'Later', style: 'cancel' },
              {
                text: 'Allow',
                onPress: () =>
                  Linking.openURL('android.settings.MANAGE_APP_ALL_FILES_ACCESS_PERMISSION').catch(() =>
                    Linking.openURL('android.settings.MANAGE_ALL_FILES_ACCESS_PERMISSION'),
                  ),
              },
            ],
          );
        }
      });
    } catch (_) {}
  }
}

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    getOnboarded().then((done) => {
      setChecked(true);
      if (!done && segments[0] !== 'onboarding') {
        router.replace('/onboarding');
      }
    });
  }, []);

  if (!checked) return null;
  return <>{children}</>;
}

function AppShell() {
  const { colors, isDark } = useTheme();

  useEffect(() => {
    requestAppPermissions();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <LibraryProvider>
        <PlayerProvider>
          <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.bg} />
          <OnboardingGate>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
              <Stack.Screen name="onboarding" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="player"
                options={{ presentation: 'modal', headerShown: false, animation: 'slide_from_bottom' }}
              />
              <Stack.Screen name="artist/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="playlist/[id]" options={{ headerShown: false }} />
            </Stack>
          </OnboardingGate>
        </PlayerProvider>
      </LibraryProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
