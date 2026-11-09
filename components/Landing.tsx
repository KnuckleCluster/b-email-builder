'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowRight, Bookmark, Check, Coffee, Download, Image as ImageIcon, Inbox, Layers, Mail, PenLine, Plus, Shapes, Smartphone
} from 'lucide-react';
import { TEMPLATES } from '@/lib/templates';
import { listDocs } from '@/lib/storage';
import type { DocMeta } from '@/lib/types';
import TemplateThumb from './TemplateThumb';
import { Orbi } from './Mascot';

const STEPS = [
  { icon: Layers, title: 'Pick a starting point', text: 'Choose a template with its own colors and photos, or start from a blank canvas.' },
  { icon: PenLine, title: 'Drag, drop and edit', text: 'Rearrange sections, click to type, drop in photos and shapes, and set your brand once.' },
  { icon: Mail, title: 'Test it, then send it', text: 'Preview on desktop, phone and inbox, email yourself a test, then export the HTML.' }
];

const FEATURES = [
  { icon: Layers, title: 'Sections, rows and columns', text: 'Build layouts the way you think: stack sections, split rows into columns, drag anything anywhere.' },
  { icon: Shapes, title: 'Shapes that sit behind', text: 'Circles, rings and patterns that bleed off the edges without ever changing your layout.' },
  { icon: Smartphone, title: 'Separate mobile layouts', text: 'Hide, rearrange or restyle blocks for phones only, with the desktop version untouched.' },
  { icon: ImageIcon, title: 'Free photos built in', text: 'Search free-to-use photos and drop them straight in. Google Drive links are fixed automatically.' },
  { icon: Inbox, title: 'Inbox preview', text: 'See your subject and preheader exactly as they will look in an inbox and on a phone.' },
  { icon: Mail, title: 'Send yourself a test', text: 'Email a copy to your own inbox before anything goes out to your audience.' },
  { icon: Bookmark, title: 'Save your best sections', text: 'Keep favourite sections and reuse them across emails in one click.' },
  { icon: Download, title: 'Export anywhere', text: 'Download clean HTML for your email platform, or copy it into Gmail, Outlook and Yahoo.' }
];

const FAQ = [
  { q: 'Is it really free?', a: 'Yes. You can build, preview, test and export emails without paying or creating an account.' },
  { q: 'Where are my emails saved?', a: 'In your own browser, automatically. Nothing is stored on our servers. Use Export to keep a backup file, and you can re-import it later to keep editing. Clearing your browser data removes saved emails, so back up the ones you care about.' },
  { q: 'How do I send the finished email?', a: 'If your email platform lets you attach HTML templates, download the HTML and upload it there. To send from Gmail, Outlook or Yahoo, copy the HTML and insert it with a browser extension like HTMail. The “How to send” button in the editor walks you through both.' },
  { q: 'Will it look right in Outlook?', a: 'Layouts are built with email-safe tables, so they hold up well. Outlook for desktop is the fussy one: it ignores a few modern touches, so shapes appear as plain colors and phone-specific layouts fall back to the desktop version. Send yourself a test to check.' },
  { q: 'Can I use my own images?', a: 'Yes. Paste any image link. Google Drive, Dropbox and Imgur links are converted to working image links for you. You can also search the built-in free photo library.' },
  { q: 'What is the “Made with” badge?', a: 'A small gradient badge at the bottom of exported emails. It’s on by default and you can switch it off in Email settings at any time.' },
  { q: 'What happens to my test emails and feedback?', a: 'They’re sent through a mail service so they can reach an inbox, and we only use the address you type to deliver that one message. Your designs themselves stay in your browser unless you choose to include one with feedback.' }
];

const ago = (ts: number) => {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(ts).toLocaleDateString();
};

