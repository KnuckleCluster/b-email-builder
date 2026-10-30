# Branded Email Maker (v0.3)

Drag-and-drop builder for branded HTML emails. Next.js (App Router) + TypeScript + Zustand.

## Run it
```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```
Deploys to Vercel/Netlify as-is (no env vars, no backend).

## How it works
- The document is a tree: **Section > Row > Column > Element** (`Node` in `types.ts`). Any section, row or column can hold **shapes**.
- `src/lib/render.ts` turns the tree into table-based, inline-styled, Outlook-safe HTML. The editor canvas, Preview, Code view and exported file all use that same renderer.
- Canvas interaction is DOM-based: the renderer tags nodes with `data-nid / data-k / data-p`, and selection, hover, drag targets and shape handles are computed from those (`dnd.ts`, `Canvas.tsx`).
- Brand colors are tokens (`@primary`, `@text`, ...). Change the brand once and everything using a token updates.

## Shapes (overlays)
Shapes are not elements. They are CSS gradient layers painted as the *background* of a section, row or column, so they sit behind all content, never add height, and are cropped by the container.
Kinds: circle, ring, band, dots. Position is a % of the container (0% = left/top edge, 100% = right/bottom; beyond that they bleed off), size is in px.
Support: Apple Mail, iOS and most Gmail accounts. Outlook desktop shows the plain background colour instead, so keep shapes decorative.

## Buttons and sizing
Every element has Spacing (per side), and most have Width + Position. Buttons: *Fit to text*, *Custom %* (centered or aligned) or *Full width*.

## Desktop and mobile layouts (v0.2)
- Every block has **Show on desktop / Show on mobile**. Hidden blocks stay in the design and appear as striped stubs in the editor.
- In **Mobile** view, any edit to a block is saved as a *mobile override* (`block.mobile`) on top of its desktop props.
  Overridden fields are marked and can be reset individually.
- **Create mobile-only copy** duplicates a block, hides the original on mobile and the copy on desktop, so you can restructure for phones.
- Export: blocks with different layouts become a desktop row (`.srm-hide-m`) and a mobile row (`.srm-show-m`), swapped by a `max-width:480px` media query.
  Outlook desktop and non-Google accounts in the Gmail app ignore media queries and show the desktop version.
- Automatic mobile rules (`mobileRules()` in `render.ts`): side padding, smaller headings, columns stack to full width.
  The same rules drive the editor's mobile canvas, so what you see matches the export.
- Per-block controls: padding per side, block width and position, font, weight, letter spacing.

## Saving / backup / import
- Autosaves to this browser (`localStorage`, key prefix `srmail:`).
- **Export > Download HTML** embeds a hidden marker comment `<!--SRMAIL:v1:...-->` containing the whole document.
  **Import** reads that marker, so a downloaded email can be re-opened and edited later.
  Some platforms strip HTML comments, so also use **Backup (.json)**.
- **Copy HTML** copies clean HTML with no marker, for pasting into a newsletter platform.

## Project layout
```
src/lib/types.ts       data model (Node tree, Shape, drag types)
src/lib/tree.ts        tree helpers: locate, insert, remove, clone
src/lib/nodes.ts       node factories, section presets, row layouts, palette
src/lib/dnd.ts         drop-target hit-testing + pointer drag controller
src/lib/theme.ts       fonts, brand defaults, color tokens
src/lib/registry.ts    block definitions: defaults + inspector fields + palette
src/lib/render.ts      block renderers, document export, marker encode/decode, lint checks
src/lib/templates.ts   starter templates
src/lib/store.ts       Zustand store (undo/redo, autosave, library)
src/lib/storage.ts     localStorage persistence (swap for an API later)
src/components/        Editor, Palette (Add + Layers), Canvas (overlays), Inspector, Views, Dialogs, TopBar, field controls
```

## Adding an element
1. Add the type to `BlockType` in `types.ts`.
2. Add a renderer in `RENDER` (`render.ts`).
3. Add a `DEFS` entry (defaults + inspector fields) in `registry.ts`, and a palette item in `nodes.ts`.

## Adding a ready-made section
Add an entry to `SECTION_PRESETS` in `nodes.ts` (it appears under Sections in the palette).

## Known limits (v0.1)
- Code view is read-only (editing HTML would detach it from the design).
- Columns are not forced to equal height; nested rows inside columns aren't supported yet.
- Video and Lottie export as a linked thumbnail / fallback image (email clients can't play them).
- Text is edited in the inspector, not inline on the canvas.
- Single user, browser-only storage. `storage.ts` is the seam for accounts/DB later.
