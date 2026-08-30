import React from 'react';
import { 
  Phone, 
  Mail, 
  Paperclip, 
  FolderPlus, 
  Link as LinkIcon, 
  Eye, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';
import { useTheme } from '../../lib/theme';
import { SavedPublicSheet, SheetRowItem } from '../../lib/googleSheetsReader';

interface SheetCardsViewProps {
  currentSheet: SavedPublicSheet;
  paginatedRows: SheetRowItem[];
  currentPage: number;
  itemsPerPage: number;
  getRowDetails: (row: SheetRowItem, sheet: SavedPublicSheet | null) => any;
  onInspectRow: (row: SheetRowItem) => void;
  onLinkToCase: (row: SheetRowItem) => void;
  onCreateCase: (row: SheetRowItem) => void;
}

export const SheetCardsView: React.FC<SheetCardsViewProps> = ({
  currentSheet,
  paginatedRows,
  currentPage,
  itemsPerPage,
  getRowDetails,
  onInspectRow,
  onLinkToCase,
  onCreateCase
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {paginatedRows.map((row, rIdx) => {
        const rowInfo = getRowDetails(row, currentSheet);
        return (
          <div
            key={row._rowId || rIdx}
            onClick={() => onInspectRow(row)}
            className={`p-5 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
              isDark 
                ? 'bg-[#18181B] border-[#27272A] hover:border-indigo-500/50 hover:bg-zinc-800/40' 
                : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 shadow-xs'
            } ${row._linkedCaseId ? 'ring-1 ring-emerald-500/40' : ''}`}
            title="انقر لعرض تفاصيل الاستجابة ومعلومات القضية كاملة"
          >
            <div className="space-y-3">
              {/* Card Top Badges */}
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-mono ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                  #{(currentPage - 1) * itemsPerPage + rIdx + 1}
                </span>
                {row._linkedCaseNumber ? (
                  <span className="text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>قضية {row._linkedCaseNumber}</span>
                  </span>
                ) : (
                  <span className={`text-[11px] px-2 py-0.5 rounded-md flex items-center gap-1 ${
                    isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Clock className="w-3 h-3" />
                    <span>استجابة واردة</span>
                  </span>
                )}
              </div>

              {/* Client Name / Header */}
              <div className={`font-bold text-base line-clamp-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {rowInfo.clientName || 'استجابة بدون اسم محدد'}
              </div>

              {/* Contact Info */}
              <div className="space-y-1 text-xs">
                {rowInfo.phone && (
                  <div className="flex items-center gap-2 text-indigo-500 font-mono font-medium">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span>{rowInfo.phone}</span>
                  </div>
                )}
                {rowInfo.email && (
                  <div className={`flex items-center gap-2 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{rowInfo.email}</span>
                  </div>
                )}
              </div>

              {/* Notes / Description Summary */}
              <p className={`text-xs line-clamp-3 leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                {rowInfo.notesSummary || 'لا توجد تفاصيل إضافية مسجلة'}
              </p>

              {/* Files */}
              {rowInfo.fileLinks.length > 0 && (
                <div className={`pt-2 border-t flex items-center gap-2 ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                  <span className="text-xs text-emerald-500 font-bold flex items-center gap-1">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>{rowInfo.fileLinks.length} ملفات مرفقة (Drive)</span>
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className={`pt-4 mt-4 border-t flex items-center justify-between gap-2 ${
              isDark ? 'border-zinc-800/80' : 'border-slate-100'
            }`} onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onInspectRow(row);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1 ${
                  isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>معاينة</span>
              </button>

              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLinkToCase(row);
                  }}
                  className={`p-1.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                    isDark ? 'border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                  title="ربط بقضية مسجلة"
                >
                  <LinkIcon className="w-4 h-4 text-indigo-500" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateCase(row);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>فتح قضية</span>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
