'use client';

import { useMemo } from 'react';
import { useState } from 'react';
import { Info, Mail, TriangleAlert } from 'lucide-react';
import InboxPreview from './InboxPreview';
import CopyButton from './CopyButton';
import { useStore } from '@/lib/store';
import { documentToHtml, lintDoc } from '@/lib/render';

export function CodeView() {
  const doc = useStore((s) => s.doc);
  const html = useMemo(() => documentToHtml(doc), [doc]);
  const checks = useMemo(() => lintDoc(doc), [doc]);
  const lines = useMemo(() => html.split('\n'), [html]);
  return (
    <div className="codeview">
      <div className="codebar">
        <span>{lines.length} lines · {(new Blob([html]).size / 1024).toFixed(1)} KB · read-only (edit with blocks)</span>
        <CopyButton getText={() => html} />
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
  const [mode, setMode] = useState<'email' | 'inbox'>('email');
  const html = useMemo(() => documentToHtml(doc), [doc]);
  return (
    <div className="previewwrap">
      <div className="previewbar">
        <div className="segmented" role="group" aria-label="Preview type">
          <button aria-pressed={mode === 'email'} onClick={() => setMode('email')}>Email</button>
          <button aria-pressed={mode === 'inbox'} onClick={() => setMode('inbox')}>Inbox</button>
        </div>
        <button className="btn btn-accent" onClick={() => useStore.getState().setDialog('test')}><Mail size={15} /> Send test</button>
      </div>
      {mode === 'email' ? (
        <iframe
          className={`previewframe ${device === 'mobile' ? 'mobile' : ''}`}
          title="Email preview" srcDoc={html}
          sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        />
      ) : (
        <InboxPreview />
      )}
    </div>
  );
}
