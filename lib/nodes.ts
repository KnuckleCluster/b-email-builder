import {
  Circle, CircleDashed, CircleHelp, Code, Columns2, Columns3, Columns4, Film, Grid2x2, Grid3x3, Grip, Heading,
  Image as ImageIcon, LayoutTemplate, Minus, MousePointerClick, MoveVertical, PanelTop, Quote, Rocket, Share2,
  Sparkles, Table, Type, Video, FileText, Rows3, Square, type LucideIcon
} from 'lucide-react';
import type { BlockType, Node, Props, Shape } from './types';
import { DEFS } from './registry';
import { PLACEHOLDER } from './render';
import { uid } from './tree';

export { uid };

/* ---------- node factories ---------- */
const LEGACY_KEYS = ['bg', 'bgImage', 'padY', 'padX'];
export const COMMON_EL: Props = { padTop: 8, padRight: 0, padBottom: 8, padLeft: 0 };

export function makeEl(type: BlockType, preset: Props = {}): Node {
  const d = { ...DEFS[type].defaults() };
  // container-level legacy keys; a button's own `bg` is its colour, so keep it
  LEGACY_KEYS.forEach((k) => { if (!(type === 'button' && k === 'bg')) delete d[k]; });
  return { id: uid('e'), kind: 'el', type, props: { ...d, ...COMMON_EL, ...preset } };
}

export const COL_DEFAULTS = (): Props => ({ span: 12, valign: '', bg: '', padTop: 0, padRight: 0, padBottom: 0, padLeft: 0, radius: 0, shapes: [] });
export const ROW_DEFAULTS = (): Props => ({ gap: 16, valign: 'top', stack: true, bg: '', padTop: 0, padRight: 0, padBottom: 0, padLeft: 0, shapes: [] });
export const SECTION_DEFAULTS = (): Props => ({ bg: '', bgImage: '', padTop: 24, padRight: 24, padBottom: 24, padLeft: 24, width: 100, align: 'center', radius: 0, marginTop: 0, marginBottom: 0, shapes: [] });

export const makeCol = (span = 12, children: Node[] = [], props: Props = {}): Node =>
  ({ id: uid('c'), kind: 'col', props: { ...COL_DEFAULTS(), span, ...props }, children });
export const makeRow = (spans: number[] = [12], cols: Node[][] = [], props: Props = {}): Node =>
  ({ id: uid('r'), kind: 'row', props: { ...ROW_DEFAULTS(), ...props }, children: spans.map((s, i) => makeCol(s, cols[i] || [])) });
export const makeSection = (rows: Node[] = [], props: Props = {}): Node =>
  ({ id: uid('s'), kind: 'section', props: { ...SECTION_DEFAULTS(), ...props }, children: rows });
/** A section with one row and one full-width column holding `els`. */
export const simpleSection = (els: Node[], props: Props = {}) => makeSection([makeRow([12], [els])], props);

export const newShape = (p: Partial<Shape> = {}): Shape => ({
  id: uid('sh'), kind: 'circle', color: '@primary', opacity: 100, x: 100, y: 0, size: 120, thickness: 14,
  dir: 'h', pos: 40, bandSize: 20, gap: 18, ...p
});

/* ---------- row layouts ---------- */
export const LAYOUTS: { key: string; label: string; rows: number[][]; icon: LucideIcon }[] = [
  { key: 'l1', label: '1 column', rows: [[12]], icon: Rows3 },
  { key: 'l2', label: '2 columns', rows: [[6, 6]], icon: Columns2 },
  { key: 'l3', label: '3 columns', rows: [[4, 4, 4]], icon: Columns3 },
  { key: 'l4', label: '4 columns', rows: [[3, 3, 3, 3]], icon: Columns4 },
  { key: 'l13', label: '1/3 + 2/3', rows: [[4, 8]], icon: Columns2 },
  { key: 'l31', label: '2/3 + 1/3', rows: [[8, 4]], icon: Columns2 },
  { key: 'g22', label: '2 × 2 grid', rows: [[6, 6], [6, 6]], icon: Grid2x2 },
  { key: 'g32', label: '3 × 2 grid', rows: [[4, 4, 4], [4, 4, 4]], icon: Grid3x3 }
];

