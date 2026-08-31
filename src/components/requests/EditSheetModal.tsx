import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  X, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Save,
  Link,
  Tag,
  Palette
} from 'lucide-react';
import { useModalLifecycle } from '../../hooks/useModalLifecycle';
import { useTheme } from '../../lib/theme';
import { 
  SavedPublicSheet, 
  extractSheetInfo, 
  fetchPublicGoogleSheet,
  savePublicSheet
} from '../../lib/googleSheetsReader';

interface EditSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheet: SavedPublicSheet | null;
  onSheetUpdated?: (updatedSheet: SavedPublicSheet) => void;
  onSave?: (updatedSheet: SavedPublicSheet) => void;
}

export const EditSheetModal: React.FC<EditSheetModalProps> = ({
  isOpen,
  onClose,
  sheet,
  onSheetUpdated,
  onSave
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [gid, setGid] = useState('0');
  const [category, setCategory] = useState('');
  const [targetModule, setTargetModule] = useState<'cases' | 'clients' | 'financials' | 'consultations' | 'requests' | 'general'>('cases');
  const [color, setColor] = useState('#4F46E5');
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<{ success: boolean; message: string } | null>(null);

  const { handleSafeClose, handleBackdropClick } = useModalLifecycle({
    isOpen,
    onClose,
    id: 'edit-sheet-modal',
    isSubmitting: isTesting,
  });

  useEffect(() => {
    if (sheet && isOpen) {
      setTitle(sheet.title || '');
      setDescription(sheet.description || '');
      setUrl(sheet.url || '');
      setGid(sheet.gid || '0');
      setCategory(sheet.category || 'استقبال طلبات وبلاغات');
      setTargetModule(sheet.targetModule || 'cases');
      setColor(sheet.color || '#4F46E5');
      setTestStatus(null);
    }
  }, [sheet, isOpen]);

  if (!isOpen || !sheet) return null;

  const colorOptions = [
    { label: 'نيلي (افتراضي)', value: '#4F46E5' },
    { label: 'زمردي أخضر', value: '#10B981' },
    { label: 'كهرماني برتقالي', value: '#F59E0B' },
    { label: 'ياقوتي أحمر', value: '#EF4444' },
    { label: 'سماوي بحري', value: '#06B6D4' },
    { label: 'بنفسجي ملكي', value: '#8B5CF6' }
  ];

  const handleTestConnection = async () => {
    if (!url.trim()) return;
    setIsTesting(true);
    setTestStatus(null);

    try {
      const res = await fetchPublicGoogleSheet(url, gid, sheet.activeTabName || 'ورقة العمل');
      setTestStatus({
        success: true,
        message: `✓ تم الاتصال بنجاح! تم العثور على ${res.totalRows} صف و ${res.columns.length} عمود.`
      });
    } catch (e: any) {
      setTestStatus({
        success: false,
        message: `✕ فشل الاتصال: ${e.message || e}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const { sheetId: extractedId } = extractSheetInfo(url);

    const updated: SavedPublicSheet = {
      ...sheet,
      title: title.trim(),
      description: description.trim(),
      url: url.trim(),
      sheetId: extractedId || sheet.sheetId,
      gid: gid.trim() || '0',
      category: category.trim(),
      targetModule,
      color,
      lastSyncedAt: new Date().toISOString()
    };

    savePublicSheet(updated);
    if (onSheetUpdated) onSheetUpdated(updated);
    if (onSave) onSave(updated);
    handleSafeClose();
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
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0"
              style={{ backgroundColor: color }}
            >
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>تعديل إعدادات ورقة Google Sheets</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                تحديث الاسم، الوصف، رابط الملف، وظيفة الربط مع أقسام النظام
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

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              عنوان أو اسم الجدول <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="مثال: استجابات نموذج استقبال القضايا 2026"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${
                isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              وصف توضيحي أو ملاحظات
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="وصف مختصر لمحتوى هذا الشيت..."
              className={`w-full px-3.5 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all resize-none ${
                isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
          </div>

          {/* URL & GID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5 text-indigo-400" />
                <span>رابط Google Sheet العام</span>
              </label>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className={`w-full px-3.5 py-2 rounded-xl border text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${
                  isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>معرف الصفحة (GID)</span>
              </label>
              <input
                type="text"
                value={gid}
                onChange={e => setGid(e.target.value)}
                placeholder="0"
                className={`w-full px-3.5 py-2 rounded-xl border text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${
                  isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>

          {/* Test connection button */}
          {url && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                  isDark 
                    ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-200' 
                    : 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-indigo-400' : ''}`} />
                <span>فحص الاتصال بالرابط</span>
              </button>

              {testStatus && (
                <div className={`text-xs flex items-center gap-1.5 ${
                  testStatus.success ? 'text-emerald-500 font-bold' : 'text-rose-500 font-medium'
                }`}>
                  {testStatus.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{testStatus.message}</span>
                </div>
              )}
            </div>
          )}

          {/* Category & Target Module */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-400" />
                <span>تصنيف / نوع الاستبيان</span>
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer ${
                  isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                <option value="استقبال طلبات وبلاغات">استقبال طلبات وبلاغات</option>
                <option value="استشارات وأمان رقمي">استشارات وأمان رقمي</option>
                <option value="سجل الموكلين">سجل الموكلين</option>
                <option value="حسابات ومخالفات">حسابات ومخالفات</option>
                <option value="بيانات مالية وفواتير">بيانات مالية وفواتير</option>
                <option value="جدول عام">جدول عام</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>القسم المرتبط في النظام</span>
              </label>
              <select
                value={targetModule}
                onChange={e => setTargetModule(e.target.value as any)}
                className={`w-full px-3 py-2 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer ${
                  isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                <option value="cases">📁 قسم القضايا (تحويل مباشر لقضايا)</option>
                <option value="clients">👥 قسم العملاء (تحويل لعملاء وموكلين)</option>
                <option value="financials">💰 قسم المالية (أتعاب ومدفوعات)</option>
                <option value="consultations">⚖️ قسم الاستشارات القانونية والتقنية</option>
                <option value="requests">📥 قسم الطلبات الخارجية</option>
                <option value="general">📊 جدول عام</option>
              </select>
            </div>
          </div>

          {/* Color Tag Selection */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-cyan-400" />
              <span>لون التمييز البصري للشيت</span>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {colorOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setColor(opt.value)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                    color === opt.value
                      ? 'ring-2 ring-indigo-500 border-transparent shadow-xs'
                      : isDark ? 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: opt.value }} />
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className={`pt-4 mt-4 border-t flex items-center justify-end gap-2.5 ${
            isDark ? 'border-zinc-800' : 'border-slate-100'
          }`}>
            <button
              type="button"
              onClick={handleSafeClose}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Save className="w-4 h-4" />
              <span>حفظ التعديلات</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
