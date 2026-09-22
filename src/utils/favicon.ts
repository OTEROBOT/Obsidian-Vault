/**
 * Utility to reliably update browser favicon and Apple touch icon across all modern browsers,
 * with specific support for Apple Safari iOS / macOS aggressive icon caching and link precedence.
 */
export function updateBrowserFavicon(iconUrl?: string) {
  if (typeof document === 'undefined') return;

  const targetUrl = iconUrl && iconUrl.trim().length > 0 ? iconUrl.trim() : '/favicon.svg?v=2.6';
  const isDataOrBlob = targetUrl.startsWith('data:') || targetUrl.startsWith('blob:');
  const cacheBustedUrl = isDataOrBlob ? targetUrl : `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}v=${Date.now()}`;

  // 1. Query all icon and apple-touch-icon links in document head
  const existingLinks = document.querySelectorAll<HTMLLinkElement>(
    "link[rel*='icon'], link[rel='apple-touch-icon'], link[rel='apple-touch-icon-precomposed'], link[rel='shortcut icon']"
  );

  if (existingLinks.length > 0) {
    existingLinks.forEach((link) => {
      link.href = cacheBustedUrl;
      // If the target is not SVG, remove type="image/svg+xml" so Safari doesn't discard PNG/JPEG/data-URL
      if (
        link.type === 'image/svg+xml' &&
        !targetUrl.endsWith('.svg') &&
        !targetUrl.startsWith('data:image/svg+xml')
      ) {
        link.removeAttribute('type');
      }
    });
  } else {
    const rels = ['icon', 'apple-touch-icon', 'shortcut icon'];
    rels.forEach((rel) => {
      const link = document.createElement('link');
      link.rel = rel;
      link.href = cacheBustedUrl;
      document.head.appendChild(link);
    });
  }

  // 2. Guarantee an apple-touch-icon tag exists specifically for Safari iOS tabs, Home Screen & Bookmarks
  let appleTouchLink = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']");
  if (!appleTouchLink) {
    appleTouchLink = document.createElement('link');
    appleTouchLink.rel = 'apple-touch-icon';
    appleTouchLink.sizes = '180x180';
    document.head.appendChild(appleTouchLink);
  }
  appleTouchLink.href = cacheBustedUrl;

  // 3. Force Safari DOM refresh for the icon element
  const mainIcon = document.getElementById('app-favicon') as HTMLLinkElement | null;
  if (mainIcon && mainIcon.parentNode) {
    const clone = mainIcon.cloneNode(true) as HTMLLinkElement;
    clone.href = cacheBustedUrl;
    mainIcon.parentNode.replaceChild(clone, mainIcon);
  }
}
