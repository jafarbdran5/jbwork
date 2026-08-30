import React, { useState, useMemo } from 'react';
import { 
  Edit3, 
  Search, 
  Plus, 
  RotateCcw, 
  Shield, 
  Layers, 
  Tag, 
  Eye, 
  EyeOff, 
  Trash2, 
  Check, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle,
  FolderPlus,
  Sliders,
  Filter,
  Sparkles,
  Info,
  Copy
} from 'lucide-react';
import { 
  getSavedLabels, 
  saveCustomLabel, 
  resetLabelToDefault, 
  resetCategoryToDefault, 
  addNewCustomLabelItem, 
  deleteCustomLabelItem, 
  toggleLabelVisibility,
  DynamicLabelItem, 
  LabelCategory 
} from '../../lib/dynamicLabelsStore';
import { useAllDynamicLabels } from '../../lib/useDynamicLabels';
import { useAuth } from '../../lib/auth';
import { hasPermission } from '../../lib/permissionGuard';
import { QuickRenameModal } from '../common/QuickRenameModal';

export const AppLabelsManagerModule: React.FC = () => {
  const { userProfile } = useAuth();
  const allLabels = useAllDynamicLabels();

  const canManage = userProfile?.role === 'super_admin' || hasPermission(userProfile, 'sections_manage');

  // Filters & State
  const [selectedCategory, setSelectedCategory] = useState<LabelCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCustomOnly, setFilterCustomOnly] = useState(false);

  // Modals
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItemCategory, setNewItemCategory] = useState<LabelCategory>('case_types');
  const [newItemLabelAr, setNewItemLabelAr] = useState('');
  const [newItemLabelEn, setNewItemLabelEn] = useState('');
  const [newItemId, setNewItemId] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Categories list
  const categoriesList: { key: LabelCategory | 'all'; labelAr: string; count: number }[] = [
    { key: 'all', labelAr: 'جميع المسميات', count: allLabels.length },
    { key: 'sections', labelAr: 'الأقسام الرئيسية', count: allLabels.filter(l => l.category === 'sections').length },
    { key: 'tabs', labelAr: 'علامات التبويب والصفحات', count: allLabels.filter(l => l.category === 'tabs').length },
    { key: 'case_types', labelAr: 'أنواع القضايا', count: allLabels.filter(l => l.category === 'case_types').length },
    { key: 'case_statuses', labelAr: 'حالات القضايا', count: allLabels.filter(l => l.category === 'case_statuses').length },
    { key: 'case_priorities', labelAr: 'درجات الأهمية', count: allLabels.filter(l => l.category === 'case_priorities').length },
    { key: 'task_types', labelAr: 'أنواع المهام', count: allLabels.filter(l => l.category === 'task_types').length },
    { key: 'task_statuses', labelAr: 'حالات المهام', count: allLabels.filter(l => l.category === 'task_statuses').length },
    { key: 'request_types', labelAr: 'مركز الاستقبال والطلبات', count: allLabels.filter(l => l.category === 'request_types').length },
    { key: 'table_columns', labelAr: 'أسماء الأعمدة والجداول', count: allLabels.filter(l => l.category === 'table_columns').length },
    { key: 'fields', labelAr: 'الحقول ونماذج الإدخال', count: allLabels.filter(l => l.category === 'fields').length },
    { key: 'google_sheets', labelAr: 'Google Sheets والأوراق', count: allLabels.filter(l => l.category === 'google_sheets').length },
    { key: 'buttons_actions', labelAr: 'الأزرار والإجراءات', count: allLabels.filter(l => l.category === 'buttons_actions').length },
    { key: 'system_entities', labelAr: 'المسميات العامة', count: allLabels.filter(l => l.category === 'system_entities').length },
  ];

  // Filtered Labels
  const filteredLabels = useMemo(() => {
    return allLabels.filter(item => {
      const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchCustom = !filterCustomOnly || !!item.customLabelAr;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        item.id.toLowerCase().includes(q) ||
        item.defaultLabelAr.toLowerCase().includes(q) ||
        (item.customLabelAr && item.customLabelAr.toLowerCase().includes(q)) ||
        (item.defaultLabelEn && item.defaultLabelEn.toLowerCase().includes(q)) ||
        (item.descriptionAr && item.descriptionAr.toLowerCase().includes(q));

      return matchCategory && matchCustom && matchSearch;
    });
  }, [allLabels, selectedCategory, filterCustomOnly, searchQuery]);

  // Statistics
  const customCount = allLabels.filter(l => !!l.customLabelAr).length;
  const customItemsCount = allLabels.filter(l => l.isCustomCreated).length;

  const handleToggleVisibility = (id: string) => {
    const res = toggleLabelVisibility(id, userProfile);
    if (res.success) {
      showToast(res.message);
    }
  };

  const handleDeleteItem = (id: string) => {
    const item = allLabels.find(i => i.id === id);
    if (confirm(`هل أنت متأكد من حذف العنصر (${item?.customLabelAr || item?.defaultLabelAr})؟`)) {
      const res = deleteCustomLabelItem(id, userProfile);
      showToast(res.message);
    }
  };

  const handleResetCategory = (cat: LabelCategory) => {
    if (confirm(`هل أنت متأكد من استعادة كافة المسميات الافتراضية لفئة (${cat})؟`)) {
      const res = resetCategoryToDefault(cat, userProfile);
      showToast(res.message);
    }
  };

  const handleAddNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemLabelAr.trim()) {
      alert('يرجى كتابة اسم العنصر بالعربية');
      return;
    }

    const res = addNewCustomLabelItem(
      newItemCategory,
      {
        id: newItemId.trim() || undefined,
        labelAr: newItemLabelAr.trim(),
        labelEn: newItemLabelEn.trim() || undefined,
        descriptionAr: newItemDescription.trim() || undefined
      },
      userProfile
    );

    if (res.success) {
      showToast(res.message);
      setIsAddModalOpen(false);
      setNewItemLabelAr('');
      setNewItemLabelEn('');
      setNewItemId('');
      setNewItemDescription('');
    } else {
      alert(res.message);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Toast message */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-emerald-500 text-slate-950 font-semibold shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-l from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/20 rounded-2xl p-6 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Tag className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
                  مدير أسماء وتسميات التطبيق المركزي
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                    نظام التسميات الديناميكي
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  التحكم الشامل في جميع مسميات وعناوين الأقسام، التبويبات، القضايا، المهام، الحقول، وأوراق Google Sheets مع الحفاظ التام على المعرفات الثابتة.
                </p>
              </div>
            </div>
          </div>

          {canManage && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition"
              >
                <Plus className="w-4 h-4" />
                + إضافة عنصر أو تسمية جديدة
              </button>
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <span className="text-[11px] text-slate-400 block mb-1">إجمالي العناصر المسجلة:</span>
            <span className="text-lg font-bold text-slate-100">{allLabels.length}</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <span className="text-[11px] text-slate-400 block mb-1">عناصر تم تعديل أسمائها:</span>
            <span className="text-lg font-bold text-amber-400">{customCount}</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <span className="text-[11px] text-slate-400 block mb-1">عناصر نظامية محمية:</span>
            <span className="text-lg font-bold text-indigo-400">{allLabels.filter(l => l.isSystemCore).length}</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <span className="text-[11px] text-slate-400 block mb-1">عناصر مخصصة أضافها المشرف:</span>
            <span className="text-lg font-bold text-emerald-400">{customItemsCount}</span>
          </div>
        </div>
      </div>

      {/* Main Grid / Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar: Categories Navigation */}
        <div className="lg:col-span-1 space-y-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 h-fit">
          <h3 className="text-xs font-bold text-slate-300 px-3 py-1 mb-2 flex items-center justify-between">
            <span>فئات العناصر</span>
            <span className="text-[10px] text-slate-500 font-mono">({categoriesList.length - 1} فئة)</span>
          </h3>

          <div className="space-y-1">
            {categoriesList.map(cat => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition text-right ${
                  selectedCategory === cat.key
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <span>{cat.labelAr}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                  selectedCategory === cat.key ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}>
                  {cat.count}
                </span>
              </button>
            ))}
          </div>

          {selectedCategory !== 'all' && canManage && (
            <div className="pt-3 mt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => handleResetCategory(selectedCategory as LabelCategory)}
                className="w-full px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-xl transition flex items-center justify-center gap-1.5 border border-rose-500/20"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                استعادة افتراضيات هذه الفئة
              </button>
            </div>
          )}
        </div>

        {/* Right Area: Search, Filters & Data Table */}
        <div className="lg:col-span-3 space-y-4">
          {/* Controls Bar */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم، المعرف الثابت، أو الوصف..."
                className="w-full pr-10 pl-4 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filterCustomOnly}
                  onChange={(e) => setFilterCustomOnly(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-950"
                />
                <span>إظهار المسميات المعدلة فقط ({customCount})</span>
              </label>

              <span className="text-xs text-slate-400 font-mono">
                {filteredLabels.length} عنصر
              </span>
            </div>
          </div>

          {/* Labels Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-medium">
                  <tr>
                    <th className="p-3.5">المعرف الثابت (Immutable ID)</th>
                    <th className="p-3.5">الاسم الافتراضي في النظام</th>
                    <th className="p-3.5">الاسم المعروض حالياً في الواجهة</th>
                    <th className="p-3.5">الفئة والنوع</th>
                    <th className="p-3.5 text-center">الحالة</th>
                    <th className="p-3.5 text-left">إجراءات الإدارة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredLabels.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        لا توجد عناصر مطابقة للبحث أو الفئة المحددة.
                      </td>
                    </tr>
                  ) : (
                    filteredLabels.map((item) => {
                      const isCustomized = !!item.customLabelAr && item.customLabelAr !== item.defaultLabelAr;
                      return (
                        <tr 
                          key={item.id}
                          className={`hover:bg-slate-800/40 transition ${item.hidden ? 'opacity-50 bg-slate-950/40' : ''}`}
                        >
                          {/* Permanent ID */}
                          <td className="p-3.5 font-mono">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-indigo-300 text-[11px]">
                                {item.id}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(item.id)}
                                title="نسخ المعرف الداخلي"
                                className="p-1 text-slate-500 hover:text-indigo-400 transition"
                              >
                                {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>

                          {/* Default Label */}
                          <td className="p-3.5 text-slate-300">
                            <span className="font-medium">{item.defaultLabelAr}</span>
                            {item.defaultLabelEn && (
                              <span className="block text-[10px] text-slate-500 font-mono mt-0.5" dir="ltr">
                                {item.defaultLabelEn}
                              </span>
                            )}
                          </td>

                          {/* Current Display Label */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <span className={`font-bold ${isCustomized ? 'text-amber-400' : 'text-slate-200'}`}>
                                {item.customLabelAr || item.defaultLabelAr}
                              </span>
                              {isCustomized && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  معدل
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Category and Type */}
                          <td className="p-3.5">
                            <div className="space-y-1">
                              <span className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                                {item.category}
                              </span>
                              <div>
                                {item.isSystemCore ? (
                                  <span className="text-[10px] text-indigo-400 flex items-center gap-1">
                                    <Shield className="w-3 h-3" />
                                    نظامي محمي
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" />
                                    مخصص إضافي
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Visibility Status */}
                          <td className="p-3.5 text-center">
                            {item.hidden ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-950/60 text-rose-300 border border-rose-800/40 text-[10px]">
                                <EyeOff className="w-3 h-3" />
                                مخفي
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 text-[10px]">
                                <Eye className="w-3 h-3" />
                                ظاهر
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="p-3.5 text-left">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Rename Button */}
                              {canManage && (
                                <button
                                  type="button"
                                  onClick={() => setRenameTargetId(item.id)}
                                  title="إعادة تسمية هذا العنصر"
                                  className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs flex items-center gap-1 transition"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>تعديل</span>
                                </button>
                              )}

                              {/* Toggle Visibility */}
                              {canManage && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleVisibility(item.id)}
                                  title={item.hidden ? 'إظهار العنصر' : 'إخفاء العنصر'}
                                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                                >
                                  {item.hidden ? <Eye className="w-4 h-4 text-slate-400" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
                                </button>
                              )}

                              {/* Delete if custom */}
                              {canManage && item.isCustomCreated && !item.isSystemCore && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(item.id)}
                                  title="حذف هذا العنصر المخصص"
                                  className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Rename Modal instance */}
      {renameTargetId && (
        <QuickRenameModal
          isOpen={!!renameTargetId}
          onClose={() => setRenameTargetId(null)}
          labelId={renameTargetId}
          onSuccess={(newName) => {
            showToast(`تم تغيير الاسم إلى: ${newName}`);
          }}
        />
      )}

      {/* Add New Custom Label Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" dir="rtl">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-white flex flex-col">
            <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-100">إضافة عنصر أو تسمية جديدة</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    إضافة خيار أو تصنيف أو قسم جديد يظهر في القوائم ونماذج النظام
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleAddNewItem} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-200">
                  فئة العنصر <span className="text-rose-400">*</span>
                </label>
                <select
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value as LabelCategory)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="case_types">نوع قضية جديد (Case Type)</option>
                  <option value="case_statuses">حالة قضية جديدة (Case Status)</option>
                  <option value="case_priorities">درجة أهمية جديدة (Priority)</option>
                  <option value="task_types">نوع مهمة جديد (Task Type)</option>
                  <option value="task_statuses">حالة مهمة جديدة (Task Status)</option>
                  <option value="request_types">نوع طلب أو بلاغ في الاستقبال (Intake Type)</option>
                  <option value="sections">قسم رئيسي جديد (Main Section)</option>
                  <option value="tabs">علامة تبويب / صفحة جديدة (Tab)</option>
                  <option value="fields">حقل إدخال جديد (Field)</option>
                  <option value="table_columns">عمود جدول جديد (Column)</option>
                  <option value="system_entities">مسمى عام للمنظومة (Entity)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-200">
                  اسم العنصر (بالعربية) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={newItemLabelAr}
                  onChange={(e) => setNewItemLabelAr(e.target.value)}
                  placeholder="مثال: قضية نزاع تجاري، أو جلسة فحص أدلة..."
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  الاسم بالإنجليزية (اختياري)
                </label>
                <input
                  type="text"
                  value={newItemLabelEn}
                  onChange={(e) => setNewItemLabelEn(e.target.value)}
                  placeholder="e.g. Commercial Dispute"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 text-left"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  المعرف الداخلي الثابت (ID - اختياري، سيتم توليده تلقائياً إذا ترك فارغاً)
                </label>
                <input
                  type="text"
                  value={newItemId}
                  onChange={(e) => setNewItemId(e.target.value)}
                  placeholder="مثال: case_type_commercial_dispute"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-indigo-300 focus:outline-none focus:border-amber-500 text-left"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  الوصف أو الملاحظات (اختياري)
                </label>
                <textarea
                  value={newItemDescription}
                  onChange={(e) => setNewItemDescription(e.target.value)}
                  placeholder="وصف استخدام هذا العنصر..."
                  rows={2}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-4 border-t border-slate-800 bg-slate-950/80 -mx-6 -mb-6 flex items-center justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-xl transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
                >
                  <Plus className="w-4 h-4" />
                  إضافة وحفظ العنصر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
