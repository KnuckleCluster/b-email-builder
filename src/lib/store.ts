import { create } from 'zustand';
import type { Brand, DocMeta, DragState, DropTarget, EmailDoc, Node, Props, Shape } from './types';
import { DEFS } from './registry';
import { makeCol, makeEl, makeRow, makeSection, newShape, type PaletteAction } from './nodes';
import { TEMPLATES } from './templates';
import { createDoc, normalizeDoc } from './docs';
import { cloneFresh, insertNode, locate, mapNode, removeNode, uid } from './tree';
import { propsFor } from './render';
import { getLastId, listDocs, loadDoc, removeDoc, saveDoc, setLastId } from './storage';

export type View = 'design' | 'code' | 'preview';
export type DialogName = 'new' | 'library' | 'export' | 'guide' | 'test' | null;
export type Device = 'desktop' | 'mobile';

interface State {
  ready: boolean;
  doc: EmailDoc;
  selectedId: string | null;
  view: View;
  device: Device;
  past: EmailDoc[];
  future: EmailDoc[];
  lastKey: string;
  lastAt: number;
  library: DocMeta[];
  status: 'saved' | 'saving';
  toast: { id: number; msg: string; kind: 'success' | 'info' | 'error'; action?: { label: string; run: () => void } } | null;
  drag: DragState | null;
  dialog: DialogName;

  init: () => void;
  notify: (msg: string, opts?: { kind?: 'success' | 'info' | 'error'; action?: { label: string; run: () => void } }) => void;
  setView: (v: View) => void;
  setDevice: (d: Device) => void;
  select: (id: string | null) => void;
  selectParent: () => void;
  setDrag: (d: DragState | null) => void;
  setDialog: (d: DialogName) => void;

  patchNode: (id: string, patch: Props, key?: string, base?: boolean) => void;
  resetMobile: (id: string, keys?: string[]) => void;
  toggleHide: (id: string, device: Device) => void;
  mobileOnlyCopy: (id: string) => void;
  removeNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  moveSibling: (id: string, dir: -1 | 1) => void;
  moveNode: (id: string, parentId: string | null, index: number) => void;
  setRowLayout: (rowId: string, spans: number[]) => void;
  addFromAction: (action: PaletteAction, target?: DropTarget | null) => void;
  patchBrand: (patch: Partial<Brand>) => void;
  patchMeta: (patch: Partial<Pick<EmailDoc, 'name' | 'subject' | 'preheader'>>) => void;

  undo: () => void;
  redo: () => void;

