/**
 * Smart URL and Domain Semantic Parser
 * Derives rich titles, descriptions, categories, tags, and image strategies
 * instantly from URL structure even when third-party servers block scraping.
 */

export interface ParsedUrlMetadata {
  title: string;
  description: string;
  suggestedCategorySlug?: string;
  suggestedTags: string[];
  fallbackImage: string;
  mediaType: 'web' | 'video' | 'audio' | 'image';
  siteName: string;
}

export function parseUrlSemantics(rawUrl: string): ParsedUrlMetadata {
  let cleanUrl = rawUrl.trim();
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    cleanUrl = 'https://' + cleanUrl;
  }

  let parsed: URL;
  try {
    parsed = new URL(cleanUrl);
  } catch {
    return {
      title: cleanUrl,
      description: 'Saved vault link',
      suggestedTags: ['Web'],
      fallbackImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
      mediaType: 'web',
      siteName: 'Web',
    };
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const pathname = parsed.pathname;
  const searchParams = parsed.searchParams;

  // Real-time webpage snapshot fallback from Automattic/WordPress MShots (fast, reliable, free CDN)
  const webSnapshot = `https://s0.wp.com/mshots/v1/${encodeURIComponent(cleanUrl)}?w=800&h=450`;

  // 1. YouTube
  const ytMatch = cleanUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      title: `YouTube Video (${videoId})`,
      description: 'Streamable YouTube content in Obsidian Vault',
      suggestedCategorySlug: 'video',
      suggestedTags: ['YouTube', 'Video'],
      fallbackImage: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      mediaType: 'video',
      siteName: 'YouTube',
    };
  }

  // 2. Direct Video / Audio / Image files
  if (cleanUrl.match(/\.(mp4|webm|mov|mkv)(\?.*)?$/i)) {
    const fileName = decodeURIComponent(pathname.split('/').pop() || 'Video');
    return {
      title: fileName,
      description: `Direct video file stream (${fileName})`,
      suggestedCategorySlug: 'video',
      suggestedTags: ['Video', 'Stream'],
      fallbackImage: webSnapshot,
      mediaType: 'video',
      siteName: hostname,
    };
  }

  if (cleanUrl.match(/\.(mp3|wav|ogg|aac|flac|m4a)(\?.*)?$/i)) {
    const fileName = decodeURIComponent(pathname.split('/').pop() || 'Audio Track');
    return {
      title: fileName,
      description: `Direct audio file stream (${fileName})`,
      suggestedCategorySlug: 'audio',
      suggestedTags: ['Audio', 'Music'],
      fallbackImage: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
      mediaType: 'audio',
      siteName: hostname,
    };
  }

  if (cleanUrl.match(/\.(jpg|jpeg|png|gif|webp|svg|avif)(\?.*)?$/i)) {
    const fileName = decodeURIComponent(pathname.split('/').pop() || 'Artwork');
    return {
      title: fileName,
      description: `High-resolution image archive (${fileName})`,
      suggestedCategorySlug: 'image',
      suggestedTags: ['Image', 'Artwork'],
      fallbackImage: cleanUrl,
      mediaType: 'image',
      siteName: hostname,
    };
  }

  // 3. E-Hentai / ExHentai
  if (hostname.includes('e-hentai.org') || hostname.includes('exhentai.org')) {
    // Tag or Artist page: /tag/artist:mamimi?next=1967815
    const tagMatch = pathname.match(/\/tag\/([^/?#]+)/i);
    if (tagMatch && tagMatch[1]) {
      const rawTag = decodeURIComponent(tagMatch[1]).replace(/\+/g, ' ');
      let displayTag = rawTag;
      const tagsList = ['Hentai', 'Manga'];

      if (rawTag.includes(':')) {
        const [prefix, val] = rawTag.split(':');
        const formattedPrefix = prefix.charAt(0).toUpperCase() + prefix.slice(1);
        displayTag = `${formattedPrefix}: ${val}`;
        tagsList.push(val);
      } else {
        tagsList.push(rawTag);
      }

      return {
        title: `${displayTag} - E-Hentai`,
        description: `E-Hentai archive for ${displayTag}`,
        suggestedCategorySlug: 'hentai',
        suggestedTags: tagsList,
        fallbackImage: webSnapshot,
        mediaType: 'web',
        siteName: 'E-Hentai',
      };
    }

    // Gallery page: /g/12345/abcdef/
    const galleryMatch = pathname.match(/\/g\/(\d+)\/([^/?#]+)/i);
    if (galleryMatch) {
      const gid = galleryMatch[1];
      const gname = decodeURIComponent(galleryMatch[2]).replace(/_/g, ' ');
      return {
        title: gname && gname.length > 2 ? gname : `Gallery #${gid} - E-Hentai`,
        description: `E-Hentai gallery archive #${gid}`,
        suggestedCategorySlug: 'hentai',
        suggestedTags: ['Hentai', 'Gallery', 'Manga'],
        fallbackImage: webSnapshot,
        mediaType: 'web',
        siteName: 'E-Hentai',
      };
    }

    return {
      title: 'E-Hentai Galleries',
      description: 'E-Hentai digital manga and media archive',
      suggestedCategorySlug: 'hentai',
      suggestedTags: ['Hentai', 'Manga'],
      fallbackImage: webSnapshot,
      mediaType: 'web',
      siteName: 'E-Hentai',
    };
  }

  // 4. Pixiv / Fanbox / Kemono
  if (hostname.includes('pixiv.net')) {
    const artMatch = pathname.match(/\/artworks\/(\d+)/i);
    if (artMatch) {
      return {
        title: `Pixiv Artwork #${artMatch[1]}`,
        description: 'Pixiv community illustration and artwork',
        suggestedCategorySlug: 'pixiv',
        suggestedTags: ['Pixiv', 'Illustration', 'Artwork'],
        fallbackImage: webSnapshot,
        mediaType: 'web',
        siteName: 'Pixiv',
      };
    }
    const userMatch = pathname.match(/\/users\/(\d+)/i);
    if (userMatch) {
      return {
        title: `Pixiv Creator #${userMatch[1]}`,
        description: 'Pixiv creator illustration profile and gallery',
        suggestedCategorySlug: 'pixiv',
        suggestedTags: ['Pixiv', 'Artist'],
        fallbackImage: webSnapshot,
        mediaType: 'web',
        siteName: 'Pixiv',
      };
    }
  }

  if (hostname.includes('fanbox.cc')) {
    const creator = hostname.split('.')[0];
    return {
      title: creator && creator !== 'www' ? `${creator} - FANBOX` : 'Pixiv FANBOX',
      description: 'Creator support community on FANBOX',
      suggestedCategorySlug: 'fanbox',
      suggestedTags: ['Fanbox', 'Creator'],
      fallbackImage: webSnapshot,
      mediaType: 'web',
      siteName: 'FANBOX',
    };
  }

  // 5. X / Twitter
  if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
    const statusMatch = pathname.match(/\/([^/]+)\/status\/(\d+)/i);
    if (statusMatch) {
      const user = statusMatch[1];
      return {
        title: `Post by @${user} on X`,
        description: `Social media post on X (formerly Twitter) by @${user}`,
        suggestedCategorySlug: 'x',
        suggestedTags: ['X', 'Social'],
        fallbackImage: webSnapshot,
        mediaType: 'web',
        siteName: 'X (Twitter)',
      };
    }
    const profileMatch = pathname.match(/^\/([^/?#]+)$/i);
    if (profileMatch && !['home', 'explore', 'notifications', 'messages'].includes(profileMatch[1].toLowerCase())) {
      const user = profileMatch[1];
      return {
        title: `@${user} on X`,
        description: `Profile and updates for @${user} on X`,
        suggestedCategorySlug: 'x',
        suggestedTags: ['X', 'Social'],
        fallbackImage: webSnapshot,
        mediaType: 'web',
        siteName: 'X (Twitter)',
      };
    }
  }

  // 6. GitHub
  if (hostname.includes('github.com')) {
    const repoMatch = pathname.match(/^\/([^/]+)\/([^/]+)/);
    if (repoMatch) {
      const owner = repoMatch[1];
      const repo = repoMatch[2];
      return {
        title: `${owner}/${repo} - GitHub`,
        description: `Open source repository on GitHub by ${owner}`,
        suggestedCategorySlug: 'code',
        suggestedTags: ['GitHub', 'Code', 'OpenSource'],
        fallbackImage: `https://opengraph.githubassets.com/1/${owner}/${repo}`,
        mediaType: 'web',
        siteName: 'GitHub',
      };
    }
  }

  // 7. Reddit
  if (hostname.includes('reddit.com')) {
    const subMatch = pathname.match(/\/r\/([^/]+)/i);
    const subName = subMatch ? subMatch[1] : 'reddit';
    const postSlugMatch = pathname.match(/\/comments\/[^/]+\/([^/?#]+)/i);
    let readablePostTitle = `r/${subName} on Reddit`;
    if (postSlugMatch && postSlugMatch[1]) {
      readablePostTitle = postSlugMatch[1]
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }
    return {
      title: readablePostTitle,
      description: `Discussion on Reddit in r/${subName}`,
      suggestedTags: ['Reddit', subName],
      fallbackImage: webSnapshot,
      mediaType: 'web',
      siteName: 'Reddit',
    };
  }

  // 8. Generic clean title derived from URL pathname
  let derivedTitle = hostname;
  const pathParts = pathname
    .split('/')
    .filter(Boolean)
    .map((p) => decodeURIComponent(p).replace(/[-_+]/g, ' ').trim())
    .filter((p) => p.length > 0 && !/^\d+$/.test(p));

  if (pathParts.length > 0) {
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart.length > 2) {
      derivedTitle = lastPart.charAt(0).toUpperCase() + lastPart.slice(1) + ` - ${hostname}`;
    }
  }

  return {
    title: derivedTitle,
    description: `Resource archived from ${hostname}`,
    suggestedTags: [hostname.split('.')[0]],
    fallbackImage: webSnapshot,
    mediaType: 'web',
    siteName: hostname,
  };
}
