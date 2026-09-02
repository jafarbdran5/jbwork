import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { db } from '../../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { KnowledgeItem, KnowledgeCategory } from '../../types';
import { deleteEntity } from '../../services/database/deleteService';
import { 
  getLocalKnowledgeItems, 
  saveLocalKnowledgeItem, 
  removeLocalKnowledgeItem 
} from '../../lib/offlineStore';
import { COMPREHENSIVE_KNOWLEDGE_GUIDES } from '../../data/knowledgeGuidesData';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Tag, 
  ShieldCheck, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  FileText, 
  ExternalLink,
  Sparkles,
  Filter,
  Bookmark,
  Share2,
  Copy,
  Check,
  Download,
  Printer,
  RefreshCw,
  Layers,
  ArrowRight,
  HelpCircle,
  AlertTriangle,
  X,
  Building2,
  Eye,
  HeartHandshake,
  BrainCircuit,
  Compass
} from 'lucide-react';
import { logAuditAndEvent } from '../../lib/audit';

export const KnowledgeModule: React.FC = () => {
  const { userProfile } = useAuth();
  const { isRTL } = useI18n();

  const [articles, setArticles] = useState<KnowledgeItem[]>(() => {
    const cached = getLocalKnowledgeItems();
    if (cached && cached.length > 0) return cached;
    // Map initial comprehensive seeds with IDs
    return COMPREHENSIVE_KNOWLEDGE_GUIDES.map((seed, idx) => ({
      ...seed,
      id: `kb_seed_${idx + 1}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: { uid: 'system', name: 'منظومة جعفر بدران المعرفية' }
    })) as KnowledgeItem[];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<KnowledgeCategory>('procedure');
  const [platform, setPlatform] = useState('All');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Delete & Restore Confirmation Dialog States (Replaces window.confirm)
  const [guideToDelete, setGuideToDelete] = useState<KnowledgeItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  // Sync with Firestore & Local Storage
  useEffect(() => {
    const local = getLocalKnowledgeItems();
    if (!local || local.length === 0) {
      const initialItems: KnowledgeItem[] = COMPREHENSIVE_KNOWLEDGE_GUIDES.map((seed, idx) => ({
        ...seed,
        id: `kb_seed_${idx + 1}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: { uid: 'system', name: 'منظومة جعفر بدران المعرفية' }
      }));
      localStorage.setItem('jb_cached_knowledge_base', JSON.stringify(initialItems));
      setArticles(initialItems);
    }

    const handleDataChange = (e: any) => {
      if (e?.detail?.type === 'knowledge_base') {
        setArticles(getLocalKnowledgeItems());
      }
    };
    window.addEventListener('jb_data_changed', handleDataChange);

    // Subscribe to Firestore collection
    let unsub = () => {};
    try {
      unsub = onSnapshot(query(collection(db, 'knowledge_base'), orderBy('createdAt', 'desc')), async (snap) => {
        if (!snap.empty) {
          const remoteItems = snap.docs.map(d => ({ id: d.id, ...d.data() } as KnowledgeItem));
          
          // Merge local and remote
          const localList = getLocalKnowledgeItems();
          const combinedMap = new Map<string, KnowledgeItem>();
          
          // Add default seeds first
          COMPREHENSIVE_KNOWLEDGE_GUIDES.forEach((seed, idx) => {
            const seedId = `kb_seed_${idx + 1}`;
            combinedMap.set(seedId, {
              ...seed,
              id: seedId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdBy: { uid: 'system', name: 'منظومة جعفر بدران المعرفية' }
            });
          });

          localList.forEach(item => combinedMap.set(item.id, item));
          remoteItems.forEach(item => combinedMap.set(item.id, item));

          const merged = Array.from(combinedMap.values());
          setArticles(merged);
          localStorage.setItem('jb_cached_knowledge_base', JSON.stringify(merged));
        }
        setIsLoading(false);
      }, (err) => {
        console.warn('Firestore knowledge_base onSnapshot notice:', err);
        setIsLoading(false);
      });
    } catch (e) {
      console.warn('Firestore subscription failed, running offline-first:', e);
      setIsLoading(false);
    }

    return () => {
      window.removeEventListener('jb_data_changed', handleDataChange);
      unsub();
    };
  }, []);

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (guideToDelete) setGuideToDelete(null);
        else if (showRestoreModal) setShowRestoreModal(false);
        else if (selectedArticle) setSelectedArticle(null);
        else if (isModalOpen) setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [guideToDelete, showRestoreModal, selectedArticle, isModalOpen]);

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast(null);
    }, 2800);
  };

  const handleCopyContent = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    triggerToast(isRTL ? 'تم نسخ نص الدليل بنجاح!' : 'Guide content copied!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePrintArticle = (item: KnowledgeItem) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html dir="${isRTL ? 'rtl' : 'ltr'}" lang="${isRTL ? 'ar' : 'en'}">
        <head>
          <title>${item.title} - منظومة جعفر بدران</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #1e293b; line-height: 1.7; }
            h1 { font-size: 20px; border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 20px; color: #0f172a; }
            .badge { display: inline-block; padding: 4px 10px; background: #e0e7ff; color: #3730a3; border-radius: 6px; font-size: 11px; font-weight: bold; margin-bottom: 15px; }
            .content { white-space: pre-wrap; font-size: 13px; }
            .footer { margin-top: 50px; padding-top: 15px; border-top: 1px solid #cbd5e1; font-size: 10px; color: #64748b; text-align: center; }
          </style>
        </head>
        <body>
          <div class="badge">${item.category.toUpperCase()} | ${item.platform || 'General'}</div>
          <h1>${item.title}</h1>
          <div class="content">${item.content}</div>
          <div class="footer">منظومة جعفر بدران للأمن السيبراني والتحقيقات الجنائية الرقمية - وثيقة داخلية سرية</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  const handleSaveArticle = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim() || !content.trim() || isSaving) return;

    setIsSaving(true);
    const tags = tagsInput.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean);
    const nowIso = new Date().toISOString();
    const targetId = editingId || `kb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const knowledgeItem: KnowledgeItem = {
      id: targetId,
      title: title.trim(),
      category,
      platform: platform.trim() || 'All',
      content: content.trim(),
      tags,
      isVerified: true,
      createdAt: editingId ? (articles.find(a => a.id === targetId)?.createdAt || nowIso) : nowIso,
      updatedAt: nowIso,
      createdBy: {
        uid: userProfile?.uid || 'admin',
        name: userProfile?.displayName || 'جعفر بدران'
      }
    };

    // 1. Optimistic Local Save
    saveLocalKnowledgeItem(knowledgeItem);
    setArticles(prev => {
      const idx = prev.findIndex(a => a.id === targetId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = knowledgeItem;
        return copy;
      }
      return [knowledgeItem, ...prev];
    });

    // 2. Cloud Firestore Background Save
    try {
      if (editingId) {
        await updateDoc(doc(db, 'knowledge_base', targetId), {
          title: knowledgeItem.title,
          category: knowledgeItem.category,
          platform: knowledgeItem.platform,
          content: knowledgeItem.content,
          tags: knowledgeItem.tags,
          isVerified: true,
          updatedAt: serverTimestamp()
        }).catch(err => console.warn('Cloud update notice:', err));

        await logAuditAndEvent({
          action: 'KNOWLEDGE_UPDATED',
          details: `تعديل دليل معرفي: ${title}`,
          entityType: 'settings',
          entityId: targetId,
          user: userProfile || undefined
        }).catch(() => {});
      } else {
        await addDoc(collection(db, 'knowledge_base'), {
          title: knowledgeItem.title,
          category: knowledgeItem.category,
          platform: knowledgeItem.platform,
          content: knowledgeItem.content,
          tags: knowledgeItem.tags,
          isVerified: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: {
            uid: userProfile?.uid || 'admin',
            name: userProfile?.displayName || 'جعفر بدران'
          }
        }).catch(err => console.warn('Cloud create notice:', err));

        await logAuditAndEvent({
          action: 'KNOWLEDGE_CREATED',
          details: `إضافة دليل معرفي جديد: ${title}`,
          entityType: 'settings',
          entityId: targetId,
          user: userProfile || undefined
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('Network sync notice:', err);
    } finally {
      setIsSaving(false);
      setIsModalOpen(false);
      resetForm();
      triggerToast(isRTL ? 'تم حفظ الدليل في قاعدة المعرفة بنجاح!' : 'Guide saved successfully!');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setCategory('procedure');
    setPlatform('All');
    setContent('');
    setTagsInput('');
  };

  const handleConfirmDeleteArticle = async () => {
    if (!guideToDelete) return;
    const item = guideToDelete;
    setIsDeleting(true);

    try {
      removeLocalKnowledgeItem(item.id);
      setArticles(prev => prev.filter(a => a.id !== item.id));
      if (selectedArticle?.id === item.id) setSelectedArticle(null);
      triggerToast(isRTL ? 'تم حذف الدليل بنجاح' : 'Guide removed');

      await deleteEntity('knowledge' as any, item.id, userProfile, {
        customTitle: item.title,
        reason: 'حذف دليل معرفي'
      }).catch(err => console.warn('Cloud delete notice:', err));
    } catch (err) {
      console.warn('Delete action error:', err);
    } finally {
      setIsDeleting(false);
      setGuideToDelete(null);
    }
  };

  const handleConfirmRestoreDefaultSeeds = () => {
    const initialItems: KnowledgeItem[] = COMPREHENSIVE_KNOWLEDGE_GUIDES.map((seed, idx) => ({
      ...seed,
      id: `kb_seed_${idx + 1}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: { uid: 'system', name: 'منظومة جعفر بدران المعرفية' }
    }));
    localStorage.setItem('jb_cached_knowledge_base', JSON.stringify(initialItems));
    setArticles(initialItems);
    setShowRestoreModal(false);
    triggerToast(isRTL ? `تم تحديث الموسوعة: ${initialItems.length} دليل معتمد متوفر الآن!` : `Loaded ${initialItems.length} guides!`);
  };

  const filteredArticles = articles.filter(a => {
    const matchesCat = activeCategory === 'all' || a.category === activeCategory;
    const matchesSearch = searchQuery === '' || 
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.platform && a.platform.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.tags && a.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* Toast Alert */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-indigo-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center justify-between gap-3 text-xs font-semibold animate-fade-in border border-indigo-500/30">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>{successToast}</span>
          </div>
          <button 
            onClick={() => setSuccessToast(null)}
            className="text-indigo-200 hover:text-white p-0.5 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#121214] border border-[#27272A] p-5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">
                {isRTL ? 'موسوعة المعرفة والأدلة الأمنية والجنائية (JB Knowledge)' : 'JB Knowledge Base & Security SOPs'}
              </h1>
              <span className="text-[11px] bg-indigo-500/20 text-indigo-300 font-semibold px-2.5 py-0.5 rounded-full border border-indigo-500/30">
                {articles.length} {isRTL ? 'دليل معتمد' : 'Guides'}
              </span>
            </div>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              {isRTL 
                ? 'مرجعك المتكامل للسياسات، استخبارات OSINT، الدعم والإسعاف النفسي، ومكافحة الابتزاز الإلكتروني'
                : 'Corporate policies, OSINT methodologies, psychological casework & resilience, and official procedures'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setShowRestoreModal(true)}
            title={isRTL ? 'استعادة وتحديث مكتبة الأدلة الرسمية' : 'Reload official library'}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-[#D4D4D8] hover:text-white text-xs font-medium rounded-xl transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
            <span>{isRTL ? 'تحديث الموسوعة الشاملة' : 'Reload Library'}</span>
          </button>

          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>{isRTL ? 'إضافة دليل جديد' : 'Add SOP / Guide'}</span>
          </button>
        </div>
      </div>

      {/* Quick Statistics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#121214] border border-[#27272A] rounded-xl p-3.5 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#A1A1AA] font-medium">{isRTL ? 'سياسات المنصات والشركات' : 'Platform Policies'}</div>
            <div className="text-base font-bold text-white font-mono">
              {articles.filter(a => a.category === 'platform_policy').length}
            </div>
          </div>
        </div>

        <div className="bg-[#121214] border border-[#27272A] rounded-xl p-3.5 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#A1A1AA] font-medium">{isRTL ? 'استخبارات OSINT والأدوات' : 'OSINT & Tools'}</div>
            <div className="text-base font-bold text-white font-mono">
              {articles.filter(a => a.category === 'useful_tool').length}
            </div>
          </div>
        </div>

        <div className="bg-[#121214] border border-[#27272A] rounded-xl p-3.5 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#A1A1AA] font-medium">{isRTL ? 'الأمان والصلابة النفسية' : 'Security & Mental'}</div>
            <div className="text-base font-bold text-white font-mono">
              {articles.filter(a => a.category === 'security_sop').length}
            </div>
          </div>
        </div>

        <div className="bg-[#121214] border border-[#27272A] rounded-xl p-3.5 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#A1A1AA] font-medium">{isRTL ? 'حلول القضايا والتفاوض' : 'Case Solutions'}</div>
            <div className="text-base font-bold text-white font-mono">
              {articles.filter(a => a.category === 'case_solution' || a.category === 'procedure').length}
            </div>
          </div>
        </div>
      </div>

      {/* Search & Categories */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#71717A] absolute top-2.5 left-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isRTL ? 'بحث في الأدلة، OSINT، الإسعاف النفسي، السياسات...' : 'Search SOPs, OSINT, policies...'}
            className="w-full bg-[#121214] border border-[#27272A] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: isRTL ? 'الكل' : 'All' },
            { id: 'platform_policy', label: isRTL ? 'سياسات الشركات' : 'Policies' },
            { id: 'useful_tool', label: isRTL ? 'استخبارات OSINT' : 'OSINT' },
            { id: 'security_sop', label: isRTL ? 'أمان وصحة نفسية' : 'Resilience & SOPs' },
            { id: 'procedure', label: isRTL ? 'إجراءات رسمية' : 'Procedures' },
            { id: 'case_solution', label: isRTL ? 'حلول وتفاوض' : 'Solutions' },
            { id: 'template', label: isRTL ? 'قوالب ونماذج' : 'Templates' }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-[#18181B] text-[#A1A1AA] hover:text-white hover:bg-[#27272A]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Articles */}
      {filteredArticles.length === 0 ? (
        <div className="bg-[#121214] border border-[#27272A] rounded-2xl p-12 text-center">
          <BookOpen className="w-12 h-12 text-[#52525B] mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white mb-1">
            {isRTL ? 'لم يتم العثور على أي أدلة مطابقة' : 'No matching guides found'}
          </h3>
          <p className="text-xs text-[#A1A1AA] max-w-sm mx-auto mb-4">
            {isRTL ? 'جرب البحث بكلمة مفتاحية مختلفة أو استعد المكتبة الشاملة' : 'Try searching with different keywords'}
          </p>
          <button
            onClick={() => setShowRestoreModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{isRTL ? 'استعادة وتحديث الموسوعة' : 'Reload Guides'}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredArticles.map((item) => (
            <div
              key={item.id}
              className="bg-[#121214] border border-[#27272A] hover:border-[#3F3F46] rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-lg shadow-black/20 group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    {item.platform || 'General'}
                  </span>
                  <span className="text-[10px] font-semibold text-[#A1A1AA] bg-[#18181B] px-2 py-0.5 rounded-md border border-[#27272A]">
                    {item.category === 'platform_policy' ? (isRTL ? 'سياسة منصة' : 'Policy') :
                     item.category === 'useful_tool' ? (isRTL ? 'أداة / OSINT' : 'OSINT') :
                     item.category === 'security_sop' ? (isRTL ? 'معيار أمني ونفسي' : 'SOP') :
                     item.category === 'case_solution' ? (isRTL ? 'حل قضية' : 'Solution') :
                     item.category === 'template' ? (isRTL ? 'قالب رسمي' : 'Template') :
                     (isRTL ? 'إجراء رسمي' : 'Procedure')}
                  </span>
                </div>

                <h3 
                  onClick={() => setSelectedArticle(item)}
                  className="text-sm font-bold text-white mb-2 leading-snug hover:text-indigo-400 transition-colors cursor-pointer"
                >
                  {item.title}
                </h3>

                <p 
                  onClick={() => setSelectedArticle(item)}
                  className="text-xs text-[#A1A1AA] line-clamp-3 leading-relaxed mb-3 cursor-pointer"
                >
                  {item.content.replace(/[#*`_]/g, '')}
                </p>

                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {item.tags.slice(0, 4).map((t, idx) => (
                      <span key={idx} className="text-[10px] text-[#A1A1AA] bg-[#18181B] px-2 py-0.5 rounded-md">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[#27272A] flex items-center justify-between mt-2">
                <button
                  onClick={() => setSelectedArticle(item)}
                  className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer"
                >
                  <span>{isRTL ? 'قراءة الدليل' : 'Read Guide'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleCopyContent(item.content, item.id)}
                    className="p-1.5 text-[#A1A1AA] hover:text-white rounded-lg hover:bg-[#18181B] transition-colors cursor-pointer"
                    title={isRTL ? 'نسخ النص' : 'Copy'}
                  >
                    {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => {
                      setEditingId(item.id);
                      setTitle(item.title);
                      setCategory(item.category);
                      setPlatform(item.platform || 'All');
                      setContent(item.content);
                      setTagsInput((item.tags || []).join(', '));
                      setIsModalOpen(true);
                    }}
                    className="p-1.5 text-[#A1A1AA] hover:text-white rounded-lg hover:bg-[#18181B] transition-colors cursor-pointer"
                    title={isRTL ? 'تعديل' : 'Edit'}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setGuideToDelete(item)}
                    className="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title={isRTL ? 'حذف' : 'Delete'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {guideToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#121214] border border-rose-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {isRTL ? 'تأكيد حذف الدليل المعرفي' : 'Confirm Guide Deletion'}
                </h3>
                <p className="text-xs text-[#A1A1AA]">
                  {isRTL ? 'سيتم حذف الدليل ونقله لسجل المحذوفات' : 'Guide will be removed'}
                </p>
              </div>
            </div>

            <div className="bg-[#18181B] border border-[#27272A] p-3.5 rounded-xl text-xs text-[#D4D4D8]">
              <span className="font-semibold text-white block mb-1">{guideToDelete.title}</span>
              <span className="text-[11px] text-[#A1A1AA]">{guideToDelete.platform || 'General'} | {guideToDelete.category}</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setGuideToDelete(null)}
                className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteArticle}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-rose-600/20 cursor-pointer flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? (isRTL ? 'جاري الحذف...' : 'Deleting...') : (isRTL ? 'تأكيد الحذف' : 'Delete')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Library Confirmation Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#121214] border border-indigo-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-indigo-400">
              <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {isRTL ? 'تحديث واستعادة الموسوعة الشاملة' : 'Reload Official Knowledge Library'}
                </h3>
                <p className="text-xs text-[#A1A1AA]">
                  {isRTL ? 'تحميل أكثر من 40 دليلاً معتمداً في السياسات وOSINT والإسعاف النفسي' : 'Load complete library with all official guides'}
                </p>
              </div>
            </div>

            <p className="text-xs text-[#D4D4D8] leading-relaxed">
              {isRTL 
                ? 'سيتم تحديث الموسوعة المحلية بكافة الأدلة الرسمية المعتمدة لمنظومة جعفر بدران بما فيها أحدث بروتوكولات التحقيق وسياسات الشركات.'
                : 'This will load and refresh all certified SOPs and guidelines.'}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRestoreModal(false)}
                className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmRestoreDefaultSeeds}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/20 cursor-pointer flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>{isRTL ? 'تحديث الموسوعة الآن' : 'Reload Now'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Article Reader Modal */}
      {selectedArticle && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedArticle(null);
          }}
        >
          <div className="bg-[#121214] border border-[#27272A] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl animate-fade-in my-auto">
            <div className="p-6 border-b border-[#27272A] flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    {selectedArticle.platform || 'General'}
                  </span>
                  <span className="text-[10px] text-[#A1A1AA]">
                    {selectedArticle.category}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-white">
                  {selectedArticle.title}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyContent(selectedArticle.content, selectedArticle.id)}
                  className="p-2 bg-[#18181B] hover:bg-[#27272A] text-white rounded-xl transition-colors cursor-pointer"
                  title={isRTL ? 'نسخ النص' : 'Copy'}
                >
                  {copiedId === selectedArticle.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => setSelectedArticle(null)}
                  className="p-2 bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs sm:text-sm text-[#E4E4E7] leading-relaxed whitespace-pre-wrap font-sans select-text">
              {selectedArticle.content}
            </div>

            {selectedArticle.tags && selectedArticle.tags.length > 0 && (
              <div className="px-6 py-3 border-t border-[#27272A] bg-[#141417] flex flex-wrap gap-1.5 items-center">
                <Tag className="w-3.5 h-3.5 text-[#71717A]" />
                {selectedArticle.tags.map((t, idx) => (
                  <span key={idx} className="text-[10px] text-[#A1A1AA] bg-[#1F1F23] px-2 py-0.5 rounded-md border border-[#27272A]">
                    #{t}
                  </span>
                ))}
              </div>
            )}

            <div className="p-4 border-t border-[#27272A] flex items-center justify-between bg-[#151518]">
              <div className="text-[11px] text-[#71717A] font-mono">
                {isRTL ? 'منظومة جعفر بدران للأدلة والتحقيقات الجنائية الرقمية' : 'JB Forensics & Security System'}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const art = selectedArticle;
                    setSelectedArticle(null);
                    setEditingId(art.id);
                    setTitle(art.title);
                    setCategory(art.category);
                    setPlatform(art.platform || 'All');
                    setContent(art.content);
                    setTagsInput((art.tags || []).join(', '));
                    setIsModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-[#202024] hover:bg-[#27272A] text-white text-xs font-medium rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{isRTL ? 'تعديل الدليل' : 'Edit'}</span>
                </button>

                <button
                  onClick={() => handlePrintArticle(selectedArticle)}
                  className="px-4 py-2 bg-[#202024] hover:bg-[#27272A] text-white text-xs font-medium rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{isRTL ? 'طباعة الوثيقة' : 'Print'}</span>
                </button>

                <button
                  onClick={() => setSelectedArticle(null)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl cursor-pointer transition-colors"
                >
                  {isRTL ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="bg-[#121214] border border-[#27272A] rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl animate-fade-in my-auto">
            
            <div className="p-5 border-b border-[#27272A] flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <span>{editingId ? (isRTL ? 'تعديل الدليل المعرفي' : 'Edit Guide') : (isRTL ? 'إضافة دليل / إجراء قياسي جديد' : 'Add New SOP / Guide')}</span>
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-8 h-8 rounded-lg bg-[#1f1f23] text-[#A1A1AA] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveArticle} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">
                    {isRTL ? 'عنوان الدليل أو الإجراء' : 'Title'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={isRTL ? 'مثال: إجراءات حل مشاكل البلاغات الزائفة وإزالة الحسابات' : 'e.g. False Report Handling SOP'}
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">{isRTL ? 'التصنيف' : 'Category'}</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="platform_policy">{isRTL ? 'سياسات الشركات والمنصات (Platform Policy)' : 'Platform Policy'}</option>
                      <option value="useful_tool">{isRTL ? 'استخبارات OSINT وأدوات تتبع (OSINT Tools)' : 'OSINT Tools'}</option>
                      <option value="security_sop">{isRTL ? 'أمان وصحة نفسية للمحقق (Security & Resilience)' : 'Security & Resilience'}</option>
                      <option value="procedure">{isRTL ? 'إجراء تشغيلي وإسعاف نفسي (Procedure & PFA)' : 'Procedure & PFA'}</option>
                      <option value="case_solution">{isRTL ? 'حل قضية وتفاوض أمني (Case Solution)' : 'Case Solution'}</option>
                      <option value="template">{isRTL ? 'قالب ونموذج رسمي (Template)' : 'Template'}</option>
                      <option value="technical_note">{isRTL ? 'ملاحظات تقنية (Tech Note)' : 'Tech Note'}</option>
                      <option value="guide">{isRTL ? 'دليل إرشادي عام (General Guide)' : 'General Guide'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">{isRTL ? 'المنصة المعنية' : 'Platform'}</label>
                    <input
                      type="text"
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                      placeholder="Meta, Telegram, Apple, Google, OSINT, PFA..."
                      className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">
                    {isRTL ? 'نص الدليل والخطوات التفصيلية (Markdown مدعوم)' : 'Content & Steps'} *
                  </label>
                  <textarea
                    required
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={8}
                    placeholder={isRTL ? 'اكتب الأهداف، المتطلبات، والخطوات العملية هنا...' : 'Write detailed SOP steps here...'}
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none font-sans leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">
                    {isRTL ? 'الكلمات المفتاحية (مفصولة بفاصلة)' : 'Tags'}
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="سياسات_الشركات, OSINT, دعم_نفسي, ابتزاز_الكتروني, نفسية_المحقق"
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="p-5 border-t border-[#27272A] flex items-center justify-end gap-2 bg-[#141417]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={!title.trim() || !content.trim() || isSaving}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/20 cursor-pointer flex items-center gap-2"
                >
                  {isSaving ? (
                    <span>{isRTL ? 'جاري الحفظ...' : 'Saving...'}</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isRTL ? 'حفظ في الموسوعة المعرفية' : 'Save Guide'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
