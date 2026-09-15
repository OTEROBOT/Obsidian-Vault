import React, { useState, useEffect } from 'react';
import { 
  X, 
  Globe, 
  Upload, 
  Sparkles, 
  Check, 
  AlertCircle, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Music, 
  Layers, 
  Pin, 
  Tag as TagIcon,
  Loader2,
  Hash
} from 'lucide-react';
import { Category, EmbedType, MediaItem, MediaType, Tag, UserProfile } from '../types';
import { uploadMediaToSupabaseStorage, STORAGE_BUCKET, ADMIN_EMAIL } from '../utils/supabase';
import { getDomainFromUrl } from '../utils/storage';
import { extractSmartTags, detectSmartCategory } from '../utils/tagExtractor';

interface AddEditLinkModalProps {
  initialItem?: MediaItem | null;
  categories: Category[];
  tags: Tag[];
  currentUser?: UserProfile;
  onSave: (item: Partial<MediaItem>) => void;
  onClose: () => void;
}

export const AddEditLinkModal: React.FC<AddEditLinkModalProps> = ({
  initialItem,
  categories,
  tags,
  currentUser,
  onSave,
  onClose,
}) => {
  const isRealAdmin = currentUser?.isLoggedIn && currentUser?.role === 'admin' && currentUser?.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim();

  const isEditing = Boolean(initialItem);
  const [activeTab, setActiveTab] = useState<'url' | 'upload'>(initialItem?.source === 'upload' ? 'upload' : 'url');

  // Form states
  const [url, setUrl] = useState(initialItem?.url || '');
  const [title, setTitle] = useState(initialItem?.title || '');
  const [description, setDescription] = useState(initialItem?.description || '');
  const [thumbnailUrl, setThumbnailUrl] = useState(initialItem?.thumbnailUrl || '');
  const [mediaType, setMediaType] = useState<MediaType>(initialItem?.mediaType || 'web');
  const [categoryId, setCategoryId] = useState(initialItem?.categoryId || categories[1]?.id || categories[0]?.id || '');
  const [autoDetectedCategoryName, setAutoDetectedCategoryName] = useState<string | null>(null);
  const [itemTags, setItemTags] = useState<string[]>(initialItem?.tags || []);
  const [isPinned, setIsPinned] = useState(initialItem?.isPinned || false);

  // Upload specifics
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [localMediaUrl, setLocalMediaUrl] = useState<string>(initialItem?.mediaUrl || '');
  const [fileName, setFileName] = useState(initialItem?.fileName || '');
  const [fileSize, setFileSize] = useState(initialItem?.fileSize || '');
  const [isUploadingToBucket, setIsUploadingToBucket] = useState(false);
  const [storageStatusMessage, setStorageStatusMessage] = useState<string | null>(null);

  // Scraping status
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [scrapeSuccess, setScrapeSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Auto-generate tags state with local persistence
  const [autoGenerateTags, setAutoGenerateTags] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('obsidian_vault_auto_tags');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const [addedTagsCount, setAddedTagsCount] = useState<number | null>(null);

  const handleToggleAutoTags = (enabled: boolean) => {
    setAutoGenerateTags(enabled);
    try {
      localStorage.setItem('obsidian_vault_auto_tags', JSON.stringify(enabled));
    } catch {}
  };

  const applySmartTags = (targetUrl: string, targetTitle: string, targetDesc: string, publisher?: string) => {
    const detected = extractSmartTags(targetUrl, targetTitle, targetDesc, publisher, tags);
    if (detected.length > 0) {
      setItemTags((prev) => {
        const set = new Set([...prev]);
        let newlyAdded = 0;
        detected.forEach((t) => {
          if (!set.has(t)) {
            set.add(t);
            newlyAdded++;
          }
        });
        if (newlyAdded > 0) {
          setAddedTagsCount(newlyAdded);
          setTimeout(() => setAddedTagsCount(null), 4000);
        }
        return Array.from(set);
      });
    }
  };

  const handleAutoGenerateTagsNow = () => {
    applySmartTags(url, title, description);
  };

  // Tag input state
  const [tagInput, setTagInput] = useState('');

  // Handle OpenGraph auto-scraper with dual engine (local serverless + Microlink API)
  const handleScrapeMetadata = async () => {
    if (!url || !url.trim().startsWith('http')) {
      setScrapeError('Please enter a valid URL starting with http:// or https://');
      return;
    }

    setIsScraping(true);
    setScrapeError(null);
    setScrapeSuccess(false);

    const cleanUrl = url.trim();
    let finalTitle = title;
    let finalDesc = description;
    let finalPublisher: string | undefined;

    try {
      let scraped = false;

      // 1. Primary: Try local /api/scrape-og endpoint
      try {
        const res = await fetch(`/api/scrape-og?url=${encodeURIComponent(cleanUrl)}`);
        if (res.ok) {
          const data = await res.json();
          if (data && !data.fallback && data.title) {
            if (data.title) {
              setTitle(data.title);
              finalTitle = data.title;
            }
            if (data.description) {
              setDescription(data.description);
              finalDesc = data.description;
            }
            if (data.image) setThumbnailUrl(data.image);
            if (data.mediaType) setMediaType(data.mediaType);
            if (data.siteName) finalPublisher = data.siteName;
            scraped = true;
          }
        }
      } catch {
        // Continue to Microlink
      }

      // 2. Secondary fallback: Microlink API (https://api.microlink.io) for Vercel or external networks
      if (!scraped) {
        try {
          const microRes = await fetch(`https://api.microlink.io?url=${encodeURIComponent(cleanUrl)}`);
          if (microRes.ok) {
            const microData = await microRes.json();
            if (microData?.status === 'success' && microData?.data) {
              const d = microData.data;
              if (d.title) {
                setTitle(d.title);
                finalTitle = d.title;
              }
              if (d.description) {
                setDescription(d.description);
                finalDesc = d.description;
              }
              if (d.image?.url) setThumbnailUrl(d.image.url);
              if (d.publisher) finalPublisher = d.publisher;
              scraped = true;
            }
          }
        } catch {
          // Continue to hostname parser
        }
      }

      // 3. Fallback: Parse hostname and set sensible default thumbnail
      if (!scraped) {
        const domain = getDomainFromUrl(cleanUrl);
        if (!title) {
          setTitle(domain);
          finalTitle = domain;
        }
        if (!thumbnailUrl) setThumbnailUrl('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80');
      }

      // 4. Auto-detect category based on URL domain, title, and description
      const matchedCategory = detectSmartCategory(cleanUrl, finalTitle, finalDesc, categories);
      if (matchedCategory) {
        setCategoryId(matchedCategory.id);
        setAutoDetectedCategoryName(matchedCategory.name);
      }

      // 5. Auto-extract and inject relevant hashtags if enabled
      if (autoGenerateTags) {
        applySmartTags(cleanUrl, finalTitle, finalDesc, finalPublisher);
      }

      setScrapeSuccess(true);
      setTimeout(() => setScrapeSuccess(false), 3000);
    } catch (err: any) {
      console.warn('Scraping error:', err);
      try {
        const domain = getDomainFromUrl(cleanUrl);
        if (!title) {
          setTitle(domain);
          finalTitle = domain;
        }
        if (!thumbnailUrl) setThumbnailUrl('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80');
        
        const matchedCategory = detectSmartCategory(cleanUrl, finalTitle, finalDesc, categories);
        if (matchedCategory) {
          setCategoryId(matchedCategory.id);
          setAutoDetectedCategoryName(matchedCategory.name);
        }

        if (autoGenerateTags) {
          applySmartTags(cleanUrl, finalTitle, finalDesc, finalPublisher);
        }
        setScrapeSuccess(true);
      } catch {
        setScrapeError('Could not auto-scrape. Please fill in details manually.');
      }
    } finally {
      setIsScraping(false);
    }
  };

  // Handle local file upload + Supabase 'vault-media' Storage Bucket
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setLocalMediaUrl(objectUrl);
    setFileName(file.name);
    setFileSize(`${(file.size / (1024 * 1024)).toFixed(2)} MB`);

    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ''));
    if (!url) setUrl(objectUrl);

    // Detect media type from MIME
    if (file.type.startsWith('video/')) {
      setMediaType('video');
      if (!thumbnailUrl) setThumbnailUrl('https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80');
    } else if (file.type.startsWith('audio/')) {
      setMediaType('audio');
      if (!thumbnailUrl) setThumbnailUrl('https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=800&q=80');
    } else if (file.type.startsWith('image/')) {
      setMediaType('image');
      setThumbnailUrl(objectUrl);
    }

    // Direct upload to Supabase Storage 'vault-media'
    setIsUploadingToBucket(true);
    setStorageStatusMessage('Uploading to Supabase vault-media bucket...');
    try {
      const uploadRes = await uploadMediaToSupabaseStorage(file, 'vault-media');
      if (uploadRes.url) {
        setLocalMediaUrl(uploadRes.url);
        setUrl(uploadRes.url);
        if (file.type.startsWith('image/')) {
          setThumbnailUrl(uploadRes.url);
        }
        setStorageStatusMessage(`Saved to Supabase storage bucket '${STORAGE_BUCKET}'!`);
      } else {
        setStorageStatusMessage(`Using local memory buffer (Bucket '${STORAGE_BUCKET}' needs schema.sql setup).`);
      }
    } catch {
      setStorageStatusMessage('Storage upload deferred to local buffer.');
    } finally {
      setIsUploadingToBucket(false);
      setTimeout(() => setStorageStatusMessage(null), 5000);
    }
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim().replace(/^#/, '');
    if (trimmed && !itemTags.includes(trimmed)) {
      setItemTags([...itemTags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setItemTags(itemTags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Title is required');
      return;
    }

    const finalUrl = activeTab === 'url' ? url.trim() : (localMediaUrl || url.trim() || 'local://uploaded-asset');
    if (!finalUrl) {
      setFormError('A valid URL or uploaded file is required');
      return;
    }

    // Determine embedType and embedId
    let embedType: EmbedType = 'none';
    let embedId: string | undefined = undefined;

    const lower = finalUrl.toLowerCase();
    const ytMatch = finalUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    const vimeoMatch = finalUrl.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)/i);

    if (ytMatch && ytMatch[1]) {
      embedType = 'youtube';
      embedId = ytMatch[1];
    } else if (vimeoMatch && (vimeoMatch[3] || vimeoMatch[1])) {
      embedType = 'vimeo';
      embedId = vimeoMatch[3] || vimeoMatch[1];
    } else if (activeTab === 'upload' || lower.match(/\.(mp4|webm|mov)$/i) || mediaType === 'video') {
      embedType = 'html5_video';
    } else if (lower.match(/\.(mp3|wav|ogg)$/i) || mediaType === 'audio') {
      embedType = 'audio';
    } else if (lower.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) || mediaType === 'image') {
      embedType = 'image';
    } else {
      embedType = 'iframe';
    }

    if (currentUser && !isRealAdmin) {
      setFormError(`Access denied: Administrator credentials (${ADMIN_EMAIL}) required.`);
      return;
    }

    setFormError(null);

    const domain = getDomainFromUrl(finalUrl);

    onSave({
      title: title.trim(),
      description: description.trim(),
      url: finalUrl,
      mediaType,
      thumbnailUrl: thumbnailUrl.trim() || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
      mediaUrl: activeTab === 'upload' ? localMediaUrl : undefined,
      embedType,
      embedId,
      categoryId,
      tags: itemTags,
      isPinned,
      source: activeTab,
      fileName: activeTab === 'upload' ? fileName : undefined,
      fileSize: activeTab === 'upload' ? fileSize : undefined,
      siteName: activeTab === 'url' ? domain : 'Local Vault Storage',
      favicon: activeTab === 'url' ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32` : undefined,
    });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl rounded-3xl glass-panel border border-cyan-500/30 shadow-2xl overflow-hidden my-auto transform-gpu gpu-layer animate-in fade-in-50 zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#090a0f]/90">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <h3 className="text-base font-bold text-slate-100 font-display tracking-wide">
              {isEditing ? 'EDIT VAULT ENTRY' : 'NEW OBSIDIAN LINK & MEDIA'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source Mode Switcher Tabs */}
        {!isEditing && (
          <div className="flex border-b border-white/10 bg-black/40 px-6 pt-3 gap-2">
            <button
              onClick={() => setActiveTab('url')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl border-t border-x transition-all ${
                activeTab === 'url'
                  ? 'bg-slate-900 border-cyan-500/50 text-cyan-300 shadow-md'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Paste URL & Auto-Scrape</span>
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl border-t border-x transition-all ${
                activeTab === 'upload'
                  ? 'bg-slate-900 border-cyan-500/50 text-cyan-300 shadow-md'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Local File (Media)</span>
            </button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          
          {/* URL Tab & Auto Scraper */}
          {activeTab === 'url' ? (
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>Destination / Stream URL</span>
                <span className="text-[10px] text-cyan-400 font-mono">Web, YouTube, MP4, MP3, Image</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/article, https://youtube.com/watch?v=..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl text-xs glass-input text-slate-100 placeholder-slate-500"
                  required
                />
                <button
                  type="button"
                  onClick={handleScrapeMetadata}
                  disabled={isScraping || !url}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 flex items-center gap-1.5 transition-all disabled:opacity-40"
                  title="Auto-fetch meta title, description, and thumbnail via OpenGraph scraper"
                >
                  {isScraping ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  )}
                  <span className="hidden sm:inline">Scrape OG</span>
                </button>
              </div>

              {/* Scrape Controls: Auto-Tag Toggle & Quick Trigger */}
              <div className="flex items-center justify-between pt-1 px-0.5 text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white transition-colors">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoGenerateTags}
                    onClick={() => handleToggleAutoTags(!autoGenerateTags)}
                    className={`w-8 h-4 rounded-full transition-colors relative p-0.5 inline-flex items-center ${
                      autoGenerateTags ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`w-3 h-3 rounded-full bg-white transition-transform block ${
                        autoGenerateTags ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="flex items-center gap-1 text-[11px] font-mono">
                    <Hash className="w-3 h-3 text-cyan-400" />
                    Auto-generate tags on Scrape ({autoGenerateTags ? 'เปิด' : 'ปิด'})
                  </span>
                </label>

                {url && (
                  <button
                    type="button"
                    onClick={handleAutoGenerateTagsNow}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 hover:underline transition-colors"
                    title="Generate hashtags from current URL, Title & Description"
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>Extract Tags</span>
                  </button>
                )}
              </div>

              {scrapeSuccess && (
                <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3 shrink-0" />
                  <span>OpenGraph metadata extracted successfully!</span>
                  {addedTagsCount && addedTagsCount > 0 ? (
                    <span className="text-cyan-300 font-mono font-semibold ml-1">
                      (+{addedTagsCount} tags added)
                    </span>
                  ) : null}
                </p>
              )}
              {scrapeError && (
                <p className="text-[11px] text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {scrapeError}
                </p>
              )}
            </div>
          ) : (
            /* File Upload Dropzone */
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Upload Media File</label>
              <div className="border-2 border-dashed border-white/15 hover:border-cyan-500/40 rounded-2xl p-6 text-center bg-white/[0.01] hover:bg-cyan-500/[0.02] transition-colors cursor-pointer relative">
                <input
                  type="file"
                  accept="image/*,video/mp4,video/webm,audio/mp3,audio/ogg,audio/wav"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <Upload className="w-6 h-6" />
                  </div>
                  {fileName ? (
                    <div>
                      <p className="text-xs font-medium text-cyan-300">{fileName}</p>
                      <p className="text-[10px] text-slate-500">{fileSize}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs text-slate-300">Drag & drop or click to upload</p>
                      <p className="text-[10px] text-slate-500">Supports MP4, WebM, MP3, OGG, PNG, JPG, GIF</p>
                    </div>
                  )}
                </div>
              </div>

              {isUploadingToBucket && (
                <div className="flex items-center gap-2 text-xs text-cyan-300 py-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  <span>Uploading to Supabase vault-media bucket...</span>
                </div>
              )}

              {storageStatusMessage && !isUploadingToBucket && (
                <p className="text-[11px] text-cyan-400 flex items-center gap-1.5 py-1">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{storageStatusMessage}</span>
                </p>
              )}
            </div>
          )}

          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Blade Runner Aesthetics Archive"
              className="w-full px-3.5 py-2 rounded-xl text-xs glass-input text-slate-100 placeholder-slate-500"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary or commentary on this link..."
              className="w-full px-3.5 py-2 rounded-xl text-xs glass-input text-slate-100 placeholder-slate-500 resize-none"
            />
          </div>

          {/* Thumbnail Preview & URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Thumbnail URL</label>
              <input
                type="url"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3 py-2 rounded-xl text-xs glass-input text-slate-100 placeholder-slate-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Media Type</label>
              <select
                value={mediaType}
                onChange={(e) => setMediaType(e.target.value as MediaType)}
                className="w-full px-3 py-2 rounded-xl text-xs glass-input text-slate-100 cursor-pointer"
              >
                <option value="web" className="bg-slate-900">Web / Article</option>
                <option value="video" className="bg-slate-900">Video (YouTube / MP4)</option>
                <option value="audio" className="bg-slate-900">Audio (MP3 / Sound)</option>
                <option value="image" className="bg-slate-900">Image / Artwork</option>
              </select>
            </div>
          </div>

          {/* Category Selection & Pinned Toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">Category</label>
                {autoDetectedCategoryName && (
                  <span className="text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    Auto: {autoDetectedCategoryName}
                  </span>
                )}
              </div>
              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setAutoDetectedCategoryName(null);
                }}
                className="w-full px-3 py-2 rounded-xl text-xs glass-input text-slate-100 cursor-pointer"
              >
                {categories.filter(c => c.id !== 'cat-all').map((cat) => (
                  <option key={cat.id} value={cat.id} className="bg-slate-900">
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-5 flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-900 border-white/20 text-cyan-500 focus:ring-cyan-500/40"
                />
                <Pin className="w-3.5 h-3.5 text-amber-400" />
                <span>Pin to Top of Vault</span>
              </label>
            </div>
          </div>

          {/* Tags Input with Chips */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-slate-300">Tags</label>
                <button
                  type="button"
                  onClick={handleAutoGenerateTagsNow}
                  title="Auto-extract tags from current title, description and URL"
                  className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 flex items-center gap-1 transition-colors"
                >
                  <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                  <span>✨ Auto Tags</span>
                </button>
              </div>
              <span className="text-[10px] text-slate-500">Press Enter or comma to add</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add tag (e.g. Cyberpunk, 4K)..."
                className="flex-1 px-3 py-1.5 rounded-xl text-xs glass-input text-slate-100 placeholder-slate-500"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-white/10 hover:bg-white/20 text-slate-200"
              >
                Add
              </button>
            </div>

            {/* Render current tags */}
            {itemTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {itemTags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-rose-400 ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Form Error Banner */}
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{formError}</span>
            </div>
          )}

          {/* Footer Submit */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 hover:from-cyan-300 hover:to-teal-300 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all font-mono uppercase tracking-wider"
            >
              {isEditing ? 'Save Changes' : 'Create Vault Link'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
