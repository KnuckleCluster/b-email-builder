import type { Brand, Node, Props } from './types';
import { SECTION_PRESETS, makeEl, makeRow, makeSection, newShape, simpleSection } from './nodes';
import { stockUrl } from './stock';

export type TemplateCategory = 'General' | 'Business' | 'Real estate' | 'Food & drink' | 'Events' | 'Sales';
export const TEMPLATE_CATEGORIES: TemplateCategory[] = ['General', 'Business', 'Sales', 'Real estate', 'Food & drink', 'Events'];

export interface Template {
  id: string;
  label: string;
  description: string;
  category: TemplateCategory;
  /** each template ships with its own brand palette */
  brand?: Partial<Brand>;
  build: () => Node[];
}

/* ---------- tiny builders ---------- */
const preset = (key: string, tweak: Props = {}): Node => {
  const n = SECTION_PRESETS.find((p) => p.key === key)!.build();
  return { ...n, props: { ...n.props, ...tweak } };
};
const T = (text: string, p: Props = {}) => makeEl('text', { text, ...p });
const H = (text: string, p: Props = {}) => makeEl('heading', { text, level: 2, ...p });
const Btn = (text: string, p: Props = {}) => makeEl('button', { text, align: 'center', ...p });
const Img = (photo: string, alt: string, p: Props = {}, w = 1200) => makeEl('image', { src: stockUrl(photo, w), alt, ...p });
const logo = () => preset('logo');
const footer = (company: string, tweak: Props = {}) => {
  const n = preset('footer');
  return { ...n, children: n.children!.map((r) => ({ ...r, children: r.children!.map((c) => ({ ...c, children: c.children!.map((e) => ({ ...e, props: { ...e.props, company, ...tweak } })) })) })) };
};
const WHITE = '#FFFFFF';

/** Image on one side, copy on the other. */
const split = (photo: string, alt: string, heading: string, text: string, btn: string, flip = false, props: Props = {}) =>
  makeSection([
    makeRow([6, 6], flip
      ? [[H(heading, { level: 2 }), T(text, { color: '@muted', size: 15 }), Btn(btn, { align: 'left', size: 'sm' })], [Img(photo, alt, { radius: 12 }, 900)]]
      : [[Img(photo, alt, { radius: 12 }, 900)], [H(heading, { level: 2 }), T(text, { color: '@muted', size: 15 }), Btn(btn, { align: 'left', size: 'sm' })]],
      { valign: 'middle', gap: 24 })
  ], { padTop: 24, padBottom: 24, ...props });

/** Row of 3 big-number stats. */
const stats = (items: [string, string][], props: Props = {}) =>
  makeSection([
    makeRow([4, 4, 4], items.map(([n, label]) => [H(n, { level: 1, align: 'center', color: '@primary', padBottom: 0 }), T(label, { align: 'center', color: '@muted', size: 13, padTop: 0 })]))
  ], { padTop: 28, padBottom: 28, ...props });

const nav3 = (items: [string, string, string][]) =>
  makeRow([4, 4, 4], items.map(([icon, title, sub]) => [T(icon, { size: 28, align: 'center', padBottom: 2 }), H(title, { level: 3, align: 'center', padBottom: 2 }), T(sub, { align: 'center', color: '@muted', size: 13 })]));

