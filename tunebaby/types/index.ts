export interface Track {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  album: string;
  albumId: string;
  albumArt: string;
  duration: number; // seconds
  streamUrl: string;
  downloadUrl?: string;
  downloadAllowed?: boolean;
  source: 'jamendo' | 'deezer' | 'itunes' | 'local' | 'device';
  isPreview?: boolean; // true for 30-sec Deezer/iTunes previews
  localUri?: string;
  isDownloaded?: boolean;
  downloadedPath?: string;
}

export interface Artist {
  id: string;
  name: string;
  image: string;
  website?: string;
  joindate?: string;
  country?: string;
  trackCount?: number;
}

export interface Album {
  id: string;
  name: string;
  artist: string;
  artistId: string;
  image: string;
  releaseDate?: string;
  trackCount?: number;
  tracks?: Track[];
}

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
  coverArt?: string;
  createdAt: number;
  updatedAt: number;
}

export interface PlayerState {
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
}

export interface LibraryState {
  likedTrackIds: Set<string>;
  playlists: Playlist[];
  downloadedTracks: Track[];
  recentlyPlayed: Track[];
  localTracks: Track[];
}

export type SearchTab = 'tracks' | 'artists' | 'albums';

export interface SearchResults {
  tracks: Track[];
  artists: Artist[];
  albums: Album[];
}
