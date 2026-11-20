// Deezer API — no key required; returns 30-second legally licensed previews
import { Track, Artist, Album, SearchResults } from '../../types';
import { PLACEHOLDER_ART } from '../constants/config';

const BASE = 'https://api.deezer.com';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Deezer API error ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message ?? 'Deezer error');
  return data as T;
}

function artUrl(url: string | undefined): string {
  return url?.replace('/56x56', '/300x300') ?? PLACEHOLDER_ART;
}

function mapTrack(t: DeezerTrack): Track {
  return {
    id: `dz_${t.id}`,
    title: t.title,
    artist: t.artist?.name ?? 'Unknown',
    artistId: `dz_${t.artist?.id ?? 0}`,
    album: t.album?.title ?? 'Unknown Album',
    albumId: `dz_${t.album?.id ?? 0}`,
    albumArt: artUrl(t.album?.cover_medium),
    duration: t.duration,
    streamUrl: t.preview,
    source: 'deezer',
    isPreview: true,
  };
}

function mapArtist(a: DeezerArtist): Artist {
  return {
    id: `dz_${a.id}`,
    name: a.name,
    image: artUrl(a.picture_medium),
    trackCount: a.nb_fan,
  };
}

function mapAlbum(a: DeezerAlbum): Album {
  return {
    id: `dz_${a.id}`,
    name: a.title,
    artist: a.artist?.name ?? 'Unknown',
    artistId: `dz_${a.artist?.id ?? 0}`,
    image: artUrl(a.cover_medium),
    releaseDate: a.release_date,
  };
}

// --- Chart (trending / featured) ---
export async function getChartTracks(limit = 20): Promise<Track[]> {
  const data = await fetchJson<{ data: DeezerTrack[] }>(`${BASE}/chart/0/tracks?limit=${limit}`);
  return data.data.filter((t) => t.preview).map(mapTrack);
}

export async function getChartArtists(limit = 15): Promise<Artist[]> {
  const data = await fetchJson<{ data: DeezerArtist[] }>(`${BASE}/chart/0/artists?limit=${limit}`);
  return data.data.map(mapArtist);
}

export async function getChartAlbums(limit = 15): Promise<Album[]> {
  const data = await fetchJson<{ data: DeezerAlbum[] }>(`${BASE}/chart/0/albums?limit=${limit}`);
  return data.data.map(mapAlbum);
}

export async function getNewReleases(limit = 15): Promise<Album[]> {
  const data = await fetchJson<{ data: DeezerAlbum[] }>(`${BASE}/chart/0/albums?limit=${limit}`);
  return data.data.map(mapAlbum);
}

// --- Search ---
export async function searchDeezer(query: string): Promise<SearchResults> {
  const q = encodeURIComponent(query);
  const [tracks, artists, albums] = await Promise.allSettled([
    fetchJson<{ data: DeezerTrack[] }>(`${BASE}/search?q=${q}&limit=30`).then((r) => r.data.filter((t) => t.preview).map(mapTrack)),
    fetchJson<{ data: DeezerArtist[] }>(`${BASE}/search/artist?q=${q}&limit=15`).then((r) => r.data.map(mapArtist)),
    fetchJson<{ data: DeezerAlbum[] }>(`${BASE}/search/album?q=${q}&limit=15`).then((r) => r.data.map(mapAlbum)),
  ]);
  return {
    tracks: tracks.status === 'fulfilled' ? tracks.value : [],
    artists: artists.status === 'fulfilled' ? artists.value : [],
    albums: albums.status === 'fulfilled' ? albums.value : [],
  };
}

// --- Artist page ---
export async function getDeezerArtistTracks(artistId: string): Promise<Track[]> {
  const id = artistId.replace('dz_', '');
  const data = await fetchJson<{ data: DeezerTrack[] }>(`${BASE}/artist/${id}/top?limit=50`);
  return data.data.filter((t) => t.preview).map(mapTrack);
}

export async function getDeezerArtistAlbums(artistId: string): Promise<Album[]> {
  const id = artistId.replace('dz_', '');
  const data = await fetchJson<{ data: DeezerAlbum[] }>(`${BASE}/artist/${id}/albums?limit=20`);
  return data.data.map(mapAlbum);
}

// --- Genre / radio ---
export async function getDeezerGenreTracks(genreId: number, limit = 20): Promise<Track[]> {
  const data = await fetchJson<{ data: DeezerTrack[] }>(`${BASE}/genre/${genreId}/radios`).catch(() => ({ data: [] as DeezerTrack[] }));
  if (!data.data.length) {
    // Fall back to chart
    return getChartTracks(limit);
  }
  // Pick first radio and get its tracks
  const radio = (data as any).data[0];
  const tracks = await fetchJson<{ data: DeezerTrack[] }>(`${BASE}/radio/${radio.id}/tracks?limit=${limit}`);
  return tracks.data.filter((t) => t.preview).map(mapTrack);
}

// Deezer genre IDs (official)
export const DEEZER_GENRES: Record<string, number> = {
  pop: 132, rock: 152, electronic: 106, hiphop: 116, jazz: 129,
  classical: 98, folk: 197, ambient: 464,
};

// Bollywood: search Deezer for top Indian songs
export async function getBollywoodTracks(limit = 20): Promise<Track[]> {
  const queries = ['arijit singh', 'jubin nautiyal', 'shreya ghoshal'];
  const results = await Promise.allSettled(
    queries.map((q) =>
      fetchJson<{ data: DeezerTrack[] }>(`${BASE}/search?q=${encodeURIComponent(q)}&limit=10`)
        .then((r) => r.data.filter((t) => t.preview).map(mapTrack))
    )
  );
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

// Personalized "For You" tracks based on selected artist names
export async function getForYouTracks(artistNames: string[], limit = 20): Promise<Track[]> {
  if (!artistNames.length) return getChartTracks(limit);
  const pick = artistNames.slice(0, 3);
  const results = await Promise.allSettled(
    pick.map((name) =>
      fetchJson<{ data: DeezerTrack[] }>(`${BASE}/search?q=${encodeURIComponent(name)}&limit=8`)
        .then((r) => r.data.filter((t) => t.preview).map(mapTrack))
    )
  );
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

// Internal Deezer API types
interface DeezerTrack {
  id: number;
  title: string;
  duration: number;
  preview: string;
  artist?: { id: number; name: string };
  album?: { id: number; title: string; cover_medium: string };
}
interface DeezerArtist {
  id: number;
  name: string;
  picture_medium?: string;
  nb_fan?: number;
}
interface DeezerAlbum {
  id: number;
  title: string;
  cover_medium?: string;
  release_date?: string;
  artist?: { id: number; name: string };
}
