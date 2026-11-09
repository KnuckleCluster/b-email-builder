'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { BookmarkPlus, Download, FileJson, Info, Mail, Plus, Trash2, TriangleAlert, X, CopyPlus } from 'lucide-react';
import CopyButton from './CopyButton';
import GuideDialog from './GuideDialog';
import TestDialog from './TestDialog';
import PhotoBrowser from './PhotoBrowser';
import TemplateThumb from './TemplateThumb';
import type { DialogName } from '@/lib/store';
import { useStore } from '@/lib/store';
import { TEMPLATES, TEMPLATE_CATEGORIES, type TemplateCategory } from '@/lib/templates';
import { walk } from '@/lib/tree';
import { locate } from '@/lib/tree';
import { documentToHtml, lintDoc } from '@/lib/render';
import { backupJson, download, slug } from '@/lib/docs';

export type { DialogName };

function Modal({ open, onClose, title, wide, xl, fancy, children }: { open: boolean; onClose: () => void; title: string; wide?: boolean; xl?: boolean; fancy?: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref} className={`${wide ? 'wide' : ''} ${xl ? 'xl' : ''} ${fancy ? 'fancy' : ''}`} aria-label={title}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
    >
      {open && (fancy ? children : (
        <>
          <div className="dlg-head">
            <h2>{title}</h2>
            <button className="icon-btn" aria-label="Close" onClick={onClose}><X size={18} /></button>
          </div>
          <div className="dlg-body">{children}</div>
        </>
      ))}
    </dialog>
  );
}

function ago(ts: number) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(ts).toLocaleDateString();
}

