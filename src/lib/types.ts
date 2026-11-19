export type Props = Record<string, any>;

export type BlockType =
  | 'header' | 'hero' | 'heading' | 'text' | 'image' | 'video' | 'lottie'
  | 'button' | 'divider' | 'spacer' | 'callout' | 'split' | 'features'
  | 'faq' | 'table' | 'quote' | 'social' | 'footer' | 'html';

export type NodeKind = 'section' | 'row' | 'col' | 'el';

/** One node in the document tree: Section > Row > Column > Element. */
export interface Node {
  id: string;
  kind: NodeKind;
  /** element type (only for kind === 'el') */
  type?: BlockType;
  props: Props;
  /** Per-device overrides layered on top of `props` for the mobile layout. */
  mobile?: Props;
  /** Hide this node on one device (it stays in the design). */
  hide?: { desktop?: boolean; mobile?: boolean };
  children?: Node[];
}

/** Decorative layer drawn behind a container's content (never takes space). */
export interface Shape {
  id: string;
  kind: 'circle' | 'ring' | 'band' | 'dots' | 'glow' | 'grid' | 'stripes';
  color: string;
  opacity: number;   // 5-100
  x: number;         // circle/ring centre, % of container width (can be <0 or >100)
  y: number;         // circle/ring centre, % of container height
  size: number;      // circle/ring radius px, dot radius px
  thickness: number; // ring thickness px
  dir: 'h' | 'v';    // band direction
  pos: number;       // band start, %
  bandSize: number;  // band thickness, %
  gap: number;       // dots / grid / stripes spacing px
  angle: number;     // stripes angle in degrees
}
export interface Brand {
  primary: string;
  secondary: string;
  text: string;
  muted: string;
  surface: string; // email body background
  page: string;    // outer page background
  font: string;    // key of FONTS
  headingFont: string;
  width: number;   // content width in px
  radius: number;  // default button radius
  mobilePad: number; // side padding on phones
  logoUrl: string;
  companyName: string;
}

export interface EmailDoc {
  id: string;
  name: string;
  subject: string;
  preheader: string;
  brand: Brand;
  sections: Node[];
  /** show the small "Made with" badge under the email (default on) */
  badge?: boolean;
  /** the "frame": rounded container + page background behind the email */
  frame?: Partial<Frame>;
  createdAt: number;
  updatedAt: number;
}

export interface DocMeta {
  id: string;
  name: string;
  updatedAt: number;
  blocks: number;
}

/* ---------- drag & drop ---------- */
export type DragKind = 'section' | 'row' | 'el' | 'shape';
export interface Rect { left: number; top: number; width: number; height: number }
export interface DropTarget {
  kind: DragKind;
  parentId: string | null;
  index: number;
  /** insertion line (viewport coords) */
  line?: Rect;
  /** highlighted container (viewport coords) */
  box?: Rect;
  /** for shapes: pointer position inside the container, in % */
  pct?: { x: number; y: number };
  /** true when the document has no sections yet */
  empty?: boolean;
}
export interface DragState { label: string; x: number; y: number; kind: DragKind; target: DropTarget | null }

/* ---------- photos + saved sections ---------- */
export interface Photo { id: string; thumb: string; url: string; alt: string; credit?: string; creditUrl?: string; /** Unsplash download-tracking endpoint (pinged when a photo is used) */ track?: string }
export interface SavedSection { id: string; name: string; createdAt: number; node: Node }

/* ---------- frame: container + page background ---------- */
export interface Frame {
  radius: number;            // corner radius of the email container (0 = square)
  inset: number;             // space above/below the container, px
  shadow: 'none' | 'soft' | 'lifted';
  bgMode: 'color' | 'image' | 'tile';
  bgColor: string;           // page color (token or hex)
  bgImage: string;           // image URL (single image or repeating tile)
  bgBlur: number;            // 0-50, applied through an image proxy
  bgDim: number;             // 0-90, strength of the fade layer over the image
  bgDimColor: string;        // color of the fade layer
  bgSize: 'cover' | 'contain';
  bgPos: 'center' | 'top' | 'bottom';
  tile: number;              // tile size in px (pattern mode)
  shapes: Shape[];           // decorations drawn over the page color / image
}
