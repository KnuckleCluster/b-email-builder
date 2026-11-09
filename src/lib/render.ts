import type { Brand, EmailDoc, Node, Props, Shape } from './types';
import { walk } from './tree';
import { FONTS, fontStack, resolveColor as rc } from './theme';

export type Device = 'desktop' | 'mobile';

/** Font for a block: per-block choice if set, else the brand font. */
const ff = (p: Props, b: Brand, kind: 'body' | 'heading' = 'body') =>
  p.fontKey && FONTS[p.fontKey] ? FONTS[p.fontKey].stack : fontStack(b, kind);

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */
export const esc = (s: unknown) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const num = (v: unknown, d: number) => (v !== '' && v != null && Number.isFinite(+v) ? +v : d);
export const PLACEHOLDER = (w = 600, h = 320, label = 'Your image') =>
  `https://placehold.co/${w}x${h}/E7EBF2/8A94A6/png?text=${encodeURIComponent(label)}`;

/** Tiny inline markup: **bold**, *italic*, [text](url), new lines. Everything else is escaped. */
export function inline(text: unknown, linkColor: string): string {
  let t = esc(text);
  t = t.replace(
    /\[([^\]]+)\]\(((?:https?:|mailto:|tel:)[^)\s]+|\{\{[^}]+\}\}|#)\)/g,
    (_m, label, url) => `<a href="${url}" target="_blank" style="color:${linkColor};text-decoration:underline">${label}</a>`
  );
  t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[^*])\*(?!\*)(.+?)\*(?!\*)/g, '$1<em>$2</em>');
  return t.replace(/\n/g, '<br>');
}

const imgAlign = (a: string) => (a === 'center' ? 'margin:0 auto;' : a === 'right' ? 'margin:0 0 0 auto;' : 'margin:0;');

