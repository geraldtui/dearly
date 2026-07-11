"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Keeps a dismissible element (modal, popover, panel) mounted for
 * `durationMs` after `open` flips to false, so its CSS fade-out animation
 * can finish playing instead of the element vanishing instantly. Pair with
 * a `.closing` class in CSS that plays the reverse of the entrance animation.
 */
export function useFadeOut(open: boolean, durationMs = 180) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      if (timer.current) clearTimeout(timer.current);
      setClosing(false);
      setMounted(true);
      return;
    }
    if (!mounted) return;
    setClosing(true);
    timer.current = setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, durationMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // Only `open` should retrigger this — `mounted`/`durationMs` are stable/derived.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return { mounted, closing };
}
