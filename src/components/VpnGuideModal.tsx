import React, { useState } from 'react';
import { 
  X, 
  Globe, 
  ShieldAlert, 
  ExternalLink, 
  Check, 
  Sparkles, 
  Info, 
  HelpCircle,
  Wifi,
  Smartphone,
  Laptop,
  Search,
  ArrowRight
} from 'lucide-react';
import { VPN_RECOMMENDATIONS } from '../utils/vpnDetector';

interface VpnGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFilterVpnLinks?: () => void;
}

export const VpnGuideModal: React.FC<VpnGuideModalProps> = ({
  isOpen,
  onClose,
  onFilterVpnLinks,
}) => {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in-50 duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl rounded-2xl sm:rounded-3xl glass-panel border border-red-500/30 bg-[#0d1018] shadow-[0_0_80px_rgba(239,68,68,0.2)] overflow-hidden my-auto max-h-[92vh] flex flex-col gpu-layer"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-red-950/40 via-[#0d1018] to-slate-900/60">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl select-none" role="img" aria-label="Japan Flag">
              🇯🇵
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-100 font-display tracking-wide">
                  คำแนะนำ: ทำไมบางลิงก์เปิดไม่ได้? (VPN JP)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                  VPN NOTICE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                สำหรับผู้ที่เปิดลิงก์แล้วไม่เห็นหน้าเว็บ หรือขึ้นหน้าต่างว่างเปล่า / Error 403
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors touch-target"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-slate-300 text-xs sm:text-sm leading-relaxed">
          
          {/* Main Notice Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-red-500/15 via-rose-500/10 to-amber-500/5 border border-red-500/30 space-y-2.5 shadow-lg">
            <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>ทำไมบางลิงก์กดเปิดแล้วไม่แสดงผลตามหน้าเว็บ?</span>
            </div>
            <p className="text-xs text-rose-100/90 leading-relaxed">
              ในบางลิงก์ (โดยเฉพาะเว็บไซต์จากประเทศญี่ปุ่น เช่น สตรีมมิ่งอนิเมะ, แพลตฟอร์มมังงะ, DMM, Pixiv R-18, TVer, Abema, NicoNico, หรือบริการออนไลน์ต่าง ๆ) มีการจำกัดการเข้าถึงเฉพาะผู้ใช้อินเทอร์เน็ตที่เชื่อมต่อจากในประเทศญี่ปุ่นเท่านั้น <strong>(Region Lock / Geo-Blocking)</strong>
            </p>
            <div className="p-3 rounded-xl bg-black/40 border border-red-500/20 text-xs text-rose-200 flex items-start gap-2">
              <span className="text-base shrink-0">💡</span>
              <div>
                <strong>อาการที่พบเมื่อไม่มี VPN JP:</strong>{' '}
                <span>หน้าเว็บจะแสดงเป็นสีขาวว่างเปล่า, ขึ้นรหัสข้อผิดพลาด <code>403 Forbidden</code>, หน้าแจ้งว่า <em>"This service is not available in your region"</em> หรือเปิดหน้าตามลิงก์ไม่ได้</span>
              </div>
            </div>
          </div>

          {/* Solution Steps */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-100 text-xs sm:text-sm flex items-center gap-2 font-display">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>วิธีแก้ไขเพื่อให้เปิดดูหน้าเว็บได้ตามปกติ</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col justify-between space-y-2">
                <div>
                  <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-xs mb-2">
                    1
                  </div>
                  <h4 className="font-semibold text-slate-200 text-xs">ติดตั้งแอปหรือส่วนขยาย VPN</h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    เลือกเครื่องมือ VPN ที่มีเซิร์ฟเวอร์ประเทศญี่ปุ่น (Japan / Tokyo)
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col justify-between space-y-2">
                <div>
                  <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-xs mb-2">
                    2
                  </div>
                  <h4 className="font-semibold text-slate-200 text-xs">เชื่อมต่อเซิร์ฟเวอร์ญี่ปุ่น</h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    กด Connect เพื่อเปลี่ยน IP ปลายทางให้เป็นประเทศญี่ปุ่น (VPN JP)
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col justify-between space-y-2">
                <div>
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-xs mb-2">
                    3
                  </div>
                  <h4 className="font-semibold text-slate-200 text-xs">รีเฟรชหน้าเว็บหรือเปิดใหม่</h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    เมื่อเชื่อมต่อแล้ว กดปุ่ม "เปิดแท็บใหม่" หรือรีเฟรช จะเห็นเนื้อหาตามลิงก์ทันที!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* System Badge Guide */}
          <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 flex items-start gap-3">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-cyan-300">สัญลักษณ์บนการ์ดในระบบ:</span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  🇯🇵 VPN JP
                </span>
              </div>
              <p className="text-slate-400 text-[11px]">
                ลิงก์ใดที่มีป้ายกำกับนี้ คือลิงก์ที่ระบบตรวจพบว่ามีความจำเป็นต้องใช้ VPN ประเทศญี่ปุ่น เพื่อความสะดวกในการใช้งาน
              </p>
            </div>
          </div>

          {/* Recommended VPN Apps */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-100 text-xs sm:text-sm flex items-center gap-2">
                <Wifi className="w-4 h-4 text-emerald-400" />
                <span>แนะนำแอปพลิเคชัน & ส่วนขยาย VPN ยอดนิยม</span>
              </h3>
              <span className="text-[11px] text-slate-400">ฟรี / ใช้งานง่าย</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {VPN_RECOMMENDATIONS.map((app, idx) => (
                <div 
                  key={idx}
                  className="p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between gap-2.5"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-semibold text-slate-200 text-xs truncate">
                        {app.name}
                      </h4>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 shrink-0">
                        {app.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                      {app.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                      <span>รองรับ:</span>
                      <span>{app.platforms.join(', ')}</span>
                    </div>

                    <a
                      href={app.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline font-semibold"
                    >
                      <span>เว็บไซต์</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Modal Bottom Actions */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-white/10 bg-[#090a0f] flex flex-wrap items-center justify-between gap-3">
          {onFilterVpnLinks ? (
            <button
              onClick={() => {
                onFilterVpnLinks();
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 transition-all active:scale-95 touch-target"
            >
              <Search className="w-3.5 h-3.5" />
              <span>กรองดูเฉพาะลิงก์ 🇯🇵 VPN JP</span>
            </button>
          ) : (
            <div className="text-[11px] text-slate-500">
              Vault Community Notice
            </div>
          )}

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95 touch-target"
          >
            เข้าใจแล้ว
          </button>
        </div>

      </div>
    </div>
  );
};
