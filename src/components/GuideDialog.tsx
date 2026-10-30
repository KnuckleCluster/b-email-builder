'use client';

import { useState } from 'react';
import { Check, ExternalLink, LoaderCircle, MessageSquare } from 'lucide-react';
import { APP_VERSION, HTMAIL_URL } from '@/lib/links';
import { documentToHtml } from '@/lib/render';
import { useStore } from '@/lib/store';
import CopyButton from './CopyButton';

type Status = 'idle' | 'sending' | 'sent' | 'error';
const TYPES = ['Idea', 'Bug', 'Other'] as const;
const ERRORS: Record<string, string> = {
  not_configured: 'Feedback isn’t set up on this site yet. Please check back soon.',
  rate_limited: 'Too many messages in a short time. Please try again later.',
  message_too_short: 'Please write a little more so we can understand.',
  bad_email: 'That email address doesn’t look right.',
  send_failed: 'We couldn’t deliver your message. Please try again in a moment.'
};

function Feedback() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<(typeof TYPES)[number]>('Idea');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [includeDesign, setIncludeDesign] = useState(false);
  const [website, setWebsite] = useState(''); // honeypot
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'sending') return;
    if (message.trim().length < 5) return setError(ERRORS.message_too_short);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError(ERRORS.bad_email);
    setStatus('sending');
    setError('');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type, message, email, website, app: { version: APP_VERSION },
          ...(includeDesign ? { design: JSON.stringify(useStore.getState().doc) } : {})
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'send_failed');
      setStatus('sent');
      useStore.getState().notify('Thanks! Your feedback was sent.', { kind: 'success' });
    } catch (err: any) {
      setStatus('error');
      setError(ERRORS[err?.message] ?? (err instanceof TypeError ? 'Couldn’t reach the server. Check your connection and try again.' : ERRORS.send_failed));
    }
  }

  if (status === 'sent') {
    return (
      <div className="fb-sent" role="status">
        <span className="fb-check"><Check size={18} /></span>
        <div>
          <strong>Thank you!</strong>
          <p>Your feedback is on its way. We read every message.</p>
          <button className="linklike" onClick={() => { setStatus('idle'); setMessage(''); setOpen(false); }}>Send another</button>
        </div>
      </div>
    );
  }

  if (!open) {
    return <button className="btn btn-accent" onClick={() => setOpen(true)}><MessageSquare size={15} /> Send feedback</button>;
  }

  return (
    <form className="fbform" onSubmit={submit} noValidate>
      <div className="segmented" role="group" aria-label="Feedback type">
        {TYPES.map((t) => <button type="button" key={t} aria-pressed={type === t} onClick={() => setType(t)}>{t}</button>)}
      </div>
      <label className="flabel" htmlFor="fb-msg">{type === 'Bug' ? 'What went wrong?' : type === 'Idea' ? 'What would make this better?' : 'Your message'}</label>
      <textarea id="fb-msg" className="input area" rows={5} maxLength={2000} value={message} onChange={(e) => { setMessage(e.target.value); if (error) setError(''); }} autoFocus />
      <div className="fb-count">{message.length}/2000</div>
      <label className="flabel" htmlFor="fb-email">Your email <span className="opt">(optional, only if you’d like a reply)</span></label>
      <input id="fb-email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }} />
      <label className="switch fb-switch">
        <input type="checkbox" role="switch" checked={includeDesign} onChange={(e) => setIncludeDesign(e.target.checked)} />
        <span className="track" aria-hidden="true" /> Include my current email design (helps us reproduce bugs)
      </label>
      <input className="hp" tabIndex={-1} aria-hidden="true" autoComplete="off" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} />
      {error && <p className="fb-error" role="alert">{error}</p>}
      <div className="fb-actions">
        <button type="submit" className="btn btn-accent" disabled={status === 'sending'}>
          {status === 'sending' ? <><LoaderCircle size={15} className="spin" /> Sending…</> : 'Send feedback'}
        </button>
        <button type="button" className="btn btn-text" onClick={() => setOpen(false)} disabled={status === 'sending'}>Cancel</button>
      </div>
    </form>
  );
}

export default function GuideDialog() {
  return (
    <div className="guide">
      <p>Thank you for using this app, and I hope you find it very useful.</p>
      <p>
        It was originally built to be used with third-party email marketing software that lets you attach HTML templates on its own.
        Some of you may also find it a fun way to send emails directly. To do that, you can temporarily use this extension, which lets you
        insert HTML into Gmail, Outlook and Yahoo:
      </p>
      <a className="btn btn-ink" href={HTMAIL_URL} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} /> Get the HTMail extension</a>

      <ol className="steps">
        <li><span>Copy your email’s HTML.</span> <CopyButton getText={() => documentToHtml(useStore.getState().doc)} /></li>
        <li><span>Install the extension, then open a new message in Gmail, Outlook or Yahoo.</span></li>
        <li><span>Use the extension’s insert-HTML option and paste what you copied.</span></li>
      </ol>

      <p>
        Again, thank you for your interest and support. We’re always on the lookout for improvements, and if you notice something broken or
        missing, please don’t be shy and send us feedback. We’d love to hear from you!
      </p>
      <Feedback />
    </div>
  );
}