/* ---------- ready-made sections ---------- */
const T = (text: string, p: Props = {}) => makeEl('text', { text, ...p });
const H = (text: string, p: Props = {}) => makeEl('heading', { text, ...p });

export interface SectionPreset { key: string; label: string; icon: LucideIcon; build: () => Node }

export const SECTION_PRESETS: SectionPreset[] = [
  {
    key: 'logo', label: 'Logo header', icon: PanelTop,
    build: () => simpleSection([makeEl('header', { align: 'center' })], { padTop: 24, padBottom: 24 })
  },
  {
    key: 'hero', label: 'Hero', icon: Rocket,
    build: () => simpleSection([
      T('NEW THIS WEEK', { size: 13, weight: 700, letterSpacing: 2, color: '#FFFFFF', align: 'center', padBottom: 12 }),
      H('One big idea, one clear message', { level: 1, color: '#FFFFFF', align: 'center' }),
      T('A short supporting line that tells readers why they should keep going.', { size: 17, color: '#FFFFFF', align: 'center', padBottom: 20 }),
      makeEl('button', { text: 'Get started', align: 'center' })
    ], {
      bg: '@text', padTop: 64, padBottom: 64, padLeft: 32, padRight: 32,
      shapes: [newShape({ kind: 'circle', x: 100, y: 0, size: 170, color: '@primary', opacity: 90 }), newShape({ kind: 'ring', x: 0, y: 100, size: 120, thickness: 14, color: '@secondary', opacity: 30 })]
    })
  },
  {
    key: 'features', label: 'Features (3 col)', icon: Columns3,
    build: () => makeSection([makeRow([4, 4, 4], [0, 1, 2].map((i) => [
      T(['🚀', '🎯', '✨'][i], { size: 30, align: 'center', padBottom: 4 }),
      H(['Fast', 'Focused', 'Polished'][i], { level: 3, align: 'center', padBottom: 4 }),
      T('Say it in a line or two.', { size: 14, color: '@muted', align: 'center' })
    ]))], { padTop: 32, padBottom: 32 })
  },
  {
    key: 'imagetext', label: 'Image + text', icon: Columns2,
    build: () => makeSection([makeRow([6, 6], [
      [makeEl('image', { radius: 10 })],
      [H('Tell the story next to the picture', { level: 2 }), T('Pair an image with a short paragraph and a call to action.', { color: '@muted', size: 15 }), makeEl('button', { text: 'Learn more', align: 'left', size: 'sm' })]
    ], { valign: 'middle', gap: 24 })], { padTop: 24, padBottom: 24 })
  },
  {
    key: 'cta', label: 'Call to action', icon: MousePointerClick,
    build: () => simpleSection([
      H('Ready when you are', { level: 2, color: '#FFFFFF', align: 'center' }),
      T('One sentence that makes the next step feel easy.', { color: '#FFFFFF', align: 'center', padBottom: 16 }),
      makeEl('button', { text: 'Take the next step', align: 'center', bg: '#FFFFFF', color: '@primary' })
    ], { bg: '@primary', width: 92, radius: 20, padTop: 40, padBottom: 40, marginTop: 8, marginBottom: 8, shapes: [newShape({ kind: 'circle', x: 0, y: 100, size: 120, color: '#FFFFFF', opacity: 14 }), newShape({ kind: 'dots', size: 2, gap: 18, color: '#FFFFFF', opacity: 18 })] })
  },
  {
    key: 'testimonial', label: 'Testimonial', icon: Quote,
    build: () => simpleSection([makeEl('quote')], { bg: '@secondary', padTop: 36, padBottom: 36, shapes: [newShape({ kind: 'circle', x: 96, y: 8, size: 90, color: '@primary', opacity: 12 })] })
  },
  { key: 'faq', label: 'FAQ', icon: CircleHelp, build: () => simpleSection([makeEl('faq')], { padTop: 28, padBottom: 28 }) },
  { key: 'pricing', label: 'Table', icon: Table, build: () => simpleSection([makeEl('table')], { padTop: 24, padBottom: 24 }) },
  { key: 'social', label: 'Social links', icon: Share2, build: () => simpleSection([makeEl('social')], { padTop: 16, padBottom: 16 }) },
  { key: 'footer', label: 'Footer', icon: FileText, build: () => simpleSection([makeEl('footer')], { bg: '@page', padTop: 28, padBottom: 28 }) }
];

