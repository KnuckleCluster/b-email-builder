'use client';

import { BookmarkPlus, ChevronRight, CopyPlus, Smartphone, Trash2 } from 'lucide-react';
import { fixImageUrl } from '@/lib/urlfix';
import { useStore, selectedNode } from '@/lib/store';
import { COL_FIELDS, DEFS, ROW_FIELDS, SECTION_FIELDS, elementCommon, type Field } from '@/lib/registry';
import { LAYOUTS } from '@/lib/nodes';
import { FONTS } from '@/lib/theme';
import { propsFor } from '@/lib/render';
import { locate } from '@/lib/tree';
import { FieldControl, Row } from './fields/FieldControls';
import { nodeLabel } from './Canvas';

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="section" open={defaultOpen}>
      <summary>{title}</summary>
      <div className="sectionbody">{children}</div>
    </details>
  );
}

const PAD_KEYS = ['padTop', 'padRight', 'padBottom', 'padLeft', 'padX', 'padY'];
const keysOf = (f: Field) => (f.kind === 'spacing' ? PAD_KEYS : [f.key]);
const SINGLE_ROW_LAYOUTS = LAYOUTS.filter((l) => l.rows.length === 1);

function RowLayout({ spans, rowId }: { spans: number[]; rowId: string }) {
  return (
    <div className="layouts">
      {SINGLE_ROW_LAYOUTS.map((l) => {
        const on = l.rows[0].length === spans.length && l.rows[0].every((s, i) => s === spans[i]);
        return (
          <button key={l.key} type="button" className={`layoutbtn ${on ? 'on' : ''}`} title={l.label} aria-label={l.label} aria-pressed={on} onClick={() => useStore.getState().setRowLayout(rowId, l.rows[0])}>
            {l.rows[0].map((s, i) => <span key={i} style={{ flex: s }} />)}
          </button>
        );
      })}
    </div>
  );
}

function Breadcrumb({ id }: { id: string }) {
  const doc = useStore((s) => s.doc);
  const loc = locate(doc.sections, id);
  if (!loc) return null;
  return (
    <nav className="crumbs" aria-label="Selection path">
      <button onClick={() => useStore.getState().select(null)}>Email</button>
      {loc.path.map((n, i) => (
        <span key={n.id} className="crumb">
          <ChevronRight size={12} />
          <button aria-current={i === loc.path.length - 1} onClick={() => useStore.getState().select(n.id)}>{nodeLabel(n)}</button>
        </span>
      ))}
    </nav>
  );
}

function NodeInspector() {
  const node = useStore(selectedNode)!;
  const device = useStore((s) => s.device);
  const { patchNode, resetMobile, toggleHide, mobileOnlyCopy, removeNode, duplicateNode, setDevice } = useStore.getState();
  const mobile = device === 'mobile';
  const eff = propsFor(node, device);
  const ov = node.mobile || {};
  const hasOv = Object.keys(ov).length > 0;

  let fields: Field[];
  if (node.kind === 'el') fields = [...DEFS[node.type!].fields, ...elementCommon(node.type!)];
  else fields = node.kind === 'section' ? SECTION_FIELDS : node.kind === 'row' ? ROW_FIELDS : COL_FIELDS;
  const content = fields.filter((f) => (f.group ?? 'Content') === 'Content');
  const style = fields.filter((f) => f.group === 'Style');
  const shapes = fields.filter((f) => f.group === 'Shapes');

  const render = (f: Field) => {
    const ks = keysOf(f);
    return (
      <FieldControl
        key={f.key} field={f} props={eff}
        onChange={(v) => patchNode(node.id, { [f.key]: v })}
        onPatch={(p) => patchNode(node.id, p)}
        overridden={mobile && ks.some((k) => k in ov)}
        onReset={() => resetMobile(node.id, ks)}
      />
    );
  };

  const spans = node.kind === 'row' ? (node.children || []).map((c) => Number(c.props.span) || 1) : [];

  return (
    <>
      <Breadcrumb id={node.id} />
      <div className="insp-title">
        <h2>{nodeLabel(node)}</h2>
        <div className="insp-actions">
          {node.kind === 'section' && <button className="icon-btn" aria-label="Save to My sections" title="Save to My sections" onClick={() => useStore.getState().setDialog('saveSection')}><BookmarkPlus size={16} /></button>}
          <button className="icon-btn" aria-label="Duplicate" title="Duplicate" onClick={() => duplicateNode(node.id)}><CopyPlus size={16} /></button>
          <button className="icon-btn danger" aria-label="Delete" title="Delete" onClick={() => removeNode(node.id)}><Trash2 size={16} /></button>
        </div>
      </div>

      {mobile ? (
        <div className="devbanner">
          <Smartphone size={15} />
          <span>Editing the <strong>mobile</strong> layout. Changes here only affect phones.</span>
          {hasOv && <button className="linklike" onClick={() => resetMobile(node.id)}>Reset all</button>}
        </div>
      ) : (
        hasOv && (
          <div className="devbanner info">
            <Smartphone size={15} />
            <span>This {nodeLabel(node).toLowerCase()} has mobile overrides.</span>
            <button className="linklike" onClick={() => setDevice('mobile')}>Edit mobile</button>
          </div>
        )
      )}

      {node.kind === 'row' && (
        <Section title="Columns">
          <RowLayout spans={spans} rowId={node.id} />
          <p className="fhint">Switch the column layout. Extra columns merge into the last one.</p>
        </Section>
      )}

      <Section title="Visibility" defaultOpen={false}>
        <label className="switch">
          <input type="checkbox" role="switch" checked={!node.hide?.desktop} onChange={() => toggleHide(node.id, 'desktop')} />
          <span className="track" aria-hidden="true" /> Show on desktop
        </label>
        <label className="switch">
          <input type="checkbox" role="switch" checked={!node.hide?.mobile} onChange={() => toggleHide(node.id, 'mobile')} />
          <span className="track" aria-hidden="true" /> Show on mobile
        </label>
        <button className="btn btn-block" onClick={() => mobileOnlyCopy(node.id)}>Create mobile-only copy</button>
        <p className="fhint">A mobile-only copy hides this on phones and adds an editable twin that only shows on phones.</p>
      </Section>

      {content.length > 0 && <Section title="Content">{content.map(render)}</Section>}
      {style.length > 0 && <Section title={node.kind === 'el' ? 'Size, position & style' : 'Style & spacing'} defaultOpen={node.type !== 'text' || mobile}>{style.map(render)}</Section>}
      {shapes.length > 0 && <Section title="Shapes (behind content)">{shapes.map(render)}</Section>}
    </>
  );
}

