// Guard against read-only getter TypeError on window.fetch in sandboxed iframe environments
if (typeof window !== 'undefined') {
  try {
    const originalFetch = window.fetch;
    const desc = Object.getOwnPropertyDescriptor(window, 'fetch') ||
                 (typeof Window !== 'undefined' && Object.getOwnPropertyDescriptor(Window.prototype, 'fetch'));
    if (desc && desc.get && !desc.set) {
      try {
        Object.defineProperty(window, 'fetch', {
          get: () => originalFetch,
          set: () => { /* no-op */ },
          configurable: true,
          enumerable: true,
        });
      } catch {
        // Ignore if locked
      }
    }
  } catch {
    // Ignore
  }

  const isIgnorable = (msg: unknown, file?: string, line?: number) => {
    if (!msg) return !file && line === 0;
    const m = String(msg).toLowerCase();
    return (
      m === 'script error.' ||
      m === 'script error' ||
      m.includes('script error') ||
      (m.includes('fetch') && m.includes('getter')) ||
      m.includes('resizeobserver') ||
      (!file && line === 0)
    );
  };

  window.addEventListener('error', (event) => {
    const msg = event?.message || event?.error?.message;
    if (isIgnorable(msg, event?.filename, event?.lineno)) {
      event.preventDefault();
      event.stopImmediatePropagation?.();
      return true;
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    const msg = reason?.message || reason;
    if (isIgnorable(msg, '', 0) || String(msg).toLowerCase().includes('abort')) {
      event.preventDefault();
      event.stopImmediatePropagation?.();
      return true;
    }
  }, true);
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
);

