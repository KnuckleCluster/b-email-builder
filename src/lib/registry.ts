import type { BlockType, Props } from './types';
import { PLACEHOLDER } from './render';
import { FONTS } from './theme';

/* ---------- field schema used by the inspector ---------- */
interface Base { key: string; label: string; hint?: string; group?: 'Content' | 'Style' | 'Shapes'; showIf?: (p: Props) => boolean }
export type Field =
  | (Base & { kind: 'text' | 'textarea' | 'url' | 'toggle' })
  | (Base & { kind: 'color'; allowNone?: boolean })
  | (Base & { kind: 'range'; min: number; max: number; step?: number; unit?: string })
  | (Base & { kind: 'select'; options: { value: string | number; label: string }[] })
  | (Base & { kind: 'align' })
  | (Base & { kind: 'table' })
  | (Base & { kind: 'spacing' })
  | (Base & { kind: 'list'; itemName: string; fields: Field[]; make: () => Props; max?: number; min?: number });

const PAD_FIELD: Field = { kind: 'spacing', key: 'pad', label: 'Spacing (px)', group: 'Style' };

/** Fields every element shares (size & position). Some elements manage their own width. */
export const ELEMENT_COMMON: Field[] = [
  PAD_FIELD,
  { kind: 'range', key: 'blockWidth', label: 'Width', min: 10, max: 100, unit: '%', group: 'Style' },
  { kind: 'align', key: 'blockAlign', label: 'Position', group: 'Style', showIf: (p) => +(p.blockWidth ?? 100) < 100 }
];
export const SELF_SIZED = ['button', 'divider', 'spacer', 'image', 'lottie'];
export const elementCommon = (type: BlockType): Field[] => (SELF_SIZED.includes(type) ? [PAD_FIELD] : ELEMENT_COMMON);

const FONT_OPTIONS = [{ value: '', label: 'Brand default' }, ...Object.entries(FONTS).map(([k, f]) => ({ value: k, label: f.label }))];
const TYPE_FIELDS = (): Field[] => [
  { ...(S('fontKey', 'Font', { group: 'Style' }) as any), options: FONT_OPTIONS },
  { ...(S('weight', 'Weight', { group: 'Style' }) as any), options: [{ value: 400, label: 'Regular' }, { value: 700, label: 'Bold' }] },
  { kind: 'range', key: 'letterSpacing', label: 'Letter spacing', min: -1, max: 6, step: 0.5, unit: 'px', group: 'Style' }
];

export interface BlockDef {
  type: BlockType;
  label: string;
  defaults: () => Props;
  fields: Field[];
}

const S = (key: string, label: string, extra: Partial<Field> = {}): Field => ({ kind: 'select', key, label, options: [], ...extra } as Field);
const ALIGN = (key = 'align'): Field => ({ kind: 'align', key, label: 'Alignment', group: 'Style' });