/* ---------- templates ---------- */
export const TEMPLATES: Template[] = [
  { id: 'blank', label: 'Blank', description: 'Start from an empty canvas.', category: 'General', build: () => [] },

  {
    id: 'newsletter', label: 'Weekly newsletter', description: 'Hero with shapes, highlights, a spotlight story and a call to action.', category: 'General',
    brand: { companyName: 'The Weekly Launchpad' },
    build: () => [
      logo(),
      preset('hero'),
      simpleSection([T('Hi {{first_name}},\n\nHere’s what’s new this week. Skim the highlights below and jump into whatever catches your eye.')], { padTop: 28, padBottom: 8 }),
      preset('features'),
      split('photo-1522071820081-009f0129c71c', 'A team collaborating around a table', 'This week’s spotlight', 'Pair a photo with a short paragraph and a clear next step.', 'Read the story'),
      preset('cta'),
      preset('social'),
      footer('The Weekly Launchpad')
    ]
  },

  {
    id: 'announcement', label: 'Announcement', description: 'A single clear message with a big photo and a call to action.', category: 'General',
    brand: { companyName: 'Northwind' },
    build: () => [
      logo(),
      simpleSection([Img('photo-1497366216548-37526070297c', 'A bright modern office', {}, 1400)], { padTop: 0, padBottom: 0, padLeft: 0, padRight: 0 }),
      simpleSection([
        H('Something new is here', { level: 1, align: 'center' }),
        T('Share the news in two or three sentences. Keep it simple, keep it useful, and tell people exactly what to do next.', { align: 'center', padBottom: 16 }),
        Btn('See what’s new')
      ], { padTop: 36, padBottom: 36, padLeft: 40, padRight: 40 }),
      footer('Northwind')
    ]
  },

  {
    id: 'welcome', label: 'Welcome series', description: 'Onboarding: hero, quick wins, testimonial and FAQ.', category: 'General',
    brand: { companyName: 'Welcome Co.' },
    build: () => [logo(), preset('hero', { bg: '@primary' }), preset('features'), preset('testimonial'), preset('faq'), preset('social'), footer('Welcome Co.')]
  },

  {
    id: 'launch', label: 'Product launch', description: 'Dark, glowing hero with a product shot, stats and a pre-order CTA.', category: 'Business',
    brand: { primary: '#7C5CFF', secondary: '#EFEAFF', text: '#0E0B1F', muted: '#5E5A78', page: '#F4F2FF', companyName: 'Orbit' },
    build: () => [
      logo(),
      simpleSection([
        T('INTRODUCING', { size: 12, weight: 700, letterSpacing: 3, color: '#B9A8FF', align: 'center', padBottom: 10 }),
        H('Meet Orbit 2.0', { level: 1, color: WHITE, align: 'center' }),
        T('The fastest way to plan, ship and celebrate your team’s best work.', { size: 17, color: '#D9D3F5', align: 'center', padBottom: 22 }),
        Btn('Get early access', { size: 'lg' })
      ], {
        bg: '@text', padTop: 72, padBottom: 72, padLeft: 32, padRight: 32,
        shapes: [newShape({ kind: 'circle', x: 92, y: 8, size: 190, color: '@primary', opacity: 85 }), newShape({ kind: 'ring', x: 4, y: 92, size: 130, thickness: 14, color: '#FF7AC8', opacity: 45 }), newShape({ kind: 'dots', size: 2, gap: 22, color: WHITE, opacity: 14 })]
      }),
      simpleSection([Img('photo-1498050108023-c5249f4df085', 'A laptop showing code', { radius: 16 }, 1200)], { padTop: 28, padBottom: 8 }),
      stats([['3×', 'faster planning'], ['12k', 'teams onboard'], ['99.9%', 'uptime']]),
      preset('features'),
      preset('cta'),
      footer('Orbit')
    ]
  },

  {
    id: 'agency', label: 'Agency update', description: 'Quarterly results, a case study and a testimonial for B2B audiences.', category: 'Business',
    brand: { primary: '#1D4ED8', secondary: '#DBEAFE', text: '#0B1B3B', muted: '#4A5A78', page: '#EEF3FB', headingFont: 'georgia', companyName: 'Northwind Studio' },
    build: () => [
      logo(),
      simpleSection([
        T('Q3 UPDATE', { size: 12, weight: 700, letterSpacing: 3, color: '@primary', padBottom: 8 }),
        H('A quarter of focus, and the results to prove it', { level: 1 }),
        T('Here’s a quick look at what we shipped for clients, what we learned, and what’s coming next.', { color: '@muted', size: 16 })
      ], { padTop: 36, padBottom: 12 }),
      simpleSection([Img('photo-1522071820081-009f0129c71c', 'The team at work', { radius: 12 }, 1200)], { padTop: 12, padBottom: 8 }),
      stats([['48', 'projects delivered'], ['+62%', 'avg. client growth'], ['4.9/5', 'client rating']], { bg: '@secondary' }),
      split('photo-1460925895917-afdab827c52f', 'A laptop showing analytics', 'Case study: doubling signups', 'How a simple redesign and a sharper offer doubled trial signups in eight weeks.', 'Read the case study', true),
      preset('testimonial'),
      preset('cta'),
      footer('Northwind Studio')
    ]
  },

  {
    id: 'service', label: 'Service intro', description: 'Introduce a service: benefits, simple pricing and an FAQ.', category: 'Business',
    brand: { companyName: 'Your VA Co.' },
    build: () => [
      logo(),
      preset('hero', { bg: '@text' }),
      makeSection([nav3([['📥', 'Inbox care', 'Triage, replies and follow-ups'], ['📅', 'Scheduling', 'Calendars that run themselves'], ['🗂️', 'Admin', 'Docs, data and day-to-day tasks']])], { padTop: 32, padBottom: 24 }),
      preset('pricing'),
      preset('faq'),
      preset('cta'),
      footer('Your VA Co.')
    ]
  },

  {
    id: 'sale', label: 'Big sale', description: 'Bold promo with a discount badge, a product grid and urgency.', category: 'Sales',
    brand: { primary: '#E11D48', secondary: '#FFE4E6', text: '#1A0B10', muted: '#6B4A52', page: '#FFF5F6', companyName: 'Stride & Co.' },
    build: () => [
      logo(),
      simpleSection([
        T('SUMMER SALE', { size: 13, weight: 700, letterSpacing: 3, color: WHITE, align: 'center', padBottom: 14 }),
        makeEl('callout', { text: '50%\nOFF', shape: 'circle', diameter: 190, shapeBg: WHITE, color: '@primary', size: 40, align: 'center' }),
        H('Everything must go', { level: 1, color: WHITE, align: 'center', padTop: 16 }),
        T('Our biggest sale of the year ends Sunday at midnight.', { color: WHITE, align: 'center', padBottom: 18 }),
        Btn('Shop the sale', { bg: WHITE, color: '@primary', size: 'lg' })
      ], {
        bg: '@primary', padTop: 56, padBottom: 56,
        shapes: [newShape({ kind: 'ring', x: 0, y: 0, size: 150, thickness: 16, color: WHITE, opacity: 22 }), newShape({ kind: 'circle', x: 100, y: 100, size: 150, color: '#FF5C7A', opacity: 60 }), newShape({ kind: 'dots', size: 2, gap: 20, color: WHITE, opacity: 14 })]
      }),
      makeSection([
        makeRow([6, 6], [
          [Img('photo-1542291026-7eec264c27ff', 'A red sneaker', { radius: 12 }, 700), H('Classic Runner', { level: 3, padBottom: 0 }), T('$59  ·  was $118', { size: 14, color: '@muted' })],
          [Img('photo-1523275335684-37898b6baf30', 'A wrist watch', { radius: 12 }, 700), H('Everyday Watch', { level: 3, padBottom: 0 }), T('$89  ·  was $178', { size: 14, color: '@muted' })]
        ]),
        makeRow([6, 6], [
          [Img('photo-1505740420928-5e560c06d30e', 'Headphones', { radius: 12 }, 700), H('Studio Headphones', { level: 3, padBottom: 0 }), T('$69  ·  was $138', { size: 14, color: '@muted' })],
          [Img('photo-1441986300917-64674bd600d8', 'A boutique store', { radius: 12 }, 700), H('In-store extras', { level: 3, padBottom: 0 }), T('Extra 10% off at the counter', { size: 14, color: '@muted' })]
        ])
      ], { padTop: 28, padBottom: 20 }),
      simpleSection([makeEl('callout', { text: '⏰  Ends Sunday at midnight. Free shipping over $50.', shape: 'pill', shapeBg: '@secondary', color: '@primary', size: 15, align: 'center' })], { padTop: 8, padBottom: 24 }),
      footer('Stride & Co.')
    ]
  },

  {
    id: 'listing', label: 'New listing', description: 'Just-listed property with photo hero, key facts, gallery and agent card.', category: 'Real estate',
    brand: { primary: '#0F766E', secondary: '#CCFBF1', text: '#0B2B2A', muted: '#4B6361', page: '#EEF7F6', headingFont: 'georgia', companyName: 'Maple Grove Realty' },
    build: () => [
      logo(),
      simpleSection([
        T('JUST LISTED', { size: 12, weight: 700, letterSpacing: 3, color: '#99F6E4', align: 'center', padBottom: 8 }),
        H('412 Maple Grove Lane', { level: 1, color: WHITE, align: 'center' }),
        T('Austin, TX  ·  Offered at $489,000', { size: 16, color: WHITE, align: 'center', padBottom: 18 }),
        Btn('Book a private tour', { size: 'md' })
      ], {
        bg: '@text', bgImage: stockUrl('photo-1568605114967-8130f3a36994', 1400), padTop: 130, padBottom: 56,
        shapes: [newShape({ kind: 'band', dir: 'h', pos: 0, bandSize: 100, color: '@text', opacity: 50 })]
      }),
      makeSection([nav3([['🛏️', '4 beds', 'Primary suite on main'], ['🛁', '3 baths', 'Spa-style primary bath'], ['📐', '2,450 sq ft', 'Open-concept living']])], { padTop: 28, padBottom: 20 }),
      simpleSection([T('Sun-filled and move-in ready, this home pairs an open floor plan with a chef’s kitchen, a quiet backyard and a short walk to the park. Schedule a showing before the weekend open house.', { align: 'center', size: 16 })], { padTop: 8, padBottom: 20, padLeft: 40, padRight: 40 }),
      makeSection([makeRow([6, 6], [[Img('photo-1502672260266-1c1ef2d93688', 'Bright living room', { radius: 12 }, 800)], [Img('photo-1564013799919-ab600027ffc6', 'Modern house exterior', { radius: 12 }, 800)]], { gap: 12 })], { padTop: 8, padBottom: 24 }),
      simpleSection([
        makeEl('callout', { text: 'Open house · Sat 1–4 PM', shape: 'pill', shapeBg: '@secondary', color: '@primary', size: 16, align: 'center', fullWidth: false })
      ], { padTop: 4, padBottom: 24 }),
      makeSection([makeRow([3, 9], [
        [makeEl('image', { src: stockUrl('photo-1573496359142-b8d87734a5a2', 400), alt: 'Your agent', radius: 80 })],
        [H('Jordan Ellis', { level: 3, padBottom: 0 }), T('Listing agent · (512) 555-0147\njordan@maplegrove.com', { size: 14, color: '@muted' })]
      ], { valign: 'middle', gap: 16 })], { bg: '@secondary', padTop: 20, padBottom: 20, width: 92, radius: 16 }),
      footer('Maple Grove Realty', { padTop: 28 })
    ]
  },

  {
    id: 'cafe', label: 'Café promo', description: 'Warm, photo-led promo for a café, bakery or restaurant.', category: 'Food & drink',
    brand: { primary: '#B45309', secondary: '#FEF3C7', text: '#2B1B0E', muted: '#6B5B4B', page: '#FBF5EC', headingFont: 'georgia', companyName: 'Maple & Bean' },
    build: () => [
      logo(),
      makeSection([makeRow([6, 6], [
        [T('FRESH THIS WEEK', { size: 12, weight: 700, letterSpacing: 3, color: '@primary', padBottom: 6 }), H('Cozy mornings, brewed slow', { level: 1 }), T('Seasonal lattes, warm pastries and a corner table with your name on it.', { color: '@muted' }), Btn('Order ahead', { align: 'left' })],
        [Img('photo-1495474472287-4d71bcdd2085', 'A cup of coffee', { radius: 16 }, 900)]
      ], { valign: 'middle', gap: 24 })], {
        bg: '@secondary', padTop: 40, padBottom: 40,
        shapes: [newShape({ kind: 'circle', x: 0, y: 0, size: 110, color: '@primary', opacity: 16 }), newShape({ kind: 'ring', x: 100, y: 100, size: 100, thickness: 12, color: '@primary', opacity: 22 })]
      }),
      simpleSection([H('This week’s favourites', { level: 2, align: 'center' })], { padTop: 32, padBottom: 4 }),
      makeSection([makeRow([4, 4, 4], [
        [Img('photo-1493770348161-369560ae357d', 'Breakfast spread', { radius: 12 }, 500), H('Brunch plate', { level: 3, padBottom: 0 }), T('Eggs, greens, sourdough · $12', { size: 13, color: '@muted' })],
        [Img('photo-1504674900247-0877df9cc836', 'A plated dinner', { radius: 12 }, 500), H('Dinner special', { level: 3, padBottom: 0 }), T('Chef’s pick of the day · $18', { size: 13, color: '@muted' })],
        [Img('photo-1495474472287-4d71bcdd2085', 'Latte', { radius: 12 }, 500), H('Maple latte', { level: 3, padBottom: 0 }), T('Our seasonal favourite · $5', { size: 13, color: '@muted' })]
      ], { gap: 12 })], { padTop: 12, padBottom: 24 }),
      simpleSection([makeEl('callout', { text: '☕  Free pastry with any latte, this week only', shape: 'pill', shapeBg: '@primary', color: WHITE, size: 16, align: 'center' })], { padTop: 4, padBottom: 28 }),
      preset('social'),
      footer('Maple & Bean')
    ]
  },

  {
    id: 'invite', label: 'Event invitation', description: 'Playful invite with date, time, place and an RSVP button.', category: 'Events',
    brand: { primary: '#DB2777', secondary: '#FCE7F3', text: '#240A1B', muted: '#6E4A5E', page: '#FFF1F7', companyName: 'Lumen Events' },
    build: () => [
      logo(),
      simpleSection([
        T('YOU’RE INVITED', { size: 13, weight: 700, letterSpacing: 3, color: '#FBCFE8', align: 'center', padBottom: 10 }),
        H('Lumen Summer Party', { level: 1, color: WHITE, align: 'center' }),
        T('An evening of music, food and good company.', { size: 17, color: '#FCE7F3', align: 'center', padBottom: 20 }),
        Btn('RSVP now', { bg: WHITE, color: '@primary', size: 'lg' })
      ], {
        bg: '@text', padTop: 64, padBottom: 64,
        shapes: [newShape({ kind: 'circle', x: 0, y: 0, size: 160, color: '@primary', opacity: 85 }), newShape({ kind: 'circle', x: 100, y: 100, size: 140, color: '#7C4DFF', opacity: 70 }), newShape({ kind: 'dots', size: 2, gap: 20, color: WHITE, opacity: 12 })]
      }),
      makeSection([nav3([['📅', 'Sat, June 14', 'Doors open 6 PM'], ['📍', 'The Glasshouse', '88 Harbor Street'], ['🎟️', 'Free entry', 'RSVP required']])], { padTop: 32, padBottom: 20 }),
      simpleSection([Img('photo-1492684223066-81342ee5ff30', 'People celebrating', { radius: 16 }, 1200)], { padTop: 8, padBottom: 12 }),
      simpleSection([T('Bring a friend, wear something bright, and come ready to dance. Space is limited, so reply early to save your spot.', { align: 'center' }), Btn('Save my spot', { size: 'md' })], { padTop: 12, padBottom: 32, padLeft: 40, padRight: 40 }),
      footer('Lumen Events')
    ]
  },

  {
    id: 'editorial', label: 'Editorial', description: 'Quiet, typographic layout for essays and long-form updates.', category: 'General',
    brand: { primary: '#111827', secondary: '#F3F4F6', text: '#111827', muted: '#6B7280', page: '#FFFFFF', font: 'georgia', headingFont: 'georgia', companyName: 'The Sunday Edition', radius: 2 },
    build: () => [
      simpleSection([H('The Sunday Edition', { level: 2, align: 'center', letterSpacing: 1 }), T('Issue 42  ·  November', { align: 'center', size: 13, color: '@muted' })], { padTop: 36, padBottom: 12 }),
      simpleSection([makeEl('divider', { color: '@text', thickness: 2, width: 100 })], { padTop: 0, padBottom: 8 }),
      simpleSection([
        H('On doing less, better', { level: 1 }),
        T('A short essay on the quiet power of narrowing your focus, and the three questions I ask before saying yes to anything.', { size: 18, color: '@muted' }),
        Img('photo-1470071459604-3b5ec3a7fe05', 'A foggy forest', { radius: 0 }, 1200),
        T('Most weeks we’re pulled in a dozen directions. Write the paragraph that sets the scene here, then let the idea breathe across a few short lines. Keep paragraphs short. White space is a feature.', { size: 17 }),
        makeEl('quote', { text: '“Focus is a decision to leave something out.”', author: 'Anonymous', role: '' }),
        Btn('Read the full essay', { align: 'left' })
      ], { padTop: 16, padBottom: 32, padLeft: 40, padRight: 40 }),
      footer('The Sunday Edition')
    ]
  }
];
