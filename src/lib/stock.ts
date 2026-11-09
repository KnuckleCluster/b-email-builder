import type { Photo } from './types';

/**
 * Hand-picked free-to-use photos (Unsplash). Used by the built-in photo picker (when no live search key is set)
 * and by the starter templates. Unsplash photo IDs are permanent. If one ever 404s, delete or swap its line.
 */
export interface Stock { photo: string; label: string; tags: string[] }

const s = (photo: string, label: string, tags: string[]): Stock => ({ photo, label, tags });

export const stockUrl = (photo: string, w = 1200) => `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=${w}&q=80`;

export const STOCK: Stock[] = [
  // nature & travel
  s('photo-1506744038136-46273834b3fb', 'Mountain valley', ['nature', 'mountain', 'landscape', 'travel']),
  s('photo-1469474968028-56623f02e42e', 'Sunrise over mountains', ['nature', 'sunrise', 'landscape', 'mountain']),
  s('photo-1470071459604-3b5ec3a7fe05', 'Foggy forest', ['nature', 'forest', 'fog', 'calm']),
  s('photo-1441974231531-c6227db76b6e', 'Sunlit forest', ['nature', 'forest', 'green']),
  s('photo-1501785888041-af3ef285b470', 'Lake and mountains', ['nature', 'lake', 'landscape', 'travel']),
  s('photo-1507525428034-b723cf961d3e', 'Tropical beach', ['beach', 'travel', 'ocean', 'summer', 'vacation']),
  s('photo-1518837695005-2083093ee35b', 'Ocean wave', ['ocean', 'wave', 'blue', 'water']),
  s('photo-1519681393784-d120267933ba', 'Starry mountains', ['night', 'stars', 'sky', 'mountain']),
  // business
  s('photo-1497366216548-37526070297c', 'Modern office', ['business', 'office', 'workspace', 'interior']),
  s('photo-1522071820081-009f0129c71c', 'Team collaborating', ['business', 'team', 'office', 'people', 'meeting']),
  s('photo-1521737604893-d14cc237f11d', 'Team at work', ['business', 'team', 'office', 'people']),
  s('photo-1556761175-5973dc0f32e7', 'Team discussion', ['business', 'team', 'meeting', 'people']),
  s('photo-1573496359142-b8d87734a5a2', 'Professional portrait', ['business', 'people', 'portrait', 'woman', 'professional']),
  s('photo-1454165804606-c3d57bc86b40', 'Desk work', ['business', 'desk', 'work', 'laptop', 'papers']),
  s('photo-1504384308090-c894fdcc538d', 'Creative workspace', ['business', 'workspace', 'desk', 'creative']),
  // tech
  s('photo-1498050108023-c5249f4df085', 'Laptop and code', ['tech', 'laptop', 'code', 'developer']),
  s('photo-1517694712202-14dd9538aa97', 'Coding on a laptop', ['tech', 'laptop', 'code', 'developer']),
  s('photo-1551288049-bebda4e38f71', 'Analytics dashboard', ['tech', 'analytics', 'data', 'dashboard', 'charts']),
  s('photo-1460925895917-afdab827c52f', 'Laptop analytics', ['tech', 'analytics', 'laptop', 'business', 'growth']),
  s('photo-1519389950473-47ba0277781c', 'Team with laptops', ['tech', 'team', 'laptop', 'startup', 'people']),
  // food & drink
  s('photo-1495474472287-4d71bcdd2085', 'Coffee cup', ['food', 'coffee', 'cafe', 'drink', 'morning']),
  s('photo-1504674900247-0877df9cc836', 'Plated meal', ['food', 'meal', 'restaurant', 'dinner']),
  s('photo-1493770348161-369560ae357d', 'Breakfast table', ['food', 'breakfast', 'brunch', 'table']),
  // home & real estate
  s('photo-1568605114967-8130f3a36994', 'Suburban house', ['home', 'house', 'real estate', 'property', 'exterior']),
  s('photo-1564013799919-ab600027ffc6', 'Modern house', ['home', 'house', 'real estate', 'modern', 'property']),
  s('photo-1560518883-ce09059eeffa', 'House keys', ['home', 'real estate', 'keys', 'property', 'sale']),
  s('photo-1502672260266-1c1ef2d93688', 'Bright living room', ['home', 'interior', 'living room', 'real estate']),
  s('photo-1493809842364-78817add7ffb', 'Cozy interior', ['home', 'interior', 'cozy', 'living room']),
  // shopping
  s('photo-1441986300917-64674bd600d8', 'Boutique store', ['shopping', 'store', 'retail', 'fashion']),
  s('photo-1523275335684-37898b6baf30', 'Wrist watch', ['shopping', 'product', 'watch', 'accessory']),
  s('photo-1542291026-7eec264c27ff', 'Red sneaker', ['shopping', 'product', 'shoes', 'fashion', 'sale']),
  s('photo-1505740420928-5e560c06d30e', 'Headphones', ['shopping', 'product', 'audio', 'tech']),
  // events & wellness
  s('photo-1492684223066-81342ee5ff30', 'Celebration', ['event', 'party', 'celebration', 'confetti']),
  s('photo-1511578314322-379afb476865', 'Conference crowd', ['event', 'conference', 'people', 'audience']),
  s('photo-1506126613408-eca07ce68773', 'Yoga on the beach', ['wellness', 'yoga', 'health', 'fitness']),
  s('photo-1517836357463-d25dfeac3438', 'Workout', ['wellness', 'fitness', 'gym', 'health'])
];

const norm = (v: string) => v.toLowerCase().trim();

/** Local search over the curated set (label + tags). Empty query returns everything. */
export function searchStock(q: string): Stock[] {
  const terms = norm(q).split(/\s+/).filter(Boolean);
  if (!terms.length) return STOCK;
  return STOCK.filter((p) => {
    const hay = norm(p.label + ' ' + p.tags.join(' '));
    return terms.every((t) => hay.includes(t));
  });
}

export const stockToPhoto = (p: Stock): Photo => ({
  id: p.photo, thumb: stockUrl(p.photo, 420), url: stockUrl(p.photo, 1200), alt: p.label, credit: 'Unsplash', creditUrl: 'https://unsplash.com'
});
