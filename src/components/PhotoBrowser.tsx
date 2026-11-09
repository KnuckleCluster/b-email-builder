'use client';

import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, Search } from 'lucide-react';
import type { Photo } from '@/lib/types';
import { searchStock, stockToPhoto } from '@/lib/stock';
import { startDrag } from '@/lib/dnd';
import { useStore } from '@/lib/store';

const CHIPS = ['Nature', 'Business', 'Tech', 'Food', 'People', 'Home', 'Shopping', 'Events'];
const NOTICES: Record<string, string> = {
  busy: 'Live search is busy right now, so you’re seeing our hand-picked photos.',
  unavailable: 'Live search is unavailable right now, so you’re seeing our hand-picked photos.',
  offline: 'You seem to be offline. Showing our hand-picked photos.'
};

/** Search + grid of free photos. Click a photo to use it; in the sidebar you can also drag it onto the canvas. */
export default function PhotoBrowser({ onPick, draggable = false }: { onPick: (p: Photo) => void; draggable?: boolean }) {
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [source, setSource] = useState<'pexels' | 'curated' | ''>('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const req = useRef(0);

  useEffect(() => { const t = setTimeout(() => setTerm(q.trim()), 350); return () => clearTimeout(t); }, [q]);

  async function load(p: number, replace: boolean) {
    const id = ++req.current;
    setLoading(true);
    try {
      const r = await fetch(`/api/photos?q=${encodeURIComponent(term)}&page=${p}`);
      const d = await r.json();
      if (id !== req.current) return;
      const list: Photo[] = d.photos || [];
      setPhotos((prev) => (replace ? list : [...prev, ...list]));
      setHasMore(!!d.hasMore); setPage(p); setSource(d.source || ''); setNotice(d.notice || '');
    } catch {
      if (id !== req.current) return;
      setPhotos(searchStock(term).map(stockToPhoto)); setSource('curated'); setNotice('offline'); setHasMore(false);
    } finally {
      if (id === req.current) setLoading(false);
    }
  }
  useEffect(() => { load(1, true); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [term]);

  const down = (e: React.PointerEvent, p: Photo) => {
    if (!draggable || e.button !== 0) return;
    e.preventDefault();
    const action = { kind: 'el' as const, type: 'image' as const, preset: { src: p.url, alt: p.alt } };
    startDrag(e, { kind: 'el', commit: (t) => useStore.getState().addFromAction(action, t) }, p.alt || 'Photo', () => onPick(p));
  };

  return (
    <div className="pb">
      <div className="search">
        <Search size={15} />
        <input type="search" placeholder="Search photos" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search photos" />
      </div>
      <div className="pb-chips">
        {CHIPS.map((c) => <button key={c} type="button" className={q.toLowerCase() === c.toLowerCase() ? 'on' : ''} onClick={() => setQ(q.toLowerCase() === c.toLowerCase() ? '' : c)}>{c}</button>)}
      </div>
      {notice && NOTICES[notice] && <p className="pb-notice">{NOTICES[notice]}</p>}
      <div className="pb-grid">
        {photos.map((p) => (
          <button
            key={p.id} type="button" className="ph" title={`${p.alt}${p.credit ? ` · ${p.credit}` : ''}`}
            onPointerDown={draggable ? (e) => down(e, p) : undefined}
            onClick={!draggable ? () => onPick(p) : undefined}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(p); } }}
          >
            <img src={p.thumb} alt={p.alt} loading="lazy" draggable={false} onError={(e) => ((e.currentTarget.parentElement as HTMLElement).style.display = 'none')} />
          </button>
        ))}
      </div>
      {loading && <div className="pb-loading"><LoaderCircle size={16} className="spin" /> Loading photos…</div>}
      {!loading && photos.length === 0 && <p className="empty-note">No photos match “{term}”. Try a simpler word like “office” or “coffee”.</p>}
      {hasMore && !loading && <button className="btn btn-block" onClick={() => load(page + 1, false)}>Load more</button>}
      <p className="pb-credit">
        {source === 'pexels'
          ? <>Photos provided by <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer">Pexels</a></>
          : <>Free photos from <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer">Unsplash</a></>}
        {draggable && ' · drag onto the canvas or click to add'}
      </p>
    </div>
  );
}
