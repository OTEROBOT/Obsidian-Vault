import { Category, MediaItem } from '../types';

export interface CategoryAuditResult {
  item: MediaItem;
  currentCategory?: Category;
  recommendedCategory?: Category;
  suggestedNewCategory?: {
    name: string;
    slug: string;
    icon: string;
    color: string;
    description: string;
  };
  isMisclassified: boolean;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  detectedPlatform: string;
  suggestedTagsToAdd?: string[];
}

export interface VaultCategoryHealthReport {
  totalScanned: number;
  misclassifiedCount: number;
  correctCount: number;
  results: CategoryAuditResult[];
  missingCategories: Array<{
    name: string;
    slug: string;
    icon: string;
    color: string;
    description: string;
    itemCount: number;
  }>;
}

/**
 * Standard Known Platform Specifications
 */
const PLATFORM_SPECS = [
  {
    platform: 'X (Twitter)',
    slug: 'x',
    name: 'X (Twitter)',
    icon: 'Terminal',
    color: '#38bdf8',
    description: 'Posts, threads, and creator updates on X (formerly Twitter)',
    matchesDomain: (host: string) => host.includes('twitter.com') || host.includes('x.com'),
    categoryKeywords: ['x', 'twitter', 'social', 'sns', 'ทวิตเตอร์', 'โซเชียล'],
    tags: ['X', 'Social'],
  },
  {
    platform: 'Pixiv',
    slug: 'pixiv',
    name: 'Pixiv & Illustrations',
    icon: 'Image',
    color: '#0096fa',
    description: 'High-res illustrations, manga chapters, and anime artworks on Pixiv',
    matchesDomain: (host: string) => host.includes('pixiv.net') || host.includes('pximg.net'),
    categoryKeywords: ['pixiv', 'illustration', 'illustrations', 'artwork', 'art', 'ภาพวาด', 'รูปภาพ', 'อนิเมะ'],
    tags: ['Pixiv', 'Illustration', 'Artwork'],
  },
  {
    platform: 'Fanbox',
    slug: 'fanbox',
    name: 'Fanbox & Creators',
    icon: 'Heart',
    color: '#fa5a5a',
    description: 'Pixiv FANBOX creator support posts and exclusive rewards',
    matchesDomain: (host: string) => host.includes('fanbox.cc') || host.includes('.fanbox.') || host.includes('patreon.com'),
    categoryKeywords: ['fanbox', 'patreon', 'creator', 'แฟนบ็อกซ์'],
    tags: ['Fanbox', 'Creator'],
  },
  {
    platform: 'DLsite / ASMR',
    slug: 'dlsite',
    name: 'DLsite & Soundtracks',
    icon: 'Radio',
    color: '#f59e0b',
    description: 'Voice dramas, binaural ASMR, audio works, and doujin titles',
    matchesDomain: (host: string) => host.includes('dlsite.com') || host.includes('ci-en.dlsite.com'),
    categoryKeywords: ['dlsite', 'asmr', 'audio', 'sound', 'voice', 'เสียง', 'ละครเสียง'],
    tags: ['DLsite', 'Audio'],
  },
  {
    platform: 'Cinema & Motion (Video)',
    slug: 'cinema-motion',
    name: 'Cinema & Motion',
    icon: 'Film',
    color: '#f43f5e',
    description: 'High frame-rate 4K reels, motion design, video essays',
    matchesDomain: (host: string, path: string) =>
      host.includes('youtube.com') ||
      host.includes('youtu.be') ||
      host.includes('vimeo.com') ||
      host.includes('bilibili.com') ||
      host.includes('tver.jp') ||
      host.includes('abema.tv') ||
      host.includes('nicovideo.jp') ||
      host.includes('twitch.tv') ||
      /\.(mp4|webm|mkv|mov)(\?.*)?$/i.test(path),
    categoryKeywords: ['video', 'cinema', 'motion', 'youtube', 'vimeo', 'stream', 'ภาพยนตร์', 'วิดีโอ', 'คลิป'],
    tags: ['Video', 'Cinema'],
  },
  {
    platform: 'Synth & Soundscapes (Audio)',
    slug: 'synth-audio',
    name: 'Synth & Soundscapes',
    icon: 'Radio',
    color: '#a855f7',
    description: 'Dark ambient synthwave, modular patches, binaural audio',
    matchesDomain: (host: string, path: string) =>
      host.includes('spotify.com') ||
      host.includes('soundcloud.com') ||
      host.includes('bandcamp.com') ||
      /\.(mp3|wav|ogg|flac|aac|m4a)(\?.*)?$/i.test(path),
    categoryKeywords: ['synth', 'soundscapes', 'audio', 'music', 'sound', 'เพลง', 'เสียง'],
    tags: ['Audio', 'Music'],
  },
  {
    platform: 'Dev Tools & Architecture',
    slug: 'dev-tools',
    name: 'Dev Tools & Architecture',
    icon: 'Layers',
    color: '#10b981',
    description: 'Modern cloud infrastructure, PostgreSQL, Next.js, rust',
    matchesDomain: (host: string) =>
      host.includes('github.com') ||
      host.includes('gitlab.com') ||
      host.includes('npmjs.com') ||
      host.includes('vite.dev') ||
      host.includes('supabase.com') ||
      host.includes('stackoverflow.com'),
    categoryKeywords: ['dev', 'architecture', 'engineering', 'code', 'tools', 'infrastructure', 'โปรแกรมเมอร์', 'ระบบ'],
    tags: ['Dev', 'Code', 'Architecture'],
  },
  {
    platform: 'AI & Neural Systems',
    slug: 'ai-neural',
    name: 'AI & Neural Systems',
    icon: 'Cpu',
    color: '#818cf8',
    description: 'Large language models, diffusion engines, autonomous agents',
    matchesDomain: (host: string) =>
      host.includes('huggingface.co') ||
      host.includes('deepmind.google') ||
      host.includes('openai.com') ||
      host.includes('anthropic.com'),
    categoryKeywords: ['ai', 'neural', 'machine learning', 'deep learning', 'llm', 'ปัญญาประดิษฐ์'],
    tags: ['AI', 'Neural'],
  },
];

