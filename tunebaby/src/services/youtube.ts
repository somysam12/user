// YouTube URL parser — extracts video ID for embed playback only.
// No audio extraction, ripping, or download — plays through YouTube's official embed.

export function extractYouTubeId(text: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
    /youtube\.com\/.*[?&]v=([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return m[1];
  }
  return null;
}

export function isYouTubeUrl(text: string): boolean {
  return /(?:youtube\.com|youtu\.be)/i.test(text);
}

export function getEmbedHtml(videoId: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #000; }
iframe { width: 100%; height: 100vh; border: none; }
</style>
</head>
<body>
<iframe
  src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1"
  allow="autoplay; encrypted-media"
  allowfullscreen
></iframe>
</body>
</html>`;
}
