import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { db } from '../../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { KnowledgeItem, KnowledgeCategory } from '../../types';
import { deleteEntity } from '../../services/database/deleteService';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Tag, 
  ShieldCheck, 
  FileText, 
  ExternalLink, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Sparkles, 
  Filter,
  Bookmark,
  Share2
} from 'lucide-react';
import { logAuditAndEvent } from '../../lib/audit';

// Initial built-in knowledge seed items if empty
const DEFAULT_KNOWLEDGE_SEEDS: Omit<KnowledgeItem, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>[] = [
  {
    title: 'دليل التعامل مع بلاغات انتحال الشخصية على Instagram & Facebook (Meta)',
    category: 'procedure',
    platform: 'Instagram',
    content: `1. جمع الروابط الأساسية: رابط الحساب الأصلي، ورابط الحساب المنتحل.
2. تجهيز إثبات الهوية الشخصية (بطاقة شخصية أو جواز سفر ساري المفعول).
3. إرسال البلاغ عبر نموذج Meta الرسمي لانتحال الهوية (Impersonation Report Form).
4. إضافة الملاحظات التقنية الخاصة بالأضرار وتوثيق التاريخ.
5. المتابعة بعد 24 إلى 48 ساعة والتأكد من استجابة الدعم الفني.`,
    tags: ['انتحال', 'انستغرام', 'ميتا', 'إجراءات_أمنية'],
    isVerified: true
  },
  {
    title: 'إجراءات استعادة الحسابات المخترقة وتفعيل المصادقة الثنائية 2FA',
    category: 'security_sop',
    platform: 'All',
    content: `1. فحص البريد الإلكتروني الأساسي المرتبط بالحساب والتحقق من أمان كلمة مروره.
2. التحقق من الرسائل الأمنية السابقة (Security Alerts) واسترجاع الحساب عبر الروابط الموثوقة.
3. إلغاء أي جلسات نشطة أو أجهزة غير معروفة مرتبطة بالحساب فور الاستعادة.
4. تفعيل التحقق بخطوتين (2FA) عبر تطبيقات Authenticator (مثل Google Authenticator) وتوليد رموز الاستعادة Backup Codes.`,
    tags: ['استعادة_حساب', 'أمن_معلومات', '2FA'],
    isVerified: true
  },
  {
    title: 'سياسات إزالة المحتوى المسيء والابتزاز الإلكتروني على TikTok و Telegram',
    category: 'platform_policy',
    platform: 'TikTok',
    content: `1. توثيق المحتوى المخالف عبر لقطات الشاشة وروابط المنشورات المباشرة قبل الحذف أو التعديل.
2. رفع البلاغ تحت بند (Harassment and Cyberbullying / Blackmail).
3. تقديم رقم القضية أو المحضر الرسمي في حال وجود ملاحقة قانونية.
4. التواصل المباشر مع مكتب الدعم الإقليمي للمنصة للبلاغات العاجلة.`,
    tags: ['ابتزاز', 'تيك_توك', 'تيليغرام', 'إزالة_محتوى'],
    isVerified: true
  }
];

