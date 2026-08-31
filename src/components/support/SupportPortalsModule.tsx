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
  FileText,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Zap,
  Building2,
  FolderTree,
  SlidersHorizontal,
  Bookmark,
  Share2,
  CheckSquare
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

export interface SupportPortalsModuleProps {
  onSelectCase?: (caseId: string) => void;
  onOpenQuickCaseWithData?: (prefill: { title: string; clientName?: string; clientPhone?: string; notes?: string; links?: string[] }) => void;
}

export interface CompanySector {
  id: string;
  labelAr: string;
  labelEn: string;
  icon: string;
  descriptionAr: string;
  gradient: string;
  matchCompanies: string[];
}

export const SECTORS: CompanySector[] = [
  { 
    id: 'protection', 
    labelAr: 'حماية المحتوى ومكافحة الابتزاز', 
    labelEn: 'Content Protection & Takedown', 
    icon: '🛡️',
    descriptionAr: 'منصات تجفيف نشر الصور ومكافحة الابتزاز الجنسي وحماية القاصرين وحقوق النشر الفيدرالية.',
    gradient: 'from-emerald-950/40 via-slate-900 to-emerald-950/30 border-emerald-500/30 text-emerald-400',
    matchCompanies: ['StopNCII.org', 'NCMEC', 'IWF', 'DMCA.com', 'Meta', 'Google', 'YouTube', 'TikTok', 'X Corp', 'Telegram', 'Snap Inc.', 'Apple', 'Discord', 'Reddit', 'Cloudflare'] 
  },
  { 
    id: 'social', 
    labelAr: 'شبكات التواصل والمراسلة الفورية', 
    labelEn: 'Social Media & Messaging', 
    icon: '💬',
    descriptionAr: 'بوابات أمان واسترداد الحسابات وإزالة الانتحال لمنصات يوتيوب، ميتا، تيك توك، إكس، وتيليجرام.',
    gradient: 'from-indigo-950/40 via-slate-900 to-indigo-950/30 border-indigo-500/30 text-indigo-400',
    matchCompanies: ['YouTube', 'Google', 'Meta', 'TikTok', 'X Corp', 'Telegram', 'Snap Inc.', 'LinkedIn', 'Discord', 'Reddit', 'Pinterest'] 
  },
  { 
    id: 'phones', 
    labelAr: 'الهواتف والعتاد الذكي والأنظمة', 
    labelEn: 'Smartphones & Hardware', 
    icon: '📱',
    descriptionAr: 'بوابات فك قفل التنشيط واسترداد الحسابات وحالات السرقة لأجهزة Apple و Samsung و Xiaomi و Huawei.',
    gradient: 'from-amber-950/40 via-slate-900 to-amber-950/30 border-amber-500/30 text-amber-400',
    matchCompanies: ['Apple', 'Samsung', 'Xiaomi', 'Huawei'] 
  },
  { 
    id: 'infosec', 
    labelAr: 'أدوات التحقيق والاستخبارات السيبرانية', 
    labelEn: 'Infosec & Cyber OSINT', 
    icon: '🔍',
    descriptionAr: 'محركات فحص الروابط الخبيثة، قواعد تسريب البيانات، فحص النطاقات وعناوين IP وسجلات WHOIS.',
    gradient: 'from-cyan-950/40 via-slate-900 to-cyan-950/30 border-cyan-500/30 text-cyan-400',
    matchCompanies: ['Security Tools', 'Have I Been Pwned', 'URLScan.io', 'Shodan', 'Cisco / PhishTank', '2FA Directory', 'MXToolbox', 'IPQualityScore', 'VirusTotal', 'AbuseIPDB', 'Criminal IP', 'WHOIS Lookup'] 
  },
  { 
    id: 'cloud', 
    labelAr: 'الاستضافات والنطاقات وإسقاط المواقع', 
    labelEn: 'Cloud, Hosting & Abuse', 
    icon: '☁️',
    descriptionAr: 'بوابات الإبلاغ عن الاستضافات المخالفة، إسقاط المواقع الاحتيالية، مزودي السحابة والبريد المشفر.',
    gradient: 'from-blue-950/40 via-slate-900 to-blue-950/30 border-blue-500/30 text-blue-400',
    matchCompanies: ['Cloudflare', 'Namecheap', 'GoDaddy', 'Hostinger', 'Amazon AWS', 'Google Cloud / Chronicle', 'ICANN', 'Proton', 'Yahoo', 'Microsoft'] 
  },
  { 
    id: 'crypto_ai', 
    labelAr: 'الذكاء الاصطناعي والمنصات المالية', 
    labelEn: 'AI & Fintech Security', 
    icon: '🤖',
    descriptionAr: 'بوابات السلامة ومكافحة الاحتيال لمنصات الذكاء الاصطناعي ومحافظ العملات المشفرة والمدفوعات.',
    gradient: 'from-purple-950/40 via-slate-900 to-purple-950/30 border-purple-500/30 text-purple-400',
    matchCompanies: ['OpenAI', 'Microsoft', 'PayPal', 'Binance'] 
  }
];

