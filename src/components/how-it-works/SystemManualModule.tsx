import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, 
  Search, 
  Sparkles, 
  HelpCircle, 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck, 
  Layers, 
  FileSpreadsheet, 
  Users, 
  Settings, 
  Trash2, 
  KeyRound, 
  LayoutDashboard, 
  Inbox, 
  CheckSquare, 
  Globe, 
  Plus, 
  Edit3, 
  ArrowLeft, 
  Lightbulb, 
  Send,
  Lock
} from 'lucide-react';
import { 
  ManualChapter, 
  ManualArticle, 
  getSavedManualChapters, 
  getSavedManualArticles, 
  saveManualArticle, 
  deleteManualArticle,
  resetManualToDefault
} from '../../lib/systemManualStore';
import { useAuth } from '../../lib/auth';
import { hasPermission } from '../../lib/permissionGuard';
import { DependencyDeleteModal } from '../common/DependencyDeleteModal';
import { checkItemDependencies, DependencyCheckResult } from '../../lib/customizationStore';

interface SystemManualModuleProps {
  onNavigateToView?: (viewId: string) => void;
}

export const SystemManualModule: React.FC<SystemManualModuleProps> = ({ onNavigateToView }) => {
  const { userProfile } = useAuth();
  const canManage = hasPermission(userProfile, 'manual_manage');

  const [chapters, setChapters] = useState<ManualChapter[]>([]);
  const [articles, setArticles] = useState<ManualArticle[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string>('intro');
  const [selectedArticleId, setSelectedArticleId] = useState<string>('art_intro_overview');
  const [searchQuery, setSearchQuery] = useState('');

  // AI Assistant Ask Tab in Manual
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState<{ text: string; sourceArticleTitle?: string } | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Edit / Add Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Partial<ManualArticle> | null>(null);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<ManualArticle | null>(null);
  const [dependencyInfo, setDependencyInfo] = useState<DependencyCheckResult | null>(null);

  const loadData = () => {
    setChapters(getSavedManualChapters());
    setArticles(getSavedManualArticles());
  };

  useEffect(() => {
    loadData();
    const handleDataChanged = (e: any) => {
      if (!e.detail || e.detail.type === 'manual_articles') {
        loadData();
      }
    };
    window.addEventListener('jb_data_changed', handleDataChanged);
    return () => window.removeEventListener('jb_data_changed', handleDataChanged);
  }, []);

  const currentChapter = useMemo(() => {
    return chapters.find(c => c.id === selectedChapterId) || chapters[0];
  }, [chapters, selectedChapterId]);

  const currentChapterArticles = useMemo(() => {
    return articles
      .filter(a => a.chapterId === selectedChapterId)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [articles, selectedChapterId]);

  const selectedArticle = useMemo(() => {
    return articles.find(a => a.id === selectedArticleId) || currentChapterArticles[0] || articles[0];
  }, [articles, selectedArticleId, currentChapterArticles]);

  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase().trim();
    return articles.filter(a => 
      a.titleAr.toLowerCase().includes(q) ||
      a.titleEn.toLowerCase().includes(q) ||
      a.summaryAr.toLowerCase().includes(q) ||
      a.contentMarkdownAr.toLowerCase().includes(q) ||
      a.tags.some(t => t.toLowerCase().includes(q))
    );
  }, [articles, searchQuery]);

  const getChapterIcon = (iconName: string) => {
    switch (iconName) {
      case 'KeyRound': return <KeyRound className="w-4 h-4" />;
      case 'LayoutDashboard': return <LayoutDashboard className="w-4 h-4" />;
      case 'Layers': return <Layers className="w-4 h-4" />;
      case 'Inbox': return <Inbox className="w-4 h-4" />;
      case 'Users': return <Users className="w-4 h-4" />;
      case 'CheckSquare': return <CheckSquare className="w-4 h-4" />;
      case 'FileSpreadsheet': return <FileSpreadsheet className="w-4 h-4" />;
      case 'Globe': return <Globe className="w-4 h-4" />;
      case 'ShieldCheck': return <ShieldCheck className="w-4 h-4" />;
      case 'Trash2': return <Trash2 className="w-4 h-4" />;
      case 'Settings': return <Settings className="w-4 h-4" />;
      default: return <Sparkles className="w-4 h-4" />;
    }
  };

  const handleAskManualAi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuestion.trim()) return;

    setIsAiLoading(true);
    setAiAnswer(null);

    setTimeout(() => {
      const q = aiQuestion.toLowerCase().trim();

      // STRICT PERMISSION CHECK: If asking about admin functions without permission
      const isAdminTask = q.includes('مشرف') || q.includes('صلاحي') || q.includes('دور') || q.includes('ادوار') || q.includes('حذف قسم') || q.includes('تخصيص');
      if (isAdminTask && !hasPermission(userProfile, 'team_manage') && !hasPermission(userProfile, 'sections_manage')) {
        setAiAnswer({
          text: '⚠️ هذه الوظيفة غير متاحة لحسابك حالياً. يرجى التواصل مع المشرف العام للحصول على الصلاحيات المطلوبة.'
        });
        setIsAiLoading(false);
        return;
      }

      // Search articles for closest match
      const matched = articles.find(a => 
        a.titleAr.toLowerCase().includes(q) ||
        a.tags.some(t => q.includes(t.toLowerCase())) ||
        a.contentMarkdownAr.toLowerCase().includes(q)
      );

      if (matched) {
        setAiAnswer({
          text: matched.summaryAr + '\n\n' + (matched.steps ? `خطوات التنفيذ الموصى بها:\n` + matched.steps.map(s => `• ${s.stepNumber}. ${s.titleAr}: ${s.descriptionAr}`).join('\n') : ''),
          sourceArticleTitle: matched.titleAr
        });
      } else {
        setAiAnswer({
          text: `يمكنك تنفيذ ذلك بسهولة من خلال أقسام المنظومة. ابحث في قائمة فصول الدليل على اليمين للاطلاع على الشرح المفصل، أو افتح القسم ذي الصلة.`
        });
      }
      setIsAiLoading(false);
    }, 300);
  };

  const handleOpenEdit = (art?: ManualArticle) => {
    if (art) {
      setEditingArticle({ ...art });
    } else {
      setEditingArticle({
        chapterId: selectedChapterId,
        titleAr: '',
        titleEn: '',
        summaryAr: '',
        summaryEn: '',
        contentMarkdownAr: '',
        contentMarkdownEn: '',
        tags: [],
        sortOrder: currentChapterArticles.length + 1,
        isImportant: false
      });
    }
    setIsEditModalOpen(true);
  };

  const handleSaveArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArticle || !editingArticle.titleAr || !editingArticle.contentMarkdownAr) return;

    saveManualArticle(editingArticle as ManualArticle, userProfile);
    setIsEditModalOpen(false);
    setEditingArticle(null);
    loadData();
  };

  const handleDeletePrompt = (art: ManualArticle) => {
    const deps = checkItemDependencies('case', art.id);
    setDependencyInfo(deps);
    setDeleteTarget(art);
  };

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      deleteManualArticle(deleteTarget.id, userProfile);
      setDeleteTarget(null);
      setDependencyInfo(null);
      loadData();
    }
  };

  return (
    <div id="module-system-manual" className="space-y-6 animate-in fade-in duration-300 pb-12" dir="rtl">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-xs">
                <BookOpen className="w-6 h-6" />
              </div>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                دليل تشغيل واستخدام المنظومة الشامل
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-bold">
                تفاعلي وديناميكي
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-400 max-w-3xl leading-relaxed">
              شرح تفصيلي ودقيق لكافة أقسام ووظائف منظومة جعفر بدران (منع التكرار، ربط Google Sheets، تحويل الطلبات، الصلاحيات، وإدارة القضايا).
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {canManage && (
              <button
                onClick={() => handleOpenEdit()}
                className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-900/30 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> إضافة مقال جديد
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Manual Search & AI Smart Assistant In-Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Search Input */}
        <div className="lg:col-span-1 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <Search className="w-4 h-4 text-cyan-400" /> ابحث في دليل التشغيل:
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="مثال: منع التكرار، ربط الشيت، الصلاحيات..."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* AI Quick Query inside Manual */}
        <div className="lg:col-span-2 p-4 rounded-2xl bg-slate-900/90 border border-cyan-900/30 space-y-3">
          <form onSubmit={handleAskManualAi} className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                اسأل المساعد الذكي داخل الدليل (إجابة فورية حسب الصلاحيات):
              </label>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={aiQuestion}
                onChange={e => setAiQuestion(e.target.value)}
                placeholder="اسأل كيف أنشئ قضية؟ كيف أربط Google Sheet؟ كيف أتعامل مع التكرار؟"
                className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                disabled={isAiLoading || !aiQuestion.trim()}
                className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                {isAiLoading ? 'جاري الإجابة...' : 'اسأل'}
              </button>
            </div>
          </form>

          {aiAnswer && (
            <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-100 space-y-2 animate-in fade-in">
              <p className="whitespace-pre-line leading-relaxed">{aiAnswer.text}</p>
              {aiAnswer.sourceArticleTitle && (
                <p className="text-[11px] text-cyan-400 font-medium">
                  المصدر في الدليل: <strong>{aiAnswer.sourceArticleTitle}</strong>
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Layout: Chapter Selector & Article Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar: Chapters & Article list (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">فصول دليل التشغيل ({chapters.length})</h3>

            <div className="space-y-1.5 max-h-[550px] overflow-y-auto custom-scrollbar pr-1">
              {chapters.map(chap => {
                const isSelected = chap.id === selectedChapterId && !searchQuery;
                const chapArticles = articles.filter(a => a.chapterId === chap.id);

                return (
                  <button
                    key={chap.id}
                    onClick={() => {
                      setSelectedChapterId(chap.id);
                      setSearchQuery('');
                      if (chapArticles[0]) {
                        setSelectedArticleId(chapArticles[0].id);
                      }
                    }}
                    className={`w-full p-3 rounded-xl text-right transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950/50 font-bold'
                        : 'bg-slate-950/40 hover:bg-slate-800/60 text-slate-300 border border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`p-1.5 rounded-lg ${isSelected ? 'bg-cyan-700 text-white' : 'bg-slate-800 text-cyan-400'}`}>
                        {getChapterIcon(chap.iconName)}
                      </span>
                      <div className="text-xs">
                        <p className="line-clamp-1">{chap.titleAr}</p>
                        <p className={`text-[10px] ${isSelected ? 'text-cyan-100' : 'text-slate-500'}`}>
                          {chapArticles.length} مقالات
                        </p>
                      </div>
                    </div>
                    <ChevronLeft className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-600'}`} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content Viewer (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {filteredArticles ? (
            /* Search Results View */
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white">نتائج البحث عن "{searchQuery}" ({filteredArticles.length}):</h3>
              <div className="space-y-3">
                {filteredArticles.map(art => (
                  <div
                    key={art.id}
                    onClick={() => {
                      setSelectedChapterId(art.chapterId);
                      setSelectedArticleId(art.id);
                      setSearchQuery('');
                    }}
                    className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition-all space-y-1.5"
                  >
                    <h4 className="text-xs font-bold text-cyan-300">{art.titleAr}</h4>
                    <p className="text-xs text-slate-300">{art.summaryAr}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : selectedArticle ? (
            /* Full Article Viewer */
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 text-xs font-bold font-mono">
                      {currentChapter.titleAr}
                    </span>
                    {selectedArticle.isImportant && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 text-[11px] font-bold">
                        ⭐ مقال محوري
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg md:text-xl font-bold text-white">{selectedArticle.titleAr}</h2>
                  <p className="text-xs text-slate-400 font-mono">{selectedArticle.titleEn}</p>
                </div>

                <div className="flex items-center gap-2">
                  {selectedArticle.targetModuleId && onNavigateToView && (
                    <button
                      onClick={() => onNavigateToView(selectedArticle.targetModuleId!)}
                      className="px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <span>الانتقال للقسم مباشرة</span>
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {canManage && (
                    <>
                      <button
                        onClick={() => handleOpenEdit(selectedArticle)}
                        className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                        title="تعديل المقال"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePrompt(selectedArticle)}
                        className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition-colors"
                        title="حذف المقال"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Summary Highlight */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 leading-relaxed">
                <p className="font-bold text-slate-300 mb-1">ملخص الإجراء:</p>
                <p>{selectedArticle.summaryAr}</p>
              </div>

              {/* Steps (if available) */}
              {selectedArticle.steps && selectedArticle.steps.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4" /> خطوات التنفيذ الموصى بها:
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedArticle.steps.map(step => (
                      <div key={step.stepNumber} className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-bold flex items-center justify-center font-mono">
                            {step.stepNumber}
                          </span>
                          <h5 className="text-xs font-bold text-white">{step.titleAr}</h5>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">{step.descriptionAr}</p>
                        {step.tipAr && (
                          <p className="text-[11px] text-amber-300/90 pt-1 flex items-center gap-1">
                            <Lightbulb className="w-3 h-3 text-amber-400 shrink-0" /> {step.tipAr}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Detailed Markdown Content */}
              <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 whitespace-pre-line leading-relaxed space-y-3">
                <p>{selectedArticle.contentMarkdownAr}</p>
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-500">
              اختر فصلاً أو مقالاً من القائمة لعرضه.
            </div>
          )}
        </div>
      </div>

      {/* Edit / Add Modal */}
      {isEditModalOpen && editingArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-cyan-400" />
                {editingArticle.id ? 'تعديل مقال في دليل التشغيل' : 'إضافة مقال جديد'}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveArticle} className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">الفصل التابع له:</label>
                  <select
                    value={editingArticle.chapterId || 'intro'}
                    onChange={e => setEditingArticle({ ...editingArticle, chapterId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  >
                    {chapters.map(c => (
                      <option key={c.id} value={c.id}>{c.titleAr}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">القسم المستهدف للرابط (إن وجد):</label>
                  <input
                    type="text"
                    value={editingArticle.targetModuleId || ''}
                    onChange={e => setEditingArticle({ ...editingArticle, targetModuleId: e.target.value })}
                    placeholder="مثال: cases, sheets, team, settings"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">عنوان المقال بالعربية:</label>
                <input
                  type="text"
                  required
                  value={editingArticle.titleAr || ''}
                  onChange={e => setEditingArticle({ ...editingArticle, titleAr: e.target.value })}
                  placeholder="مثال: كيفية فحص التكرار ودمج القضايا"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">الملخص الموجز:</label>
                <textarea
                  rows={2}
                  required
                  value={editingArticle.summaryAr || ''}
                  onChange={e => setEditingArticle({ ...editingArticle, summaryAr: e.target.value })}
                  placeholder="ملخص يظهر في بطاقة الشرح..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">المحتوى والشرح الكامل:</label>
                <textarea
                  rows={6}
                  required
                  value={editingArticle.contentMarkdownAr || ''}
                  onChange={e => setEditingArticle({ ...editingArticle, contentMarkdownAr: e.target.value })}
                  placeholder="اكتب الشرح المفصل والتفاصيل التشغيلية..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-medium">
                  <input
                    type="checkbox"
                    checked={editingArticle.isImportant || false}
                    onChange={e => setEditingArticle({ ...editingArticle, isImportant: e.target.checked })}
                    className="rounded-sm accent-cyan-500"
                  />
                  <span>تمييز كمقال محوري ⭐</span>
                </label>
              </div>

              <div className="p-4 border-t border-slate-800 flex items-center justify-between gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 bg-slate-800 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl shadow-lg"
                >
                  حفظ المقال
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
          itemTitle={deleteTarget.titleAr}
          itemTypeLabel="مقال دليل التشغيل"
          dependencyCheck={dependencyInfo}
        />
      )}
    </div>
  );
};
