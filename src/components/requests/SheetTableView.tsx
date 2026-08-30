import React from 'react';
import { 
  ArrowUpDown, 
  CheckCircle2, 
  User, 
  CheckSquare, 
  Clock, 
  Phone, 
  Mail, 
  Eye, 
  FolderPlus, 
  Link as LinkIcon, 
  Paperclip, 
  Copy, 
  Check,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useTheme } from '../../lib/theme';
import { 
  SavedPublicSheet, 
  SheetRowItem, 
  SheetColumn, 
  analyzeCellValue 
} from '../../lib/googleSheetsReader';

interface SheetTableViewProps {
  currentSheet: SavedPublicSheet;
  filteredRows: SheetRowItem[];
  paginatedRows: SheetRowItem[];
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  onSort: (colId: string) => void;
  getRowDetails: (row: SheetRowItem, sheet: SavedPublicSheet | null) => any;
  onPreviewFile: (file: { url: string; title: string }) => void;
  onInspectRow: (row: SheetRowItem) => void;
  onLinkToCase: (row: SheetRowItem) => void;
  onCreateCase: (row: SheetRowItem) => void;
  isConvertingAction: boolean;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
}

export const SheetTableView: React.FC<SheetTableViewProps> = ({
  currentSheet,
  filteredRows,
  paginatedRows,
  currentPage,
  totalPages,
  itemsPerPage,
  setCurrentPage,
  sortColumn,
  sortDirection,
  onSort,
  getRowDetails,
  onPreviewFile,
  onInspectRow,
  onLinkToCase,
  onCreateCase,
  isConvertingAction,
  copiedId,
  onCopy
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${
      isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-slate-200 shadow-xs'
    }`}>
      <div className="overflow-x-auto">
        <table className="w-full text-start text-xs">
          <thead className={`border-b font-bold ${
            isDark ? 'bg-zinc-900/90 border-[#27272A] text-zinc-400' : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            <tr>
              <th className="p-3 text-start w-12">#</th>
              <th className="p-3 text-start">حالة المنظومة والربط</th>
              {currentSheet.columns.slice(0, 7).map(col => (
                <th 
                  key={col.id}
                  onClick={() => onSort(col.id)}
                  className="p-3 text-start cursor-pointer hover:text-indigo-500 transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>{col.label}</span>
                    <ArrowUpDown className={`w-3 h-3 ${sortColumn === col.id ? 'text-indigo-500 opacity-100' : 'opacity-40'}`} />
                  </div>
                </th>
              ))}
              <th className="p-3 text-center">المرفقات والروابط</th>
              <th className="p-3 text-center">الإجراءات والتحويل</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDark ? 'divide-zinc-800/40' : 'divide-slate-100'}`}>
            {paginatedRows.map((row, rIdx) => {
              const rowNum = (currentPage - 1) * itemsPerPage + rIdx + 1;
              const rowInfo = getRowDetails(row, currentSheet);

              return (
                <tr
                  key={row._rowId || rIdx}
                  onClick={() => onInspectRow(row)}
                  title="انقر على هذا الصف لعرض تفاصيل ومعلومات القضية كاملة فوراً"
                  className={`transition-all cursor-pointer group select-none ${
                    isDark 
                      ? 'hover:bg-zinc-800/70 active:bg-zinc-800' 
                      : 'hover:bg-indigo-50/70 active:bg-indigo-100/50'
                  } ${row._linkedCaseId ? (isDark ? 'bg-emerald-950/15' : 'bg-emerald-50/40') : ''}`}
                >
                  {/* Row Number */}
                  <td className={`p-3 font-mono text-[11px] ${isDark ? 'text-zinc-500 group-hover:text-indigo-400' : 'text-slate-400 group-hover:text-indigo-600'}`}>
                    {rowNum}
                  </td>

                  {/* System Status Badges */}
                  <td className="p-3 whitespace-nowrap">
                    {row._linkedCaseNumber ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-md shadow-xs">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>قضية {row._linkedCaseNumber}</span>
                      </span>
                    ) : row._linkedClientName ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20 px-2 py-0.5 rounded-md">
                        <User className="w-3 h-3" />
                        <span>عميل مسجل</span>
                      </span>
                    ) : row._linkedTaskTitle ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-md">
                        <CheckSquare className="w-3 h-3" />
                        <span>مهمة معينة</span>
                      </span>
                    ) : (
                      <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md ${
                        isDark ? 'bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                      }`}>
                        <Clock className="w-3 h-3" />
                        <span>استجابة واردة</span>
                      </span>
                    )}
                  </td>

                  {/* Columns Data */}
                  {currentSheet.columns.slice(0, 7).map(col => {
                    const val = row[col.id] ?? '';
                    const strVal = String(val);
                    const analyzed = analyzeCellValue(strVal);

                    return (
                      <td 
                        key={col.id} 
                        className={`p-3 max-w-[220px] truncate ${isDark ? 'text-zinc-300' : 'text-slate-800'}`}
                      >
                        {analyzed.isPhone ? (
                          <a
                            href={`tel:${strVal}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-indigo-500 hover:underline inline-flex items-center gap-1 font-mono font-medium"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{strVal}</span>
                          </a>
                        ) : analyzed.isEmail ? (
                          <a
                            href={`mailto:${strVal}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-indigo-500 hover:underline inline-flex items-center gap-1"
                          >
                            <Mail className="w-3 h-3" />
                            <span className="truncate">{strVal}</span>
                          </a>
                        ) : analyzed.isDrive ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onPreviewFile({ url: strVal, title: col.label });
                            }}
                            className="text-emerald-500 hover:underline inline-flex items-center gap-1 cursor-pointer font-bold"
                          >
                            <Eye className="w-3 h-3" />
                            <span>معاينة المستند</span>
                          </button>
                        ) : (
                          <span title={strVal}>{strVal || '—'}</span>
                        )}
                      </td>
                    );
                  })}

                  {/* Attachments & URLs */}
                  <td className="p-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {rowInfo.fileLinks.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPreviewFile({ url: rowInfo.fileLinks[0], title: 'مرفق النموذج' });
                          }}
                          className="p-1 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 text-xs inline-flex items-center gap-1 px-2 cursor-pointer font-bold transition-colors"
                          title="معاينة المستند المرفق من Drive"
                        >
                          <Eye className="w-3 h-3" />
                          <span>{rowInfo.fileLinks.length} ملف</span>
                        </button>
                      )}

                      {rowInfo.allUrls.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCopy(rowInfo.allUrls[0], `url_${rIdx}`);
                          }}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isDark ? 'bg-zinc-800 text-zinc-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                          }`}
                          title="نسخ الرابط"
                        >
                          {copiedId === `url_${rIdx}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Row Quick Actions */}
                  <td className="p-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      
                      {/* Convert to Case */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCreateCase(row);
                        }}
                        disabled={isConvertingAction}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs inline-flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                        title="تحويل هذه الاستجابة إلى ملف قضية جديد فوراً"
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                        <span>فتح قضية</span>
                      </button>

                      {/* Link to Existing Case */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onLinkToCase(row);
                        }}
                        className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isDark 
                            ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800' 
                            : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                        }`}
                        title="ربط بقضية قائمة في المنظومة"
                      >
                        <LinkIcon className="w-3.5 h-3.5 text-indigo-500" />
                      </button>

                      {/* Inspect Row Details */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onInspectRow(row);
                        }}
                        className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isDark 
                            ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800' 
                            : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                        }`}
                        title="معاينة تفاصيل الاستجابة ومعلومات القضية"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                    </div>
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
        isDark ? 'bg-zinc-900/50 border-[#27272A] text-zinc-400' : 'bg-slate-50 border-slate-200 text-slate-600'
      }`}>
        <div>
          عرض {(currentPage - 1) * itemsPerPage + 1} إلى {Math.min(currentPage * itemsPerPage, filteredRows.length)} من إجمالي {filteredRows.length} صف
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className={`px-3 py-1.5 rounded-lg border disabled:opacity-40 cursor-pointer flex items-center gap-1 transition-colors ${
              isDark ? 'bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700' : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-100'
            }`}
          >
            <ChevronRight className="w-3.5 h-3.5" />
            <span>السابق</span>
          </button>
          
          <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            صفحة {currentPage} من {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className={`px-3 py-1.5 rounded-lg border disabled:opacity-40 cursor-pointer flex items-center gap-1 transition-colors ${
              isDark ? 'bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700' : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-100'
            }`}
          >
            <span>التالي</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
