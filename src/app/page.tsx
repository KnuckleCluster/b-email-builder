import type { Metadata } from 'next';
import Landing from '@/components/Landing';

export const metadata: Metadata = {
  title: 'Branded Email Maker · Design beautiful HTML emails by dragging',
  description: 'Free drag-and-drop builder for branded, mobile-ready HTML emails. Ready-made templates, shapes, free photos, test emails and inbox previews. No account needed.'
};

export default function Home() {
  return <Landing />;
}
