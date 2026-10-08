export async function fetchJson(url, { fetchImpl = fetch, timeoutMs = 20_000, ...options } = {}) {
  const res = await fetchImpl(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${new URL(url).host} odpowiedział HTTP ${res.status} ${body.slice(0, 200)}`.trim());
  }
  return res.json();
}

export const chunk = (items, size) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, i * size + size));