export const KnowledgeModule: React.FC = () => {
  const { userProfile, isSuperAdmin } = useAuth();
  const { isRTL } = useI18n();

  const [articles, setArticles] = useState<KnowledgeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeItem | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<KnowledgeCategory>('procedure');
  const [platform, setPlatform] = useState('All');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'knowledge_base'), orderBy('createdAt', 'desc')), async (snap) => {
      if (snap.empty && isSuperAdmin) {
        // Seed default guides
        for (const seed of DEFAULT_KNOWLEDGE_SEEDS) {
          await addDoc(collection(db, 'knowledge_base'), {
            ...seed,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: { uid: 'system', name: 'JB Knowledge System' }
          });
        }
      } else {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as KnowledgeItem));
        setArticles(items);
      }
      setIsLoading(false);
    }, () => setIsLoading(false));

    return () => unsub();
  }, [isSuperAdmin]);

  const handleSaveArticle = async () => {
    if (!title.trim() || !content.trim()) return;

    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    const payload = {
      title: title.trim(),
      category,
      platform,
      content: content.trim(),
      tags,
      isVerified: true,
      updatedAt: serverTimestamp()
    };

    if (editingId) {
      await updateDoc(doc(db, 'knowledge_base', editingId), payload);
      await logAuditAndEvent({
        action: 'KNOWLEDGE_UPDATED',
        details: `Updated guide: ${title}`,
        entityType: 'settings',
        entityId: editingId,
        user: userProfile || undefined
      });
    } else {
      const docRef = await addDoc(collection(db, 'knowledge_base'), {
        ...payload,
        createdAt: serverTimestamp(),
        createdBy: {
          uid: userProfile?.uid || 'super_admin',
          name: userProfile?.displayName || 'Jaafar Bdran'
        }
      });
      await logAuditAndEvent({
        action: 'KNOWLEDGE_CREATED',
        details: `Added new guide to JB Knowledge: ${title}`,
        entityType: 'settings',
        entityId: docRef.id,
        user: userProfile || undefined
      });
    }

    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setCategory('procedure');
    setPlatform('All');
    setContent('');
    setTagsInput('');
  };

  const filteredArticles = articles.filter(a => {
    const matchesCat = activeCategory === 'all' || a.category === activeCategory;
    const matchesSearch = searchQuery === '' || 
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.tags && a.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#121214] border border-[#27272A] p-5 rounded-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">
                {isRTL ? 'قاعدة المعرفة والأدلة الأمنية (JB Knowledge)' : 'JB Knowledge Base & Security SOPs'}
              </h1>
              <span className="text-[11px] bg-indigo-500/20 text-indigo-300 font-semibold px-2 py-0.5 rounded-full border border-indigo-500/30">
                PRO Knowledge
              </span>
            </div>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              {isRTL 
                ? 'الإجراءات القياسية (SOPs)، سياسات المنصات، الحلول السابقة، وقوالب العمل المعتمدة'
                : 'Verified security procedures, platform policies, case solutions, and team operational templates'}
            </p>
          </div>
        </div>

        {isSuperAdmin && (
          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {isRTL ? 'إضافة دليل جديد' : 'Add SOP / Guide'}
          </button>
        )}
      </div>

      {/* Search & Categories */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#71717A] absolute top-2.5 left-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isRTL ? 'بحث بالذكاء الاصطناعي في قاعدة المعرفة...' : 'Search SOPs & procedures...'}
            className="w-full bg-[#121214] border border-[#27272A] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'all', label: isRTL ? 'الكل' : 'All' },
            { id: 'procedure', label: isRTL ? 'إجراءات' : 'Procedures' },
            { id: 'security_sop', label: isRTL ? 'أدلة أمنية (SOPs)' : 'Security SOPs' },
            { id: 'platform_policy', label: isRTL ? 'سياسات المنصات' : 'Platform Policies' },
            { id: 'case_solution', label: isRTL ? 'حلول قضايا سابقة' : 'Solutions' },
            { id: 'template', label: isRTL ? 'قوالب ونماذج' : 'Templates' }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-[#18181B] text-[#A1A1AA] hover:text-white hover:bg-[#27272A]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Articles Grid */}
      {filteredArticles.length === 0 ? (
        <div className="bg-[#121214] border border-[#27272A] rounded-xl p-12 text-center">
          <BookOpen className="w-12 h-12 text-[#52525B] mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white mb-1">{isRTL ? 'لم يتم العثور على مقالات' : 'No Knowledge Items Found'}</h3>
          <p className="text-xs text-[#A1A1AA]">{isRTL ? 'جرب البحث بكلمات أخرى أو أضف دليلاً جديداً' : 'Try another query or create a new SOP'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredArticles.map((art) => (
            <div key={art.id} className="bg-[#121214] border border-[#27272A] hover:border-[#3F3F46] rounded-xl p-5 flex flex-col justify-between transition-colors">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    {art.category}
                  </span>
                  {art.platform && (
                    <span className="text-[10px] bg-[#27272A] text-[#D4D4D8] px-2 py-0.5 rounded">
                      {art.platform}
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-white mb-2 leading-snug">{art.title}</h3>
                
                <p className="text-xs text-[#A1A1AA] line-clamp-3 mb-4 leading-relaxed whitespace-pre-wrap">
                  {art.content}
                </p>

                {art.tags && art.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {art.tags.map((t, idx) => (
                      <span key={idx} className="text-[10px] text-[#A1A1AA] bg-[#18181B] px-1.5 py-0.5 rounded border border-[#27272A]">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[#27272A] flex items-center justify-between">
                <button
                  onClick={() => setSelectedArticle(art)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                >
                  {isRTL ? 'قراءة الدليل كاملاً →' : 'Read Full Guide →'}
                </button>

                {isSuperAdmin && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setEditingId(art.id);
                        setTitle(art.title);
                        setCategory(art.category);
                        setPlatform(art.platform || 'All');
                        setContent(art.content);
                        setTagsInput((art.tags || []).join(', '));
                        setIsModalOpen(true);
                      }}
                      className="p-1 text-[#A1A1AA] hover:text-white rounded hover:bg-[#27272A]"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={async () => {
                        if (window.confirm(isRTL ? 'حذف هذا الدليل؟' : 'Delete this guide?')) {
                          setArticles(prev => prev.filter(a => a.id !== art.id));
                          await deleteEntity('knowledge', art.id, userProfile, {
                            customTitle: art.title,
                            reason: 'حذف دليل معرفي'
                          });
                        }
                      }}
                      className="p-1 text-rose-400 hover:text-rose-300 rounded hover:bg-rose-500/10 cursor-pointer"
                      title={isRTL ? 'حذف الدليل' : 'Delete'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reader Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#121214] border border-[#27272A] rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-[#27272A] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 mb-1 inline-block">
                  {selectedArticle.category}
                </span>
                <h3 className="text-base font-bold text-white">{selectedArticle.title}</h3>
              </div>
              <button onClick={() => setSelectedArticle(null)} className="text-[#71717A] hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs text-[#D4D4D8] leading-relaxed whitespace-pre-wrap font-sans">
              {selectedArticle.content}
            </div>

            <div className="p-4 border-t border-[#27272A] flex items-center justify-end">
              <button
                onClick={() => setSelectedArticle(null)}
                className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                {isRTL ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#121214] border border-[#27272A] rounded-xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-[#27272A] flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                {isRTL ? 'إضافة دليل / إجراء قياسي' : 'Add SOP / Guide'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#71717A] hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1">{isRTL ? 'عنوان الدليل أو الإجراء' : 'Title'} *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={isRTL ? 'مثال: إجراءات حل مشاكل البلاغات الزائفة' : 'Guide Title'}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">{isRTL ? 'التصنيف' : 'Category'}</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="procedure">Procedure / إجراء تشغيلي</option>
                    <option value="security_sop">Security SOP / معيار أمني</option>
                    <option value="platform_policy">Platform Policy / سياسة منصة</option>
                    <option value="case_solution">Case Solution / حل قضية</option>
                    <option value="template">Template / نموذج وقالب</option>
                    <option value="guide">Guide / دليل عام</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">{isRTL ? 'المنصة المعنية' : 'Platform'}</label>
                  <input
                    type="text"
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    placeholder="Instagram, Facebook, X..."
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1">{isRTL ? 'نص الدليل والخطوات بالتفصيل' : 'Content & Steps'} *</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  placeholder={isRTL ? 'اكتب الخطوات والملاحظات هنا...' : 'Write SOP steps here...'}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none font-sans leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1">{isRTL ? 'الكلمات المفتاحية (مفصولة بفاصلة)' : 'Tags'}</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="انتحال, استعادة, توثيق"
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="p-5 border-t border-[#27272A] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSaveArticle}
                disabled={!title.trim() || !content.trim()}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                {isRTL ? 'حفظ في قاعدة المعرفة' : 'Save Guide'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
