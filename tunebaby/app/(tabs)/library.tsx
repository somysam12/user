import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, TextInput, Modal, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../src/constants/colors';
import { PlaylistCard } from '../../src/components/PlaylistCard';
import { TrackCard } from '../../src/components/TrackCard';
import { EmptyState } from '../../src/components/EmptyState';
import { useLibrary } from '../../src/contexts/LibraryContext';
import { usePlayer } from '../../src/contexts/PlayerContext';
import { Track } from '../../types';

type LibraryTab = 'playlists' | 'downloads' | 'local' | 'liked';

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const { playlists, createPlaylist, deletePlaylist, downloadedTracks, localTracks, likedTrackIds, importLocalFiles } = useLibrary();
  const { play } = usePlayer();
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
      if (imported.length > 0) Alert.alert('Imported', `${imported.length} file(s) added to your library.`);
    } catch (e: any) {
      Alert.alert('Import failed', e.message ?? 'Could not import files.');
    } finally {
      setImporting(false);
    }
  };

  const TABS = [
    { key: 'playlists' as LibraryTab, label: 'Playlists', icon: 'list' as const },
    { key: 'liked' as LibraryTab, label: 'Liked', icon: 'heart' as const },
    { key: 'downloads' as LibraryTab, label: 'Downloads', icon: 'download' as const },
    { key: 'local' as LibraryTab, label: 'Local', icon: 'folder' as const },
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Library</Text>
        {activeTab === 'playlists' && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowNewPlaylist(true)}>
            <Ionicons name="add" size={22} color={Colors.accent} />
          </TouchableOpacity>
        )}
        {activeTab === 'local' && (
          <TouchableOpacity style={styles.importBtn} onPress={handleImport} disabled={importing}>
            <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
            <Text style={styles.importBtnText}>{importing ? 'Importing…' : 'Import'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabs}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons name={tab.icon} size={15} color={activeTab === tab.key ? '#fff' : Colors.textMuted} />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      {activeTab === 'playlists' && (
        playlists.length === 0 ? (
          <EmptyState
            icon="list-outline"
            title="No playlists yet"
            subtitle="Create a playlist to organize your favorite songs"
            action={{ label: 'Create Playlist', onPress: () => setShowNewPlaylist(true) }}
          />
        ) : (
          <FlatList
            data={playlists}
            keyExtractor={(p) => p.id}
            renderItem={({ item }) => (
              <PlaylistCard
                playlist={item}
                onLongPress={() => handleDeletePlaylist(item.id, item.name)}
              />
            )}
            ListFooterComponent={<View style={{ height: 100 }} />}
            showsVerticalScrollIndicator={false}
          />
        )
      )}

      {activeTab === 'liked' && (
        likedTrackIds.size === 0 ? (
          <EmptyState
            icon="heart-outline"
            title="No liked songs"
            subtitle="Tap the heart icon on any song to save it here"
          />
        ) : (
          <View style={{ flex: 1 }}>
            <Text style={styles.countLabel}>{likedTrackIds.size} song{likedTrackIds.size !== 1 ? 's' : ''}</Text>
            <Text style={styles.likedNote}>Liked songs are shown here — open them from recent or search to play</Text>
            <View style={{ height: 100 }} />
          </View>
        )
      )}

      {activeTab === 'downloads' && (
        downloadedTracks.length === 0 ? (
          <EmptyState
            icon="download-outline"
            title="No downloads"
            subtitle="Tap the download icon on a track to save it for offline listening"
          />
        ) : (
          <FlatList
            data={downloadedTracks}
            keyExtractor={(t) => t.id}
            renderItem={({ item }) => <TrackCard track={item} queue={downloadedTracks} />}
            ListFooterComponent={<View style={{ height: 100 }} />}
            showsVerticalScrollIndicator={false}
          />
        )
      )}

      {activeTab === 'local' && (
        localTracks.length === 0 ? (
          <EmptyState
            icon="folder-open-outline"
            title="No local files"
            subtitle="Import audio files from your device to play them here"
            action={{ label: 'Import Files', onPress: handleImport }}
          />
        ) : (
          <FlatList
            data={localTracks}
            keyExtractor={(t) => t.id}
            renderItem={({ item }) => <TrackCard track={item} queue={localTracks} />}
            ListFooterComponent={<View style={{ height: 100 }} />}
            showsVerticalScrollIndicator={false}
          />
        )
      )}

      {/* New playlist modal */}
      <Modal visible={showNewPlaylist} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>New Playlist</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Playlist name"
              placeholderTextColor={Colors.textMuted}
              value={newName}
              onChangeText={setNewName}
              autoFocus
              onSubmitEditing={handleCreatePlaylist}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setShowNewPlaylist(false); setNewName(''); }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalCreate, !newName.trim() && styles.modalCreateDisabled]} onPress={handleCreatePlaylist} disabled={!newName.trim()}>
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
  root: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  title: { color: Colors.text, fontSize: 24, fontWeight: '800' },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.accentDim, alignItems: 'center', justifyContent: 'center' },
  importBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.accent, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  importBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  tabsScroll: { flexGrow: 0 },
  tabs: { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.card },
  tabActive: { backgroundColor: Colors.accent },
  tabText: { color: Colors.textMuted, fontSize: 13, fontWeight: '500' },
  tabTextActive: { color: '#fff' },
  countLabel: { color: Colors.textSecondary, fontSize: 13, paddingHorizontal: 20, marginTop: 8 },
  likedNote: { color: Colors.textMuted, fontSize: 12, paddingHorizontal: 20, marginTop: 4, lineHeight: 18 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  modalBox: { width: '100%', backgroundColor: Colors.card, borderRadius: 16, padding: 24, gap: 16 },
  modalTitle: { color: Colors.text, fontSize: 18, fontWeight: '700' },
  modalInput: { backgroundColor: Colors.cardAlt, borderRadius: 10, padding: 14, color: Colors.text, fontSize: 15, borderWidth: 1, borderColor: Colors.border },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 4 },
  modalCancel: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  modalCancelText: { color: Colors.textSecondary, fontWeight: '500' },
  modalCreate: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: Colors.accent, alignItems: 'center' },
  modalCreateDisabled: { opacity: 0.4 },
  modalCreateText: { color: '#fff', fontWeight: '600' },
});