function ytThumb(url: string): string {
  const m = String(url || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : '';
}

/** Canvas-only: tag text regions so the editor can edit them in place. Never emitted into exported HTML. */
let EDIT = false;
const ed = (key: string, multiline = true) => (EDIT ? ` data-edit="${key}"${multiline ? ' data-ml="1"' : ''}` : '');

function button(o: {
  label: string; url: string; bg: string; color: string; radius: number;
  font: string; size?: string; full?: boolean; align?: string; edit?: boolean;
}): string {
  const size = o.size || 'md';
  const py = size === 'lg' ? 18 : size === 'sm' ? 10 : 14;
  const px = size === 'lg' ? 36 : size === 'sm' ? 20 : 28;
  const fs = size === 'lg' ? 17 : size === 'sm' ? 14 : 16;
  const align = o.align || 'left';
  const a = `<a${o.edit ? ed('text', false) : ''} href="${esc(o.url || '#')}" target="_blank" style="display:${o.full ? 'block' : 'inline-block'};padding:${py}px ${px}px;font:600 ${fs}px/1 ${o.font};color:${o.color};text-decoration:none;text-align:center;border-radius:${o.radius}px;background:${o.bg}">${esc(o.label)}</a>`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" ${o.full ? 'width="100%" ' : `align="${align}" `}style="${o.full ? 'width:100%;' : ''}${align === 'center' && !o.full ? 'margin:0 auto;' : ''}border-collapse:separate"><tr><td bgcolor="${o.bg}" align="center" style="border-radius:${o.radius}px;background:${o.bg}">${a}</td></tr></table>`;
}

/** Responsive columns that stack without media queries (hybrid method + Outlook ghost table). */
function cols(cells: string[], total: number, gap = 16, valign = 'top'): string {
  const n = cells.length;
  const w = Math.floor(total / n);
  let out = `<div style="font-size:0;text-align:left"><!--[if mso]><table role="presentation" width="${total}" cellpadding="0" cellspacing="0"><tr><td width="${w}" valign="${valign}"><![endif]-->`;
  cells.forEach((c, i) => {
    const pad = `padding:0 ${i < n - 1 ? gap / 2 : 0}px 0 ${i > 0 ? gap / 2 : 0}px`;
    out += `<div class="srm-col" style="display:inline-block;width:100%;max-width:${w}px;vertical-align:${valign};box-sizing:border-box;${pad}">${c}</div>`;
    if (i < n - 1) out += `<!--[if mso]></td><td width="${w}" valign="${valign}"><![endif]-->`;
  });
  return out + `<!--[if mso]></td></tr></table><![endif]--></div>`;
}

/* ------------------------------------------------------------------ */
/* block renderers  (return the inner HTML of the block's table cell)  */
/* ------------------------------------------------------------------ */
type R = (p: Props, b: Brand, inner: number) => string;

const RENDER: Record<string, R> = {
  header: (p, b) => {
    const logo = p.logo || b.logoUrl;
    const al = p.align || 'center';
    const w = num(p.logoWidth, 140);
    const content = logo
      ? `<img src="${esc(logo)}" alt="${esc(p.alt || b.companyName)}" width="${w}" style="display:block;border:0;width:${w}px;max-width:100%;height:auto;${imgAlign(al)}">`
      : `<div style="font:700 22px/1.2 ${fontStack(b, 'heading')};color:${rc('@text', b)}">${esc(b.companyName)}</div>`;
    return `<div style="text-align:${al}">${content}</div>`;
  },

  hero: (p, b) => {
    const al = p.align || 'center';
    const c = rc(p.color, b, '#FFFFFF');
    const f = fontStack(b), hf = fontStack(b, 'heading');
    const btn = p.buttonText
      ? button({ label: p.buttonText, url: p.buttonUrl, bg: rc(p.buttonBg || '@primary', b), color: rc(p.buttonColor || '#FFFFFF', b), radius: b.radius, font: f, align: al, size: 'md' })
      : '';
    return `<div style="text-align:${al};color:${c}">${
      p.eyebrow ? `<div style="font:600 13px/1 ${f};letter-spacing:.12em;text-transform:uppercase;opacity:.8;margin:0 0 14px">${esc(p.eyebrow)}</div>` : ''
    }<div class="srm-hero-h" style="font:700 ${num(p.size, 38)}px/1.15 ${hf};margin:0 0 12px">${inline(p.heading, c)}</div>${
      p.subheading ? `<div style="font:400 17px/1.55 ${f};margin:0 0 ${btn ? 26 : 0}px;opacity:.9">${inline(p.subheading, c)}</div>` : ''
    }${btn}</div>`;
  },

  heading: (p, b) => {
    const lvl = [1, 2, 3].includes(+p.level) ? +p.level : 2;
    const size = { 1: 34, 2: 26, 3: 20 }[lvl as 1 | 2 | 3];
    return `<h${lvl} class="srm-h${lvl}"${ed('text', false)} style="margin:0;font:${num(p.weight, 700)} ${size}px/1.2 ${ff(p, b, 'heading')};letter-spacing:${num(p.letterSpacing, 0)}px;color:${rc(p.color || '@text', b)};text-align:${p.align || 'left'}">${inline(p.text, rc(p.color || '@text', b))}</h${lvl}>`;
  },

  text: (p, b) =>
    `<div${ed('text')} style="font:${num(p.weight, 400)} ${num(p.size, 16)}px/${num(p.lineHeight, 1.6)} ${ff(p, b)};letter-spacing:${num(p.letterSpacing, 0)}px;color:${rc(p.color || '@text', b)};text-align:${p.align || 'left'}">${inline(p.text, rc('@primary', b))}</div>`,

  image: (p, b, inner) => {
    const w = num(p.width, 100);
    const img = `<img src="${esc(p.src || PLACEHOLDER())}" alt="${esc(p.alt)}" width="${Math.round((inner * w) / 100)}" style="display:block;border:0;width:${w}%;max-width:100%;height:auto;border-radius:${num(p.radius, 0)}px;${imgAlign(p.align || 'center')}">`;
    return p.link ? `<a href="${esc(p.link)}" target="_blank" style="text-decoration:none">${img}</a>` : img;
  },

  video: (p, b, inner) => {
    const thumb = p.thumbnail || ytThumb(p.url) || PLACEHOLDER(600, 338, 'Video thumbnail');
    const al = p.align || 'center';
    const img = `<a href="${esc(p.url || '#')}" target="_blank" style="text-decoration:none"><img src="${esc(thumb)}" alt="${esc(p.alt || 'Watch the video')}" width="${inner}" style="display:block;border:0;width:100%;max-width:100%;height:auto;border-radius:${num(p.radius, 8)}px"></a>`;
    const btn = p.showButton
      ? `<div style="height:14px;line-height:14px;font-size:1px">&nbsp;</div>${button({ label: `▶  ${p.buttonText || 'Watch video'}`, url: p.url, bg: rc('@primary', b), color: '#FFFFFF', radius: b.radius, font: fontStack(b), align: al })}`
      : '';
    return img + btn;
  },

  lottie: (p, b, inner) => {
    const w = num(p.width, 100);
    const img = `<img src="${esc(p.fallback || PLACEHOLDER(600, 320, 'Lottie fallback'))}" alt="${esc(p.alt)}" width="${Math.round((inner * w) / 100)}" style="display:block;border:0;width:${w}%;max-width:100%;height:auto;${imgAlign(p.align || 'center')}">`;
    return p.link ? `<a href="${esc(p.link)}" target="_blank" style="text-decoration:none">${img}</a>` : img;
  },

  button: (p, b) => {
    const mode = p.widthMode || (p.fullWidth ? 'full' : 'auto');
    const al = p.align || 'center';
    const base = { label: p.text, url: p.url, bg: rc(p.bg || '@primary', b), color: rc(p.color || '#FFFFFF', b), radius: num(p.radius, b.radius), font: fontStack(b), size: p.size, align: al, edit: true };
    if (mode === 'full') return button({ ...base, full: true });
    if (mode === 'custom') {
      const w = Math.min(100, Math.max(20, num(p.blockWidth, 60)));
      return `<table role="presentation" width="${w}%" align="${al}" cellpadding="0" cellspacing="0" border="0" style="width:${w}%;${al === 'center' ? 'margin:0 auto;' : al === 'right' ? 'margin-left:auto;' : ''}"><tr><td>${button({ ...base, full: true })}</td></tr></table>`;
    }
    return button(base);
  },

  divider: (p, b) =>
    `<table role="presentation" width="${num(p.width, 100)}%" align="center" cellpadding="0" cellspacing="0" border="0" style="width:${num(p.width, 100)}%;margin:0 auto"><tr><td style="border-top:${num(p.thickness, 1)}px ${p.style || 'solid'} ${rc(p.color || '#DCE1EA', b)};font-size:0;line-height:0;height:0">&nbsp;</td></tr></table>`,

  spacer: (p) => `<div style="height:${num(p.height, 24)}px;line-height:${num(p.height, 24)}px;font-size:1px">&nbsp;</div>`,

  callout: (p, b) => {
    const bg = rc(p.shapeBg || '@secondary', b);
    const color = rc(p.color || '@text', b);
    const al = p.align || 'center';
    const bw = num(p.borderWidth, 0);
    const border = bw ? `border:${bw}px solid ${rc(p.borderColor || '@primary', b)};` : '';
    const shape = p.shape || 'rounded';
    const radius = shape === 'rectangle' ? 0 : shape === 'rounded' ? 16 : shape === 'pill' ? 999 : 999;
    const size = num(p.size, 18);
    if (shape === 'circle') {
      const d = num(p.diameter, 160);
      return `<table role="presentation" align="${al}" cellpadding="0" cellspacing="0" border="0" style="${al === 'center' ? 'margin:0 auto;' : ''}"><tr><td width="${d}" height="${d}" align="center" valign="middle" bgcolor="${bg}"${ed('text')} style="width:${d}px;height:${d}px;background:${bg};border-radius:50%;${border}font:700 ${size}px/1.25 ${fontStack(b, 'heading')};color:${color};text-align:center;padding:12px;box-sizing:border-box">${inline(p.text, color)}</td></tr></table>`;
    }
    const full = p.fullWidth !== false;
    return `<table role="presentation" ${full ? 'width="100%"' : `align="${al}"`} cellpadding="0" cellspacing="0" border="0" style="${full ? 'width:100%;' : al === 'center' ? 'margin:0 auto;' : ''}border-collapse:separate"><tr><td align="${al}" bgcolor="${bg}"${ed('text')} style="background:${bg};border-radius:${radius}px;${border}padding:${num(p.padding, 22)}px 28px;font:600 ${size}px/1.4 ${fontStack(b)};color:${color};text-align:${al}">${inline(p.text, color)}</td></tr></table>`;
  },

  split: (p, b, inner) => {
    const f = fontStack(b), hf = fontStack(b, 'heading'), tc = rc('@text', b);
    const half = Math.floor(inner / 2);
    const img = `<img src="${esc(p.image || PLACEHOLDER(520, 380, 'Image'))}" alt="${esc(p.alt)}" width="${half}" style="display:block;border:0;width:100%;max-width:100%;height:auto;border-radius:${num(p.radius, 8)}px">`;
    const btn = p.buttonText ? `<div style="height:16px;line-height:16px;font-size:1px">&nbsp;</div>${button({ label: p.buttonText, url: p.buttonUrl, bg: rc('@primary', b), color: '#FFFFFF', radius: b.radius, font: f, size: 'sm' })}` : '';
    const txt = `<div style="font-size:16px;padding:4px 0">${p.heading ? `<div style="font:700 22px/1.25 ${hf};color:${tc};margin:0 0 10px">${inline(p.heading, tc)}</div>` : ''}<div style="font:400 15px/1.6 ${f};color:${rc('@muted', b)}">${inline(p.text, rc('@primary', b))}</div>${btn}</div>`;
    return cols(p.imageSide === 'right' ? [txt, img] : [img, txt], inner, 24, 'middle');
  },

  features: (p, b, inner) => {
    const items: Props[] = (p.items || []).slice(0, 4);
    if (!items.length) return '';
    const al = p.align || 'center';
    const f = fontStack(b), hf = fontStack(b, 'heading');
    const cells = items.map(
      (it) => `<div style="text-align:${al};padding:8px 0">${it.icon ? `<div style="font-size:30px;line-height:1.2;margin:0 0 8px">${esc(it.icon)}</div>` : ''}<div style="font:700 17px/1.3 ${hf};color:${rc('@text', b)};margin:0 0 6px">${esc(it.title)}</div><div style="font:400 14px/1.55 ${f};color:${rc('@muted', b)}">${inline(it.text, rc('@primary', b))}</div></div>`
    );
    return cols(cells, inner, 16, 'top');
  },

  faq: (p, b) => {
    const f = fontStack(b), hf = fontStack(b, 'heading');
    const line = rc('#DCE1EA', b);
    const head = p.heading ? `<div${ed('heading', false)} style="font:700 24px/1.25 ${hf};color:${rc('@text', b)};margin:0 0 8px">${esc(p.heading)}</div>` : '';
    const rows = (p.items || [])
      .map(
        (it: Props, i: number) =>
          `<tr><td style="padding:16px 0;${i === 0 && !p.heading ? '' : `border-top:1px solid ${line};`}"><div${ed(`items.${i}.q`, false)} style="font:700 16px/1.4 ${f};color:${rc('@text', b)};margin:0 0 6px">${esc(it.q)}</div><div${ed(`items.${i}.a`)} style="font:400 15px/1.6 ${f};color:${rc('@muted', b)}">${inline(it.a, rc('@primary', b))}</div></td></tr>`
      )
      .join('');
    return `${head}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>`;
  },

  table: (p, b) => {
    const cells: string[][] = p.cells || [];
    const f = fontStack(b);
    const border = rc(p.borderColor || '#DCE1EA', b);
    const hbg = rc(p.headerBg || '@text', b);
    const rows = cells
      .map((row, r) => {
        const isHead = p.header && r === 0;
        const stripe = p.striped && !isHead && r % 2 === 0 ? 'background:#F6F8FB;' : '';
        const tds = row
          .map(
            (c, ci) =>
              `<${isHead ? 'th' : 'td'} align="${isHead ? 'left' : p.align || 'left'}"${ed(`cells.${r}.${ci}`, false)} style="border:1px solid ${border};padding:10px 12px;font:${isHead ? 700 : 400} 14px/1.45 ${f};color:${isHead ? '#FFFFFF' : rc('@text', b)};${isHead ? `background:${hbg};` : stripe}">${inline(c, isHead ? '#FFFFFF' : rc('@primary', b))}</${isHead ? 'th' : 'td'}>`
          )
          .join('');
        return `<tr>${tds}</tr>`;
      })
      .join('');
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse">${rows}</table>`;
  },

  quote: (p, b) => {
    const accent = rc(p.accent || '@primary', b);
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-left:4px solid ${accent};padding:4px 0 4px 18px"><div${ed('text')} style="font:italic 400 ${num(p.size, 20)}px/1.5 ${fontStack(b, 'heading')};color:${rc('@text', b)}">${inline(p.text, accent)}</div>${
      p.author ? `<div style="font:600 14px/1.4 ${fontStack(b)};color:${rc('@text', b)};margin:12px 0 0">${esc(p.author)}${p.role ? `<span style="font-weight:400;color:${rc('@muted', b)}"> · ${esc(p.role)}</span>` : ''}</div>` : ''
    }</td></tr></table>`;
  },

  social: (p, b) => {
    const al = p.align || 'center';
    const primary = rc('@primary', b);
    const links = (p.items || [])
      .map((it: Props) =>
        p.style === 'text'
          ? `<a href="${esc(it.url || '#')}" target="_blank" style="display:inline-block;margin:0 10px 6px;font:600 14px/1 ${fontStack(b)};color:${primary};text-decoration:none">${esc(it.label)}</a>`
          : `<a href="${esc(it.url || '#')}" target="_blank" style="display:inline-block;margin:0 4px 8px;padding:9px 16px;font:600 13px/1 ${fontStack(b)};color:${rc('@text', b)};text-decoration:none;border:1px solid ${rc('#DCE1EA', b)};border-radius:999px">${esc(it.label)}</a>`
      )
      .join('');
    return `<div style="text-align:${al}">${links}</div>`;
  },

  footer: (p, b) => {
    const m = rc('@muted', b);
    const f = fontStack(b);
    return `<div style="text-align:${p.align || 'center'};font:400 12px/1.6 ${f};color:${m}">${
      p.company ? `<div style="font-weight:700;color:${rc('@text', b)};margin:0 0 4px">${esc(p.company)}</div>` : ''
    }${p.address ? `<div>${inline(p.address, m)}</div>` : ''}${
      p.note ? `<div style="margin-top:10px">${inline(p.note, m)}</div>` : ''
    }${
      p.unsubscribeText ? `<div style="margin-top:10px"><a href="${esc(p.unsubscribeUrl || '#')}" target="_blank" style="color:${m};text-decoration:underline">${esc(p.unsubscribeText)}</a></div>` : ''
    }</div>`;
  },

  html: (p) => String(p.html ?? '')
};

/* ------------------------------------------------------------------ */
/* structure: Section > Row > Column > Element                         */
/* ------------------------------------------------------------------ */
export type Mode = 'export' | 'canvas';
interface Ctx { brand: Brand; device: Device; mode: Mode }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const PAD_KEYS = ['padTop', 'padRight', 'padBottom', 'padLeft', 'padX', 'padY'];
const HIDDEN_STYLE = 'display:none;max-height:0;overflow:hidden;mso-hide:all';
const NO_WRAP = new Set(['button', 'divider', 'spacer', 'image', 'lottie']);

const padOf = (p: Props, d: [number, number, number, number]) => ({
  t: num(p.padTop ?? p.padY, d[0]), r: num(p.padRight ?? p.padX, d[1]),
  b: num(p.padBottom ?? p.padY, d[2]), l: num(p.padLeft ?? p.padX, d[3])
});

/** Props for a device: desktop uses props, mobile layers overrides on top. */
export const propsFor = (n: Node, device: Device): Props => (device === 'mobile' ? { ...n.props, ...(n.mobile || {}) } : n.props);

const hiddenOn = (c: Ctx, n: Node) => !!n.hide?.[c.device];
const da = (c: Ctx, n: Node, parentId: string) => (c.mode === 'canvas' ? ` data-nid="${n.id}" data-k="${n.kind}" data-p="${parentId}"` : '');
const stub = (c: Ctx, n: Node, parentId: string) =>
  c.mode === 'canvas'
    ? `<div${da(c, n, parentId)} class="srm-stub">${esc(n.type || n.kind)} · hidden on ${c.device}</div>`
    : '';

/* ---------- shapes: layered CSS backgrounds (behind content, never take space) ---------- */
function rgba(color: string, a: number): string {
  let h = String(color || '').replace('#', '');
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  if (!/^[0-9a-f]{6}$/i.test(h)) return `rgba(46,91,255,${a})`;
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

interface Layer { img: string; size: string; pos: string; rep: string }

function shapeLayer(s: Partial<Shape>, b: Brand): Layer | null {
  const col = rc(s.color || '@primary', b, '#2E5BFF');
  const a = clamp(num(s.opacity, 100), 0, 100) / 100;
  const solid = rgba(col, a), clear = rgba(col, 0);
  const x = num(s.x, 100), y = num(s.y, 0), R = Math.max(1, num(s.size, 120));
  switch (s.kind) {
    case 'circle':
      return { img: `radial-gradient(circle at ${x}% ${y}%,${solid} 0,${solid} ${R}px,${clear} ${R + 1}px)`, size: '100% 100%', pos: '0 0', rep: 'no-repeat' };
    case 'ring': {
      const t = clamp(num(s.thickness, 14), 1, R);
      return { img: `radial-gradient(circle at ${x}% ${y}%,${clear} 0,${clear} ${R - t}px,${solid} ${R - t + 1}px,${solid} ${R}px,${clear} ${R + 1}px)`, size: '100% 100%', pos: '0 0', rep: 'no-repeat' };
    }
    case 'band': {
      const p0 = num(s.pos, 40), p1 = p0 + num(s.bandSize, 20);
      const dir = s.dir === 'v' ? 'to right' : 'to bottom';
      return { img: `linear-gradient(${dir},${clear} 0,${clear} ${p0}%,${solid} ${p0}%,${solid} ${p1}%,${clear} ${p1}%)`, size: '100% 100%', pos: '0 0', rep: 'no-repeat' };
    }
    case 'dots': {
      const g = Math.max(6, num(s.gap, 18)), r = clamp(num(s.size, 2), 1, g / 2);
      return { img: `radial-gradient(circle at 50% 50%,${solid} 0,${solid} ${r}px,${clear} ${r + 1}px)`, size: `${g}px ${g}px`, pos: '0 0', rep: 'repeat' };
    }
    default:
      return null;
  }
}

/** Background colour + optional image + shapes, as inline CSS. Later shapes sit on top of earlier ones. */
function paint(p: Props, b: Brand): { css: string; bg: string } {
  const bg = rc(p.bg, b, '');
  const layers: Layer[] = [];
  const shapes: Partial<Shape>[] = Array.isArray(p.shapes) ? p.shapes : [];
  [...shapes].reverse().forEach((s) => { const l = shapeLayer(s, b); if (l) layers.push(l); });
  if (p.bgImage) layers.push({ img: `url('${esc(String(p.bgImage).replace(/'/g, '%27'))}')`, size: 'cover', pos: 'center', rep: 'no-repeat' });
  let css = bg ? `background-color:${bg};` : '';
  if (layers.length)
    css += `background-image:${layers.map((l) => l.img).join(',')};background-size:${layers.map((l) => l.size).join(',')};background-position:${layers.map((l) => l.pos).join(',')};background-repeat:${layers.map((l) => l.rep).join(',')};`;
  return { css, bg };
}