export const CATEGORY_DEFINITIONS: { key: string; labelAr: string; labelEn: string; icon: string }[] = [
  { key: 'all', labelAr: 'جميع الفئات', labelEn: 'All Categories', icon: '🌐' },
  { key: 'privacy_protection', labelAr: 'حماية المحتوى ومكافحة الابتزاز', labelEn: 'Privacy & Anti-Extortion', icon: '🛡️' },
  { key: 'hacked', labelAr: 'الحسابات المخترقة والأمان', labelEn: 'Compromised Accounts', icon: '🔒' },
  { key: 'impersonation', labelAr: 'انتحال الشخصية والحسابات المزيفة', labelEn: 'Impersonation & Fake Profiles', icon: '👤' },
  { key: 'recovery', labelAr: 'استرداد الحسابات وفك الحظر', labelEn: 'Recovery & Unban Appeals', icon: '🔄' },
  { key: 'content_removal', labelAr: 'إزالة المحتوى القانوني والتشهير', labelEn: 'Legal & Defamation Removal', icon: '⚖️' },
  { key: 'copyright', labelAr: 'حقوق الملكية الفكرية و DMCA', labelEn: 'Copyright & DMCA', icon: '📜' },
  { key: 'infosec_tools', labelAr: 'أدوات أمن المعلومات وفحص الروابط', labelEn: 'Threat Intelligence & Scanners', icon: '🔍' },
  { key: 'phone_hardware', labelAr: 'شركات الهواتف والأجهزة الذكية', labelEn: 'Hardware & Smartphone Lock', icon: '📱' },
  { key: 'ads_business', labelAr: 'مدراء الأعمال والإعلانات', labelEn: 'Business Managers & Ads', icon: '💼' },
  { key: 'safety', labelAr: 'الجرائم الإلكترونية وإسقاط المواقع', labelEn: 'Cybercrime & Abuse Takedown', icon: '🚨' },
  { key: 'hosting_dns', labelAr: 'الاستضافات والنطاقات وسوء الاستخدام', labelEn: 'Web Hosting & Domain Abuse', icon: '☁️' },
  { key: 'finance_crypto', labelAr: 'المنصات المالية والعملات المشفرة', labelEn: 'Crypto & Financial Gateways', icon: '💳' },
  { key: 'ai_tools', labelAr: 'منصات الذكاء الاصطناعي', labelEn: 'AI Platforms & Safety', icon: '🤖' },
  { key: 'email_cloud', labelAr: 'مزودو البريد المشفر والآمن', labelEn: 'Encrypted Mail & Cloud', icon: '✉️' }
];

