import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Unsplash's API guidelines require pinging a photo's "download_location" when someone actually uses it.
 * The browser can't do this itself (it needs the secret key), so it asks us. Only Unsplash download URLs are accepted.
 */
export async function POST(req: Request) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  const base = process.env.UNSPLASH_API_BASE || 'https://api.unsplash.com';
  try {
    const { url } = await req.json();
    if (key && typeof url === 'string' && url.startsWith(`${base}/photos/`) && url.split('?')[0].endsWith('/download')) {
      await fetch(url, { headers: { Authorization: `Client-ID ${key}`, 'Accept-Version': 'v1' } });
    }
  } catch { /* tracking must never break the editor */ }
  return new NextResponse(null, { status: 204 });
}
