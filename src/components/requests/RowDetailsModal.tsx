import React from 'react';
import { 
  FileSearch, 
  X, 
  UserPlus, 
  CheckSquare, 
  FolderPlus, 
  Phone, 
  Mail, 
  Paperclip, 
  ExternalLink 
} from 'lucide-react';
import { useTheme } from '../../lib/theme';
import { SavedPublicSheet, SheetRowItem, analyzeCellValue } from '../../lib/googleSheetsReader';

interface RowDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  row: SheetRowItem | null;
  sheet: SavedPublicSheet | null;
  onCreateClient: (row: SheetRowItem) => void;
  onCreateTask: (row: SheetRowItem) => void;
  onCreateCase: (row: SheetRowItem) => void;
}

export const RowDetailsModal: React.FC<RowDetailsModalProps> = ({
  isOpen,
  onClose,
  row,
  sheet,
  onCreateClient,
  onCreateTask,
  onCreateCase
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!isOpen || !row) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`w-full max-w-2xl max-h-[85vh] rounded-2xl border p-6 shadow-2xl space-y-4 overflow-y-auto ${
        isDark ? 'bg-[#18181B] border-[#27272A] text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between pb-3 border-b ${
          isDark ? 'border-zinc-800' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <FileSearch className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">تفاصيل الاستجابة الكاملة</h3>
              <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>معاينة كافة الحقول وتطبيق إجراءات فورية</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sheet?.columns.map(col => {
              const val = row[col.id] ?? '';
              if (!val) return null;
              const strVal = String(val);
              const analyzed = analyzeCellValue(strVal);

              return (
                <div 
                  key={col.id} 
                  className={`p-3 rounded-xl border space-y-1 ${
                    isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className={`text-[11px] font-bold ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                    {col.label}
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
                      <a href={strVal} target="_blank" rel="noreferrer" className="text-emerald-500 hover:underline flex items-center gap-1 font-bold">
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>فتح المستند في Google Drive</span>
                      </a>
                    ) : (
                      strVal
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
                onClick={() => onCreateClient(row)}
                className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <UserPlus className="w-4 h-4 text-blue-500" />
                <span>إضافة كموكل</span>
              </button>
              <button
                onClick={() => onCreateTask(row)}
                className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <CheckSquare className="w-4 h-4 text-amber-500" />
                <span>إنشاء مهمة</span>
              </button>
            </div>

            <button
              onClick={() => onCreateCase(row)}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
            >
              <FolderPlus className="w-4 h-4" />
              <span>فتح ملف قضية فوري</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
