import type { Template } from './templates';
import { createDoc } from './docs';
import { documentToHtml } from './render';

const cache = new Map<string, string>();

/** Rendered HTML of a template (no badge), cached. Used for gallery + landing thumbnails. */
export function previewHtml(t: Template): string {
  let html = cache.get(t.id);
  if (!html) {
    html = documentToHtml({ ...createDoc(t, t.label), badge: false });
    cache.set(t.id, html);
  }
  return html;
}
