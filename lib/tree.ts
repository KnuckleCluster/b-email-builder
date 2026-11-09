import type { Node, NodeKind } from './types';

export const uid = (p = 'n') => `${p}_${Math.random().toString(36).slice(2, 9)}`;

/** Which kind of node a given kind lives inside. */
export const PARENT_KIND: Record<NodeKind, NodeKind | null> = { section: null, row: 'section', col: 'row', el: 'col' };
export const CHILD_KIND: Record<NodeKind, NodeKind | null> = { section: 'row', row: 'col', col: 'el', el: null };

export interface Loc { node: Node; parent: Node | null; index: number; siblings: Node[]; path: Node[] }

export function locate(nodes: Node[], id: string, parent: Node | null = null, path: Node[] = []): Loc | null {
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.id === id) return { node: n, parent, index: i, siblings: nodes, path: [...path, n] };
    if (n.children) {
      const r = locate(n.children, id, n, [...path, n]);
      if (r) return r;
    }
  }
  return null;
}

export function mapNode(nodes: Node[], id: string, fn: (n: Node) => Node): Node[] {
  let changed = false;
  const out = nodes.map((n) => {
    if (n.id === id) { changed = true; return fn(n); }
    if (!n.children) return n;
    const kids = mapNode(n.children, id, fn);
    if (kids === n.children) return n;
    changed = true;
    return { ...n, children: kids };
  });
  return changed ? out : nodes;
}

export function removeNode(nodes: Node[], id: string): Node[] {
  let changed = false;
  const out: Node[] = [];
  for (const n of nodes) {
    if (n.id === id) { changed = true; continue; }
    if (n.children) {
      const kids = removeNode(n.children, id);
      if (kids !== n.children) { changed = true; out.push({ ...n, children: kids }); continue; }
    }
    out.push(n);
  }
  return changed ? out : nodes;
}

/** Insert `node` as a child of `parentId` (null = top level) at `index`. */
export function insertNode(nodes: Node[], parentId: string | null, index: number, node: Node): Node[] {
  if (parentId === null) {
    const out = [...nodes];
    out.splice(Math.max(0, Math.min(index, out.length)), 0, node);
    return out;
  }
  return mapNode(nodes, parentId, (p) => {
    const kids = [...(p.children || [])];
    kids.splice(Math.max(0, Math.min(index, kids.length)), 0, node);
    return { ...p, children: kids };
  });
}

/** Deep copy with fresh ids. */
export function cloneFresh(n: Node): Node {
  return {
    ...n,
    id: uid(n.kind[0]),
    props: JSON.parse(JSON.stringify(n.props)),
    ...(n.mobile ? { mobile: JSON.parse(JSON.stringify(n.mobile)) } : {}),
    ...(n.hide ? { hide: { ...n.hide } } : {}),
    ...(n.children ? { children: n.children.map(cloneFresh) } : {})
  };
}

export function walk(nodes: Node[], cb: (n: Node, parent: Node | null, path: Node[]) => void, parent: Node | null = null, path: Node[] = []) {
  nodes.forEach((n) => {
    const p = [...path, n];
    cb(n, parent, p);
    if (n.children) walk(n.children, cb, n, p);
  });
}

export const isContainer = (n: Node) => n.kind !== 'el';