export const DEFS: Record<BlockType, BlockDef> = {
  header: {
    type: 'header', label: 'Logo header',
    defaults: () => ({ logo: '', alt: '', logoWidth: 140, align: 'center', padY: 24, padX: 24 }),
    fields: [
      { kind: 'url', key: 'logo', label: 'Logo image URL', hint: 'Leave empty to use the brand logo (or company name).' },
      { kind: 'text', key: 'alt', label: 'Alt text' },
      { kind: 'range', key: 'logoWidth', label: 'Logo width', min: 40, max: 320, unit: 'px', group: 'Style' },
      ALIGN()
    ]
  },
  hero: {
    type: 'hero', label: 'Hero',
    defaults: () => ({
      eyebrow: 'New this week', heading: 'One big idea, one clear message',
      subheading: 'A short supporting line that tells readers why they should keep going.',
      buttonText: 'Get started', buttonUrl: '', align: 'center', size: 38, color: '#FFFFFF', bg: '@text',
      bgImage: '', buttonBg: '@primary', buttonColor: '#FFFFFF', padY: 56, padX: 32
    }),
    fields: [
      { kind: 'text', key: 'eyebrow', label: 'Eyebrow' },
      { kind: 'textarea', key: 'heading', label: 'Heading' },
      { kind: 'textarea', key: 'subheading', label: 'Subheading' },
      { kind: 'text', key: 'buttonText', label: 'Button text', hint: 'Leave empty to hide the button.' },
      { kind: 'url', key: 'buttonUrl', label: 'Button link', showIf: (p) => !!p.buttonText },
      ALIGN(),
      { kind: 'range', key: 'size', label: 'Heading size', min: 24, max: 60, unit: 'px', group: 'Style' },
      { kind: 'color', key: 'color', label: 'Text color', group: 'Style' },
      { kind: 'url', key: 'bgImage', label: 'Background image URL', group: 'Style', hint: 'Falls back to the background color in Outlook.' },
      { kind: 'color', key: 'buttonBg', label: 'Button color', group: 'Style', showIf: (p) => !!p.buttonText },
      { kind: 'color', key: 'buttonColor', label: 'Button text color', group: 'Style', showIf: (p) => !!p.buttonText }
    ]
  },
  heading: {
    type: 'heading', label: 'Heading',
    defaults: () => ({ text: 'Section heading', level: 2, align: 'left', color: '@text', padY: 16, padX: 24 }),
    fields: [
      { kind: 'textarea', key: 'text', label: 'Text' },
      { ...(S('level', 'Level', { group: 'Style' }) as any), options: [{ value: 1, label: 'H1 · Large' }, { value: 2, label: 'H2 · Medium' }, { value: 3, label: 'H3 · Small' }] },
      ALIGN(),
      { kind: 'color', key: 'color', label: 'Color', group: 'Style' },
      ...TYPE_FIELDS()
    ]
  },
  text: {
    type: 'text', label: 'Text',
    defaults: () => ({ text: 'Write something worth reading. Use **bold**, *italic* and [links](https://example.com) to add emphasis.', size: 16, lineHeight: 1.6, align: 'left', color: '@text', padY: 12, padX: 24 }),
    fields: [
      { kind: 'textarea', key: 'text', label: 'Text', hint: 'Supports **bold**, *italic* and [link text](https://…).' },
      { kind: 'range', key: 'size', label: 'Font size', min: 12, max: 28, unit: 'px', group: 'Style' },
      { kind: 'range', key: 'lineHeight', label: 'Line height', min: 1.2, max: 2, step: 0.1, group: 'Style' },
      ALIGN(),
      { kind: 'color', key: 'color', label: 'Color', group: 'Style' },
      ...TYPE_FIELDS()
    ]
  },
  image: {
    type: 'image', label: 'Image',
    defaults: () => ({ src: PLACEHOLDER(), alt: '', link: '', width: 100, align: 'center', radius: 0, padY: 8, padX: 24 }),
    fields: [
      { kind: 'url', key: 'src', label: 'Image URL', hint: 'Use a public URL (PNG, JPG or GIF).' },
      { kind: 'text', key: 'alt', label: 'Alt text' },
      { kind: 'url', key: 'link', label: 'Link (optional)' },
      { kind: 'range', key: 'width', label: 'Width', min: 20, max: 100, unit: '%', group: 'Style' },
      { kind: 'range', key: 'radius', label: 'Corner radius', min: 0, max: 40, unit: 'px', group: 'Style' },
      ALIGN()
    ]
  },
  video: {
    type: 'video', label: 'Video',
    defaults: () => ({ url: '', thumbnail: '', alt: 'Watch the video', showButton: true, buttonText: 'Watch video', radius: 8, align: 'center', padY: 12, padX: 24 }),
    fields: [
      { kind: 'url', key: 'url', label: 'Video link', hint: 'YouTube links get their thumbnail automatically.' },
      { kind: 'url', key: 'thumbnail', label: 'Thumbnail URL (optional)' },
      { kind: 'text', key: 'alt', label: 'Alt text' },
      { kind: 'toggle', key: 'showButton', label: 'Show "Watch" button' },
      { kind: 'text', key: 'buttonText', label: 'Button text', showIf: (p) => !!p.showButton },
      { kind: 'range', key: 'radius', label: 'Corner radius', min: 0, max: 40, unit: 'px', group: 'Style' },
      ALIGN()
    ]
  },
  lottie: {
    type: 'lottie', label: 'Lottie',
    defaults: () => ({ lottieUrl: '', fallback: PLACEHOLDER(600, 320, 'Lottie fallback'), alt: '', link: '', width: 100, align: 'center', padY: 8, padX: 24 }),
    fields: [
      { kind: 'url', key: 'lottieUrl', label: 'Lottie JSON URL', hint: 'Saved in your backup. Email clients can’t play Lottie.' },
      { kind: 'url', key: 'fallback', label: 'Fallback image / GIF URL', hint: 'This is what actually ships in the email.' },
      { kind: 'text', key: 'alt', label: 'Alt text' },
      { kind: 'url', key: 'link', label: 'Link (optional)' },
      { kind: 'range', key: 'width', label: 'Width', min: 20, max: 100, unit: '%', group: 'Style' },
      ALIGN()
    ]
  },
  button: {
    type: 'button', label: 'Button',
    defaults: () => ({ text: 'Click here', url: '', size: 'md', align: 'center', widthMode: 'auto', blockWidth: 60, bg: '@primary', color: '#FFFFFF', radius: 8, padY: 16, padX: 24 }),
    fields: [
      { kind: 'text', key: 'text', label: 'Label' },
      { kind: 'url', key: 'url', label: 'Link' },
      { ...(S('size', 'Size', { group: 'Style' }) as any), options: [{ value: 'sm', label: 'Small' }, { value: 'md', label: 'Medium' }, { value: 'lg', label: 'Large' }] },
      { ...(S('widthMode', 'Button width', { group: 'Style' }) as any), options: [{ value: 'auto', label: 'Fit to text' }, { value: 'custom', label: 'Custom %' }, { value: 'full', label: 'Full width' }] },
      { kind: 'range', key: 'blockWidth', label: 'Width', min: 20, max: 100, unit: '%', group: 'Style', showIf: (p) => p.widthMode === 'custom' },
      ALIGN(),
      { kind: 'color', key: 'bg', label: 'Button color', group: 'Style' },
      { kind: 'color', key: 'color', label: 'Text color', group: 'Style' },
      { kind: 'range', key: 'radius', label: 'Corner radius', min: 0, max: 40, unit: 'px', group: 'Style' }
    ]
  },
  divider: {
    type: 'divider', label: 'Divider',
    defaults: () => ({ color: '#DCE1EA', thickness: 1, style: 'solid', width: 100, padY: 12, padX: 24 }),
    fields: [
      { kind: 'color', key: 'color', label: 'Color', group: 'Style' },
      { kind: 'range', key: 'thickness', label: 'Thickness', min: 1, max: 8, unit: 'px', group: 'Style' },
      { ...(S('style', 'Line style', { group: 'Style' }) as any), options: [{ value: 'solid', label: 'Solid' }, { value: 'dashed', label: 'Dashed' }, { value: 'dotted', label: 'Dotted' }] },
      { kind: 'range', key: 'width', label: 'Width', min: 10, max: 100, unit: '%', group: 'Style' }
    ]
  },
  spacer: {
    type: 'spacer', label: 'Spacer',
    defaults: () => ({ height: 32, padY: 0, padX: 0 }),
    fields: [{ kind: 'range', key: 'height', label: 'Height', min: 8, max: 160, unit: 'px' }]
  },
  callout: {
    type: 'callout', label: 'Callout / Shape',
    defaults: () => ({ text: 'Highlight something important', shape: 'rounded', shapeBg: '@secondary', color: '@text', size: 18, align: 'center', fullWidth: true, borderWidth: 0, borderColor: '@primary', padding: 22, diameter: 160, padY: 12, padX: 24 }),
    fields: [
      { kind: 'textarea', key: 'text', label: 'Text' },
      { ...(S('shape', 'Shape', { group: 'Style' }) as any), options: [{ value: 'rectangle', label: 'Rectangle' }, { value: 'rounded', label: 'Rounded' }, { value: 'pill', label: 'Pill' }, { value: 'circle', label: 'Circle' }] },
      { kind: 'range', key: 'diameter', label: 'Diameter', min: 80, max: 320, unit: 'px', group: 'Style', showIf: (p) => p.shape === 'circle' },
      { kind: 'toggle', key: 'fullWidth', label: 'Full width', group: 'Style', showIf: (p) => p.shape !== 'circle' },
      { kind: 'range', key: 'padding', label: 'Inner padding', min: 8, max: 60, unit: 'px', group: 'Style', showIf: (p) => p.shape !== 'circle' },
      { kind: 'range', key: 'size', label: 'Font size', min: 12, max: 40, unit: 'px', group: 'Style' },
      ALIGN(),
      { kind: 'color', key: 'shapeBg', label: 'Fill', group: 'Style' },
      { kind: 'color', key: 'color', label: 'Text color', group: 'Style' },
      { kind: 'range', key: 'borderWidth', label: 'Border', min: 0, max: 6, unit: 'px', group: 'Style' },
      { kind: 'color', key: 'borderColor', label: 'Border color', group: 'Style', showIf: (p) => +p.borderWidth > 0 }
    ]
  },
  split: {
    type: 'split', label: 'Image + text',
    defaults: () => ({ image: PLACEHOLDER(520, 380, 'Image'), alt: '', imageSide: 'left', radius: 8, heading: 'Tell the story next to the picture', text: 'Pair an image with a short paragraph and an optional call to action.', buttonText: 'Learn more', buttonUrl: '', padY: 20, padX: 24 }),
    fields: [
      { kind: 'url', key: 'image', label: 'Image URL' },
      { kind: 'text', key: 'alt', label: 'Alt text' },
      { kind: 'text', key: 'heading', label: 'Heading' },
      { kind: 'textarea', key: 'text', label: 'Text' },
      { kind: 'text', key: 'buttonText', label: 'Button text', hint: 'Leave empty to hide the button.' },
      { kind: 'url', key: 'buttonUrl', label: 'Button link', showIf: (p) => !!p.buttonText },
      { ...(S('imageSide', 'Image side', { group: 'Style' }) as any), options: [{ value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }] },
      { kind: 'range', key: 'radius', label: 'Image radius', min: 0, max: 40, unit: 'px', group: 'Style' }
    ]
  },
  features: {
    type: 'features', label: 'Feature columns',
    defaults: () => ({
      align: 'center', padY: 24, padX: 24,
      items: [
        { icon: '🚀', title: 'Fast', text: 'Say it in a line or two.' },
        { icon: '🎯', title: 'Focused', text: 'Say it in a line or two.' },
        { icon: '✨', title: 'Polished', text: 'Say it in a line or two.' }
      ]
    }),
    fields: [
      { kind: 'list', key: 'items', label: 'Columns', itemName: 'Column', max: 4, min: 1, make: () => ({ icon: '⭐', title: 'New feature', text: 'Short description.' }),
        fields: [{ kind: 'text', key: 'icon', label: 'Icon (emoji)' }, { kind: 'text', key: 'title', label: 'Title' }, { kind: 'textarea', key: 'text', label: 'Text' }] },
      ALIGN()
    ]
  },
  faq: {
    type: 'faq', label: 'FAQ',
    defaults: () => ({
      heading: 'Frequently asked questions', padY: 24, padX: 24,
      items: [
        { q: 'How does this work?', a: 'A clear, friendly answer in a sentence or two.' },
        { q: 'Can I change it later?', a: 'Yes. Everything stays editable.' },
        { q: 'Where do I get help?', a: 'Reply to this email and we’ll jump in.' }
      ]
    }),
    fields: [
      { kind: 'text', key: 'heading', label: 'Heading' },
      { kind: 'list', key: 'items', label: 'Questions', itemName: 'Question', min: 1, make: () => ({ q: 'New question?', a: 'Answer.' }),
        fields: [{ kind: 'text', key: 'q', label: 'Question' }, { kind: 'textarea', key: 'a', label: 'Answer' }] }
    ]
  },
  table: {
    type: 'table', label: 'Table',
    defaults: () => ({
      header: true, striped: true, align: 'left', headerBg: '@text', borderColor: '#DCE1EA', padY: 16, padX: 24,
      cells: [['Plan', 'Seats', 'Price'], ['Starter', '1', '$0'], ['Team', '10', '$29'], ['Business', '50', '$99']]
    }),
    fields: [
      { kind: 'table', key: 'cells', label: 'Cells' },
      { kind: 'toggle', key: 'header', label: 'Header row', group: 'Style' },
      { kind: 'toggle', key: 'striped', label: 'Striped rows', group: 'Style' },
      ALIGN(),
      { kind: 'color', key: 'headerBg', label: 'Header color', group: 'Style', showIf: (p) => !!p.header },
      { kind: 'color', key: 'borderColor', label: 'Border color', group: 'Style' }
    ]
  },
  quote: {
    type: 'quote', label: 'Quote',
    defaults: () => ({ text: '“This changed how our team ships email.”', author: 'Alex Rivera', role: 'Head of Ops', size: 20, accent: '@primary', padY: 20, padX: 24 }),
    fields: [
      { kind: 'textarea', key: 'text', label: 'Quote' },
      { kind: 'text', key: 'author', label: 'Name' },
      { kind: 'text', key: 'role', label: 'Role' },
      { kind: 'range', key: 'size', label: 'Font size', min: 14, max: 32, unit: 'px', group: 'Style' },
      { kind: 'color', key: 'accent', label: 'Accent', group: 'Style' }
    ]
  },
  social: {
    type: 'social', label: 'Social links',
    defaults: () => ({ style: 'pill', align: 'center', padY: 16, padX: 24, items: [{ label: 'LinkedIn', url: '' }, { label: 'Facebook', url: '' }, { label: 'Instagram', url: '' }] }),
    fields: [
      { kind: 'list', key: 'items', label: 'Links', itemName: 'Link', make: () => ({ label: 'Website', url: '' }), fields: [{ kind: 'text', key: 'label', label: 'Label' }, { kind: 'url', key: 'url', label: 'URL' }] },
      { ...(S('style', 'Style', { group: 'Style' }) as any), options: [{ value: 'pill', label: 'Pills' }, { value: 'text', label: 'Text links' }] },
      ALIGN()
    ]
  },
  footer: {
    type: 'footer', label: 'Footer',
    defaults: () => ({ company: 'Your Company', address: '123 Main Street, City, ST 00000', note: 'You’re receiving this email because you signed up for updates.', unsubscribeText: 'Unsubscribe', unsubscribeUrl: '{{unsubscribe_url}}', align: 'center', padY: 28, padX: 24, bg: '@page' }),
    fields: [
      { kind: 'text', key: 'company', label: 'Company' },
      { kind: 'textarea', key: 'address', label: 'Address' },
      { kind: 'textarea', key: 'note', label: 'Note' },
      { kind: 'text', key: 'unsubscribeText', label: 'Unsubscribe text' },
      { kind: 'url', key: 'unsubscribeUrl', label: 'Unsubscribe link', hint: 'Merge tag like {{unsubscribe_url}} works with most platforms.' },
      ALIGN()
    ]
  },
  html: {
    type: 'html', label: 'Custom HTML',
    defaults: () => ({ html: '<div style="text-align:center;font:14px Arial,sans-serif;color:#5B6678">Your custom HTML here</div>', padY: 8, padX: 24 }),
    fields: [{ kind: 'textarea', key: 'html', label: 'HTML', hint: 'Use table-based, inline-styled markup for best email support.' }]
  }
};


