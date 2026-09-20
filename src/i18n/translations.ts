import { Language } from '../types';

export interface TranslationSchema {
  common: {
    appName: string;
    tagline: string;
    loading: string;
    error: string;
    cancel: string;
    save: string;
    delete: string;
    edit: string;
    close: string;
    back: string;
    copy: string;
    copied: string;
    source: string;
    preview: string;
    search: string;
    reset: string;
    pin: string;
    pinned: string;
    unpin: string;
    all: string;
    done: string;
  };
  nav: {
    brandTagline: string;
    searchPlaceholder: string;
    searchKbd: string;
    recent: string;
    admin: string;
    addLink: string;
    signIn: string;
    signOut: string;
    guest: string;
    theme: string;
    language: string;
    menu: string;
    close: string;
  };
  hero: {
    badge: string;
    defaultTitle: string;
    defaultTagline: string;
    subtitle: string;
    quickAdmin: string;
    vaultNewLink: string;
  };
  filters: {
    allCategories: string;
    allMedia: string;
    video: string;
    audio: string;
    images: string;
    web: string;
    pinned: string;
    sortBy: string;
    newest: string;
    oldest: string;
    views: string;
    likes: string;
    titleAz: string;
    gridView: string;
    compactView: string;
    reset: string;
    tags: string;
    allTags: string;
    searchResultsFor: string;
    matchesFound: string;
    noResultsTitle: string;
    noResultsDesc: string;
    resetAllFilters: string;
  };
  card: {
    pinned: string;
    adminActions: string;
    pinToTop: string;
    unpin: string;
    editLink: string;
    deleteLink: string;
    deleteConfirm: string;
    openViewer: string;
    preview: string;
    source: string;
    copyUrl: string;
    copied: string;
    views: string;
    likes: string;
    comments: string;
    audioStream: string;
    visualArt: string;
    webArchive: string;
  };
  viewer: {
    embedViewer: string;
    externalSource: string;
    commentsTitle: string;
    noComments: string;
    leaveComment: string;
    guestNickname: string;
    postBtn: string;
    signInToComment: string;
    adminBadge: string;
    zoom: string;
    resetZoom: string;
    iframeBlocked: string;
    openExternal: string;
  };
  comments: {
    title: string;
    noComments: string;
    signInToComment: string;
    guestNameRequired: string;
    guestPlaceholder: string;
    orSignIn: string;
    writeComment: string;
    send: string;
  };
  recent: {
    title: string;
    subtitle: string;
    items: string;
    empty: string;
    emptyDesc: string;
    clearHistory: string;
    justNow: string;
  };
  auth: {
    title: string;
    desc: string;
    signInGoogle: string;
    adminAccount: string;
    emailSignIn: string;
    createAccount: string;
    name: string;
    email: string;
    password: string;
    authenticating: string;
    signInToVault: string;
  };
  empty: {
    noEntries: string;
    noEntriesDesc: string;
    resetFilters: string;
  };
  toasts: {
    welcome: string;
    linkLiked: string;
    pinUpdated: string;
    entryRemoved: string;
    linkUpdated: string;
    newLinkVaulted: string;
    commentPublished: string;
    commentDeleted: string;
    permissionDenied: string;
  };
  footer: {
    rights: string;
    tagline: string;
  };
  addModal: {
    addNew: string;
    editEntry: string;
    urlTab: string;
    uploadTab: string;
    targetUrl: string;
    autoFetch: string;
    fetching: string;
    title: string;
    description: string;
    category: string;
    mediaType: string;
    tags: string;
    thumbnail: string;
    dropzoneTitle: string;
    dropzoneSub: string;
    save: string;
    saving: string;
    cancel: string;
  };
  admin: {
    title: string;
    subtitle: string;
    overview: string;
    links: string;
    categories: string;
    tags: string;
    supabase: string;
    metricsTotal: string;
    metricsViews: string;
    metricsLikes: string;
    metricsComments: string;
    syncBtn: string;
    resetSample: string;
    connected: string;
    disconnected: string;
  };
  theme: {
    dark: string;
    light: string;
    system: string;
    mode: string;
  };
  bottomNav: {
    home: string;
    search: string;
    recent: string;
    add: string;
    admin: string;
    menu: string;
  };
}

