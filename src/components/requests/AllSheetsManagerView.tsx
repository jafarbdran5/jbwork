import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Layers, 
  ExternalLink, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  Search, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  Download, 
  LayoutGrid, 
  List, 
  Clock,
  Globe,
  Database
} from 'lucide-react';
import { SavedPublicSheet } from '../../lib/googleSheetsReader';
import { useTheme } from '../../lib/theme';

interface AllSheetsManagerViewProps {
  sheets: SavedPublicSheet[];
  onSelectSheet: (sheetId: string) => void;
  onEditSheet: (sheet: SavedPublicSheet) => void;
  onManageTabs: (sheet: SavedPublicSheet) => void;
  onSyncSheet: (sheet: SavedPublicSheet) => void;
  onDeleteSheet: (sheetId: string) => void;
  onAddNewSheet: () => void;
}

export const AllSheetsManagerView: React.FC<AllSheetsManagerViewProps> = ({
  sheets,
  onSelectSheet,
  onEditSheet,
  onManageTabs,
  onSyncSheet,
  onDeleteSheet,
  onAddNewSheet
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedModule, setSelectedModule] = useState('all');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'table'>('grid');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Categories list
  const categories = useMemo(() => {
    const list = Array.from(new Set(sheets.map(s => s.category).filter(Boolean)));
    return ['all', ...list];
  }, [sheets]);

  // Target modules
  const targetModules = [
    { key: 'all', label: 'جميع الأقسام' },
    { key: 'cases', label: '📁 قسم القضايا' },
    { key: 'clients', label: '👥 قسم العملاء' },
    { key: 'financials', label: '💰 قسم المالية' },
    { key: 'consultations', label: '⚖️ قسم الاستشارات' },
    { key: 'requests', label: '📥 الطلبات الخارجية' },
    { key: 'general', label: '📊 جداول عامة' }
  ];

  // Filtered Sheets
  const filteredSheets = useMemo(() => {
    return sheets.filter(s => {
      // Category filter
      if (selectedCategory !== 'all' && s.category !== selectedCategory) {
        return false;
      }
      // Module filter
      if (selectedModule !== 'all' && (s.targetModule || 'cases') !== selectedModule) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = s.title.toLowerCase().includes(q);
        const matchesDesc = (s.description || '').toLowerCase().includes(q);
        const matchesCategory = (s.category || '').toLowerCase().includes(q);
        const matchesTabs = (s.tabs || []).some(t => t.name.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesCategory && !matchesTabs) {
          return false;
        }
      }
      return true;
    });
  }, [sheets, selectedCategory, selectedModule, searchQuery]);

  // Overall Statistics
  const stats = useMemo(() => {
    const totalSheets = sheets.length;
    const totalTabs = sheets.reduce((acc, s) => acc + (s.tabs?.length || 1), 0);
    const totalRows = sheets.reduce((acc, s) => acc + (s.totalRows || 0), 0);
    const mappedToCases = sheets.filter(s => (s.targetModule || 'cases') === 'cases').length;
    const mappedToClients = sheets.filter(s => s.targetModule === 'clients').length;

    return {
      totalSheets,
      totalTabs,
      totalRows,
      mappedToCases,
      mappedToClients
    };
  }, [sheets]);

  const handleExportSheetCsv = (sheet: SavedPublicSheet) => {
    if (!sheet.rows || sheet.rows.length === 0) {
      alert('لا توجد بيانات متاحة للتصدير في هذا الجدول');
      return;
    }
    const headers = sheet.columns.map(c => `"${c.label.replace(/"/g, '""')}"`);
    const rowsCsv = sheet.rows.map(r => {
      return sheet.columns.map(c => {
        const val = r[c.id] ?? '';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',');
    });
    const csvContent = '\uFEFF' + [headers.join(','), ...rowsCsv].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanTitle = (sheet.title || 'google_sheet').replace(/[^a-zA-Z0-9\u0600-\u06FF_-]/g, '_');
    link.setAttribute('download', `${cleanTitle}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getModuleBadge = (targetModule?: string) => {
    switch (targetModule) {
      case 'cases':
        return { label: '📁 قسم القضايا', color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' };
      case 'clients':
        return { label: '👥 قسم العملاء', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
      case 'financials':
        return { label: '💰 قسم المالية', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
      case 'consultations':
        return { label: '⚖️ الاستشارات', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' };
      case 'requests':
        return { label: '📥 طلبات خارجية', color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' };
      default:
        return { label: '📊 جدول عام', color: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Analytics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`p-4 rounded-2xl border transition-all ${
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-bold">إجمالي الجداول المتصلة</span>
            <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black">{stats.totalSheets}</div>
          <div className="text-[11px] text-slate-500 mt-1">جداول Google Sheets & Forms</div>
        </div>

        <div className={`p-4 rounded-2xl border transition-all ${
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-bold">أوراق العمل النشطة (Tabs)</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-500">{stats.totalTabs}</div>
          <div className="text-[11px] text-slate-500 mt-1">صفحات عمل متعددة في الجداول</div>
        </div>

        <div className={`p-4 rounded-2xl border transition-all ${
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-bold">إجمالي الاستجابات والصفوف</span>
            <Database className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-500">{stats.totalRows}</div>
          <div className="text-[11px] text-slate-500 mt-1">سجلات بيانات مستوردة</div>
        </div>

        <div className={`p-4 rounded-2xl border transition-all ${
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-bold">ربط القضايا والعملاء</span>
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-500">{stats.mappedToCases + stats.mappedToClients}</div>
          <div className="text-[11px] text-slate-500 mt-1">{stats.mappedToCases} قضايا • {stats.mappedToClients} عملاء</div>
        </div>
      </div>

      {/* Control & Filter Toolbar */}
      <div className={`p-4 rounded-2xl border space-y-3.5 transition-all ${
        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم، الوصف، الفئة، أو أسماء أوراق العمل (Tabs)..."
              className={`w-full pl-4 pr-10 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${
                isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                مسح
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* View Mode Toggle */}
            <div className={`p-1 rounded-xl border flex items-center gap-1 ${
              isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                onClick={() => setLayoutMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  layoutMode === 'grid'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="عرض شبكي (بطاقات)"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setLayoutMode('table')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  layoutMode === 'table'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="عرض جدولي مفصل"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Add New Sheet */}
            <button
              onClick={onAddNewSheet}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>ربط جدول جديد</span>
            </button>
          </div>
        </div>

        {/* Module and Category Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
          {/* Target Module Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400 ml-1">تصفية القسم:</span>
            {targetModules.map(mod => (
              <button
                key={mod.key}
                onClick={() => setSelectedModule(mod.key)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  selectedModule === mod.key
                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                    : isDark ? 'bg-zinc-800 text-zinc-400 hover:text-zinc-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {mod.label}
              </button>
            ))}
          </div>

          <span className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-zinc-800 px-2.5 py-1 rounded-md">
            {filteredSheets.length} من {sheets.length} جدول
          </span>
        </div>
      </div>

      {/* Delete Confirmation Banner Modal */}
      {deleteConfirmId && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <div className="text-xs font-bold">هل أنت متأكد من رغبتك في حذف هذا الجدول من النظام؟</div>
              <div className="text-[11px] text-rose-400 mt-0.5">لن يتم حذف الملف الأصلي من حسابك على Google Drive، وسيتم فقط إزالته من لوحة التحكم.</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                onDeleteSheet(deleteConfirmId);
                setDeleteConfirmId(null);
              }}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              تأكيد الحذف
            </button>
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="px-3 py-1.5 rounded-xl border border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800 cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* GRID VIEW LAYOUT */}
      {/* ========================================== */}
      {layoutMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredSheets.map(sheet => {
            const moduleBadge = getModuleBadge(sheet.targetModule);
            const sheetTabs = sheet.tabs || [{ gid: sheet.gid || '0', name: sheet.activeTabName || 'ورقة العمل', isDefault: true }];

            return (
              <div
                key={sheet.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between hover:shadow-lg ${
                  isDark ? 'bg-zinc-900/90 border-zinc-800 hover:border-zinc-700' : 'bg-white border-slate-200 hover:border-indigo-200 shadow-xs'
                }`}
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0"
                        style={{ backgroundColor: sheet.color || '#4F46E5' }}
                      >
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold leading-tight line-clamp-1">
                          {sheet.title}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${moduleBadge.color}`}>
                            {moduleBadge.label}
                          </span>
                          {sheet.category && (
                            <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                              {sheet.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Sync Status Badge */}
                    <div className="shrink-0">
                      {sheet.syncStatus === 'syncing' ? (
                        <span className="flex items-center gap-1 text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full font-bold">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>مزامنة...</span>
                        </span>
                      ) : sheet.syncStatus === 'error' ? (
                        <span className="flex items-center gap-1 text-[10px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full font-bold" title={sheet.errorMessage}>
                          <AlertCircle className="w-3 h-3" />
                          <span>خطأ اتصال</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>متصل</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {sheet.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                      {sheet.description}
                    </p>
                  )}

                  {/* Worksheets / Tabs Summary */}
                  <div className={`p-3 rounded-xl border mb-3 space-y-1.5 ${
                    isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-indigo-400" />
                        <span>أوراق العمل ({sheetTabs.length}):</span>
                      </span>
                      <button
                        onClick={() => onManageTabs(sheet)}
                        className="text-indigo-500 hover:underline cursor-pointer"
                      >
                        إدارة الأوراق
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {sheetTabs.map((t, idx) => (
                        <span
                          key={t.gid || idx}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                            (sheet.gid || '0') === t.gid
                              ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
                              : isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          <span>{t.name}</span>
                          <span className="opacity-60 text-[9px]">({t.gid})</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Metadata Stats Footer */}
                  <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 dark:border-zinc-800/80 text-center text-xs mb-3">
                    <div>
                      <div className="text-[10px] text-slate-400">الصفوف</div>
                      <div className="font-bold font-mono mt-0.5">{sheet.totalRows || 0}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">الأعمدة</div>
                      <div className="font-bold font-mono mt-0.5">{sheet.columns?.length || 0}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">آخر تحديث</div>
                      <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                        {sheet.lastSyncedAt ? new Date(sheet.lastSyncedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions Toolbar */}
                <div className="flex items-center justify-between gap-1.5 pt-2">
                  <div className="flex items-center gap-1">
                    {/* View / Open Sheet in Hub */}
                    <button
                      onClick={() => onSelectSheet(sheet.id)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>استعراض</span>
                    </button>

                    {/* Edit Sheet Metadata */}
                    <button
                      onClick={() => onEditSheet(sheet)}
                      className={`p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
                        isDark ? 'border-zinc-800 bg-zinc-800 text-zinc-300 hover:text-white' : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                      title="تعديل بيانات الجدول"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {/* Manage Tabs */}
                    <button
                      onClick={() => onManageTabs(sheet)}
                      className={`p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
                        isDark ? 'border-zinc-800 bg-zinc-800 text-zinc-300 hover:text-white' : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                      title="إدارة وتعديل أوراق العمل (Tabs)"
                    >
                      <Layers className="w-3.5 h-3.5" />
                    </button>

                    {/* Sync Sheet */}
                    <button
                      onClick={() => onSyncSheet(sheet)}
                      disabled={sheet.syncStatus === 'syncing'}
                      className={`p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
                        isDark ? 'border-zinc-800 bg-zinc-800 text-zinc-300 hover:text-white' : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                      title="تحديث البيانات من Google Sheets"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${sheet.syncStatus === 'syncing' ? 'animate-spin text-indigo-400' : ''}`} />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Export CSV */}
                    <button
                      onClick={() => handleExportSheetCsv(sheet)}
                      className={`p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
                        isDark ? 'border-zinc-800 bg-zinc-800 text-zinc-400 hover:text-white' : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      title="تصدير كملف CSV"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    {/* Open in Google Sheets */}
                    {sheet.url && (
                      <a
                        href={sheet.url}
                        target="_blank"
                        rel="noreferrer"
                        className={`p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
                          isDark ? 'border-zinc-800 bg-zinc-800 text-zinc-400 hover:text-white' : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        title="فتح في Google Sheets"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}

                    {/* Delete Sheet */}
                    <button
                      onClick={() => setDeleteConfirmId(sheet.id)}
                      className="p-2 rounded-xl border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 text-xs transition-colors cursor-pointer"
                      title="حذف هذا الجدول"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================== */}
      {/* TABLE VIEW LAYOUT */}
      {/* ========================================== */}
      {layoutMode === 'table' && (
        <div className={`rounded-2xl border overflow-hidden transition-all ${
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className={`border-b text-slate-400 font-bold ${
                isDark ? 'bg-zinc-950/80 border-zinc-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <tr>
                  <th className="p-3.5">الجدول / الورقة</th>
                  <th className="p-3.5">القسم المرتبط</th>
                  <th className="p-3.5">أوراق العمل (Tabs)</th>
                  <th className="p-3.5">عدد السجلات</th>
                  <th className="p-3.5">حالة التزامن</th>
                  <th className="p-3.5">آخر تحديث</th>
                  <th className="p-3.5 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {filteredSheets.map(sheet => {
                  const moduleBadge = getModuleBadge(sheet.targetModule);
                  const sheetTabs = sheet.tabs || [{ gid: sheet.gid || '0', name: sheet.activeTabName || 'ورقة العمل', isDefault: true }];

                  return (
                    <tr 
                      key={sheet.id}
                      className={`transition-colors ${
                        isDark ? 'hover:bg-zinc-800/40' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-xs shrink-0"
                            style={{ backgroundColor: sheet.color || '#4F46E5' }}
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{sheet.title}</div>
                            {sheet.description && (
                              <div className="text-[11px] text-slate-400 line-clamp-1">{sheet.description}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${moduleBadge.color}`}>
                          {moduleBadge.label}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-1 flex-wrap">
                          {sheetTabs.slice(0, 2).map((t, idx) => (
                            <span
                              key={t.gid || idx}
                              className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700"
                            >
                              {t.name}
                            </span>
                          ))}
                          {sheetTabs.length > 2 && (
                            <span className="text-[10px] text-indigo-400 font-bold">
                              +{sheetTabs.length - 2} المزيد
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5 font-bold font-mono">
                        {sheet.totalRows || 0} صف
                      </td>

                      <td className="p-3.5">
                        {sheet.syncStatus === 'syncing' ? (
                          <span className="text-indigo-400 font-bold text-[11px] flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 animate-spin" /> مزامنة...
                          </span>
                        ) : sheet.syncStatus === 'error' ? (
                          <span className="text-rose-400 font-bold text-[11px] flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> خطأ
                          </span>
                        ) : (
                          <span className="text-emerald-500 font-bold text-[11px] flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> متصل
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-[11px] text-slate-400 font-mono">
                        {sheet.lastSyncedAt ? new Date(sheet.lastSyncedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>

                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onSelectSheet(sheet.id)}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                            title="فتح واستعراض"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>عرض</span>
                          </button>

                          <button
                            onClick={() => onEditSheet(sheet)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                            title="تعديل"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onManageTabs(sheet)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                            title="أوراق العمل"
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onSyncSheet(sheet)}
                            disabled={sheet.syncStatus === 'syncing'}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                            title="تحديث"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${sheet.syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                          </button>

                          <button
                            onClick={() => setDeleteConfirmId(sheet.id)}
                            className="p-1.5 rounded-lg border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredSheets.length === 0 && (
        <div className={`p-12 text-center rounded-2xl border ${
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
        }`}>
          <FileSpreadsheet className="w-12 h-12 mx-auto text-slate-400 mb-3" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">
            لم يتم العثور على جداول تطابق البحث أو التصنيف
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            يمكنك ربط جدول أو نموذج Google جديد بسهولة وبدون الحاجة لمفاتيح برمجية
          </p>
          <button
            onClick={onAddNewSheet}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ربط جدول جديد الآن</span>
          </button>
        </div>
      )}
    </div>
  );
};