function NewDialog({ onClose }: { onClose: () => void }) {
  const [cat, setCat] = useState<'All' | TemplateCategory>('All');
  const list = TEMPLATES.filter((t) => cat === 'All' || t.category === cat);
  return (
    <>
      <p className="dlg-sub">Every template comes with its own colors and photos. Change anything once you’re in. Your current email is saved automatically.</p>
      <div className="pb-chips tpl-chips">
        {(['All', ...TEMPLATE_CATEGORIES] as const).map((c) => <button key={c} type="button" className={cat === c ? 'on' : ''} onClick={() => setCat(c)}>{c}</button>)}
      </div>
      <div className="tpl-grid">
        {list.map((t) => (
          <button key={t.id} className="tpl-card" onClick={() => { useStore.getState().newDoc(t.id); onClose(); }}>
            {t.id === 'blank' ? (
              <div className="tpl-blank" style={{ width: 264, height: 380 }}><Plus size={28} /><span>Start from scratch</span></div>
            ) : (
              <TemplateThumb t={t} />
            )}
            <div className="tpl-meta">
              <strong>{t.label}</strong>
              <span>{t.description}</span>
              <em>{t.category}</em>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

function PhotosDialog({ onClose }: { onClose: () => void }) {
  return (
    <PhotoBrowser
      onPick={(p) => {
        const cb = useStore.getState().photoPicker;
        useStore.setState({ photoPicker: null });
        cb?.(p);
        onClose();
      }}
    />
  );
}

function SaveSectionDialog({ onClose }: { onClose: () => void }) {
  const id = useStore((s) => s.selectedId);
  const suggested = useMemo(() => {
    const sec = id ? locate(useStore.getState().doc.sections, id)?.node : null;
    let found = '';
    if (sec) walk([sec], (n) => {
      if (found || n.kind !== 'el') return;
      const t = String(n.props.text || n.props.heading || '').replace(/\s+/g, ' ').trim();
      if (t) found = t.slice(0, 32);
    });
    return found || 'My section';
  }, [id]);
  const [name, setName] = useState(suggested);
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (id) useStore.getState().saveSection(id, name); onClose(); }} className="td">
      <div className="td-head">
        <span className="td-ico"><BookmarkPlus size={22} /></span>
        <div><h3>Save this section</h3><p>Reuse it in any email, in one click. Brand colors adapt to each email.</p></div>
      </div>
      <label className="flabel" htmlFor="ss-name">Name</label>
      <input id="ss-name" className="input" value={name} autoFocus onFocus={(e) => e.currentTarget.select()} onChange={(e) => setName(e.target.value)} maxLength={60} />
      <div className="td-actions">
        <button type="submit" className="btn btn-accent"><BookmarkPlus size={15} /> Save to My sections</button>
        <button type="button" className="btn btn-text" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}

function LibraryDialog({ onClose }: { onClose: () => void }) {
  const library = useStore((s) => s.library);
  const currentId = useStore((s) => s.doc.id);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const { openDoc, duplicateDoc, deleteDoc } = useStore.getState();
  return (
    <>
      <p className="dlg-sub">Saved in this browser. Export a backup if you want to keep a copy elsewhere.</p>
      <div className="lib">
        {library.length === 0 && <p className="empty-note">Nothing saved yet.</p>}
        {library.map((d) => (
          <div key={d.id} className={`libitem ${d.id === currentId ? 'cur' : ''}`}>
            <div className="meta">
              <strong>{d.name || 'Untitled'}</strong>
              <span>{d.blocks} sections · edited {ago(d.updatedAt)}{d.id === currentId ? ' · open' : ''}</span>
            </div>
            {d.id !== currentId && <button className="btn" onClick={() => { openDoc(d.id); onClose(); }}>Open</button>}
            <button className="icon-btn" aria-label="Duplicate" title="Duplicate" onClick={() => { duplicateDoc(d.id); onClose(); }}><CopyPlus size={16} /></button>
            {confirmId === d.id ? (
              <button className="btn btn-danger" onClick={() => { deleteDoc(d.id); setConfirmId(null); }}>Delete?</button>
            ) : (
              <button className="icon-btn danger" aria-label="Delete" title="Delete" onClick={() => setConfirmId(d.id)}><Trash2 size={16} /></button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function ExportDialog() {
  const doc = useStore((s) => s.doc);
  const notify = useStore((s) => s.notify);
  const [marker, setMarker] = useState(true);
  const checks = useMemo(() => lintDoc(doc), [doc]);
  const base = slug(doc.name);
  return (
    <>
      <p className="dlg-sub">Download the finished email to upload to your newsletter platform, or copy the clean HTML.</p>
      <label className="switch">
        <input type="checkbox" role="switch" checked={marker} onChange={(e) => setMarker(e.target.checked)} />
        <span className="track" aria-hidden="true" />
        Embed editable backup in the file
      </label>
      <div className="callout-note">
        <Info size={16} />
        <span>
          {marker
            ? 'A hidden comment lets you re-import this .html here later and keep editing. It’s invisible to readers. Some platforms strip comments, so keep a .json backup too.'
            : 'The file will be plain email HTML and can’t be re-imported. Use the .json backup to keep it editable.'}
        </span>
      </div>
      <div className="exp-actions">
        <button className="btn btn-ink" onClick={() => { download(`${base}.html`, documentToHtml(doc, { marker }), 'text/html'); notify(`Downloaded ${base}.html`, { kind: 'success' }); }}>
          <Download size={15} /> Download HTML
        </button>
        <CopyButton getText={() => documentToHtml(doc)} toast="Clean HTML copied to clipboard" />
        <button className="btn" onClick={() => { download(`${base}.srmail.json`, backupJson(doc), 'application/json'); notify(`Downloaded ${base}.srmail.json`, { kind: 'success' }); }}>
          <FileJson size={15} /> Backup (.json)
        </button>
        <button className="btn" onClick={() => useStore.getState().setDialog('test')}>
          <Mail size={15} /> Send a test
        </button>
      </div>
      <div className="cklist" aria-label="Pre-flight checks">
        {checks.length === 0 && <div className="check info"><Info size={14} /><span>Pre-flight checks passed.</span></div>}
        {checks.map((c, i) => (
          <div className={`check ${c.level}`} key={i}>
            {c.level === 'warn' ? <TriangleAlert size={14} /> : <Info size={14} />}
            <span>{c.msg}</span>
          </div>
        ))}
      </div>
    </>
  );
}

export default function Dialogs({ open, onClose }: { open: DialogName; onClose: () => void }) {
  // A dialog that closes because another one opened must not reset the shared state.
  const closeIf = (name: DialogName) => () => { if (useStore.getState().dialog === name) onClose(); };
  return (
    <>
      <Modal open={open === 'new'} onClose={closeIf('new')} title="Start with a template" xl><NewDialog onClose={onClose} /></Modal>
      <Modal open={open === 'library'} onClose={closeIf('library')} title="My emails"><LibraryDialog onClose={onClose} /></Modal>
      <Modal open={open === 'export'} onClose={closeIf('export')} title="Export" wide><ExportDialog /></Modal>
      <Modal open={open === 'guide'} onClose={closeIf('guide')} title="How to send your email" wide fancy><GuideDialog /></Modal>
      <Modal open={open === 'photos'} onClose={closeIf('photos')} title="Choose a photo"><PhotosDialog onClose={onClose} /></Modal>
      <Modal open={open === 'saveSection'} onClose={closeIf('saveSection')} title="Save section"><SaveSectionDialog onClose={onClose} /></Modal>
      <Modal open={open === 'test'} onClose={closeIf('test')} title="Send a test email"><TestDialog /></Modal>
    </>
  );
}
