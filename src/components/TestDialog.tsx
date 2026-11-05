'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Clock, LoaderCircle, Mail, TriangleAlert } from 'lucide-react';
import { documentToHtml } from '@/lib/render';
import { useStore } from '@/lib/store';
import { Confetti } from './Mascot';
import CopyButton from './CopyButton';

type Status = 'idle' | 'sending' | 'sent' | 'error';
const KEY = 'srmail:testTo';

const MESSAGES: Record<string, { title: string; text: string; soft?: boolean }> = {
  busy: { title: 'We’re having a busy moment', text: 'Test emails are very popular right now, so this service is temporarily unavailable. Please try again a little later.', soft: true },
  unavailable: { title: 'Service is currently unavailable', text: 'We can’t reach the test email service at the moment. Please try again in a few minutes.', soft: true },
  not_configured: { title: 'Test emails aren’t switched on here yet', text: 'This site hasn’t been set up to send test emails. You can still copy or download the HTML below.', soft: true },
  rate_limited: { title: 'Easy there, speedy', text: 'You’ve sent a few tests already. Take a short break and try again in about an hour.' },
  recipient_limit: { title: 'That inbox has had plenty today', text: 'That address already received several tests today. Try another address, or come back tomorrow.' },
  bad_email: { title: 'Check that email address', text: 'That doesn’t look like a valid address. Mind taking another look?' },
  too_fast: { title: 'That was quick!', text: 'Please press Send once more.' },
  bad_html: { title: 'This email is too large to test', text: 'Try removing a few blocks, then send again.' },
  send_failed: { title: 'That didn’t go through', text: 'Something went wrong while sending. Please try again.' },
  network: { title: 'Couldn’t reach the server', text: 'Check your connection and try again.', soft: true }
};

export default function TestDialog() {
  const doc = useStore((s) => s.doc);
  const [to, setTo] = useState('');
  const openedAt = useRef(Date.now());
  const [status, setStatus] = useState<Status>('idle');
  const [err, setErr] = useState<string>('');

  useEffect(() => { try { setTo(localStorage.getItem(KEY) || ''); } catch { /* ignore */ } }, []);

  const subject = doc.subject.trim() || doc.name || 'Untitled email';

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'sending') return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim())) { setStatus('error'); setErr('bad_email'); return; }
    setStatus('sending'); setErr('');
    try { localStorage.setItem(KEY, to.trim()); } catch { /* ignore */ }
    try {
      const res = await fetch('/api/send-test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: to.trim(), subject, elapsed: Date.now() - openedAt.current, html: documentToHtml(useStore.getState().doc) })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'send_failed');
      setStatus('sent');
    } catch (ex: any) {
      setStatus('error');
      setErr(MESSAGES[ex?.message] ? ex.message : ex instanceof TypeError ? 'network' : 'send_failed');
    }
  }

  if (status === 'sent') {
    return (
      <div className="td-sent">
        <Confetti fire count={34} />
        <span className="td-bigcheck"><Check size={30} /></span>
        <h3>On its way!</h3>
        <p>A test of <strong>“{subject}”</strong> is heading to <strong>{to.trim()}</strong>. It usually lands in under a minute. If you don’t see it, check spam or promotions.</p>
        <div className="td-actions">
          <button className="btn btn-accent" onClick={() => useStore.getState().setDialog(null)}>Back to editing</button>
          <button className="btn btn-text" onClick={() => setStatus('idle')}>Send another</button>
        </div>
      </div>
    );
  }

  const m = err ? MESSAGES[err] : null;
  return (
    <form className="td" onSubmit={send} noValidate>
      <div className="td-head">
        <span className="td-ico"><Mail size={22} /></span>
        <div>
          <h3>Send yourself a test</h3>
          <p>See exactly how it lands in a real inbox before it goes anywhere else.</p>
        </div>
      </div>

      <div className="td-subject"><span>Subject</span><strong>[Test] {subject}</strong></div>

      <label className="flabel" htmlFor="td-to">Send it to</label>
      <input id="td-to" className="input" type="email" autoComplete="email" placeholder="you@example.com" value={to} autoFocus
        onChange={(e) => { setTo(e.target.value); if (status === 'error') { setStatus('idle'); setErr(''); } }} />

      {m && (
        <div className={`td-msg ${m.soft ? 'soft' : ''}`} role="alert">
          {m.soft ? <Clock size={18} /> : <TriangleAlert size={18} />}
          <div>
            <strong>{m.title}</strong>
            <p>{m.text}</p>
            {m.soft && err !== 'not_configured' && <button type="button" className="linklike" onClick={() => { setStatus('idle'); setErr(''); }}>Dismiss</button>}
            {m.soft && <div className="td-fallback"><span>Meanwhile:</span> <CopyButton getText={() => documentToHtml(useStore.getState().doc)} label="Copy HTML" /></div>}
          </div>
        </div>
      )}

      <div className="td-actions">
        <button type="submit" className="btn btn-accent td-send" disabled={status === 'sending'}>
          {status === 'sending' ? <><LoaderCircle size={16} className="spin" /> Sending…</> : <><Mail size={16} /> Send test</>}
        </button>
        <button type="button" className="btn btn-text" onClick={() => useStore.getState().setDialog(null)}>Cancel</button>
      </div>
      <p className="td-fine">Sent from a shared address with a small “this is a test” banner at the top. Limited to a few tests per hour.</p>
    </form>
  );
}
