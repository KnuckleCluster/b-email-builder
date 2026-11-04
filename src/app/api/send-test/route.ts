import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Sends a one-off TEST email of the current design to an address the user types.
 * Credentials come from environment variables (never from the browser or the repo):
 *   BREVO_SMTP_USER  SMTP login shown in Brevo > SMTP & API > SMTP
 *   BREVO_SMTP_KEY   an SMTP key from the same page
 *   MAIL_FROM        a sender verified in Brevo, e.g.  Email Maker <you@yourdomain.com>
 * Optional: SMTP_HOST, SMTP_PORT, SMTP_SECURE (defaults target Brevo), TEST_EMAIL_DAILY_CAP (default 250).
 *
 * Because this accepts any recipient, it is rate limited per visitor, per recipient and per day,
 * and every test carries a visible "this is a test" banner. Limits are held in memory, so on serverless
 * they are best-effort per instance; use Upstash Redis (free) if you need hard guarantees.
 */

const ipHits = new Map<string, number[]>();
const rcptHits = new Map<string, number[]>();
let day = { key: '', count: 0 };

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
  if (body?.website) return json({ ok: true }); // honeypot

  const to = clean(body?.to, 200).toLowerCase();
  const subject = clean(body?.subject, 120) || 'Untitled email';
  let html = String(body?.html ?? '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return json({ error: 'bad_email' }, 400);
  if (html.length < 20 || html.length > 400_000) return json({ error: 'bad_html' }, 400);

  const env = process.env;
  if (!env.BREVO_SMTP_USER || !env.BREVO_SMTP_KEY || !env.MAIL_FROM) return json({ error: 'not_configured' }, 503);

  // limits
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const mine = within(ipHits.get(ip), 3_600_000);
  if (mine.length >= 5) return json({ error: 'rate_limited' }, 429);
  const theirs = within(rcptHits.get(to), 86_400_000);
  if (theirs.length >= 3) return json({ error: 'recipient_limit' }, 429);
  const today = new Date().toISOString().slice(0, 10);
  if (day.key !== today) day = { key: today, count: 0 };
  if (day.count >= Number(env.TEST_EMAIL_DAILY_CAP || 250)) return json({ error: 'busy' }, 503);

  html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  html = /<body[^>]*>/i.test(html) ? html.replace(/<body[^>]*>/i, (m) => m + BANNER) : BANNER + html;

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST || 'smtp-relay.brevo.com',
    port: Number(env.SMTP_PORT || 587),
    secure: env.SMTP_SECURE === 'true',
    auth: { user: env.BREVO_SMTP_USER, pass: env.BREVO_SMTP_KEY },
    connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 15000
  });

  try {
    await transporter.sendMail({
      from: env.MAIL_FROM, to, subject: `[Test] ${subject}`, html, text: toText(html),
      headers: { 'X-Mailer': 'Branded Email Maker (test)' }
    });
  } catch (e: any) {
    console.error('send-test failed:', e?.code, e?.responseCode, e?.message);
    const msg = String(e?.message || '');
    const code = String(e?.code || '');
    if (/limit|quota|too many|rate|exceed/i.test(msg) || (e?.responseCode >= 400 && e?.responseCode < 500)) return json({ error: 'busy' }, 503);
    if (['ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'ECONNREFUSED', 'EDNS', 'EAUTH'].includes(code)) return json({ error: 'unavailable' }, 503);
    return json({ error: 'send_failed' }, 502);
  }

  ipHits.set(ip, [...mine, Date.now()]);
  rcptHits.set(to, [...theirs, Date.now()]);
  day.count += 1;
  return json({ ok: true });
}
