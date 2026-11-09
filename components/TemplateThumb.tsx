'use client';

import type { Template } from '@/lib/templates';
import { previewHtml } from '@/lib/previews';

/** A live, scaled-down render of a template. */
export default function TemplateThumb({ t, width = 264, height = 380 }: { t: Template; width?: number; height?: number }) {
  const scale = width / 600;
  return (
    <div className="thumb" style={{ width, height }} aria-hidden="true">
      <iframe
        title={`${t.label} preview`} srcDoc={previewHtml(t)} sandbox="" tabIndex={-1} loading="lazy" scrolling="no"
        style={{ width: 600, height: height / scale, transform: `scale(${scale})` }}
      />
    </div>
  );
}
