'use client';

import { useMemo, useState } from 'react';
import { ChevronRight, Eye, EyeOff, Layers, Plus, Search } from 'lucide-react';
import { CATEGORY_ORDER, PALETTE, type PaletteItem } from '@/lib/nodes';
import type { DragKind, Node } from '@/lib/types';
import { startDrag } from '@/lib/dnd';
import { useStore } from '@/lib/store';
import { nodeLabel } from './Canvas';

const kindOf = (a: PaletteItem['action']): DragKind => (a.kind === 'el' ? 'el' : a.kind === 'layout' ? 'row' : a.kind === 'section' ? 'section' : 'shape');

function Tile({ item }: { item: PaletteItem }) {
  const Icon = item.icon;
  const add = () => useStore.getState().addFromAction(item.action);
  return (
    <button
      type="button" className="tile" title={`Drag onto the canvas, or click to add ${item.label}`}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        startDrag(e, { kind: kindOf(item.action), commit: (t) => useStore.getState().addFromAction(item.action, t) }, item.label, add);
      }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); add(); } }}
    >
      <span className="ico"><Icon size={16} /></span>
      {item.label}
    </button>
  );
}

const HINTS: Record<string, string> = {
  Layout: 'Rows and columns. Drop into a section, or onto empty canvas.',
  Elements: 'Content that lives inside a column.',
  Sections: 'Ready-made sections you can edit.',
  Overlays: 'Shapes drawn behind a container’s content. They never take space. Drop onto any section, row or column.'
};

function Add() {
  const [q, setQ] = useState('');
  const groups = useMemo(() => {
    const term = q.trim().toLowerCase();
    const items = PALETTE.filter((i) => !term || i.label.toLowerCase().includes(term) || i.category.toLowerCase().includes(term));
    return CATEGORY_ORDER.map((c) => [c, items.filter((i) => i.category === c)] as const).filter(([, list]) => list.length);
  }, [q]);
  return (
    <>
      <div className="search">
        <Search size={15} />
        <input type="search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
      </div>
      {groups.length === 0 && <p className="empty-note">Nothing matches “{q}”.</p>}
      {groups.map(([cat, items]) => (
        <section key={cat}>
          <h3 className="cat">{cat}</h3>
          <p className="cat-hint">{HINTS[cat]}</p>
          <div className="tiles">{items.map((i) => <Tile key={i.key} item={i} />)}</div>
        </section>
      ))}
    </>
  );
}

function LayerRow({ node, depth, n }: { node: Node; depth: number; n: number }) {
  const selected = useStore((s) => s.selectedId === node.id);
  const device = useStore((s) => s.device);
  const hidden = !!node.hide?.[device];
  const text = node.kind === 'el' ? String(node.props.text || node.props.heading || node.props.q || '').replace(/\s+/g, ' ').slice(0, 22) : '';
  const shapes = Array.isArray(node.props.shapes) ? node.props.shapes.length : 0;
  return (
    <>
      <div className={`layer ${selected ? 'sel' : ''} ${hidden ? 'off' : ''}`} style={{ paddingLeft: 8 + depth * 14 }} onClick={() => useStore.getState().select(node.id)}>
        {node.children?.length ? <ChevronRight size={12} className="chev" /> : <span style={{ width: 12 }} />}
        <span className="lname">{nodeLabel(node)}{node.kind !== 'el' ? ` ${n}` : ''}</span>
        {text && <span className="lsub">{text}</span>}
        {shapes > 0 && <span className="lbadge">{shapes} shape{shapes > 1 ? 's' : ''}</span>}
        <button className="icon-btn sm" aria-label={hidden ? 'Show' : 'Hide'} onClick={(e) => { e.stopPropagation(); useStore.getState().toggleHide(node.id, device); }}>
          {hidden ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
      </div>
      {node.children?.map((c, i) => <LayerRow key={c.id} node={c} depth={depth + 1} n={i + 1} />)}
    </>
  );
}

function LayersTab() {
  const sections = useStore((s) => s.doc.sections);
  const device = useStore((s) => s.device);
  return (
    <>
      <p className="cat-hint">Structure of your email. Eye icons hide a layer on {device} only.</p>
      {sections.length === 0 && <p className="empty-note">No sections yet.</p>}
      <div className="layers">{sections.map((s, i) => <LayerRow key={s.id} node={s} depth={0} n={i + 1} />)}</div>
    </>
  );
}

export default function Palette() {
  const [tab, setTab] = useState<'add' | 'layers'>('add');
  return (
    <aside className="palette" aria-label="Elements and layers">
      <div className="ptabs" role="tablist">
        <button role="tab" aria-selected={tab === 'add'} onClick={() => setTab('add')}><Plus size={14} /> Add</button>
        <button role="tab" aria-selected={tab === 'layers'} onClick={() => setTab('layers')}><Layers size={14} /> Layers</button>
      </div>
      {tab === 'add' ? <Add /> : <LayersTab />}
    </aside>
  );
}