  newDoc: (templateId: string) => void;
  openDoc: (id: string) => void;
  duplicateDoc: (id: string) => void;
  deleteDoc: (id: string) => void;
  importDoc: (doc: EmailDoc) => void;
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;

/** Remove rows that lost all their columns. */
function prune(nodes: Node[]): Node[] {
  return nodes.map((s) => (s.kind === 'section' ? { ...s, children: (s.children || []).filter((r) => (r.children || []).length > 0) } : s));
}

/** Decide where new nodes go: an explicit drop target, or "smart" placement from the current selection. */
function resolveSlot(sections: Node[], kind: 'section' | 'row' | 'el', selectedId: string | null, target?: DropTarget | null) {
  if (target && !target.empty) return { sections, parentId: target.parentId, index: target.index };
  let secs = sections;
  const sel = selectedId ? locate(secs, selectedId) : null;
  if (kind === 'section') {
    const idx = sel ? secs.findIndex((s) => s.id === sel.path[0].id) + 1 : secs.length;
    return { sections: secs, parentId: null as string | null, index: idx };
  }
  if (!secs.length) secs = [makeSection([makeRow([12])])];
  let sec = sel ? locate(secs, sel.path[0].id)!.node : secs[secs.length - 1];
  if (kind === 'row') {
    const rows = sec.children || [];
    const rowNode = sel && sel.path[1];
    return { sections: secs, parentId: sec.id as string | null, index: rowNode ? rows.findIndex((r) => r.id === rowNode.id) + 1 : rows.length };
  }
  if (sel && sel.node.kind === 'el') return { sections: secs, parentId: sel.parent!.id as string | null, index: sel.index + 1 };
  if (!(sec.children || []).length) {
    secs = insertNode(secs, sec.id, 0, makeRow([12]));
    sec = locate(secs, sec.id)!.node;
  }
  const rows = sec.children || [];
  const row = sel && sel.node.kind === 'row' ? sel.node : sel && sel.node.kind === 'col' ? sel.parent! : rows[rows.length - 1];
  const col = sel && sel.node.kind === 'col' ? sel.node : (row.children || [])[0];
  return { sections: secs, parentId: col.id as string | null, index: (col.children || []).length };
}

export const useStore = create<State>((set, get) => {
  const scheduleSave = () => {
    clearTimeout(saveTimer);
    set({ status: 'saving' });
    saveTimer = setTimeout(() => {
      saveDoc(get().doc);
      setLastId(get().doc.id);
      set({ status: 'saved', library: listDocs() });
    }, 450);
  };
  const flush = () => { clearTimeout(saveTimer); saveDoc(get().doc); setLastId(get().doc.id); };

  const mutate = (fn: (d: EmailDoc) => EmailDoc, key = '') => {
    const s = get();
    const next = fn(s.doc);
    if (next === s.doc) return;
    const coalesce = !!key && key === s.lastKey && Date.now() - s.lastAt < 900;
    set({
      doc: { ...next, updatedAt: Date.now() },
      past: coalesce ? s.past : [...s.past.slice(-99), s.doc],
      future: [], lastKey: key, lastAt: Date.now()
    });
    scheduleSave();
  };

  const load = (doc: EmailDoc) => {
    set({ doc, selectedId: null, past: [], future: [], lastKey: '', view: 'design', drag: null });
    flush();
    set({ status: 'saved', library: listDocs() });
  };

  const insertMany = (nodes: Node[], kind: 'section' | 'row' | 'el', target?: DropTarget | null) => {
    mutate((d) => {
      const slot = resolveSlot(d.sections, kind, get().selectedId, target);
      let secs = slot.sections;
      nodes.forEach((n, i) => { secs = insertNode(secs, slot.parentId, slot.index + i, n); });
      return { ...d, sections: secs };
    });
    set({ selectedId: nodes[0].id });
  };

  return {
    ready: false,
    doc: createDoc(),
    selectedId: null,
    view: 'design',
    device: 'desktop',
    past: [], future: [], lastKey: '', lastAt: 0,
    library: [],
    status: 'saved',
    toast: null,
    drag: null,
    dialog: null,

    init: () => {
      if (get().ready) return;
      const last = getLastId();
      let doc = last ? normalizeDoc(loadDoc(last)) : null;
      if (!doc) {
        const existing = listDocs()[0];
        doc = (existing && normalizeDoc(loadDoc(existing.id))) || createDoc(TEMPLATES.find((t) => t.id === 'newsletter'), 'Weekly newsletter');
      }
      set({ doc, ready: true });
      saveDoc(doc);
      set({ library: listDocs() });
    },

    notify: (msg, opts) => set({ toast: { id: Date.now(), msg, kind: opts?.kind ?? 'info', action: opts?.action } }),
    setView: (view) => set({ view }),
    setDevice: (device) => set({ device }),
    select: (selectedId) => set({ selectedId }),
    selectParent: () => {
      const { doc, selectedId } = get();
      const loc = selectedId ? locate(doc.sections, selectedId) : null;
      set({ selectedId: loc?.parent ? loc.parent.id : null });
    },
    setDrag: (drag) => set({ drag }),
    setDialog: (dialog) => set({ dialog }),

    patchNode: (id, patch, key, base = false) => {
      const mobile = get().device === 'mobile' && !base;
      mutate(
        (d) => ({ ...d, sections: mapNode(d.sections, id, (n) => (mobile ? { ...n, mobile: { ...(n.mobile || {}), ...patch } } : { ...n, props: { ...n.props, ...patch } })) }),
        key ?? `${id}:${Object.keys(patch).join(',')}${mobile ? ':m' : ''}`
      );
    },

    resetMobile: (id, keys) =>
      mutate((d) => ({
        ...d,
        sections: mapNode(d.sections, id, (n) => {
          if (!keys) { const { mobile: _drop, ...rest } = n; return rest as Node; }
          const m = { ...(n.mobile || {}) };
          keys.forEach((k) => delete m[k]);
          return { ...n, mobile: Object.keys(m).length ? m : undefined };
        })
      })),

    toggleHide: (id, device) =>
      mutate((d) => ({ ...d, sections: mapNode(d.sections, id, (n) => ({ ...n, hide: { ...(n.hide || {}), [device]: !n.hide?.[device] } })) })),

    mobileOnlyCopy: (id) => {
      const loc = locate(get().doc.sections, id);
      if (!loc) return;
      const copy: Node = { ...cloneFresh(loc.node), hide: { desktop: true } };
      mutate((d) => {
        let secs = mapNode(d.sections, id, (n) => ({ ...n, hide: { ...(n.hide || {}), mobile: true } }));
        secs = insertNode(secs, loc.parent ? loc.parent.id : null, loc.index + 1, copy);
        return { ...d, sections: secs };
      });
      set({ selectedId: copy.id, device: 'mobile' });
      get().notify('Mobile-only copy created. You’re now editing the mobile layout.', { kind: 'success' });
    },

    removeNode: (id) => {
      const loc = locate(get().doc.sections, id);
      const label = loc ? (loc.node.kind === 'el' ? DEFS[loc.node.type!]?.label ?? 'element' : loc.node.kind === 'col' ? 'column' : loc.node.kind) : 'item';
      mutate((d) => ({ ...d, sections: prune(removeNode(d.sections, id)) }));
      if (!locate(get().doc.sections, get().selectedId || '')) set({ selectedId: null });
      if (loc) get().notify(`Deleted ${label.toLowerCase()}`, { action: { label: 'Undo', run: () => get().undo() } });
    },

    duplicateNode: (id) => {
      const loc = locate(get().doc.sections, id);
      if (!loc) return;
      const copy = cloneFresh(loc.node);
      mutate((d) => ({ ...d, sections: insertNode(d.sections, loc.parent ? loc.parent.id : null, loc.index + 1, copy) }));
      set({ selectedId: copy.id });
      get().notify('Duplicated', { kind: 'success' });
    },

    moveSibling: (id, dir) => {
      const loc = locate(get().doc.sections, id);
      if (!loc) return;
      const to = loc.index + dir;
      if (to < 0 || to >= loc.siblings.length) return;
      get().moveNode(id, loc.parent ? loc.parent.id : null, dir > 0 ? to + 1 : to);
    },

    moveNode: (id, parentId, index) =>
      mutate((d) => {
        const loc = locate(d.sections, id);
        if (!loc) return d;
        if (parentId && locate([loc.node], parentId)) return d; // can't move into itself
        const sameParent = (loc.parent ? loc.parent.id : null) === parentId;
        const idx = sameParent && loc.index < index ? index - 1 : index;
        if (sameParent && idx === loc.index) return d;
        const secs = prune(insertNode(removeNode(d.sections, id), parentId, idx, loc.node));
        return { ...d, sections: secs };
      }),

    setRowLayout: (rowId, spans) =>
      mutate((d) => ({
        ...d,
        sections: mapNode(d.sections, rowId, (row) => {
          let cols = [...(row.children || [])];
          const n = spans.length;
          if (cols.length > n) {
            const keep = cols.slice(0, n);
            const extra = cols.slice(n);
            keep[n - 1] = { ...keep[n - 1], children: [...(keep[n - 1].children || []), ...extra.flatMap((c) => c.children || [])] };
            cols = keep;
          }
          while (cols.length < n) cols.push(makeCol(12));
          return { ...row, children: cols.map((c, i) => ({ ...c, props: { ...c.props, span: spans[i] } })) };
        })
      })),

    addFromAction: (action, target) => {
      if (action.kind === 'el') return insertMany([makeEl(action.type, action.preset)], 'el', target);
      if (action.kind === 'layout') return insertMany(action.rows.map((spans) => makeRow(spans)), 'row', target);
      if (action.kind === 'section') return insertMany([action.build()], 'section', target);
      // shape: goes on a container, never into the flow
      const { doc, selectedId, device } = get();
      let containerId = target?.parentId ?? null;
      if (!containerId) {
        const sel = selectedId ? locate(doc.sections, selectedId) : null;
        containerId = sel ? (sel.node.kind === 'el' ? sel.parent!.id : sel.node.id) : doc.sections[0]?.id ?? null;
      }
      const loc = containerId ? locate(doc.sections, containerId) : null;
      if (!loc) return get().notify('Add a section first, then drop a shape onto it.');
      const shape: Shape = newShape({ ...action.shape, ...(target?.pct ? (action.shape.kind === 'band' ? { pos: Math.round(target.pct.y) } : { x: Math.round(target.pct.x), y: Math.round(target.pct.y) }) : {}) });
      const current: Shape[] = (propsFor(loc.node, device).shapes as Shape[]) || [];
      get().patchNode(loc.node.id, { shapes: [...current, shape] });
      set({ selectedId: loc.node.id });
      get().notify('Shape added. Drag its handle on the canvas to move it.');
    },

    patchBrand: (patch) => mutate((d) => ({ ...d, brand: { ...d.brand, ...patch } }), `brand:${Object.keys(patch).join(',')}`),
    patchMeta: (patch) => mutate((d) => ({ ...d, ...patch }), `meta:${Object.keys(patch).join(',')}`),

    undo: () => {
      const { past, doc, future } = get();
      if (!past.length) return;
      set({ doc: past[past.length - 1], past: past.slice(0, -1), future: [doc, ...future], lastKey: '' });
      scheduleSave();
    },
    redo: () => {
      const { past, doc, future } = get();
      if (!future.length) return;
      set({ doc: future[0], future: future.slice(1), past: [...past, doc], lastKey: '' });
      scheduleSave();
    },

    newDoc: (templateId) => {
      flush();
      const t = TEMPLATES.find((x) => x.id === templateId) ?? TEMPLATES[0];
      load(createDoc(t, t.id === 'blank' ? 'Untitled email' : t.label));
      get().notify(t.id === 'blank' ? 'New blank email' : `New “${t.label}” email started`, { kind: 'success' });
    },
    openDoc: (id) => { flush(); const doc = normalizeDoc(loadDoc(id)); if (doc) load(doc); },
    duplicateDoc: (id) => {
      flush();
      const src = normalizeDoc(loadDoc(id));
      if (!src) return;
      load({ ...src, id: uid('doc'), name: `${src.name} copy`, createdAt: Date.now() });
    },
    deleteDoc: (id) => {
      const current = get().doc.id === id;
      removeDoc(id);
      if (current) {
        const next = listDocs()[0];
        const doc = next ? normalizeDoc(loadDoc(next.id)) : null;
        load(doc ?? createDoc(TEMPLATES[0]));
      } else set({ library: listDocs() });
      get().notify('Email deleted');
    },
    importDoc: (doc) => { flush(); load({ ...doc, id: uid('doc') }); }
  };
});

export const selectedNode = (s: State): Node | null => (s.selectedId ? locate(s.doc.sections, s.selectedId)?.node ?? null : null);
export { DEFS };
