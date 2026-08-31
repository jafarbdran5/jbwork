import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  X, 
  Plus, 
  Trash2, 
  Edit3, 
  Compass, 
  Check, 
  FileSpreadsheet, 
  AlertCircle,
  RefreshCw,
  Eye
} from 'lucide-react';
import { useModalLifecycle } from '../../hooks/useModalLifecycle';
import { useTheme } from '../../lib/theme';
import { 
  SavedPublicSheet, 
  SheetWorksheetTab, 
  discoverSpreadsheetMetadata, 
  savePublicSheet 
} from '../../lib/googleSheetsReader';

interface ManageSheetTabsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheet: SavedPublicSheet | null;
  onSheetUpdated?: (updatedSheet: SavedPublicSheet) => void;
  onSave?: (updatedSheet: SavedPublicSheet) => void;
  onSelectTab?: (sheetId: string, tab: SheetWorksheetTab) => void;
  onSwitchTab?: (tab: SheetWorksheetTab) => void;
}

export const ManageSheetTabsModal: React.FC<ManageSheetTabsModalProps> = ({
  isOpen,
  onClose,
  sheet,
  onSheetUpdated,
  onSave,
  onSelectTab,
  onSwitchTab
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [tabs, setTabs] = useState<SheetWorksheetTab[]>([]);
  const [newTabName, setNewTabName] = useState('');
  const [newTabGid, setNewTabGid] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editGid, setEditGid] = useState('');
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const { handleSafeClose, handleBackdropClick } = useModalLifecycle({
    isOpen,
    onClose,
    id: 'manage-sheet-tabs-modal',
    isSubmitting: isDiscovering,
  });

  useEffect(() => {
    if (sheet && isOpen) {
      const initialTabs = (sheet.tabs && sheet.tabs.length > 0)
        ? [...sheet.tabs]
        : [{ gid: sheet.gid || '0', name: sheet.activeTabName || 'استجابات النموذج 1', isDefault: true }];
      setTabs(initialTabs);
      setEditingIndex(null);
      setStatusNotice(null);
    }
  }, [sheet, isOpen]);

  if (!isOpen || !sheet) return null;

  const persistTabs = (newTabs: SheetWorksheetTab[], noticeText?: string) => {
    setTabs(newTabs);
    const updatedSheet: SavedPublicSheet = {
      ...sheet,
      tabs: newTabs
    };
    savePublicSheet(updatedSheet);
    if (onSheetUpdated) onSheetUpdated(updatedSheet);
    if (onSave) onSave(updatedSheet);
    if (noticeText) {
      setStatusNotice(noticeText);
      setTimeout(() => setStatusNotice(null), 3000);
    }
  };

  const handleAddTab = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTabName.trim()) return;

    const gidToAdd = newTabGid.trim() || String(Date.now()).slice(-6);
    if (tabs.some(t => t.gid === gidToAdd)) {
      alert('يوجد بالفعل ورقة عمل بنفس معرف GID!');
      return;
    }

    const newTab: SheetWorksheetTab = {
      gid: gidToAdd,
      name: newTabName.trim(),
      isDefault: tabs.length === 0,
      rowCount: 0
    };

    const updated = [...tabs, newTab];
    persistTabs(updated, `✓ تمت إضافة ورقة العمل "${newTab.name}" بنجاح!`);
    setNewTabName('');
    setNewTabGid('');
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditName(tabs[index].name);
    setEditGid(tabs[index].gid);
  };

  const handleSaveEdit = (index: number) => {
    if (!editName.trim()) return;
    const updated = [...tabs];
    updated[index] = {
      ...updated[index],
      name: editName.trim(),
      gid: editGid.trim() || '0'
    };
    setEditingIndex(null);
    persistTabs(updated, '✓ تم تحديث بيانات ورقة العمل.');
  };

  const handleDeleteTab = (index: number) => {
    if (tabs.length <= 1) {
      alert('يجب أن يحتوي الجدول على ورقة عمل واحدة على الأقل.');
      return;
    }
    const tabName = tabs[index].name;
    const updated = tabs.filter((_, i) => i !== index);
    persistTabs(updated, `✓ تم حذف ورقة "${tabName}".`);
  };

  const handleDiscoverTabs = async () => {
    if (!sheet.url && !sheet.sheetId) return;
    setIsDiscovering(true);
    setStatusNotice('جاري فحص واكتشاف كافة أوراق العمل...');

    try {
      const meta = await discoverSpreadsheetMetadata(sheet.url || sheet.sheetId);
      if (meta.tabs && meta.tabs.length > 0) {
        const existingGids = new Set(tabs.map(t => t.gid));
        const combined = [...tabs];
        let addedCount = 0;

        meta.tabs.forEach(t => {
          if (!existingGids.has(t.gid)) {
            combined.push(t);
            addedCount++;
          }
        });

        if (addedCount > 0) {
          persistTabs(combined, `✓ تم اكتشاف وإضافة ${addedCount} ورقة عمل جديدة بنجاح!`);
        } else {
          setStatusNotice('كافة أوراق العمل الموجودة مسجلة ومضافة بالفعل.');
        }
      } else {
        setStatusNotice('لم يتم العثور على أوراق عمل إضافية عامة في هذا الرابط.');
      }
    } catch (e: any) {
      setStatusNotice(`✕ تعذر الفحص: ${e.message || e}`);
    } finally {
      setIsDiscovering(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div 
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all ${
          isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${
          isDark ? 'border-zinc-800 bg-zinc-900/80' : 'border-slate-100 bg-slate-50'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shadow-xs shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>إدارة أوراق العمل (Tabs)</span>
                <span className="text-xs font-normal text-slate-400">({sheet.title})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                إضافة، تعديل، حذف، واكتشاف أوراق العمل المتعددة داخل نفس الملف
              </p>
            </div>
          </div>
          <button
            onClick={handleSafeClose}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-200 text-slate-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice Banner */}
        {statusNotice && (
          <div className="px-5 py-2.5 bg-indigo-500/10 border-b border-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-between">
            <span>{statusNotice}</span>
          </div>
        )}

        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Action Toolbar */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              الأوراق المسجلة ({tabs.length} ورقة عمل):
            </span>

            {sheet.url && (
              <button
                onClick={handleDiscoverTabs}
                disabled={isDiscovering}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                  isDark 
                    ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-emerald-400' 
                    : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700'
                }`}
              >
                <Compass className={`w-3.5 h-3.5 ${isDiscovering ? 'animate-spin' : ''}`} />
                <span>اكتشاف أوراق العمل تلقائياً</span>
              </button>
            )}
          </div>

          {/* Tabs List */}
          <div className="space-y-2">
            {tabs.map((tab, idx) => {
              const isCurrentActive = (sheet.gid || '0') === tab.gid;
              const isEditing = editingIndex === idx;

              return (
                <div
                  key={tab.gid || idx}
                  className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isCurrentActive
                      ? 'border-indigo-500/50 bg-indigo-500/5 dark:bg-indigo-950/20'
                      : isDark ? 'border-zinc-800 bg-zinc-950' : 'border-slate-200 bg-slate-50/70'
                  }`}
                >
                  {isEditing ? (
                    <div className="flex-1 flex flex-col sm:flex-row items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        placeholder="اسم ورقة العمل"
                        className={`flex-1 px-3 py-1.5 rounded-lg border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
                          isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-300'
                        }`}
                      />
                      <input
                        type="text"
                        value={editGid}
                        onChange={e => setEditGid(e.target.value)}
                        placeholder="GID (مثال: 0)"
                        className={`w-28 px-3 py-1.5 rounded-lg border text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
                          isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-300'
                        }`}
                      />
                      <button
                        onClick={() => handleSaveEdit(idx)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>حفظ</span>
                      </button>
                      <button
                        onClick={() => setEditingIndex(null)}
                        className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                        إلغاء
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 min-w-0">
                      <FileSpreadsheet className={`w-5 h-5 shrink-0 ${isCurrentActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold truncate">{tab.name}</span>
                          {isCurrentActive && (
                            <span className="text-[10px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full font-bold">
                              الورقة النشطة حالياً
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5 flex items-center gap-2">
                          <span>GID: {tab.gid}</span>
                          {tab.rowCount !== undefined && (
                            <span>• {tab.rowCount} صف</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {!isEditing && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          if (onSelectTab) onSelectTab(sheet.id, tab);
                          if (onSwitchTab) onSwitchTab(tab);
                          handleSafeClose();
                        }}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                          isCurrentActive
                            ? 'bg-indigo-600 text-white border-indigo-500'
                            : isDark ? 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                        title="فتح والتبديل إلى هذه الورقة"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{isCurrentActive ? 'معروضة' : 'عرض الورقة'}</span>
                      </button>

                      <button
                        onClick={() => handleStartEdit(idx)}
                        className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                          isDark ? 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                        }`}
                        title="تعديل اسم أو GID ورقة العمل"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteTab(idx)}
                        disabled={tabs.length <= 1}
                        className="p-1.5 rounded-lg border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 text-xs transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        title="حذف ورقة العمل"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add New Tab Form */}
          <form onSubmit={handleAddTab} className={`p-4 rounded-xl border space-y-3 ${
            isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-indigo-400" />
              <span>إضافة ورقة عمل جديدة يدوياً</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  required
                  value={newTabName}
                  onChange={e => setNewTabName(e.target.value)}
                  placeholder="اسم ورقة العمل (مثال: بلاغات تليجرام 2026)"
                  className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
                    isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-300'
                  }`}
                />
              </div>

              <div>
                <input
                  type="text"
                  value={newTabGid}
                  onChange={e => setNewTabGid(e.target.value)}
                  placeholder="GID (افتراضي: تلقائي)"
                  className={`w-full px-3 py-2 rounded-lg border text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
                    isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-300'
                  }`}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة الورقة للجدول</span>
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className={`p-4 border-t flex items-center justify-end ${
          isDark ? 'border-zinc-800' : 'border-slate-100'
        }`}>
          <button
            onClick={handleSafeClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs cursor-pointer transition-all"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
