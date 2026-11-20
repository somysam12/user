import { Track, Artist, Album, SearchResults } from '../../types';
import { PLACEHOLDER_ART } from '../constants/config';

const BASE = 'https://itunes.apple.com';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`iTunes API ${res.status}`);
  return res.json();
}

function mapTrack(r: iTunesTrack): Track {
  return {
    id: `it_${r.trackId}`,
    title: r.trackName,
    artist: r.artistName,
    artistId: `it_${r.artistId}`,
    album: r.collectionName ?? 'Unknown Album',
    albumId: `it_${r.collectionId ?? 0}`,
    albumArt: r.artworkUrl100?.replace('100x100', '300x300') ?? PLACEHOLDER_ART,
    duration: Math.round((r.trackTimeMillis ?? 30000) / 1000),
    streamUrl: r.previewUrl ?? '',
    source: 'itunes',
    isPreview: true,
  };
}

export async function searchITunes(query: string, limit = 25): Promise<Track[]> {
  const url = `${BASE}/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=${limit}`;
  const data = await fetchJson<{ resultCount: number; results: iTunesTrack[] }>(url);
  return data.results.filter((r) => r.wrapperType === 'track' && r.previewUrl).map(mapTrack);
}

export async function searchITunesArtists(query: string, limit = 15): Promise<Artist[]> {
  const url = `${BASE}/search?term=${encodeURIComponent(query)}&media=music&entity=musicArtist&limit=${limit}`;
  const data = await fetchJson<{ results: iTunesArtist[] }>(url);
  return data.results.map((a) => ({
    id: `it_${a.artistId}`,
    name: a.artistName,
    image: PLACEHOLDER_ART,
  }));
}

export async function searchITunesAlbums(query: string, limit = 15): Promise<Album[]> {
  const url = `${BASE}/search?term=${encodeURIComponent(query)}&media=music&entity=album&limit=${limit}`;
  const data = await fetchJson<{ results: iTunesAlbum[] }>(url);
  return data.results.map((a) => ({
    id: `it_${a.collectionId}`,
    name: a.collectionName,
    artist: a.artistName,
    artistId: `it_${a.artistId}`,
    image: a.artworkUrl100?.replace('100x100', '300x300') ?? PLACEHOLDER_ART,
    releaseDate: a.releaseDate,
  }));
}

export async function searchAll(query: string): Promise<SearchResults> {
  const [tracks, artists, albums] = await Promise.allSettled([
    searchITunes(query, 30),
    searchITunesArtists(query, 15),
    searchITunesAlbums(query, 15),
  ]);
  return {
    tracks: tracks.status === 'fulfilled' ? tracks.value : [],
    artists: artists.status === 'fulfilled' ? artists.value : [],
    albums: albums.status === 'fulfilled' ? albums.value : [],
  };
}

export async function getITunesTopSongs(limit = 20): Promise<Track[]> {
  try {
    return await searchITunes('top hits 2024', limit);
  } catch {
    return [];
  }
}

export async function getBollywoodTracks(limit = 20): Promise<Track[]> {
  const queries = ['arijit singh hit', 'shreya ghoshal bollywood', 'jubin nautiyal songs'];
  const results = await Promise.allSettled(queries.map((q) => searchITunes(q, 10)));
  const all: Track[] = [];
  const seen = new Set<string>();
  for (const r of results) {
    if (r.status === 'fulfilled') {
      for (const t of r.value) {
        if (!seen.has(t.id)) { seen.add(t.id); all.push(t); }
      }
    }
  }
  return all.slice(0, limit);
}

export async function getForYouTracks(artistNames: string[], limit = 20): Promise<Track[]> {
  if (!artistNames.length) return getITunesTopSongs(limit);
  const pick = artistNames.slice(0, 3);
  const results = await Promise.allSettled(pick.map((name) => searchITunes(name, 8)));
  const all: Track[] = [];
  const seen = new Set<string>();
  for (const r of results) {
    if (r.status === 'fulfilled') {
      for (const t of r.value) {
        if (!seen.has(t.id)) { seen.add(t.id); all.push(t); }
      }
    }
  }
  return all.slice(0, limit);
}

export async function getChartArtists(limit = 15): Promise<Artist[]> {
  return searchITunesArtists('taylor swift ed sheeran weeknd drake', limit);
}

export async function getChartAlbums(limit = 15): Promise<Album[]> {
  return searchITunesAlbums('top albums 2024', limit);
}

interface iTunesTrack {
  wrapperType: string;
  trackId: number;
  trackName: string;
  artistId: number;
  artistName: string;
  collectionId?: number;
  collectionName?: string;
  previewUrl: string;
  artworkUrl100?: string;
  trackTimeMillis?: number;
}
interface iTunesArtist {
  artistId: number;
  artistName: string;
}
interface iTunesAlbum {
  collectionId: number;
  collectionName: string;
  artistId: number;
  artistName: string;
  artworkUrl100?: string;
  releaseDate?: string;
}