/* ---------- containers: shapes + section / row / column fields ---------- */
export const SHAPE_ITEM_FIELDS: Field[] = [
  { ...(S('kind', 'Shape') as any), options: [{ value: 'circle', label: 'Circle' }, { value: 'ring', label: 'Ring' }, { value: 'band', label: 'Band' }, { value: 'dots', label: 'Dot pattern' }] },
  { kind: 'color', key: 'color', label: 'Color' },
  { kind: 'range', key: 'opacity', label: 'Opacity', min: 5, max: 100, unit: '%' },
  { kind: 'range', key: 'x', label: 'Horizontal position', min: -60, max: 160, unit: '%', hint: '0% = left edge, 100% = right edge. Past either edge it bleeds off.', showIf: (p) => p.kind === 'circle' || p.kind === 'ring' },
  { kind: 'range', key: 'y', label: 'Vertical position', min: -60, max: 160, unit: '%', showIf: (p) => p.kind === 'circle' || p.kind === 'ring' },
  { kind: 'range', key: 'size', label: 'Radius', min: 10, max: 400, unit: 'px', showIf: (p) => p.kind === 'circle' || p.kind === 'ring' },
  { kind: 'range', key: 'thickness', label: 'Thickness', min: 2, max: 80, unit: 'px', showIf: (p) => p.kind === 'ring' },
  { ...(S('dir', 'Direction') as any), options: [{ value: 'h', label: 'Horizontal band' }, { value: 'v', label: 'Vertical band' }], showIf: (p: Props) => p.kind === 'band' },
  { kind: 'range', key: 'pos', label: 'Band position', min: -20, max: 120, unit: '%', showIf: (p) => p.kind === 'band' },
  { kind: 'range', key: 'bandSize', label: 'Band thickness', min: 1, max: 100, unit: '%', showIf: (p) => p.kind === 'band' },
  { kind: 'range', key: 'size', label: 'Dot radius', min: 1, max: 12, unit: 'px', showIf: (p) => p.kind === 'dots' },
  { kind: 'range', key: 'gap', label: 'Dot spacing', min: 8, max: 60, unit: 'px', showIf: (p) => p.kind === 'dots' }
];
export const SHAPES_FIELD: Field = {
  kind: 'list', key: 'shapes', label: 'Shapes behind content', group: 'Shapes', itemName: 'Shape',
  hint: 'Drawn behind everything, never take space, and are cropped by the container.',
  make: () => ({ id: Math.random().toString(36).slice(2, 8), kind: 'circle', color: '@primary', opacity: 100, x: 100, y: 0, size: 120, thickness: 14, dir: 'h', pos: 40, bandSize: 20, gap: 18 }),
  fields: SHAPE_ITEM_FIELDS
} as Field;

