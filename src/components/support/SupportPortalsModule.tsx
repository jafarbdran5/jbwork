import React, { useState, useEffect, useMemo } from 'react';
import { 
  Globe, 
  Search, 
  ExternalLink, 
  ShieldCheck, 
  Mail, 
  Phone, 
  Info, 
  Plus, 
  Edit3, 
  Trash2, 
  Eye, 
  EyeOff, 
  Star, 
  CheckCircle2, 
  Sparkles, 
  Filter,
  Layers,
  HelpCircle,
  Copy,
  Check
} from 'lucide-react';
import { 
  SupportPortalItem, 
  SupportCategory, 
  getSavedSupportPortals, 
  saveSupportPortalItem, 
  deleteSupportPortalItem,
  resetSupportPortalsToDefault
} from '../../lib/supportPortalsStore';
import { useAuth } from '../../lib/auth';
import { hasPermission } from '../../lib/permissionGuard';
import { DependencyDeleteModal } from '../common/DependencyDeleteModal';
import { checkItemDependencies, DependencyCheckResult } from '../../lib/customizationStore';

export const SupportPortalsModule: React.FC = () => {
  const { userProfile } = useAuth();
  const canManage = hasPermission(userProfile, 'support_portals_manage');

  const [portals, setPortals] = useState<SupportPortalItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Modal / Form state
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<SupportPortalItem> | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<SupportPortalItem | null>(null);
  const [dependencyInfo, setDependencyInfo] = useState<DependencyCheckResult | null>(null);

  const loadData = () => {
    setPortals(getSavedSupportPortals());
  };

  useEffect(() => {
    loadData();
    const handleDataChanged = (e: any) => {
      if (!e.detail || e.detail.type === 'support_portals') {
        loadData();
      }
    };
    window.addEventListener('jb_data_changed', handleDataChanged);
    return () => window.removeEventListener('jb_data_changed', handleDataChanged);
  }, []);

  const companies = useMemo(() => {
    const list = Array.from(new Set(portals.map(p => p.company))).filter(Boolean);
    return ['all', ...list];
  }, [portals]);

  const categories: { key: string; labelAr: string }[] = [
    { key: 'all', labelAr: 'جميع الفئات' },
    { key: 'hacked', labelAr: '🔒 الحسابات المخترقة والأمان' },
    { key: 'impersonation', labelAr: '👤 انتحال الشخصية والحسابات المزيفة' },
    { key: 'recovery', labelAr: '🔄 استرداد الحسابات وفك الحظر' },
    { key: 'content_removal', labelAr: '⚖️ إزالة المحتوى القانوني والتشهير' },
    { key: 'copyright', labelAr: '📜 حقوق الملكية الفكرية والعلامات' },
    { key: 'ads_business', labelAr: '💼 مدراء الأعمال والإعلانات' }
  ];

  const filteredPortals = useMemo(() => {
    let result = [...portals];

    // Non-admins only see non-hidden portals
    if (!canManage) {
      result = result.filter(p => !p.isHidden);
    }

    if (selectedCompany !== 'all') {
      result = result.filter(p => p.company.toLowerCase() === selectedCompany.toLowerCase());
    }

    if (selectedCategory !== 'all') {
      result = result.filter(p => p.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(p => 
        p.company.toLowerCase().includes(q) ||
        p.platformName.toLowerCase().includes(q) ||
        p.serviceNameAr.toLowerCase().includes(q) ||
        p.serviceNameEn.toLowerCase().includes(q) ||
        p.descriptionAr.toLowerCase().includes(q) ||
        p.contactMethodAr.toLowerCase().includes(q) ||
        p.officialUrl.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    return result.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [portals, selectedCompany, selectedCategory, searchQuery, canManage]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenEdit = (item?: SupportPortalItem) => {
    if (item) {
      setEditingItem({ ...item });
    } else {
      setEditingItem({
        company: 'Meta',
        platformName: 'Facebook',
        serviceNameAr: '',
        serviceNameEn: '',
        descriptionAr: '',
        descriptionEn: '',
        category: 'hacked',
        officialUrl: 'https://',
        isVerifiedOfficial: true,
        contactMethodAr: 'نموذج أمان رسمي',
        contactMethodEn: 'Official Security Portal',
        tags: [],
        sortOrder: portals.length + 1,
        isHidden: false,
        isPopular: false
      });
    }
    setIsEditingModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.serviceNameAr || !editingItem.officialUrl) return;

    saveSupportPortalItem(editingItem as SupportPortalItem, userProfile);
    setIsEditingModalOpen(false);
    setEditingItem(null);
    loadData();
  };

  const handleDeletePrompt = (item: SupportPortalItem) => {
    const deps = checkItemDependencies('support_portal', item.id);
    setDependencyInfo(deps);
    setDeleteTarget(item);
  };

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      deleteSupportPortalItem(deleteTarget.id, userProfile);
      setDeleteTarget(null);
      setDependencyInfo(null);
      loadData();
    }
  };

  return (
    <div id="module-support-portals" className="space-y-6 animate-in fade-in duration-300 pb-12" dir="rtl">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-xs">
                <Globe className="w-6 h-6" />
              </div>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                بوابات دعم الشركات والمنصات الرسمية
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> روابط معتمدة 100%
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-400 max-w-3xl leading-relaxed">
              الدليل الرسمي المباشر لبوابات ونماذج الدعم الفني والأمني المعتمدة لكبرى الشركات (Meta، Google، TikTok، X، Telegram، Apple، Microsoft). مخصصة لاسترداد الحسابات، الإبلاغ عن انتحال الشخصية، وإزالة المحتوى.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {canManage && (
              <button
                onClick={() => handleOpenEdit()}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-900/30 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> إضافة بوابة دعم جديدة
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3.5 shadow-lg">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="ابحث بالمنصة، الخدمة، الكلمات الدلالية (مثال: انتحال شخصية إنستغرام، فيسبوك مخترق، قناة يوتيوب)..."
            className="w-full pl-4 pr-11 py-3 bg-slate-950/60 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded-md"
            >
              مسح
            </button>
          )}
        </div>

        {/* Company and Category Chips */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800/80">
          {/* Company selector */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-400 font-medium ml-1">الشركة:</span>
            {companies.map(c => (
              <button
                key={c}
                onClick={() => setSelectedCompany(c)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  selectedCompany === c
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {c === 'all' ? 'الكل' : c}
              </button>
            ))}
          </div>

          {/* Category selector */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {categories.map(cat => (
                <option key={cat.key} value={cat.key}>
                  {cat.labelAr}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Support Portals */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredPortals.map(portal => (
          <div
            key={portal.id}
            id={`portal-card-${portal.id}`}
            className={`p-5 rounded-2xl bg-slate-900 border transition-all duration-200 flex flex-col justify-between group hover:shadow-xl ${
              portal.isHidden 
                ? 'opacity-60 border-dashed border-slate-700 bg-slate-900/40' 
                : portal.isPopular 
                  ? 'border-indigo-500/40 hover:border-indigo-500/80 bg-slate-900/90 shadow-indigo-950/20' 
                  : 'border-slate-800 hover:border-slate-700'
            }`}
          >
            {/* Top Bar */}
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-indigo-300 font-bold text-xs">
                    {portal.company}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-800/60 text-slate-400 text-[11px] font-mono">
                    {portal.platformName}
                  </span>
                  {portal.isPopular && (
                    <span className="p-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20" title="خدمة شائعة">
                      <Star className="w-3 h-3 fill-amber-400" />
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {canManage && (
                    <>
                      <button
                        onClick={() => handleOpenEdit(portal)}
                        className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="تعديل البوابة"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePrompt(portal)}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Title & Description */}
              <div>
                <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors flex items-center gap-1.5">
                  {portal.serviceNameAr}
                </h3>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">{portal.serviceNameEn}</p>
                <p className="text-xs text-slate-300 mt-2 line-clamp-3 leading-relaxed">
                  {portal.descriptionAr}
                </p>
              </div>

              {/* Contact Method & Verification */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px]">طريقة الاتصال:</span>
                  <span className="text-slate-200 font-medium text-[11px]">{portal.contactMethodAr}</span>
                </div>

                {portal.officialEmail && (
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] flex items-center gap-1">
                      <Mail className="w-3 h-3 text-indigo-400" /> البريد الرسمي:
                    </span>
                    <button
                      onClick={() => handleCopy(portal.officialEmail!, `email-${portal.id}`)}
                      className="text-indigo-300 hover:text-white font-mono text-[11px] flex items-center gap-1"
                    >
                      {portal.officialEmail}
                      {copiedId === `email-${portal.id}` ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3 text-slate-500" />
                      )}
                    </button>
                  </div>
                )}

                {portal.officialPhone && (
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-400" /> الهاتف المعتمد:
                    </span>
                    <span className="text-slate-200 font-mono text-[11px]">{portal.officialPhone}</span>
                  </div>
                )}

                {portal.notesAr && (
                  <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/10 text-[11px] text-amber-300/90 leading-normal flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                    <span>{portal.notesAr}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-4 mt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
              <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> بوابة رسمية
              </span>

              <a
                href={portal.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-indigo-600/90 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-950/50 flex items-center gap-1.5 group-hover:scale-105"
              >
                <span>فتح البوابة الرسمية</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {filteredPortals.length === 0 && (
        <div className="p-12 rounded-2xl bg-slate-900/50 border border-slate-800 text-center space-y-3">
          <Globe className="w-12 h-12 text-slate-600 mx-auto" />
          <h4 className="text-base font-bold text-slate-300">لم يتم العثور على أي بوابات مطابقة</h4>
          <p className="text-xs text-slate-500">جرب البحث بكلمات أخرى أو اختر فئة مختلفة.</p>
        </div>
      )}

      {/* Add / Edit Portal Modal */}
      {isEditingModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-indigo-400" />
                {editingItem.id ? 'تعديل بوابة الدعم' : 'إضافة بوابة دعم جديدة'}
              </h3>
              <button
                onClick={() => setIsEditingModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">اسم الشركة (Company):</label>
                  <input
                    type="text"
                    required
                    value={editingItem.company || ''}
                    onChange={e => setEditingItem({ ...editingItem, company: e.target.value })}
                    placeholder="مثال: Meta, Google, TikTok, Apple"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">اسم المنصة / الخدمة:</label>
                  <input
                    type="text"
                    required
                    value={editingItem.platformName || ''}
                    onChange={e => setEditingItem({ ...editingItem, platformName: e.target.value })}
                    placeholder="مثال: Instagram, Facebook, YouTube"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">عنوان الخدمة بالعربية:</label>
                  <input
                    type="text"
                    required
                    value={editingItem.serviceNameAr || ''}
                    onChange={e => setEditingItem({ ...editingItem, serviceNameAr: e.target.value })}
                    placeholder="مثال: استرداد الحساب المخترق"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Service Name (English):</label>
                  <input
                    type="text"
                    value={editingItem.serviceNameEn || ''}
                    onChange={e => setEditingItem({ ...editingItem, serviceNameEn: e.target.value })}
                    placeholder="e.g. Compromised Account Recovery"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">الرابط الرسمي المعتمد (Official URL):</label>
                <input
                  type="url"
                  required
                  value={editingItem.officialUrl || ''}
                  onChange={e => setEditingItem({ ...editingItem, officialUrl: e.target.value })}
                  placeholder="https://www.facebook.com/hacked"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">الفئة (Category):</label>
                  <select
                    value={editingItem.category || 'hacked'}
                    onChange={e => setEditingItem({ ...editingItem, category: e.target.value as SupportCategory })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="hacked">🔒 الحسابات المخترقة والأمان</option>
                    <option value="impersonation">👤 انتحال الشخصية والحسابات المزيفة</option>
                    <option value="recovery">🔄 استرداد الحسابات وفك الحظر</option>
                    <option value="content_removal">⚖️ إزالة المحتوى القانوني والتشهير</option>
                    <option value="copyright">📜 حقوق الملكية الفكرية والعلامات</option>
                    <option value="ads_business">💼 مدراء الأعمال والإعلانات</option>
                    <option value="general">🌐 عام</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">طريقة الاتصال المعتمدة:</label>
                  <input
                    type="text"
                    value={editingItem.contactMethodAr || ''}
                    onChange={e => setEditingItem({ ...editingItem, contactMethodAr: e.target.value })}
                    placeholder="مثال: نموذج أمان رسمي، بريد إلكتروني"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">البريد الإلكتروني الرسمي (إن وجد):</label>
                  <input
                    type="email"
                    value={editingItem.officialEmail || ''}
                    onChange={e => setEditingItem({ ...editingItem, officialEmail: e.target.value })}
                    placeholder="ip@fb.com"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">الهاتف المعتمد (إن وجد):</label>
                  <input
                    type="text"
                    value={editingItem.officialPhone || ''}
                    onChange={e => setEditingItem({ ...editingItem, officialPhone: e.target.value })}
                    placeholder="+1 800 ..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">الوصف والشرح بالعربية:</label>
                <textarea
                  rows={2}
                  value={editingItem.descriptionAr || ''}
                  onChange={e => setEditingItem({ ...editingItem, descriptionAr: e.target.value })}
                  placeholder="شرح مختصر للخدمة وكيفية استخدامها..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">ملاحظات وإرشادات مهمة:</label>
                <input
                  type="text"
                  value={editingItem.notesAr || ''}
                  onChange={e => setEditingItem({ ...editingItem, notesAr: e.target.value })}
                  placeholder="مثال: يفضل استخدام جهاز تم تسجيل الدخول منه مسبقاً..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-medium">
                  <input
                    type="checkbox"
                    checked={editingItem.isPopular || false}
                    onChange={e => setEditingItem({ ...editingItem, isPopular: e.target.checked })}
                    className="rounded-sm accent-indigo-500"
                  />
                  <span>تمييز كخدمة شائعة ⭐</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-medium">
                  <input
                    type="checkbox"
                    checked={editingItem.isHidden || false}
                    onChange={e => setEditingItem({ ...editingItem, isHidden: e.target.checked })}
                    className="rounded-sm accent-rose-500"
                  />
                  <span>إخفاء مؤقت عن المستخدمين</span>
                </label>
              </div>

              <div className="p-4 border-t border-slate-800 flex items-center justify-between gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditingModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 bg-slate-800 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg"
                >
                  حفظ البوابة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dependency / Delete Modal */}
      {deleteTarget && dependencyInfo && (
        <DependencyDeleteModal
          isOpen={true}
          onClose={() => { setDeleteTarget(null); setDependencyInfo(null); }}
          onConfirm={handleConfirmDelete}
          itemTitle={`${deleteTarget.company} - ${deleteTarget.serviceNameAr}`}
          itemTypeLabel="بوابة الدعم"
          dependencyCheck={dependencyInfo}
        />
      )}
    </div>
  );
};
