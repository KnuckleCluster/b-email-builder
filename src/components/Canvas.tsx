'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpToLine, CopyPlus, Eye, EyeOff, GripVertical, Trash2 } from 'lucide-react';
import type { Node, Shape } from '@/lib/types';
import { canvasHtml, mobileCssScoped, propsFor } from '@/lib/render';
import { sanitize } from '@/lib/sanitize';
import { DEFS } from '@/lib/registry';
import { resolveColor } from '@/lib/theme';
import { locate } from '@/lib/tree';
import { startDrag } from '@/lib/dnd';
import { selectedNode, useStore } from '@/lib/store';

interface R { top: number; left: number; width: number; height: number }

export const nodeLabel = (n: Node) => (n.kind === 'el' ? DEFS[n.type!]?.label ?? 'Element' : n.kind === 'col' ? 'Column' : n.kind === 'row' ? 'Row' : 'Section');

const nidOf = (t: EventTarget | null) => (t as HTMLElement | null)?.closest?.('[data-nid]') as HTMLElement | null;

export default function Canvas() {
  const doc = useStore((s) => s.doc);
  const device = useStore((s) => s.device);
  const selectedId = useStore((s) => s.selectedId);
  const node = useStore(selectedNode);
  const drag = useStore((s) => s.drag);
  const stageRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [selRect, setSelRect] = useState<R | null>(null);
  const [hovRect, setHovRect] = useState<R | null>(null);

  const mobile = device === 'mobile';
  const width = mobile ? 375 : doc.brand.width;
  const html = useMemo(() => sanitize(canvasHtml(doc, device)), [doc, device]);
  const css = useMemo(() => (mobile ? mobileCssScoped(doc.brand, '.mail-col.is-mobile') : ''), [mobile, doc.brand]);

  const measure = useCallback(() => {
    const stage = stageRef.current, root = rootRef.current;
    if (!stage || !root) return;
    const sr = stage.getBoundingClientRect();
    const get = (id: string | null): R | null => {
      if (!id) return null;
      const el = root.querySelector<HTMLElement>(`[data-nid="${id}"]`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top - sr.top + stage.scrollTop, left: r.left - sr.left + stage.scrollLeft, width: r.width, height: r.height };
    };
    setSelRect(get(selectedId));
    setHovRect(hover && hover !== selectedId && !drag ? get(hover) : null);
  }, [selectedId, hover, drag]);

  useLayoutEffect(measure, [measure, html, device]);
  useEffect(() => {
    const ro = new ResizeObserver(measure);
    if (rootRef.current) ro.observe(rootRef.current);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [measure]);

  const st = useStore.getState;
  const loc = node ? locate(doc.sections, node.id) : null;
  const hidden = !!node?.hide?.[device];
  const isCol = node?.kind === 'col';

  const gripDown = (e: React.PointerEvent) => {
    if (!node || isCol) return;
    e.preventDefault(); e.stopPropagation();
    const kind = node.kind === 'el' ? 'el' : node.kind === 'row' ? 'row' : 'section';
    startDrag(e, { kind, commit: (t) => { if (!t.empty) st().moveNode(node.id, t.parentId, t.index); } }, nodeLabel(node));
  };

  /* shape handles (drag to reposition) */
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

  return (
    <div className="stage" ref={stageRef} onClick={() => st().select(null)}>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div
        ref={rootRef}
        className={`mail-col ${mobile ? 'is-mobile' : ''}`}
        style={{ width: `min(100%, ${width}px)`, background: resolveColor('@surface', doc.brand) }}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); st().select(nidOf(e.target)?.dataset.nid ?? null); }}
        onMouseMove={(e) => setHover(drag ? null : nidOf(e.target)?.dataset.nid ?? null)}
        onMouseLeave={() => setHover(null)}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {doc.sections.length === 0 && (
        <div className="empty-canvas" style={{ width: `min(100%, ${width}px)` }}>
          <strong>Start building</strong>
          <span>Drag a section, layout or element here, or click one on the left.</span>
        </div>
      )}

      {hovRect && <div className="hov-box" style={hovRect} />}
      {selRect && node && (
        <>
          <div className="sel-box" style={selRect} />
          <div className="sel-tools" style={{ top: selRect.top < 40 ? selRect.top + 4 : selRect.top - 34, left: selRect.left + selRect.width }} onClick={(e) => e.stopPropagation()}>
            <span className="sel-label">{nodeLabel(node)}</span>
            {!isCol && <button className="icon-btn grip" aria-label="Drag to move" title="Drag to move" onPointerDown={gripDown}><GripVertical size={15} /></button>}
            <button className="icon-btn" aria-label="Select parent" title="Select parent" disabled={!loc?.parent} onClick={() => st().selectParent()}><ArrowUpToLine size={15} /></button>
            <button className="icon-btn" aria-label={isCol ? 'Move left' : 'Move up'} title={isCol ? 'Move left' : 'Move up'} disabled={!loc || loc.index === 0} onClick={() => st().moveSibling(node.id, -1)}>{isCol ? <ArrowLeft size={15} /> : <ArrowUp size={15} />}</button>
            <button className="icon-btn" aria-label={isCol ? 'Move right' : 'Move down'} title={isCol ? 'Move right' : 'Move down'} disabled={!loc || loc.index === loc.siblings.length - 1} onClick={() => st().moveSibling(node.id, 1)}>{isCol ? <ArrowRight size={15} /> : <ArrowDown size={15} />}</button>
            <button className="icon-btn" aria-label={hidden ? `Show on ${device}` : `Hide on ${device}`} title={hidden ? `Show on ${device}` : `Hide on ${device}`} onClick={() => st().toggleHide(node.id, device)}>{hidden ? <Eye size={15} /> : <EyeOff size={15} />}</button>
            <button className="icon-btn" aria-label="Duplicate" title="Duplicate" onClick={() => st().duplicateNode(node.id)}><CopyPlus size={15} /></button>
            <button className="icon-btn danger" aria-label="Delete" title="Delete" onClick={() => st().removeNode(node.id)}><Trash2 size={15} /></button>
          </div>
          {shapes.map((s, i) => {
            const pos = handlePos(s);
            return pos ? (
              <div key={s.id || i} className="shape-handle" title="Drag to move this shape" style={{ left: pos.x, top: pos.y }} onPointerDown={(e) => shapeDown(e, i)} onClick={(e) => e.stopPropagation()} />
            ) : null;
          })}
        </>
      )}

      {t?.line && <div className="drop-line" style={{ position: 'fixed', ...t.line }} />}
      {t?.box && (t.kind === 'shape' || t.empty) && <div className="drop-box" style={{ position: 'fixed', ...t.box }} />}
    </div>
  );
}
