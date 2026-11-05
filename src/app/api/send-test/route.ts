import { NextResponse } from 'next/server';
import { classifyMailError, diagnose, makeTransporter, mask, missingVars, noteSent, testCap, usedToday } from '@/lib/mail';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Sends a one-off TEST email of the current design to an address the user types, through Brevo
 * (env vars: see src/lib/mail.ts). Because it accepts any recipient it is rate limited per visitor,
 * per recipient and per day, and every test carries a visible "this is a test" banner.
 * Limits are held in memory, so on serverless they are best-effort per instance.
 * Troubleshooting: GET /api/send-test  (add DIAGNOSTICS=1, then ?check=1, to test the Brevo login).
 */

const ipHits = new Map<string, number[]>();
const rcptHits = new Map<string, number[]>();

const within = (arr: number[] | undefined, ms: number) => (arr || []).filter((t) => Date.now() - t < ms);
const clean = (v: unknown, max: number) => String(v ?? '').replace(/\u0000/g, '').trim().slice(0, max);
const json = (body: object, status = 200) => NextResponse.json(body, { status });

const BANNER =
  '<div style="background:#EEF2FF;color:#26407F;font:600 12px/1.4 Arial,Helvetica,sans-serif;text-align:center;padding:8px 12px">' +
  'This is a test email sent from Branded Email Maker. It was not sent to an audience.</div>';

function toText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|tr|h\d|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '').replace(/&nbsp;|&zwnj;/g, ' ').replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, 5000);
}

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'bad_request' }, 400); }

  // Bot trap: our form reports how long the dialog was open. Instant or missing = not a person (and never a fake success).
  if (typeof body?.elapsed !== 'number' || body.elapsed < 400) return json({ error: 'too_fast' }, 400);

  const to = clean(body?.to, 200).toLowerCase();
  const subject = clean(body?.subject, 120) || 'Untitled email';
  let html = String(body?.html ?? '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return json({ error: 'bad_email' }, 400);
  if (html.length < 20 || html.length > 400_000) return json({ error: 'bad_html' }, 400);

  if (missingVars().length) return json({ error: 'not_configured' }, 503);

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const mine = within(ipHits.get(ip), 3_600_000);
  if (mine.length >= 5) return json({ error: 'rate_limited' }, 429);
  const theirs = within(rcptHits.get(to), 86_400_000);
  if (theirs.length >= 3) return json({ error: 'recipient_limit' }, 429);
  if (usedToday() >= testCap()) return json({ error: 'busy' }, 503); // tests stop first so feedback keeps working

  html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  html = /<body[^>]*>/i.test(html) ? html.replace(/<body[^>]*>/i, (m) => m + BANNER) : BANNER + html;

  try {
    await makeTransporter().sendMail({
      from: process.env.MAIL_FROM, to, subject: `[Test] ${subject}`, html, text: toText(html),
      headers: { 'X-Mailer': 'Branded Email Maker (test)' }
    });
  } catch (e: any) {
    console.error('[send-test] failed:', e?.code, e?.responseCode, e?.message);
    const code = classifyMailError(e);
    return json({ error: code }, code === 'send_failed' ? 502 : 503);
  }

  ipHits.set(ip, [...mine, Date.now()]);
  rcptHits.set(to, [...theirs, Date.now()]);
  noteSent();
  console.log(`[send-test] delivered to ${mask(to)} (today: ${usedToday()})`);
  return json({ ok: true });
}

export async function GET(req: Request) {
  return json(await diagnose(req));
}
