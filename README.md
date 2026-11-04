# Branded Email Maker (v0.5)

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

## Send test email (v0.5)
**Preview > Send test** (also in Export and the How to send window) emails the current design to an address the user types, via Brevo SMTP
(`src/app/api/send-test/route.ts`, using `nodemailer`). Credentials are environment variables only: `BREVO_SMTP_USER`, `BREVO_SMTP_KEY`, `MAIL_FROM`
(see `.env.example`). Never commit them. Add them in Vercel > Settings > Environment Variables and redeploy.

- Brevo free tier is 300 emails/day. The route stops at `TEST_EMAIL_DAILY_CAP` (default 250) and the UI shows a friendly "busy / unavailable" message instead of an error.
- Because it accepts any recipient, it is limited to 5 tests/hour per visitor, 3 per recipient per day, adds a "this is a test" banner, and has a honeypot field.
  These limits live in server memory, so on serverless they are best-effort. If the app gets public traffic, add Upstash Redis (free) or Cloudflare Turnstile.
- `MAIL_FROM` must be a sender you verified in Brevo (Senders, Domains & Dedicated IPs).

## Inbox preview (v0.5)
**Preview > Inbox** shows the subject and preheader as a desktop inbox row and a phone notification, with length hints.
The pre-flight checks also warn when the HTML nears Gmail's ~102 KB clipping limit.

## Feedback (v0.4)
The **How to send** window explains how to use the exported HTML and has a feedback form. The form posts to `src/app/api/feedback/route.ts`,
which forwards it to ONE provider chosen by environment variables. Copy `.env.example` to `.env.local` (and add the same variables in
Vercel > Settings > Environment Variables), then restart.

| Option | Free tier | Setup |
| --- | --- | --- |
| n8n webhook (`FEEDBACK_WEBHOOK_URL`) | free | Webhook trigger + Gmail/SMTP node. Fields arrive under `body`: `subject`, `text`, `email`, `message`, `type`. Needs an always-on n8n URL (not a laptop tunnel). |
| Resend (`RESEND_API_KEY`, `FEEDBACK_TO`) | 3,000/month, max 100/day | Without a verified domain it can only email the address you signed up with, which is fine for receiving feedback. |
| Web3Forms (`WEB3FORMS_KEY`) | 250/month | Get a key by email, paste it in. No account needed. |

Spam protection: hidden honeypot field, 5 messages/hour/IP (per server instance), length limits. Keys never reach the browser.
Edit the extension link and app version in `src/lib/links.ts`.

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
src/lib/links.ts       extension URL + app version
src/app/api/feedback/  feedback endpoint (server side)
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