export const translations: Record<Language, TranslationSchema> = {
  en: {
    common: {
      appName: 'Obsidian Vault',
      tagline: 'Hyper-Indexed Cyber Vault',
      loading: 'Loading...',
      error: 'Error',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      close: 'Close',
      back: 'Back',
      copy: 'Copy',
      copied: 'Copied!',
      source: 'Source',
      preview: 'Preview',
      search: 'Search',
      reset: 'Reset',
      pin: 'Pin',
      pinned: 'Pinned',
      unpin: 'Unpin',
      all: 'All',
      done: 'Done',
    },
    nav: {
      brandTagline: 'Cyber-Dark Media & Link Vault',
      searchPlaceholder: 'Search by title, tag, URL, or #ID (e.g. #45)...',
      searchKbd: '⌘K',
      recent: 'Recent',
      admin: 'Admin Nexus',
      addLink: 'Add Link',
      signIn: 'Sign In',
      signOut: 'Sign Out',
      guest: 'Guest',
      theme: 'Theme',
      language: 'Language',
      menu: 'Menu',
      close: 'Close',
    },
    hero: {
      badge: 'Hyper-Indexed Cyber Vault',
      defaultTitle: 'Obsidian Vault',
      defaultTagline: 'Ultra-fast luxury cyber-dark link and bookmark management vault with embedded media viewer, advanced fuzzy search, and OpenGraph scraper.',
      subtitle: 'Ultra-fast luxury cyber-dark link and bookmark management vault with embedded media viewer, advanced fuzzy search, and OpenGraph scraper.',
      quickAdmin: 'Admin Nexus',
      vaultNewLink: 'Vault New Link',
    },
    filters: {
      allCategories: 'All Vault',
      allMedia: 'All Media',
      video: 'Video',
      audio: 'Audio',
      images: 'Images',
      web: 'Web / Articles',
      pinned: 'Pinned',
      sortBy: 'Sort By',
      newest: 'Newest First',
      oldest: 'Oldest First',
      views: 'Most Viewed',
      likes: 'Most Liked',
      titleAz: 'Title (A-Z)',
      gridView: 'Grid View',
      compactView: 'Compact View',
      reset: 'Reset',
      tags: 'Tags:',
      allTags: 'All',
      searchResultsFor: 'Fuzzy search results for',
      matchesFound: 'matches found',
      noResultsTitle: 'No vault entries matched',
      noResultsDesc: 'Try loosening your search terms, changing the media category, or resetting active filters.',
      resetAllFilters: 'Reset All Filters',
    },
    card: {
      pinned: 'PINNED',
      adminActions: 'Admin Actions',
      pinToTop: 'Pin to Top',
      unpin: 'Unpin Post',
      editLink: 'Edit Link',
      deleteLink: 'Delete',
      deleteConfirm: 'Delete this vault entry permanently?',
      openViewer: 'Open Embedded Viewer',
      preview: 'Preview',
      source: 'Source',
      copyUrl: 'Copy URL',
      copied: 'Copied!',
      views: 'views',
      likes: 'likes',
      comments: 'comments',
      audioStream: 'Audio Stream',
      visualArt: 'Visual Art',
      webArchive: 'Web Archive',
    },
    viewer: {
      embedViewer: 'Embedded Media Viewer',
      externalSource: 'Open in New Tab',
      commentsTitle: 'Community Discussion',
      noComments: 'No discussions yet. Be the first to start the thread!',
      leaveComment: 'Leave a note or insight...',
      guestNickname: 'Your Nickname (e.g. Neo, Trinity)',
      postBtn: 'Post Note',
      signInToComment: 'Sign In to Comment',
      adminBadge: 'ADMIN',
      zoom: 'Zoom',
      resetZoom: 'Reset',
      iframeBlocked: 'Direct framing blocked by provider security. Click below to launch external source:',
      openExternal: 'Launch External Window',
    },
    comments: {
      title: 'Community Discussion',
      noComments: 'No discussions yet. Be the first to share your thoughts!',
      signInToComment: 'Sign in to comment',
      guestNameRequired: 'Please enter a nickname to post as a guest',
      guestPlaceholder: 'Guest nickname (e.g. CyberSam)',
      orSignIn: 'or sign in for verified badge',
      writeComment: 'Add a thought or observation',
      send: 'Post',
    },
    recent: {
      title: 'RECENTLY VIEWED',
      subtitle: 'Synced in local device memory',
      items: 'links',
      empty: 'No recent activity',
      emptyDesc: 'As you preview videos, listen to audio streams, or inspect web bookmarks, they will appear here.',
      clearHistory: 'Clear History',
      justNow: 'Just now',
    },
    auth: {
      title: 'VAULT IDENTITY',
      desc: 'Access privileges & comment verification',
      signInGoogle: 'Sign in with Google',
      adminAccount: 'Admin Account',
      emailSignIn: 'Email Sign In',
      createAccount: 'Create Account',
      name: 'Full Name / Handle',
      email: 'Email Address',
      password: 'Password',
      authenticating: 'Authenticating...',
      signInToVault: 'Sign In to Vault',
    },
    empty: {
      noEntries: 'No vault entries matched',
      noEntriesDesc: 'Try loosening your search terms, changing the media category, or resetting active filters.',
      resetFilters: 'Reset All Filters',
    },
    toasts: {
      welcome: 'Welcome back',
      linkLiked: 'Vault link liked!',
      pinUpdated: 'Pin state updated',
      entryRemoved: 'Entry removed from vault',
      linkUpdated: 'Vault link updated successfully',
      newLinkVaulted: 'New media link vaulted!',
      commentPublished: 'Comment published to discussion',
      commentDeleted: 'Comment deleted',
      permissionDenied: 'Permission denied: Admin access required',
    },
    footer: {
      rights: 'ARCHITECTURAL LINK & EMBEDDED MEDIA VAULT',
      tagline: 'Powered by Next.js App Router Architecture, Supabase PostgreSQL RLS, and OpenGraph Microservices.',
    },
    addModal: {
      addNew: 'Vault New Media Entry',
      editEntry: 'Edit Vault Entry',
      urlTab: 'External URL / Embed',
      uploadTab: 'Direct Media Upload',
      targetUrl: 'Target Link URL',
      autoFetch: 'Auto-Scrape Meta',
      fetching: 'Scraping...',
      title: 'Entry Title',
      description: 'Summary & Notes',
      category: 'Vault Category',
      mediaType: 'Media Archetype',
      tags: 'Tags (comma separated)',
      thumbnail: 'Thumbnail Image URL (Optional)',
      dropzoneTitle: 'Drag & Drop Media File',
      dropzoneSub: 'MP4, WebM, MP3, WAV, PNG, JPG, GIF (Max 100MB)',
      save: 'Vault Entry',
      saving: 'Saving...',
      cancel: 'Cancel',
    },
    admin: {
      title: 'Admin Command Nexus',
      subtitle: 'Single-administrator governance & cloud synchronization',
      overview: 'Overview & Health',
      links: 'Links Management',
      categories: 'Categories',
      tags: 'Tags',
      supabase: 'Supabase Cloud',
      metricsTotal: 'Total Vault Links',
      metricsViews: 'Total Views',
      metricsLikes: 'Total Likes',
      metricsComments: 'Total Comments',
      syncBtn: 'Push Local Data to Supabase Cloud',
      resetSample: 'Reset to Default Seed Data',
      connected: 'Cloud Database Active',
      disconnected: 'Cloud Offline',
    },
    theme: {
      dark: 'Dark Mode',
      light: 'Light Mode',
      system: 'System Mode',
      mode: 'Theme Mode',
    },
    bottomNav: {
      home: 'Home',
      search: 'Search',
      recent: 'Recent',
      add: 'Add Link',
      admin: 'Admin',
      menu: 'More',
    },
  },

  th: {
    common: {
      appName: 'Obsidian Vault',
      tagline: 'คลังจัดเก็บและสตรีมลิงก์ความเร็วสูง',
      loading: 'กำลังโหลด...',
      error: 'ข้อผิดพลาด',
      cancel: 'ยกเลิก',
      save: 'บันทึก',
      delete: 'ลบ',
      edit: 'แก้ไข',
      close: 'ปิด',
      back: 'ย้อนกลับ',
      copy: 'คัดลอก',
      copied: 'คัดลอกแล้ว!',
      source: 'ต้นทาง',
      preview: 'เล่น / ดู',
      search: 'ค้นหา',
      reset: 'รีเซ็ต',
      pin: 'ปักหมุด',
      pinned: 'ปักหมุดแล้ว',
      unpin: 'ถอนหมุด',
      all: 'ทั้งหมด',
      done: 'เสร็จสิ้น',
    },
    nav: {
      brandTagline: 'คลังลิงก์และสื่อมัลติมีเดียสไตล์ไซเบอร์',
      searchPlaceholder: 'ค้นหาด้วยชื่อ, แท็ก, หรือรหัสโพสต์ เช่น #45 หรือ 45...',
      searchKbd: '⌘K',
      recent: 'ดูล่าสุด',
      admin: 'ระบบผู้ดูแล',
      addLink: 'เพิ่มลิงก์',
      signIn: 'เข้าสู่ระบบ',
      signOut: 'ออกจากระบบ',
      guest: 'ผู้เยี่ยมชม',
      theme: 'ธีมสี',
      language: 'ภาษา',
      menu: 'เมนู',
      close: 'ปิดเมนู',
    },
    hero: {
      badge: 'คลังไซเบอร์ความเร็วสูง',
      defaultTitle: 'Obsidian Vault',
      defaultTagline: 'ระบบจัดการบุ๊กมาร์กและลิงก์มัลติมีเดียระดับพรีเมียม พร้อมตัวเล่นสื่อในตัว ค้นหาแบบคลุมเครือ และดึงข้อมูล OpenGraph อัตโนมัติ',
      subtitle: 'ระบบจัดการบุ๊กมาร์กและลิงก์มัลติมีเดียระดับพรีเมียม พร้อมตัวเล่นสื่อในตัว ค้นหาแบบคลุมเครือ และดึงข้อมูล OpenGraph อัตโนมัติ',
      quickAdmin: 'ระบบผู้ดูแล',
      vaultNewLink: 'บันทึกรายการใหม่',
    },
    filters: {
      allCategories: 'ทุกหมวดหมู่',
      allMedia: 'สื่อทุกประเภท',
      video: 'วิดีโอ',
      audio: 'เสียง / พอดแคสต์',
      images: 'รูปภาพ',
      web: 'บทความ / เว็บไซต์',
      pinned: 'ปักหมุดไว้',
      sortBy: 'เรียงตาม',
      newest: 'ใหม่ล่าสุด',
      oldest: 'เก่าที่สุด',
      views: 'ยอดเข้าชมสูงสุด',
      likes: 'ถูกใจสูงสุด',
      titleAz: 'ชื่อ (ก-ฮ / A-Z)',
      gridView: 'มุมมองตาราง',
      compactView: 'มุมมองแบบย่อ',
      reset: 'ล้างตัวกรอง',
      tags: 'แท็ก:',
      allTags: 'ทั้งหมด',
      searchResultsFor: 'ผลการค้นหาสำหรับ',
      matchesFound: 'รายการที่พบ',
      noResultsTitle: 'ไม่พบรายการที่ค้นหา',
      noResultsDesc: 'ลองปรับเปลี่ยนคำค้นหา หรือเลือกหมวดหมู่อื่นเพื่อค้นหารายการที่ต้องการ',
      resetAllFilters: 'ล้างตัวกรองทั้งหมด',
    },
    card: {
      pinned: 'ปักหมุด',
      adminActions: 'คำสั่งผู้ดูแล',
      pinToTop: 'ปักหมุดไว้บนสุด',
      unpin: 'ถอนการปักหมุด',
      editLink: 'แก้ไขข้อมูล',
      deleteLink: 'ลบรายการ',
      deleteConfirm: 'คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้ถาวร?',
      openViewer: 'เปิดตัวเล่นสื่อ',
      preview: 'ดูตัวอย่าง',
      source: 'เปิดต้นทาง',
      copyUrl: 'คัดลอก URL',
      copied: 'คัดลอกเรียบร้อย!',
      views: 'ครั้ง',
      likes: 'ถูกใจ',
      comments: 'ความคิดเห็น',
      audioStream: 'สตรีมเสียง',
      visualArt: 'ภาพศิลปะ',
      webArchive: 'คลังเนื้อหาเว็บ',
    },
    viewer: {
      embedViewer: 'ตัวเล่นสื่อและเอกสาร',
      externalSource: 'เปิดในแท็บใหม่',
      commentsTitle: 'ความคิดเห็นและสนทนา',
      noComments: 'ยังไม่มีความคิดเห็น เริ่มแสดงความเห็นเป็นคนแรกได้เลย!',
      leaveComment: 'เขียนบันทึกหรือมุมมองของคุณ...',
      guestNickname: 'ชื่อเล่นของคุณ (เช่น นีโอ, ทรินิตี้)',
      postBtn: 'ส่งความคิดเห็น',
      signInToComment: 'เข้าสู่ระบบเพื่อแสดงความเห็น',
      adminBadge: 'แอดมิน',
      zoom: 'ขยาย',
      resetZoom: 'ขนาดปกติ',
      iframeBlocked: 'ผู้ให้บริการต้นทางจำกัดการฝังหน้าต่าง กรุณาเปิดผ่านลิงก์ภายนอก:',
      openExternal: 'เปิดหน้าต่างใหม่',
    },
    comments: {
      title: 'ความคิดเห็นและสนทนา',
      noComments: 'ยังไม่มีความคิดเห็น เริ่มแสดงความคิดเห็นเป็นคนแรกได้เลย!',
      signInToComment: 'เข้าสู่ระบบเพื่อแสดงความคิดเห็น',
      guestNameRequired: 'กรุณากรอกชื่อเล่นสำหรับผู้เยี่ยมชม',
      guestPlaceholder: 'ชื่อเล่นของคุณ (เช่น ไซเบอร์แซม)',
      orSignIn: 'หรือเข้าสู่ระบบเพื่อรับตราสมาชิกที่ยืนยันแล้ว',
      writeComment: 'แบ่งปันความคิดเห็นหรือข้อสังเกต',
      send: 'ส่งความเห็น',
    },
    recent: {
      title: 'ดูล่าสุด',
      subtitle: 'บันทึกในหน่วยความจำของอุปกรณ์นี้',
      items: 'รายการ',
      empty: 'ยังไม่มีประวัติการดู',
      emptyDesc: 'เมื่อคุณดูวิดีโอ ฟังเพลง หรือเปิดบุ๊กมาร์ก รายการเหล่านั้นจะปรากฏที่นี่',
      clearHistory: 'ล้างประวัติการดู',
      justNow: 'เมื่อสักครู่',
    },
    auth: {
      title: 'การระบุตัวตนใน VAULT',
      desc: 'สิทธิการเข้าถึงและการยืนยันตัวตนสำหรับความคิดเห็น',
      signInGoogle: 'เข้าสู่ระบบด้วย Google',
      adminAccount: 'บัญชีผู้ดูแลระบบ',
      emailSignIn: 'เข้าสู่ระบบด้วยอีเมล',
      createAccount: 'สร้างบัญชีใหม่',
      name: 'ชื่อ-นามสกุล / นามแฝง',
      email: 'อีเมล',
      password: 'รหัสผ่าน',
      authenticating: 'กำลังตรวจสอบสิทธิ์...',
      signInToVault: 'เข้าสู่ระบบ Vault',
    },
    empty: {
      noEntries: 'ไม่พบรายการที่ตรงกับเงื่อนไข',
      noEntriesDesc: 'ลองปรับเปลี่ยนคำค้นหา หรือเลือกหมวดหมู่อื่นเพื่อค้นหารายการที่ต้องการ',
      resetFilters: 'ล้างตัวกรองทั้งหมด',
    },
    toasts: {
      welcome: 'ยินดีต้อนรับกลับมา',
      linkLiked: 'กดถูกใจรายการแล้ว!',
      pinUpdated: 'อัปเดตสถานะปักหมุดแล้ว',
      entryRemoved: 'ลบรายการออกจากคลังแล้ว',
      linkUpdated: 'อัปเดตข้อมูลรายการเรียบร้อยแล้ว',
      newLinkVaulted: 'บันทึกรายการใหม่ลงคลังสำเร็จ!',
      commentPublished: 'เผยแพร่ความคิดเห็นแล้ว',
      commentDeleted: 'ลบความคิดเห็นแล้ว',
      permissionDenied: 'ไม่มีสิทธิ์: ต้องใช้สิทธิ์ผู้ดูแลระบบ',
    },
    footer: {
      rights: 'คลังจัดเก็บและสตรีมลิงก์มัลติมีเดียสไตล์ไซเบอร์',
      tagline: 'ขับเคลื่อนด้วย Next.js App Router, Supabase PostgreSQL RLS และระบบ OpenGraph Microservices',
    },
    addModal: {
      addNew: 'เพิ่มรายการลิงก์และสื่อใหม่',
      editEntry: 'แก้ไขรายการในคลัง',
      urlTab: 'ลิงก์ภายนอก / ฝังสื่อ',
      uploadTab: 'อัปโหลดไฟล์สื่อโดยตรง',
      targetUrl: 'URL ปลายทาง',
      autoFetch: 'ดึงข้อมูลอัตโนมัติ',
      fetching: 'กำลังดึงข้อมูล...',
      title: 'ชื่อรายการ',
      description: 'คำอธิบายและบันทึก',
      category: 'หมวดหมู่',
      mediaType: 'รูปแบบสื่อ',
      tags: 'แท็ก (คั่นด้วยจุลภาค)',
      thumbnail: 'URL ภาพตัวอย่าง (ระบุหรือไม่ก็ได้)',
      dropzoneTitle: 'ลากและวางไฟล์สื่อที่นี่',
      dropzoneSub: 'MP4, WebM, MP3, WAV, PNG, JPG, GIF (สูงสุด 100MB)',
      save: 'บันทึกรายการ',
      saving: 'กำลังบันทึก...',
      cancel: 'ยกเลิก',
    },
    admin: {
      title: 'ศูนย์ควบคุมผู้ดูแลระบบ',
      subtitle: 'การควบคุมสำหรับผู้ดูแลคนเดียว และการซิงค์ข้อมูลกับคลาวด์',
      overview: 'ภาพรวมและสถานะระบบ',
      links: 'จัดการรายการลิงก์',
      categories: 'หมวดหมู่',
      tags: 'แท็ก',
      supabase: 'Supabase Cloud',
      metricsTotal: 'จำนวนลิงก์ทั้งหมด',
      metricsViews: 'ยอดการเข้าชมทั้งหมด',
      metricsLikes: 'ยอดการถูกใจทั้งหมด',
      metricsComments: 'จำนวนความคิดเห็นทั้งหมด',
      syncBtn: 'ซิงค์ข้อมูลในเครื่องไปยัง Supabase Cloud',
      resetSample: 'รีเซ็ตข้อมูลเป็นชุดตัวอย่างเริ่มต้น',
      connected: 'เชื่อมต่อฐานข้อมูลคลาวด์แล้ว',
      disconnected: 'คลาวด์ออฟไลน์',
    },
    theme: {
      dark: 'โหมดมืด (Dark)',
      light: 'โหมดสว่าง (Light)',
      system: 'ตามระบบ (System)',
      mode: 'โหมดการแสดงผล',
    },
    bottomNav: {
      home: 'หน้าหลัก',
      search: 'ค้นหา',
      recent: 'ล่าสุด',
      add: 'เพิ่มลิงก์',
      admin: 'ผู้ดูแล',
      menu: 'เพิ่มเติม',
    },
  },

  ja: {
    common: {
      appName: 'Obsidian Vault',
      tagline: '超高速サイバーダーク・メディア保管庫',
      loading: '読み込み中...',
      error: 'エラー',
      cancel: 'キャンセル',
      save: '保存',
      delete: '削除',
      edit: '編集',
      close: '閉じる',
      back: '戻る',
      copy: 'コピー',
      copied: 'コピー完了！',
      source: '元のリンク',
      preview: 'プレビュー',
      search: '検索',
      reset: 'リセット',
      pin: '固定',
      pinned: '固定済み',
      unpin: '固定解除',
      all: 'すべて',
      done: '完了',
    },
    nav: {
      brandTagline: 'サイバーダーク・リンク＆メディア保管庫',
      searchPlaceholder: 'リンク、タグ、説明を検索...',
      searchKbd: '⌘K',
      recent: '最近の閲覧',
      admin: '管理者ネクサス',
      addLink: 'リンク追加',
      signIn: 'ログイン',
      signOut: 'ログアウト',
      guest: 'ゲスト',
      theme: 'テーマ',
      language: '言語',
      menu: 'メニュー',
      close: '閉じる',
    },
    hero: {
      badge: 'ハイパーインデックス・サイバー保管庫',
      defaultTitle: 'Obsidian Vault',
      defaultTagline: '内蔵メディアプレイヤー、あいまい検索、OpenGraph自動取得を備えた高速メディア管理庫。',
      subtitle: '内蔵メディアプレイヤー、あいまい検索、OpenGraph自動取得を備えた高速メディア管理庫。',
      quickAdmin: '管理者ネクサス',
      vaultNewLink: '新規リンク登録',
    },
    filters: {
      allCategories: 'すべての分類',
      allMedia: 'すべてのメディア',
      video: '動画',
      audio: '音声 / ポッドキャスト',
      images: '画像',
      web: '記事・ウェブ',
      pinned: 'ピン留め',
      sortBy: '並び替え',
      newest: '最新順',
      oldest: '古い順',
      views: '閲覧数順',
      likes: 'いいね数順',
      titleAz: 'タイトル順 (A-Z)',
      gridView: 'グリッド表示',
      compactView: 'コンパクト表示',
      reset: 'リセット',
      tags: 'タグ:',
      allTags: 'すべて',
      searchResultsFor: '検索結果:',
      matchesFound: '件見つかりました',
      noResultsTitle: '該当するリンクが見つかりません',
      noResultsDesc: '検索ワードを変更するか、別のカテゴリーを選択してください。',
      resetAllFilters: 'フィルターを解除',
    },
    card: {
      pinned: 'ピン留め',
      adminActions: '管理者操作',
      pinToTop: '上部に固定',
      unpin: '固定を解除',
      editLink: '編集',
      deleteLink: '削除',
      deleteConfirm: 'このリンクを完全に削除しますか？',
      openViewer: 'プレイヤーを開く',
      preview: 'プレビュー',
      source: 'リンク先へ',
      copyUrl: 'URLをコピー',
      copied: 'コピー完了！',
      views: '回閲覧',
      likes: 'いいね',
      comments: 'コメント',
      audioStream: '音声ストリーム',
      visualArt: 'アート・画像',
      webArchive: 'Webアーカイブ',
    },
    viewer: {
      embedViewer: 'メディアビューアー',
      externalSource: '別タブで開く',
      commentsTitle: 'コミュニティディスカッション',
      noComments: 'まだコメントはありません。最初の投稿をどうぞ！',
      leaveComment: '考えやメモを残す...',
      guestNickname: 'ニックネーム（例：Neo, Trinity）',
      postBtn: '投稿する',
      signInToComment: 'ログインしてコメント',
      adminBadge: '管理者',
      zoom: '拡大',
      resetZoom: '標準',
      iframeBlocked: '提供元のセキュリティポリシーにより埋め込みが制限されています。外部で開いてください：',
      openExternal: '外部ウィンドウで開く',
    },
    comments: {
      title: 'コミュニティディスカッション',
      noComments: 'まだコメントがありません。最初の投稿をしてみましょう！',
      signInToComment: 'ログインしてコメントする',
      guestNameRequired: 'ゲスト名を入力してください',
      guestPlaceholder: 'ニックネーム（例：CyberSam）',
      orSignIn: 'またはログインして認証バッジを取得',
      writeComment: '意見やメモを残す',
      send: '投稿',
    },
    recent: {
      title: '最近の閲覧',
      subtitle: '端末のローカルメモリに同期中',
      items: '件',
      empty: '閲覧履歴はありません',
      emptyDesc: '動画や音声を再生したり、記事をプレビューするとここに表示されます。',
      clearHistory: '履歴をクリア',
      justNow: 'たった今',
    },
    auth: {
      title: '保管庫の身元認証',
      desc: 'アクセス権限およびコメント認証',
      signInGoogle: 'Googleでログイン',
      adminAccount: '管理者アカウント',
      emailSignIn: 'メールでログイン',
      createAccount: 'アカウントを作成',
      name: '氏名 / ハンドルネーム',
      email: 'メールアドレス',
      password: 'パスワード',
      authenticating: '認証中...',
      signInToVault: '保管庫へ入る',
    },
    empty: {
      noEntries: '該当するリンクが見つかりません',
      noEntriesDesc: '検索ワードを変更するか、別のカテゴリーを選択してください。',
      resetFilters: 'フィルターを解除',
    },
    toasts: {
      welcome: 'おかえりなさい',
      linkLiked: 'いいねしました！',
      pinUpdated: '固定状態を更新しました',
      entryRemoved: '保管庫から削除しました',
      linkUpdated: 'リンク情報を更新しました',
      newLinkVaulted: '新しいリンクを保管しました！',
      commentPublished: 'コメントを投稿しました',
      commentDeleted: 'コメントを削除しました',
      permissionDenied: '権限がありません：管理者権限が必要です',
    },
    footer: {
      rights: 'アーキテクチャ・リンク＆メディア保管庫',
      tagline: 'Next.js App Router、Supabase PostgreSQL RLS、OpenGraph Microservicesで動作中。',
    },
    addModal: {
      addNew: '新規メディア登録',
      editEntry: 'リンク情報を編集',
      urlTab: '外部URL / 埋め込み',
      uploadTab: 'メディアを直接アップロード',
      targetUrl: 'リンクURL',
      autoFetch: '自動メタ情報取得',
      fetching: '情報取得中...',
      title: 'タイトル',
      description: '概要・メモ',
      category: 'カテゴリー',
      mediaType: 'メディア種別',
      tags: 'タグ（カンマ区切り）',
      thumbnail: 'サムネイル画像URL（任意）',
      dropzoneTitle: 'ここにメディアファイルをドラッグ＆ドロップ',
      dropzoneSub: 'MP4, WebM, MP3, WAV, PNG, JPG, GIF (最大100MB)',
      save: '保管庫に保存',
      saving: '保存中...',
      cancel: 'キャンセル',
    },
    admin: {
      title: '管理者コマンドネクサス',
      subtitle: '単一管理者による統制とクラウド同期',
      overview: '概要・ステータス',
      links: 'リンク管理',
      categories: 'カテゴリー',
      tags: 'タグ',
      supabase: 'Supabase Cloud',
      metricsTotal: '登録リンク総数',
      metricsViews: '総閲覧数',
      metricsLikes: '総いいね数',
      metricsComments: '総コメント数',
      syncBtn: 'ローカルデータをSupabase Cloudへ同期',
      resetSample: 'デフォルトの初期データにリセット',
      connected: 'クラウドDB接続中',
      disconnected: 'クラウド切断中',
    },
    theme: {
      dark: 'ダークモード',
      light: 'ライトモード',
      system: 'システム準拠',
      mode: 'テーマ切り替え',
    },
    bottomNav: {
      home: 'ホーム',
      search: '検索',
      recent: '最近',
      add: '追加',
      admin: '管理者',
      menu: 'その他',
    },
  },

  zh: {
    common: {
      appName: 'Obsidian Vault',
      tagline: '超高速赛博暗黑链接与媒体存储库',
      loading: '加载中...',
      error: '错误',
      cancel: '取消',
      save: '保存',
      delete: '删除',
      edit: '编辑',
      close: '关闭',
      back: '返回',
      copy: '复制',
      copied: '已复制！',
      source: '来源',
      preview: '预览',
      search: '搜索',
      reset: '重置',
      pin: '置顶',
      pinned: '已置顶',
      unpin: '取消置顶',
      all: '全部',
      done: '完成',
    },
    nav: {
      brandTagline: '赛博暗黑风格媒体与书签存储库',
      searchPlaceholder: '搜索链接、标签、说明...',
      searchKbd: '⌘K',
      recent: '最近浏览',
      admin: '管理中枢',
      addLink: '添加链接',
      signIn: '登录',
      signOut: '退出登录',
      guest: '访客',
      theme: '主题',
      language: '语言',
      menu: '菜单',
      close: '关闭',
    },
    hero: {
      badge: '超高速索引赛博存储库',
      defaultTitle: 'Obsidian Vault',
      defaultTagline: '极速赛博暗黑链接管理系统，内置内嵌媒体播放器、高级模糊搜索和 OpenGraph 自动抓取。',
      subtitle: '极速赛博暗黑链接管理系统，内置内嵌媒体播放器、高级模糊搜索和 OpenGraph 自动抓取。',
      quickAdmin: '管理中枢',
      vaultNewLink: '存入新条目',
    },
    filters: {
      allCategories: '全部分类',
      allMedia: '全部媒体',
      video: '视频',
      audio: '音频 / 播客',
      images: '图片',
      web: '网页 / 文章',
      pinned: '已置顶',
      sortBy: '排序方式',
      newest: '最新发布',
      oldest: '最早发布',
      views: '最多浏览',
      likes: '最多喜欢',
      titleAz: '名称 (A-Z)',
      gridView: '网格视图',
      compactView: '紧凑视图',
      reset: '重置',
      tags: '标签:',
      allTags: '全部',
      searchResultsFor: '模糊搜索结果:',
      matchesFound: '条匹配',
      noResultsTitle: '未找到匹配条目',
      noResultsDesc: '请尝试放宽搜索词，更换媒体分类或重置活跃筛选条件。',
      resetAllFilters: '重置所有筛选',
    },
    card: {
      pinned: '置顶',
      adminActions: '管理员操作',
      pinToTop: '置顶条目',
      unpin: '取消置顶',
      editLink: '编辑条目',
      deleteLink: '删除',
      deleteConfirm: '确定要永久删除此条目吗？',
      openViewer: '打开内嵌播放器',
      preview: '预览',
      source: '访问原链接',
      copyUrl: '复制网址',
      copied: '已复制！',
      views: '次浏览',
      likes: '赞',
      comments: '评论',
      audioStream: '音频流',
      visualArt: '视觉艺术',
      webArchive: '网页归档',
    },
    viewer: {
      embedViewer: '媒体播放器',
      externalSource: '在新标签页打开',
      commentsTitle: '社区交流',
      noComments: '暂无讨论，快来发表第一条见解吧！',
      leaveComment: '留下您的思考或观点...',
      guestNickname: '访客昵称（例如：Neo, Trinity）',
      postBtn: '发表留言',
      signInToComment: '登录以发表评论',
      adminBadge: '管理员',
      zoom: '缩放',
      resetZoom: '还原',
      iframeBlocked: '目标站点安全策略限制内嵌，请通过外链在新窗口打开：',
      openExternal: '在新窗口中启动',
    },
    comments: {
      title: '社区交流',
      noComments: '暂无讨论，快来发表第一条评论吧！',
      signInToComment: '登录后发表评论',
      guestNameRequired: '请填写访客昵称',
      guestPlaceholder: '访客昵称（例如：CyberSam）',
      orSignIn: '或登录以获取认证徽章',
      writeComment: '发表您的观点或笔记',
      send: '发送',
    },
    recent: {
      title: '最近浏览',
      subtitle: '已同步至本地设备缓存',
      items: '条链接',
      empty: '暂无浏览记录',
      emptyDesc: '当您观看视频、收听音频或查看书签时，它们将显示在此处。',
      clearHistory: '清除历史',
      justNow: '刚刚',
    },
    auth: {
      title: '存储库身份识别',
      desc: '访问权限与评论认证',
      signInGoogle: '使用 Google 登录',
      adminAccount: '管理员账户',
      emailSignIn: '邮箱登录',
      createAccount: '创建新账户',
      name: '姓名 / 昵称',
      email: '电子邮箱',
      password: '密码',
      authenticating: '正在验证身份...',
      signInToVault: '登录存储库',
    },
    empty: {
      noEntries: '未找到匹配条目',
      noEntriesDesc: '请尝试放宽搜索词，更换媒体分类或重置活跃筛选条件。',
      resetFilters: '重置所有筛选',
    },
    toasts: {
      welcome: '欢迎回来',
      linkLiked: '已点赞该链接！',
      pinUpdated: '置顶状态已更新',
      entryRemoved: '已从存储库移除该条目',
      linkUpdated: '条目更新成功',
      newLinkVaulted: '新媒体链接已成功归档！',
      commentPublished: '评论已成功发布',
      commentDeleted: '评论已删除',
      permissionDenied: '权限受限：需要管理员身份',
    },
    footer: {
      rights: '架构级链接与内嵌媒体库',
      tagline: '基于 Next.js App Router 架构、Supabase PostgreSQL RLS 和 OpenGraph 微服务运行。',
    },
    addModal: {
      addNew: '登记新媒体条目',
      editEntry: '编辑存储库条目',
      urlTab: '外部网址 / 嵌入',
      uploadTab: '直接上传媒体文件',
      targetUrl: '目标链接网址',
      autoFetch: '自动抓取元数据',
      fetching: '抓取中...',
      title: '条目标题',
      description: '摘要与备注',
      category: '存储分类',
      mediaType: '媒体类型',
      tags: '标签（逗号分隔）',
      thumbnail: '缩略图链接（可选）',
      dropzoneTitle: '拖拽媒体文件至此处',
      dropzoneSub: 'MP4, WebM, MP3, WAV, PNG, JPG, GIF（最大 100MB）',
      save: '保存到库',
      saving: '保存中...',
      cancel: '取消',
    },
    admin: {
      title: '管理指令中枢',
      subtitle: '单一管理员统筹管控与云端同步',
      overview: '总览与健康状态',
      links: '链接管理',
      categories: '分类设置',
      tags: '标签设置',
      supabase: 'Supabase Cloud',
      metricsTotal: '总链接数',
      metricsViews: '总浏览量',
      metricsLikes: '总喜欢数',
      metricsComments: '总评论数',
      syncBtn: '推送本地数据至 Supabase 云数据库',
      resetSample: '重置为初始演示数据',
      connected: '云端数据库连接正常',
      disconnected: '云端离线',
    },
    theme: {
      dark: '暗色模式',
      light: '亮色模式',
      system: '跟随系统',
      mode: '主题外观',
    },
    bottomNav: {
      home: '首页',
      search: '搜索',
      recent: '最近',
      add: '添加',
      admin: '管理',
      menu: '更多',
    },
  },

  es: {
    common: {
      appName: 'Obsidian Vault',
      tagline: 'Bóveda Ciber-Oscura Hiper-Indexada',
      loading: 'Cargando...',
      error: 'Error',
      cancel: 'Cancelar',
      save: 'Guardar',
      delete: 'Eliminar',
      edit: 'Editar',
      close: 'Cerrar',
      back: 'Volver',
      copy: 'Copiar',
      copied: '¡Copiado!',
      source: 'Fuente',
      preview: 'Ver',
      search: 'Buscar',
      reset: 'Restablecer',
      pin: 'Fijar',
      pinned: 'Fijado',
      unpin: 'Desfijar',
      all: 'Todos',
      done: 'Listo',
    },
    nav: {
      brandTagline: 'Bóveda de Enlaces y Medios Cyber-Dark',
      searchPlaceholder: 'Buscar enlaces, etiquetas, descripciones...',
      searchKbd: '⌘K',
      recent: 'Recientes',
      admin: 'Nexus de Admin',
      addLink: 'Añadir Enlace',
      signIn: 'Iniciar Sesión',
      signOut: 'Cerrar Sesión',
      guest: 'Invitado',
      theme: 'Tema',
      language: 'Idioma',
      menu: 'Menú',
      close: 'Cerrar',
    },
    hero: {
      badge: 'Bóveda Cibernética Hiper-Indexada',
      defaultTitle: 'Obsidian Vault',
      defaultTagline: 'Bóveda ultrarrápida para gestión de enlaces y marcadores con reproductor integrado, búsqueda difusa y captura OpenGraph.',
      subtitle: 'Bóveda ultrarrápida para gestión de enlaces y marcadores con reproductor integrado, búsqueda difusa y captura OpenGraph.',
      quickAdmin: 'Nexus Admin',
      vaultNewLink: 'Añadir Nuevo',
    },
    filters: {
      allCategories: 'Todas las Categorías',
      allMedia: 'Todos los Medios',
      video: 'Video',
      audio: 'Audio',
      images: 'Imágenes',
      web: 'Web / Artículos',
      pinned: 'Fijados',
      sortBy: 'Ordenar Por',
      newest: 'Más Recientes',
      oldest: 'Más Antiguos',
      views: 'Más Vistos',
      likes: 'Más Gustados',
      titleAz: 'Título (A-Z)',
      gridView: 'Vista Cuadrícula',
      compactView: 'Vista Compacta',
      reset: 'Restablecer',
      tags: 'Etiquetas:',
      allTags: 'Todas',
      searchResultsFor: 'Resultados de búsqueda para',
      matchesFound: 'coincidencias encontradas',
      noResultsTitle: 'No se encontraron entradas',
      noResultsDesc: 'Prueba modificando tus términos de búsqueda o cambiando la categoría de medios.',
      resetAllFilters: 'Restablecer Filtros',
    },
    card: {
      pinned: 'FIJADO',
      adminActions: 'Acciones de Admin',
      pinToTop: 'Fijar arriba',
      unpin: 'Desfijar',
      editLink: 'Editar Enlace',
      deleteLink: 'Eliminar',
      deleteConfirm: '¿Deseas eliminar esta entrada permanentemente?',
      openViewer: 'Abrir Reproductor Integrado',
      preview: 'Vista Previa',
      source: 'Fuente Original',
      copyUrl: 'Copiar URL',
      copied: '¡Copiado!',
      views: 'vistas',
      likes: 'me gusta',
      comments: 'comentarios',
      audioStream: 'Flujo de Audio',
      visualArt: 'Arte Visual',
      webArchive: 'Archivo Web',
    },
    viewer: {
      embedViewer: 'Visor de Medios Integrado',
      externalSource: 'Abrir en Pestaña Nueva',
      commentsTitle: 'Discusión Comunitaria',
      noComments: 'Aún no hay comentarios. ¡Sé el primero en aportar!',
      leaveComment: 'Deja tu nota o comentario...',
      guestNickname: 'Tu apodo (ej. Neo, Trinity)',
      postBtn: 'Publicar Nota',
      signInToComment: 'Inicia Sesión para Comentar',
      adminBadge: 'ADMIN',
      zoom: 'Zoom',
      resetZoom: 'Reiniciar',
      iframeBlocked: 'El sitio original restringe el visor incrustado. Abre el enlace exterior:',
      openExternal: 'Abrir en Ventana Externa',
    },
    comments: {
      title: 'Discusión Comunitaria',
      noComments: 'Aún no hay comentarios. ¡Sé el primero en compartir!',
      signInToComment: 'Inicia sesión para comentar',
      guestNameRequired: 'Por favor ingresa un apodo para comentar como invitado',
      guestPlaceholder: 'Apodo de invitado (ej. CyberSam)',
      orSignIn: 'o inicia sesión para obtener insignia verificada',
      writeComment: 'Añadir un comentario o reflexión',
      send: 'Enviar',
    },
    recent: {
      title: 'VISTOS RECIENTEMENTE',
      subtitle: 'Sincronizado en la memoria del dispositivo local',
      items: 'enlaces',
      empty: 'Sin actividad reciente',
      emptyDesc: 'A medida que visualices videos, escuches audio o revises enlaces, se mostrarán aquí.',
      clearHistory: 'Borrar Historial',
      justNow: 'Recién',
    },
    auth: {
      title: 'IDENTIDAD EN LA BÓVEDA',
      desc: 'Privilegios de acceso y verificación de comentarios',
      signInGoogle: 'Continuar con Google',
      adminAccount: 'Cuenta de Administrador',
      emailSignIn: 'Acceso por Correo',
      createAccount: 'Crear Cuenta',
      name: 'Nombre Completo / Apodo',
      email: 'Correo Electrónico',
      password: 'Contraseña',
      authenticating: 'Autenticando...',
      signInToVault: 'Ingresar a la Bóveda',
    },
    empty: {
      noEntries: 'No se encontraron entradas',
      noEntriesDesc: 'Prueba modificando tus términos de búsqueda o cambiando la categoría de medios.',
      resetFilters: 'Restablecer Filtros',
    },
    toasts: {
      welcome: 'Bienvenido de nuevo',
      linkLiked: '¡Enlace marcado con Me Gusta!',
      pinUpdated: 'Estado de fijación actualizado',
      entryRemoved: 'Entrada eliminada de la bóveda',
      linkUpdated: 'Enlace actualizado exitosamente',
      newLinkVaulted: '¡Nuevo enlace guardado en la bóveda!',
      commentPublished: 'Comentario publicado',
      commentDeleted: 'Comentario eliminado',
      permissionDenied: 'Acceso denegado: Se requiere cuenta de Administrador',
    },
    footer: {
      rights: 'BÓVEDA DE ENLACES Y MEDIOS INCORPORADOS',
      tagline: 'Desarrollado con arquitectura Next.js App Router, Supabase PostgreSQL RLS y microservicios OpenGraph.',
    },
    addModal: {
      addNew: 'Registrar Entrada de Medios',
      editEntry: 'Editar Entrada',
      urlTab: 'URL Externa / Incrustada',
      uploadTab: 'Subir Archivo Directo',
      targetUrl: 'URL del Enlace',
      autoFetch: 'Auto-Capturar Metadatos',
      fetching: 'Capturando...',
      title: 'Título del Enlace',
      description: 'Resumen y Notas',
      category: 'Categoría',
      mediaType: 'Tipo de Medio',
      tags: 'Etiquetas (separadas por coma)',
      thumbnail: 'URL de Miniatura (Opcional)',
      dropzoneTitle: 'Arrastra y suelta tu archivo aquí',
      dropzoneSub: 'MP4, WebM, MP3, WAV, PNG, JPG, GIF (Máx 100MB)',
      save: 'Guardar en Bóveda',
      saving: 'Guardando...',
      cancel: 'Cancelar',
    },
    admin: {
      title: 'Nexus de Comando de Administrador',
      subtitle: 'Gobierno de administrador único y sincronización en la nube',
      overview: 'Resumen y Estado',
      links: 'Gestión de Enlaces',
      categories: 'Categorías',
      tags: 'Etiquetas',
      supabase: 'Supabase Cloud',
      metricsTotal: 'Total de Enlaces',
      metricsViews: 'Vistas Totales',
      metricsLikes: 'Me Gusta Totales',
      metricsComments: 'Comentarios Totales',
      syncBtn: 'Subir Datos Locales a Supabase Cloud',
      resetSample: 'Restaurar Datos Iniciales de Muestra',
      connected: 'Base de Datos Activa',
      disconnected: 'Nube Desconectada',
    },
    theme: {
      dark: 'Modo Oscuro',
      light: 'Modo Claro',
      system: 'Modo Sistema',
      mode: 'Modo de Tema',
    },
    bottomNav: {
      home: 'Inicio',
      search: 'Buscar',
      recent: 'Reciente',
      add: 'Añadir',
      admin: 'Admin',
      menu: 'Más',
    },
  },
};

export const AVAILABLE_LANGUAGES: { code: Language; name: string; nativeName: string; flag: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English (US)', flag: '🇺🇸' },
  { code: 'th', name: 'Thai', nativeName: 'ภาษาไทย (TH)', flag: '🇹🇭' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語 (JA)', flag: '🇯🇵' },
  { code: 'zh', name: 'Chinese', nativeName: '中文 (ZH)', flag: '🇨🇳' },
  { code: 'es', name: 'Spanish', nativeName: 'Español (ES)', flag: '🇪🇸' },
];
