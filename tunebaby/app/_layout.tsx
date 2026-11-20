import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, PermissionsAndroid, Platform, Linking, Alert } from 'react-native';
import { PlayerProvider } from '../src/contexts/PlayerContext';
import { LibraryProvider } from '../src/contexts/LibraryContext';
import { Colors } from '../src/constants/colors';

async function requestAppPermissions() {
  if (Platform.OS !== 'android') return;

  const permsToRequest: string[] = [];

  // Storage / media permissions
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

  // Bluetooth (Android 12+)
  if (Platform.Version >= 31) {
    permsToRequest.push(
      'android.permission.BLUETOOTH_CONNECT',
      'android.permission.BLUETOOTH_SCAN',
    );
  }

  if (permsToRequest.length > 0) {
    await PermissionsAndroid.requestMultiple(permsToRequest as any);
  }

  // "All files access" — needs special settings intent on Android 11+
  if (Platform.Version >= 30) {
    try {
      const { NativeModules } = require('react-native');
      // Check via Intent: open the manage-storage settings page
      Linking.canOpenURL('package:com.tunebaby.music').then((can) => {
        if (can) {
          Alert.alert(
            'All Files Access',
            'TuneBaby needs All Files Access to manage your music library. Please enable it in the next screen.',
            [
              { text: 'Later', style: 'cancel' },
              {
                text: 'Allow',
                onPress: () =>
                  Linking.openURL(
                    'android.settings.MANAGE_APP_ALL_FILES_ACCESS_PERMISSION',
                  ).catch(() =>
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

export default function RootLayout() {
  useEffect(() => {
    requestAppPermissions();
  }, []);

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
