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
  Star, 
  CheckCircle2, 
  Filter,
  Layers,
  Copy,
  Check,
  Shield,
  Smartphone,
  Cpu,
  Lock,
  RotateCcw,
  Video,
  X,
  RefreshCw,
  Server,
  KeyRound,
  FileText
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
import { useModalLifecycle } from '../../hooks/useModalLifecycle';

export const SupportPortalsModule: React.FC = () => {
  const { userProfile } = useAuth();
  const canManage = hasPermission(userProfile, 'support_portals_manage');

  const [portals, setPortals] = useState<SupportPortalItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [quickTab, setQuickTab] = useState<'all' | 'content_protection' | 'infosec' | 'phones' | 'social' | 'youtube' | 'hosting_cloud'>('all');
  
  // Modal / Form state
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<SupportPortalItem> | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<SupportPortalItem | null>(null);
  const [dependencyInfo, setDependencyInfo] = useState<DependencyCheckResult | null>(null);

  // Safe modal lifecycle
  const { handleBackdropClick } = useModalLifecycle({
    isOpen: isEditingModalOpen,
    onClose: () => setIsEditingModalOpen(false)
  });

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

  // Ordered list of top recognized companies
  const companyOrder = [
    'YouTube',
    'Google',
    'Meta',
    'TikTok',
    'X Corp',
    'Telegram',
    'Snap Inc.',
    'Apple',
    'Samsung',
    'Xiaomi',
    'Huawei',
    'Microsoft',
    'Discord',
    'LinkedIn',
    'Reddit',
    'Pinterest',
    'StopNCII.org',
    'NCMEC',
    'IWF',
    'DMCA.com',
    'Cloudflare',
    'Namecheap',
    'GoDaddy',
    'Hostinger',
    'Amazon AWS',
    'Google Cloud / Chronicle',
    'Have I Been Pwned',
    'URLScan.io',
    'Shodan',
    'ICANN',
    'Cisco / PhishTank',
    '2FA Directory',
    'MXToolbox',
    'IPQualityScore',
    'PayPal',
    'Binance',
    'OpenAI',
    'Proton',
    'Yahoo'
  ];

  const companies = useMemo(() => {
    const rawList = Array.from(new Set(portals.map(p => p.company))).filter(Boolean) as string[];
    const sorted = [...rawList].sort((a: string, b: string) => {
      const idxA = companyOrder.indexOf(a);
      const idxB = companyOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
    return ['all', ...sorted];
  }, [portals]);

  const categories: { key: string; labelAr: string; icon?: React.ReactNode }[] = [
    { key: 'all', labelAr: 'جميع الفئات' },
    { key: 'privacy_protection', labelAr: '🛡️ حماية المحتوى ومكافحة الابتزاز' },
    { key: 'infosec_tools', labelAr: '🔍 أدوات أمن المعلومات وفحص الروابط' },
    { key: 'phone_hardware', labelAr: '📱 شركات الهواتف والأجهزة الذكية' },
    { key: 'hacked', labelAr: '🔒 الحسابات المخترقة والأمان' },
    { key: 'impersonation', labelAr: '👤 انتحال الشخصية والحسابات المزيفة' },
    { key: 'recovery', labelAr: '🔄 استرداد الحسابات وفك الحظر' },
    { key: 'content_removal', labelAr: '⚖️ إزالة المحتوى القانوني والتشهير' },
    { key: 'copyright', labelAr: '📜 حقوق الملكية الفكرية و DMCA' },
    { key: 'ads_business', labelAr: '💼 مدراء الأعمال والإعلانات' },
    { key: 'safety', labelAr: '🚨 الجرائم الإلكترونية وإسقاط المواقع' },
    { key: 'hosting_dns', labelAr: '☁️ الاستضافات والنطاقات وسوء الاستخدام' },
    { key: 'finance_crypto', labelAr: '💳 المنصات المالية والعملات المشفرة' },
    { key: 'ai_tools', labelAr: '🤖 منصات الذكاء الاصطناعي' },
    { key: 'email_cloud', labelAr: '✉️ مزودو البريد المشفر والآمن' }
  ];

  const handleSelectQuickTab = (tab: typeof quickTab) => {
    setQuickTab(tab);
    setSelectedCategory('all');
    setSelectedCompany('all');
  };

  const handleSelectCompany = (comp: string) => {
    setSelectedCompany(comp);
    // If selecting a specific company, ensure quickTab doesn't aggressively filter it out
    if (comp !== 'all') {
      setQuickTab('all');
      setSelectedCategory('all');
    }
  };

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setSelectedCompany('all');
    setSelectedCategory('all');
    setQuickTab('all');
  };

  const filteredPortals = useMemo(() => {
    let result = [...portals];

    // Non-admins only see non-hidden portals
    if (!canManage) {
      result = result.filter(p => !p.isHidden);
    }

    // Quick Tab Filters
    if (quickTab === 'youtube') {
      result = result.filter(p => 
        p.company.toLowerCase() === 'youtube' || 
        p.platformName.toLowerCase().includes('youtube') ||
        p.tags.some(t => t.toLowerCase().includes('youtube') || t.includes('يوتيوب'))
      );
    } else if (quickTab === 'content_protection') {
      result = result.filter(p => p.category === 'privacy_protection' || p.category === 'copyright');
    } else if (quickTab === 'infosec') {
      result = result.filter(p => p.category === 'infosec_tools' || p.category === 'safety');
    } else if (quickTab === 'phones') {
      result = result.filter(p => p.category === 'phone_hardware');
    } else if (quickTab === 'social') {
      result = result.filter(p => 
        ['hacked', 'impersonation', 'recovery', 'ads_business'].includes(p.category) &&
        p.category !== 'phone_hardware'
      );
    } else if (quickTab === 'hosting_cloud') {
      result = result.filter(p => p.category === 'hosting_dns' || p.category === 'email_cloud');
    }

    // Company filter
    if (selectedCompany !== 'all') {
      const compLower = selectedCompany.toLowerCase().trim();
      result = result.filter(p => 
        p.company.toLowerCase() === compLower ||
        p.platformName.toLowerCase().includes(compLower) ||
        (compLower === 'meta' && ['facebook', 'instagram', 'whatsapp', 'threads'].some(m => p.platformName.toLowerCase().includes(m))) ||
        (compLower === 'google' && ['youtube', 'gmail', 'android', 'play', 'maps', 'workspace'].some(g => p.platformName.toLowerCase().includes(g))) ||
        (compLower === 'apple' && ['icloud', 'iphone', 'ipad', 'apple id'].some(a => p.platformName.toLowerCase().includes(a)))
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      result = result.filter(p => p.category === selectedCategory);
    }

    // Search query filter
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
  }, [portals, quickTab, selectedCompany, selectedCategory, searchQuery, canManage]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetToDefault = () => {
    if (confirm('هل ترغب في إعادة ضبط دليل بوابات الدعم إلى نسخته القياسية المحدثة والشاملة لجميع الشركات والمنصات؟')) {
      resetSupportPortalsToDefault();
      loadData();
    }
  };

  const handleOpenEdit = (item?: SupportPortalItem) => {
    if (item) {
      setEditingItem({ ...item });
    } else {
      setEditingItem({
        company: 'YouTube',
        platformName: 'YouTube',
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

  const isFilterActive = searchQuery !== '' || selectedCompany !== 'all' || selectedCategory !== 'all' || quickTab !== 'all';

  return (
    <div id="module-support-portals" className="space-y-6 animate-in fade-in duration-300 pb-12" dir="rtl">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border border-slate-700/60 dark:border-slate-800 shadow-xl relative overflow-hidden text-white">
        <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-xs">
                <Globe className="w-6 h-6" />
              </div>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                بوابات دعم الشركات وأدوات حماية المحتوى وأمن المعلومات
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> أكثر من {portals.length} بوابة معتمدة 100%
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-300 max-w-4xl leading-relaxed">
              الدليل المركزي الشامل لبوابات الدعم الأمني لمنصات يوتيوب، جوجل، ميتا، تيك توك، إكس، تيليجرام، سناب شات، شركات الهواتف الذكية (Apple, Samsung, Xiaomi, Huawei)، أدوات تجفيف نشر الصور ومكافحة الابتزاز (StopNCII, Take It Down)، وأدوات فحص التهديدات والاستخبارات السيبرانية.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {canManage && (
              <>
                <button
                  onClick={handleResetToDefault}
                  className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="استعادة كافة الروابط الافتراضية المحدثة والشاملة"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-cyan-400" /> استعادة الدليل الشامل ({portals.length})
                </button>
                <button
                  onClick={() => handleOpenEdit()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-900/30 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> إضافة بوابة دعم جديدة
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick Section Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <button
          onClick={() => handleSelectQuickTab('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            quickTab === 'all' && selectedCompany === 'all' && selectedCategory === 'all'
              ? 'bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>كافة البوابات ({portals.length})</span>
        </button>

        <button
          onClick={() => handleSelectQuickTab('youtube')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            quickTab === 'youtube'
              ? 'bg-white dark:bg-red-600 text-red-600 dark:text-white shadow-xs font-extrabold'
              : 'text-slate-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400'
          }`}
        >
          <Video className="w-4 h-4 text-red-500" />
          <span>🎥 يوتيوب YouTube ({portals.filter(p => p.company === 'YouTube' || p.platformName.includes('YouTube')).length})</span>
        </button>

        <button
          onClick={() => handleSelectQuickTab('content_protection')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            quickTab === 'content_protection'
              ? 'bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Shield className="w-4 h-4 text-emerald-500" />
          <span>🛡️ حماية المحتوى والابتزاز (StopNCII / DMCA)</span>
        </button>

        <button
          onClick={() => handleSelectQuickTab('infosec')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            quickTab === 'infosec'
              ? 'bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Cpu className="w-4 h-4 text-cyan-500" />
          <span>🔍 أمن المعلومات والتحقيق الجنائي الرقمي</span>
        </button>

        <button
          onClick={() => handleSelectQuickTab('phones')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            quickTab === 'phones'
              ? 'bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Smartphone className="w-4 h-4 text-amber-500" />
          <span>📱 شركات الهواتف (Apple, Samsung, Xiaomi)</span>
        </button>

        <button
          onClick={() => handleSelectQuickTab('social')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            quickTab === 'social'
              ? 'bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Lock className="w-4 h-4 text-indigo-400" />
          <span>💬 منصات السوشيال ميديا (Meta, TikTok, X, Telegram)</span>
        </button>

        <button
          onClick={() => handleSelectQuickTab('hosting_cloud')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            quickTab === 'hosting_cloud'
              ? 'bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Server className="w-4 h-4 text-orange-400" />
          <span>☁️ الاستضافات وإسقاط النطاقات (Cloudflare, AWS)</span>
        </button>
      </div>

      {/* Interactive Company Selection Cards Grid */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            <span>تصفية مخصصة حسب الشركة / المنظمة ({companies.length - 1} شركة):</span>
          </label>
          <div className="flex items-center gap-2">
            {isFilterActive && (
              <button
                onClick={handleClearAllFilters}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
              >
                <RefreshCw className="w-3 h-3" /> إعادة ضبط التصفية
              </button>
            )}
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
              {filteredPortals.length} بوابة معروضة
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
          <button
            onClick={() => handleSelectCompany('all')}
            className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
              selectedCompany === 'all'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20 font-bold ring-2 ring-indigo-400/40'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-xs font-bold">جميع الشركات</span>
              <Globe className="w-3.5 h-3.5 opacity-70" />
            </div>
            <span className={`text-[10px] font-mono ${selectedCompany === 'all' ? 'text-indigo-100' : 'text-slate-500'}`}>
              {portals.length} بوابة
            </span>
          </button>

          {companies.filter(c => c !== 'all').map(c => {
            const count = portals.filter(p => p.company.toLowerCase() === c.toLowerCase()).length;
            const isSelected = selectedCompany.toLowerCase() === c.toLowerCase();
            const isYt = c.toLowerCase() === 'youtube';
            return (
              <button
                key={c}
                onClick={() => handleSelectCompany(c)}
                className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? isYt 
                      ? 'bg-red-600 text-white border-red-500 shadow-md font-bold ring-2 ring-red-400/40'
                      : 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20 font-bold ring-2 ring-indigo-400/40'
                    : isYt
                      ? 'bg-red-950/20 border-red-800/40 text-red-300 hover:bg-red-900/30'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-bold truncate">{c}</span>
                  {isYt ? (
                    <Video className="w-3 h-3 text-red-400" />
                  ) : (
                    <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-500'}`} />
                  )}
                </div>
                <span className={`text-[10px] font-mono ${isSelected ? 'text-white' : 'text-slate-500'}`}>
                  {count} بوابة
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Category Filters */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3.5 shadow-sm">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="ابحث بالاسم، الأداة، الفئة، الكلمات الدلالية (مثال: يوتيوب، YouTube، StopNCII، فحص روابط، تسريب بريد، سرقة ايفون، فيسبوك مخترق، انتحال)..."
            className="w-full pl-4 pr-11 py-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white px-2 py-1 bg-slate-200 dark:bg-slate-800 rounded-md cursor-pointer"
            >
              مسح
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium ml-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> الفئة المحددة:
          </span>
          {categories.map(cat => (
            <button
              key={cat.key}
              onClick={() => { setSelectedCategory(cat.key); }}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                selectedCategory === cat.key
                  ? 'bg-indigo-600 text-white shadow-xs font-bold'
                  : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {cat.labelAr}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Support Portals */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredPortals.map(portal => (
          <div
            key={portal.id}
            id={`portal-card-${portal.id}`}
            className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border transition-all duration-200 flex flex-col justify-between group hover:shadow-lg ${
              portal.isHidden 
                ? 'opacity-60 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40' 
                : portal.company.toLowerCase() === 'youtube'
                  ? 'border-red-300 dark:border-red-900/50 hover:border-red-500 dark:hover:border-red-600/80 shadow-xs'
                  : portal.isPopular 
                    ? 'border-indigo-300 dark:border-indigo-500/40 hover:border-indigo-500 dark:hover:border-indigo-500/80 shadow-sm' 
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
            }`}
          >
            {/* Top Bar */}
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`px-2.5 py-1 rounded-lg font-bold text-xs border ${
                    portal.company.toLowerCase() === 'youtube'
                      ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-300 border-red-200 dark:border-red-800/40'
                      : 'bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-transparent'
                  }`}>
                    {portal.company}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-[11px] font-mono">
                    {portal.platformName}
                  </span>
                  {portal.isPopular && (
                    <span className="p-1 rounded-md bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20" title="خدمة وأداة شائعة">
                      <Star className="w-3 h-3 fill-amber-400" />
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {canManage && (
                    <>
                      <button
                        onClick={() => handleOpenEdit(portal)}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="تعديل البوابة"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePrompt(portal)}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
                <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors flex items-center gap-1.5">
                  {portal.serviceNameAr}
                </h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">{portal.serviceNameEn}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 line-clamp-3 leading-relaxed">
                  {portal.descriptionAr}
                </p>
              </div>

              {/* Contact Method & Verification */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span className="text-[11px]">طريقة الوصول والعمل:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium text-[11px]">{portal.contactMethodAr}</span>
                </div>

                {portal.officialEmail && (
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="text-[11px] flex items-center gap-1">
                      <Mail className="w-3 h-3 text-indigo-500 dark:text-indigo-400" /> البريد الرسمي:
                    </span>
                    <button
                      onClick={() => handleCopy(portal.officialEmail!, `email-${portal.id}`)}
                      className="text-indigo-600 dark:text-indigo-300 hover:underline font-mono text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      {portal.officialEmail}
                      {copiedId === `email-${portal.id}` ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3 text-slate-400" />
                      )}
                    </button>
                  </div>
                )}

                {portal.officialPhone && (
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="text-[11px] flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-500 dark:text-emerald-400" /> الهاتف المعتمد:
                    </span>
                    <span className="text-slate-800 dark:text-slate-200 font-mono text-[11px]">{portal.officialPhone}</span>
                  </div>
                )}

                {portal.notesAr && (
                  <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/10 text-[11px] text-amber-800 dark:text-amber-300/90 leading-normal flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500 dark:text-amber-400" />
                    <span>{portal.notesAr}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> بوابة رسمية معتمدة
              </span>

              <a
                href={portal.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`px-4 py-2 rounded-xl text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 group-hover:scale-105 ${
                  portal.company.toLowerCase() === 'youtube'
                    ? 'bg-red-600 hover:bg-red-500 shadow-red-600/20'
                    : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
                }`}
              >
                <span>فتح الرابط المباشر</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {filteredPortals.length === 0 && (
        <div className="p-12 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-center space-y-3 shadow-sm">
          <Globe className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto" />
          <h4 className="text-base font-bold text-slate-800 dark:text-slate-300">لم يتم العثور على أي بوابات مطابقة</h4>
          <p className="text-xs text-slate-500">جرب البحث بكلمات أخرى أو أعد ضبط الفلاتر لتصفح جميع البوابات والأدوات.</p>
          <button
            onClick={handleClearAllFilters}
            className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md hover:bg-indigo-500 transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> عرض كافة البوابات ({portals.length})
          </button>
        </div>
      )}

      {/* Add / Edit Portal Modal */}
      {isEditingModalOpen && editingItem && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
          onClick={handleBackdropClick}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto"
          >
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                {editingItem.id ? 'تعديل بوابة الدعم والأداة' : 'إضافة بوابة دعم أو أداة جديدة'}
              </h3>
              <button
                onClick={() => setIsEditingModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">اسم الشركة / المنظمة (Company):</label>
                  <input
                    type="text"
                    required
                    value={editingItem.company || ''}
                    onChange={e => setEditingItem({ ...editingItem, company: e.target.value })}
                    placeholder="مثال: YouTube, StopNCII, Meta, Google, Apple, Samsung"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">اسم المنصة / الخدمة الفرعية:</label>
                  <input
                    type="text"
                    required
                    value={editingItem.platformName || ''}
                    onChange={e => setEditingItem({ ...editingItem, platformName: e.target.value })}
                    placeholder="مثال: YouTube, Instagram, iCloud, VirusTotal, SmartThings"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">عنوان الخدمة / البوابة (بالعربية):</label>
                <input
                  type="text"
                  required
                  value={editingItem.serviceNameAr || ''}
                  onChange={e => setEditingItem({ ...editingItem, serviceNameAr: e.target.value })}
                  placeholder="مثال: استرداد قناة YouTube المخترقة"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">عنوان الخدمة (باللغة الإنجليزية):</label>
                <input
                  type="text"
                  value={editingItem.serviceNameEn || ''}
                  onChange={e => setEditingItem({ ...editingItem, serviceNameEn: e.target.value })}
                  placeholder="e.g. YouTube Compromised Channel Recovery"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">الفئة التصنيفية:</label>
                <select
                  value={editingItem.category || 'general'}
                  onChange={e => setEditingItem({ ...editingItem, category: e.target.value as SupportCategory })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  {categories.filter(c => c.key !== 'all').map(c => (
                    <option key={c.key} value={c.key}>{c.labelAr}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">الرابط الرسمي المعتمد (URL):</label>
                <input
                  type="url"
                  required
                  value={editingItem.officialUrl || ''}
                  onChange={e => setEditingItem({ ...editingItem, officialUrl: e.target.value })}
                  placeholder="https://support.google.com/youtube/answer/..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">البريد الإلكتروني المعتمد (اختياري):</label>
                  <input
                    type="email"
                    value={editingItem.officialEmail || ''}
                    onChange={e => setEditingItem({ ...editingItem, officialEmail: e.target.value })}
                    placeholder="support@company.com"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">رقم الهاتف المعتمد (اختياري):</label>
                  <input
                    type="text"
                    value={editingItem.officialPhone || ''}
                    onChange={e => setEditingItem({ ...editingItem, officialPhone: e.target.value })}
                    placeholder="+966 800..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">الوصف والإرشادات (بالعربية):</label>
                <textarea
                  rows={3}
                  value={editingItem.descriptionAr || ''}
                  onChange={e => setEditingItem({ ...editingItem, descriptionAr: e.target.value })}
                  placeholder="شرح متى وكيف تستخدم هذه البوابة وما هي المتطلبات..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">طريقة المعالجة والاتصال:</label>
                <input
                  type="text"
                  value={editingItem.contactMethodAr || ''}
                  onChange={e => setEditingItem({ ...editingItem, contactMethodAr: e.target.value })}
                  placeholder="مثال: نموذج أمان رسمي ذاتي / دردشة مباشرة"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">ملاحظات إضافية وتلميحات هامة:</label>
                <input
                  type="text"
                  value={editingItem.notesAr || ''}
                  onChange={e => setEditingItem({ ...editingItem, notesAr: e.target.value })}
                  placeholder="مثال: يتطلب رفع بطاقة الهوية / يجب الدخول من متصفح موثوق..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingItem.isPopular || false}
                    onChange={e => setEditingItem({ ...editingItem, isPopular: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-slate-700 dark:text-slate-300 font-bold">تمييز كبوابة شائعة ومهمة ⭐</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingItem.isHidden || false}
                    onChange={e => setEditingItem({ ...editingItem, isHidden: e.target.checked })}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span className="text-slate-700 dark:text-slate-300">إخفاء مؤقت عن الفريق</span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30 cursor-pointer"
                >
                  حفظ البيانات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dependency Aware Delete Modal */}
      {deleteTarget && (
        <DependencyDeleteModal
          isOpen={true}
          itemType="support_portal"
          itemName={deleteTarget.serviceNameAr}
          dependencies={dependencyInfo}
          onConfirm={handleConfirmDelete}
          onCancel={() => { setDeleteTarget(null); setDependencyInfo(null); }}
        />
      )}
    </div>
  );
};
