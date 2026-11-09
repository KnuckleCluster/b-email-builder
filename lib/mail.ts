import nodemailer from 'nodemailer';

/**
 * Shared Brevo SMTP helpers for the two API routes (feedback + send-test). Server-side only.
 * Everything is configured through environment variables; nothing secret lives in the repo:
 *   BREVO_SMTP_USER  SMTP login from Brevo > SMTP & API > SMTP (looks like xxxx@smtp-brevo.com)
 *   BREVO_SMTP_KEY   an SMTP key from the same page
 *   MAIL_FROM        a sender verified in Brevo, e.g.  Email Maker <you@yourdomain.com>
 *   FEEDBACK_TO      (optional) where feedback arrives; defaults to the MAIL_FROM address
 */

export const REQUIRED = ['BREVO_SMTP_USER', 'BREVO_SMTP_KEY', 'MAIL_FROM'] as const;

export const missingVars = () => REQUIRED.filter((k) => !process.env[k]);
export const fromAddress = (from: string) => (from.match(/<([^>]+)>/)?.[1] || from).trim();
export const feedbackTo = () => (process.env.FEEDBACK_TO || fromAddress(process.env.MAIL_FROM || '')).trim();
export const mask = (email: string) => email.replace(/^(.).*(@.*)$/, '$1***$2');

export function makeTransporter() {
  const env = process.env;
  return nodemailer.createTransport({
    host: env.SMTP_HOST || 'smtp-relay.brevo.com',
    port: Number(env.SMTP_PORT || 587),
    secure: env.SMTP_SECURE === 'true',
    auth: { user: env.BREVO_SMTP_USER, pass: env.BREVO_SMTP_KEY },
    connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 15000
  });
}

/* ---- shared daily budget (Brevo free tier = 300/day). Held in memory: best-effort on serverless. ---- */
let day = { key: '', count: 0 };
const todayKey = () => new Date().toISOString().slice(0, 10);
export function usedToday() {
  if (day.key !== todayKey()) day = { key: todayKey(), count: 0 };
  return day.count;
}
export const noteSent = () => { usedToday(); day.count += 1; return day.count; };
/** Tests stop first, so feedback always has headroom. */
export const testCap = () => Number(process.env.TEST_EMAIL_DAILY_CAP || 250);
export const hardCap = () => Number(process.env.EMAIL_DAILY_HARD_CAP || 290);

/** Turn a nodemailer/SMTP failure into a friendly error code for the UI. */
export function classifyMailError(e: any): 'busy' | 'unavailable' | 'send_failed' {
  const msg = String(e?.message || '');
  const code = String(e?.code || '');
  if (/limit|quota|too many|rate|exceed/i.test(msg) || (e?.responseCode >= 400 && e?.responseCode < 500)) return 'busy';
  if (['ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'ECONNREFUSED', 'EDNS', 'EAUTH'].includes(code)) return 'unavailable';
  return 'send_failed';
}

/** GET handler body for troubleshooting. Names only, never secret values. */
export async function diagnose(req: Request) {
  const env = process.env;
  const missing = missingVars();
  const base = {
    provider: missing.length ? null : 'brevo',
    configured: missing.length === 0,
    missing,
    hint: missing.length ? 'Add the missing variables in Vercel > Settings > Environment Variables, then redeploy.' : 'All required settings are present.'
  };
  if (env.DIAGNOSTICS !== '1' || missing.length) return base;
  const details = {
    host: env.SMTP_HOST || 'smtp-relay.brevo.com',
    port: Number(env.SMTP_PORT || 587),
    smtpUserDomain: env.BREVO_SMTP_USER!.includes('@') ? env.BREVO_SMTP_USER!.split('@')[1] : '(no @ in user: check this is the SMTP login)',
    sendingAs: mask(fromAddress(env.MAIL_FROM!)),
    feedbackGoesTo: mask(feedbackTo()),
    sentTodayOnThisInstance: usedToday()
  };
  if (new URL(req.url).searchParams.get('check') !== '1') return { ...base, ...details };
  try {
    await makeTransporter().verify();
    return { ...base, ...details, smtp: 'login ok' };
  } catch (e: any) {
    return { ...base, ...details, smtp: 'failed', code: e?.code, responseCode: e?.responseCode, message: String(e?.message || '').slice(0, 220) };
  }
}
