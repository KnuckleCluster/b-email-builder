'use client';

import { Image as ImageIcon } from 'lucide-react';
import { useStore } from '@/lib/store';
import { BG_PRESETS, DEFAULT_FRAME, SIZE_TIPS, getFrame } from '@/lib/frame';
import { frameStyle } from '@/lib/render';
import { SHAPES_FIELD, type Field } from '@/lib/registry';
import { stockUrl } from '@/lib/stock';
import { FieldControl, Row } from './fields/FieldControls';

/** A small "i" with a hover/focus tooltip. */
export function InfoTip({ text }: { text: string }) {
  return <span className="infotip" tabIndex={0} role="img" aria-label={text} data-tip={text}>i</span>;
}

const RADIUS: Field = { kind: 'range', key: 'radius', label: 'Corner radius', min: 0, max: 40, unit: 'px' };
const INSET: Field = { kind: 'range', key: 'inset', label: 'Space around the email', min: 0, max: 96, unit: 'px' };
const SHADOW: Field = { kind: 'select', key: 'shadow', label: 'Shadow', options: [{ value: 'none', label: 'None' }, { value: 'soft', label: 'Soft' }, { value: 'lifted', label: 'Lifted' }] };
const COLOR: Field = { kind: 'color', key: 'bgColor', label: 'Page color' };
const BLUR: Field = { kind: 'range', key: 'bgBlur', label: 'Blur', min: 0, max: 50, unit: '', hint: 'Soft, dreamy backgrounds. Uses a free image service; if it’s ever down, the page color shows instead.' };
const DIM: Field = { kind: 'range', key: 'bgDim', label: 'Fade over image', min: 0, max: 90, unit: '%', hint: 'Lays a flat color over the image so your email stands out.' };
const DIMCOLOR: Field = { kind: 'color', key: 'bgDimColor', label: 'Fade color', showIf: (p) => +p.bgDim > 0 };
const FIT: Field = { kind: 'select', key: 'bgSize', label: 'Fit', options: [{ value: 'cover', label: 'Fill the page' }, { value: 'contain', label: 'Show whole image' }] };
const FOCUS: Field = { kind: 'select', key: 'bgPos', label: 'Focus', options: [{ value: 'center', label: 'Center' }, { value: 'top', label: 'Top' }, { value: 'bottom', label: 'Bottom' }] };
const TILE: Field = { kind: 'range', key: 'tile', label: 'Pattern size', min: 40, max: 400, unit: 'px' };

const MODES = [{ id: 'color', label: 'Color' }, { id: 'image', label: 'Image' }, { id: 'tile', label: 'Pattern' }] as const;

export default function FrameSettings() {
  const doc = useStore((s) => s.doc);
  const { patchFrame, applyBgPreset, notify } = useStore.getState();
  const f = getFrame(doc);
  const set = (patch: Record<string, unknown>) => patchFrame(patch as never);
  const ctl = (field: Field) => <FieldControl key={field.key} field={field} props={f as never} onChange={(v) => set({ [field.key]: v })} />;
  const imageMode = f.bgMode === 'image' || f.bgMode === 'tile';
  const logo = doc.brand.logoUrl;

  const chooseMode = (mode: (typeof MODES)[number]['id']) => {
    const patch: Record<string, unknown> = { bgMode: mode };
    if (mode === 'tile' && !f.bgImage.trim() && logo) { patch.bgImage = logo; notify('Using your logo as the repeating pattern.', { kind: 'success' }); }
    set(patch);
  };

  return (
    <details className="section" open>
      <summary>Frame & background</summary>
      <div className="sectionbody">
        <div>
          <div className="flabel">Backgrounds</div>
          <div className="bgp-grid">
            {BG_PRESETS.map((p) => {
              const css = frameStyle({ brand: doc.brand, frame: { ...DEFAULT_FRAME, ...p.patch() } }, true).css;
              return (
                <button key={p.key} type="button" className="bgp" title={p.label} onClick={() => applyBgPreset(p.key)}>
                  <span className="bgp-art" ref={(el) => { if (el && !p.photo) el.style.cssText = css; }}>
                    {p.photo && <i style={{ backgroundImage: `url(${stockUrl(p.photo, 240)})` }} />}
                  </span>
                  <span className="bgp-name">{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {ctl(RADIUS)}
        {ctl(INSET)}
        {ctl(SHADOW)}

        <Row label="Background">
          <div className="segmented">
            {MODES.map((m) => <button key={m.id} type="button" aria-pressed={f.bgMode === m.id} onClick={() => chooseMode(m.id)}>{m.label}</button>)}
          </div>
        </Row>

        {ctl(COLOR)}

        {imageMode && (
          <>
            <div>
              <div className="tiprow"><span>Recommended size</span><InfoTip text={f.bgMode === 'tile' ? SIZE_TIPS.tile : SIZE_TIPS.image} /></div>
              <FieldControl field={{ kind: 'url', key: 'bgImage', label: f.bgMode === 'tile' ? 'Logo or pattern image link' : 'Background image link' }} props={f as never} onChange={(v) => set({ bgImage: v })} />
              {f.bgMode === 'tile' && (
                <button type="button" className="linklike browse" disabled={!logo} title={logo ? 'Use the logo from Identity' : 'Add a Logo URL under Identity first'} onClick={() => set({ bgImage: logo })}>
                  <ImageIcon size={13} /> {logo ? 'Use my logo' : 'Add a logo URL in Identity to use it here'}
                </button>
              )}
            </div>
            {f.bgMode === 'tile' ? ctl(TILE) : <>{ctl(FIT)}{ctl(FOCUS)}</>}
            {ctl(BLUR)}
            {ctl(DIM)}
            {ctl(DIMCOLOR)}
          </>
        )}

        <FieldControl field={{ ...SHAPES_FIELD, label: 'Decorations on the page' } as Field} props={f as never} onChange={(v) => set({ shapes: v })} />
      </div>
    </details>
  );
}