export const SupportPortalsModule: React.FC<SupportPortalsModuleProps> = ({
  onSelectCase,
  onOpenQuickCaseWithData
}) => {
  const { userProfile } = useAuth();
  const canManage = hasPermission(userProfile, 'support_portals_manage');

  const [portals, setPortals] = useState<SupportPortalItem[]>([]);
  
  // Navigation Hierarchy States
  // Level 1: Sector ('all' or specific sector id)
  const [selectedSectorId, setSelectedSectorId] = useState<string>('all');
  // Level 2: Company ('all' or specific company name)
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  // Level 3: Category within Company ('all' or category key)
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Search & Scope
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<'current' | 'global'>('current');
  
  // View mode
  const [viewLevel, setViewLevel] = useState<'sectors' | 'companies' | 'services'>('sectors');
  
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
  const companyPriorityOrder = [
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
    'Security Tools',
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

  // All distinct companies
  const allCompanies = useMemo(() => {
    const rawList = Array.from(new Set(portals.map(p => p.company))).filter(Boolean) as string[];
    return rawList.sort((a: string, b: string) => {
      const idxA = companyPriorityOrder.indexOf(a);
      const idxB = companyPriorityOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [portals]);

  // Companies filtered by the selected Sector
  const companiesInCurrentSector = useMemo(() => {
    if (selectedSectorId === 'all') {
      return allCompanies;
    }
    const sector = SECTORS.find(s => s.id === selectedSectorId);
    if (!sector) return allCompanies;
    return allCompanies.filter(c => sector.matchCompanies.some(m => m.toLowerCase() === c.toLowerCase()));
  }, [allCompanies, selectedSectorId]);

  // Active sector object
  const activeSector = useMemo(() => {
    return SECTORS.find(s => s.id === selectedSectorId) || null;
  }, [selectedSectorId]);

  // Hierarchical Filtered Portals
  const filteredPortals = useMemo(() => {
    let result = [...portals];

    // Non-admins only see non-hidden portals
    if (!canManage) {
      result = result.filter(p => !p.isHidden);
    }

    const q = searchQuery.trim().toLowerCase();

    // If Global Search is active with a query, bypass hierarchical sector/company restrictions
    if (q && searchScope === 'global') {
      return result.filter(p => 
        p.company.toLowerCase().includes(q) ||
        p.platformName.toLowerCase().includes(q) ||
        p.serviceNameAr.toLowerCase().includes(q) ||
        p.serviceNameEn.toLowerCase().includes(q) ||
        p.descriptionAr.toLowerCase().includes(q) ||
        p.contactMethodAr.toLowerCase().includes(q) ||
        p.officialUrl.toLowerCase().includes(q) ||
        (p.officialEmail && p.officialEmail.toLowerCase().includes(q)) ||
        p.tags.some(t => t.toLowerCase().includes(q))
      ).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    }

    // 1. Sector Filter
    if (selectedSectorId !== 'all') {
      const sector = SECTORS.find(s => s.id === selectedSectorId);
      if (sector) {
        result = result.filter(p => 
          sector.matchCompanies.some(m => m.toLowerCase() === p.company.toLowerCase())
        );
      }
    }

    // 2. Company Filter
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

    // 3. Category Filter
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'privacy_protection') {
        result = result.filter(p => 
          p.category === 'privacy_protection' || 
          p.category === 'content_removal' || 
          p.category === 'copyright' ||
          ['StopNCII.org', 'NCMEC', 'IWF', 'DMCA.com'].includes(p.company) ||
          p.tags.some(t => t.includes('حماية') || t.includes('ابتزاز') || t.includes('خصوصية'))
        );
      } else {
        result = result.filter(p => p.category === selectedCategory);
      }
    }

    // 4. Contextual Search Query Filter
    if (q) {
      result = result.filter(p => 
        p.company.toLowerCase().includes(q) ||
        p.platformName.toLowerCase().includes(q) ||
        p.serviceNameAr.toLowerCase().includes(q) ||
        p.serviceNameEn.toLowerCase().includes(q) ||
        p.descriptionAr.toLowerCase().includes(q) ||
        p.contactMethodAr.toLowerCase().includes(q) ||
        p.officialUrl.toLowerCase().includes(q) ||
        (p.officialEmail && p.officialEmail.toLowerCase().includes(q)) ||
        p.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    return result.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [portals, selectedSectorId, selectedCompany, selectedCategory, searchQuery, searchScope, canManage]);

  // Categories available for the currently selected company
  const availableCategoriesForCompany = useMemo(() => {
    if (selectedCompany === 'all') return CATEGORY_DEFINITIONS;
    const companyPortals = portals.filter(p => p.company.toLowerCase() === selectedCompany.toLowerCase());
    const usedCatKeys = new Set(companyPortals.map(p => p.category));
    return CATEGORY_DEFINITIONS.filter(c => c.key === 'all' || usedCatKeys.has(c.key as any));
  }, [portals, selectedCompany]);

  // Handle Sector Navigation
  const handleSelectSector = (sectorId: string) => {
    setSelectedSectorId(sectorId);
    setSelectedCompany('all');
    setSelectedCategory('all');
    if (sectorId === 'all') {
      setViewLevel('sectors');
    } else {
      setViewLevel('companies');
    }
  };

  // Handle Company Navigation
  const handleSelectCompany = (compName: string) => {
    setSelectedCompany(compName);
    setSelectedCategory('all');
    if (compName === 'all') {
      setViewLevel(selectedSectorId === 'all' ? 'sectors' : 'companies');
    } else {
      setViewLevel('services');
    }
  };

  // Back button flow (Hierarchical step-back)
  const handleStepBack = () => {
    if (searchQuery) {
      setSearchQuery('');
      return;
    }
    if (viewLevel === 'services' && selectedCompany !== 'all') {
      setSelectedCompany('all');
      setSelectedCategory('all');
      setViewLevel(selectedSectorId === 'all' ? 'sectors' : 'companies');
      return;
    }
    if (viewLevel === 'companies' || selectedSectorId !== 'all') {
      setSelectedSectorId('all');
      setSelectedCompany('all');
      setSelectedCategory('all');
      setViewLevel('sectors');
      return;
    }
  };

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setSelectedSectorId('all');
    setSelectedCompany('all');
    setSelectedCategory('all');
    setSearchScope('current');
    setViewLevel('sectors');
  };

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

  const handleCreateCaseFromPortal = (portal: SupportPortalItem) => {
    const prefill = {
      title: `متابعة: ${portal.serviceNameAr} (${portal.company})`,
      notes: `البوابة المستهدفة: ${portal.serviceNameAr}\nالشركة: ${portal.company} / ${portal.platformName}\nالرابط الرسمي: ${portal.officialUrl}\nطريقة التواصل: ${portal.contactMethodAr}${portal.notesAr ? `\nتوجيهات: ${portal.notesAr}` : ''}`,
      links: [portal.officialUrl]
    };

    if (onOpenQuickCaseWithData) {
      onOpenQuickCaseWithData(prefill);
    } else {
      window.dispatchEvent(new CustomEvent('jb_open_quick_case', {
        detail: {
          type: portal.category,
          prefill
        }
      }));
    }
  };

  const handleOpenEdit = (item?: SupportPortalItem) => {
    if (item) {
      setEditingItem({ ...item });
    } else {
      setEditingItem({
        company: selectedCompany !== 'all' ? selectedCompany : 'YouTube',
        platformName: selectedCompany !== 'all' ? selectedCompany : 'YouTube',
        serviceNameAr: '',
        serviceNameEn: '',
        descriptionAr: '',
        descriptionEn: '',
        category: (selectedCategory !== 'all' ? selectedCategory : 'hacked') as SupportCategory,
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

  const isDeepView = selectedSectorId !== 'all' || selectedCompany !== 'all' || searchQuery.trim() !== '';

  return (
    <div id="module-support-portals" className="space-y-5 animate-in fade-in duration-300 pb-12" dir="rtl">
      
      {/* 🧭 TOP HIERARCHICAL HEADER & BREADCRUMB BAR */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-slate-700/60 dark:border-slate-800 shadow-xl relative overflow-hidden text-white">
        <div className="absolute top-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-3">
          {/* Main Title Row */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {isDeepView && (
                <button
                  onClick={handleStepBack}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 shadow-md cursor-pointer transition-all active:scale-95 flex items-center justify-center"
                  title="الرجوع للمستوى السابق"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-xs">
                <Globe className="w-5 h-5" />
              </div>

              <div>
                <h1 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                  دليل بوابات الدعم الأمني وحماية المحتوى
                </h1>
                <p className="text-xs text-slate-300 mt-0.5">
                  هيكل هرمي متدرج: [القطاع ➔ الشركة ➔ البوابة الفرعية ➔ الإجراء الفوري]
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5 font-mono">
                <ShieldCheck className="w-3.5 h-3.5" /> {portals.length} بوابة معتمدة
              </span>

              {canManage && (
                <>
                  <button
                    onClick={handleResetToDefault}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="استعادة كافة الروابط الافتراضية"
                  >
                    <RotateCcw className="w-3 h-3 text-cyan-400" /> استعادة الدليل
                  </button>
                  <button
                    onClick={() => handleOpenEdit()}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-900/30 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> إضافة بوابة
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Dynamic Breadcrumbs Nav */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80 text-xs">
            <button
              onClick={handleClearAllFilters}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                selectedSectorId === 'all' && selectedCompany === 'all' && !searchQuery
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Globe className="w-3 h-3" />
              <span>الرئيسية (كافة القطاعات)</span>
            </button>

            {activeSector && (
              <>
                <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
                <button
                  onClick={() => handleSelectSector(activeSector.id)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    selectedCompany === 'all' && !searchQuery
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <span>{activeSector.icon}</span>
                  <span>{activeSector.labelAr}</span>
                </button>
              </>
            )}

            {selectedCompany !== 'all' && (
              <>
                <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
                <button
                  onClick={() => handleSelectCompany(selectedCompany)}
                  className="px-2.5 py-1 rounded-lg font-bold bg-indigo-600 text-white shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <Building2 className="w-3 h-3" />
                  <span>{selectedCompany}</span>
                </button>
              </>
            )}

            {selectedCategory !== 'all' && (
              <>
                <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
                <span className="px-2.5 py-1 rounded-lg font-bold bg-emerald-700 text-white shadow-xs font-mono">
                  {CATEGORY_DEFINITIONS.find(c => c.key === selectedCategory)?.labelAr || selectedCategory}
                </span>
              </>
            )}

            {searchQuery && (
              <>
                <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
                <span className="px-2.5 py-1 rounded-lg font-mono bg-amber-500/20 border border-amber-500/40 text-amber-300">
                  بحث: "{searchQuery}" ({searchScope === 'global' ? 'شامل' : 'موضعي'})
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 🔍 CONTEXTUAL SEARCH & SCOPE CONTROLS */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={
                selectedCompany !== 'all'
                  ? `ابحث في بوابات شركة ${selectedCompany}... (مثال: اختراق، انتحال، DMCA، استرداد)`
                  : activeSector
                    ? `ابحث داخل قطاع ${activeSector.labelAr}...`
                    : "ابحث بالاسم، الشركة، الفئة، الكلمات الدلالية (مثال: YouTube، StopNCII، فحص روابط، تسريب بريد)..."
              }
              className="w-full pl-16 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 hover:text-white px-2 py-0.5 bg-slate-200 dark:bg-slate-800 rounded-md cursor-pointer"
              >
                مسح
              </button>
            )}
          </div>

          {/* Search Scope Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60 self-stretch sm:self-auto justify-center">
            <button
              onClick={() => setSearchScope('current')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                searchScope === 'current'
                  ? 'bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="البحث داخل السياق والشركة المحددة فقط"
            >
              نطاق محلي
            </button>
            <button
              onClick={() => setSearchScope('global')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                searchScope === 'global'
                  ? 'bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="البحث في كامل الدليل بدون قيود"
            >
              بحث شامل
            </button>
          </div>
        </div>

        {/* Level Indicator & Action info */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <span className="flex items-center gap-1.5 font-medium">
            <FolderTree className="w-3.5 h-3.5 text-indigo-500" />
            المستوى الحالي: {
              selectedCompany !== 'all' 
                ? `بوابات شركة ${selectedCompany}` 
                : activeSector 
                  ? `قطاع: ${activeSector.labelAr}` 
                  : 'الدليل العام لكافة القطاعات'
            }
          </span>
          
          <div className="flex items-center gap-2">
            {isDeepView && (
              <button
                onClick={handleClearAllFilters}
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> إعادة تعيين
              </button>
            )}
            <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-slate-700 dark:text-slate-300 font-bold">
              {filteredPortals.length} بوابة معروضة
            </span>
          </div>
        </div>
      </div>

      {/* 🌟 LEVEL 1: SECTORS OVERVIEW (Rendered when on root or browsing sectors) */}
      {selectedSectorId === 'all' && selectedCompany === 'all' && !searchQuery && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Layers className="w-4 h-4 text-indigo-500" />
              القطاعات والبوابات الرئيسية (المستوى الأول):
            </h2>
            <span className="text-[11px] text-slate-400 font-medium">اختر قطاعاً لاستعراض شركاته التابعة</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {SECTORS.map(sector => {
              const sectorPortals = portals.filter(p => 
                sector.matchCompanies.some(m => m.toLowerCase() === p.company.toLowerCase())
              );
              const distinctCompanies = Array.from(new Set(sectorPortals.map(p => p.company)));

              return (
                <div
                  key={sector.id}
                  onClick={() => handleSelectSector(sector.id)}
                  className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between group hover:shadow-md active:scale-98 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-500/60 dark:hover:border-indigo-500/60`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{sector.icon}</span>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {sector.labelAr}
                          </h3>
                          <p className="text-[10px] text-slate-400 font-mono">{sector.labelEn}</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40 text-[11px] font-mono font-bold">
                        {sectorPortals.length} بوابة
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                      {sector.descriptionAr}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500 font-medium">
                      {distinctCompanies.length} شركة ومنظمة
                    </span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1 group-hover:translate-x-[-4px] transition-transform">
                      <span>تصفح الشركات</span>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 🏢 LEVEL 2: COMPANIES UNDER CURRENT SECTOR */}
      {selectedCompany === 'all' && (selectedSectorId !== 'all' || searchQuery) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-indigo-500" />
              الشركات والمنظمات التابعة ({companiesInCurrentSector.length} شركة):
            </h2>
            <button
              onClick={() => handleSelectSector('all')}
              className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer"
            >
              عرض كافة القطاعات
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {companiesInCurrentSector.map(comp => {
              const count = portals.filter(p => p.company.toLowerCase() === comp.toLowerCase()).length;
              const isYt = comp.toLowerCase() === 'youtube';

              return (
                <button
                  key={comp}
                  onClick={() => handleSelectCompany(comp)}
                  className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between cursor-pointer active:scale-95 group hover:shadow-sm ${
                    isYt
                      ? 'bg-red-950/20 dark:bg-red-950/30 border-red-800/40 hover:border-red-500 text-red-300'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-500 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="text-xs font-bold truncate group-hover:text-indigo-500 transition-colors">
                      {comp}
                    </span>
                    {isYt ? (
                      <Video className="w-3.5 h-3.5 text-red-400" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-indigo-500 group-hover:scale-125 transition-transform" />
                    )}
                  </div>
                  <div className="flex items-center justify-between w-full text-[11px] text-slate-500">
                    <span className="font-mono">{count} بوابة</span>
                    <ChevronLeft className="w-3 h-3 text-slate-400 group-hover:translate-x-[-2px] transition-transform" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 🏢 LEVEL 3: DEDICATED COMPANY HUB HEADER (When a company is selected) */}
      {selectedCompany !== 'all' && (
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white text-base shadow-sm">
                {selectedCompany.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>بوابات وأدوات شركة: {selectedCompany}</span>
                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 text-xs font-mono font-bold">
                    {filteredPortals.length} بوابة متخصصة
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  تصفح بوابات الأمان، الاسترداد، وحماية الحقوق المعتمدة لـ {selectedCompany}.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSelectCompany('all')}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-all flex items-center gap-1"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>الرجوع لقائمة الشركات</span>
              </button>

              {canManage && (
                <button
                  onClick={() => handleOpenEdit()}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer transition-all flex items-center gap-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة بوابة لـ {selectedCompany}</span>
                </button>
              )}
            </div>
          </div>

          {/* Category Tabs for this Company */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-500 font-medium ml-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> تصنيف البوابات:
            </span>
            {availableCategoriesForCompany.map(cat => {
              const isSelected = selectedCategory === cat.key;
              const count = cat.key === 'all' 
                ? portals.filter(p => p.company.toLowerCase() === selectedCompany.toLowerCase()).length
                : portals.filter(p => p.company.toLowerCase() === selectedCompany.toLowerCase() && p.category === cat.key).length;

              return (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs font-bold'
                      : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.labelAr}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 🚀 LEVEL 4: PORTAL ACTION CARDS GRID */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-indigo-500" />
            البوابات والخدمات المباشرة ({filteredPortals.length} خدمة معتمدة):
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">روابط رسمية 100% مع معالجة فورية</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredPortals.map(portal => (
            <div
              key={portal.id}
              id={`portal-card-${portal.id}`}
              className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border transition-all duration-200 flex flex-col justify-between group hover:shadow-lg ${
                portal.isHidden 
                  ? 'opacity-60 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40' 
                  : portal.company.toLowerCase() === 'youtube'
                    ? 'border-red-300 dark:border-red-900/50 hover:border-red-500 shadow-xs'
                    : portal.isPopular 
                      ? 'border-indigo-300 dark:border-indigo-500/40 hover:border-indigo-500 shadow-sm' 
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
              }`}
            >
              {/* Top Bar */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span 
                      onClick={() => handleSelectCompany(portal.company)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-xs border cursor-pointer hover:underline ${
                        portal.company.toLowerCase() === 'youtube'
                          ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-300 border-red-200 dark:border-red-800/40'
                          : 'bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-transparent'
                      }`}
                      title={`عرض جميع بوابات ${portal.company}`}
                    >
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
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="تعديل البوابة"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePrompt(portal)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors leading-snug">
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
                    <span className="text-[11px]">طريقة المعالجة:</span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium text-[11px] truncate max-w-[60%]">{portal.contactMethodAr}</span>
                  </div>

                  {portal.officialEmail && (
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span className="text-[11px] flex items-center gap-1">
                        <Mail className="w-3 h-3 text-indigo-500 dark:text-indigo-400" /> البريد الرسمي:
                      </span>
                      <button
                        onClick={() => handleCopy(portal.officialEmail!, `email-${portal.id}`)}
                        className="text-indigo-600 dark:text-indigo-300 hover:underline font-mono text-[11px] flex items-center gap-1 cursor-pointer"
                        title="انقر للنسخ"
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

              {/* Action Buttons */}
              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleCreateCaseFromPortal(portal)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer"
                  title="فتح قضية جديدة في المنظومة مرتبطة بهذه البوابة"
                >
                  <Plus className="w-3.5 h-3.5 text-indigo-500" />
                  <span>إنشاء قضية</span>
                </button>

                <a
                  href={portal.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`px-3.5 py-1.5 rounded-xl text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 group-hover:scale-102 ${
                    portal.company.toLowerCase() === 'youtube'
                      ? 'bg-red-600 hover:bg-red-500 shadow-red-600/20'
                      : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
                  }`}
                >
                  <span>فتح الرابط الرسمي</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {filteredPortals.length === 0 && (
          <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3 shadow-xs">
            <Globe className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-300">لم يتم العثور على أي بوابات مطابقة للبحث</h4>
            <p className="text-xs text-slate-500">جرب البحث بكلمات أخرى أو أعد ضبط الفلاتر لتصفح جميع البوابات والأدوات.</p>
            <button
              onClick={handleClearAllFilters}
              className="mt-1 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md hover:bg-indigo-500 transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> عرض كافة البوابات ({portals.length})
            </button>
          </div>
        )}
      </div>

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
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
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
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
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
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
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
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                >
                  {CATEGORY_DEFINITIONS.filter(c => c.key !== 'all').map(c => (
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
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">ملاحظات إضافية وتلميحات هامة:</label>
                <input
                  type="text"
                  value={editingItem.notesAr || ''}
                  onChange={e => setEditingItem({ ...editingItem, notesAr: e.target.value })}
                  placeholder="مثال: يتطلب رفع بطاقة الهوية / يجب الدخول من متصفح موثوق..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
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
