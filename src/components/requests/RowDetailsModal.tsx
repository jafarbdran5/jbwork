import React, { useState } from 'react';
import { 
  FileSearch, 
  X, 
  UserPlus, 
  CheckSquare, 
  FolderPlus, 
  Phone, 
  Mail, 
  Paperclip, 
  ExternalLink,
  Briefcase,
  CheckCircle2,
  Copy,
  Check,
  Link as LinkIcon,
  HardDrive,
  Eye
} from 'lucide-react';
import { useTheme } from '../../lib/theme';
import { useModalLifecycle } from '../../hooks/useModalLifecycle';
import { SavedPublicSheet, SheetRowItem, analyzeCellValue } from '../../lib/googleSheetsReader';

interface RowDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  row: SheetRowItem | null;
  sheet: SavedPublicSheet | null;
  onCreateClient: (row: SheetRowItem) => void;
  onCreateTask: (row: SheetRowItem) => void;
  onCreateCase: (row: SheetRowItem) => void;
  onSelectCase?: (caseId: string) => void;
  onLinkCase?: (row: SheetRowItem) => void;
  onPreviewFile?: (file: { url: string; title: string }) => void;
}

export const RowDetailsModal: React.FC<RowDetailsModalProps> = ({
  isOpen,
  onClose,
  row,
  sheet,
  onCreateClient,
  onCreateTask,
  onCreateCase,
  onSelectCase,
  onLinkCase,
  onPreviewFile
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const { handleSafeClose, handleBackdropClick } = useModalLifecycle({
    isOpen: isOpen && Boolean(row),
    onClose,
    id: 'row-details-modal',
  });

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!isOpen || !row) return null;

  const isLinkedToCase = Boolean(row._linkedCaseId || row._linkedCaseNumber);

  return (
    <div 
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-2xl max-h-[88vh] my-auto rounded-2xl border p-5 sm:p-6 shadow-2xl space-y-4 overflow-y-auto animate-in fade-in zoom-in-95 duration-150 ${
          isDark ? 'bg-[#18181B] border-[#27272A] text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        
        {/* Header */}
        <div className={`flex items-center justify-between pb-3 border-b ${
          isDark ? 'border-zinc-800' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <FileSearch className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">تفاصيل الاستجابة ومعلومات القضية</h3>
                {row._rowIndex && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                    صف #{row._rowIndex}
                  </span>
                )}
              </div>
              <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                {sheet?.title || 'معاينة كافة حقول الاستجابة والبيانات المستلمة'}
              </p>
            </div>
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

        {/* 🌟 Highlighted Case Status Banner 🌟 */}
        {isLinkedToCase ? (
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            isDark ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    هذا الصف مرتبط بقضية في المنظومة:
                  </span>
                  <span className="font-mono font-bold text-xs bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 px-2 py-0.5 rounded">
                    {row._linkedCaseNumber || 'قضية مسجلة'}
                  </span>
                </div>
                {row._linkedClientName && (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    اسم الموكل: <span className="font-semibold text-zinc-700 dark:text-zinc-200">{row._linkedClientName}</span>
                  </p>
                )}
              </div>
            </div>

            {row._linkedCaseId && onSelectCase && (
              <button
                type="button"
                onClick={() => {
                  handleSafeClose();
                  onSelectCase(row._linkedCaseId!);
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98 transition-all"
              >
                <Briefcase className="w-4 h-4" />
                <span>فتح ملف القضية</span>
              </button>
            )}
          </div>
        ) : (
          <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
            isDark ? 'bg-indigo-950/15 border-indigo-500/20' : 'bg-indigo-50/70 border-indigo-100'
          }`}>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              <span className={isDark ? 'text-indigo-300' : 'text-indigo-900 font-medium'}>
                استجابة نموذج واردة — يمكنك تحويلها لقضية جديدة أو ربطها بقضية قائمة بضغطة زر
              </span>
            </div>
            {onLinkCase && (
              <button
                type="button"
                onClick={() => {
                  handleSafeClose();
                  onLinkCase(row);
                }}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>ربط بقضية</span>
              </button>
            )}
          </div>
        )}

        {/* Content Fields */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sheet?.columns.map(col => {
              const val = row[col.id] ?? row[col.label] ?? '';
              if (!val && val !== 0) return null;
              const strVal = String(val);
              const analyzed = analyzeCellValue(strVal);

              return (
                <div 
                  key={col.id} 
                  className={`p-3 rounded-xl border space-y-1.5 transition-colors ${
                    isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className={`flex items-center justify-between text-[11px] font-bold ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                    <span>{col.label}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(strVal, col.id)}
                      className="text-zinc-400 hover:text-zinc-200 p-0.5 rounded cursor-pointer"
                      title="نسخ القيمة"
                    >
                      {copiedKey === col.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  
                  <div className={`text-xs break-words font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {analyzed.isPhone ? (
                      <a href={`tel:${strVal}`} className="text-indigo-500 hover:underline flex items-center gap-1 font-mono">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{strVal}</span>
                      </a>
                    ) : analyzed.isEmail ? (
                      <a href={`mailto:${strVal}`} className="text-indigo-500 hover:underline flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{strVal}</span>
                      </a>
                    ) : analyzed.isDrive ? (
                      <div className="flex items-center gap-2 pt-1">
                        {onPreviewFile ? (
                          <button
                            type="button"
                            onClick={() => onPreviewFile({ url: strVal, title: col.label })}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>معاينة المستند</span>
                          </button>
                        ) : null}
                        <a href={strVal} target="_blank" rel="noreferrer" className="text-emerald-500 hover:underline flex items-center gap-1 text-xs">
                          <ExternalLink className="w-3 h-3" />
                          <span>فتح في Drive</span>
                        </a>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{strVal}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className={`pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 ${
            isDark ? 'border-zinc-800' : 'border-slate-200'
          }`}>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  handleSafeClose();
                  onCreateClient(row);
                }}
                className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <UserPlus className="w-4 h-4 text-blue-500" />
                <span>إضافة كموكل</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleSafeClose();
                  onCreateTask(row);
                }}
                className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <CheckSquare className="w-4 h-4 text-amber-500" />
                <span>إنشاء مهمة</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                handleSafeClose();
                onCreateCase(row);
              }}
              className="w-full sm:w-auto px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-98 transition-all"
            >
              <FolderPlus className="w-4 h-4" />
              <span>فتح ملف قضية فوري من هذه البيانات</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
