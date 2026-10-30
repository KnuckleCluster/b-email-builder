import type { DocMeta, EmailDoc } from './types';

const IDX = 'srmail:index';
const LAST = 'srmail:last';
const key = (id: string) => `srmail:doc:${id}`;

function read<T>(k: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(k: string, v: unknown) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage full or blocked */ }
}

export const listDocs = (): DocMeta[] => read<DocMeta[]>(IDX, []).sort((a, b) => b.updatedAt - a.updatedAt);
export const loadDoc = (id: string): EmailDoc | null => read<EmailDoc | null>(key(id), null);
export const getLastId = (): string | null => { try { return localStorage.getItem(LAST); } catch { return null; } };
export const setLastId = (id: string) => { try { localStorage.setItem(LAST, id); } catch { /* ignore */ } };

export function saveDoc(doc: EmailDoc) {
  write(key(doc.id), doc);
  const idx = read<DocMeta[]>(IDX, []).filter((d) => d.id !== doc.id);
  idx.push({ id: doc.id, name: doc.name, updatedAt: doc.updatedAt, blocks: doc.sections.length });
  write(IDX, idx);
}

export function removeDoc(id: string) {
  try { localStorage.removeItem(key(id)); } catch { /* ignore */ }
  write(IDX, read<DocMeta[]>(IDX, []).filter((d) => d.id !== id));
}
