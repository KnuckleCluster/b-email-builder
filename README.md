# Branded Email Maker (v0.7)

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

## Email: feedback + send-test (Brevo only)
Both features send through **Brevo SMTP** from Vercel API routes (`src/app/api/feedback`, `src/app/api/send-test`, shared helpers in `src/lib/mail.ts`).
Nothing depends on n8n or any personal machine being on.

Set these in `.env.local` and in Vercel > Settings > Environment Variables (redeploy afterwards). Never commit them.

| Variable | What it is |
| --- | --- |
| `BREVO_SMTP_USER` | SMTP login from Brevo > SMTP & API > SMTP (looks like `xxxx@smtp-brevo.com`, not your account email) |
| `BREVO_SMTP_KEY` | An SMTP key from the same page |
| `MAIL_FROM` | A sender verified in Brevo, e.g. `Email Maker <you@yourdomain.com>` |
| `FEEDBACK_TO` | Optional. Where feedback arrives. Defaults to the address in `MAIL_FROM` |

- **Feedback** arrives as an email to `FEEDBACK_TO` with the sender's address as Reply-To, and (if they opt in) their design attached as `design.json` that you can import into the app.
- **Send test** (Preview > Send test) emails the current design to any address typed in, with a "this is a test" banner.
- Brevo's free tier is 300/day. Tests stop at `TEST_EMAIL_DAILY_CAP` (250) and feedback keeps working until `EMAIL_DAILY_HARD_CAP` (290), so feedback is never crowded out by tests.
  When a limit or Brevo is unavailable, users see a friendly message and their text stays in the form.
- Abuse protection: timing bot-trap, 5 emails/hour per visitor, 3 tests per recipient per day. These counters live in server memory, so on serverless they are best-effort.
  If the app gets real public traffic, add Upstash Redis (free) or Cloudflare Turnstile.

### Troubleshooting email
- Open `/api/feedback` or `/api/send-test` on your site: it lists any missing variables.
- To test the Brevo login without sending anything: add `DIAGNOSTICS=1` in Vercel, redeploy, open `/api/send-test?check=1` (it also shows where feedback goes, masked), then remove `DIAGNOSTICS`.
- Vercel > your project > Logs: search `failed` for the exact SMTP error, or `delivered` for successful sends.
- Environment variable changes only apply after a new deployment.

## Inbox preview (v0.5)
**Preview > Inbox** shows the subject and preheader as a desktop inbox row and a phone notification, with length hints.
The pre-flight checks also warn when the HTML nears Gmail's ~102 KB clipping limit.

## Pages
- `/` is the landing page (how it works, features, template previews, your recent projects, FAQ). It reads recent projects from the browser.
- `/editor` is the app. Deep links: `/editor?new=<templateId>`, `/editor?open=<docId>`, `/editor?templates=1`, `/editor?guide=1`.

## Writing and editing (v0.7)
- **Inline text editing:** double-click text on the canvas (or select it and press Enter). Enter saves single-line text, Ctrl/Cmd+Enter saves multi-line, Esc cancels.
  Ctrl+B / Ctrl+I / Ctrl+K add `**bold**`, `*italic*` and `[link](https://)` markup. Works on headings, text, buttons, callouts, quotes, FAQ items and table cells.
  The renderer tags editable regions (`data-edit`) on the canvas only; exported HTML never contains them.
- **Image link fixer** (`src/lib/urlfix.ts`): pasting a Google Drive link converts it to `https://lh3.googleusercontent.com/d/<id>` (the file must be shared as "Anyone with the link"). Dropbox, Imgur and Pexels page links are converted too.
- **Photos:** the Photos tab (drag onto the canvas) and the "Browse photos" link under image fields. `/api/photos` uses Pexels when `PEXELS_API_KEY` is set (cached for an hour) and otherwise the hand-picked collection in `src/lib/stock.ts`. If Pexels is busy it falls back automatically.
- **My sections:** select a section, click the bookmark icon, name it. Saved in the browser (`srmail:sections`); drag or click to reuse.
- **Templates:** 12 templates in `src/lib/templates.ts`, each with its own brand palette, shapes and photos. Add one by adding an entry there.
- **Badge:** "Made with Branded Email Maker" appears under exported emails (on by default). Turn it off in Email settings. Link target: `NEXT_PUBLIC_SITE_URL`.

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
src/lib/mail.ts        Brevo SMTP helpers shared by both email routes
src/app/api/           feedback + send-test endpoints (server side)
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
