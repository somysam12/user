import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../src/constants/colors';
import { TrackCard } from '../../src/components/TrackCard';
import { EmptyState } from '../../src/components/EmptyState';
import { useLibrary } from '../../src/contexts/LibraryContext';
import { usePlayer } from '../../src/contexts/PlayerContext';
import { Track } from '../../types';

export default function PlaylistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getPlaylist, renamePlaylist, deletePlaylist, removeTrackFromPlaylist, downloadedTracks, localTracks } = useLibrary();
  const { play } = usePlayer();
  const [showRename, setShowRename] = useState(false);
  const [newName, setNewName] = useState('');

  const playlist = id ? getPlaylist(id) : undefined;

  // Gather actual Track objects from track IDs
  // In a real app you'd have a track cache; here we use downloaded + local as sources
  const allKnownTracks: Track[] = [...downloadedTracks, ...localTracks];
  const tracks = playlist?.trackIds.map((tid) => allKnownTracks.find((t) => t.id === tid)).filter((t): t is Track => !!t) ?? [];

  if (!playlist) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <EmptyState icon="list-outline" title="Playlist not found" subtitle="It may have been deleted" />
      </View>
    );
  }

  const handleRename = () => {
    if (!newName.trim()) return;
    renamePlaylist(playlist.id, newName.trim());
    setShowRename(false);
  };

  const handleDelete = () => {
    Alert.alert('Delete Playlist', `Delete "${playlist.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deletePlaylist(playlist.id); router.back(); } },
    ]);
  };

  const handleRemoveTrack = (trackId: string) => {
    Alert.alert('Remove Track', 'Remove this song from the playlist?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeTrackFromPlaylist(playlist.id, trackId) },
    ]);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title} numberOfLines={1}>{playlist.name}</Text>
          <Text style={styles.subtitle}>{playlist.trackIds.length} song{playlist.trackIds.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity
          style={styles.moreBtn}
          onPress={() =>
            Alert.alert(playlist.name, undefined, [
              { text: 'Rename', onPress: () => { setNewName(playlist.name); setShowRename(true); } },
              { text: 'Delete Playlist', style: 'destructive', onPress: handleDelete },
              { text: 'Cancel', style: 'cancel' },
            ])
          }
        >
          <Ionicons name="ellipsis-vertical" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Play all */}
      {tracks.length > 0 && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.playAllBtn} onPress={() => play(tracks[0], tracks)}>
            <Ionicons name="play" size={16} color="#fff" />
            <Text style={styles.playAllText}>Play All</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shuffleBtn} onPress={() => { const s = [...tracks].sort(() => Math.random() - 0.5); play(s[0], s); }}>
            <Ionicons name="shuffle" size={16} color={Colors.accent} />
            <Text style={styles.shuffleText}>Shuffle</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tracks */}
      {tracks.length === 0 ? (
        playlist.trackIds.length > 0 ? (
          <EmptyState
            icon="musical-notes-outline"
            title="Tracks not available"
            subtitle="These tracks are from online search. Download them or import local files to play from a playlist."
          />
        ) : (
          <EmptyState
            icon="add-circle-outline"
            title="Playlist is empty"
            subtitle="Long-press any track and choose 'Add to Playlist' to add songs here"
          />
        )
      ) : (
        <FlatList
          data={tracks}
          keyExtractor={(t) => t.id}
          renderItem={({ item, index }) => (
            <TrackCard
              track={item}
              queue={tracks}
              showIndex={index}
              onLongPress={() => handleRemoveTrack(item.id)}
            />
          )}
          ListFooterComponent={<View style={{ height: 100 }} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Rename modal */}
      <Modal visible={showRename} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Rename Playlist</Text>
            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              autoFocus
              onSubmitEditing={handleRename}
              placeholderTextColor={Colors.textMuted}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowRename(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleRename}>
                <Text style={styles.modalSaveText}>Save</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 8, gap: 4 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1 },
  title: { color: Colors.text, fontSize: 18, fontWeight: '700' },
  subtitle: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
  moreBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 8 },
  playAllBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.accent, paddingVertical: 12, borderRadius: 24 },
  playAllText: { color: '#fff', fontWeight: '600' },
  shuffleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: Colors.accent, paddingVertical: 12, borderRadius: 24 },
  shuffleText: { color: Colors.accent, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  modalBox: { width: '100%', backgroundColor: Colors.card, borderRadius: 16, padding: 24, gap: 16 },
  modalTitle: { color: Colors.text, fontSize: 18, fontWeight: '700' },
  modalInput: { backgroundColor: Colors.cardAlt, borderRadius: 10, padding: 14, color: Colors.text, fontSize: 15, borderWidth: 1, borderColor: Colors.border },
  modalBtns: { flexDirection: 'row', gap: 12 },
  modalCancel: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  modalCancelText: { color: Colors.textSecondary, fontWeight: '500' },
  modalSave: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: Colors.accent, alignItems: 'center' },
  modalSaveText: { color: '#fff', fontWeight: '600' },
});
