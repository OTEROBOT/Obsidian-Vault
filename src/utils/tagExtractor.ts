/**
 * Smart Tag & Hashtag Extractor
 * Automatically derives relevant keywords, platform tags, and hashtags from URL, Title, and Description.
 */

export function extractSmartTags(
  targetUrl: string,
  targetTitle: string,
  targetDesc: string,
  publisher?: string
): string[] {
  const detectedTags = new Set<string>();

  // 1. Analyze domain / platform
  try {
    const rawUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');

    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      detectedTags.add('YouTube');
      detectedTags.add('Video');
    } else if (host.includes('github.com')) {
      detectedTags.add('GitHub');
      detectedTags.add('Dev');
      detectedTags.add('OpenSource');
    } else if (host.includes('twitter.com') || host.includes('x.com')) {
      detectedTags.add('X');
      detectedTags.add('Social');
    } else if (host.includes('artstation.com')) {
      detectedTags.add('ArtStation');
      detectedTags.add('Art');
      detectedTags.add('3D');
    } else if (host.includes('pixiv.net')) {
      detectedTags.add('Pixiv');
      detectedTags.add('Anime');
      detectedTags.add('Illustration');
    } else if (host.includes('deviantart.com')) {
      detectedTags.add('DeviantArt');
      detectedTags.add('Art');
    } else if (host.includes('bilibili.com')) {
      detectedTags.add('Bilibili');
      detectedTags.add('Anime');
      detectedTags.add('Video');
    } else if (host.includes('e-hentai.org') || host.includes('exhentai.org')) {
      detectedTags.add('Gallery');
      detectedTags.add('Manga');
      detectedTags.add('Art');
    } else if (host.includes('spotify.com') || host.includes('soundcloud.com')) {
      detectedTags.add('Music');
      detectedTags.add('Audio');
    } else if (host.includes('medium.com') || host.includes('dev.to') || host.includes('substack.com')) {
      detectedTags.add('Article');
      detectedTags.add('Tech');
    } else if (host.includes('figma.com')) {
      detectedTags.add('Figma');
      detectedTags.add('UI/UX');
      detectedTags.add('Design');
    } else if (host.includes('unsplash.com') || host.includes('pinterest.com')) {
      detectedTags.add('Photo');
      detectedTags.add('Inspiration');
    } else if (host.includes('reddit.com')) {
      detectedTags.add('Reddit');
    } else if (host.includes('twitch.tv')) {
      detectedTags.add('Twitch');
      detectedTags.add('LiveStream');
    } else if (host.includes('tiktok.com')) {
      detectedTags.add('TikTok');
      detectedTags.add('Video');
    } else if (host.includes('facebook.com') || host.includes('instagram.com')) {
      detectedTags.add('Social');
    } else {
      // General recognized brand/domain tag
      const namePart = host.split('.')[0];
      if (namePart && namePart.length >= 3 && !['google', 'com', 'org', 'net', 'io', 'app'].includes(namePart)) {
        detectedTags.add(namePart.charAt(0).toUpperCase() + namePart.slice(1));
      }
    }
  } catch {}

  if (publisher) {
    const cleanPub = publisher.replace(/[^a-zA-Z0-9]/g, '');
    if (cleanPub.length >= 3) {
      detectedTags.add(cleanPub.charAt(0).toUpperCase() + cleanPub.slice(1));
    }
  }

  // 2. Extract explicit hashtags in title / description (e.g. #cyberpunk #tech)
  const fullText = `${targetTitle || ''} ${targetDesc || ''}`;
  const explicitHashtags = fullText.match(/#([\w\u0E00-\u0E7F]+)/g);
  if (explicitHashtags) {
    explicitHashtags.forEach((ht) => {
      const clean = ht.replace(/^#/, '').trim();
      if (clean.length >= 2) detectedTags.add(clean);
    });
  }

  // 3. Keyword rules dictionary (common domain terms, tech, media quality, styles)
  const textLower = fullText.toLowerCase();

  const keywordMap: Record<string, string[]> = {
    'cyberpunk': ['Cyberpunk'],
    'blade runner': ['Cyberpunk', 'SciFi'],
    'scifi': ['SciFi'],
    'sci-fi': ['SciFi'],
    'ai': ['AI'],
    'artificial intelligence': ['AI'],
    'gemini': ['AI', 'Gemini'],
    'chatgpt': ['AI'],
    'openai': ['AI'],
    'llm': ['AI', 'Tech'],
    'ui': ['UI/UX'],
    'ux': ['UI/UX'],
    'interface': ['UI/UX'],
    'frontend': ['Dev', 'Frontend'],
    'react': ['React', 'Dev'],
    'typescript': ['TypeScript', 'Dev'],
    'javascript': ['JavaScript', 'Dev'],
    'python': ['Python', 'Dev'],
    'nextjs': ['NextJS', 'Dev'],
    'next.js': ['NextJS', 'Dev'],
    'vite': ['Vite', 'Dev'],
    'supabase': ['Supabase', 'Database'],
    'postgres': ['Database'],
    'database': ['Database'],
    '4k': ['Video4K'],
    '60fps': ['60FPS'],
    '1080p': ['HD'],
    'hdr': ['HDR'],
    'sound': ['Audio'],
    'synth': ['Synth', 'Music'],
    'ambient': ['Ambient', 'Music'],
    'modular': ['Synth', 'Music'],
    'lofi': ['LoFi', 'Music'],
    'podcast': ['Podcast'],
    'trailer': ['Trailer', 'Cinema'],
    'movie': ['Cinema'],
    'film': ['Cinema'],
    'anime': ['Anime'],
    'manga': ['Manga'],
    'game': ['Gaming'],
    'gameplay': ['Gaming'],
    'tutorial': ['Tutorial'],
    'guide': ['Guide'],
    'course': ['Course'],
    'architecture': ['Architecture'],
    'interior': ['Design', 'Interior'],
    'photography': ['Photo'],
    'wallpaper': ['Wallpaper'],
    'illustration': ['Illustration'],
    'concept art': ['ConceptArt'],
    '3d': ['3D'],
    'blender': ['3D', 'Blender'],
    'unreal': ['3D', 'UnrealEngine'],
  };

  for (const [key, tagsToAdd] of Object.entries(keywordMap)) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'i');
    if (regex.test(textLower)) {
      tagsToAdd.forEach((t) => detectedTags.add(t));
    }
  }

  // 4. Extract prominent capitalized terms from title (e.g. "Ghost in the Shell", "Vangelis")
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
