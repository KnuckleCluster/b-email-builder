'use client';

import { useMemo } from 'react';
import { Copy, Info, TriangleAlert } from 'lucide-react';
import { useStore } from '@/lib/store';
import { documentToHtml, lintDoc } from '@/lib/render';
import { copyText } from '@/lib/docs';

export function CodeView() {
  const doc = useStore((s) => s.doc);
  const html = useMemo(() => documentToHtml(doc), [doc]);
  const checks = useMemo(() => lintDoc(doc), [doc]);
  const lines = useMemo(() => html.split('\n'), [html]);
  return (
    <div className="codeview">
      <div className="codebar">
        <span>{lines.length} lines · {(new Blob([html]).size / 1024).toFixed(1)} KB · read-only (edit with blocks)</span>
        <button className="btn" onClick={async () => useStore.getState().notify((await copyText(html)) ? 'HTML copied' : 'Couldn’t copy. Select the code manually.')}>
          <Copy size={14} /> Copy HTML
        </button>
      </div>
      {checks.length > 0 && (
        <div className="checks" role="status">
          {checks.slice(0, 5).map((c, i) => (
            <div className={`check ${c.level}`} key={i}>
              {c.level === 'warn' ? <TriangleAlert size={14} /> : <Info size={14} />}
              <span>{c.msg}</span>
            </div>
          ))}
          {checks.length > 5 && <div className="check info"><Info size={14} /><span>+{checks.length - 5} more in the export dialog.</span></div>}
        </div>
      )}
      <pre className="codepre"><code>{lines.map((l, i) => <span className="ln" key={i}>{l || ' '}</span>)}</code></pre>
    </div>
  );
}

export function PreviewView() {
  const doc = useStore((s) => s.doc);
  const device = useStore((s) => s.device);
  const html = useMemo(() => documentToHtml(doc), [doc]);
  return (
    <div className="previewwrap">
      <iframe
        className={`previewframe ${device === 'mobile' ? 'mobile' : ''}`}
        title="Email preview" srcDoc={html}
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      />
    </div>
  );
}
