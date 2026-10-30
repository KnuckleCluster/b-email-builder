'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ClipboardCopy } from 'lucide-react';
import { copyText } from '@/lib/docs';
import { useStore } from '@/lib/store';

/** Copy button with built-in feedback: it flips to "Copied" and a toast confirms. */
export default function CopyButton({ getText, label = 'Copy HTML', toast = 'HTML copied to clipboard', className = 'btn' }: {
  getText: () => string; label?: string; toast?: string; className?: string;
}) {
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function onClick() {
    const ok = await copyText(getText());
    if (ok) {
      setDone(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setDone(false), 1800);
      useStore.getState().notify(toast, { kind: 'success' });
    } else {
      useStore.getState().notify('Couldn’t copy. Select the code and copy it manually.', { kind: 'error' });
    }
  }

  return (
    <button type="button" className={`${className} ${done ? 'copied' : ''}`} onClick={onClick} aria-live="polite">
      {done ? <Check size={15} /> : <ClipboardCopy size={15} />}
      {done ? 'Copied' : label}
    </button>
  );
}