function SettingsInspector() {
  const doc = useStore((s) => s.doc);
  const { patchBrand, patchMeta } = useStore.getState();
  const b = doc.brand;
  return (
    <>
      <div className="insp-title"><h2>Email settings</h2></div>
      <Section title="Delivery">
        <Row label="Subject line"><input className="input" value={doc.subject} placeholder="What readers see in their inbox" onChange={(e) => patchMeta({ subject: e.target.value })} /></Row>
        <Row label="Preheader" hint="The preview text shown after the subject."><input className="input" value={doc.preheader} onChange={(e) => patchMeta({ preheader: e.target.value })} /></Row>
      </Section>
      <Section title="Brand colors">
        {([['primary', 'Primary'], ['secondary', 'Secondary'], ['text', 'Text'], ['muted', 'Muted text'], ['surface', 'Email background'], ['page', 'Page background']] as const).map(([k, label]) => (
          <Row key={k} label={label}>
            <div className="colorrow">
              <input type="color" aria-label={`${label} color`} value={b[k]} onChange={(e) => patchBrand({ [k]: e.target.value.toUpperCase() })} />
              <input className="input mono" value={b[k]} onChange={(e) => patchBrand({ [k]: e.target.value })} aria-label={`${label} hex`} />
            </div>
          </Row>
        ))}
        <p className="fhint">Anything using a brand color updates everywhere when you change these.</p>
      </Section>
      <Section title="Typography & layout">
        <Row label="Body font">
          <select className="input" value={b.font} onChange={(e) => patchBrand({ font: e.target.value })}>{Object.entries(FONTS).map(([k, f]) => <option key={k} value={k}>{f.label}</option>)}</select>
        </Row>
        <Row label="Heading font">
          <select className="input" value={b.headingFont} onChange={(e) => patchBrand({ headingFont: e.target.value })}>{Object.entries(FONTS).map(([k, f]) => <option key={k} value={k}>{f.label}</option>)}</select>
        </Row>
        <Row label="Email width">
          <div className="range"><input type="range" min={480} max={700} step={10} value={b.width} onChange={(e) => patchBrand({ width: +e.target.value })} /><span className="rval">{b.width}px</span></div>
        </Row>
        <Row label="Mobile side padding" hint="Replaces each section’s left/right padding on phones.">
          <div className="range"><input type="range" min={0} max={32} value={b.mobilePad ?? 16} onChange={(e) => patchBrand({ mobilePad: +e.target.value })} /><span className="rval">{b.mobilePad ?? 16}px</span></div>
        </Row>
        <Row label="Button corner radius">
          <div className="range"><input type="range" min={0} max={40} value={b.radius} onChange={(e) => patchBrand({ radius: +e.target.value })} /><span className="rval">{b.radius}px</span></div>
        </Row>
      </Section>
      <Section title="Badge">
        <label className="switch">
          <input type="checkbox" role="switch" checked={doc.badge !== false} onChange={(e) => patchMeta({ badge: e.target.checked })} />
          <span className="track" aria-hidden="true" /> Show “Made with Branded Email Maker”
        </label>
        <p className="fhint">A small gradient badge under your email. It’s on by default and you can turn it off any time.</p>
      </Section>
      <Section title="Identity">
        <Row label="Company name"><input className="input" value={b.companyName} onChange={(e) => patchBrand({ companyName: e.target.value })} /></Row>
        <Row label="Logo URL" hint="Used by Logo elements."><input
          className="input" value={b.logoUrl} placeholder="https://" onChange={(e) => patchBrand({ logoUrl: e.target.value })}
          onBlur={(e) => { const r = fixImageUrl(e.target.value); if (r.changed) { patchBrand({ logoUrl: r.url }); if (r.note) useStore.getState().notify(r.note, { kind: 'success' }); } }}
        /></Row>
      </Section>
    </>
  );
}

export default function Inspector() {
  const hasSel = useStore((s) => !!selectedNode(s));
  return <aside className="inspector" aria-label="Properties">{hasSel ? <NodeInspector /> : <SettingsInspector />}</aside>;
}
