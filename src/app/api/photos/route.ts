import { NextResponse } from 'next/server';
import { searchStock, stockToPhoto } from '@/lib/stock';
import type { Photo } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Photo search for the in-app picker. Providers are tried in this order and the first that answers wins:
 *   1. Unsplash  (UNSPLASH_ACCESS_KEY, free: unsplash.com/developers)  - hotlinked, attributed, download-tracked
 *   2. Pexels    (PEXELS_API_KEY, optional; Pexels has paused new keys)
 *   3. Built-in hand-picked collection (always works, no key)
 * Keys stay on the server. Responses are cached so a small hourly quota goes a long way.
 * Optional (for testing): UNSPLASH_API_BASE, PEXELS_API_BASE.
 */

const hits = new Map<string, number[]>();
const json = (body: object, status = 200) => NextResponse.json(body, { status });
const UTM = 'utm_source=branded_email_maker&utm_medium=referral';

function curated(q: string, extra: object = {}) {
  return json({ source: 'curated', photos: searchStock(q).map(stockToPhoto), hasMore: false, page: 1, ...extra });
}

type Found = { photos: Photo[]; hasMore: boolean } | { limited: true } | null;

async function fromUnsplash(q: string, page: number, key: string): Promise<Found> {
  const base = process.env.UNSPLASH_API_BASE || 'https://api.unsplash.com';
  const url = q
    ? `${base}/search/photos?query=${encodeURIComponent(q)}&page=${page}&per_page=24&content_filter=high`
    : `${base}/photos?page=${page}&per_page=24&order_by=popular`;
  const r = await fetch(url, { headers: { Authorization: `Client-ID ${key}`, 'Accept-Version': 'v1' }, next: { revalidate: 21600 } });
  if (r.status === 403 || r.status === 429) return { limited: true };
  if (!r.ok) { console.error('[photos] unsplash responded', r.status); return null; }
  const d: any = await r.json();
  const list: any[] = q ? d.results || [] : d || [];
  const photos: Photo[] = list.map((p) => {
    const raw: string = p.urls?.raw || p.urls?.regular || '';
    return {
      id: p.id,
      thumb: p.urls?.small || p.urls?.thumb,
      // keep the ixid param Unsplash puts in raw URLs (their guideline), then size it for email
      url: raw.includes('?') ? `${raw}&auto=format&fit=max&w=1200&q=80` : `${raw}?auto=format&fit=max&w=1200&q=80`,
      alt: p.alt_description || p.description || `Photo by ${p.user?.name}`,
      credit: p.user?.name,
      creditUrl: p.user?.links?.html ? `${p.user.links.html}?${UTM}` : `https://unsplash.com/?${UTM}`,
      track: p.links?.download_location
    };
  }).filter((p) => p.thumb && p.url);
  return { photos, hasMore: q ? page < (d.total_pages || 1) : list.length === 24 };
}

async function fromPexels(q: string, page: number, key: string): Promise<Found> {
  const base = process.env.PEXELS_API_BASE || 'https://api.pexels.com/v1';
  const endpoint = q ? `/search?query=${encodeURIComponent(q)}&per_page=24&page=${page}` : `/curated?per_page=24&page=${page}`;
  const r = await fetch(base + endpoint, { headers: { Authorization: key }, next: { revalidate: 3600 } });
  if (r.status === 429) return { limited: true };
  if (!r.ok) { console.error('[photos] pexels responded', r.status); return null; }
  const d: any = await r.json();
  const photos: Photo[] = (d.photos || []).map((p: any) => ({
    id: String(p.id), thumb: p.src?.medium || p.src?.small, url: p.src?.large || p.src?.original,
    alt: p.alt || `Photo by ${p.photographer}`, credit: p.photographer, creditUrl: p.photographer_url
  })).filter((p: Photo) => p.thumb && p.url);
  return { photos, hasMore: !!d.next_page };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim().slice(0, 60);
  const page = Math.min(20, Math.max(1, Number(url.searchParams.get('page')) || 1));

  // 120 lookups / hour / visitor keeps one person from burning the shared quota
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const recent = (hits.get(ip) || []).filter((t) => Date.now() - t < 3_600_000);
  if (recent.length >= 120) return curated(q, { notice: 'busy' });
  hits.set(ip, [...recent, Date.now()]);

  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
  const pexelsKey = process.env.PEXELS_API_KEY;
  if (!unsplashKey && !pexelsKey) return curated(q, { configured: false });

  let notice = '';
  const providers: [string, string | undefined, typeof fromUnsplash][] = [
    ['unsplash', unsplashKey, fromUnsplash], ['pexels', pexelsKey, fromPexels]
  ];
  for (const [name, key, fn] of providers) {
    if (!key) continue;
    try {
      const found = await fn(q, page, key);
      if (found && 'photos' in found) return json({ source: name, configured: true, photos: found.photos, hasMore: found.hasMore, page });
      notice = found && 'limited' in found ? 'busy' : 'unavailable';
    } catch (e) {
      console.error(`[photos] ${name} failed:`, e);
      notice = 'unavailable';
    }
  }
  return curated(q, { notice });
}