export default function Landing() {
  const [recent, setRecent] = useState<DocMeta[]>([]);
  useEffect(() => { setRecent(listDocs().slice(0, 5)); }, []);
  const coffee = process.env.NEXT_PUBLIC_BUYMEACOFFEE_URL;
  const showcase = TEMPLATES.filter((t) => t.id !== 'blank').slice(0, 6);
  const hero = TEMPLATES.find((t) => t.id === 'launch') ?? TEMPLATES[1];

  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="lp-wrap lp-nav-in">
          <Link href="/" className="brand">
            <svg className="logo-mark" width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <circle cx="16" cy="16" r="9" fill="#0F1A2E" /><ellipse cx="16" cy="16" rx="14" ry="5.5" transform="rotate(-24 16 16)" stroke="#2E5BFF" strokeWidth="2.2" />
            </svg>
            Branded Email Maker
          </Link>
          <nav className="lp-links" aria-label="Page sections">
            <a href="#how">How it works</a><a href="#features">Features</a><a href="#templates">Templates</a><a href="#faq">FAQ</a>
          </nav>
          <Link className="btn btn-ink" href="/editor">Open editor <ArrowRight size={15} /></Link>
        </div>
      </header>

      <section className="lp-hero">
        <div className="lp-wrap lp-hero-grid">
          <div className="lp-hero-copy">
            <span className="lp-pill">✨ Free to use · No account needed</span>
            <h1>Branded emails, <span className="lp-grad">built by dragging.</span></h1>
            <p>Design responsive HTML emails with sections, shapes and ready-made templates. No code, no sign-up. Export it anywhere.</p>
            <div className="lp-cta">
              <Link className="btn btn-accent btn-xl" href="/editor?templates=1">Start building <ArrowRight size={17} /></Link>
              <a className="btn btn-xl" href="#templates">Browse templates</a>
            </div>
            <ul className="lp-checks">
              <li><Check size={15} /> Mobile layouts built in</li>
              <li><Check size={15} /> Free photos included</li>
              <li><Check size={15} /> Works with Gmail and your email platform</li>
            </ul>
          </div>
          <div className="lp-hero-art" aria-hidden="true">
            <span className="lp-blob a" /><span className="lp-blob b" />
            <div className="lp-device"><TemplateThumb t={hero} width={300} height={430} /></div>
            <div className="lp-orbi"><Orbi size={96} float /></div>
            <span className="lp-chip c1">🎨 Your brand colors</span>
            <span className="lp-chip c2">📱 Phone-ready</span>
          </div>
        </div>
      </section>

      <section id="how" className="lp-section">
        <div className="lp-wrap">
          <h2>From idea to inbox in three steps</h2>
          <div className="lp-steps">
            {STEPS.map((s, i) => (
              <article key={s.title} className="lp-step">
                <span className="lp-step-n">{i + 1}</span>
                <span className="lp-step-ico"><s.icon size={22} /></span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="lp-section alt">
        <div className="lp-wrap">
          <h2>Everything you need, nothing you don’t</h2>
          <div className="lp-features">
            {FEATURES.map((f) => (
              <article key={f.title} className="lp-feature">
                <span className="lp-feat-ico"><f.icon size={20} /></span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="templates" className="lp-section">
        <div className="lp-wrap">
          <div className="lp-head-row">
            <div><h2>Start from a template</h2><p className="lp-sub">Each one has its own palette, photos and layout. Click to open it in the editor.</p></div>
            <Link className="btn" href="/editor?templates=1">See all templates <ArrowRight size={15} /></Link>
          </div>
          <div className="lp-tpls">
            {showcase.map((t) => (
              <Link key={t.id} href={`/editor?new=${t.id}`} className="lp-tpl">
                <TemplateThumb t={t} width={264} height={360} />
                <div className="lp-tpl-meta"><strong>{t.label}</strong><span>{t.category}</span></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="projects" className="lp-section alt">
        <div className="lp-wrap">
          <div className="lp-head-row">
            <div><h2>Your projects</h2><p className="lp-sub">Saved in this browser. Pick up right where you left off.</p></div>
            <Link className="btn btn-accent" href="/editor?templates=1"><Plus size={15} /> New project</Link>
          </div>
          {recent.length === 0 ? (
            <div className="lp-empty">
              <Orbi size={84} float />
              <strong>Nothing here yet</strong>
              <span>Your emails will show up here as soon as you start one.</span>
              <Link className="btn btn-accent" href="/editor?templates=1">Create your first email</Link>
            </div>
          ) : (
            <div className="lp-projects">
              {recent.map((d) => (
                <Link key={d.id} href={`/editor?open=${d.id}`} className="lp-proj">
                  <span className="lp-proj-ico"><Mail size={18} /></span>
                  <strong>{d.name || 'Untitled'}</strong>
                  <span>{d.blocks} section{d.blocks === 1 ? '' : 's'} · edited {ago(d.updatedAt)}</span>
                  <em>Open <ArrowRight size={13} /></em>
                </Link>
              ))}
              <Link href="/editor?templates=1" className="lp-proj new"><Plus size={22} /><strong>New project</strong><span>Start from a template</span></Link>
            </div>
          )}
        </div>
      </section>

      <section id="faq" className="lp-section">
        <div className="lp-wrap lp-faq-wrap">
          <h2>Questions, answered</h2>
          <div className="lp-faq">
            {FAQ.map((f) => (
              <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-band">
        <div className="lp-wrap lp-band-in">
          <Orbi size={92} float />
          <div><h2>Make your first email in minutes</h2><p>No sign-up. No code. Just drag, brand and send.</p></div>
          <div className="lp-cta">
            <Link className="btn btn-xl btn-white" href="/editor?templates=1">Start building <ArrowRight size={17} /></Link>
            {coffee && <a className="btn btn-xl btn-ghost" href={coffee} target="_blank" rel="noopener noreferrer"><Coffee size={17} /> Buy me a coffee</a>}
          </div>
        </div>
      </section>

      <footer className="lp-foot">
        <div className="lp-wrap lp-foot-in">
          <span>© {new Date().getFullYear()} Branded Email Maker</span>
          <nav aria-label="Footer"><Link href="/editor">Editor</Link><a href="#templates">Templates</a><a href="#faq">FAQ</a><Link href="/editor?guide=1">Send feedback</Link>{coffee && <a href={coffee} target="_blank" rel="noopener noreferrer">Support</a>}</nav>
        </div>
      </footer>
    </div>
  );
}
