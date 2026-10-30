'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileJson, Info, Trash2, TriangleAlert, X, CopyPlus } from 'lucide-react';
import CopyButton from './CopyButton';
import GuideDialog from './GuideDialog';
import { useStore } from '@/lib/store';
import { TEMPLATES } from '@/lib/templates';
import { documentToHtml, lintDoc } from '@/lib/render';
import { backupJson, download, slug } from '@/lib/docs';

export type DialogName = 'new' | 'library' | 'export' | 'guide' | null;

function Modal({ open, onClose, title, wide, children }: { open: boolean; onClose: () => void; title: string; wide?: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref} className={wide ? 'wide' : ''} aria-label={title}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
    >
      {open && (
        <>
          <div className="dlg-head">
            <h2>{title}</h2>
            <button className="icon-btn" aria-label="Close" onClick={onClose}><X size={18} /></button>
          </div>
          <div className="dlg-body">{children}</div>
        </>
      )}
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
  return (
    <>
      <p className="dlg-sub">Pick a starting point. Your current email is saved automatically.</p>
      <div className="tpl-grid">
        {TEMPLATES.map((t) => (
          <button key={t.id} className="tpl" onClick={() => { useStore.getState().newDoc(t.id); onClose(); }}>
            <strong>{t.label}</strong>
            <span>{t.description}</span>
          </button>
        ))}
      </div>
    </>
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
  return (
    <>
      <Modal open={open === 'new'} onClose={onClose} title="New email"><NewDialog onClose={onClose} /></Modal>
      <Modal open={open === 'library'} onClose={onClose} title="My emails"><LibraryDialog onClose={onClose} /></Modal>
      <Modal open={open === 'export'} onClose={onClose} title="Export" wide><ExportDialog /></Modal>
      <Modal open={open === 'guide'} onClose={onClose} title="How to send your email" wide><GuideDialog /></Modal>
    </>
  );
}
