import React, { useState, useMemo } from 'react';
import { 
  Copy, 
  Check, 
  ExternalLink, 
  Trash2, 
  Edit3, 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Eye, 
  Heart, 
  Calendar, 
  Search, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Maximize2,
  Filter,
  ShieldCheck,
  RefreshCw,
  Info,
  X
} from 'lucide-react';
import { Category, MediaItem } from '../types';
import { 
  DuplicateCluster, 
  detectDuplicateClusters, 
  resolveDuplicateCluster, 
  DeduplicationStrategy 
} from '../utils/duplicateDetector';
import { decodeHtmlEntities } from '../utils/text';

interface DuplicateLinkManagerProps {
  items: MediaItem[];
  categories: Category[];
  onBatchUpdateItems: (updatedItems: MediaItem[], deletedItemIds: string[]) => void;
  onEditItem: (item: MediaItem) => void;
  onPreviewItem: (item: MediaItem) => void;
  onClose?: () => void;
}

export const DuplicateLinkManager: React.FC<DuplicateLinkManagerProps> = ({
  items,
  categories,
  onBatchUpdateItems,
  onEditItem,
  onPreviewItem,
  onClose,
}) => {
  const [strategy, setStrategy] = useState<DeduplicationStrategy>('keep_highest_engagement');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMasters, setSelectedMasters] = useState<Record<string, string>>({});
  const [collapsedClusters, setCollapsedClusters] = useState<Record<string, boolean>>({});
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmAllModal, setShowConfirmAllModal] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  // Detect duplicate clusters
  const clusters = useMemo(() => {
    return detectDuplicateClusters(items);
  }, [items]);

  // Total duplicate items that can be pruned
  const totalPrunableCount = useMemo(() => {
    return clusters.reduce((acc, c) => acc + (c.items.length - 1), 0);
  }, [clusters]);

  // Filter clusters by search
  const filteredClusters = useMemo(() => {
    if (!searchQuery.trim()) return clusters;
    const q = searchQuery.toLowerCase().trim();
    return clusters.filter((c) => {
      const matchKey = c.canonicalKey.toLowerCase().includes(q);
      const matchItems = c.items.some((it) => 
        it.title.toLowerCase().includes(q) ||
        it.url.toLowerCase().includes(q) ||
        it.itemNumber?.toString() === q ||
        `#${it.itemNumber}` === q
      );
      return matchKey || matchItems;
    });
  }, [clusters, searchQuery]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(text);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const toggleClusterCollapse = (clusterId: string) => {
    setCollapsedClusters((prev) => ({
      ...prev,
      [clusterId]: !prev[clusterId],
    }));
  };

  const handleSetMaster = (clusterId: string, itemId: string) => {
    setSelectedMasters((prev) => ({
      ...prev,
      [clusterId]: itemId,
    }));
  };

  // Resolve a single cluster
  const handleResolveSingleCluster = (cluster: DuplicateCluster) => {
    const chosenMasterId = selectedMasters[cluster.id] || cluster.masterItemId;
    const { masterItem, itemsToDelete, mergedLikesCount, mergedViewsCount } = resolveDuplicateCluster(
      cluster,
      strategy,
      chosenMasterId
    );

    const deletedIds = itemsToDelete.map((it) => it.id);
    onBatchUpdateItems([masterItem], deletedIds);

    setActionSuccessMessage(
      `รวมข้อมูลและลบลิงก์ซ้ำเรียบร้อยแล้ว! (เก็บ #${masterItem.itemNumber || 1} ไว้ รวมเป็น ❤️ ${mergedLikesCount} ไลก์, 👁️ ${mergedViewsCount} วิว)`
    );
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  // Delete a single duplicate item manually
  const handleDeleteSingleItem = (cluster: DuplicateCluster, itemId: string) => {
    const itemToDelete = cluster.items.find((it) => it.id === itemId);
    if (!itemToDelete) return;

    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบโพสต์ #${itemToDelete.itemNumber || 1} "${decodeHtmlEntities(itemToDelete.title)}"?`)) {
      return;
    }

    onBatchUpdateItems([], [itemId]);
    setActionSuccessMessage(`ลบโพสต์ #${itemToDelete.itemNumber || 1} ออกจากระบบแล้ว`);
    setTimeout(() => setActionSuccessMessage(null), 3000);
  };

  // Resolve ALL duplicate clusters automatically
  const handleResolveAllClusters = () => {
    setIsProcessing(true);
    try {
      const updatedMasters: MediaItem[] = [];
      const allDeletedIds: string[] = [];

      clusters.forEach((cluster) => {
        const chosenMasterId = selectedMasters[cluster.id] || cluster.masterItemId;
        const { masterItem, itemsToDelete } = resolveDuplicateCluster(cluster, strategy, chosenMasterId);
        updatedMasters.push(masterItem);
        itemsToDelete.forEach((it) => allDeletedIds.push(it.id));
      });

      onBatchUpdateItems(updatedMasters, allDeletedIds);

      setShowConfirmAllModal(false);
      setActionSuccessMessage(
        `⚡ ทำการรวมและคลีนลิงก์ซ้ำทั้งหมดเรียบร้อยแล้ว! (ลบ ${allDeletedIds.length} รายการที่ซ้ำ และหลอมรวมสถิติให้โพสต์หลัก ${updatedMasters.length} รายการ)`
      );
      setTimeout(() => setActionSuccessMessage(null), 5000);
    } catch (err) {
      console.error('Failed to auto resolve duplicates:', err);
      alert('เกิดข้อผิดพลาดในการรวมลิงก์ซ้ำ');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header if used as modal */}
      {onClose && (
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-100">
                หน้าตรวจสอบและจัดการลิงก์ซ้ำ (Duplicate Link Manager)
              </h3>
              <p className="text-xs text-slate-400">
                ตรวจจับลิงก์ซ้ำในระบบ เลือกจัดการอัตโนมัติหรือจัดการเองได้ทันที
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors touch-target cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Success Notification Banner */}
      {actionSuccessMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-sm flex items-center gap-3 shadow-lg animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-medium">{actionSuccessMessage}</span>
        </div>
      )}

      {/* Main Status & Hero Card */}
      <div className="rounded-3xl bg-gradient-to-br from-[#101423] via-[#0b0e18] to-[#0d121f] border border-cyan-500/30 p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-semibold">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>DUPLICATE LINK DETECTOR & RESOLUTION NEXUS</span>
            </div>
            
            <h2 className="text-xl sm:text-2xl font-bold text-slate-100 font-display">
              ระบบตรวจสอบและจัดการลิงก์ซ้ำ
            </h2>
            
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              สแกนตรวจสอบลิงก์ซ้ำทั้งระบบแบบเรียลไทม์ ตรวจจับทั้ง URL เดียวกัน, รหัสวิดีโอ YouTube, รหัสทวีต X/Twitter, รหัสภาพ Pixiv และแกลเลอรีต่างๆ พร้อมระบบหลอมรวมยอดกดใจ ❤️ และยอดเข้าชม 👁️ ให้อัตโนมัติโดยข้อมูลไม่สูญหาย
            </p>
          </div>

          {/* Quick Metrics Badge */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-3 rounded-2xl bg-slate-900/90 border border-white/10 text-center min-w-[110px]">
              <span className="text-[11px] font-mono uppercase text-slate-500 block">กลุ่มที่ซ้ำ</span>
              <span className={`text-2xl font-bold font-mono ${clusters.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {clusters.length}
              </span>
            </div>

            <div className="px-4 py-3 rounded-2xl bg-slate-900/90 border border-white/10 text-center min-w-[110px]">
              <span className="text-[11px] font-mono uppercase text-slate-500 block">เคลียร์ได้ทันที</span>
              <span className={`text-2xl font-bold font-mono ${totalPrunableCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {totalPrunableCount}
              </span>
            </div>
          </div>
        </div>

        {/* Global Strategy Bar & Action Trigger */}
        {clusters.length > 0 && (
          <div className="mt-6 pt-5 border-t border-white/10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 shrink-0">
                <Filter className="w-3.5 h-3.5 text-cyan-400" />
                <span>เกณฑ์การเลือกโพสต์หลักอัตโนมัติ:</span>
              </span>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as DeduplicationStrategy)}
                className="px-3 py-2 text-xs rounded-xl glass-input text-slate-200 border border-white/15 focus:border-cyan-400 focus:outline-none"
              >
                <option value="keep_highest_engagement">
                  ⭐ เก็บโพสต์ที่มีคนกดไลก์/ยอดวิวสูงสุด + หลอมรวมสถิติ (แนะนำ)
                </option>
                <option value="keep_oldest">
                  📅 เก็บโพสต์ที่สร้างก่อนสุด (ต้นฉบับดั้งเดิม)
                </option>
                <option value="keep_newest">
                  🚀 เก็บโพสต์ที่เพิ่มเข้ามาใหม่ล่าสุด
                </option>
              </select>
            </div>

            {/* Auto Resolve All Button */}
            <button
              type="button"
              onClick={() => setShowConfirmAllModal(true)}
              disabled={isProcessing || clusters.length === 0}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white shadow-lg shadow-rose-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
            >
              <Zap className="w-4 h-4 text-yellow-200" />
              <span>⚡ จัดการซ้ำอัตโนมัติทั้งหมด ({clusters.length} กลุ่ม)</span>
            </button>
          </div>
        )}
      </div>

      {/* No Duplicates Found State */}
      {clusters.length === 0 && (
        <div className="p-8 sm:p-12 rounded-3xl glass-panel text-center flex flex-col items-center justify-center space-y-3 border border-emerald-500/20">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.2)]">
            <ShieldCheck className="w-8 h-8 stroke-[2]" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-100">
            ยอดเยี่ยม! ไม่พบลิงก์ซ้ำในระบบ
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md">
            คลังข้อมูลของคุณสมบูรณ์แบบ ลิงก์ทุกรายการในระบบ ({items.length} รายการ) มี URL ปลายทางและรหัสระบุตัวตนที่ไม่ซ้ำซ้อนกันเลย
          </p>
        </div>
      )}

      {/* Search & Filter within Duplicate Clusters */}
      {clusters.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อ, รหัสโพสต์ หรือ URL ในรายการซ้ำ..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl glass-input text-slate-100 placeholder-slate-500 border border-white/10 focus:border-cyan-500/50"
            />
          </div>

          <span className="text-xs font-mono text-slate-400">
            แสดงผล {filteredClusters.length} จาก {clusters.length} กลุ่มที่มีความซ้ำซ้อน
          </span>
        </div>
      )}

      {/* Duplicate Clusters List */}
      <div className="space-y-4">
        {filteredClusters.map((cluster, clusterIndex) => {
          const isCollapsed = collapsedClusters[cluster.id] || false;
          const currentMasterId = selectedMasters[cluster.id] || cluster.masterItemId;
          const masterItem = cluster.items.find((it) => it.id === currentMasterId) || cluster.items[0];

          return (
            <div 
              key={cluster.id}
              className="rounded-2xl sm:rounded-3xl bg-[#0b0e18] border border-white/10 hover:border-amber-500/30 shadow-xl overflow-hidden transition-all"
            >
              {/* Cluster Header */}
              <div className="p-4 sm:p-5 bg-white/[0.02] border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    #{clusterIndex + 1}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-slate-100">
                        {cluster.reasonThai}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {cluster.items.length} โพสต์ที่ตรงกัน
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-mono text-cyan-400 truncate max-w-md">
                        {cluster.canonicalKey}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(cluster.items[0]?.url || '')}
                        className="text-slate-500 hover:text-white"
                        title="คัดลอก URL"
                      >
                        {copiedUrl === cluster.items[0]?.url ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Cluster Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    type="button"
                    onClick={() => handleResolveSingleCluster(cluster)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    title="รวมโพสต์ในกลุ่มนี้เป็นรายการเดียว และนำยอดไลก์มารวมกัน"
                  >
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    <span>รวมกลุ่มนี้</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleClusterCollapse(cluster.id)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-white/10"
                    title={isCollapsed ? 'ขยายดูรายการ' : 'ย่อรายการ'}
                  >
                    {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Items Inside Cluster */}
              {!isCollapsed && (
                <div className="p-3 sm:p-5 space-y-3 bg-black/20">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mb-1 px-1">
                    <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>
                      เลือกปุ่มวงกลมหน้ารายการที่ต้องการให้เป็น <strong>โพสต์หลัก (Master)</strong> ระบบจะเก็บรายการนั้นไว้และลบรายการซ้ำที่เหลือออก
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {cluster.items.map((item) => {
                      const isMaster = item.id === currentMasterId;
                      const category = categoryMap.get(item.categoryId);
                      const cleanTitle = decodeHtmlEntities(item.title);

                      return (
                        <div
                          key={item.id}
                          className={`p-3 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                            isMaster
                              ? 'bg-cyan-950/20 border-cyan-500/50 shadow-md ring-1 ring-cyan-500/30'
                              : 'bg-[#0e121d] border-white/5 hover:border-white/15'
                          }`}
                        >
                          {/* Left: Radio Selector & Thumbnail & Info */}
                          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                            <label className="flex items-center gap-2 cursor-pointer shrink-0 mt-1 sm:mt-0">
                              <input
                                type="radio"
                                name={`master_${cluster.id}`}
                                checked={isMaster}
                                onChange={() => handleSetMaster(cluster.id, item.id)}
                                className="w-4 h-4 text-cyan-500 accent-cyan-400 cursor-pointer"
                              />
                            </label>

                            {/* Thumbnail */}
                            <div 
                              onClick={() => onPreviewItem(item)}
                              className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 bg-slate-950 border border-white/10 cursor-pointer group"
                            >
                              <img
                                src={item.thumbnailUrl}
                                alt={cleanTitle}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute top-1 left-1 px-1.5 py-0.2 rounded bg-black/80 font-mono text-[9px] font-bold text-cyan-400">
                                #{item.itemNumber || 1}
                              </div>
                            </div>

                            {/* Info */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 
                                  onClick={() => onPreviewItem(item)}
                                  className="text-xs sm:text-sm font-semibold text-slate-200 hover:text-cyan-300 transition-colors line-clamp-1 cursor-pointer"
                                  title={cleanTitle}
                                >
                                  {cleanTitle}
                                </h4>

                                {isMaster && (
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1 font-bold">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    <span>แนะนำให้เป็นโพสต์หลัก (MASTER)</span>
                                  </span>
                                )}
                              </div>

                              <p className="text-[11px] font-mono text-slate-400 truncate mt-1">
                                {item.url}
                              </p>

                              {/* Badges / Metrics */}
                              <div className="flex items-center gap-3 mt-2 text-[10px] sm:text-xs font-mono text-slate-400 flex-wrap">
                                <span className="flex items-center gap-1 text-rose-400 font-semibold">
                                  <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                                  <span>{item.likesCount || 0} ใจ</span>
                                </span>

                                <span className="flex items-center gap-1 text-slate-300">
                                  <Eye className="w-3 h-3" />
                                  <span>{item.viewsCount || 0} วิว</span>
                                </span>

                                <span className="flex items-center gap-1 text-slate-400">
                                  <Calendar className="w-3 h-3" />
                                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                                </span>

                                {category && (
                                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">
                                    {category.name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: Actions */}
                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => onPreviewItem(item)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/30 transition-colors"
                              title="เปิดดูโพสต์นี้"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => onEditItem(item)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/30 transition-colors"
                              title="แก้ไขข้อมูลโพสต์นี้"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteSingleItem(cluster, item.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-colors"
                              title="ลบโพสต์นี้ออกจากคลัง"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal for Auto-Resolve All */}
      {showConfirmAllModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in-50 duration-150"
          onClick={() => setShowConfirmAllModal(false)}
        >
          <div 
            className="relative w-full max-w-lg rounded-3xl bg-[#0e121d] border border-amber-500/40 shadow-2xl p-6 text-center space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-2 animate-bounce">
              <Zap className="w-7 h-7 stroke-[2]" />
            </div>

            <div className="inline-block px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 text-xs font-mono font-bold">
              ยืนยันการเคลียร์ลิงก์ซ้ำอัตโนมัติทั้งหมด
            </div>

            <h3 className="text-lg font-bold text-slate-100">
              รวมข้อมูลและลบลิงก์ที่ซ้ำกัน {clusters.length} กลุ่ม?
            </h3>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-left text-xs text-slate-300 space-y-2">
              <div className="flex items-center justify-between">
                <span>จำนวนกลุ่มที่พบลิงก์ซ้ำ:</span>
                <strong className="text-amber-400 font-mono">{clusters.length} กลุ่ม</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>จำนวนโพสต์ซ้ำที่จะถูกลบออก:</span>
                <strong className="text-rose-400 font-mono">{totalPrunableCount} รายการ</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>โพสต์หลักที่เก็บรักษาไว้:</span>
                <strong className="text-emerald-400 font-mono">{clusters.length} รายการ</strong>
              </div>
              <div className="pt-2 border-t border-white/5 text-[11px] text-cyan-300">
                🛡️ ยอดกดใจ ❤️ และยอดเข้าชม 👁️ ทั้งหมดของโพสต์ที่ซ้ำจะถูกหลอมรวมเข้ากับโพสต์หลักให้อัตโนมัติ สถิติไม่สูญหาย!
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmAllModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleResolveAllClusters}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white shadow-lg shadow-rose-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>กำลังดำเนินการ...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>ยืนยันรวมทั้งหมดทันที</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
