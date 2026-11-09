'use client';

import { useRef, useState } from 'react';
import { Check, Download, ExternalLink, FlaskConical, Heart, LoaderCircle, Mail, MessageSquare, Upload } from 'lucide-react';
import { APP_VERSION, HTMAIL_URL } from '@/lib/links';
import { documentToHtml } from '@/lib/render';
import { useStore } from '@/lib/store';
import { download, slug } from '@/lib/docs';
import CopyButton from './CopyButton';
import { Orbi } from './Mascot';

type Status = 'idle' | 'sending' | 'sent' | 'error';
const TYPES = ['Idea', 'Bug', 'Other'] as const;
const ERRORS: Record<string, string> = {
  not_configured: 'Feedback isn’t set up on this site yet. Please check back soon.',
  rate_limited: 'Too many messages in a short time. Please try again later.',
  too_fast: 'That was quick! Please press Send once more.',
  busy: 'Feedback is very busy right now and temporarily unavailable. Your message is still here, so please try again a little later.',
  unavailable: 'The feedback service is currently unavailable. Your message is still here, so please try again in a few minutes.',
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
  const openedAt = useRef(Date.now());
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
          type, message, email, elapsed: Date.now() - openedAt.current, app: { version: APP_VERSION },
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
  const { setDialog, notify } = useStore.getState();
  const getHtml = () => documentToHtml(useStore.getState().doc);
  return (
    <div className="gd">
      <header className="gd-hero">
        <span className="gd-blob b1" /><span className="gd-blob b2" />
        <div className="gd-hero-text">
          <span className="gd-pill">✨ Ready to send?</span>
          <h2>Get your email out the door</h2>
          <p>Pick the path that fits you. It takes about a minute.</p>
        </div>
        <div className="gd-orbi"><Orbi size={104} float /></div>
        <button className="gd-close" aria-label="Close" onClick={() => setDialog(null)}>×</button>
      </header>

      <div className="gd-body">
        <div className="gd-paths">
          <article className="gd-card c1" style={{ ['--i' as string]: 0 }}>
            <span className="gd-ico"><Upload size={20} /></span>
            <h3>Use your email platform</h3>
            <p>Download the HTML and attach it as a template in your marketing software.</p>
            <button className="btn btn-ink" onClick={() => { const d = useStore.getState().doc; download(`${slug(d.name)}.html`, documentToHtml(d, { marker: true }), 'text/html'); notify(`Downloaded ${slug(d.name)}.html`, { kind: 'success' }); }}>
              <Download size={15} /> Download HTML
            </button>
          </article>

          <article className="gd-card c2" style={{ ['--i' as string]: 1 }}>
            <span className="gd-ico"><Mail size={20} /></span>
            <h3>Send from Gmail, Outlook or Yahoo</h3>
            <p>Copy the HTML, then insert it with the HTMail extension.</p>
            <div className="gd-btns">
              <CopyButton getText={getHtml} />
              <a className="btn btn-ink" href={HTMAIL_URL} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} /> Get the extension</a>
            </div>
          </article>

          <article className="gd-card c3" style={{ ['--i' as string]: 2 }}>
            <span className="gd-ico"><FlaskConical size={20} /></span>
            <h3>Test it first</h3>
            <p>Email yourself a copy to see it in a real inbox.</p>
            <button className="btn btn-accent" onClick={() => setDialog('test')}><Mail size={15} /> Send me a test</button>
          </article>
        </div>

        <section className="gd-note">
          <div className="gd-note-label">A note from the maker</div>
          <p>Thank you for using this app, and I hope you find it <mark>very useful</mark>.</p>
          <p>
            It was originally built to work with <mark>third-party email marketing software</mark> that lets you attach HTML templates on its own.
            Some of you may also find it a fun way to <mark>send emails directly</mark>. To do that, you can <mark>temporarily use this extension</mark>,
            which lets you insert HTML into Gmail, Outlook and Yahoo.
          </p>
          <p>
            Again, thank you for your interest and support. We’re always on the lookout for improvements, and if you notice something broken or
            missing, <mark>please don’t be shy and send us feedback</mark>. We’d love to hear from you!
          </p>
        </section>

        <section className="gd-feedback">
          <div className="gd-fb-head">
            <span className="gd-heart"><Heart size={18} /></span>
            <div><strong>Found a bug or have an idea?</strong><span>We read every message.</span></div>
          </div>
          <Feedback />
        </section>
      </div>
    </div>
  );
}
