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
import { ContentItem, ContentStatus } from '../../types';
import { deleteEntity } from '../../services/database/deleteService';
import { 
  getLocalContentItems, 
  saveLocalContentItem, 
  removeLocalContentItem 
} from '../../lib/offlineStore';
import { 
  Share2, 
  Plus, 
  Clock, 
  CheckCircle2, 
  Calendar, 
  Trash2, 
  Edit3, 
  Sparkles, 
  Copy, 
  Check, 
  MessageSquare, 
  Filter, 
  Search,
  Instagram,
  Facebook,
  Twitter,
  Youtube,
  Send,
  Linkedin,
  Lightbulb,
  FileText,
  BookmarkCheck,
  AlertCircle,
  X,
  AlertTriangle
} from 'lucide-react';
import { logAuditAndEvent } from '../../lib/audit';

const QUICK_POST_TEMPLATES = [
  {
    title: '🛡️ نصيحة أمنية: حماية حسابات التواصل من روابط التصيد الاحتيالي',
    platform: 'instagram' as const,
    tags: 'امن_معلومات, حماية_رقمية, تصيد_احتيالي, جعفر_بدران',
    bodyText: `🚨 احذر من الروابط المشبوهة التي تصلك عبر الرسائل الخاصة!

تصلك رسالة تدعي أن حسابك "معرض للحظر بسبب انتهاك حقوق الملكية" أو "عرض توثيق مجاني" وتطلب منك الدخول لرابط لتأكيد هويتك؟
⚠️ هذه روابط تصيد احتيالي (Phishing) تهدف لسرقة كلمة المرور ورمز الأمان.

💡 3 قواعد لحماية حسابك:
1️⃣ لا تفتح أي رابط يدعي أنه من إدارة المنصة في الخاص.
2️⃣ فعّل المصادقة الثنائية (2FA) عبر تطبيقات مثل Google Authenticator وليس الرسائل القصيرة.
3️⃣ تحقق دائماً من عنوان الموقع في شريط المتصفح.

🔒 منظومة جعفر بدران للأمن الرقمي والتحقيقات الجنائية`
  },
  {
    title: '🚨 خطوات الطوارئ الفورية عند التعرض للابتزاز الإلكتروني',
    platform: 'facebook' as const,
    tags: 'ابتزاز_الكتروني, توعية_امنية, امان_رقمي, مساعدة',
    bodyText: `إذا تعرضت أنت أو أي شخص تعرفه للتهديد والابتزاز الإلكتروني، إليك الخطوات التقنية الصحيحة لحماية نفسك:

1. 🚫 لا تدفع أي مبالغ مالية إطلاقاً (الدفع يزيد من وتيرة التهديد).
2. 📸 قم بتوثيق كافة المحادثات، أرقام الهواتف، والروابط بلقطات شاشة واضحة مع التاريخ والوقت.
3. 🛑 توقف عن التجاوب مع المبتز ولا تقم بحظره فجأة قبل توثيق الأدلة.
4. 🌐 سجل بياناتك عبر منصة StopNCII لمنع انتشار الصور الحساسة تقنياً على كبرى المنصات.
5. ⚖️ توجه للجهات الأمنية المختصة فوراً وقم بفتح محضر رسمي.

👨‍💻 للاستشارات والتدخل الأمني السريع، نحن في خدمتكم دوماً.`
  },
  {
    title: '🔐 دليلك لتفعيل التحقق بخطوتين وتأمين حساباتك من الاختراق',
    platform: 'x' as const,
    tags: 'أمن_سيبراني, تقنية, حماية_الحسابات',
    bodyText: `كلمة المرور وحدها لم تعد كافية لحماية حساباتك في عام 2026! 🛡️

لماذا يجب تفعيل المصادقة الثنائية (2FA) فوراً؟
✅ يمنع المخترق من الدخول حتى لو حصل على كلمة المرور.
✅ يُشعرك فوراً بأي محاولة دخول مجهولة.
✅ يحمي بياناتك ومحادثاتك الشخصية والتجارية.

📌 استخدم تطبيقات التوثيق:
- Google Authenticator
- Microsoft Authenticator
- YubiKey Hardware Keys`
  }
];

