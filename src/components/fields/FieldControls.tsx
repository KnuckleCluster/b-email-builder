'use client';

import { useState } from 'react';
import { Image as ImageIcon, AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, Link2, Link2Off, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import type { Field } from '@/lib/registry';
import type { Props } from '@/lib/types';
import { BRAND_TOKENS, resolveColor } from '@/lib/theme';
import { useStore } from '@/lib/store';
import { fixImageUrl, isImageKey } from '@/lib/urlfix';

type OnChange = (value: any) => void;

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label className="flabel">{label}</label>
      {children}
      {hint && <p className="fhint">{hint}</p>}
    </div>
  );
}

function ColorControl({ value, onChange, allowNone }: { value: string; onChange: OnChange; allowNone?: boolean }) {
  const brand = useStore((s) => s.doc.brand);
  const hex = resolveColor(value, brand, '#ffffff');
  const isToken = !!value && value.startsWith('@');
  return (
    <div className="color">
      <div className="swatches">
        {allowNone && (
          <button type="button" className={`sw none ${!value ? 'on' : ''}`} title="None" onClick={() => onChange('')} aria-label="No color" />
        )}
        {BRAND_TOKENS.map((t) => (
          <button
            key={t.token} type="button" title={`Brand · ${t.label}`} aria-label={`Brand ${t.label}`}
            className={`sw ${value === t.token ? 'on' : ''}`} style={{ background: String(brand[t.key]) }}
            onClick={() => onChange(t.token)}
          />
        ))}
        <button type="button" title="White" aria-label="White" className={`sw ${value?.toLowerCase() === '#ffffff' ? 'on' : ''}`} style={{ background: '#fff' }} onClick={() => onChange('#FFFFFF')} />
      </div>
      <div className="colorrow">
        <input type="color" aria-label="Pick a custom color" value={/^#[0-9a-f]{6}$/i.test(hex) ? hex : '#ffffff'} onChange={(e) => onChange(e.target.value.toUpperCase())} />
        <input
          type="text" className="input mono" value={isToken ? `brand · ${BRAND_TOKENS.find((t) => t.token === value)?.label}` : value || ''}
          placeholder={allowNone ? 'none' : '#000000'} readOnly={isToken}
          onChange={(e) => onChange(e.target.value)} onFocus={(e) => isToken && e.currentTarget.select()}
          aria-label="Color value"
        />
        {isToken && (
          <button type="button" className="icon-btn" title="Detach from brand" onClick={() => onChange(hex.toUpperCase())}><X size={14} /></button>
        )}
      </div>
    </div>
  );
}

/** URL input. For image fields it fixes Drive/Dropbox/Imgur/Pexels links on paste and blur, and offers the photo picker. */
function UrlControl({ field, props, value, onChange, onPatch }: { field: { key: string }; props: Props; value: string; onChange: OnChange; onPatch?: (p: Props) => void }) {
  const image = isImageKey(field.key);
  const apply = (raw: string, announce = true) => {
    const r = fixImageUrl(raw);
    if (r.changed) {
      onChange(r.url);
      if (announce && r.note) useStore.getState().notify(r.note, { kind: 'success' });
    }
    return r.changed;
  };
  return (
    <>
      <input
        className="input" type="text" inputMode="url" value={value ?? ''} placeholder="https://"
        onChange={(e) => onChange(e.target.value)}
        onPaste={image ? (e) => { const t = e.clipboardData.getData('text'); if (fixImageUrl(t).changed) { e.preventDefault(); apply(t); } } : undefined}
        onBlur={image ? (e) => { apply(e.target.value); } : undefined}
      />
      {image && (
        <button
          type="button" className="linklike browse"
          onClick={() => useStore.getState().openPhotos((p) => {
            if (onPatch && 'alt' in props && !props.alt && (field.key === 'src' || field.key === 'image')) onPatch({ [field.key]: p.url, alt: p.alt });
            else onChange(p.url);
          })}
        >
          <ImageIcon size={13} /> Browse photos
        </button>
      )}
    </>
  );
}

function SpacingControl({ props, onPatch }: { props: Props; onPatch: (p: Props) => void }) {
  const num = (v: unknown, d: number) => (v !== '' && v != null && Number.isFinite(+v) ? +v : d);
  const v = { padTop: num(props.padTop ?? props.padY, 16), padRight: num(props.padRight ?? props.padX, 24), padBottom: num(props.padBottom ?? props.padY, 16), padLeft: num(props.padLeft ?? props.padX, 24) };
  const [linked, setLinked] = useState(v.padTop === v.padBottom && v.padLeft === v.padRight && v.padTop === v.padLeft);
  const set = (k: keyof typeof v, raw: string) => {
    const n = Math.max(0, Math.min(200, Math.round(+raw || 0)));
    onPatch(linked ? { padTop: n, padRight: n, padBottom: n, padLeft: n } : { ...v, [k]: n });
  };
  const cells: [keyof typeof v, string][] = [['padTop', 'Top'], ['padRight', 'Right'], ['padBottom', 'Bottom'], ['padLeft', 'Left']];
  return (
    <div className="spacing">
      <div className="spacing-grid">
        {cells.map(([k, label]) => (
          <label key={k} className="spacing-cell">
            <span>{label}</span>
            <input className="input" type="number" min={0} max={200} value={v[k]} onChange={(e) => set(k, e.target.value)} />
          </label>
        ))}
      </div>
      <button type="button" className={`icon-btn linkbtn ${linked ? 'on' : ''}`} aria-pressed={linked} title={linked ? 'Sides linked' : 'Sides independent'} onClick={() => setLinked(!linked)}>
        {linked ? <Link2 size={15} /> : <Link2Off size={15} />}
      </button>
    </div>
  );
}

function TableControl({ value, onChange }: { value: string[][]; onChange: OnChange }) {
  const cells = value?.length ? value : [['', '']];
  const cols = cells[0].length;
  const set = (r: number, c: number, v: string) => onChange(cells.map((row, i) => (i === r ? row.map((x, j) => (j === c ? v : x)) : row)));
  return (
    <div className="tablectl">
      <div className="tablebar">
        <button type="button" className="chip-btn" onClick={() => onChange([...cells, Array(cols).fill('')])}><Plus size={13} /> Row</button>
        <button type="button" className="chip-btn" disabled={cells.length <= 1} onClick={() => onChange(cells.slice(0, -1))}>− Row</button>
        <button type="button" className="chip-btn" disabled={cols >= 6} onClick={() => onChange(cells.map((r) => [...r, '']))}><Plus size={13} /> Column</button>
        <button type="button" className="chip-btn" disabled={cols <= 1} onClick={() => onChange(cells.map((r) => r.slice(0, -1)))}>− Column</button>
      </div>
      <div className="tablegrid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
        {cells.map((row, r) => row.map((c, ci) => (
          <input key={`${r}-${ci}`} className="input" value={c} aria-label={`Row ${r + 1}, column ${ci + 1}`} onChange={(e) => set(r, ci, e.target.value)} />
        )))}
      </div>
    </div>
  );
}

function ListControl({ field, value, onChange }: { field: Extract<Field, { kind: 'list' }>; value: Props[]; onChange: OnChange }) {
  const items = value || [];
  const patch = (i: number, p: Props) => onChange(items.map((it, j) => (j === i ? { ...it, ...p } : it)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="list">
      {items.map((it, i) => (
        <div className="listitem" key={i}>
          <div className="listhead">
            <span>{field.itemName} {i + 1}</span>
            <span className="listbtns">
              <button type="button" className="icon-btn" aria-label="Move up" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp size={14} /></button>
              <button type="button" className="icon-btn" aria-label="Move down" onClick={() => move(i, 1)} disabled={i === items.length - 1}><ArrowDown size={14} /></button>
              <button type="button" className="icon-btn" aria-label="Remove" onClick={() => onChange(items.filter((_, j) => j !== i))} disabled={items.length <= (field.min ?? 0)}><Trash2 size={14} /></button>
            </span>
          </div>
          {field.fields.map((f) => (
            <FieldControl key={f.key} field={f} props={it} onChange={(v) => patch(i, { [f.key]: v })} />
          ))}
        </div>
      ))}
      <button type="button" className="btn btn-block" disabled={field.max != null && items.length >= field.max} onClick={() => onChange([...items, field.make()])}>
        <Plus size={15} /> Add {field.itemName.toLowerCase()}
      </button>
    </div>
  );
}

interface FCProps {
  field: Field; props: Props; onChange: OnChange;
  /** multi-key update (spacing) */
  onPatch?: (p: Props) => void;
  /** mobile-override state */
  overridden?: boolean; onReset?: () => void;
}

export function FieldControl({ overridden, onReset, ...rest }: FCProps) {
  const node = FieldBody(rest);
  if (!node || !overridden) return node;
  return (
    <div className="ovwrap">
      {node}
      <button type="button" className="ov-reset" onClick={onReset} title="Remove the mobile override and use the desktop value"><RotateCcw size={11} /> Mobile</button>
    </div>
  );
}

function FieldBody({ field, props, onChange, onPatch }: Omit<FCProps, 'overridden' | 'onReset'>) {
  if (field.showIf && !field.showIf(props)) return null;
  const v = props[field.key];
  switch (field.kind) {
    case 'url':
      return (
        <Row label={field.label} hint={field.hint}>
          <UrlControl field={field} props={props} value={v} onChange={onChange} onPatch={onPatch} />
        </Row>
      );
    case 'text':
      return (
        <Row label={field.label} hint={field.hint}>
          <input className="input" type="text" value={v ?? ''} onChange={(e) => onChange(e.target.value)} />
        </Row>
      );
    case 'textarea':
      return (
        <Row label={field.label} hint={field.hint}>
          <textarea className="input area" rows={4} value={v ?? ''} onChange={(e) => onChange(e.target.value)} />
        </Row>
      );
    case 'toggle':
      return (
        <div className="field toggle">
          <label className="switch">
            <input type="checkbox" role="switch" checked={!!v} onChange={(e) => onChange(e.target.checked)} />
            <span className="track" aria-hidden="true" />
            {field.label}
          </label>
        </div>
      );
    case 'range':
      return (
        <Row label={field.label} hint={field.hint}>
          <div className="range">
            <input type="range" min={field.min} max={field.max} step={field.step ?? 1} value={v ?? field.min} onChange={(e) => onChange(+e.target.value)} />
            <span className="rval">{v ?? field.min}{field.unit ?? ''}</span>
          </div>
        </Row>
      );
    case 'select':
      return (
        <Row label={field.label} hint={field.hint}>
          <select className="input" value={String(v ?? '')} onChange={(e) => onChange(isNaN(+e.target.value) || e.target.value === '' ? e.target.value : +e.target.value)}>
            {field.options.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
          </select>
        </Row>
      );
    case 'align':
      return (
        <Row label={field.label}>
          <div className="segmented">
            {([['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]] as const).map(([a, Icon]) => (
              <button key={a} type="button" aria-label={`Align ${a}`} aria-pressed={(v || 'left') === a} onClick={() => onChange(a)}><Icon size={15} /></button>
            ))}
          </div>
        </Row>
      );
    case 'color':
      return (
        <Row label={field.label} hint={field.hint}>
          <ColorControl value={v ?? ''} onChange={onChange} allowNone={field.allowNone} />
        </Row>
      );
    case 'table':
      return <Row label={field.label}><TableControl value={v} onChange={onChange} /></Row>;
    case 'spacing':
      return <Row label={field.label}><SpacingControl props={props} onPatch={onPatch ?? ((p) => Object.entries(p).forEach(([k, val]) => onChange({ [k]: val })))} /></Row>;
    case 'list':
      return <Row label={field.label}><ListControl field={field} value={v} onChange={onChange} /></Row>;
  }
}

export { ColorControl, Row };