/* ---------- element ---------- */
function renderEl(n: Node, c: Ctx, parentId: string, colInner: number): string {
  if (hiddenOn(c, n)) return stub(c, n, parentId);
  const p = propsFor(n, c.device);
  const pd = padOf(p, [8, 0, 8, 0]);
  const bw = NO_WRAP.has(n.type || '') ? 100 : clamp(num(p.blockWidth, 100), 10, 100);
  const inner = Math.round(((colInner - pd.l - pd.r) * bw) / 100);
  let html = (n.type && RENDER[n.type]) ? RENDER[n.type](p, c.brand, inner) : '';
  if (bw < 100) {
    const a = p.blockAlign || 'center';
    html = `<table role="presentation" width="${bw}%" align="${a}" cellpadding="0" cellspacing="0" border="0" style="width:${bw}%;${a === 'center' ? 'margin:0 auto;' : a === 'right' ? 'margin-left:auto;' : ''}"><tr><td>${html}</td></tr></table>`;
  }
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td${da(c, n, parentId)} style="padding:${pd.t}px ${pd.r}px ${pd.b}px ${pd.l}px">${html}</td></tr></table>`;
}

/* ---------- column ---------- */
function renderColCell(n: Node, c: Ctx, parentId: string, width: number): string {
  if (hiddenOn(c, n)) return stub(c, n, parentId);
  const p = propsFor(n, c.device);
  const pd = padOf(p, [0, 0, 0, 0]);
  const iw = width - pd.l - pd.r;
  const kids = (n.children || []).map((e) => renderEl(e, c, n.id, iw)).join('');
  const empty = !kids && c.mode === 'canvas' ? '<div class="srm-drop">Drop an element here</div>' : '';
  const { css, bg } = paint(p, c.brand);
  const radius = num(p.radius, 0);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate"><tr><td${da(c, n, parentId)}${bg ? ` bgcolor="${bg}"` : ''} style="font-size:16px;vertical-align:top;${css}${radius ? `border-radius:${radius}px;` : ''}padding:${pd.t}px ${pd.r}px ${pd.b}px ${pd.l}px">${kids}${empty}</td></tr></table>`;
}

