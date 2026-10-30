'use client';

import { useRef } from 'react';
import { Download, FilePlus2, FolderOpen, Redo2, Send, Undo2, Upload } from 'lucide-react';
import { useStore } from '@/lib/store';
import { parseImport } from '@/lib/docs';
import type { DialogName } from './Dialogs';

export default function TopBar({ openDialog }: { openDialog: (d: DialogName) => void }) {
  const name = useStore((s) => s.doc.name);
  const status = useStore((s) => s.status);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const doc = parseImport(await f.text());
    const { importDoc, notify } = useStore.getState();
    if (doc) { importDoc(doc); notify(`Imported “${doc.name}”`, { kind: 'success' }); }
    else notify('That file wasn’t made with this app (no backup marker found).', { kind: 'error' });
  }

  return (
    <header className="topbar">
      <div className="brand">
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <circle cx="16" cy="16" r="9" fill="#0F1A2E" />
          <ellipse cx="16" cy="16" rx="14" ry="5.5" transform="rotate(-24 16 16)" stroke="#2E5BFF" strokeWidth="2.2" />
        </svg>
        Branded Email Maker
      </div>
      <div className="docname">
        <input value={name} aria-label="Email name" onChange={(e) => useStore.getState().patchMeta({ name: e.target.value })} />
        <span className={`status ${status}`} role="status"><i />{status === 'saving' ? 'Saving…' : 'Saved in browser'}</span>
      </div>
      <div className="top-actions">
        <button className="icon-btn" aria-label="Undo" title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={() => useStore.getState().undo()}><Undo2 size={17} /></button>
        <button className="icon-btn" aria-label="Redo" title="Redo (Ctrl+Shift+Z)" disabled={!canRedo} onClick={() => useStore.getState().redo()}><Redo2 size={17} /></button>
        <span className="sep" />
        <button className="btn" onClick={() => openDialog('new')}><FilePlus2 size={15} /><span>New</span></button>
        <button className="btn" onClick={() => openDialog('library')}><FolderOpen size={15} /><span>My emails</span></button>
        <button className="btn" onClick={() => fileRef.current?.click()}><Upload size={15} /><span>Import</span></button>
        <input ref={fileRef} type="file" accept=".html,.htm,.json" hidden onChange={onFile} />
        <button className="btn" onClick={() => openDialog('guide')} title="How to send your email, and share feedback"><Send size={15} /><span>How to send</span></button>
        <button className="btn btn-accent" onClick={() => openDialog('export')}><Download size={15} /><span>Export</span></button>
      </div>
    </header>
  );
}
