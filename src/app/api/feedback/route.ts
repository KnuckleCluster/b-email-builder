import { NextResponse } from 'next/server';
import { classifyMailError, diagnose, feedbackTo, hardCap, makeTransporter, mask, missingVars, noteSent, usedToday } from '@/lib/mail';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Feedback from the app is emailed to you through Brevo (see src/lib/mail.ts for the env vars).
 * It runs entirely on Vercel + Brevo: nothing depends on your own computer being on.
 * Troubleshooting: GET /api/feedback  (add DIAGNOSTICS=1 to see where it goes; ?check=1 tests the login).
 */

const TYPES = ['Bug', 'Idea', 'Other'];
const hits = new Map<string, number[]>();

/** Tiny per-instance rate limit: 5 messages / hour / IP. (Best-effort on serverless.) */
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 3_600_000);
  if (recent.length >= 5) { hits.set(ip, recent); return true; }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

const clean = (v: unknown, max: number) => String(v ?? '').replace(/\u0000/g, '').trim().slice(0, max);
const json = (body: object, status = 200) => NextResponse.json(body, { status });

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'bad_request' }, 400); }

  // Bot trap: our form reports how long it was open. Instant or missing = not a person (and never a fake success).
  if (typeof body?.elapsed !== 'number' || body.elapsed < 400) return json({ error: 'too_fast' }, 400);

  const type = TYPES.includes(body?.type) ? body.type : 'Other';
  const message = clean(body?.message, 2000);
  const email = clean(body?.email, 200);
  if (message.length < 5) return json({ error: 'message_too_short' }, 400);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'bad_email' }, 400);

  if (missingVars().length) return json({ error: 'not_configured' }, 503);

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  if (limited(ip)) return json({ error: 'rate_limited' }, 429);
  if (usedToday() >= hardCap()) return json({ error: 'busy' }, 503);

  const ua = req.headers.get('user-agent') ?? '';
  const version = clean(body?.app?.version, 20);
  const design = body?.design ? String(body.design).slice(0, 200_000) : '';
  const subject = `[Email Maker] ${type}: ${message.replace(/\s+/g, ' ').slice(0, 60)}`;
  const text = [
    `Type: ${type}`,
    `From: ${email || '(no email given)'}`,
    `App version: ${version || 'unknown'}`,
    `Browser: ${ua}`,
    design ? 'Design: attached (design.json). Import it via the app to see exactly what they had.' : '',
    '',
    message
  ].filter((l, i) => l !== '' || i > 3).join('\n');

  try {
    await makeTransporter().sendMail({
      from: process.env.MAIL_FROM,
      to: feedbackTo(),
      ...(email ? { replyTo: email } : {}),
      subject,
      text,
      ...(design ? { attachments: [{ filename: 'design.json', content: JSON.stringify({ srmail: 2, doc: safeParse(design) }, null, 2), contentType: 'application/json' }] } : {})
    });
  } catch (e: any) {
    console.error('[feedback] failed:', e?.code, e?.responseCode, e?.message);
    const code = classifyMailError(e);
    return json({ error: code }, code === 'send_failed' ? 502 : 503);
  }

  noteSent();
  console.log(`[feedback] delivered to ${mask(feedbackTo())} (today: ${usedToday()})`);
  return json({ ok: true });
}

function safeParse(s: string) { try { return JSON.parse(s); } catch { return null; } }

export async function GET(req: Request) {
  return json(await diagnose(req));
}
