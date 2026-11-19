import AsyncStorage from '@react-native-async-storage/async-storage';
import { Playlist, Track } from '../../types';

const KEYS = {
  LIKED_TRACKS: 'tunebaby:liked_tracks',
  PLAYLISTS: 'tunebaby:playlists',
  DOWNLOADED_TRACKS: 'tunebaby:downloaded_tracks',
  RECENTLY_PLAYED: 'tunebaby:recently_played',
  LOCAL_TRACKS: 'tunebaby:local_tracks',
  CURRENT_TRACK: 'tunebaby:current_track',
  QUEUE: 'tunebaby:queue',
};

async function get<T>(key: string): Promise<T | null> {
  try {
    const v = await AsyncStorage.getItem(key);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}

async function set(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export async function getLikedTrackIds(): Promise<string[]> {
  return (await get<string[]>(KEYS.LIKED_TRACKS)) ?? [];
}

export async function saveLikedTrackIds(ids: string[]): Promise<void> {
  await set(KEYS.LIKED_TRACKS, ids);
}

export async function getPlaylists(): Promise<Playlist[]> {
  return (await get<Playlist[]>(KEYS.PLAYLISTS)) ?? [];
}

export async function savePlaylists(playlists: Playlist[]): Promise<void> {
  await set(KEYS.PLAYLISTS, playlists);
}

export async function getDownloadedTracks(): Promise<Track[]> {
  return (await get<Track[]>(KEYS.DOWNLOADED_TRACKS)) ?? [];
}

export async function saveDownloadedTracks(tracks: Track[]): Promise<void> {
  await set(KEYS.DOWNLOADED_TRACKS, tracks);
}

export async function getRecentlyPlayed(): Promise<Track[]> {
  return (await get<Track[]>(KEYS.RECENTLY_PLAYED)) ?? [];
}

export async function addToRecentlyPlayed(track: Track): Promise<void> {
  const existing = await getRecentlyPlayed();
  const filtered = existing.filter((t) => t.id !== track.id);
  const updated = [track, ...filtered].slice(0, 50);
  await set(KEYS.RECENTLY_PLAYED, updated);
}

export async function getLocalTracks(): Promise<Track[]> {
  return (await get<Track[]>(KEYS.LOCAL_TRACKS)) ?? [];
}

export async function saveLocalTracks(tracks: Track[]): Promise<void> {
  await set(KEYS.LOCAL_TRACKS, tracks);
}

export async function getSavedPlayerState(): Promise<{ track: Track | null; queue: Track[] }> {
  const track = await get<Track>(KEYS.CURRENT_TRACK);
  const queue = (await get<Track[]>(KEYS.QUEUE)) ?? [];
  return { track, queue };
}

export async function savePlayerState(track: Track | null, queue: Track[]): Promise<void> {
  await set(KEYS.CURRENT_TRACK, track);
  await set(KEYS.QUEUE, queue);
}
