'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpToLine, Bold, BookmarkPlus, CopyPlus, Eye, EyeOff, GripVertical, Italic, Link2, PenLine, Trash2
} from 'lucide-react';
import type { Node, Shape } from '@/lib/types';
import { BADGE_TEXT, canvasHtml, mobileCssScoped, propsFor } from '@/lib/render';
import { sanitize } from '@/lib/sanitize';
import { DEFS } from '@/lib/registry';
import { resolveColor } from '@/lib/theme';
import { locate } from '@/lib/tree';
import { startDrag } from '@/lib/dnd';
import { selectedNode, useStore } from '@/lib/store';
import { Orbi } from './Mascot';

interface R { top: number; left: number; width: number; height: number }

export const nodeLabel = (n: Node) => (n.kind === 'el' ? DEFS[n.type!]?.label ?? 'Element' : n.kind === 'col' ? 'Column' : n.kind === 'row' ? 'Row' : 'Section');
const nidOf = (t: EventTarget | null) => (t as HTMLElement | null)?.closest?.('[data-nid]') as HTMLElement | null;

/* ---- tiny path helpers for editing values like items.0.q or cells.1.2 ---- */
const getPath = (obj: any, key: string) => key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
function setPath(root: any, path: string[], v: string): any {
  const out: any = Array.isArray(root) ? [...root] : { ...(root || {}) };
  const [k, ...rest] = path;
  const key: any = Array.isArray(out) ? Number(k) : k;
  out[key] = rest.length ? setPath(out[key], rest, v) : v;
  return out;
}

interface Editing { nid: string; key: string; el: HTMLElement; multiline: boolean; original: string; origHtml: string; done: boolean }