/**
 * Helper to match category by name or slug keywords
 */
function categoryMatchesKeywords(c: Category, keywords: string[]): boolean {
  const name = (c.name || '').toLowerCase().trim();
  const slug = (c.slug || '').toLowerCase().trim();
  const nameTokens = name.split(/[\s\-_/(),|&.]+/).filter(Boolean);
  const slugTokens = slug.split(/[\s\-_/(),|&.]+/).filter(Boolean);

  return keywords.some((kw) => {
    const k = kw.toLowerCase().trim();
    if (k.length <= 2) {
      // Must match whole token or exact name/slug to avoid 'x' matching 'fanbox' or 'pixiv'!
      return name === k || slug === k || nameTokens.includes(k) || slugTokens.includes(k);
    }
    return name.includes(k) || slug.includes(k) || nameTokens.some((t) => t.includes(k));
  });
}

/**
 * Classifies an individual MediaItem against the vault's active categories
 * using deterministic platform hierarchy first, followed by content semantics.
 */
export function classifyItemCategory(
  item: MediaItem,
  categories: Category[]
): CategoryAuditResult {
  const validCategories = categories.filter((c) => c.id !== 'cat-all' && c.slug !== 'all');
  const currentCategory = categories.find((c) => c.id === item.categoryId);

  let host = '';
  let path = '';
  try {
    let cleanUrl = item.url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }
    const parsed = new URL(cleanUrl);
    host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    path = parsed.pathname.toLowerCase();
  } catch {}

  const fullText = `${item.title || ''} ${item.description || ''} ${path}`.toLowerCase();

  // 1. Strict Canonical Domain / Platform Check (HIGHEST PRIORITY)
  // This completely solves the user problem: e.g. an X link must never be categorized as Fanbox!
  for (const spec of PLATFORM_SPECS) {
    if (spec.matchesDomain(host, path)) {
      // Find matching category in user's categories
      const matchedCat = validCategories.find((c) => categoryMatchesKeywords(c, spec.categoryKeywords));

      if (matchedCat) {
        const isMisclassified = item.categoryId !== matchedCat.id;
        let reason = `ลิงก์นี้มาจาก ${spec.platform}`;
        if (isMisclassified) {
          if (currentCategory) {
            reason = `ตรวจพบข้อผิดพลาด: ลิงก์ต้นทางเป็น ${spec.platform} แท้ แต่ปัจจุบันถูกจัดอยู่ในหมวดหมู่ "${currentCategory.name}"`;
            if (fullText.includes(currentCategory.name.toLowerCase()) || (currentCategory.slug && fullText.includes(currentCategory.slug))) {
              reason += ` (เนื่องจากระบบเดิมตรวจพบคำว่า "${currentCategory.name}" ในข้อความ/คำอธิบาย)`;
            }
          } else {
            reason = `ยังไม่ได้ระบุหมวดหมู่ ควรจัดเข้า "${matchedCat.name}"`;
          }
        } else {
          reason = `จัดหมวดหมู่ถูกต้องแล้ว (${matchedCat.name})`;
        }

        return {
          item,
          currentCategory,
          recommendedCategory: matchedCat,
          isMisclassified,
          confidence: 'high',
          reason,
          detectedPlatform: spec.platform,
          suggestedTagsToAdd: spec.tags,
        };
      }

      // If the user does not have this platform's category yet (e.g. X link, but no X category created)
      return {
        item,
        currentCategory,
        suggestedNewCategory: {
          name: spec.name,
          slug: spec.slug,
          icon: spec.icon,
          color: spec.color,
          description: spec.description,
        },
        isMisclassified: true,
        confidence: 'high',
        reason: `ลิงก์นี้มาจาก ${spec.platform} แต่ในคลังของคุณยังไม่มีหมวดหมู่ "${spec.name}" (แนะนำให้สร้างหมวดหมู่นี้)`,
        detectedPlatform: spec.platform,
        suggestedTagsToAdd: spec.tags,
      };
    }
  }

  // 2. Fallback to Content Semantics (Only for generic websites / articles / uploads)
  // 2.1 AI / Machine Learning
  if (/\b(ai|llm|neural|gpt|gemini|claude|diffusion|machine learning|deep learning|transformer)\b/i.test(fullText)) {
    const aiCat = validCategories.find((c) => categoryMatchesKeywords(c, ['ai', 'neural', 'machine learning']));
    if (aiCat) {
      return {
        item,
        currentCategory,
        recommendedCategory: aiCat,
        isMisclassified: item.categoryId !== aiCat.id,
        confidence: 'medium',
        reason: 'เนื้อหาเกี่ยวข้องกับ AI, ปัญญาประดิษฐ์, หรือแบบจำลองภาษา',
        detectedPlatform: 'AI / Research',
      };
    }
  }

  // 2.2 Cyberpunk & Sci-Fi
  if (fullText.includes('cyberpunk') || fullText.includes('sci-fi') || fullText.includes('scifi') || fullText.includes('blade runner')) {
    const cyberCat = validCategories.find((c) => categoryMatchesKeywords(c, ['cyber', 'sci-fi', 'cyberpunk']));
    if (cyberCat) {
      return {
        item,
        currentCategory,
        recommendedCategory: cyberCat,
        isMisclassified: item.categoryId !== cyberCat.id,
        confidence: 'medium',
        reason: 'เนื้อหาเกี่ยวข้องกับ Cyberpunk, Sci-Fi หรือสุนทรียศาสตร์ไซเบอร์',
        detectedPlatform: 'Cyberpunk',
      };
    }
  }

  // 2.3 Dev Tools & Architecture
  if (/\b(postgresql|supabase|next\.js|react|typescript|docker|kubernetes|database|api|architecture)\b/i.test(fullText)) {
    const devCat = validCategories.find((c) => categoryMatchesKeywords(c, ['dev', 'architecture', 'tools', 'code']));
    if (devCat) {
      return {
        item,
        currentCategory,
        recommendedCategory: devCat,
        isMisclassified: item.categoryId !== devCat.id,
        confidence: 'medium',
        reason: 'เนื้อหาเกี่ยวข้องกับการเขียนโปรแกรม, สถาปัตยกรรมระบบ หรือฐานข้อมูล',
        detectedPlatform: 'Dev / Tech',
      };
    }
  }

  // 2.4 Synth & Audio
  if (fullText.includes('synth') || fullText.includes('ambient') || fullText.includes('modular') || fullText.includes('soundtrack')) {
    const audioCat = validCategories.find((c) => categoryMatchesKeywords(c, ['synth', 'soundscapes', 'audio', 'music']));
    if (audioCat) {
      return {
        item,
        currentCategory,
        recommendedCategory: audioCat,
        isMisclassified: item.categoryId !== audioCat.id,
        confidence: 'medium',
        reason: 'เนื้อหาเกี่ยวข้องกับดนตรีซินธ์, เสียงสังเคราะห์ หรือ Soundscapes',
        detectedPlatform: 'Synth / Audio',
      };
    }
  }

  // Default: If no clear conflict detected, keep current category
  return {
    item,
    currentCategory,
    recommendedCategory: currentCategory || validCategories[0],
    isMisclassified: !currentCategory,
    confidence: 'low',
    reason: currentCategory ? 'หมวดหมู่สอดคล้องกับเนื้อหาตามปกติ' : 'ยังไม่ได้ระบุหมวดหมู่',
    detectedPlatform: host || 'General Web',
  };
}

