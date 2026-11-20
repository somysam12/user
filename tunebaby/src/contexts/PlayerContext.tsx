import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import TrackPlayer, {
  State,
  Event,
  Capability,
  AppKilledPlaybackBehavior,
  RepeatMode,
  usePlaybackState,
  useProgress,
  useActiveTrack,
  Track as RNTPTrack,
} from 'react-native-track-player';
import { Track } from '../../types';
import { addToRecentlyPlayed } from '../services/storage';

interface PlayerContextValue {
  currentTrack: Track | null;
  queue: Track[];
  currentIndex: number;
  isPlaying: boolean;
  position: number;
  duration: number;
  isShuffled: boolean;
  repeatMode: 'off' | 'all' | 'one';
  isLoading: boolean;
  error: string | null;
  play: (track: Track, queue?: Track[]) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  togglePlay: () => Promise<void>;
  next: () => Promise<void>;
  prev: () => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  addToQueue: (track: Track) => void;
  clearError: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

function toRNTP(track: Track): RNTPTrack {
  return {
    id: track.id,
    url: track.downloadedPath || track.localUri || track.streamUrl || '',
    title: track.title,
    artist: track.artist,
    album: track.album,
    artwork: track.albumArt,
    duration: track.duration,
  };
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const rnState = usePlaybackState();
  const progress = useProgress(500);
  const activeRNTrack = useActiveTrack();

  const isSetupRef = useRef(false);
  const trackCacheRef = useRef<Map<string, Track>>(new Map());
  const queueRef = useRef<Track[]>([]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [error, setError] = useState<string | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);

  const isPlaying = rnState.state === State.Playing;
  const isLoading = rnState.state === State.Loading || rnState.state === State.Buffering;
  const position = progress.position;
  const duration = progress.duration;
  const currentTrack = activeRNTrack
    ? (trackCacheRef.current.get(activeRNTrack.id as string) ?? null)
    : null;

  useEffect(() => {
    if (isSetupRef.current) return;
    isSetupRef.current = true;

    TrackPlayer.setupPlayer({ maxCacheSize: 1024 * 50 })
      .then(() =>
        TrackPlayer.updateOptions({
          android: {
            appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
          },
          capabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SkipToNext,
            Capability.SkipToPrevious,
            Capability.SeekTo,
            Capability.Stop,
          ],
          compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext],
          progressUpdateEventInterval: 0.5,
        })
      )
      .catch((e: any) => {
        if (!String(e?.message).includes('already')) {
          setError('Player initialization failed.');
        }
      });
  }, []);

  useEffect(() => {
    const sub = TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, (e) => {
      if (e.index != null) setCurrentIndex(e.index);
    });
    const errSub = TrackPlayer.addEventListener(Event.PlaybackError, (e) => {
      setError('Playback error. No audio available for this track.');
    });
    return () => { sub.remove(); errSub.remove(); };
  }, []);

  useEffect(() => {
    if (repeatMode === 'one') TrackPlayer.setRepeatMode(RepeatMode.Track);
    else if (repeatMode === 'all') TrackPlayer.setRepeatMode(RepeatMode.Queue);
    else TrackPlayer.setRepeatMode(RepeatMode.Off);
  }, [repeatMode]);

  const play = useCallback(async (track: Track, newQueue?: Track[]) => {
    const q = newQueue ?? [track];
    if (!track.streamUrl && !track.localUri && !track.downloadedPath) {
      setError('No audio available for this track.');
      return;
    }
    queueRef.current = q;
    setQueue(q);
    q.forEach((t) => trackCacheRef.current.set(t.id, t));
    const idx = q.findIndex((t) => t.id === track.id);

    setError(null);
    try {
      await TrackPlayer.reset();
      await TrackPlayer.add(q.map(toRNTP));
      if (idx > 0) await TrackPlayer.skip(idx);
      await TrackPlayer.play();
      addToRecentlyPlayed(track);
    } catch (e: any) {
      setError(e?.message ?? 'Could not play track.');
    }
  }, []);

  const pause = useCallback(async () => {
    await TrackPlayer.pause();
  }, []);

  const resume = useCallback(async () => {
    await TrackPlayer.play();
  }, []);

  const togglePlay = useCallback(async () => {
    if (isPlaying) await TrackPlayer.pause();
    else await TrackPlayer.play();
  }, [isPlaying]);

  const next = useCallback(async () => {
    try { await TrackPlayer.skipToNext(); } catch {}
  }, []);

  const prev = useCallback(async () => {
    if (position > 3) {
      await TrackPlayer.seekTo(0);
      return;
    }
    try { await TrackPlayer.skipToPrevious(); } catch {}
  }, [position]);

  const seekTo = useCallback(async (seconds: number) => {
    await TrackPlayer.seekTo(seconds);
  }, []);

  const toggleShuffle = useCallback(() => setIsShuffled((s) => !s), []);

  const toggleRepeat = useCallback(() => {
    setRepeatMode((m) => (m === 'off' ? 'all' : m === 'all' ? 'one' : 'off'));
  }, []);

  const addToQueue = useCallback(async (track: Track) => {
    trackCacheRef.current.set(track.id, track);
    setQueue((q) => [...q, track]);
    await TrackPlayer.add(toRNTP(track));
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <PlayerContext.Provider
      value={{
        currentTrack, queue, currentIndex, isPlaying, position, duration,
        isShuffled, repeatMode, isLoading, error,
        play, pause, resume, togglePlay, next, prev, seekTo,
        toggleShuffle, toggleRepeat, addToQueue, clearError,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be inside PlayerProvider');
  return ctx;
}