export default function Canvas() {
  const doc = useStore((s) => s.doc);
  const device = useStore((s) => s.device);
  const selectedId = useStore((s) => s.selectedId);
  const node = useStore(selectedNode);
  const drag = useStore((s) => s.drag);
  const stageRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<Editing | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [selRect, setSelRect] = useState<R | null>(null);
  const [hovRect, setHovRect] = useState<R | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [edit, setEdit] = useState<{ rect: R; markup: boolean } | null>(null);

  const mobile = device === 'mobile';
  const width = mobile ? 375 : doc.brand.width;
  const html = useMemo(() => sanitize(canvasHtml(doc, device)), [doc, device]);
  const css = useMemo(() => (mobile ? mobileCssScoped(doc.brand, '.mail-col.is-mobile') : ''), [mobile, doc.brand]);
  const st = useStore.getState;

  /* ---------- measuring overlays ---------- */
  const toStage = useCallback((el: Element): R | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    const sr = stage.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { top: r.top - sr.top + stage.scrollTop, left: r.left - sr.left + stage.scrollLeft, width: r.width, height: r.height };
  }, []);

  const measure = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const find = (id: string | null) => (id ? root.querySelector<HTMLElement>(`[data-nid="${id}"]`) : null);
    const selEl = find(selectedId);
    setSelRect(selEl ? toStage(selEl) : null);
    setCanEdit(!!selEl?.querySelector('[data-edit]'));
    const hovEl = hover && hover !== selectedId && !drag ? find(hover) : null;
    setHovRect(hovEl ? toStage(hovEl) : null);
  }, [selectedId, hover, drag, toStage]);

  useLayoutEffect(measure, [measure, html, device]);
  useEffect(() => {
    const ro = new ResizeObserver(measure);
    if (rootRef.current) ro.observe(rootRef.current);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [measure]);

  /* ---------- inline text editing ---------- */
  const edit_ = useMemo(() => {
    const insert = (t: string) => document.execCommand('insertText', false, t);
    const wrap = (kind: 'b' | 'i' | 'k') => {
      const sel = window.getSelection();
      const t = sel?.toString() || '';
      if (kind === 'b') insert(`**${t || 'bold text'}**`);
      else if (kind === 'i') insert(`*${t || 'italic text'}*`);
      else { insert(`[${t || 'link text'}](https://)`); (window.getSelection() as any)?.modify?.('move', 'backward', 'character'); }
    };

    const finish = (commit: boolean) => {
      const ed = editRef.current;
      if (!ed || ed.done) return;
      ed.done = true;
      editRef.current = null;
      const el = ed.el;
      el.removeEventListener('keydown', onKey);
      el.removeEventListener('blur', onBlur);
      el.removeEventListener('paste', onPaste);
      el.removeEventListener('input', onInput);
      const text = (el.innerText || '').replace(/\u00a0/g, ' ').replace(/\n+$/, '');
      el.removeAttribute('contenteditable');
      el.classList.remove('is-editing');
      setEdit(null);
      const cur = locate(st().doc.sections, ed.nid)?.node;
      if (commit && cur && text !== ed.original) {
        const props = propsFor(cur, st().device);
        const [top, ...rest] = ed.key.split('.');
        st().patchNode(ed.nid, { [top]: rest.length ? setPath(props[top], rest, text) : text });
      } else {
        el.innerHTML = ed.origHtml;
      }
    };

    function onKey(e: KeyboardEvent) {
      const ed = editRef.current;
      if (!ed) return;
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); return; }
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (!ed.multiline || mod) finish(true);
        else document.execCommand('insertLineBreak');
        return;
      }
      if (mod && (k === 'b' || k === 'i' || k === 'k')) { e.preventDefault(); e.stopPropagation(); wrap(k === 'k' ? 'k' : (k as 'b' | 'i')); }
    }
    function onBlur() { finish(true); }
    function onPaste(e: ClipboardEvent) {
      e.preventDefault();
      const ed = editRef.current;
      const t = e.clipboardData?.getData('text/plain') || '';
      insert(ed?.multiline ? t : t.replace(/\s*\n+\s*/g, ' '));
    }
    function onInput() {
      const ed = editRef.current;
      const r = ed ? toStage(ed.el) : null;
      if (r) setEdit((cur) => (cur ? { ...cur, rect: r } : cur));
    }

    const begin = (el: HTMLElement) => {
      if (editRef.current) finish(true);
      const owner = el.closest<HTMLElement>('[data-nid][data-k="el"]');
      if (!owner) return;
      const nid = owner.dataset.nid!;
      const key = el.dataset.edit!;
      const n = locate(st().doc.sections, nid)?.node;
      if (!n || n.hide?.[st().device]) return;
      const raw = String(getPath(propsFor(n, st().device), key) ?? '');
      const markup = !(n.type === 'button' || key.endsWith('.q'));
      editRef.current = { nid, key, el, multiline: el.dataset.ml === '1', original: raw, origHtml: el.innerHTML, done: false };
      st().select(nid);
      el.textContent = raw;
      el.setAttribute('contenteditable', 'true');
      el.setAttribute('spellcheck', 'true');
      el.classList.add('is-editing');
      el.addEventListener('keydown', onKey);
      el.addEventListener('blur', onBlur);
      el.addEventListener('paste', onPaste);
      el.addEventListener('input', onInput);
      el.focus();
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
      const rect = toStage(el);
      if (rect) setEdit({ rect, markup });
    };
    return { begin, finish, wrap };
  }, [st, toStage]);

  // Enter on a selected element starts editing its text
  useEffect(() => {
    const onEditEvent = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      const target = rootRef.current?.querySelector<HTMLElement>(`[data-nid="${id}"] [data-edit]`);
      if (target) edit_.begin(target);
    };
    window.addEventListener('srm:edit', onEditEvent);
    return () => window.removeEventListener('srm:edit', onEditEvent);
  }, [edit_]);

  const startEditSelected = () => {
    if (!node) return;
    window.dispatchEvent(new CustomEvent('srm:edit', { detail: node.id }));
  };

  /* ---------- toolbar actions ---------- */
  const loc = node ? locate(doc.sections, node.id) : null;
  const hidden = !!node?.hide?.[device];
  const isCol = node?.kind === 'col';

  const gripDown = (e: React.PointerEvent) => {
    if (!node || isCol) return;
    e.preventDefault(); e.stopPropagation();
    const kind = node.kind === 'el' ? 'el' : node.kind === 'row' ? 'row' : 'section';
    startDrag(e, { kind, commit: (t) => { if (!t.empty) st().moveNode(node.id, t.parentId, t.index); } }, nodeLabel(node));
  };

  /* ---------- shape handles ---------- */
  const shapes: Shape[] = node && node.kind !== 'el' ? ((propsFor(node, device).shapes as Shape[]) || []) : [];
  const handlePos = (s: Shape): { x: number; y: number } | null => {
    if (!selRect) return null;
    if (s.kind === 'circle' || s.kind === 'ring') return { x: selRect.left + (selRect.width * s.x) / 100, y: selRect.top + (selRect.height * s.y) / 100 };
    if (s.kind === 'band') {
      const mid = s.pos + s.bandSize / 2;
      return s.dir === 'v' ? { x: selRect.left + (selRect.width * mid) / 100, y: selRect.top + selRect.height / 2 } : { x: selRect.left + selRect.width / 2, y: selRect.top + (selRect.height * mid) / 100 };
    }
    return null;
  };
  const shapeDown = (e: React.PointerEvent, i: number) => {
    if (!node) return;
    e.preventDefault(); e.stopPropagation();
    const id = node.id;
    const move = (ev: PointerEvent) => {
      const el = rootRef.current?.querySelector<HTMLElement>(`[data-nid="${id}"]`);
      const cur = locate(st().doc.sections, id)?.node;
      if (!el || !cur) return;
      const r = el.getBoundingClientRect();
      const px = ((ev.clientX - r.left) / r.width) * 100, py = ((ev.clientY - r.top) / r.height) * 100;
      const list = [...((propsFor(cur, st().device).shapes as Shape[]) || [])];
      const s = list[i];
      if (!s) return;
      if (s.kind === 'band') list[i] = { ...s, pos: Math.round((s.dir === 'v' ? px : py) - s.bandSize / 2) };
      else list[i] = { ...s, x: Math.round(px), y: Math.round(py) };
      st().patchNode(id, { shapes: list }, `shape:${id}:${i}`);
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const t = drag?.target;
  const keepFocus = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div className="stage" ref={stageRef} onClick={() => st().select(null)}>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div
        ref={rootRef}
        className={`mail-col ${mobile ? 'is-mobile' : ''}`}
        style={{ width: `min(100%, ${width}px)`, background: resolveColor('@surface', doc.brand) }}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); st().select(nidOf(e.target)?.dataset.nid ?? null); }}
        onDoubleClick={(e) => {
          const el = (e.target as HTMLElement).closest<HTMLElement>('[data-edit]');
          if (el && !el.isContentEditable) { e.preventDefault(); edit_.begin(el); }
        }}
        onMouseMove={(e) => setHover(drag || edit ? null : nidOf(e.target)?.dataset.nid ?? null)}
        onMouseLeave={() => setHover(null)}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {doc.badge !== false && doc.sections.length > 0 && (
        <button className="badge-pill" style={{ width: 'fit-content' }} onClick={(e) => { e.stopPropagation(); st().select(null); }} title="This badge appears at the bottom of your email. Turn it off in Email settings.">
          ✦&nbsp; {BADGE_TEXT}
        </button>
      )}

      {doc.sections.length === 0 && (
        <div className="empty-canvas" style={{ width: `min(100%, ${width}px)` }}>
          <Orbi size={92} float />
          <strong>It’s quiet in here…</strong>
          <span>Drag a section, layout or element onto the canvas, or click one on the left to begin.</span>
        </div>
      )}

      {hovRect && <div className="hov-box" style={hovRect} />}
      {selRect && node && (
        <>
          <div className="sel-box" style={selRect} />
          {!edit && (
            <div className="sel-tools" style={{ top: selRect.top < 40 ? selRect.top + 4 : selRect.top - 34, left: selRect.left + selRect.width }} onClick={(e) => e.stopPropagation()}>
              <span className="sel-label">{nodeLabel(node)}</span>
              {canEdit && <button className="icon-btn" aria-label="Edit text" title="Edit text (Enter, or double-click)" onClick={startEditSelected}><PenLine size={15} /></button>}
              {!isCol && <button className="icon-btn grip" aria-label="Drag to move" title="Drag to move" onPointerDown={gripDown}><GripVertical size={15} /></button>}
              <button className="icon-btn" aria-label="Select parent" title="Select parent" disabled={!loc?.parent} onClick={() => st().selectParent()}><ArrowUpToLine size={15} /></button>
              <button className="icon-btn" aria-label={isCol ? 'Move left' : 'Move up'} title={isCol ? 'Move left' : 'Move up'} disabled={!loc || loc.index === 0} onClick={() => st().moveSibling(node.id, -1)}>{isCol ? <ArrowLeft size={15} /> : <ArrowUp size={15} />}</button>
              <button className="icon-btn" aria-label={isCol ? 'Move right' : 'Move down'} title={isCol ? 'Move right' : 'Move down'} disabled={!loc || loc.index === loc.siblings.length - 1} onClick={() => st().moveSibling(node.id, 1)}>{isCol ? <ArrowRight size={15} /> : <ArrowDown size={15} />}</button>
              <button className="icon-btn" aria-label={hidden ? `Show on ${device}` : `Hide on ${device}`} title={hidden ? `Show on ${device}` : `Hide on ${device}`} onClick={() => st().toggleHide(node.id, device)}>{hidden ? <Eye size={15} /> : <EyeOff size={15} />}</button>
              {node.kind === 'section' && <button className="icon-btn" aria-label="Save to My sections" title="Save to My sections" onClick={() => st().setDialog('saveSection')}><BookmarkPlus size={15} /></button>}
              <button className="icon-btn" aria-label="Duplicate" title="Duplicate" onClick={() => st().duplicateNode(node.id)}><CopyPlus size={15} /></button>
              <button className="icon-btn danger" aria-label="Delete" title="Delete" onClick={() => st().removeNode(node.id)}><Trash2 size={15} /></button>
            </div>
          )}
          {shapes.map((s, i) => {
            const pos = handlePos(s);
            return pos ? (
              <div key={s.id || i} className="shape-handle" title="Drag to move this shape" style={{ left: pos.x, top: pos.y }} onPointerDown={(e) => shapeDown(e, i)} onClick={(e) => e.stopPropagation()} />
            ) : null;
          })}
        </>
      )}

      {edit && (
        <div className="edit-bar" style={{ top: Math.max(4, edit.rect.top - 42), left: edit.rect.left }} onMouseDown={keepFocus} onClick={(e) => e.stopPropagation()}>
          {edit.markup && (
            <>
              <button aria-label="Bold" title="Bold (Ctrl+B)" onClick={() => edit_.wrap('b')}><Bold size={14} /></button>
              <button aria-label="Italic" title="Italic (Ctrl+I)" onClick={() => edit_.wrap('i')}><Italic size={14} /></button>
              <button aria-label="Link" title="Link (Ctrl+K)" onClick={() => edit_.wrap('k')}><Link2 size={14} /></button>
              <span className="edit-sep" />
            </>
          )}
          <span className="edit-hint">Enter to save · Esc to cancel</span>
          <button className="edit-done" onClick={() => edit_.finish(true)}>Done</button>
        </div>
      )}

      {t?.line && <div className="drop-line" style={{ position: 'fixed', ...t.line }} />}
      {t?.box && (t.kind === 'shape' || t.empty) && <div className="drop-box" style={{ position: 'fixed', ...t.box }} />}
    </div>
  );
}