/* ---------- palette ---------- */
export type PaletteAction =
  | { kind: 'el'; type: BlockType; preset?: Props }
  | { kind: 'layout'; rows: number[][] }
  | { kind: 'section'; build: () => Node }
  | { kind: 'shape'; shape: Partial<Shape> };

export interface PaletteItem { key: string; label: string; icon: LucideIcon; category: 'Layout' | 'Elements' | 'Sections' | 'Overlays'; action: PaletteAction }

const el = (key: string, type: BlockType, label: string, icon: LucideIcon, preset?: Props): PaletteItem =>
  ({ key, label, icon, category: 'Elements', action: { kind: 'el', type, preset } });

export const PALETTE: PaletteItem[] = [
  { key: 'section', label: 'Empty section', icon: LayoutTemplate, category: 'Layout', action: { kind: 'section', build: () => makeSection([makeRow([12])]) } },
  ...LAYOUTS.map((l): PaletteItem => ({ key: l.key, label: l.label, icon: l.icon, category: 'Layout', action: { kind: 'layout', rows: l.rows } })),

  el('heading', 'heading', 'Heading', Heading),
  el('text', 'text', 'Text', Type),
  el('button', 'button', 'Button', MousePointerClick),
  el('image', 'image', 'Image', ImageIcon),
  el('gif', 'image', 'GIF', Film, { alt: 'Animated GIF', src: PLACEHOLDER(600, 320, 'Your GIF') }),
  el('video', 'video', 'Video', Video),
  el('lottie', 'lottie', 'Lottie', Sparkles),
  el('logo', 'header', 'Logo', PanelTop),
  el('callout', 'callout', 'Callout', Square),
  el('quote', 'quote', 'Quote', Quote),
  el('table', 'table', 'Table', Table),
  el('faq', 'faq', 'FAQ', CircleHelp),
  el('social', 'social', 'Social links', Share2),
  el('divider', 'divider', 'Divider', Minus),
  el('spacer', 'spacer', 'Spacer', MoveVertical),
  el('footertext', 'footer', 'Footer text', FileText),
  el('html', 'html', 'Custom HTML', Code),

  ...SECTION_PRESETS.map((s): PaletteItem => ({ key: `sec-${s.key}`, label: s.label, icon: s.icon, category: 'Sections', action: { kind: 'section', build: s.build } })),

  { key: 'sh-circle', label: 'Circle', icon: Circle, category: 'Overlays', action: { kind: 'shape', shape: { kind: 'circle' } } },
  { key: 'sh-ring', label: 'Ring', icon: CircleDashed, category: 'Overlays', action: { kind: 'shape', shape: { kind: 'ring', size: 90 } } },
  { key: 'sh-band', label: 'Band', icon: Minus, category: 'Overlays', action: { kind: 'shape', shape: { kind: 'band', color: '@secondary' } } },
  { key: 'sh-dots', label: 'Dots', icon: Grip, category: 'Overlays', action: { kind: 'shape', shape: { kind: 'dots', size: 2, opacity: 35 } } }
];

export const CATEGORY_ORDER: PaletteItem['category'][] = ['Layout', 'Elements', 'Sections', 'Overlays'];
