const SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';

export const youtubeSearchUrl = (title) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} Nintendo Switch gameplay`)}`;

// Jedno wyszukiwanie kosztuje 100 jednostek z dziennego limitu 10 000 w YouTube Data API,
// dlatego wynik dla każdej gry jest zapisywany i nie jest pobierany ponownie.
export async function findGameplayVideo(title, { apiKey, fetchImpl = fetch }) {
  const params = new URLSearchParams({
    part: 'snippet',
    q: `${title} Nintendo Switch gameplay`,
    type: 'video',
    videoEmbeddable: 'true',
    maxResults: '1',
    key: apiKey,
  });
  const res = await fetchImpl(`${SEARCH_URL}?${params}`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`YouTube API odpowiedziało HTTP ${res.status}`);

  const item = (await res.json()).items?.[0];
  if (!item) return null;
  return {
    id: item.id.videoId,
    title: item.snippet.title,
    channel: item.snippet.channelTitle,
    thumbnail: item.snippet.thumbnails?.high?.url ?? item.snippet.thumbnails?.default?.url ?? null,
  };
}