export const SECTION_FIELDS: Field[] = [
  { kind: 'color', key: 'bg', label: 'Background color', group: 'Style', allowNone: true },
  { kind: 'url', key: 'bgImage', label: 'Background image URL', group: 'Style', hint: 'Sits under any shapes. Outlook shows the color instead.' },
  PAD_FIELD,
  { kind: 'range', key: 'width', label: 'Section width', min: 20, max: 100, unit: '%', group: 'Style' },
  { kind: 'align', key: 'align', label: 'Position', group: 'Style', showIf: (p) => +(p.width ?? 100) < 100 },
  { kind: 'range', key: 'radius', label: 'Corner radius', min: 0, max: 48, unit: 'px', group: 'Style' },
  { kind: 'range', key: 'marginTop', label: 'Space above', min: 0, max: 96, unit: 'px', group: 'Style' },
  { kind: 'range', key: 'marginBottom', label: 'Space below', min: 0, max: 96, unit: 'px', group: 'Style' },
  SHAPES_FIELD
];
export const ROW_FIELDS: Field[] = [
  { kind: 'range', key: 'gap', label: 'Gap between columns', min: 0, max: 64, unit: 'px', group: 'Style' },
  { ...(S('valign', 'Vertical alignment', { group: 'Style' }) as any), options: [{ value: 'top', label: 'Top' }, { value: 'middle', label: 'Middle' }, { value: 'bottom', label: 'Bottom' }] },
  { kind: 'toggle', key: 'stack', label: 'Stack columns on mobile', group: 'Style' },
  { kind: 'color', key: 'bg', label: 'Background color', group: 'Style', allowNone: true },
  PAD_FIELD,
  SHAPES_FIELD
];
export const COL_FIELDS: Field[] = [
  { kind: 'range', key: 'span', label: 'Column width (of 12)', min: 1, max: 12, group: 'Style' },
  { ...(S('valign', 'Vertical alignment', { group: 'Style' }) as any), options: [{ value: '', label: 'Same as row' }, { value: 'top', label: 'Top' }, { value: 'middle', label: 'Middle' }, { value: 'bottom', label: 'Bottom' }] },
  { kind: 'color', key: 'bg', label: 'Background color', group: 'Style', allowNone: true },
  PAD_FIELD,
  { kind: 'range', key: 'radius', label: 'Corner radius', min: 0, max: 48, unit: 'px', group: 'Style' },
  SHAPES_FIELD
];
