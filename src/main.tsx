// Guard against read-only getter TypeError on window.fetch in sandboxed iframe environments
if (typeof window !== 'undefined') {
  try {
    let currentFetch = window.fetch;
    const installFetchSetter = (target: any) => {
      if (!target) return;
      try {
        const desc = Object.getOwnPropertyDescriptor(target, 'fetch');
        if (!desc || (desc.get && !desc.set) || desc.configurable) {
          Object.defineProperty(target, 'fetch', {
            get: () => currentFetch,
            set: (fn: typeof fetch) => {
              currentFetch = fn;
            },
            configurable: true,
            enumerable: true,
          });
        }
      } catch {
        // Ignore if restricted
      }
    };

    if (typeof Window !== 'undefined' && Window.prototype) {
      installFetchSetter(Window.prototype);
    }
    installFetchSetter(window);
    try {
      installFetchSetter(Object.getPrototypeOf(window));
    } catch {
      // Ignore
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
      (m.includes('fetch') && (m.includes('getter') || m.includes('cannot set property'))) ||
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