/* ---------- row ---------- */
function renderRowNode(n: Node, c: Ctx, parentId: string, T: number): string {
  if (hiddenOn(c, n)) return stub(c, n, parentId);
  const p = propsFor(n, c.device);
  const pd = padOf(p, [0, 0, 0, 0]);
  const gap = num(p.gap, 16);
  const rowValign = p.valign || 'top';
  const stack = p.stack !== false;
  const T2 = T - pd.l - pd.r;
  const cols = (n.children || []).filter((col) => c.mode === 'canvas' || !hiddenOn(c, col));
  const spans = cols.map((col) => Math.max(1, num(propsFor(col, c.device).span, 1)));
  const sum = spans.reduce((a, b) => a + b, 0) || 1;
  const widths = spans.map((sp) => Math.floor((T2 * sp) / sum));
  const count = cols.length;
  const valignOf = (col: Node) => propsFor(col, c.device).valign || rowValign;
  let html = '';
  if (count === 1) {
    html = renderColCell(cols[0], c, n.id, T2);
  } else if (stack) {
    html = `<div style="font-size:0;text-align:left"><!--[if mso]><table role="presentation" width="${T2}" cellpadding="0" cellspacing="0"><tr><td width="${widths[0]}" valign="${valignOf(cols[0])}"><![endif]-->`;
    cols.forEach((col, i) => {
      const gl = i > 0 ? gap / 2 : 0, gr = i < count - 1 ? gap / 2 : 0;
      html += `<div class="srm-col" style="display:inline-block;width:100%;max-width:${widths[i]}px;vertical-align:${valignOf(col)};box-sizing:border-box;padding:0 ${gr}px 0 ${gl}px">${renderColCell(col, c, n.id, widths[i] - gl - gr)}</div>`;
      if (i < count - 1) html += `<!--[if mso]></td><td width="${widths[i + 1]}" valign="${valignOf(cols[i + 1])}"><![endif]-->`;
    });
    html += '<!--[if mso]></td></tr></table><![endif]--></div>';
  } else {
    html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%"><tr>${cols
      .map((col, i) => {
        const gl = i > 0 ? gap / 2 : 0, gr = i < count - 1 ? gap / 2 : 0;
        return `<td width="${Math.round((spans[i] / sum) * 100)}%" valign="${valignOf(col)}" style="padding:0 ${gr}px 0 ${gl}px">${renderColCell(col, c, n.id, widths[i] - gl - gr)}</td>`;
      })
      .join('')}</tr></table>`;
  }
  const { css, bg } = paint(p, c.brand);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate"><tr><td${da(c, n, parentId)}${bg ? ` bgcolor="${bg}"` : ''} style="${css}padding:${pd.t}px ${pd.r}px ${pd.b}px ${pd.l}px">${html}</td></tr></table>`;
}

