import type { Brand } from './types';

export const FONTS: Record<string, { label: string; stack: string }> = {
  modern: { label: 'Modern sans', stack: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
  arial: { label: 'Arial', stack: 'Arial, Helvetica, sans-serif' },
  verdana: { label: 'Verdana', stack: 'Verdana, Geneva, sans-serif' },
  trebuchet: { label: 'Trebuchet', stack: "'Trebuchet MS', Helvetica, sans-serif" },
  tahoma: { label: 'Tahoma', stack: 'Tahoma, Geneva, sans-serif' },
  georgia: { label: 'Georgia (serif)', stack: "Georgia, 'Times New Roman', serif" },
  palatino: { label: 'Palatino (serif)', stack: "'Palatino Linotype', 'Book Antiqua', Palatino, serif" },
  mono: { label: 'Courier (mono)', stack: "'Courier New', Courier, monospace" }
};

export const DEFAULT_BRAND: Brand = {
  primary: '#2E5BFF',
  secondary: '#E8EDFF',
  text: '#0F1A2E',
  muted: '#5B6678',
  surface: '#FFFFFF',
  page: '#EEF1F6',
  font: 'modern',
  headingFont: 'modern',
  width: 600,
  radius: 8,
  mobilePad: 16,
  logoUrl: '',
  companyName: 'Your Company'
};

export const BRAND_TOKENS: { token: string; key: keyof Brand; label: string }[] = [
  { token: '@primary', key: 'primary', label: 'Primary' },
  { token: '@secondary', key: 'secondary', label: 'Secondary' },
  { token: '@text', key: 'text', label: 'Text' },
  { token: '@muted', key: 'muted', label: 'Muted' },
  { token: '@surface', key: 'surface', label: 'Surface' },
  { token: '@page', key: 'page', label: 'Page' }
];

/** Resolve "@primary" style brand tokens (or plain hex) into a real color. */
export function resolveColor(value: string | undefined, brand: Brand, fallback = ''): string {
  if (!value) return fallback;
  if (value.startsWith('@')) {
    const hit = BRAND_TOKENS.find((t) => t.token === value);
    return hit ? String(brand[hit.key]) : fallback;
  }
  return value;
}

export const fontStack = (brand: Brand, kind: 'body' | 'heading' = 'body') =>
  (FONTS[kind === 'heading' ? brand.headingFont : brand.font] ?? FONTS.modern).stack;
