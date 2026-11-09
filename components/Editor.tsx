'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Code2, Eye, Info, Monitor, PenLine, Smartphone, TriangleAlert } from 'lucide-react';
import { useStore, type View } from '@/lib/store';
import { locate } from '@/lib/tree';
import TopBar from './TopBar';
import Palette from './Palette';
import Canvas from './Canvas';
import Inspector from './Inspector';
import { CodeView, PreviewView } from './Views';
import Dialogs from './Dialogs';

function DragLayer() {
  const drag = useStore((s) => s.drag);
  if (!drag) return null;
  return <div className="drag-chip" style={{ position: 'fixed', left: drag.x + 14, top: drag.y + 14, pointerEvents: 'none', zIndex: 200 }}>{drag.label}</div>;
}

function Toast() {
  const toast = useStore((s) => s.toast);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!toast) return;
    setShown(true);
    const t = setTimeout(() => setShown(false), toast.action ? 6000 : 2800);
    return () => clearTimeout(t);
  }, [toast]);
  const Icon = toast?.kind === 'success' ? Check : toast?.kind === 'error' ? TriangleAlert : Info;
  return (
    <div className={`toast ${toast?.kind ?? 'info'} ${shown ? 'show' : ''}`} role="status" aria-live="polite">
      <Icon size={16} className="toast-ico" />
      <span>{toast?.msg}</span>
      {toast?.action && (
        <button className="toast-action" onClick={() => { toast.action!.run(); setShown(false); }}>{toast.action.label}</button>
      )}
    </div>
  );
}

const TABS: { id: View; label: string; icon: typeof Eye }[] = [
  { id: 'design', label: 'Design', icon: PenLine },
  { id: 'code', label: 'Code', icon: Code2 },
  { id: 'preview', label: 'Preview', icon: Eye }
];

export default function Editor() {
  const ready = useStore((s) => s.ready);
  const view = useStore((s) => s.view);
  const device = useStore((s) => s.device);
  const dialog = useStore((s) => s.dialog);
  const setDialog = useStore((s) => s.setDialog);

  useEffect(() => { useStore.getState().init(); }, []);

  // deep links from the home page: /editor?new=<template>, ?open=<id>, ?templates=1, ?guide=1
  const handled = useRef(false);
  useEffect(() => {
    if (!ready || handled.current) return;
    handled.current = true;
    const q = new URLSearchParams(window.location.search);
    const s = useStore.getState();
    const tpl = q.get('new'), open = q.get('open');
    if (tpl) s.newDoc(tpl);
    else if (open) s.openDoc(open);
    if (q.get('templates') === '1') s.setDialog('new');
    if (q.get('guide') === '1') s.setDialog('guide');
    if (q.toString()) window.history.replaceState(null, '', window.location.pathname);
  }, [ready]);

  /* keyboard shortcuts */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return; // already handled (e.g. by the inline text editor)
      const el = e.target as HTMLElement;
      const typing = el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable);
      const mod = e.ctrlKey || e.metaKey;
      const s = useStore.getState();
      if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); e.shiftKey ? s.redo() : s.undo(); }
      else if (mod && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); s.redo(); }
      else if (typing) return;
      else if (mod && e.key.toLowerCase() === 'd' && s.selectedId) { e.preventDefault(); s.duplicateNode(s.selectedId); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && s.selectedId) { e.preventDefault(); s.removeNode(s.selectedId); }
      else if (e.key === 'Enter' && s.selectedId && s.view === 'design') {
        if (locate(s.doc.sections, s.selectedId)?.node.kind === 'el') { e.preventDefault(); window.dispatchEvent(new CustomEvent('srm:edit', { detail: s.selectedId })); }
      }
      else if (e.key === 'Escape') s.selectParent();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!ready) return <div className="app" aria-busy="true"><div className="topbar"><div className="brand">Branded Email Maker</div></div></div>;

  return (
    <div className="app">
      <TopBar openDialog={setDialog} />
      <div className="workspace">
          <Palette />
          <main className="center">
            <div className="mobile-note">The builder works best on a larger screen.</div>
            <div className="subbar">
              <div className="tabs" role="tablist" aria-label="View">
                {TABS.map((t) => (
                  <button key={t.id} role="tab" className="tab" aria-selected={view === t.id} onClick={() => useStore.getState().setView(t.id)}>
                    <t.icon size={15} /> {t.label}
                  </button>
                ))}
              </div>
              <div className="segmented" role="group" aria-label="Device width">
                <button aria-pressed={device === 'desktop'} onClick={() => useStore.getState().setDevice('desktop')}><Monitor size={14} /> Desktop</button>
                <button aria-pressed={device === 'mobile'} onClick={() => useStore.getState().setDevice('mobile')}><Smartphone size={14} /> Mobile</button>
              </div>
            </div>
            {view === 'design' && <Canvas />}
            {view === 'code' && <CodeView />}
            {view === 'preview' && <PreviewView />}
          </main>
          <Inspector />
        </div>
      <DragLayer />
      <Dialogs open={dialog} onClose={() => setDialog(null)} />
      <Toast />
    </div>
  );
}