/**
 * Scans all items in the vault and generates a complete health & classification audit
 */
export function auditVaultCategories(
  items: MediaItem[],
  categories: Category[]
): VaultCategoryHealthReport {
  const results: CategoryAuditResult[] = [];
  let misclassifiedCount = 0;
  let correctCount = 0;

  const missingMap = new Map<string, {
    name: string;
    slug: string;
    icon: string;
    color: string;
    description: string;
    itemCount: number;
  }>();

  for (const item of items) {
    const audit = classifyItemCategory(item, categories);
    results.push(audit);

    if (audit.isMisclassified) {
      misclassifiedCount++;
      if (audit.suggestedNewCategory) {
        const key = audit.suggestedNewCategory.slug;
        const existing = missingMap.get(key);
        if (existing) {
          existing.itemCount++;
        } else {
          missingMap.set(key, {
            ...audit.suggestedNewCategory,
            itemCount: 1,
          });
        }
      }
    } else {
      correctCount++;
    }
  }

  return {
    totalScanned: items.length,
    misclassifiedCount,
    correctCount,
    results,
    missingCategories: Array.from(missingMap.values()),
  };
}

/**
 * Applies AI category recommendations to an array of items
 */
export function applyAiCategoryChanges(
  itemsToUpdate: Array<{ itemId: string; targetCategoryId: string }>,
  allItems: MediaItem[]
): MediaItem[] {
  const targetMap = new Map(itemsToUpdate.map((u) => [u.itemId, u.targetCategoryId]));
  return allItems.map((item) => {
    const newCatId = targetMap.get(item.id);
    if (newCatId && newCatId !== item.categoryId) {
      return {
        ...item,
        categoryId: newCatId,
        updatedAt: new Date().toISOString(),
      };
    }
    return item;
  });
}
