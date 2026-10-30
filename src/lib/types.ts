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
  kind: 'circle' | 'ring' | 'band' | 'dots';
  color: string;
  opacity: number;   // 5-100
  x: number;         // circle/ring centre, % of container width (can be <0 or >100)
  y: number;         // circle/ring centre, % of container height
  size: number;      // circle/ring radius px, dot radius px
  thickness: number; // ring thickness px
  dir: 'h' | 'v';    // band direction
  pos: number;       // band start, %
  bandSize: number;  // band thickness, %
  gap: number;       // dots spacing px
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
