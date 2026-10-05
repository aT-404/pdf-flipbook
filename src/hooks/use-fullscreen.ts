'use client';

import { useCallback, useEffect, useState, useSyncExternalStore, RefObject } from 'react';

const noopSubscribe = () => () => {};

export function useFullscreen(elementRef: RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  // iPhones do not allow fullscreen for web pages, so the button is hidden there
  const isSupported = useSyncExternalStore(
    noopSubscribe,
    () => document.fullscreenEnabled === true,
    () => false
  );

  const toggleFullscreen = useCallback(async () => {
    const element = elementRef.current;
    if (!element) return;
    try {
      if (!document.fullscreenElement) await element.requestFullscreen();
      else await document.exitFullscreen();
    } catch (err) {
      console.error('Fullscreen failed:', err);
    }
  }, [elementRef]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  return { isFullscreen, isSupported, toggleFullscreen };
}
