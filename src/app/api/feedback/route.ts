import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Receives feedback from the app and forwards it to ONE provider, chosen by env vars
 * (checked in this order): FEEDBACK_WEBHOOK_URL (e.g. n8n), RESEND_API_KEY + FEEDBACK_TO, WEB3FORMS_KEY.
 * Keys stay on the server. See .env.example.
 */

const TYPES = ['Bug', 'Idea', 'Other'];
const hits = new Map<string, number[]>();

/** Tiny per-instance rate limit: 5 messages / hour / IP. (On serverless this is best-effort.) */
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

  if (body?.website) return json({ ok: true }); // honeypot: bots fill hidden fields

  const type = TYPES.includes(body?.type) ? body.type : 'Other';
  const message = clean(body?.message, 2000);
  const email = clean(body?.email, 200);
  if (message.length < 5) return json({ error: 'message_too_short' }, 400);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'bad_email' }, 400);

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  if (limited(ip)) return json({ error: 'rate_limited' }, 429);

  const ua = req.headers.get('user-agent') ?? '';
  const version = clean(body?.app?.version, 20);
  const design = body?.design ? clean(body.design, 30_000) : '';
  const subject = `[Email Maker] ${type}: ${message.replace(/\s+/g, ' ').slice(0, 60)}`;
  const text = [
    `Type: ${type}`,
    `From: ${email || '(no email given)'}`,
    `App version: ${version || 'unknown'}`,
    `Browser: ${ua}`,
    '',
    message,
    design ? `\n--- email design (opt-in, truncated to 30k chars) ---\n${design}` : ''
  ].join('\n');

  const env = process.env;
  try {
    if (env.FEEDBACK_WEBHOOK_URL) {
      const r = await fetch(env.FEEDBACK_WEBHOOK_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, type, message, email, version, userAgent: ua, design, text })
      });
      if (!r.ok) throw new Error(`webhook ${r.status}`);
    } else if (env.RESEND_API_KEY && env.FEEDBACK_TO) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: env.FEEDBACK_FROM || 'Email Maker <onboarding@resend.dev>',
          to: [env.FEEDBACK_TO], subject, text, ...(email ? { reply_to: email } : {})
        })
      });
      if (!r.ok) throw new Error(`resend ${r.status}`);
    } else if (env.WEB3FORMS_KEY) {
      const r = await fetch('https://api.web3forms.com/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ access_key: env.WEB3FORMS_KEY, subject, from_name: 'Email Maker feedback', ...(email ? { email } : {}), message: text })
      });
      const j: any = await r.json().catch(() => ({}));
      if (!r.ok || j.success === false) throw new Error(`web3forms ${r.status}`);
    } else {
      return json({ error: 'not_configured' }, 503);
    }
  } catch (e) {
    console.error('feedback failed:', e);
    return json({ error: 'send_failed' }, 502);
  }
  return json({ ok: true });
}
