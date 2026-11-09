import { NextResponse } from 'next/server';
import { searchStock, stockToPhoto } from '@/lib/stock';
import type { Photo } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Photo search for the in-app picker.
 *  - With PEXELS_API_KEY set (free at pexels.com/api): live search of Pexels, cached for an hour so we stay inside
 *    Pexels' free limits. The key stays on the server.
 *  - Without a key, or if Pexels is busy/down: falls back to the built-in hand-picked collection, so the picker
 *    always works.
 * Optional: PEXELS_API_BASE (for testing).
 */

const hits = new Map<string, number[]>();
const json = (body: object, status = 200) => NextResponse.json(body, { status });

function curated(q: string, extra: object = {}) {
  const photos = searchStock(q).map(stockToPhoto);
  return json({ source: 'curated', photos, hasMore: false, page: 1, ...extra });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim().slice(0, 60);
  const page = Math.min(20, Math.max(1, Number(url.searchParams.get('page')) || 1));

  // 120 lookups / hour / visitor keeps one person from burning the shared Pexels quota
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const recent = (hits.get(ip) || []).filter((t) => Date.now() - t < 3_600_000);
  if (recent.length >= 120) return curated(q, { notice: 'busy' });
  hits.set(ip, [...recent, Date.now()]);

  const key = process.env.PEXELS_API_KEY;
  if (!key) return curated(q, { configured: false });

  const base = process.env.PEXELS_API_BASE || 'https://api.pexels.com/v1';
  const endpoint = q ? `/search?query=${encodeURIComponent(q)}&per_page=24&page=${page}` : `/curated?per_page=24&page=${page}`;
  try {
    const r = await fetch(base + endpoint, { headers: { Authorization: key }, next: { revalidate: 3600 } });
    if (!r.ok) {
      console.error('[photos] pexels responded', r.status);
      return curated(q, { notice: r.status === 429 ? 'busy' : 'unavailable' });
    }
    const data: any = await r.json();
    const photos: Photo[] = (data.photos || []).map((p: any) => ({
      id: String(p.id),
      thumb: p.src?.medium || p.src?.small,
      url: p.src?.large || p.src?.original,
      alt: p.alt || `Photo by ${p.photographer}`,
      credit: p.photographer,
      creditUrl: p.photographer_url
    })).filter((p: Photo) => p.thumb && p.url);
    return json({ source: 'pexels', configured: true, photos, hasMore: !!data.next_page, page });
  } catch (e) {
    console.error('[photos] failed:', e);
    return curated(q, { notice: 'unavailable' });
  }
}
