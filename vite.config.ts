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

        // 2. Twitter / X oEmbed Proxy endpoint
        if (req.url.startsWith('/api/twitter-oembed')) {
          try {
            const reqUrl = new URL(req.url, 'http://localhost:3000');
            const tweetUrl = reqUrl.searchParams.get('url');
            if (!tweetUrl) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing url parameter' }));
              return;
            }

            const oembedApi = `https://publish.x.com/oembed?url=${encodeURIComponent(tweetUrl)}&theme=dark&align=center&dnt=true&omit_script=false`;
            const oembedRes = await fetch(oembedApi, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                'Accept': 'application/json',
              },
            });

            if (!oembedRes.ok) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = oembedRes.status;
              res.end(JSON.stringify({ error: 'Failed to fetch tweet oEmbed from X' }));
              return;
            }

            const oembedJson = await oembedRes.json();
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'public, max-age=3600');
            res.statusCode = 200;
            res.end(JSON.stringify(oembedJson));
            return;
          } catch (err: any) {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err?.message || 'Server error fetching tweet oEmbed' }));
            return;
          }
        }

        // 3. Pixiv Artwork Info endpoint
        if (req.url.startsWith('/api/pixiv-info')) {
          try {
            const reqUrl = new URL(req.url, 'http://localhost:3000');
            let illustId = reqUrl.searchParams.get('id');
            const inputUrl = reqUrl.searchParams.get('url');

            if (!illustId && inputUrl) {
              const m1 = inputUrl.match(/artworks\/(\d+)/i);
              const m2 = inputUrl.match(/[?&]illust_id=(\d+)/i);
              illustId = m1 ? m1[1] : (m2 ? m2[1] : null);
            }

            if (!illustId) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing Pixiv illust id or url' }));
              return;
            }

            const ajaxUrl = `https://www.pixiv.net/ajax/illust/${illustId}`;
            const pixivRes = await fetch(ajaxUrl, {
              headers: {
                'Referer': `https://www.pixiv.net/artworks/${illustId}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                'Accept': 'application/json',
              },
            });

            if (!pixivRes.ok) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = pixivRes.status;
              res.end(JSON.stringify({ error: 'Failed to fetch Pixiv artwork info' }));
              return;
            }

            const rawJson = await pixivRes.json();
            const b = rawJson.body;
            if (!b) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Pixiv artwork body not found' }));
              return;
            }

            const pageCount = b.pageCount || 1;
            const regularTemplate = b.urls?.regular || '';
            const originalTemplate = b.urls?.original || '';

            const pages: Array<{ index: number; regular: string; original: string; proxiedRegular: string; proxiedOriginal: string }> = [];
            for (let i = 0; i < pageCount; i++) {
              const regularUrl = regularTemplate.replace('_p0_', `_p${i}_`);
              const originalUrl = originalTemplate.replace('_p0.', `_p${i}.`);
              pages.push({
                index: i,
                regular: regularUrl,
                original: originalUrl,
                proxiedRegular: `/api/pixiv-image?url=${encodeURIComponent(regularUrl)}`,
                proxiedOriginal: `/api/pixiv-image?url=${encodeURIComponent(originalUrl)}`,
              });
            }

            const result = {
              id: illustId,
              title: b.title || `Pixiv #${illustId}`,
              description: b.description || '',
              userName: b.userName || 'Unknown Artist',
              userId: b.userId || '',
              userAvatar: b.profileImageUrl ? `/api/pixiv-image?url=${encodeURIComponent(b.profileImageUrl)}` : '',
              tags: Array.isArray(b.tags?.tags) ? b.tags.tags.map((t: any) => t.tag) : [],
              pageCount,
              width: b.width,
              height: b.height,
              createDate: b.createDate,
              pages,
              thumbnailUrl: pages[0]?.proxiedRegular || `https://embed.pixiv.net/decorate.php?illust_id=${illustId}`,
              decorateUrl: `https://embed.pixiv.net/decorate.php?illust_id=${illustId}`,
              rawRegularUrl: b.urls?.regular,
              rawOriginalUrl: b.urls?.original,
            };

            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'public, max-age=1800');
            res.statusCode = 200;
            res.end(JSON.stringify(result));
            return;
          } catch (err: any) {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err?.message || 'Server error fetching Pixiv artwork' }));
            return;
          }
        }

        // 4. Pixiv Image Proxy endpoint (Bypasses hotlink protection & Referer checks)
        if (req.url.startsWith('/api/pixiv-image')) {
          try {
            const reqUrl = new URL(req.url, 'http://localhost:3000');
            const imageUrl = reqUrl.searchParams.get('url');

            if (!imageUrl) {
              res.statusCode = 400;
              res.end('Missing url');
              return;
            }

            const parsed = new URL(imageUrl);
            const isAllowed = parsed.hostname.endsWith('pximg.net') || parsed.hostname.endsWith('pixiv.net');
            if (!isAllowed) {
              res.statusCode = 403;
              res.end('Forbidden domain');
              return;
            }

            const imgRes = await fetch(imageUrl, {
              headers: {
                'Referer': 'https://www.pixiv.net/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
              },
            });

            if (!imgRes.ok) {
              res.statusCode = imgRes.status;
              res.end('Failed to fetch image upstream');
              return;
            }

            const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
            const arrayBuffer = await imgRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Length', buffer.length);
            res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
            res.statusCode = 200;
            res.end(buffer);
            return;
          } catch (err: any) {
            res.statusCode = 500;
            res.end('Proxy error: ' + (err?.message || 'unknown'));
            return;
          }
        }

        // 5. OpenGraph metadata scraping endpoint
        if (req.url.startsWith('/api/scrape-og')) {
          let targetUrl: string | null = null;
          try {
            const reqUrl = new URL(req.url, 'http://localhost:3000');
            targetUrl = reqUrl.searchParams.get('url');

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

            // Pixiv Artwork Shortcut
            if (parsedTarget.hostname.includes('pixiv.net')) {
              const pixivMatch = targetUrl.match(/artworks\/(\d+)/i) || targetUrl.match(/[?&]illust_id=(\d+)/i);
              if (pixivMatch && pixivMatch[1]) {
                const illustId = pixivMatch[1];
                try {
                  const ajaxUrl = `https://www.pixiv.net/ajax/illust/${illustId}`;
                  const pixivRes = await fetch(ajaxUrl, {
                    headers: {
                      'Referer': `https://www.pixiv.net/artworks/${illustId}`,
                      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                      'Accept': 'application/json',
                    },
                  });
                  if (pixivRes.ok) {
                    const data = await pixivRes.json();
                    const b = data?.body;
                    if (b) {
                      const regularImg = b.urls?.regular ? `/api/pixiv-image?url=${encodeURIComponent(b.urls.regular)}` : `https://embed.pixiv.net/decorate.php?illust_id=${illustId}`;
                      const pageCount = b.pageCount || 1;
                      const candidateImages: string[] = [];
                      for (let i = 0; i < Math.min(pageCount, 10); i++) {
                        const pUrl = b.urls?.regular?.replace('_p0_', `_p${i}_`);
                        if (pUrl) candidateImages.push(`/api/pixiv-image?url=${encodeURIComponent(pUrl)}`);
                      }
                      if (candidateImages.length === 0) candidateImages.push(regularImg);

                      res.setHeader('Content-Type', 'application/json');
                      res.statusCode = 200;
                      res.end(JSON.stringify({
                        title: `${b.title} - ${b.userName}`,
                        description: `Pixiv illustration by ${b.userName} (${pageCount} page${pageCount > 1 ? 's' : ''})`,
                        image: regularImg,
                        candidateImages,
                        siteName: `Pixiv (${b.userName})`,
                        favicon: 'https://www.pixiv.net/favicon.ico',
                        mediaType: 'image',
                      }));
                      return;
                    }
                  }
                } catch {}
              }
            }

            // Twitter / X Status Shortcut
            if ((parsedTarget.hostname.includes('x.com') || parsedTarget.hostname.includes('twitter.com')) && targetUrl.includes('/status/')) {
              try {
                const oembedApi = `https://publish.x.com/oembed?url=${encodeURIComponent(targetUrl)}&theme=dark`;
                const oembedRes = await fetch(oembedApi, {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                    'Accept': 'application/json',
                  },
                });
                if (oembedRes.ok) {
                  const oData = await oembedRes.json();
                  const snapshot = `https://s0.wp.com/mshots/v1/${encodeURIComponent(targetUrl)}?w=800&h=450`;
                  res.setHeader('Content-Type', 'application/json');
                  res.statusCode = 200;
                  res.end(JSON.stringify({
                    title: `Post by @${oData.author_name || 'user'} on X`,
                    description: oData.html ? oData.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 200).trim() : 'Live interactive post on X',
                    image: snapshot,
                    candidateImages: [snapshot],
                    siteName: 'X (Twitter)',
                    favicon: 'https://abs.twimg.com/favicons/twitter.3.ico',
                    mediaType: 'web',
                  }));
                  return;
                }
              } catch {}
            }

            // E-Hentai / Mature site cookies
            let customCookies = '';
            if (parsedTarget.hostname.includes('e-hentai.org') || parsedTarget.hostname.includes('exhentai.org')) {
              customCookies = 'nw=1';
            }

            // Fetch external HTML with timeout
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 4500);

            try {
              const fetchRes = await fetch(targetUrl, {
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

                let title = getMeta(['og:title', 'twitter:title']);
                if (!title) {
                  const tm = html.match(/<title[^>]*>([^<]+)<\/title>/i);
                  if (tm && tm[1]) title = tm[1].trim();
                }

                const description = getMeta(['og:description', 'twitter:description', 'description']) || '';
                let ogImage = getMeta(['og:image:secure_url', 'og:image', 'twitter:image', 'twitter:image:src', 'image']);

                const candidateImages: string[] = [];
                const seen = new Set<string>();

                if (ogImage) {
                  try {
                    if (!ogImage.startsWith('http')) ogImage = new URL(ogImage, targetUrl).toString();
                    candidateImages.push(ogImage);
                    seen.add(ogImage);
                  } catch {}
                }

                // Discover images from <img> tags in HTML
                const imgTagRegex = /<img\b([^>]*)>/gi;
                let imgMatch;
                while ((imgMatch = imgTagRegex.exec(html)) !== null && candidateImages.length < 15) {
                  const attrs = imgMatch[1];
                  const srcMatch = attrs.match(/\b(?:data-(?:highres|original|src|thumb)|src)=["']([^"']+)["']/i);
                  if (srcMatch && srcMatch[1]) {
                    const raw = srcMatch[1].trim();
                    if (!raw.includes('spacer') && !raw.includes('pixel') && !raw.includes('1x1') && !raw.includes('favicon') && !raw.startsWith('data:image/svg')) {
                      try {
                        const full = raw.startsWith('http') ? raw : new URL(raw, targetUrl).toString();
                        if (!seen.has(full)) {
                          seen.add(full);
                          candidateImages.push(full);
                        }
                      } catch {}
                    }
                  }
                }

                const liveSnapshot = `https://s0.wp.com/mshots/v1/${encodeURIComponent(targetUrl)}?w=800&h=450`;
                const chosenImage = candidateImages.length > 0 ? candidateImages[0] : liveSnapshot;
                if (!candidateImages.includes(liveSnapshot)) {
                  candidateImages.push(liveSnapshot);
                }

                const siteName = getMeta(['og:site_name', 'application-name', 'publisher']) || parsedTarget.hostname.replace('www.', '');
                const favicon = `https://www.google.com/s2/favicons?domain=${parsedTarget.hostname}&sz=64`;

                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 200;
                res.end(JSON.stringify({
                  title: title || parsedTarget.hostname,
                  description,
                  image: chosenImage,
                  candidateImages,
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
            const liveSnapshot = `https://s0.wp.com/mshots/v1/${encodeURIComponent(targetUrl)}?w=800&h=450`;
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({
              title: parsedTarget.hostname + (parsedTarget.pathname !== '/' ? parsedTarget.pathname : ''),
              description: 'Archived vault bookmark',
              image: liveSnapshot,
              candidateImages: [liveSnapshot],
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
              image: `https://s0.wp.com/mshots/v1/${encodeURIComponent(targetUrl || 'https://google.com')}?w=800&h=450`,
              candidateImages: [],
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