/* ---------- section (a <tr> of the email's main table) ---------- */
function renderSection(n: Node, c: Ctx, tr: { cls?: string; style?: string } = {}): string {
  if (hiddenOn(c, n)) return c.mode === 'canvas' ? `<tr><td>${stub(c, n, 'root')}</td></tr>` : '';
  const p = propsFor(n, c.device);
  const pd = padOf(p, [24, 24, 24, 24]);
  const w = clamp(num(p.width, 100), 20, 100);
  const al = p.align || 'center';
  const radius = num(p.radius, 0);
  const full = c.device === 'mobile' ? Math.min(c.brand.width, 375) : c.brand.width;
  const T = Math.round((full * w) / 100) - pd.l - pd.r;
  const kids = n.children || [];
  const rows = kids.map((r) => renderRowNode(r, c, n.id, T)).join('');
  const empty = !rows && c.mode === 'canvas' ? '<div class="srm-drop">Empty section. Drag a layout or element in.</div>' : '';
  const mobileOverridesPad = c.device === 'mobile' && !!n.mobile && PAD_KEYS.some((k) => k in n.mobile!);
  const cell = !mobileOverridesPad && (pd.l > 0 || pd.r > 0) ? ' class="srm-cell"' : '';
  const { css, bg } = paint(p, c.brand);
  return `<tr${tr.cls ? ` class="${tr.cls}"` : ''}${tr.style ? ` style="${tr.style}"` : ''}><td style="padding:${num(p.marginTop, 0)}px 0 ${num(p.marginBottom, 0)}px"><table role="presentation" width="${w}%" align="${al}" cellpadding="0" cellspacing="0" border="0" style="width:${w}%;${al === 'center' ? 'margin:0 auto;' : al === 'right' ? 'margin-left:auto;' : ''}border-collapse:separate"><tr><td${cell}${da(c, n, 'root')}${bg ? ` bgcolor="${bg}"` : ''} style="${css}${radius ? `border-radius:${radius}px;` : ''}padding:${pd.t}px ${pd.r}px ${pd.b}px ${pd.l}px">${rows}${empty}</td></tr></table></td></tr>`;
}

