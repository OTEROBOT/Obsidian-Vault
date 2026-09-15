import { Category, Tag } from '../types';

/**
 * Smart Tag & Hashtag Extractor
 * Automatically derives relevant keywords, platform tags, and hashtags from URL, Title, and Description.
 * Supports matching against existing system tags for consistent categorization.
 */
export function extractSmartTags(
  targetUrl: string,
  targetTitle: string,
  targetDesc: string,
  publisher?: string,
  existingTags?: Tag[]
): string[] {
  const detectedTags = new Set<string>();

  const rawUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
  let host = '';
  let path = '';
  try {
    const parsed = new URL(rawUrl);
    host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    path = parsed.pathname.toLowerCase();
  } catch {}

  const fullText = `${targetTitle || ''} ${targetDesc || ''} ${path}`;
  const textLower = fullText.toLowerCase();

  // 1. Analyze domain / platform
  if (host) {
    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      detectedTags.add('YouTube');
      detectedTags.add('Video');
    } else if (host.includes('twitter.com') || host.includes('x.com')) {
      detectedTags.add('X');
    } else if (host.includes('pixiv.net')) {
      detectedTags.add('Pixiv');
      detectedTags.add('Illustration');
      detectedTags.add('Anime');
    } else if (host.includes('fanbox.cc') || host.includes('.fanbox.')) {
      detectedTags.add('Fanbox');
      detectedTags.add('Art');
    } else if (host.includes('dlsite.com')) {
      detectedTags.add('DLsite');
      if (textLower.includes('asmr') || textLower.includes('voice') || textLower.includes('音声')) {
        detectedTags.add('ASMR');
        detectedTags.add('Audio');
      }
    } else if (host.includes('fantia.jp')) {
      detectedTags.add('Fantia');
    } else if (host.includes('patreon.com')) {
      detectedTags.add('Patreon');
    } else if (host.includes('kemono.su') || host.includes('kemono.party')) {
      detectedTags.add('Kemono');
    } else if (
      host.includes('e-hentai.org') ||
      host.includes('exhentai.org') ||
      host.includes('nhentai.net') ||
      host.includes('hitomi.la')
    ) {
      detectedTags.add('Hentai');
      detectedTags.add('Manga');
    } else if (host.includes('github.com') || host.includes('gitlab.com')) {
      detectedTags.add('GitHub');
      detectedTags.add('Dev');
      detectedTags.add('OpenSource');
    } else if (host.includes('artstation.com')) {
      detectedTags.add('ArtStation');
      detectedTags.add('Art');
      detectedTags.add('3D');
    } else if (host.includes('deviantart.com')) {
      detectedTags.add('DeviantArt');
      detectedTags.add('Art');
    } else if (host.includes('bilibili.com')) {
      detectedTags.add('Bilibili');
      detectedTags.add('Video');
      detectedTags.add('Anime');
    } else if (host.includes('spotify.com') || host.includes('soundcloud.com') || host.includes('bandcamp.com')) {
      detectedTags.add('Audio');
      detectedTags.add('Music');
    } else if (host.includes('medium.com') || host.includes('dev.to') || host.includes('substack.com')) {
      detectedTags.add('Article');
      detectedTags.add('Tech');
    } else if (host.includes('figma.com')) {
      detectedTags.add('Figma');
      detectedTags.add('UI/UX');
    } else if (host.includes('unsplash.com') || host.includes('pinterest.com')) {
      detectedTags.add('Photo');
    } else if (host.includes('twitch.tv')) {
      detectedTags.add('Twitch');
      detectedTags.add('LiveStream');
    } else if (host.includes('tiktok.com')) {
      detectedTags.add('TikTok');
      detectedTags.add('Video');
    } else {
      const namePart = host.split('.')[0];
      if (namePart && namePart.length >= 3 && !['google', 'com', 'org', 'net', 'io', 'app', 'co'].includes(namePart)) {
        detectedTags.add(namePart.charAt(0).toUpperCase() + namePart.slice(1));
      }
    }
  }

  if (publisher) {
    const cleanPub = publisher.replace(/[^a-zA-Z0-9]/g, '');
    if (cleanPub.length >= 3) {
      detectedTags.add(cleanPub.charAt(0).toUpperCase() + cleanPub.slice(1));
    }
  }

  // 2. Extract explicit hashtags in title / description (e.g. #cyberpunk #tech)
  const explicitHashtags = fullText.match(/#([\w\u0E00-\u0E7F]+)/g);
  if (explicitHashtags) {
    explicitHashtags.forEach((ht) => {
      const clean = ht.replace(/^#/, '').trim();
      if (clean.length >= 2) detectedTags.add(clean);
    });
  }

  // 3. Keyword rules dictionary
  const keywordMap: Record<string, string[]> = {
    'asmr': ['ASMR'],
    'binaural': ['ASMR', 'Audio'],
    'ear cleaning': ['ASMR'],
    'whisper': ['ASMR'],
    '3dio': ['ASMR', 'Audio'],
    'ku100': ['ASMR', 'Audio'],
    'hentai': ['Hentai'],
    'r-18': ['Hentai'],
    'r18': ['Hentai'],
    'doujin': ['Hentai'],
    'nsfw': ['Hentai'],
    'fanbox': ['Fanbox'],
    'pixiv': ['Pixiv'],
    'cyberpunk': ['Cyberpunk'],
    'blade runner': ['Cyberpunk', 'SciFi'],
    'scifi': ['SciFi'],
    'sci-fi': ['SciFi'],
    'ai': ['AI'],
    'artificial intelligence': ['AI'],
    'gemini': ['AI'],
    'chatgpt': ['AI'],
    'openai': ['AI'],
    'llm': ['AI'],
    'ui/ux': ['UI/UX'],
    'ui': ['UI/UX'],
    'ux': ['UI/UX'],
    'frontend': ['Dev'],
    'react': ['React', 'Dev'],
    'typescript': ['TypeScript', 'Dev'],
    'javascript': ['JavaScript', 'Dev'],
    'vite': ['Vite'],
    'nextjs': ['NextJS', 'Dev'],
    'next.js': ['NextJS', 'Dev'],
    'supabase': ['Supabase', 'Database'],
    'postgres': ['PostgreSQL'],
    'postgresql': ['PostgreSQL'],
    'database': ['Database'],
    'opensource': ['OpenSource'],
    'open source': ['OpenSource'],
    '4k': ['Video4K'],
    'video4k': ['Video4K'],
    '60fps': ['Video4K'],
    'video': ['Video'],
    'cinema': ['Cinema'],
    'synthwave': ['Synthwave', 'Audio'],
    'synth': ['Synthwave'],
    'ambient': ['Audio'],
    'modular': ['Synthwave'],
    'architecture': ['Architecture'],
    'illustration': ['Illustration'],
    'concept art': ['Art'],
    '3d': ['3D'],
    'blender': ['3D'],
  };

  for (const [key, tagsToAdd] of Object.entries(keywordMap)) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'i');
    if (regex.test(textLower)) {
      tagsToAdd.forEach((t) => detectedTags.add(t));
    }
  }

  // 4. Prioritize matching existing system tags from user's database
  if (existingTags && existingTags.length > 0) {
    for (const tag of existingTags) {
      if (!tag.name) continue;
      const tagName = tag.name.trim();
      if (tagName.length < 2) continue;
      const escaped = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'i');
      if (regex.test(textLower) || regex.test(host)) {
        detectedTags.add(tagName);
      }
    }
  }

  // 5. Extract prominent capitalized terms from title
  const stopWords = new Set([
    'the', 'and', 'for', 'with', 'how', 'this', 'from', 'into', 'about', 'your', 'that',
    'will', 'can', 'are', 'was', 'were', 'has', 'have', 'had', 'been', 'what', 'when',
    'where', 'which', 'who', 'why', 'free', 'online', 'watch', 'official', 'video', 'stream',
    'overview', 'edition', 'complete', 'part'
  ]);

  const words = (targetTitle || '').replace(/[^a-zA-Z0-9\s]/g, ' ').split(/\s+/);
  for (const word of words) {
    if (word.length >= 4 && /^[A-Z][a-z]+$/.test(word) && !stopWords.has(word.toLowerCase())) {
      detectedTags.add(word);
    }
  }

  // Return up to 6 highest quality tags
  return Array.from(detectedTags).slice(0, 6);
}

