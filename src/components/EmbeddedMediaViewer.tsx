import React, { useState, useEffect } from 'react';
import { 
  X, 
  ExternalLink, 
  Copy, 
  Check, 
  Heart, 
  MessageSquare, 
  Play, 
  Volume2, 
  Image as ImageIcon, 
  Globe, 
  Send, 
  Shield, 
  User, 
  Trash2, 
  Calendar, 
  Eye, 
  Tag as TagIcon,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';
import { Comment, MediaItem, UserProfile } from '../types';

interface EmbeddedMediaViewerProps {
  item: MediaItem;
  user: UserProfile;
  comments: Comment[];
  onClose: () => void;
  onLike: (itemId: string) => void;
  onAddComment: (itemId: string, content: string, guestNickname?: string) => void;
  onDeleteComment?: (commentId: string) => void;
  onOpenAuth: () => void;
}

export const EmbeddedMediaViewer: React.FC<EmbeddedMediaViewerProps> = ({
  item,
  user,
  comments,
  onClose,
  onLike,
  onAddComment,
  onDeleteComment,
  onOpenAuth,
}) => {
  const [copied, setCopied] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [guestNickname, setGuestNickname] = useState('');
  const [imageZoom, setImageZoom] = useState(1);
  const [webIframeFailed, setWebIframeFailed] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(item.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    if (!user.isLoggedIn && !guestNickname.trim()) {
      alert('Please enter a guest nickname or sign in with Google');
      return;
    }

    onAddComment(item.id, commentText.trim(), guestNickname.trim());
    setCommentText('');
  };

  // Render the specific media player based on embedType or mediaType
  const renderMediaContent = () => {
    // 1. YouTube Embed
    if (item.embedType === 'youtube' && item.embedId) {
      return (
        <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black shadow-2xl border border-white/10">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${item.embedId}?autoplay=1&rel=0&modestbranding=1`}
            title={item.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
          />
        </div>
      );
    }

    // 2. HTML5 Video Player
    if (item.embedType === 'html5_video' || (item.mediaType === 'video' && item.mediaUrl)) {
      const src = item.mediaUrl || item.url;
      return (
        <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black shadow-2xl border border-white/10 flex items-center justify-center">
          <video
            controls
            autoPlay
            playsInline
            src={src}
            className="w-full h-full object-contain"
          >
            Your browser does not support HTML5 video playback.
          </video>
        </div>
      );
    }

    // 3. Audio Player with Cyberpunk Frequency Visualizer
    if (item.embedType === 'audio' || item.mediaType === 'audio') {
      const audioSrc = item.mediaUrl || item.url;
      return (
        <div className="w-full rounded-2xl glass-panel p-6 md:p-8 flex flex-col items-center justify-center space-y-6 border border-purple-500/30 shadow-[0_0_40px_rgba(168,85,247,0.15)]">
          <div className="relative w-36 h-36 rounded-2xl overflow-hidden shadow-2xl border border-white/20">
            <img
              src={item.thumbnailUrl}
              alt=""
              className="w-full h-full object-cover animate-pulse"
            />
            <div className="absolute inset-0 bg-purple-950/40 flex items-center justify-center">
              <Volume2 className="w-12 h-12 text-purple-300" />
            </div>
          </div>

          <div className="text-center space-y-1 max-w-md">
            <span className="text-[11px] font-mono uppercase tracking-widest text-purple-400">
              Audio Stream Player
            </span>
            <h4 className="text-base font-bold text-slate-100">{item.title}</h4>
            <p className="text-xs text-slate-400">{item.siteName || 'Obsidian Vault Sound Library'}</p>
          </div>

          {/* Animated Frequency Bars Graphic */}
          <div className="flex items-end justify-center gap-1.5 h-12 w-full max-w-md">
            {[40, 75, 55, 90, 65, 80, 45, 95, 70, 85, 60, 100, 50, 90, 65, 80].map((height, i) => (
              <div
                key={i}
                className="w-2 rounded-full bg-gradient-to-t from-purple-600 to-cyan-400"
                style={{
                  height: `${height}%`,
                  opacity: 0.85,
                  animation: `pulse 1.2s ease-in-out infinite alternate ${i * 0.08}s`
                }}
              />
            ))}
          </div>

          <audio
            controls
            autoPlay
            src={audioSrc}
            className="w-full max-w-md accent-cyan-400"
          >
            Your browser does not support audio playback.
          </audio>
        </div>
      );
    }

    // 4. Image Lightbox
    if (item.embedType === 'image' || item.mediaType === 'image') {
      const imgSrc = item.mediaUrl || item.thumbnailUrl || item.url;
      return (
        <div className="relative w-full rounded-2xl overflow-hidden bg-black/80 border border-white/10 flex flex-col items-center justify-center min-h-[380px] max-h-[70vh]">
          {/* Zoom Controls */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-black/70 p-1 rounded-xl border border-white/10 backdrop-blur-md">
            <button
              onClick={() => setImageZoom((z) => Math.min(z + 0.25, 2.5))}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono text-slate-400 px-1">
              {Math.round(imageZoom * 100)}%
            </span>
            <button
              onClick={() => setImageZoom((z) => Math.max(z - 0.25, 0.75))}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setImageZoom(1)}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="Reset Zoom"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-auto w-full h-full flex items-center justify-center p-4">
            <img
              src={imgSrc}
              alt={item.title}
              style={{ transform: `scale(${imageZoom})`, transition: 'transform 0.2s ease' }}
              className="max-h-[65vh] max-w-full object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      );
    }

    // 5. Web / Article / OpenGraph Reader View
    return (
      <div className="w-full space-y-4">
        {/* Rich OpenGraph Card */}
        <div className="rounded-2xl glass-panel p-6 border border-emerald-500/20 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {item.thumbnailUrl && (
              <img
                src={item.thumbnailUrl}
                alt=""
                className="w-full md:w-64 aspect-video object-cover rounded-xl border border-white/10 shadow-lg"
              />
            )}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono">
                <Globe className="w-4 h-4" />
                <span>{item.siteName || new URL(item.url || 'https://vault.io').hostname}</span>
              </div>
              <h3 className="text-xl font-bold text-slate-100 leading-snug">{item.title}</h3>
              <p className="text-sm text-slate-300 leading-relaxed">{item.description}</p>
              
              <div className="pt-2 flex items-center gap-3">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Open Full Article in New Tab</span>
                </a>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Link'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Live Iframe Sandbox Preview with Graceful Fallback */}
        <div className="rounded-2xl glass-panel overflow-hidden border border-white/10">
          <div className="px-4 py-2.5 bg-black/60 border-b border-white/10 flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono text-[11px]">Direct Iframe Viewport: {item.url}</span>
            <span className="text-[10px] text-slate-500">Note: Some websites restrict embedding via X-Frame-Options</span>
          </div>
          {!webIframeFailed ? (
            <div className="relative h-[420px] w-full bg-slate-950">
              <iframe
                src={item.url}
                title={item.title}
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                onError={() => setWebIframeFailed(true)}
                className="w-full h-full border-0"
              />
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <p className="text-sm text-slate-300">This external provider has disabled direct iframe embedding.</p>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Visit {item.siteName || 'External Site'} Directly</span>
              </a>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl overflow-y-auto">
      <div 
        className="relative w-full max-w-5xl rounded-3xl glass-panel border border-cyan-500/30 shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top Header Bar */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between gap-4 bg-[#090a0f]/90">
          <div className="flex items-center gap-3 truncate">
            <span className="text-xs font-mono uppercase tracking-widest px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              {item.mediaType.toUpperCase()}
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-100 truncate" title={item.title}>
              {item.title}
            </h2>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyLink}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              title="Copy URL"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/10 transition-colors"
              title="Open source in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Open Source</span>
            </a>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 bg-white/5 hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/30 transition-colors"
              title="Close viewer (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Center Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Main Media Player / Embed */}
          {renderMediaContent()}

          {/* Details & Interactive Commenting Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
            
            {/* Metadata Information (Left Col) */}
            <div className="lg:col-span-1 rounded-2xl glass-panel-subtle p-5 space-y-4 border border-white/5">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">
                  Description
                </span>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {item.description || 'No description provided.'}
                </p>
              </div>

              <div className="pt-2 border-t border-white/5 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> Views</span>
                  <span className="font-mono text-slate-200">{item.viewsCount}</span>
                </div>

                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Date Added</span>
                  <span className="font-mono text-slate-200">{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1.5"><TagIcon className="w-3.5 h-3.5" /> Source Type</span>
                  <span className="font-mono text-slate-200 uppercase">{item.source}</span>
                </div>
              </div>

              {/* Tags */}
              {item.tags.length > 0 && (
                <div className="pt-2 border-t border-white/5">
                  <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">
                    Tags
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {item.tags.map((t, idx) => (
                      <span key={idx} className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Like Button */}
              <button
                onClick={() => onLike(item.id)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30 transition-all shadow-[0_0_20px_rgba(244,63,94,0.15)]"
              >
                <Heart className="w-4 h-4 fill-rose-500" />
                <span>Like Post ({item.likesCount})</span>
              </button>
            </div>

            {/* Comment Section (Right 2 Cols) */}
            <div className="lg:col-span-2 rounded-2xl glass-panel-subtle p-5 border border-white/5 flex flex-col justify-between space-y-4">
              
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-sm font-semibold text-slate-100">Discussion</h4>
                  <span className="text-xs font-mono text-slate-500">({comments.length})</span>
                </div>
                {!user.isLoggedIn && (
                  <button
                    onClick={onOpenAuth}
                    className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <User className="w-3 h-3" />
                    <span>Sign in with Google</span>
                  </button>
                )}
              </div>

              {/* Comments List */}
              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                {comments.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-4 text-center">
                    No comments yet. Be the first to share your thoughts on this vault link!
                  </p>
                ) : (
                  comments.map((cmt) => (
                    <div
                      key={cmt.id}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5 transition-colors hover:border-white/10"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <img
                            src={cmt.authorAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${cmt.authorName}`}
                            alt=""
                            className="w-6 h-6 rounded-full object-cover ring-1 ring-white/10"
                          />
                          <span className="text-xs font-medium text-slate-200">{cmt.authorName}</span>
                          {cmt.isAdmin && (
                            <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Admin
                            </span>
                          )}
                          {cmt.isGoogleUser && !cmt.isAdmin && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300">
                              Verified
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span>{new Date(cmt.createdAt).toLocaleDateString()}</span>
                          {user.role === 'admin' && onDeleteComment && (
                            <button
                              onClick={() => onDeleteComment(cmt.id)}
                              className="text-slate-600 hover:text-rose-400 p-0.5"
                              title="Delete comment (Admin)"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 pl-8 leading-relaxed">
                        {cmt.content}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Input Form */}
              <form onSubmit={handleCommentSubmit} className="space-y-2 pt-3 border-t border-white/5">
                {!user.isLoggedIn && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Your Guest Nickname (e.g., CyberRecon)"
                      value={guestNickname}
                      onChange={(e) => setGuestNickname(e.target.value)}
                      className="w-full sm:w-64 px-3 py-1.5 rounded-lg text-xs glass-input text-slate-100 placeholder-slate-500"
                    />
                    <span className="text-[10px] text-slate-500 hidden sm:inline">Or sign in to verify</span>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={user.isLoggedIn ? `Comment as ${user.name}...` : 'Write a comment...'}
                    className="flex-1 px-3 py-2 rounded-xl text-xs glass-input text-slate-100 placeholder-slate-500"
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim()}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:hover:bg-cyan-500 text-slate-950 transition-all flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </form>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
