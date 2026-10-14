import React, { useState, useMemo } from 'react';
import { 
  X, 
  Sparkles, 
  Check, 
  AlertTriangle, 
  ArrowRight, 
  Layers, 
  Search, 
  CheckCircle2, 
  Plus, 
  RefreshCw,
  FolderCheck,
  FolderPlus,
  ExternalLink,
  ShieldCheck,
  ChevronDown,
  Filter
} from 'lucide-react';
import { Category, MediaItem } from '../types';
import { auditVaultCategories, CategoryAuditResult } from '../utils/aiCategoryClassifier';
import { decodeHtmlEntities } from '../utils/text';

interface AiCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: MediaItem[];
  categories: Category[];
  onBatchUpdateItems: (updatedItems: MediaItem[], deletedItemIds: string[]) => void;
  onAddCategory?: (category: Partial<Category>) => void;
}

export const AiCategoryModal: React.FC<AiCategoryModalProps> = ({
  isOpen,
  onClose,
  items,
  categories,
  onBatchUpdateItems,
  onAddCategory,
}) => {
  const [filterMode, setFilterMode] = useState<'misclassified' | 'all'>('misclassified');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [manualOverrides, setManualOverrides] = useState<Map<string, string>>(new Map());
  const [isApplying, setIsApplying] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const validCategories = useMemo(() => {
    return categories.filter((c) => c.id !== 'cat-all' && c.slug !== 'all');
  }, [categories]);

  // Run full audit
  const healthReport = useMemo(() => {
    return auditVaultCategories(items, categories);
  }, [items, categories]);

  // Initialize selected items to all misclassified on modal open or report update
  React.useEffect(() => {
    if (isOpen) {
      const misclassifiedIds = healthReport.results
        .filter((r) => r.isMisclassified && (r.recommendedCategory || r.suggestedNewCategory))
        .map((r) => r.item.id);
      setSelectedItemIds(new Set(misclassifiedIds));
      setManualOverrides(new Map());
      setSuccessMessage(null);
    }
  }, [isOpen, healthReport]);

  // Filtered results according to active tab and search query
  const filteredAudits = useMemo(() => {
    let list = healthReport.results;
    if (filterMode === 'misclassified') {
      list = list.filter((r) => r.isMisclassified);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.item.title.toLowerCase().includes(q) ||
          r.item.url.toLowerCase().includes(q) ||
          r.detectedPlatform.toLowerCase().includes(q) ||
          r.reason.toLowerCase().includes(q)
      );
    }
    return list;
  }, [healthReport, filterMode, searchQuery]);

  if (!isOpen) return null;

  const toggleSelectItem = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllMisclassified = () => {
    const misclassifiedIds = healthReport.results
      .filter((r) => r.isMisclassified)
      .map((r) => r.item.id);
    setSelectedItemIds(new Set(misclassifiedIds));
  };

  const handleSelectAll = () => {
    setSelectedItemIds(new Set(filteredAudits.map((r) => r.item.id)));
  };

  const handleDeselectAll = () => {
    setSelectedItemIds(new Set());
  };

  const handleCategoryOverride = (itemId: string, categoryId: string) => {
    setManualOverrides((prev) => {
      const next = new Map(prev);
      next.set(itemId, categoryId);
      return next;
    });
    // Ensure item is selected
    setSelectedItemIds((prev) => new Set([...prev, itemId]));
  };

  const handleApplyChanges = async () => {
    if (selectedItemIds.size === 0) return;
    setIsApplying(true);

    try {
      const updatedItems: MediaItem[] = [];

      for (const audit of healthReport.results) {
        if (selectedItemIds.has(audit.item.id)) {
          const overrideCatId = manualOverrides.get(audit.item.id);
          const targetCatId = overrideCatId || audit.recommendedCategory?.id;

          if (targetCatId && targetCatId !== audit.item.categoryId) {
            updatedItems.push({
              ...audit.item,
              categoryId: targetCatId,
              tags: audit.suggestedTagsToAdd
                ? Array.from(new Set([...audit.item.tags, ...audit.suggestedTagsToAdd]))
                : audit.item.tags,
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }

      if (updatedItems.length > 0) {
        onBatchUpdateItems(updatedItems, []);
        setSuccessMessage(`✨ ปรับหมวดหมู่ด้วย AI สำเร็จเรียบร้อยแล้ว จำนวน ${updatedItems.length} รายการ!`);
        setTimeout(() => {
          setSuccessMessage(null);
        }, 5000);
      } else {
        setSuccessMessage('ไม่มีรายการที่มีการเปลี่ยนแปลง');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } finally {
      setIsApplying(false);
    }
  };

  const handleCreateMissingCategory = (missing: {
    name: string;
    slug: string;
    icon: string;
    color: string;
    description: string;
  }) => {
    if (!onAddCategory) return;
    onAddCategory({
      name: missing.name,
      slug: missing.slug,
      icon: missing.icon,
      color: missing.color,
      description: missing.description,
    });
    setSuccessMessage(`สร้างหมวดหมู่ "${missing.name}" เรียบร้อยแล้ว! กำลังวิเคราะห์และจัดกลุ่มใหม่...`);
  };

  return (
    <div 
      className="fixed inset-0 z-[75] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in-50 duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-5xl rounded-3xl glass-panel border border-cyan-500/40 bg-[#0d1018] shadow-[0_0_80px_rgba(6,182,212,0.25)] overflow-hidden my-auto max-h-[94vh] flex flex-col gpu-layer"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#090c15]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-lg font-bold text-slate-100 font-display tracking-wide">
                  AI Auto-Categorize (จัดหมวดหมู่อัตโนมัติด้วย AI)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  SMART RECLASSIFY
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                ตรวจสอบและแก้ไขข้อผิดพลาดในการจัดหมวดหมู่ตามโดเมนลิงก์แท้ (เช่น ลิงก์ X ต้องอยู่หมวดหมู่ X ไม่ใช่ Fanbox)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors touch-target"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Banner */}
        {successMessage && (
          <div className="mx-4 sm:mx-6 mt-4 p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          
          {/* Health Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono uppercase text-slate-400">ลิงก์ทั้งหมดในคลัง</span>
                <p className="text-xl font-bold text-slate-100 font-mono mt-0.5">
                  {healthReport.totalScanned} <span className="text-xs font-normal text-slate-400">รายการ</span>
                </p>
              </div>
              <Layers className="w-7 h-7 text-slate-500 opacity-60" />
            </div>

            <div className={`p-4 rounded-2xl border flex items-center justify-between ${
              healthReport.misclassifiedCount > 0 
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' 
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}>
              <div>
                <span className="text-[11px] font-mono uppercase opacity-80">
                  {healthReport.misclassifiedCount > 0 ? 'พบหมวดหมู่ไม่ตรง/ผิดพลาด' : 'หมวดหมู่ถูกต้องทั้งหมด'}
                </span>
                <p className="text-xl font-bold font-mono mt-0.5">
                  {healthReport.misclassifiedCount} <span className="text-xs font-normal opacity-70">รายการ</span>
                </p>
              </div>
              {healthReport.misclassifiedCount > 0 ? (
                <AlertTriangle className="w-7 h-7 text-rose-400 opacity-80 animate-pulse" />
              ) : (
                <CheckCircle2 className="w-7 h-7 text-emerald-400 opacity-80" />
              )}
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono uppercase text-slate-400">หมวดหมู่ถูกต้องแล้ว</span>
                <p className="text-xl font-bold text-emerald-400 font-mono mt-0.5">
                  {healthReport.correctCount} <span className="text-xs font-normal text-slate-400">รายการ</span>
                </p>
              </div>
              <FolderCheck className="w-7 h-7 text-emerald-500 opacity-60" />
            </div>
          </div>

          {/* Missing Category Recommendations (e.g. User has X links but no X category yet) */}
          {healthReport.missingCategories.length > 0 && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-cyan-500/10 to-transparent border border-amber-500/30 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <FolderPlus className="w-4 h-4 text-amber-400 shrink-0" />
                <span>คำแนะนำ: ตรวจพบคลิปหรือลิงก์เฉพาะกลุ่ม แต่ยังไม่มีหมวดหมู่รองรับ</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                ระบบตรวจพบว่าคุณมีลิงก์จากแพลตฟอร์มเหล่านี้ แต่ในระบบยังไม่มีหมวดหมู่เฉพาะ คุณสามารถกดปุ่มเพื่อสร้างหมวดหมู่ใหม่และให้ AI ย้ายลิงก์เข้าให้อัตโนมัติ:
              </p>
              <div className="flex flex-wrap gap-2.5 pt-1">
                {healthReport.missingCategories.map((missing, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleCreateMissingCategory(missing)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 transition-all touch-target active:scale-95 cursor-pointer shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                    <span>สร้างหมวดหมู่ "{missing.name}" ({missing.itemCount} ลิงก์)</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Controls Bar: Search & Filter Tabs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            
            {/* Filter Tabs */}
            <div className="flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => setFilterMode('misclassified')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  filterMode === 'misclassified'
                    ? 'bg-rose-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>ตรวจพบข้อผิดพลาด ({healthReport.misclassifiedCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  filterMode === 'all'
                    ? 'bg-cyan-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>ทุกลิงก์ ({healthReport.totalScanned})</span>
              </button>
            </div>

            {/* Quick Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาชื่อโพสต์, URL, หรือแพลตฟอร์ม..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs glass-input text-slate-100 placeholder-slate-500"
              />
            </div>

            {/* Selection Quick Buttons */}
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={handleSelectAllMisclassified}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              >
                เลือกเฉพาะที่ต้องแก้
              </button>
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              >
                เลือกทั้งหมด
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-slate-400 hover:text-white transition-colors"
              >
                ล้างการเลือก
              </button>
            </div>

          </div>

          {/* Comparison Cards List */}
          <div className="space-y-3">
            {filteredAudits.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h3 className="text-sm font-bold text-slate-200">
                  {filterMode === 'misclassified' 
                    ? 'ไม่พบลิงก์ที่จัดหมวดหมู่ผิดพลาด ทุกลิงก์อยู่ในหมวดหมู่ที่เหมาะสมแล้ว!' 
                    : 'ไม่พบรายการที่ตรงกับคำค้นหา'}
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  ระบบได้ตรวจสอบลิงก์ทั้งหมดตามโดเมนและเนื้อหาอย่างเข้มงวดเรียบร้อยแล้ว
                </p>
              </div>
            ) : (
              filteredAudits.map((audit) => {
                const item = audit.item;
                const isSelected = selectedItemIds.has(item.id);
                const overrideCatId = manualOverrides.get(item.id);
                const targetCat = overrideCatId 
                  ? categories.find((c) => c.id === overrideCatId) 
                  : audit.recommendedCategory;

                const willChange = targetCat && targetCat.id !== item.categoryId;

                return (
                  <div
                    key={item.id}
                    onClick={() => toggleSelectItem(item.id)}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5 ${
                      isSelected
                        ? willChange
                          ? 'bg-cyan-950/20 border-cyan-500/50 shadow-md shadow-cyan-950/40'
                          : 'bg-white/[0.03] border-white/20'
                        : 'bg-white/[0.01] border-white/5 opacity-70 hover:opacity-100'
                    }`}
                  >
                    {/* Left: Checkbox & Item Info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectItem(item.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 w-4 h-4 rounded bg-slate-900 border-white/20 text-cyan-500 focus:ring-cyan-500/40 cursor-pointer shrink-0"
                      />

                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-950 shrink-0 border border-white/10 hidden sm:block">
                        <img
                          src={item.thumbnailUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&q=80'}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&q=80';
                          }}
                        />
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                            #{item.itemNumber || 1}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300">
                            {audit.detectedPlatform}
                          </span>
                          <h4 className="text-xs sm:text-sm font-semibold text-slate-100 truncate" title={item.title}>
                            {decodeHtmlEntities(item.title)}
                          </h4>
                        </div>

                        <p className="text-[11px] font-mono text-slate-400 truncate max-w-lg">
                          {item.url}
                        </p>

                        {/* AI Detection Reason */}
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-300 pt-0.5">
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span className={audit.isMisclassified ? 'text-amber-300 font-medium' : 'text-slate-400'}>
                            {audit.reason}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Current Category ➡️ Recommended Category with Override Selector */}
                    <div 
                      className="flex items-center gap-2.5 shrink-0 self-stretch md:self-auto justify-between md:justify-end pt-2 md:pt-0 border-t md:border-t-0 border-white/10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Current Category */}
                      <div className="text-right">
                        <span className="text-[9px] font-mono uppercase text-slate-500 block">ปัจจุบัน (Current)</span>
                        <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 text-slate-300 border border-white/10 truncate max-w-[130px]">
                          {audit.currentCategory ? audit.currentCategory.name : 'ไม่ได้ระบุ'}
                        </span>
                      </div>

                      {/* Direction Arrow */}
                      <ArrowRight className={`w-4 h-4 shrink-0 ${willChange ? 'text-cyan-400 animate-pulse' : 'text-slate-600'}`} />

                      {/* Recommended / New Category Target */}
                      <div>
                        <span className="text-[9px] font-mono uppercase text-cyan-400 font-bold block">AI แนะนำ (Target)</span>
                        <div className="relative">
                          <select
                            value={targetCat?.id || ''}
                            onChange={(e) => handleCategoryOverride(item.id, e.target.value)}
                            className="px-2.5 py-1 pr-6 rounded-lg text-xs font-semibold bg-cyan-950/60 text-cyan-200 border border-cyan-500/40 hover:border-cyan-400 transition-colors cursor-pointer appearance-none max-w-[170px]"
                          >
                            {validCategories.map((cat) => (
                              <option key={cat.id} value={cat.id} className="bg-slate-900 text-slate-100">
                                {cat.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3 h-3 text-cyan-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* Modal Bottom Actions */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-white/10 bg-[#090c15] flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            <span>เลือกแล้ว </span>
            <strong className="text-cyan-300 font-mono font-bold text-sm">{selectedItemIds.size}</strong>
            <span> จาก {filteredAudits.length} รายการ</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors touch-target"
            >
              ปิดหน้าต่าง
            </button>

            <button
              type="button"
              disabled={selectedItemIds.size === 0 || isApplying}
              onClick={handleApplyChanges}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 hover:from-cyan-300 hover:to-teal-300 disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] active:scale-95 touch-target cursor-pointer font-display tracking-wider"
            >
              {isApplying ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>
                {isApplying
                  ? 'กำลังปรับปรุงหมวดหมู่...'
                  : `จัดหมวดหมู่ตาม AI ทันที (${selectedItemIds.size} รายการ)`}
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
