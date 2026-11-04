'use client';

import { Star } from 'lucide-react';
import { useStore } from '@/lib/store';
import { resolveColor } from '@/lib/theme';

function Meter({ label, n, lo, hi }: { label: string; n: number; lo: number; hi: number }) {
  const state = n === 0 ? 'empty' : n < lo ? 'short' : n > hi ? 'long' : 'good';
  const text = state === 'empty' ? 'Not set' : state === 'short' ? 'A bit short' : state === 'long' ? 'May get cut off' : 'Looks good';
  return (
    <div className={`meter ${state}`}>
      <span className="meter-dot" />
      <strong>{label}</strong> {n} characters · {text} <span className="meter-hint">(aim for {lo}–{hi})</span>
    </div>
  );
}

/** How the email will look in an inbox list and as a phone notification. */
export default function InboxPreview() {
  const doc = useStore((s) => s.doc);
  const sender = doc.brand.companyName || 'Your Company';
  const subject = doc.subject.trim() || '(no subject)';
  const pre = doc.preheader.trim();
  const accent = resolveColor('@primary', doc.brand);
  const initial = sender.trim().charAt(0).toUpperCase() || 'E';

  return (
    <div className="inbox">
      <section className="inbox-card" aria-label="Desktop inbox preview">
        <h3>Inbox</h3>
        <div className="inbox-row unread">
          <span className="inbox-check" />
          <Star size={15} className="inbox-star" />
          <strong className="inbox-sender">{sender}</strong>
          <span className="inbox-text"><strong>{subject}</strong>{pre ? <span> – {pre}</span> : <span className="faint"> – Add a preheader to control this text</span>}</span>
          <span className="inbox-time">9:41 AM</span>
        </div>
        <div className="inbox-row ghost"><span className="inbox-check" /><Star size={15} className="inbox-star" /><span className="bar w1" /><span className="bar w2" /><span className="inbox-time">Yesterday</span></div>
        <div className="inbox-row ghost"><span className="inbox-check" /><Star size={15} className="inbox-star" /><span className="bar w3" /><span className="bar w1" /><span className="inbox-time">Mon</span></div>
      </section>

      <section className="inbox-card phone" aria-label="Phone notification preview">
        <h3>On a phone</h3>
        <div className="notif">
          <span className="notif-icon" style={{ background: accent }}>{initial}</span>
          <div className="notif-body">
            <div className="notif-top"><strong>{sender}</strong><span>now</span></div>
            <div className="notif-subject">{subject}</div>
            <div className="notif-pre">{pre || 'Add a preheader to control this preview line.'}</div>
          </div>
        </div>
      </section>

      <div className="meters">
        <Meter label="Subject" n={doc.subject.trim().length} lo={30} hi={60} />
        <Meter label="Preheader" n={pre.length} lo={40} hi={100} />
      </div>
      <p className="inbox-note">Set both in <strong>Email settings</strong> (click the empty canvas). Inbox apps show roughly this much, and the exact cut-off varies by app and screen width.</p>
    </div>
  );
}