export const ContentStudioModule: React.FC = () => {
  const { userProfile } = useAuth();
  const { isRTL } = useI18n();

  const [contents, setContents] = useState<ContentItem[]>(() => getLocalContentItems());
  const [isLoading, setIsLoading] = useState(false);
  const [activeStatus, setActiveStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContentId, setEditingContentId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [platform, setPlatform] = useState<ContentItem['platform']>('instagram');
  const [status, setStatus] = useState<ContentStatus>('draft');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Delete Confirmation Modal State
  const [postToDelete, setPostToDelete] = useState<ContentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync with Firestore & Local Storage
  useEffect(() => {
    // Initial load from local store
    const local = getLocalContentItems();
    if (local && local.length > 0) {
      setContents(local);
    }

    // Listen to local changes
    const handleDataChange = (e: any) => {
      if (e?.detail?.type === 'content_studio') {
        setContents(getLocalContentItems());
      }
    };
    window.addEventListener('jb_data_changed', handleDataChange);

    // Subscribe to Firestore collection
    let unsub = () => {};
    try {
      unsub = onSnapshot(query(collection(db, 'content_studio'), orderBy('createdAt', 'desc')), (snap) => {
        if (!snap.empty) {
          const remoteItems = snap.docs.map(d => ({ id: d.id, ...d.data() } as ContentItem));
          // Merge remote items with local store
          const localItems = getLocalContentItems();
          const combinedMap = new Map<string, ContentItem>();
          
          localItems.forEach(item => combinedMap.set(item.id, item));
          remoteItems.forEach(item => combinedMap.set(item.id, item));
          
          const merged = Array.from(combinedMap.values());
          setContents(merged);
          localStorage.setItem('jb_cached_content_studio', JSON.stringify(merged));
        }
        setIsLoading(false);
      }, (err) => {
        console.warn('Firestore content_studio onSnapshot error (using offline store):', err);
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
        if (postToDelete) setPostToDelete(null);
        else if (isModalOpen) setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [postToDelete, isModalOpen]);

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast(null);
    }, 2800);
  };

  const handleSaveContent = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim() || !bodyText.trim() || isSaving) return;

    setIsSaving(true);
    const tags = tagsInput.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean);
    const nowIso = new Date().toISOString();

    const targetId = editingContentId || `cnt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    const contentItem: ContentItem = {
      id: targetId,
      title: title.trim(),
      bodyText: bodyText.trim(),
      platform,
      status,
      scheduledDate: scheduledDate || undefined,
      scheduledTime: scheduledTime || undefined,
      tags,
      notes: notes.trim() || undefined,
      createdAt: editingContentId ? (contents.find(c => c.id === targetId)?.createdAt || nowIso) : nowIso,
      updatedAt: nowIso,
      createdBy: {
        uid: userProfile?.uid || 'super_admin',
        name: userProfile?.displayName || 'جعفر بدران'
      }
    };

    // 1. Optimistic Local Save (Instant UI update)
    saveLocalContentItem(contentItem);
    setContents(prev => {
      const idx = prev.findIndex(c => c.id === targetId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = contentItem;
        return copy;
      }
      return [contentItem, ...prev];
    });

    // 2. Cloud Firestore Background Save
    try {
      if (editingContentId) {
        await updateDoc(doc(db, 'content_studio', targetId), {
          title: contentItem.title,
          bodyText: contentItem.bodyText,
          platform: contentItem.platform,
          status: contentItem.status,
          scheduledDate: contentItem.scheduledDate || null,
          scheduledTime: contentItem.scheduledTime || null,
          tags: contentItem.tags || [],
          notes: contentItem.notes || null,
          updatedAt: serverTimestamp()
        }).catch(err => console.warn('Cloud update delayed:', err));

        await logAuditAndEvent({
          action: 'CONTENT_UPDATED',
          details: `تعديل المنشور: ${title}`,
          entityType: 'settings',
          entityId: targetId,
          user: userProfile || undefined
        }).catch(() => {});
      } else {
        await addDoc(collection(db, 'content_studio'), {
          title: contentItem.title,
          bodyText: contentItem.bodyText,
          platform: contentItem.platform,
          status: contentItem.status,
          scheduledDate: contentItem.scheduledDate || null,
          scheduledTime: contentItem.scheduledTime || null,
          tags: contentItem.tags || [],
          notes: contentItem.notes || null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: {
            uid: userProfile?.uid || 'super_admin',
            name: userProfile?.displayName || 'جعفر بدران'
          }
        }).catch(err => console.warn('Cloud create delayed (saved locally):', err));

        await logAuditAndEvent({
          action: 'CONTENT_CREATED',
          details: `إضافة منشور جديد: ${title} (${platform})`,
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
      triggerToast(isRTL ? 'تم حفظ المنشور بنجاح!' : 'Post saved successfully!');
    }
  };

  const resetForm = () => {
    setEditingContentId(null);
    setTitle('');
    setBodyText('');
    setPlatform('instagram');
    setStatus('draft');
    setScheduledDate('');
    setScheduledTime('');
    setTagsInput('');
    setNotes('');
  };

  const handleApplyTemplate = (tmpl: typeof QUICK_POST_TEMPLATES[0]) => {
    setTitle(tmpl.title);
    setPlatform(tmpl.platform);
    setTagsInput(tmpl.tags);
    setBodyText(tmpl.bodyText);
    setStatus('draft');
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    triggerToast(isRTL ? 'تم نسخ نص المنشور!' : 'Post copy copied!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleConfirmDelete = async () => {
    if (!postToDelete) return;
    const item = postToDelete;
    setIsDeleting(true);

    try {
      // 1. Remove from local store immediately
      removeLocalContentItem(item.id);
      setContents(prev => prev.filter(c => c.id !== item.id));

      // 2. Soft delete / move to trash in database
      await deleteEntity('content' as any, item.id, userProfile, {
        customTitle: item.title,
        reason: 'حذف مسودة محتوى من الاستوديو'
      }).catch(err => console.warn('Cloud delete notice:', err));

      triggerToast(isRTL ? 'تم حذف المنشور بنجاح' : 'Post deleted successfully');
    } catch (err) {
      console.warn('Delete action notice:', err);
    } finally {
      setIsDeleting(false);
      setPostToDelete(null);
    }
  };

  const filteredContents = contents.filter(c => {
    const matchesStatus = activeStatus === 'all' || c.status === activeStatus;
    const matchesSearch = searchQuery === '' || 
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.bodyText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.tags && c.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* Toast Alert */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center justify-between gap-3 text-xs font-semibold animate-fade-in border border-emerald-500/30">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>{successToast}</span>
          </div>
          <button 
            onClick={() => setSuccessToast(null)}
            className="text-emerald-200 hover:text-white p-0.5 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#121214] border border-[#27272A] p-5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Share2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">
                {isRTL ? 'استوديو صناعة المحتوى والنشر' : 'Content Studio & Media Hub'}
              </h1>
              <span className="text-[11px] bg-indigo-500/20 text-indigo-300 font-semibold px-2 py-0.5 rounded-full border border-indigo-500/30">
                PRO Studio
              </span>
            </div>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              {isRTL 
                ? 'إدارة المنشورات، التغريدات، الأفكار التوعوية، وجدولة النشر على منصات التواصل الاجتماعي'
                : 'Plan, draft, schedule, and publish high-impact content across all platforms'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isRTL ? 'منشور جديد' : 'New Content Piece'}</span>
          </button>
        </div>
      </div>

      {/* Quick Templates Bar */}
      <div className="bg-[#121214] border border-[#27272A] rounded-2xl p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#D4D4D8] mb-3">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          <span>{isRTL ? 'نماذج وقوالب جاهزة لصناع المحتوى الأمني:' : 'Ready-Made Security Content Templates:'}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {QUICK_POST_TEMPLATES.map((tmpl, idx) => (
            <button
              key={idx}
              onClick={() => {
                handleApplyTemplate(tmpl);
                setIsModalOpen(true);
              }}
              className="text-right p-3 rounded-xl bg-[#18181B] hover:bg-[#202024] border border-[#27272A] hover:border-indigo-500/40 text-xs transition-all cursor-pointer flex flex-col justify-between group"
            >
              <span className="font-semibold text-white group-hover:text-indigo-300 line-clamp-1 mb-1">{tmpl.title}</span>
              <span className="text-[11px] text-[#A1A1AA] line-clamp-2 leading-relaxed">{tmpl.bodyText}</span>
              <div className="mt-2 flex items-center justify-between text-[10px] text-indigo-400 font-medium">
                <span className="uppercase">{tmpl.platform}</span>
                <span>{isRTL ? 'استخدام النموذج ⬅️' : 'Use Template ➡️'}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Filters & Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#71717A] absolute top-2.5 left-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isRTL ? 'بحث في المنشورات والمسودات...' : 'Search content...'}
            className="w-full bg-[#121214] border border-[#27272A] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: isRTL ? 'الكل' : 'All' },
            { id: 'idea', label: isRTL ? 'أفكار' : 'Ideas' },
            { id: 'draft', label: isRTL ? 'مسودات' : 'Drafts' },
            { id: 'scheduled', label: isRTL ? 'مجدولة' : 'Scheduled' },
            { id: 'published', label: isRTL ? 'تم النشر' : 'Published' },
            { id: 'archived', label: isRTL ? 'مؤرشف' : 'Archived' }
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setActiveStatus(st.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                activeStatus === st.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-[#18181B] text-[#A1A1AA] hover:text-white hover:bg-[#27272A]'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Grid */}
      {filteredContents.length === 0 ? (
        <div className="bg-[#121214] border border-[#27272A] rounded-2xl p-12 text-center">
          <Share2 className="w-12 h-12 text-[#52525B] mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white mb-1">
            {isRTL ? 'لا توجد منشورات مسجلة حالياً' : 'No Content Pieces Found'}
          </h3>
          <p className="text-xs text-[#A1A1AA] max-w-sm mx-auto mb-4">
            {isRTL ? 'اضغط على زر "منشور جديد" أو اختر أحد النماذج الجاهزة أعلاه لبدء صياغة محتواك.' : 'Click "New Content Piece" to draft your next post.'}
          </p>
          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isRTL ? 'إنشاء أول منشور' : 'Create First Post'}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContents.map((c) => (
            <div key={c.id} className="bg-[#121214] border border-[#27272A] hover:border-[#3F3F46] rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-lg shadow-black/20">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    {c.platform}
                  </span>
                  <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border uppercase ${
                    c.status === 'published' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    c.status === 'scheduled' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                    c.status === 'draft' ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' :
                    'bg-purple-500/10 text-purple-300 border-purple-500/20'
                  }`}>
                    {c.status === 'published' ? (isRTL ? 'تم النشر' : 'Published') :
                     c.status === 'scheduled' ? (isRTL ? 'مجدول' : 'Scheduled') :
                     c.status === 'draft' ? (isRTL ? 'مسودة' : 'Draft') :
                     c.status === 'idea' ? (isRTL ? 'فكرة' : 'Idea') : c.status}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white mb-2 leading-snug">{c.title}</h3>
                
                <div className="bg-[#18181B] border border-[#27272A] p-3 rounded-xl text-xs text-[#D4D4D8] mb-3 max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text">
                  {c.bodyText}
                </div>

                {c.scheduledDate && (
                  <div className="flex items-center gap-1.5 text-[11px] text-blue-400 mb-2 font-mono">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{c.scheduledDate} {c.scheduledTime ? `(${c.scheduledTime})` : ''}</span>
                  </div>
                )}

                {c.tags && c.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {c.tags.map((t, idx) => (
                      <span key={idx} className="text-[10px] text-[#A1A1AA] bg-[#27272A] px-2 py-0.5 rounded-md font-medium">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[#27272A] flex items-center justify-between mt-2">
                <button
                  onClick={() => handleCopyText(c.id, c.bodyText)}
                  className="flex items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-white transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-[#1f1f23]"
                >
                  {copiedId === c.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === c.id ? (isRTL ? 'تم النسخ!' : 'Copied!') : (isRTL ? 'نسخ النص' : 'Copy')}</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setEditingContentId(c.id);
                      setTitle(c.title);
                      setBodyText(c.bodyText);
                      setPlatform(c.platform);
                      setStatus(c.status);
                      setScheduledDate(c.scheduledDate || '');
                      setScheduledTime(c.scheduledTime || '');
                      setTagsInput((c.tags || []).join(', '));
                      setNotes(c.notes || '');
                      setIsModalOpen(true);
                    }}
                    className="p-1.5 text-[#A1A1AA] hover:text-white rounded-lg hover:bg-[#27272A] transition-colors cursor-pointer"
                    title={isRTL ? 'تعديل' : 'Edit'}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setPostToDelete(c)}
                    className="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title={isRTL ? 'حذف' : 'Delete'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {postToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#121214] border border-rose-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {isRTL ? 'تأكيد حذف المنشور' : 'Confirm Delete'}
                </h3>
                <p className="text-xs text-[#A1A1AA]">
                  {isRTL ? 'سيتم نقل المنشور إلى سلة المحذوفات' : 'Post will be moved to trash'}
                </p>
              </div>
            </div>

            <div className="bg-[#18181B] border border-[#27272A] p-3 rounded-xl text-xs text-[#D4D4D8]">
              <span className="font-semibold text-white block mb-1">{postToDelete.title}</span>
              <span className="text-[#A1A1AA] text-[11px] line-clamp-2">{postToDelete.bodyText}</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPostToDelete(null)}
                className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-rose-600/20 cursor-pointer flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? (isRTL ? 'جاري الحذف...' : 'Deleting...') : (isRTL ? 'تأكيد الحذف' : 'Delete')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compose / Edit Modal */}
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
                <Share2 className="w-5 h-5 text-indigo-400" />
                <span>{editingContentId ? (isRTL ? 'تعديل المنشور' : 'Edit Content') : (isRTL ? 'كتابة وتنسيق منشور جديد' : 'Compose Content Piece')}</span>
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-8 h-8 rounded-lg bg-[#1f1f23] text-[#A1A1AA] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveContent} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">
                    {isRTL ? 'عنوان الفكرة / المنشور' : 'Title'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={isRTL ? 'مثال: نصائح حماية الحسابات من انتحال الهوية' : 'e.g. Account Security & Impersonation Tips'}
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">{isRTL ? 'المنصة المستهدفة' : 'Platform'}</label>
                    <select
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value as any)}
                      className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="instagram">Instagram</option>
                      <option value="facebook">Facebook</option>
                      <option value="x">X (Twitter)</option>
                      <option value="telegram">Telegram</option>
                      <option value="tiktok">TikTok</option>
                      <option value="youtube">YouTube</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="snapchat">Snapchat</option>
                      <option value="website">Website / Blog</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">{isRTL ? 'حالة النشر' : 'Status'}</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="idea">{isRTL ? 'Idea / فكرة' : 'Idea'}</option>
                      <option value="draft">{isRTL ? 'Draft / مسودة' : 'Draft'}</option>
                      <option value="scheduled">{isRTL ? 'Scheduled / مجدول' : 'Scheduled'}</option>
                      <option value="published">{isRTL ? 'Published / تم النشر' : 'Published'}</option>
                      <option value="archived">{isRTL ? 'Archived / مؤرشف' : 'Archived'}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">
                    {isRTL ? 'نص المنشور (Copy & Caption)' : 'Body Copy'} *
                  </label>
                  <textarea
                    required
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    rows={6}
                    placeholder={isRTL ? 'اكتب نص المنشور، الشرح، والوسوم هنا...' : 'Write your copy and captions here...'}
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none font-sans leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">{isRTL ? 'تاريخ النشر المجدول' : 'Schedule Date'}</label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">{isRTL ? 'الهاشتاغات (مفصولة بفاصلة)' : 'Tags (comma separated)'}</label>
                    <input
                      type="text"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder="امن_معلومات, تقنية, حماية"
                      className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
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
                  disabled={!title.trim() || !bodyText.trim() || isSaving}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/20 cursor-pointer flex items-center gap-2"
                >
                  {isSaving ? (
                    <span>{isRTL ? 'جاري الحفظ...' : 'Saving...'}</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isRTL ? 'حفظ المنشور' : 'Save Piece'}</span>
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