/** True when any node in the subtree needs a separate desktop / mobile render. */
function hasDeviceDiff(n: Node, root = true): boolean {
  if (n.mobile && Object.keys(n.mobile).length) return true;
  if (!root && (n.hide?.desktop || n.hide?.mobile)) return true;
  return (n.children || []).some((k) => hasDeviceDiff(k, false));
}

/** Export markup for one section: a single row, or a desktop + mobile pair swapped by media query. */
function sectionExport(sec: Node, brand: Brand): string {
  const hideD = !!sec.hide?.desktop, hideM = !!sec.hide?.mobile;
  if (hideD && hideM) return '';
  const diff = hasDeviceDiff(sec);
  const D: Ctx = { brand, device: 'desktop', mode: 'export' };
  const M: Ctx = { brand, device: 'mobile', mode: 'export' };
  if (!hideD && !hideM && !diff) return renderSection(sec, D);
  const parts: string[] = [];
  if (!hideD) parts.push(renderSection(sec, D, { cls: 'srm-hide-m' }));
  if (!hideM) parts.push(renderSection(sec, M, { cls: 'srm-show-m', style: HIDDEN_STYLE }));
  return parts.filter(Boolean).join('\n');
}

/** What the editor canvas shows for the current device. */
export function canvasHtml(doc: EmailDoc, device: Device): string {
  const c: Ctx = { brand: doc.brand, device, mode: 'canvas' };
  EDIT = true;
  try {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse"><tbody>${doc.sections.map((s) => renderSection(s, c)).join('')}</tbody></table>`;
  } finally {
    EDIT = false;
  }
}