/**
 * Smart Category Detector
 * Analyzes URL domain, title, description, and keyword semantics to automatically
 * pick the most accurate Category from the user's available categories.
 */
export function detectSmartCategory(
  targetUrl: string,
  targetTitle: string,
  targetDesc: string,
  categories: Category[]
): Category | null {
  if (!categories || categories.length === 0) return null;

  // Filter out the 'All' category which is for global filtering only
  const validCategories = categories.filter((c) => c.id !== 'cat-all' && c.slug !== 'all');
  if (validCategories.length === 0) return null;

  const rawUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
  let host = '';
  let path = '';
  try {
    const parsed = new URL(rawUrl);
    host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    path = parsed.pathname.toLowerCase();
  } catch {}

  const fullText = `${targetTitle || ''} ${targetDesc || ''} ${path}`.toLowerCase();

  const findCategory = (predicate: (c: Category) => boolean): Category | null => {
    return validCategories.find(predicate) || null;
  };

  const nameOrSlugMatches = (c: Category, keywords: string[]): boolean => {
    const name = c.name.toLowerCase();
    const slug = (c.slug || '').toLowerCase();
    return keywords.some((kw) => name.includes(kw) || slug.includes(kw));
  };

  // --- Step 1: Direct Domain / Platform Matches ---
  if (host) {
    // 1.1 X (Twitter)
    if (host.includes('twitter.com') || host.includes('x.com')) {
      const match = findCategory((c) => nameOrSlugMatches(c, ['x', 'twitter']));
      if (match) return match;
    }

    // 1.2 Pixiv
    if (host.includes('pixiv.net')) {
      const match = findCategory((c) => nameOrSlugMatches(c, ['pixiv', 'illustration', 'anime', 'art']));
      if (match) return match;
    }

    // 1.3 Fanbox
    if (host.includes('fanbox.cc') || host.includes('.fanbox.')) {
      const match = findCategory((c) => nameOrSlugMatches(c, ['fanbox', 'patreon', 'creator']));
      if (match) return match;
    }

    // 1.4 DLsite
    if (host.includes('dlsite.com')) {
      if (fullText.includes('asmr') || fullText.includes('voice') || fullText.includes('音声')) {
        const asmrMatch = findCategory((c) => nameOrSlugMatches(c, ['asmr', 'audio', 'sound']));
        if (asmrMatch) return asmrMatch;
      }
      const match = findCategory((c) => nameOrSlugMatches(c, ['dlsite', 'hentai', 'asmr', 'audio']));
      if (match) return match;
    }

    // 1.5 Hentai / 18+ Sites
    if (
      host.includes('e-hentai.org') ||
      host.includes('exhentai.org') ||
      host.includes('nhentai.net') ||
      host.includes('hitomi.la')
    ) {
      const match = findCategory((c) => nameOrSlugMatches(c, ['hentai', '18+', 'r18', 'doujin']));
      if (match) return match;
    }

    // 1.6 Video Platforms
    if (
      host.includes('youtube.com') ||
      host.includes('youtu.be') ||
      host.includes('vimeo.com') ||
      host.includes('bilibili.com') ||
      host.includes('twitch.tv') ||
      path.endsWith('.mp4') ||
      path.endsWith('.webm') ||
      path.endsWith('.mkv')
    ) {
      const match = findCategory((c) => nameOrSlugMatches(c, ['video', 'cinema', 'motion']));
      if (match) return match;
    }

    // 1.7 Audio / Synth Platforms
    if (
      host.includes('spotify.com') ||
      host.includes('soundcloud.com') ||
      host.includes('bandcamp.com') ||
      path.endsWith('.mp3') ||
      path.endsWith('.wav') ||
      path.endsWith('.ogg')
    ) {
      const match = findCategory((c) => nameOrSlugMatches(c, ['synth', 'soundscapes', 'audio', 'music']));
      if (match) return match;
    }

    // 1.8 Dev / Tech Platforms
    if (host.includes('github.com') || host.includes('gitlab.com') || host.includes('npmjs.com')) {
      const match = findCategory((c) => nameOrSlugMatches(c, ['dev', 'architecture', 'tools', 'engineering', 'code']));
      if (match) return match;
    }
  }

  // --- Step 2: Content & Keyword Rules ---
  // 2.1 ASMR / Binaural
  if (
    fullText.includes('asmr') ||
    fullText.includes('binaural') ||
    fullText.includes('ear cleaning') ||
    fullText.includes('whisper') ||
    fullText.includes('3dio') ||
    fullText.includes('ku100')
  ) {
    const match = findCategory((c) => nameOrSlugMatches(c, ['asmr', 'soundscapes', 'audio']));
    if (match) return match;
  }

  // 2.2 Hentai / NSFW
  if (
    fullText.includes('hentai') ||
    fullText.includes('r-18') ||
    fullText.includes('r18') ||
    fullText.includes('doujin') ||
    fullText.includes('nsfw') ||
    fullText.includes('eromanga')
  ) {
    const match = findCategory((c) => nameOrSlugMatches(c, ['hentai', '18+', 'r18']));
    if (match) return match;
  }

  // 2.3 Fanbox
  if (fullText.includes('fanbox')) {
    const match = findCategory((c) => nameOrSlugMatches(c, ['fanbox']));
    if (match) return match;
  }

  // 2.4 Pixiv
  if (fullText.includes('pixiv')) {
    const match = findCategory((c) => nameOrSlugMatches(c, ['pixiv', 'illustration']));
    if (match) return match;
  }

  // 2.5 AI & Machine Learning
  if (
    /\b(ai|llm|neural|gpt|gemini|claude|diffusion|machine learning|deep learning|transformer)\b/i.test(fullText)
  ) {
    const match = findCategory((c) => nameOrSlugMatches(c, ['ai', 'neural', 'machine learning']));
    if (match) return match;
  }

  // 2.6 Cyberpunk & Sci-Fi
  if (
    fullText.includes('cyberpunk') ||
    fullText.includes('sci-fi') ||
    fullText.includes('scifi') ||
    fullText.includes('blade runner') ||
    fullText.includes('matrix')
  ) {
    const match = findCategory((c) => nameOrSlugMatches(c, ['cyber', 'sci-fi', 'scifi', 'cyberpunk']));
    if (match) return match;
  }

  // 2.7 Synth & Soundscapes
  if (
    fullText.includes('synthwave') ||
    fullText.includes('synth') ||
    fullText.includes('ambient') ||
    fullText.includes('modular') ||
    fullText.includes('soundscape')
  ) {
    const match = findCategory((c) => nameOrSlugMatches(c, ['synth', 'soundscapes', 'audio']));
    if (match) return match;
  }

  // 2.8 Cinema & Video
  if (
    fullText.includes('4k') ||
    fullText.includes('cinema') ||
    fullText.includes('trailer') ||
    fullText.includes('motion') ||
    fullText.includes('movie') ||
    fullText.includes('video')
  ) {
    const match = findCategory((c) => nameOrSlugMatches(c, ['cinema', 'video', 'motion']));
    if (match) return match;
  }

  // 2.9 Dev Tools & Architecture
  if (
    /\b(dev|developer|postgres|postgresql|vite|react|nextjs|typescript|javascript|architecture|cloud|api|database|rust|golang)\b/i.test(
      fullText
    )
  ) {
    const match = findCategory((c) => nameOrSlugMatches(c, ['dev', 'architecture', 'tools', 'engineering']));
    if (match) return match;
  }

  // 2.10 UI / UX & Design
  if (/\b(ui|ux|ui\/ux|figma|design system|interface|wireframe)\b/i.test(fullText)) {
    const match = findCategory((c) => nameOrSlugMatches(c, ['design', 'ui', 'ux', 'ui/ux']));
    if (match) return match;
  }

  // --- Step 3: Exact or Partial Category Name in Text ---
  for (const cat of validCategories) {
    const cleanName = cat.name.toLowerCase().trim();
    if (cleanName.length >= 3) {
      const escaped = cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'i');
      if (regex.test(fullText)) {
        return cat;
      }
    }
  }

  return null;
}

