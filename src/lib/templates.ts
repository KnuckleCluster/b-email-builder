import type { Node, Props } from './types';
import { SECTION_PRESETS, makeEl, simpleSection } from './nodes';

export interface Template { id: string; label: string; description: string; build: () => Node[] }

const P = (key: string, tweak: Props = {}): Node => {
  const n = SECTION_PRESETS.find((p) => p.key === key)!.build();
  return { ...n, props: { ...n.props, ...tweak } };
};

export const TEMPLATES: Template[] = [
  { id: 'blank', label: 'Blank', description: 'Start from an empty canvas.', build: () => [] },
  {
    id: 'newsletter', label: 'Newsletter', description: 'Hero with shapes, highlights, spotlight and CTA.',
    build: () => [
      P('logo'),
      P('hero'),
      simpleSection([makeEl('text', { text: 'Hi {{first_name}},\n\nHere’s what’s new this week. Skim the highlights below and jump into whatever catches your eye.' })], { padTop: 28, padBottom: 8 }),
      P('features'),
      P('imagetext'),
      P('cta'),
      P('social'),
      P('footer')
    ]
  },
  {
    id: 'announcement', label: 'Announcement', description: 'A single clear message with a call to action.',
    build: () => [
      P('logo'),
      simpleSection([makeEl('image')], { padTop: 0, padBottom: 0, padLeft: 0, padRight: 0 }),
      simpleSection([
        makeEl('heading', { text: 'Something new is here', level: 1, align: 'center' }),
        makeEl('text', { text: 'Share the news in two or three sentences. Keep it simple, keep it useful, and tell people exactly what to do next.', align: 'center', padBottom: 16 }),
        makeEl('button', { text: 'See what’s new' })
      ], { padTop: 32, padBottom: 32, padLeft: 40, padRight: 40 }),
      P('footer')
    ]
  },
  {
    id: 'welcome', label: 'Welcome', description: 'Onboarding: hero, quick wins, testimonial and FAQ.',
    build: () => [P('logo'), P('hero', { bg: '@primary' }), P('features'), P('testimonial'), P('faq'), P('social'), P('footer')]
  }
];
