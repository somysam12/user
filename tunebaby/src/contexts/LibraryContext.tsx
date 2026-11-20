import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { Playlist, Track } from '../../types';
import {
  getLikedTrackIds, saveLikedTrackIds,
  getLikedTracksData, saveLikedTracksData,
  getPlaylists, savePlaylists,
  getDownloadedTracks, saveDownloadedTracks,
  getRecentlyPlayed, getLocalTracks, saveLocalTracks,
  addToRecentlyPlayed as persistRecentlyPlayed,
} from '../services/storage';
import { DOWNLOADS_DIR } from '../constants/config';

interface LibraryContextValue {
  likedTrackIds: Set<string>;
  likedTracks: Track[];
  playlists: Playlist[];
  downloadedTracks: Track[];
  recentlyPlayed: Track[];
  localTracks: Track[];
  isLoaded: boolean;
  likeTrack: (track: Track) => void;
  unlikeTrack: (id: string) => void;
  isLiked: (id: string) => boolean;
  addRecentlyPlayedTrack: (track: Track) => void;
  createPlaylist: (name: string) => Playlist;
  renamePlaylist: (id: string, name: string) => void;
  deletePlaylist: (id: string) => void;
  addTrackToPlaylist: (playlistId: string, track: Track) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  getPlaylist: (id: string) => Playlist | undefined;
  importLocalFiles: () => Promise<Track[]>;
  downloadTrack: (track: Track) => Promise<Track>;
  removeDownload: (trackId: string) => void;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [likedTrackIds, setLikedTrackIds] = useState<Set<string>>(new Set());
  const [likedTracks, setLikedTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [downloadedTracks, setDownloadedTracks] = useState<Track[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>([]);
  const [localTracks, setLocalTracks] = useState<Track[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const [liked, likedData, pls, dl, recent, local] = await Promise.all([
        getLikedTrackIds(),
        getLikedTracksData(),
        getPlaylists(),
        getDownloadedTracks(),
        getRecentlyPlayed(),
        getLocalTracks(),
      ]);
      setLikedTrackIds(new Set(liked));
      setLikedTracks(likedData);
      setPlaylists(pls);
      setDownloadedTracks(dl);
      setRecentlyPlayed(recent);
      setLocalTracks(local);
      setIsLoaded(true);
    })();
  }, []);

  const likeTrack = useCallback((track: Track) => {
    setLikedTrackIds((s) => {
      const n = new Set(s);
      n.add(track.id);
      saveLikedTrackIds([...n]);
      return n;
    });
    setLikedTracks((prev) => {
      if (prev.some((t) => t.id === track.id)) return prev;
      const n = [track, ...prev];
      saveLikedTracksData(n);
      return n;
    });
  }, []);

  const unlikeTrack = useCallback((id: string) => {
    setLikedTrackIds((s) => {
      const n = new Set(s);
      n.delete(id);
      saveLikedTrackIds([...n]);
      return n;
    });
    setLikedTracks((prev) => {
      const n = prev.filter((t) => t.id !== id);
      saveLikedTracksData(n);
      return n;
    });
  }, []);

  const isLiked = useCallback((id: string) => likedTrackIds.has(id), [likedTrackIds]);

  const addRecentlyPlayedTrack = useCallback((track: Track) => {
    persistRecentlyPlayed(track);
    setRecentlyPlayed((prev) => {
      const filtered = prev.filter((t) => t.id !== track.id);
      return [track, ...filtered].slice(0, 50);
    });
  }, []);

  const createPlaylist = useCallback((name: string): Playlist => {
    const p: Playlist = {
      id: `pl_${Date.now()}`,
      name,
      trackIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setPlaylists((prev) => {
      const n = [...prev, p];
      savePlaylists(n);
      return n;
    });
    return p;
  }, []);

  const renamePlaylist = useCallback((id: string, name: string) => {
    setPlaylists((prev) => {
      const n = prev.map((p) => p.id === id ? { ...p, name, updatedAt: Date.now() } : p);
      savePlaylists(n);
      return n;
    });
  }, []);

  const deletePlaylist = useCallback((id: string) => {
    setPlaylists((prev) => {
      const n = prev.filter((p) => p.id !== id);
      savePlaylists(n);
      return n;
    });
  }, []);

  const addTrackToPlaylist = useCallback((playlistId: string, track: Track) => {
    setPlaylists((prev) => {
      const n = prev.map((p) => {
        if (p.id !== playlistId) return p;
        if (p.trackIds.includes(track.id)) return p;
        return { ...p, trackIds: [...p.trackIds, track.id], updatedAt: Date.now() };
      });
      savePlaylists(n);
      return n;
    });
  }, []);

  const removeTrackFromPlaylist = useCallback((playlistId: string, trackId: string) => {
    setPlaylists((prev) => {
      const n = prev.map((p) =>
        p.id === playlistId
          ? { ...p, trackIds: p.trackIds.filter((id) => id !== trackId), updatedAt: Date.now() }
          : p
      );
      savePlaylists(n);
      return n;
    });
  }, []);

  const getPlaylist = useCallback((id: string) => playlists.find((p) => p.id === id), [playlists]);

  const importLocalFiles = useCallback(async (): Promise<Track[]> => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return [];
    const tracks: Track[] = result.assets.map((asset) => ({
      id: `local_${asset.name}_${Date.now()}`,
      title: asset.name.replace(/\.[^/.]+$/, ''),
      artist: 'Unknown Artist',
      artistId: 'local',
      album: 'Local Files',
      albumId: 'local',
      albumArt: '',
      duration: 0,
      streamUrl: asset.uri,
      localUri: asset.uri,
      source: 'local',
    }));
    const updated = [...localTracks, ...tracks];
    setLocalTracks(updated);
    saveLocalTracks(updated);
    return tracks;
  }, [localTracks]);

  const downloadTrack = useCallback(async (track: Track): Promise<Track> => {
    if (!track.downloadUrl || !track.downloadAllowed) {
      throw new Error('Download not available for this track.');
    }
    const dir = FileSystem.documentDirectory + DOWNLOADS_DIR;
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    const fileName = `${track.id}.mp3`;
    const path = dir + fileName;
    await FileSystem.downloadAsync(track.downloadUrl, path);
    const updated: Track = { ...track, isDownloaded: true, downloadedPath: path };
    setDownloadedTracks((prev) => {
      const filtered = prev.filter((t) => t.id !== track.id);
      const n = [...filtered, updated];
      saveDownloadedTracks(n);
      return n;
    });
    return updated;
  }, []);

  const removeDownload = useCallback((trackId: string) => {
    setDownloadedTracks((prev) => {
      const track = prev.find((t) => t.id === trackId);
      if (track?.downloadedPath) {
        FileSystem.deleteAsync(track.downloadedPath, { idempotent: true });
      }
      const n = prev.filter((t) => t.id !== trackId);
      saveDownloadedTracks(n);
      return n;
    });
  }, []);

  return (
    <LibraryContext.Provider value={{
      likedTrackIds, likedTracks, playlists, downloadedTracks, recentlyPlayed, localTracks, isLoaded,
      likeTrack, unlikeTrack, isLiked, addRecentlyPlayedTrack,
      createPlaylist, renamePlaylist, deletePlaylist,
      addTrackToPlaylist, removeTrackFromPlaylist, getPlaylist,
      importLocalFiles, downloadTrack, removeDownload,
    }}>
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used inside LibraryProvider');
  return ctx;
}
