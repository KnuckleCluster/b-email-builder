import type { BlockType, EmailDoc, Node, NodeKind, Props } from './types';
import { DEFAULT_BRAND } from './theme';
import { DEFS } from './registry';
import { COL_DEFAULTS, ROW_DEFAULTS, SECTION_DEFAULTS, makeCol, makeEl, simpleSection } from './nodes';
import { CHILD_KIND, uid } from './tree';
import { decodeMarker } from './render';
import type { Template } from './templates';

export function createDoc(template?: Template, name = 'Untitled email'): EmailDoc {
  const now = Date.now();
  return {
    id: uid('doc'), name, subject: '', preheader: '',
    brand: { ...DEFAULT_BRAND }, sections: template ? template.build() : [], createdAt: now, updatedAt: now
  };
}

const KIND_DEFAULTS: Record<string, () => Props> = { section: SECTION_DEFAULTS, row: ROW_DEFAULTS, col: COL_DEFAULTS };

function normNode(raw: any, kind: NodeKind): Node | null {
  if (!raw || typeof raw !== 'object') return null;
  const extra = {
    ...(raw.mobile && typeof raw.mobile === 'object' && Object.keys(raw.mobile).length ? { mobile: raw.mobile } : {}),
    ...(raw.hide && typeof raw.hide === 'object' ? { hide: raw.hide } : {})
  };
  const id = typeof raw.id === 'string' ? raw.id : uid(kind[0]);
  if (kind === 'el') {
    if (!(raw.type in DEFS)) return null;
    const base = makeEl(raw.type as BlockType);
    return { ...base, id, props: { ...base.props, ...(raw.props || {}) }, ...extra };
  }
  const childKind = CHILD_KIND[kind]!;
  let children = (Array.isArray(raw.children) ? raw.children : []).map((c: any) => normNode(c, childKind)).filter(Boolean) as Node[];
  if (kind === 'row' && children.length === 0) children = [makeCol(12)];
  return { id, kind, props: { ...KIND_DEFAULTS[kind](), ...(raw.props || {}) }, children, ...extra };
}

/** v0.1 / v0.2 documents were a flat list of blocks: each becomes a section > row > column > element. */
function migrateBlock(b: any): Node | null {
  if (!b || typeof b !== 'object' || !(b.type in DEFS)) return null;
  const props: Props = { ...(b.props || {}) };
  const mob: Props = { ...(b.mobile || {}) };
  const pad = (p: Props) => ({
    padTop: p.padTop ?? p.padY ?? 16, padRight: p.padRight ?? p.padX ?? 24,
    padBottom: p.padBottom ?? p.padY ?? 16, padLeft: p.padLeft ?? p.padX ?? 24
  });
  const ownBg = b.type === 'button'; // a button's bg is its own colour, not the row background
  const secProps: Props = { ...pad(props), bg: ownBg ? '' : props.bg || '', bgImage: props.bgImage || '' };
  const secMobile: Props = {};
  if (['padTop', 'padRight', 'padBottom', 'padLeft', 'padX', 'padY'].some((k) => k in mob)) Object.assign(secMobile, pad({ ...props, ...mob }));
  ['bg', 'bgImage'].forEach((k) => { if (k in mob && !(ownBg && k === 'bg')) secMobile[k] = mob[k]; });
  ['padTop', 'padRight', 'padBottom', 'padLeft', 'padX', 'padY', 'bg', 'bgImage'].forEach((k) => {
    if (ownBg && k === 'bg') return;
    delete props[k]; delete mob[k];
  });
  const base = makeEl(b.type as BlockType);
  const el: Node = { ...base, props: { ...base.props, ...props, padTop: 0, padRight: 0, padBottom: 0, padLeft: 0 } };
  if (Object.keys(mob).length) el.mobile = mob;
  const sec = simpleSection([el], secProps);
  if (Object.keys(secMobile).length) sec.mobile = secMobile;
  if (b.hide && typeof b.hide === 'object') sec.hide = b.hide;
  return sec;
}

/** Validate + repair an unknown object into an EmailDoc (returns null if it isn't one). */
export function normalizeDoc(raw: any): EmailDoc | null {
  if (!raw || typeof raw !== 'object') return null;
  let sections: Node[];
  if (Array.isArray(raw.sections)) sections = raw.sections.map((s: any) => normNode(s, 'section')).filter(Boolean) as Node[];
  else if (Array.isArray(raw.blocks)) sections = raw.blocks.map(migrateBlock).filter(Boolean) as Node[];
  else return null;
  const now = Date.now();
  return {
    id: typeof raw.id === 'string' ? raw.id : uid('doc'),
    name: String(raw.name || 'Imported email'),
    subject: String(raw.subject || ''),
    preheader: String(raw.preheader || ''),
    brand: { ...DEFAULT_BRAND, ...(raw.brand || {}) },
    sections,
    createdAt: Number(raw.createdAt) || now,
    updatedAt: now
  };
}

/** Accepts an exported .html (with the SRMAIL marker) or a backup .json. */
export function parseImport(text: string): EmailDoc | null {
  const fromMarker = decodeMarker(text);
  if (fromMarker) return normalizeDoc(fromMarker);
  try {
    const obj = JSON.parse(text);
    if (obj && obj.srmail && obj.doc) return normalizeDoc(obj.doc);
  } catch { /* not json */ }
  return null;
}

export function backupJson(doc: EmailDoc): string {
  return JSON.stringify({ srmail: 2, doc }, null, 2);
}

export function slug(s: string) {
  return (s || 'email').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'email';
}

export function download(filename: string, content: string, mime = 'text/html') {
  const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { /* ignore */ }
    ta.remove();
    return ok;
  }
}
