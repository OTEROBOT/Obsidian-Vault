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
          set: (fn) => { /* no-op or reassign */ },
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

  window.addEventListener('error', (event) => {
    if (event?.message && event.message.includes('fetch') && event.message.includes('getter')) {
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

