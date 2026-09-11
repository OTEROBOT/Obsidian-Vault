import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

function openGraphScraperPlugin(): Plugin {
  return {
    name: 'opengraph-scraper',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url) return next();

        // 1. Health check endpoint
        if (req.url === '/api/health' || req.url.startsWith('/api/health?')) {
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify({ status: 'ok', name: 'Obsidian Vault API', timestamp: new Date().toISOString() }));
          return;
        }

        // 2. OpenGraph metadata scraping endpoint
        if (req.url.startsWith('/api/scrape-og')) {
          try {
            const reqUrl = new URL(req.url, 'http://localhost:3000');
            const targetUrl = reqUrl.searchParams.get('url');

            if (!targetUrl) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing url parameter' }));
              return;
            }

            const lowerUrl = targetUrl.toLowerCase();
            const parsedTarget = new URL(targetUrl);

            // YouTube shortcut
            const ytMatch = targetUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
            if (ytMatch && ytMatch[1]) {
              const videoId = ytMatch[1];
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({
                title: `YouTube Media (${videoId})`,
                description: 'Playable embedded inside Obsidian Vault',
                image: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                siteName: 'YouTube',
                favicon: 'https://www.youtube.com/s/desktop/favicon.ico',
                mediaType: 'video',
              }));
              return;
            }

            // Direct Video
            if (lowerUrl.match(/\.(mp4|webm|mov)(\?.*)?$/i)) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({
                title: path.basename(parsedTarget.pathname),
                description: 'Direct video stream',
                image: '',
                siteName: parsedTarget.hostname,
                favicon: `${parsedTarget.origin}/favicon.ico`,
                mediaType: 'video',
              }));
              return;
            }

            // Direct Audio
            if (lowerUrl.match(/\.(mp3|wav|ogg|aac|flac|m4a)(\?.*)?$/i)) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({
                title: path.basename(parsedTarget.pathname),
                description: 'Direct audio stream',
                image: '',
                siteName: parsedTarget.hostname,
                favicon: `${parsedTarget.origin}/favicon.ico`,
                mediaType: 'audio',
              }));
              return;
            }

            // Direct Image
            if (lowerUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i)) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({
                title: path.basename(parsedTarget.pathname),
                description: 'Direct image archive',
                image: targetUrl,
                siteName: parsedTarget.hostname,
                favicon: `${parsedTarget.origin}/favicon.ico`,
                mediaType: 'image',
              }));
              return;
            }

            // Fetch external HTML with timeout
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            try {
              const fetchRes = await fetch(targetUrl, {
                signal: controller.signal,
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 VoidMarkBot/1.0',
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                },
              });
              clearTimeout(timeout);

              if (fetchRes.ok) {
                const html = await fetchRes.text();

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

                let title = getMeta(['og:title', 'twitter:title', 'title']);
                if (!title) {
                  const tm = html.match(/<title[^>]*>([^<]+)<\/title>/i);
                  if (tm && tm[1]) title = tm[1].trim();
                }

                const description = getMeta(['og:description', 'twitter:description', 'description']) || '';
                let image = getMeta(['og:image:secure_url', 'og:image', 'twitter:image', 'twitter:image:src', 'image']);
                if (image && !image.startsWith('http')) {
                  try {
                    image = new URL(image, targetUrl).toString();
                  } catch {
                    // ignore
                  }
                }

                const siteName = getMeta(['og:site_name', 'application-name', 'publisher']) || parsedTarget.hostname.replace('www.', '');
                const favicon = `https://www.google.com/s2/favicons?domain=${parsedTarget.hostname}&sz=64`;

                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 200;
                res.end(JSON.stringify({
                  title: title || parsedTarget.hostname,
                  description,
                  image: image || '',
                  siteName,
                  favicon,
                  mediaType: 'web',
                }));
                return;
              }
            } catch {
              clearTimeout(timeout);
            }

            // Fallback response if fetch fails
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({
              title: parsedTarget.hostname + (parsedTarget.pathname !== '/' ? parsedTarget.pathname : ''),
              description: 'Archived vault bookmark',
              image: '',
              siteName: parsedTarget.hostname.replace('www.', ''),
              favicon: `https://www.google.com/s2/favicons?domain=${parsedTarget.hostname}&sz=64`,
              mediaType: 'web',
              fallback: true,
            }));
            return;
          } catch {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({
              title: 'Vault Link',
              description: '',
              image: '',
              mediaType: 'web',
              fallback: true,
            }));
            return;
          }
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), openGraphScraperPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
