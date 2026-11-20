import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, TextInput, Modal, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/contexts/ThemeContext';
import { PlaylistCard } from '../../src/components/PlaylistCard';
import { TrackCard } from '../../src/components/TrackCard';
import { EmptyState } from '../../src/components/EmptyState';
import { useLibrary } from '../../src/contexts/LibraryContext';
import { usePlayer } from '../../src/contexts/PlayerContext';
import { isYouTubeTrack, youtubeIdFromTrack } from '../../src/services/youtube';

type LibraryTab = 'playlists' | 'liked' | 'downloads' | 'local';

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { playlists, createPlaylist, deletePlaylist, downloadedTracks, localTracks, likedTracks, importLocalFiles } = useLibrary();
  const { play } = usePlayer();

  const playAllLiked = () => {
    if (likedTracks.length === 0) return;
    const first = likedTracks[0];
    if (isYouTubeTrack(first)) {
      const vid = youtubeIdFromTrack(first);
      if (vid) {
        router.push(`/youtube?v=${vid}&title=${encodeURIComponent(first.title)}`);
        return;
      }
    }
    play(first, likedTracks);
  };
  const [activeTab, setActiveTab] = useState<LibraryTab>('playlists');
  const [showNewPlaylist, setShowNewPlaylist] = useState(false);
  const [newName, setNewName] = useState('');
  const [importing, setImporting] = useState(false);

  const handleCreatePlaylist = () => {
    if (!newName.trim()) return;
    createPlaylist(newName.trim());
    setNewName(''); setShowNewPlaylist(false);
  };

  const handleDeletePlaylist = (id: string, name: string) => {
    Alert.alert('Delete Playlist', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deletePlaylist(id) },
    ]);
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const imported = await importLocalFiles();
      if (imported.length > 0) Alert.alert('Imported', `${imported.length} file(s) added.`);
    } catch (e: any) {
      Alert.alert('Import failed', e.message ?? 'Could not import files.');
    } finally { setImporting(false); }
  };

  const TABS = [
    { key: 'playlists' as LibraryTab, label: 'Playlists', icon: 'list-outline' as const },
    { key: 'liked' as LibraryTab, label: 'Liked', icon: 'heart-outline' as const },
    { key: 'downloads' as LibraryTab, label: 'Downloads', icon: 'download-outline' as const },
    { key: 'local' as LibraryTab, label: 'Local', icon: 'folder-outline' as const },
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Library</Text>
        <View style={styles.headerActions}>
          {activeTab === 'playlists' && (
            <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.accentDim }]} onPress={() => setShowNewPlaylist(true)}>
              <Ionicons name="add" size={22} color={colors.accent} />
            </TouchableOpacity>
          )}
          {activeTab === 'local' && (
            <TouchableOpacity style={[styles.importBtn, { backgroundColor: colors.accent }]} onPress={handleImport} disabled={importing}>
              <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
              <Text style={styles.importBtnText}>{importing ? 'Importing…' : 'Import'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsContainer}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, { backgroundColor: isActive ? colors.accent : colors.glass }]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons name={tab.icon} size={14} color={isActive ? '#fff' : colors.textMuted} />
              <Text style={[styles.tabText, { color: isActive ? '#fff' : colors.textMuted }]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {activeTab === 'playlists' && (
        playlists.length === 0 ? (
          <EmptyState
            icon="list-outline"
            title="No playlists yet"
            subtitle="Create a playlist to organize your favorites"
            action={{ label: 'New Playlist', onPress: () => setShowNewPlaylist(true) }}
          />
        ) : (
          <FlatList
            data={playlists}
            keyExtractor={(p) => p.id}
            renderItem={({ item }) => (
              <PlaylistCard playlist={item} onLongPress={() => handleDeletePlaylist(item.id, item.name)} />
            )}
            ListFooterComponent={<View style={{ height: 120 }} />}
            showsVerticalScrollIndicator={false}
          />
        )
      )}

      {activeTab === 'liked' && (
        likedTracks.length === 0 ? (
          <EmptyState
            icon="heart-outline"
            title="No liked songs"
            subtitle="Tap the heart on any song to save it here"
          />
        ) : (
          <FlatList
            data={likedTracks}
            keyExtractor={(t) => t.id}
            renderItem={({ item }) => <TrackCard track={item} queue={likedTracks} />}
            ListHeaderComponent={
              <View style={styles.likedHeader}>
                <View style={[styles.likedPlayAll, { backgroundColor: colors.accent }]}>
                  <TouchableOpacity
                    style={styles.likedPlayAllInner}
                    onPress={playAllLiked}
                  >
                    <Ionicons name="play" size={22} color="#fff" />
                    <Text style={styles.likedPlayAllText}>Play All</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.countLabel, { color: colors.textSecondary }]}>
                  {likedTracks.length} song{likedTracks.length !== 1 ? 's' : ''}
                </Text>
              </View>
            }
            ListFooterComponent={<View style={{ height: 120 }} />}
            showsVerticalScrollIndicator={false}
          />
        )
      )}

      {activeTab === 'downloads' && (
        downloadedTracks.length === 0 ? (
          <EmptyState
            icon="download-outline"
            title="No downloads"
            subtitle="Download tracks from the player for offline listening"
          />
        ) : (
          <FlatList
            data={downloadedTracks}
            keyExtractor={(t) => t.id}
            renderItem={({ item }) => <TrackCard track={item} queue={downloadedTracks} />}
            ListFooterComponent={<View style={{ height: 120 }} />}
            showsVerticalScrollIndicator={false}
          />
        )
      )}

      {activeTab === 'local' && (
        localTracks.length === 0 ? (
          <EmptyState
            icon="folder-open-outline"
            title="No local files"
            subtitle="Import audio files from your device"
            action={{ label: 'Import Files', onPress: handleImport }}
          />
        ) : (
          <FlatList
            data={localTracks}
            keyExtractor={(t) => t.id}
            renderItem={({ item }) => <TrackCard track={item} queue={localTracks} />}
            ListFooterComponent={<View style={{ height: 120 }} />}
            showsVerticalScrollIndicator={false}
          />
        )
      )}

      <Modal visible={showNewPlaylist} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.glassStrong }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Playlist</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.cardAlt, color: colors.text, borderColor: colors.glassBorder }]}
              placeholder="Playlist name"
              placeholderTextColor={colors.textMuted}
              value={newName}
              onChangeText={setNewName}
              autoFocus
              onSubmitEditing={handleCreatePlaylist}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.modalCancel, { borderColor: colors.glassBorder }]} onPress={() => { setShowNewPlaylist(false); setNewName(''); }}>
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCreate, { backgroundColor: colors.accent }, !newName.trim() && styles.modalCreateDisabled]}
                onPress={handleCreatePlaylist}
                disabled={!newName.trim()}
              >
                <Text style={styles.modalCreateText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  title: { fontSize: 24, fontWeight: '800' },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  importBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  importBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  tabsScroll: { flexGrow: 0 },
  tabsContainer: { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 18, borderWidth: 1, borderColor: 'transparent' },
  tabText: { fontSize: 13, fontWeight: '500' },
  likedHeader: { paddingHorizontal: 16, paddingVertical: 12 },
  likedPlayAll: { borderRadius: 18, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  likedPlayAllInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  likedPlayAllText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  countLabel: { fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  modalBox: { width: '100%', borderRadius: 26, padding: 24, gap: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalInput: { borderRadius: 10, padding: 14, fontSize: 15, borderWidth: 1 },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 4 },
  modalCancel: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  modalCancelText: { fontWeight: '500' },
  modalCreate: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  modalCreateDisabled: { opacity: 0.4 },
  modalCreateText: { color: '#fff', fontWeight: '600' },
});
