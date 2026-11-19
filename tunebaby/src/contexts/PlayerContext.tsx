import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Audio, AVPlaybackStatus, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { Track } from '../../types';
import { addToRecentlyPlayed, savePlayerState } from '../services/storage';

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

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });
    return () => { unloadSound(); };
  }, []);

  const unloadSound = async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
  };

  const onPlaybackStatus = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) setError(`Playback error: ${status.error}`);
      return;
    }
    setPosition(status.positionMillis / 1000);
    setDuration((status.durationMillis ?? 0) / 1000);
    setIsPlaying(status.isPlaying);
    if (status.didJustFinish && !status.isLooping) {
      handleTrackEnd();
    }
  }, [currentIndex, queue, repeatMode]);

  const handleTrackEnd = useCallback(() => {
    if (repeatMode === 'one') {
      soundRef.current?.replayAsync();
      return;
    }
    const nextIdx = currentIndex + 1;
    if (nextIdx < queue.length) {
      playAtIndex(nextIdx);
    } else if (repeatMode === 'all' && queue.length > 0) {
      playAtIndex(0);
    } else {
      setIsPlaying(false);
    }
  }, [currentIndex, queue, repeatMode]);

  const playAtIndex = useCallback(async (idx: number) => {
    if (idx < 0 || idx >= queue.length) return;
    const track = queue[idx];
    setCurrentIndex(idx);
    setCurrentTrack(track);
    setIsLoading(true);
    setError(null);
    try {
      await unloadSound();
      const url = track.downloadedPath || track.localUri || track.streamUrl;
      if (!url) throw new Error('No audio source available for this track');
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true, progressUpdateIntervalMillis: 500 },
        onPlaybackStatus
      );
      soundRef.current = sound;
      await addToRecentlyPlayed(track);
      savePlayerState(track, queue);
    } catch (e: any) {
      setError(e.message ?? 'Could not play track. Check your connection or try again.');
    } finally {
      setIsLoading(false);
    }
  }, [queue, onPlaybackStatus]);

  const play = useCallback(async (track: Track, newQueue?: Track[]) => {
    const q = newQueue ?? [track];
    const idx = q.findIndex((t) => t.id === track.id);
    setQueue(q);
    await playAtIndex(idx >= 0 ? idx : 0);
  }, []);

  const pause = useCallback(async () => {
    await soundRef.current?.pauseAsync();
    setIsPlaying(false);
  }, []);

  const resume = useCallback(async () => {
    await soundRef.current?.playAsync();
    setIsPlaying(true);
  }, []);

  const togglePlay = useCallback(async () => {
    if (isPlaying) await pause();
    else await resume();
  }, [isPlaying, pause, resume]);

  const next = useCallback(async () => {
    const nextIdx = currentIndex + 1;
    if (nextIdx < queue.length) await playAtIndex(nextIdx);
    else if (repeatMode === 'all') await playAtIndex(0);
  }, [currentIndex, queue, repeatMode, playAtIndex]);

  const prev = useCallback(async () => {
    if (position > 3) {
      await soundRef.current?.setPositionAsync(0);
      return;
    }
    const prevIdx = currentIndex - 1;
    if (prevIdx >= 0) await playAtIndex(prevIdx);
  }, [currentIndex, position, playAtIndex]);

  const seekTo = useCallback(async (seconds: number) => {
    await soundRef.current?.setPositionAsync(seconds * 1000);
  }, []);

  const toggleShuffle = useCallback(() => setIsShuffled((s) => !s), []);

  const toggleRepeat = useCallback(() => {
    setRepeatMode((m) => m === 'off' ? 'all' : m === 'all' ? 'one' : 'off');
  }, []);

  const addToQueue = useCallback((track: Track) => {
    setQueue((q) => [...q, track]);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <PlayerContext.Provider value={{
      currentTrack, queue, currentIndex, isPlaying, position, duration,
      isShuffled, repeatMode, isLoading, error,
      play, pause, resume, togglePlay, next, prev, seekTo,
      toggleShuffle, toggleRepeat, addToQueue, clearError,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside PlayerProvider');
  return ctx;
}
