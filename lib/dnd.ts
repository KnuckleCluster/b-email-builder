import type { DragKind, DropTarget, Rect } from './types';
import { useStore } from './store';

const rectOf = (el: Element): Rect => {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
};
const all = (root: Element, sel: string) => [...root.querySelectorAll<HTMLElement>(sel)];
const midY = (el: Element) => { const r = el.getBoundingClientRect(); return r.top + r.height / 2; };

/** Every [data-nid] node under the pointer, deepest first. */
function stackAt(root: HTMLElement, x: number, y: number): HTMLElement[] {
  const out: HTMLElement[] = [];
  document.elementsFromPoint(x, y).forEach((e) => {
    if (!root.contains(e)) return;
    const n = (e as HTMLElement).closest<HTMLElement>('[data-nid]');
    if (n && root.contains(n) && !out.includes(n)) out.push(n);
  });
  return out;
}

const dist = (r: DOMRect, x: number, y: number) => {
  const dx = x < r.left ? r.left - x : x > r.right ? x - r.right : 0;
  const dy = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
  return Math.hypot(dx, dy);
};
const nearest = (els: HTMLElement[], x: number, y: number) =>
  els.slice().sort((a, b) => dist(a.getBoundingClientRect(), x, y) - dist(b.getBoundingClientRect(), x, y))[0];

/** Where would something of `kind` land if dropped at (x, y)? */
export function computeDrop(root: HTMLElement, kind: DragKind, x: number, y: number): DropTarget | null {
  const rr = root.getBoundingClientRect();
  if (x < rr.left - 80 || x > rr.right + 80) return null;
  const nodes = all(root, '[data-nid]');
  if (!nodes.length) return kind === 'shape' ? null : { kind, parentId: null, index: 0, empty: true, box: rectOf(root) };
  const stack = stackAt(root, x, y);
  const line = (r: Rect, top: number): Rect => ({ left: r.left, top: top - 2, width: r.width, height: 4 });

  if (kind === 'section') {
    const secs = all(root, '[data-k="section"][data-p="root"]');
    const index = secs.filter((e) => midY(e) < y).length;
    const top = index < secs.length ? secs[index].getBoundingClientRect().top : secs.length ? secs[secs.length - 1].getBoundingClientRect().bottom : rr.top;
    return { kind, parentId: null, index, line: line(rectOf(root), top) };
  }

  if (kind === 'row') {
    const sec = stack.find((e) => e.dataset.k === 'section') ?? nearest(all(root, '[data-k="section"]'), x, y);
    if (!sec) return { kind, parentId: null, index: 0, empty: true, box: rectOf(root) };
    const rows = all(root, `[data-k="row"][data-p="${sec.dataset.nid}"]`);
    const index = rows.filter((e) => midY(e) < y).length;
    const sr = rectOf(sec);
    const top = index < rows.length ? rows[index].getBoundingClientRect().top : rows.length ? rows[rows.length - 1].getBoundingClientRect().bottom : sr.top + 8;
    return { kind, parentId: sec.dataset.nid!, index, line: line(sr, top), box: sr };
  }

  if (kind === 'el') {
    let col = stack.find((e) => e.dataset.k === 'col');
    if (!col) {
      const container = stack.find((e) => e.dataset.k === 'row' || e.dataset.k === 'section');
      const cols = all(container ?? root, '[data-k="col"]');
      col = cols.length ? nearest(cols, x, y) : undefined;
    }
    if (!col) return { kind, parentId: null, index: 0, empty: true, box: rectOf(root) };
    const kids = all(root, `[data-k="el"][data-p="${col.dataset.nid}"]`);
    const index = kids.filter((e) => midY(e) < y).length;
    const cr = rectOf(col);
    const top = index < kids.length ? kids[index].getBoundingClientRect().top : kids.length ? kids[kids.length - 1].getBoundingClientRect().bottom : cr.top + 8;
    return { kind, parentId: col.dataset.nid!, index, line: line(cr, top), box: cr };
  }

  // shape: attaches to the deepest container under the pointer
  const c = stack.find((e) => ['col', 'row', 'section'].includes(e.dataset.k || ''));
  if (!c) return null;
  const r = c.getBoundingClientRect();
  return { kind, parentId: c.dataset.nid!, index: 0, box: rectOf(c), pct: { x: ((x - r.left) / r.width) * 100, y: ((y - r.top) / r.height) * 100 } };
}

export interface DragSpec { kind: DragKind; commit: (t: DropTarget) => void }

/**
 * Start a pointer drag. If the pointer never moves far, `onClick` runs instead
 * (so palette tiles work for both click-to-add and drag-to-place).
 */
export function startDrag(e: { clientX: number; clientY: number }, spec: DragSpec, label: string, onClick?: () => void) {
  const sx = e.clientX, sy = e.clientY;
  let active = false;
  let px = sx, py = sy;
  let timer: ReturnType<typeof setInterval> | undefined;

  const update = () => {
    const root = document.querySelector<HTMLElement>('.mail-col');
    const target = root ? computeDrop(root, spec.kind, px, py) : null;
    useStore.getState().setDrag({ label, x: px, y: py, kind: spec.kind, target });
  };
  const autoscroll = () => {
    const stage = document.querySelector<HTMLElement>('.stage');
    if (!stage) return;
    const r = stage.getBoundingClientRect();
    if (px < r.left || px > r.right) return;
    if (py < r.top + 70) stage.scrollTop -= 14;
    else if (py > r.bottom - 70) stage.scrollTop += 14;
    else return;
    update();
  };
  const cleanup = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('keydown', key);
    clearInterval(timer);
    document.body.classList.remove('is-dragging');
  };
  function move(ev: PointerEvent) {
    px = ev.clientX; py = ev.clientY;
    if (!active) {
      if (Math.hypot(px - sx, py - sy) < 6) return;
      active = true;
      document.body.classList.add('is-dragging');
      timer = setInterval(autoscroll, 30);
    }
    update();
  }
  function up() {
    cleanup();
    if (!active) { onClick?.(); return; }
    const d = useStore.getState().drag;
    useStore.getState().setDrag(null);
    if (d?.target) spec.commit(d.target);
  }
  function key(ev: KeyboardEvent) {
    if (ev.key === 'Escape') { cleanup(); useStore.getState().setDrag(null); }
  }
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('keydown', key);
}
