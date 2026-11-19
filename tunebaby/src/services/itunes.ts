// iTunes Search API — no key required; 30-second preview clips
import { Track, Artist, Album } from '../../types';
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
    streamUrl: r.previewUrl,
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

export async function getITunesTopSongs(country = 'us', limit = 20): Promise<Track[]> {
  try {
    const url = `${BASE}/${country}/rss/topSongs/limit=${limit}/explicit=false/json`;
    const data = await fetchJson<{ feed: { entry?: iTunesRSSEntry[] } }>(url);
    const entries = data.feed?.entry ?? [];
    // Each RSS entry has an id that we can look up for preview
    // The RSS doesn't have preview URLs directly, so search top songs instead
    if (!entries.length) throw new Error('empty');
    // Extract top song names and do a batch search
    const topNames = entries.slice(0, 5).map((e) => e['im:name']?.label ?? '').filter(Boolean);
    if (!topNames.length) throw new Error('no names');
    const results = await searchITunes(topNames.join(' OR '), limit);
    return results;
  } catch {
    // Fallback: search popular music
    return searchITunes('top hits 2024', limit);
  }
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

interface iTunesRSSEntry {
  'im:name'?: { label: string };
  'im:artist'?: { label: string };
}
