import React, { useState } from 'react';
import { Link as LinkIcon, Search, X } from 'lucide-react';
import { useTheme } from '../../lib/theme';
import { useModalLifecycle } from '../../hooks/useModalLifecycle';
import { CaseItem } from '../../types';
import { SheetRowItem } from '../../lib/googleSheetsReader';

interface LinkCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  linkingRow: SheetRowItem | null;
  systemCases: CaseItem[];
  onLinkCase: (caseItem: CaseItem) => void;
}

export const LinkCaseModal: React.FC<LinkCaseModalProps> = ({
  isOpen,
  onClose,
  linkingRow,
  systemCases,
  onLinkCase
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [searchQuery, setSearchQuery] = useState('');

  const { handleSafeClose, handleBackdropClick } = useModalLifecycle({
    isOpen,
    onClose,
    id: 'link-case-modal',
  });

  if (!isOpen || !linkingRow) return null;

  const filteredCases = systemCases
    .filter(c => {
      const q = searchQuery.toLowerCase();
      return (c.caseNumber || '').toLowerCase().includes(q) ||
             (c.title || '').toLowerCase().includes(q) ||
             (c.client?.name || '').toLowerCase().includes(q);
    })
    .slice(0, 15);

  return (
    <div 
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg max-h-[88vh] overflow-y-auto my-auto rounded-2xl border p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 ${
          isDark ? 'bg-[#18181B] border-[#27272A] text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className={`flex items-center justify-between pb-3 border-b ${
          isDark ? 'border-zinc-800' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <LinkIcon className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold">ربط الاستجابة بقضية مسجلة</h3>
          </div>
          <button 
            type="button"
            onClick={handleSafeClose} 
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Search className={`w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 ${
              isDark ? 'text-zinc-400' : 'text-slate-400'
            }`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث برقم القضية، العنوان، أو اسم الموكل..."
              className={`w-full ps-9 pe-4 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isDark 
                  ? 'bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500' 
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
              }`}
            />
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2 pe-1">
            {filteredCases.map(c => (
              <div
                key={c.id}
                onClick={() => onLinkCase(c)}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                  isDark 
                    ? 'border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 hover:border-indigo-500' 
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-indigo-400'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-indigo-500">{c.caseNumber}</span>
                    <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{c.title}</span>
                  </div>
                  <div className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                    الموكل: {c.client?.name || 'غير محدد'}
                  </div>
                </div>
                <button className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors">
                  اختيار
                </button>
              </div>
            ))}

            {filteredCases.length === 0 && (
              <div className={`text-center py-6 text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                لا توجد قضايا مطابقة للبحث
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
