import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  X, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Sparkles,
  ClipboardList
} from 'lucide-react';
import { useTheme } from '../../lib/theme';
import { 
  extractSheetInfo, 
  discoverSpreadsheetMetadata, 
  fetchPublicGoogleSheet,
  parseRawTableText,
  SheetWorksheetTab,
  SheetColumn,
  SavedPublicSheet
} from '../../lib/googleSheetsReader';

interface AddSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSheet: (sheet: SavedPublicSheet) => void;
}

export const AddSheetModal: React.FC<AddSheetModalProps> = ({
  isOpen,
  onClose,
  onSaveSheet
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [importMode, setImportMode] = useState<'url' | 'paste'>('url');
  const [formUrl, setFormUrl] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('استقبال طلبات وبلاغات');
  const [formTargetModule, setFormTargetModule] = useState<'cases' | 'clients' | 'financials' | 'consultations' | 'requests' | 'general'>('cases');
  const [formGid, setFormGid] = useState('0');
  const [pastedData, setPastedData] = useState('');
  const [isTestingUrl, setIsTestingUrl] = useState(false);
  const [discoveredTabs, setDiscoveredTabs] = useState<SheetWorksheetTab[]>([]);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    rowCount?: number;
    columns?: SheetColumn[];
  } | null>(null);

  if (!isOpen) return null;

  const handleTestUrl = async () => {
    if (!formUrl.trim()) return;
    setIsTestingUrl(true);
    setTestResult(null);

    try {
      const meta = await discoverSpreadsheetMetadata(formUrl);
      const res = await fetchPublicGoogleSheet(formUrl, formGid);

      const tabs = meta.tabs && meta.tabs.length > 0 ? meta.tabs : [];
      setDiscoveredTabs(tabs);

      setTestResult({
        success: true,
        message: `✓ تم التحقق بنجاح! تم استخراج ${res.totalRows} صف و ${res.columns.length} أعمدة، والتعرف على ${tabs.length || 1} أوراق عمل.`,
        rowCount: res.totalRows,
        columns: res.columns
      });

      if (!formTitle.trim() && meta.title) {
        setFormTitle(meta.title);
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: `✕ تعذر الاتصال: ${e.message || e}`
      });
    } finally {
      setIsTestingUrl(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (importMode === 'paste') {
      if (!pastedData.trim()) return;
      const parsed = parseRawTableText(pastedData);
      if (parsed.rows.length === 0) {
        alert('تعذر استخراج بيانات من النص الملصق. يرجى التأكد من نسخه كجدول أو CSV.');
        return;
      }

      const newSheet: SavedPublicSheet = {
        id: `sheet_pasted_${Date.now()}`,
        title: formTitle.trim() || 'جدول ملصق يدوياً',
        description: formDescription.trim(),
        url: '',
        sheetId: '',
        category: formCategory,
        targetModule: formTargetModule,
        createdAt: new Date().toISOString(),
        lastSyncedAt: new Date().toISOString(),
        syncStatus: 'success',
        columns: parsed.columns,
        rows: parsed.rows,
        totalRows: parsed.totalRows,
        tabs: [{ gid: '0', name: 'البيانات الملصقة', isDefault: true }]
      };

      onSaveSheet(newSheet);
      onClose();
      return;
    }

    if (!formUrl.trim()) return;
    const info = extractSheetInfo(formUrl);
    if (!info.sheetId) {
      alert('يرجى إدخال رابط Google Sheet صالح أو معرف الملف.');
      return;
    }

    const newSheet: SavedPublicSheet = {
      id: `sheet_${info.sheetId}_${Date.now()}`,
      title: formTitle.trim() || 'استجابات Google Sheet',
      description: formDescription.trim(),
      url: info.cleanUrl,
      sheetId: info.sheetId,
      gid: formGid || info.gid || '0',
      category: formCategory,
      targetModule: formTargetModule,
      createdAt: new Date().toISOString(),
      syncStatus: 'idle',
      columns: testResult?.columns || [],
      rows: [],
      totalRows: testResult?.rowCount || 0,
      tabs: discoveredTabs.length > 0 ? discoveredTabs : [{ gid: formGid || '0', name: 'استجابات النموذج 1', isDefault: true }]
    };

    onSaveSheet(newSheet);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`w-full max-w-xl rounded-2xl border p-6 shadow-2xl space-y-5 animate-fade-in ${
        isDark ? 'bg-[#18181B] border-[#27272A] text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Modal Header */}
        <div className={`flex items-center justify-between pb-3 border-b ${
          isDark ? 'border-zinc-800' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">ربط Google Sheet أو استجابات النماذج</h3>
              <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>قراءة مباشرة وفورية مع اكتشاف تلقائي للأوراق</p>
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

        {/* Mode Switcher */}
        <div className={`grid grid-cols-2 gap-2 p-1 border rounded-xl ${
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            type="button"
            onClick={() => setImportMode('url')}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              importMode === 'url' 
                ? 'bg-indigo-600 text-white shadow-xs' 
                : isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>رابط Google Sheets مباشر</span>
          </button>
          <button
            type="button"
            onClick={() => setImportMode('paste')}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              importMode === 'paste' 
                ? 'bg-indigo-600 text-white shadow-xs' 
                : isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>لصق بيانات جدول (CSV / Excel)</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {importMode === 'url' ? (
            <>
              <div className="space-y-1.5">
                <label className={`text-xs font-bold ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                  رابط Google Sheet (أو معرف الجدول)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formUrl}
                    onChange={(e) => {
                      setFormUrl(e.target.value);
                      setTestResult(null);
                    }}
                    placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                    className={`flex-1 rounded-xl px-3 py-2 text-xs font-mono border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isDark 
                        ? 'bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={handleTestUrl}
                    disabled={isTestingUrl || !formUrl.trim()}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingUrl ? 'animate-spin' : ''}`} />
                    <span>فحص واكتشاف</span>
                  </button>
                </div>
                <p className={`text-[11px] ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                  تأكد من مشاركة الجدول كـ "عام لمن يملك الرابط" (Anyone with link can view).
                </p>
              </div>

              {testResult && (
                <div className={`p-3 rounded-xl border text-xs font-medium flex items-start gap-2 ${
                  testResult.success 
                    ? isDark ? 'bg-emerald-950/30 border-emerald-800 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : isDark ? 'bg-rose-950/30 border-rose-800 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />}
                  <div>{testResult.message}</div>
                </div>
              )}

              {discoveredTabs.length > 0 && (
                <div className={`p-3 rounded-xl border space-y-2 ${
                  isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-500">
                    <Layers className="w-3.5 h-3.5" />
                    <span>أوراق العمل المكتشفة تلقائياً ({discoveredTabs.length}):</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {discoveredTabs.map(tab => (
                      <span 
                        key={tab.gid} 
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg border ${
                          isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-200' : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        {tab.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className={`text-xs font-bold ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                    عنوان وتسمية الجدول
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="مثال: استجابات استمارة البلاغات"
                    className={`w-full rounded-xl px-3 py-2 text-xs border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isDark 
                        ? 'bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                    }`}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={`text-xs font-bold ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                    رقم الورقة الافتراضي (GID)
                  </label>
                  <input
                    type="text"
                    value={formGid}
                    onChange={(e) => setFormGid(e.target.value)}
                    placeholder="0"
                    className={`w-full rounded-xl px-3 py-2 text-xs font-mono border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isDark 
                        ? 'bg-zinc-900 border-zinc-800 text-white' 
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>
              <div className="space-y-1.5 pt-1">
                <label className={`text-xs font-bold ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                  ربط هذا الشيت بالوظيفة / القسم المستهدف داخل النظام
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { key: 'cases', label: '📁 قسم القضايا', desc: 'لإنشاء وربط القضايا والملفات' },
                    { key: 'clients', label: '👥 قسم العملاء', desc: 'لاستيراد بيانات الموكلين' },
                    { key: 'financials', label: '💰 قسم المالية', desc: 'للدفعات والحسابات' },
                    { key: 'consultations', label: '⚖️ الاستشارات', desc: 'لاستقبال طلبات الرأي القانوني' },
                    { key: 'requests', label: '📥 الطلبات الخارجية', desc: 'لبلاغات النماذج العامة' },
                    { key: 'general', label: '📊 جدول عام', desc: 'للمعاينة والأرشفة' },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setFormTargetModule(item.key as any)}
                      className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                        formTargetModule === item.key
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 font-bold ring-1 ring-indigo-500/50'
                          : isDark
                            ? 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-xs font-bold mb-0.5">{item.label}</div>
                      <div className="text-[10px] opacity-75 truncate">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className={`text-xs font-bold ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                  عنوان وتسمية الجدول
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="مثال: بيانات طلبات واردة من إكسل"
                  className={`w-full rounded-xl px-3 py-2 text-xs border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark 
                      ? 'bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                  }`}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className={`text-xs font-bold ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                  الصق محتوى الجدول (CSV أو منسوخ من Excel/Sheets)
                </label>
                <textarea
                  rows={5}
                  value={pastedData}
                  onChange={(e) => setPastedData(e.target.value)}
                  placeholder="الاسم	الهاتف	النوع	التفاصيل..."
                  className={`w-full rounded-xl p-3 text-xs font-mono border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark 
                      ? 'bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                  }`}
                  required
                />
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className={`flex items-center justify-end gap-3 pt-3 border-t ${
            isDark ? 'border-zinc-800' : 'border-slate-200'
          }`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
            >
              حفظ والبدء بالقراءة
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
