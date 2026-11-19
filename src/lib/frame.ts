import type { Frame, Shape } from './types';
import { stockUrl } from './stock';
import { uid } from './tree';

export const DEFAULT_FRAME: Frame = {
  radius: 0, inset: 24, shadow: 'none',
  bgMode: 'color', bgColor: '@page', bgImage: '', bgBlur: 0, bgDim: 0, bgDimColor: '@page',
  bgSize: 'cover', bgPos: 'center', tile: 120, shapes: []
};

export const getFrame = (doc: { frame?: Partial<Frame> }): Frame => ({ ...DEFAULT_FRAME, ...(doc.frame || {}), shapes: doc.frame?.shapes ?? [] });

/** True when nothing about the frame has been customised (the editor then keeps its dotted canvas look). */
export const isPlainFrame = (f: Frame) =>
  f.bgMode === 'color' && f.bgColor === '@page' && f.shapes.length === 0 && f.radius === 0 && f.inset === 24 && f.shadow === 'none';

export const SHADOW_VALUE: Record<Frame['shadow'], string> = {
  none: 'none',
  soft: '0 10px 30px -12px rgba(15,26,46,.35)',
  lifted: '0 28px 60px -18px rgba(15,26,46,.55)'
};
export const SHADOWS: Record<Frame['shadow'], string> = {
  none: '',
  soft: `box-shadow:${SHADOW_VALUE.soft};`,
  lifted: `box-shadow:${SHADOW_VALUE.lifted};`
};

const mk = (kind: Shape['kind'], p: Partial<Shape>): Shape => ({
  id: uid('sh'), kind, color: '@primary', opacity: 100, x: 100, y: 0, size: 120, thickness: 14,
  dir: 'h', pos: 40, bandSize: 20, gap: 18, angle: 45, ...p
});

const RESET: Partial<Frame> = {
  bgMode: 'color', bgColor: '@page', bgImage: '', bgBlur: 0, bgDim: 0, bgDimColor: '@page', bgSize: 'cover', bgPos: 'center', tile: 120, shapes: []
};

export interface BgPreset { key: string; label: string; /** stock photo id, for photo presets */ photo?: string; patch: () => Partial<Frame> }

const photo = (key: string, label: string, id: string, blur: number, dim: number): BgPreset => ({
  key, label, photo: id,
  patch: () => ({ ...RESET, bgMode: 'image', bgImage: stockUrl(id, 1600), bgBlur: blur, bgDim: dim, bgDimColor: '#0B1020', bgColor: '#0B1020' })
});

export const BG_PRESETS: BgPreset[] = [
  { key: 'plain', label: 'Plain', patch: () => ({ ...RESET }) },
  {
    key: 'glow', label: 'Brand glow',
    patch: () => ({ ...RESET, shapes: [mk('glow', { x: 60, y: 45, size: 760, color: '@secondary' }), mk('glow', { x: 8, y: 12, size: 560, opacity: 42 }), mk('glow', { x: 94, y: 88, size: 520, opacity: 26 })] })
  },
  {
    key: 'midnight', label: 'Midnight',
    patch: () => ({ ...RESET, bgColor: '#0B1020', shapes: [mk('glow', { x: 12, y: 16, size: 560, color: '#6D5CFF', opacity: 70 }), mk('glow', { x: 92, y: 84, size: 520, color: '#FF4DA6', opacity: 45 }), mk('glow', { x: 62, y: 48, size: 420, color: '#22D3EE', opacity: 18 })] })
  },
  {
    key: 'sunset', label: 'Sunset',
    patch: () => ({ ...RESET, bgColor: '#FFF1E6', shapes: [mk('glow', { x: 10, y: 18, size: 560, color: '#FF8A3D', opacity: 60 }), mk('glow', { x: 92, y: 30, size: 520, color: '#FF4D6D', opacity: 45 }), mk('glow', { x: 70, y: 96, size: 560, color: '#7C4DFF', opacity: 35 })] })
  },
  {
    key: 'ocean', label: 'Ocean',
    patch: () => ({ ...RESET, bgColor: '#EAF7FF', shapes: [mk('glow', { x: 14, y: 22, size: 560, color: '#2E9BFF', opacity: 50 }), mk('glow', { x: 88, y: 86, size: 520, color: '#12B6A6', opacity: 45 })] })
  },
  { key: 'dots', label: 'Dots', patch: () => ({ ...RESET, shapes: [mk('dots', { size: 2, gap: 20, color: '@text', opacity: 16 })] }) },
  { key: 'grid', label: 'Grid', patch: () => ({ ...RESET, shapes: [mk('grid', { gap: 28, thickness: 1, color: '@text', opacity: 9 })] }) },
  { key: 'stripes', label: 'Stripes', patch: () => ({ ...RESET, shapes: [mk('stripes', { gap: 16, thickness: 6, angle: 45, opacity: 10 })] }) },
  photo('misty', 'Misty forest', 'photo-1470071459604-3b5ec3a7fe05', 12, 25),
  photo('waves', 'Ocean waves', 'photo-1518837695005-2083093ee35b', 14, 20),
  photo('stars', 'Night sky', 'photo-1519681393784-d120267933ba', 6, 12),
  photo('golden', 'Golden hour', 'photo-1469474968028-56623f02e42e', 14, 18)
];

/** Recommended image sizes, shown as tooltips next to the image fields. */
export const SIZE_TIPS = {
  image: 'Full background: use a landscape image about 1600 × 1000 px (JPG, under 300 KB). Soft, low-detail photos work best because your email covers the middle. With blur on, even an 800 px photo looks great.',
  tile: 'Repeating pattern: use a square PNG about 200 × 200 px with a transparent background (under 50 KB). It repeats across the whole page, so keep it simple, like a logo mark. Use “Pattern size” to scale it.'
};
