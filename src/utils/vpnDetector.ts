import { MediaItem } from '../types';

/**
 * Known domains and TLDs that are geographically restricted to Japan
 * or frequently return 403 / blank pages / regional errors without a Japanese IP.
 */
const JAPAN_DOMAINS = [
  // Streaming & Video
  'abema.tv',
  'tver.jp',
  'nicovideo.jp',
  'sp.nicovideo.jp',
  'radiko.jp',
  'unext.jp',
  'video.unext.jp',
  'animestore.docomo.ne.jp',
  'telasa.jp',
  'paravi.jp',
  'fod.fujitv.co.jp',

  // Adult & Media Marketplaces
  'dmm.com',
  'dmm.co.jp',
  'fanza.com',
  'fanza.co.jp',
  'dlsite.com',
  'ci-en.dlsite.com',
  'ci-en.net',
  'fantia.jp',
  'toranoana.jp',
  'melonbooks.co.jp',
  'suruga-ya.jp',
  'amiami.jp',
  'fc2.com',
  'fc2.jp',

  // Manga, Books & Creators
  'bookwalker.jp',
  'piccoma.com',
  'manga.line.me',
  'shonenjumpplus.com',
  'comic-walker.com',
  'pocket.shonenmagazine.com',
  'tonarinoyj.jp',
  'booth.pm',
  'pixiv.net',
  'fanbox.cc',

  // Portals & Auctions (many block EEA/non-JP IPs)
  'yahoo.co.jp',
  'auctions.yahoo.co.jp',
  'shopping.yahoo.co.jp',
  'news.yahoo.co.jp',
];

const JAPAN_TAG_KEYWORDS = [
  'vpn jp',
  'vpnjp',
  'vpn japan',
  'vpnญี่ปุ่น',
  'vpn ญี่ปุ่น',
  'japan only',
  'jp only',
  'japan',
  'ญี่ปุ่น',
  'jp',
  'dmm',
  'fanza',
  'dlsite',
  'tver',
  'abema',
  'radiko',
];

export interface VpnCheckResult {
  requiresVpn: boolean;
  reason: string;
  domain?: string;
  isExplicit: boolean;
}

/**
 * Detects if a URL or MediaItem is likely geo-restricted to Japan (requiring VPN JP)
 */
