import { Track, Artist, Album, SearchResults } from '../../types';
import { JAMENDO_CLIENT_ID, JAMENDO_BASE_URL, PLACEHOLDER_ART } from '../constants/config';

export function isJamendoConfigured(): boolean {
  const id: string = JAMENDO_CLIENT_ID;
  return id !== 'YOUR_JAMENDO_CLIENT_ID' && id.length > 0;
}

function buildUrl(path: string, params: Record<string, string | number>): string {
  const p = new URLSearchParams({
    client_id: JAMENDO_CLIENT_ID,
    format: 'json',
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  });
  return `${JAMENDO_BASE_URL}${path}?${p.toString()}`;
}

function mapTrack(t: JamendoTrack): Track {
  return {
    id: `j_${t.id}`,
    title: t.name,
    artist: t.artist_name,
    artistId: `j_${t.artist_id}`,
    album: t.album_name || 'Unknown Album',
    albumId: `j_${t.album_id}`,
    albumArt: t.image || PLACEHOLDER_ART,
    duration: t.duration,
    streamUrl: t.audio,
    downloadUrl: t.audiodownload,
    downloadAllowed: t.audiodownload_allowed,
    source: 'jamendo',
  };
}

function mapArtist(a: JamendoArtist): Artist {
  return {
    id: `j_${a.id}`,
    name: a.name,
    image: a.image || PLACEHOLDER_ART,
    website: a.website,
    joindate: a.joindate,
  };
}

function mapAlbum(a: JamendoAlbum): Album {
  return {
    id: `j_${a.id}`,
    name: a.name,
    artist: a.artist_name,
    artistId: `j_${a.artist_id}`,
    image: a.image || PLACEHOLDER_ART,
    releaseDate: a.releasedate,
    trackCount: a.tracks,
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  if (data.headers?.status !== 'success') throw new Error(data.headers?.error_message || 'API error');
  return data.results as T;
}

export async function getTrendingTracks(limit = 20): Promise<Track[]> {
  const url = buildUrl('/tracks', { limit, boost: 'popularity_month', include: 'musicinfo', imagesize: 300 });
  const results = await fetchJson<JamendoTrack[]>(url);
  return results.map(mapTrack);
}

export async function getFeaturedTracks(limit = 10): Promise<Track[]> {
  const url = buildUrl('/tracks', { limit, boost: 'listens_month', include: 'musicinfo', imagesize: 300 });
  const results = await fetchJson<JamendoTrack[]>(url);
  return results.map(mapTrack);
}

export async function getTrendingArtists(limit = 20): Promise<Artist[]> {
  const url = buildUrl('/artists', { limit, boost: 'popularity_month', imagesize: 300 });
  const results = await fetchJson<JamendoArtist[]>(url);
  return results.map(mapArtist);
}

export async function getNewAlbums(limit = 20): Promise<Album[]> {
  const url = buildUrl('/albums', { limit, orderby: 'releasedate_desc', imagesize: 300 });
  const results = await fetchJson<JamendoAlbum[]>(url);
  return results.map(mapAlbum);
}

export async function searchAll(query: string): Promise<SearchResults> {
  const q = encodeURIComponent(query);
  const [tracks, artists, albums] = await Promise.allSettled([
    fetchJson<JamendoTrack[]>(buildUrl('/tracks', { search: q, limit: 30, imagesize: 300 })),
    fetchJson<JamendoArtist[]>(buildUrl('/artists', { namesearch: q, limit: 20, imagesize: 300 })),
    fetchJson<JamendoAlbum[]>(buildUrl('/albums', { namesearch: q, limit: 20, imagesize: 300 })),
  ]);
  return {
    tracks: tracks.status === 'fulfilled' ? tracks.value.map(mapTrack) : [],
    artists: artists.status === 'fulfilled' ? artists.value.map(mapArtist) : [],
    albums: albums.status === 'fulfilled' ? albums.value.map(mapAlbum) : [],
  };
}

export async function searchByGenre(tag: string, limit = 20): Promise<Track[]> {
  const url = buildUrl('/tracks', { tags: tag, limit, boost: 'listens', imagesize: 300 });
  const results = await fetchJson<JamendoTrack[]>(url);
  return results.map(mapTrack);
}

export async function getArtistTracks(artistId: string): Promise<Track[]> {
  const id = artistId.replace('j_', '');
  const url = buildUrl('/tracks', { artist_id: id, limit: 50, imagesize: 300 });
  const results = await fetchJson<JamendoTrack[]>(url);
  return results.map(mapTrack);
}

export async function getArtistAlbums(artistId: string): Promise<Album[]> {
  const id = artistId.replace('j_', '');
  const url = buildUrl('/artists/albums', { id, limit: 20, imagesize: 300 });
  const results = await fetchJson<JamendoAlbum[]>(url);
  return results.map(mapAlbum);
}

export async function getAlbumTracks(albumId: string): Promise<Track[]> {
  const id = albumId.replace('j_', '');
  const url = buildUrl('/albums/tracks', { id, include: 'musicinfo', imagesize: 300 });
  const results = await fetchJson<{ tracks: JamendoTrack[]; id: string; name: string; artist_name: string }[]>(url);
  if (!results.length) return [];
  return results[0].tracks.map((t) =>
    mapTrack({ ...t, artist_name: results[0].artist_name, album_name: results[0].name, album_id: id } as JamendoTrack)
  );
}

// Jamendo API types (internal)
interface JamendoTrack {
  id: string;
  name: string;
  duration: number;
  artist_id: string;
  artist_name: string;
  album_id: string;
  album_name: string;
  image: string;
  audio: string;
  audiodownload: string;
  audiodownload_allowed: boolean;
}

interface JamendoArtist {
  id: string;
  name: string;
  image: string;
  website?: string;
  joindate?: string;
}

interface JamendoAlbum {
  id: string;
  name: string;
  artist_id: string;
  artist_name: string;
  image: string;
  releasedate?: string;
  tracks?: number;
}
