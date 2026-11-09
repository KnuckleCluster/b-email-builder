/**
 * Turns "share" style links into direct image URLs that email clients can actually load.
 * Google Drive links become https://lh3.googleusercontent.com/d/<id> (works in Gmail when the file is shared
 * as "Anyone with the link").
 */
export interface FixResult { url: string; note?: string; changed: boolean }

export function fixImageUrl(raw: string): FixResult {
  const v = String(raw || '').trim();
  const same = { url: raw, changed: false };
  if (!v) return same;

  // Google Drive (file/d/ID, open?id=, uc?id=, thumbnail?id=, drive.usercontent download)
  const drive =
    v.match(/drive\.google\.com\/file\/(?:u\/\d+\/)?d\/([-\w]{10,})/) ||
    v.match(/drive\.google\.com\/(?:open|uc|thumbnail)\?[^#]*?\bid=([-\w]{10,})/) ||
    v.match(/docs\.google\.com\/uc\?[^#]*?\bid=([-\w]{10,})/) ||
    v.match(/drive\.usercontent\.google\.com\/(?:download|uc)\?[^#]*?\bid=([-\w]{10,})/);
  if (drive) {
    return { url: `https://lh3.googleusercontent.com/d/${drive[1]}`, changed: true, note: 'Converted your Google Drive link. The file must be shared as “Anyone with the link”.' };
  }

  // Dropbox shared links
  if (/^https?:\/\/(www\.)?dropbox\.com\/s(cl)?\//.test(v)) {
    try {
      const u = new URL(v);
      u.hostname = 'dl.dropboxusercontent.com';
      u.searchParams.delete('dl');
      return { url: u.toString(), changed: true, note: 'Converted your Dropbox link to a direct image link.' };
    } catch { return same; }
  }

  // Imgur page links
  const imgur = v.match(/^https?:\/\/(?:www\.)?imgur\.com\/(?!a\/|gallery\/)([A-Za-z0-9]{5,8})\/?$/);
  if (imgur) return { url: `https://i.imgur.com/${imgur[1]}.jpg`, changed: true, note: 'Converted your Imgur link to a direct image link.' };

  // Pexels photo page -> direct CDN image
  const pexels = v.match(/pexels\.com\/(?:[a-z-]+\/)?photo\/(?:[^/?#]*-)?(\d{4,})\/?/);
  if (pexels) {
    const id = pexels[1];
    return { url: `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1200`, changed: true, note: 'Converted your Pexels page link to a direct image link.' };
  }

  return same;
}

/** Field keys that hold image URLs (links to pages, like buttons, are left alone). */
export const IMAGE_KEYS = ['src', 'image', 'thumbnail', 'fallback', 'bgImage', 'logo', 'logoUrl'];
export const isImageKey = (k: string) => IMAGE_KEYS.includes(k);