export function checkRequiresJapanVpn(itemOrUrl: MediaItem | string | null | undefined): VpnCheckResult {
  if (!itemOrUrl) {
    return { requiresVpn: false, reason: '', isExplicit: false };
  }

  let url = '';
  let tags: string[] = [];
  let title = '';
  let description = '';
  let explicit = false;

  if (typeof itemOrUrl === 'string') {
    url = itemOrUrl;
  } else {
    url = itemOrUrl.url || '';
    tags = itemOrUrl.tags || [];
    title = itemOrUrl.title || '';
    description = itemOrUrl.description || '';
    if ((itemOrUrl as any).requiresJapanVpn === true) {
      explicit = true;
    }
  }

  // 1. Explicit flag on item
  if (explicit) {
    return {
      requiresVpn: true,
      reason: 'ลิงก์นี้ถูกระบุว่าจำเป็นต้องใช้ VPN ประเทศญี่ปุ่น (VPN JP)',
      isExplicit: true,
    };
  }

  // 2. Check tags
  for (const tag of tags) {
    const lowerTag = tag.toLowerCase().trim();
    if (['vpn jp', 'vpnjp', 'vpn japan', 'vpnญี่ปุ่น', 'vpn ญี่ปุ่น', 'japan only', 'jp only'].includes(lowerTag)) {
      return {
        requiresVpn: true,
        reason: `มีแท็ก #${tag} กำกับว่าต้องใช้ VPN ประเทศญี่ปุ่น`,
        isExplicit: true,
      };
    }
  }

  // 3. Check URL domain
  try {
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }
    const parsed = new URL(cleanUrl);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');

    // Japanese TLDs
    if (
      hostname.endsWith('.jp') ||
      hostname.endsWith('.co.jp') ||
      hostname.endsWith('.ne.jp') ||
      hostname.endsWith('.or.jp') ||
      hostname.endsWith('.ac.jp') ||
      hostname.endsWith('.go.jp')
    ) {
      return {
        requiresVpn: true,
        reason: `เว็บไซต์ลงท้ายโดเมนญี่ปุ่น (.${hostname.split('.').slice(-2).join('.')}) บางผู้ให้บริการจำกัดการเข้าชมเฉพาะ IP ประเทศญี่ปุ่น`,
        domain: hostname,
        isExplicit: false,
      };
    }

    // Known Geo-blocked Japanese platforms
    for (const d of JAPAN_DOMAINS) {
      if (hostname === d || hostname.endsWith('.' + d)) {
        return {
          requiresVpn: true,
          reason: `เว็บไซต์ ${hostname} มักจำกัดการเข้าถึงเฉพาะในประเทศญี่ปุ่น (Geo-blocked)`,
          domain: hostname,
          isExplicit: false,
        };
      }
    }
  } catch {
    // Invalid URL format, check string
  }

  // 4. Check title / description keywords
  const combinedText = `${title} ${description}`.toLowerCase();
  if (
    combinedText.includes('vpn jp') ||
    combinedText.includes('vpnjp') ||
    combinedText.includes('vpn japan') ||
    combinedText.includes('vpn ญี่ปุ่น') ||
    combinedText.includes('japan only') ||
    combinedText.includes('jp only') ||
    combinedText.includes('ล็อกโซนญี่ปุ่น')
  ) {
    return {
      requiresVpn: true,
      reason: 'มีข้อความระบุว่าจำเป็นต้องเชื่อมต่อ VPN ประเทศญี่ปุ่น',
      isExplicit: true,
    };
  }

  return { requiresVpn: false, reason: '', isExplicit: false };
}

/**
 * VPN recommendations and educational guidelines for users
 */
export const VPN_RECOMMENDATIONS = [
  {
    name: 'Urban VPN (Extension / Desktop)',
    badge: 'ฟรี 100% / มีเซิร์ฟเวอร์ Tokyo',
    platforms: ['Chrome', 'Edge', 'Firefox', 'Windows', 'Mac'],
    description: 'ติดตั้งเป็นส่วนขยายเบราว์เซอร์ ใช้งานฟรี เลือกเซิร์ฟเวอร์ Japan (Tokyo) แล้วเข้าชมเว็บได้ทันที ไม่ต้องสมัครสมาชิก',
    url: 'https://www.urban-vpn.com/',
    isFree: true,
  },
  {
    name: 'Proton VPN',
    badge: 'ความปลอดภัยสูง / มีแพ็กเกจฟรี',
    platforms: ['iOS', 'Android', 'Windows', 'Mac'],
    description: 'VPN มาตรฐานสวิสเซอร์แลนด์ ปลอดภัยสูง ไม่บันทึก Log มีเซิร์ฟเวอร์ญี่ปุ่นคุณภาพสูง',
    url: 'https://protonvpn.com/',
    isFree: true,
  },
  {
    name: 'TunnelBear VPN',
    badge: 'ใช้งานง่าย / เหมาะกับมือถือ',
    platforms: ['iOS', 'Android', 'Chrome'],
    description: 'แอปน่ารัก ใช้งานง่าย เพียงแตะประเทศญี่ปุ่น (Japan) บนแผนที่ก็เชื่อมต่อได้ทันที',
    url: 'https://www.tunnelbear.com/',
    isFree: true,
  },
  {
    name: 'OpenVPN / OvpnSpider',
    badge: 'สำหรับมือถือ / ค้นหา IP ญี่ปุ่นฟรี',
    platforms: ['iOS', 'Android'],
    description: 'ค้นหารายชื่อเซิร์ฟเวอร์ VPN Gate ประเทศญี่ปุ่นที่เปิดให้เชื่อมต่อฟรีทั่วโลก',
    url: 'https://www.vpngate.net/',
    isFree: true,
  },
];