/* ---------- automatic mobile behaviour: one source for export + editor ---------- */
export function mobileRules(b: Brand): [string, string][] {
  const mp = b.mobilePad ?? 16;
  return [
    ['.srm-outer', 'padding:0 !important'],
    ['.srm-cell', `padding-left:${mp}px !important;padding-right:${mp}px !important`],
    ['.srm-col', 'max-width:100% !important;width:100% !important;padding:0 0 16px 0 !important'],
    ['.srm-hero-h', 'font-size:30px !important;line-height:1.2 !important'],
    ['.srm-h1', 'font-size:28px !important'],
    ['.srm-h2', 'font-size:22px !important'],
    ['.srm-h3', 'font-size:18px !important']
  ];
}
/** The same rules scoped to the editor's mobile canvas. */
export const mobileCssScoped = (b: Brand, scope: string) => mobileRules(b).map(([sel, d]) => `${scope} ${sel}{${d}}`).join('\n');

/* ---------- backup marker ---------- */
const MARKER_RE = /<!--SRMAIL:v[12]:([A-Za-z0-9+/=]+)-->/;

export function encodeDoc(doc: EmailDoc): string {
  const bytes = new TextEncoder().encode(JSON.stringify(doc));
  let bin = '';
  bytes.forEach((x) => (bin += String.fromCharCode(x)));
  return btoa(bin);
}

