// YouTube URL parser — extracts video ID for in-app WebView playback only.
// No audio extraction, ripping, or download — plays through YouTube's own page.

import { Track } from '../../types';

export function isYouTubeTrack(track: Track): boolean {
  return track.source === 'youtube' || track.id.startsWith('yt_');
}

export function youtubeIdFromTrack(track: Track): string | null {
  if (track.id.startsWith('yt_')) return track.id.slice(3);
  return extractYouTubeId(track.streamUrl);
}

export function buildMobileWatchUrl(videoId: string): string {
  return `https://m.youtube.com/watch?v=${videoId}&autoplay=1`;
}

export function buildMobileSearchUrl(query: string): string {
  return `https://m.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%3D%3D`;
}

// Injected before page load.
// 1. Spoof Page Visibility API so YouTube does NOT pause when screen turns off
//    or the app goes to recent apps / background (YouTube checks document.hidden).
// 2. Poll location.href and postMessage URL changes (SPA navigation tracking).
export const YT_INJECT_JS = `
(function(){
  try{
    var f={get:function(){return false;},configurable:true};
    var v={get:function(){return 'visible';},configurable:true};
    try{Object.defineProperty(document,'hidden',f);}catch(e){}
    try{Object.defineProperty(document,'webkitHidden',f);}catch(e){}
    try{Object.defineProperty(document,'visibilityState',v);}catch(e){}
    try{Object.defineProperty(document,'webkitVisibilityState',v);}catch(e){}
    try{document.hasFocus=function(){return true;};}catch(e){}
    var block=function(e){try{e.stopImmediatePropagation();}catch(_){}};
    ['visibilitychange','webkitvisibilitychange','pagehide','blur','freeze'].forEach(function(ev){
      try{document.addEventListener(ev,block,true);}catch(e){}
      try{window.addEventListener(ev,block,true);}catch(e){}
    });
    var last='';
    setInterval(function(){
      try{
        if(location.href!==last){
          last=location.href;
          if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({type:'urlChange',url:last}));
        }
      }catch(e){}
    },800);
  }catch(e){}
})();
true;
`;

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
