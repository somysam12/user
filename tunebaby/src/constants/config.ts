// --- Online Music Sources ---
// Deezer + iTunes work OUT OF THE BOX — no API key needed.
// Both provide 30-second licensed preview clips of real songs.
//
// For FULL unlimited tracks (no 30-sec limit), optionally add Jamendo:
// Register free at https://devportal.jamendo.com/ and paste your client_id below.
export const JAMENDO_CLIENT_ID = 'YOUR_JAMENDO_CLIENT_ID';

export const JAMENDO_BASE_URL = 'https://api.jamendo.com/v3.0';

export const DOWNLOADS_DIR = 'tunebaby/downloads/';
export const MINI_PLAYER_HEIGHT = 68;
export const TAB_BAR_HEIGHT = 60;

export const GENRE_CATEGORIES = [
  { id: 'pop', name: 'Pop', color: '#FF6B4A', icon: '🎵' },
  { id: 'rock', name: 'Rock', color: '#E040FB', icon: '🎸' },
  { id: 'electronic', name: 'Electronic', color: '#00BCD4', icon: '🎹' },
  { id: 'hiphop', name: 'Hip Hop', color: '#FFC107', icon: '🎤' },
  { id: 'jazz', name: 'Jazz', color: '#8BC34A', icon: '🎷' },
  { id: 'classical', name: 'Classical', color: '#FF7043', icon: '🎻' },
  { id: 'folk', name: 'Folk', color: '#26A69A', icon: '🪕' },
  { id: 'ambient', name: 'Ambient', color: '#5C6BC0', icon: '🌊' },
];

export const PLACEHOLDER_ART = 'https://picsum.photos/seed/tunebaby/300/300';
