/**
 * Vercel Serverless Function: /api/scrape-og
 * Provides high-speed server-side metadata and webpage image extraction
 * with browser headers, cookie support for gallery sites, and CORS headers.
 */

export default async function handler(req: any, res: any) {
  // CORS support
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const targetUrl = req.query?.url || req.url?.split('url=')[1];
  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  const cleanUrl = decodeURIComponent(targetUrl).trim();

  try {
    const parsedTarget = new URL(cleanUrl);
    const hostname = parsedTarget.hostname.toLowerCase().replace(/^www\./, '');
    const pathname = parsedTarget.pathname;
    const lowerUrl = cleanUrl.toLowerCase();

    // 1. YouTube Shortcut
    const ytMatch = cleanUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    if (ytMatch && ytMatch[1]) {
      const videoId = ytMatch[1];
      const ytImg = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      return res.status(200).json({
        title: `YouTube Video (${videoId})`,
        description: 'Playable embedded inside Obsidian Vault',
        image: ytImg,
        candidateImages: [
          `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          ytImg,
          `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        ],
        siteName: 'YouTube',
        favicon: 'https://www.youtube.com/s/desktop/favicon.ico',
        mediaType: 'video',
      });
    }

    // 2. Direct Media files
    if (lowerUrl.match(/\.(mp4|webm|mov)(\?.*)?$/i)) {
      return res.status(200).json({
        title: pathname.split('/').pop() || 'Video File',
        description: 'Direct video stream',
        image: '',
        candidateImages: [],
        siteName: hostname,
        favicon: `${parsedTarget.origin}/favicon.ico`,
        mediaType: 'video',
      });
    }

    if (lowerUrl.match(/\.(jpg|jpeg|png|gif|webp|svg|avif)(\?.*)?$/i)) {
      return res.status(200).json({
        title: pathname.split('/').pop() || 'Image File',
        description: 'Direct image archive',
        image: cleanUrl,
        candidateImages: [cleanUrl],
        siteName: hostname,
        favicon: `${parsedTarget.origin}/favicon.ico`,
        mediaType: 'image',
      });
    }

    // 3. E-Hentai / ExHentai Semantic Pre-check
    let customCookies = '';
    if (hostname.includes('e-hentai.org') || hostname.includes('exhentai.org')) {
      customCookies = 'nw=1'; // bypass warning/age confirmation
    }

    // 4. Fetch External Webpage with Realistic Browser Headers
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    let html = '';
    try {
      const fetchRes = await fetch(cleanUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,th;q=0.8,ja;q=0.7',
          'Cookie': customCookies,
        },
      });
      clearTimeout(timeout);
      if (fetchRes.ok) {
        html = await fetchRes.text();
      }
    } catch {
      clearTimeout(timeout);
    }

    const liveSnapshot = `https://s0.wp.com/mshots/v1/${encodeURIComponent(cleanUrl)}?w=800&h=450`;

    if (html) {
      const getMeta = (names: string[]): string | null => {
        for (const n of names) {
          const r1 = new RegExp(`<meta[^>]+(?:property|name)=["']${n}["'][^>]+content=["']([^"']*)["']`, 'i');
          const r2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${n}["']`, 'i');
          const m1 = html.match(r1);
          if (m1 && m1[1]) return m1[1].trim();
          const m2 = html.match(r2);
          if (m2 && m2[1]) return m2[1].trim();
        }
        return null;
      };

      let title = getMeta(['og:title', 'twitter:title']);
      if (!title) {
        const tm = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (tm && tm[1]) title = tm[1].trim();
      }

      const description = getMeta(['og:description', 'twitter:description', 'description']) || '';
      let ogImage = getMeta(['og:image:secure_url', 'og:image', 'twitter:image', 'twitter:image:src', 'image']);

      // Discover all candidate images from <img> tags in the page
      const candidateImages: string[] = [];
      const seen = new Set<string>();

      if (ogImage) {
        try {
          if (!ogImage.startsWith('http')) ogImage = new URL(ogImage, cleanUrl).toString();
          candidateImages.push(ogImage);
          seen.add(ogImage);
        } catch {}
      }

      const imgTagRegex = /<img\b([^>]*)>/gi;
      let imgMatch;
      while ((imgMatch = imgTagRegex.exec(html)) !== null && candidateImages.length < 15) {
        const attrs = imgMatch[1];
        const srcMatch = attrs.match(/\b(?:data-(?:highres|original|src|thumb)|src)=["']([^"']+)["']/i);
        if (srcMatch && srcMatch[1]) {
          const raw = srcMatch[1].trim();
          if (
            !raw.includes('spacer') &&
            !raw.includes('pixel') &&
            !raw.includes('1x1') &&
            !raw.includes('favicon') &&
            !raw.startsWith('data:image/svg')
          ) {
            try {
              const full = raw.startsWith('http') ? raw : new URL(raw, cleanUrl).toString();
              if (!seen.has(full)) {
                seen.add(full);
                candidateImages.push(full);
              }
            } catch {}
          }
        }
      }

      // If no og:image, pick the first discovered page image or fallback to liveSnapshot
      const chosenImage = candidateImages.length > 0 ? candidateImages[0] : liveSnapshot;
      if (!candidateImages.includes(liveSnapshot)) {
        candidateImages.push(liveSnapshot);
      }

      const siteName = getMeta(['og:site_name', 'application-name', 'publisher']) || hostname;
      const favicon = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;

      return res.status(200).json({
        title: title || hostname,
        description,
        image: chosenImage,
        candidateImages,
        siteName,
        favicon,
        mediaType: 'web',
      });
    }

    // Fallback if HTML couldn't be loaded directly
    return res.status(200).json({
      title: hostname,
      description: 'Archived vault bookmark',
      image: liveSnapshot,
      candidateImages: [liveSnapshot],
      siteName: hostname,
      favicon: `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`,
      mediaType: 'web',
      fallback: true,
    });
  } catch (err: any) {
    return res.status(200).json({
      title: 'Vault Link',
      description: '',
      image: `https://s0.wp.com/mshots/v1/${encodeURIComponent(cleanUrl)}?w=800&h=450`,
      candidateImages: [],
      mediaType: 'web',
      fallback: true,
    });
  }
}