export function decodeMarker(html: string): unknown | null {
  const m = html.match(MARKER_RE);
  if (!m) return null;
  try {
    const bin = atob(m[1]);
    const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

export const BADGE_TEXT = 'Made with Branded Email Maker';
export const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');

function badgeHtml(doc: EmailDoc): string {
  if (doc.badge === false) return '';
  return `<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto"><tr><td align="center" style="padding:16px 0 4px"><a href="${esc(siteUrl() || '#')}" target="_blank" style="display:inline-block;padding:7px 14px;border-radius:999px;background-color:#7C3AED;background-image:linear-gradient(135deg,#6D28D9,#DB2777);color:#FFFFFF;font:700 11px/1 Arial,Helvetica,sans-serif;letter-spacing:.02em;text-decoration:none">&#10022;&nbsp; ${BADGE_TEXT}</a></td></tr></table>`;
}

export function documentToHtml(doc: EmailDoc, opts: { marker?: boolean } = {}): string {
  const b = doc.brand;
  const page = rc('@page', b), surface = rc('@surface', b);
  const rows = doc.sections.map((x) => sectionExport(x, b)).filter(Boolean).join('\n');
  const pre = doc.preheader
    ? `<div style="display:none;font-size:1px;color:${surface};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">${esc(doc.preheader)}${'&nbsp;&zwnj;'.repeat(40)}</div>\n`
    : '';
  const marker = opts.marker ? `<!--SRMAIL:v2:${encodeDoc(doc)}-->\n` : '';
  const mq = mobileRules(b).map(([s, d]) => `${s}{${d}}`).join('');
  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
<title>${esc(doc.subject || doc.name)}</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<style>
body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
table,td{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0}
img{-ms-interpolation-mode:bicubic}
@media only screen and (max-width:480px){${mq}.srm-hide-m{display:none !important;max-height:0 !important;overflow:hidden !important;mso-hide:all}.srm-show-m{display:table-row !important;max-height:none !important;overflow:visible !important}}
</style>
</head>
<body style="margin:0;padding:0;background:${page}">
${marker}${pre}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${page}" style="background:${page}"><tr><td class="srm-outer" align="center" style="padding:24px 12px">
<!--[if mso]><table role="presentation" width="${b.width}" align="center" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
<table role="presentation" width="${b.width}" cellpadding="0" cellspacing="0" border="0" bgcolor="${surface}" style="width:100%;max-width:${b.width}px;background:${surface}">
${rows}
</table>
<!--[if mso]></td></tr></table><![endif]-->
${badgeHtml(doc)}</td></tr></table>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/* pre-flight checks                                                   */
/* ------------------------------------------------------------------ */
export interface Check { level: 'warn' | 'info'; msg: string }

export function lintDoc(doc: EmailDoc): Check[] {
  const out: Check[] = [];
  if (!doc.subject.trim()) out.push({ level: 'warn', msg: 'No subject line set (Email settings).' });
  let hasFooter = false, deviceSpecific = false, hasShapes = false;
  walk(doc.sections, (n, _parent, path) => {
    if (n.mobile && Object.keys(n.mobile).length) deviceSpecific = true;
    if (n.hide?.desktop || n.hide?.mobile) deviceSpecific = true;
    if (Array.isArray(n.props.shapes) && n.props.shapes.length) hasShapes = true;
    if (n.kind !== 'el') return;
    const label = path.map((x) => (x.kind === 'el' ? x.type : x.kind)).join(' › ');
    const p = n.props;
    if (n.type === 'footer' && p.unsubscribeText) hasFooter = true;
    if (n.hide?.desktop && n.hide?.mobile) out.push({ level: 'info', msg: `${label} is hidden on both devices, so it isn't exported.` });
    if (['image', 'video', 'lottie', 'split'].includes(n.type || '')) {
      const src = p.src || p.image || p.thumbnail || p.fallback || '';
      if (n.type !== 'video' && (!src || String(src).includes('placehold.co'))) out.push({ level: 'warn', msg: `${label} is still using the placeholder image.` });
      if (!p.alt) out.push({ level: 'info', msg: `${label} has no alt text.` });
    }
    if (n.type === 'button' && (!p.url || p.url === '#')) out.push({ level: 'warn', msg: `${label} has no link.` });
    if (n.type === 'video') out.push({ level: 'info', msg: `${label}: email clients can't play video, so it exports as a linked thumbnail.` });
    if (n.type === 'lottie') out.push({ level: 'info', msg: `${label}: Lottie isn't supported in email, so the fallback image/GIF is exported.` });
  });
  const bytes = new TextEncoder().encode(documentToHtml(doc)).length;
  if (bytes > 102_000) out.unshift({ level: 'warn', msg: `This email is ${(bytes / 1024).toFixed(0)} KB. Gmail clips messages over about 102 KB and hides the rest behind "View entire message".` });
  else if (bytes > 85_000) out.push({ level: 'info', msg: `This email is ${(bytes / 1024).toFixed(0)} KB, close to Gmail's ~102 KB clipping limit.` });
  if (!hasFooter) out.unshift({ level: 'warn', msg: 'No footer with an unsubscribe link. Most platforms require one.' });
  if (hasShapes) out.push({ level: 'info', msg: 'Shapes are CSS gradient backgrounds: Apple Mail, iOS and most Gmail accounts show them; Outlook desktop shows the plain background colour instead.' });
  if (deviceSpecific) out.push({ level: 'info', msg: 'Device-specific layouts rely on media queries: Outlook desktop and Gmail-app non-Google accounts show the desktop version.' });
  return out;
}
