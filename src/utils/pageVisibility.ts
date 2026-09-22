import { useState, useEffect } from 'react';

/**
 * Hook to monitor tab visibility using the Page Visibility API (`document.hidden`).
 * 
 * Automatically pauses background execution, timers, or long-polling when the user
 * switches tabs or minimizes the window.
 */
export function usePageVisibility(): boolean {
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    return typeof document !== 'undefined' ? !document.hidden : true;
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });
    window.addEventListener('focus', () => setIsVisible(true), { passive: true });
    window.addEventListener('blur', () => {
      // Check if document is actually hidden
      if (document.hidden) setIsVisible(false);
    }, { passive: true });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
}
