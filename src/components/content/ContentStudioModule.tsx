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
import { ContentItem, ContentStatus } from '../../types';
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
  Linkedin
} from 'lucide-react';
import { logAuditAndEvent } from '../../lib/audit';

export const ContentStudioModule: React.FC = () => {
  const { userProfile, isSuperAdmin } = useAuth();
  const { isRTL } = useI18n();

  const [contents, setContents] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'content_studio'), orderBy('createdAt', 'desc')), (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as ContentItem));
      setContents(items);
      setIsLoading(false);
    }, () => setIsLoading(false));

    return () => unsub();
  }, []);

  const handleSaveContent = async () => {
    if (!title.trim() || !bodyText.trim()) return;

    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    const payload = {
      title: title.trim(),
      bodyText: bodyText.trim(),
      platform,
      status,
      scheduledDate: scheduledDate || undefined,
      scheduledTime: scheduledTime || undefined,
      tags,
      notes: notes.trim() || undefined,
      updatedAt: serverTimestamp()
    };

    if (editingContentId) {
      await updateDoc(doc(db, 'content_studio', editingContentId), payload);
      await logAuditAndEvent({
        action: 'CONTENT_UPDATED',
        details: `Updated content piece: ${title}`,
        entityType: 'settings',
        entityId: editingContentId,
        user: userProfile || undefined
      });
    } else {
      const docRef = await addDoc(collection(db, 'content_studio'), {
        ...payload,
        createdAt: serverTimestamp(),
        createdBy: {
          uid: userProfile?.uid || 'super_admin',
          name: userProfile?.displayName || 'Jaafar Bdran'
        }
      });
      await logAuditAndEvent({
        action: 'CONTENT_CREATED',
        details: `Created new content draft: ${title} on ${platform}`,
        entityType: 'settings',
        entityId: docRef.id,
        user: userProfile || undefined
      });
    }

    setIsModalOpen(false);
    resetForm();
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

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredContents = contents.filter(c => {
    const matchesStatus = activeStatus === 'all' || c.status === activeStatus;
    const matchesSearch = searchQuery === '' || 
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.bodyText.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#121214] border border-[#27272A] p-5 rounded-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
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
                ? 'إدارة المنشورات، التغريدات، الأفكار، والجدولة على منصات التواصل المختلفة'
                : 'Plan, draft, schedule, and publish high-impact content across all platforms'}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {isRTL ? 'منشور جديد' : 'New Content Piece'}
        </button>
      </div>

      {/* Filters & Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#71717A] absolute top-2.5 left-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isRTL ? 'بحث في المحتوى والمسودات...' : 'Search content...'}
            className="w-full bg-[#121214] border border-[#27272A] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['all', 'idea', 'draft', 'scheduled', 'published', 'archived'].map((st) => (
            <button
              key={st}
              onClick={() => setActiveStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                activeStatus === st
                  ? 'bg-indigo-600 text-white'
                  : 'bg-[#18181B] text-[#A1A1AA] hover:text-white hover:bg-[#27272A]'
              }`}
            >
              {st === 'all' ? (isRTL ? 'الكل' : 'All') : st}
            </button>
          ))}
        </div>
      </div>

      {/* Content Grid */}
      {filteredContents.length === 0 ? (
        <div className="bg-[#121214] border border-[#27272A] rounded-xl p-12 text-center">
          <Share2 className="w-12 h-12 text-[#52525B] mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white mb-1">{isRTL ? 'لا يوجد محتوى في هذا القسم' : 'No Content Pieces Found'}</h3>
          <p className="text-xs text-[#A1A1AA]">{isRTL ? 'اضغط على "منشور جديد" لبدء كتابة وجدولة محتواك' : 'Click "New Content Piece" to create a draft'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContents.map((c) => (
            <div key={c.id} className="bg-[#121214] border border-[#27272A] hover:border-[#3F3F46] rounded-xl p-5 flex flex-col justify-between transition-colors">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    {c.platform}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase ${
                    c.status === 'published' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    c.status === 'scheduled' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                    c.status === 'draft' ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' :
                    'bg-purple-500/10 text-purple-300 border-purple-500/20'
                  }`}>
                    {c.status}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white mb-2">{c.title}</h3>
                
                <div className="bg-[#18181B] border border-[#27272A] p-3 rounded-lg text-xs text-[#D4D4D8] mb-3 max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {c.bodyText}
                </div>

                {c.tags && c.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {c.tags.map((t, idx) => (
                      <span key={idx} className="text-[10px] text-[#A1A1AA] bg-[#27272A] px-1.5 py-0.5 rounded">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[#27272A] flex items-center justify-between">
                <button
                  onClick={() => handleCopyText(c.id, c.bodyText)}
                  className="flex items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-white transition-colors cursor-pointer"
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
                    className="p-1.5 text-[#A1A1AA] hover:text-white rounded hover:bg-[#27272A] cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={async () => {
                      if (window.confirm(isRTL ? 'حذف هذا المنشور؟' : 'Delete this post?')) {
                        await deleteDoc(doc(db, 'content_studio', c.id));
                      }
                    }}
                    className="p-1.5 text-rose-400 hover:text-rose-300 rounded hover:bg-rose-500/10 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#121214] border border-[#27272A] rounded-xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl">
            
            <div className="p-5 border-b border-[#27272A] flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Share2 className="w-5 h-5 text-indigo-400" />
                {isRTL ? 'كتابة وجدولة محتوى' : 'Compose Content'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#71717A] hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1">{isRTL ? 'عنوان الفكرة / المنشور' : 'Title'} *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={isRTL ? 'مثال: نصائح حماية الحسابات من الانتحال' : 'e.g. Account Security Tips'}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">{isRTL ? 'المنصة المستهدفة' : 'Platform'}</label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as any)}
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="instagram">Instagram</option>
                    <option value="x">X (Twitter)</option>
                    <option value="facebook">Facebook</option>
                    <option value="telegram">Telegram</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="youtube">YouTube</option>
                    <option value="tiktok">TikTok</option>
                    <option value="website">Website / Blog</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">{isRTL ? 'حالة النشر' : 'Status'}</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="idea">Idea / فكرة</option>
                    <option value="draft">Draft / مسودة</option>
                    <option value="scheduled">Scheduled / مجدول</option>
                    <option value="published">Published / تم النشر</option>
                    <option value="archived">Archived / مؤرشف</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1">{isRTL ? 'نص المنشور (Copy & Content)' : 'Body Copy'} *</label>
                <textarea
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  rows={6}
                  placeholder={isRTL ? 'اكتب نص المنشور والهاشتاغات هنا...' : 'Write your copy here...'}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none font-sans leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">{isRTL ? 'تاريخ النشر المجدول' : 'Schedule Date'}</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">{isRTL ? 'الهاشتاغات (مفصولة بفاصلة)' : 'Tags (comma separated)'}</label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="امن_معلومات, تقنية, حماية"
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
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
                onClick={handleSaveContent}
                disabled={!title.trim() || !bodyText.trim()}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                {isRTL ? 'حفظ المنشور' : 'Save Piece'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
