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
import { PersonalIdea, PersonalGoal, PersonalNote, CasePriority } from '../../types';
import { deleteEntity } from '../../services/database/deleteService';
import { 
  Lock, 
  Plus, 
  Lightbulb, 
  Target, 
  StickyNote, 
  CheckCircle2, 
  Sparkles, 
  Trash2, 
  Edit3, 
  ArrowRight, 
  Layers, 
  Clock, 
  ShieldCheck, 
  Pin,
  Calendar
} from 'lucide-react';
import { logAuditAndEvent } from '../../lib/audit';

export const PersonalAreaModule: React.FC = () => {
  const { userProfile, isSuperAdmin } = useAuth();
  const { isRTL } = useI18n();

  const [activeTab, setActiveTab] = useState<'ideas' | 'goals' | 'notes'>('ideas');
  const [ideas, setIdeas] = useState<PersonalIdea[]>([]);
  const [goals, setGoals] = useState<PersonalGoal[]>([]);
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Ideas Modal
  const [isIdeaModalOpen, setIsIdeaModalOpen] = useState(false);
  const [ideaTitle, setIdeaTitle] = useState('');
  const [ideaDesc, setIdeaDesc] = useState('');
  const [ideaCategory, setIdeaCategory] = useState<PersonalIdea['category']>('business');

  // Goals Modal
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDesc, setGoalDesc] = useState('');
  const [goalTimeframe, setGoalTimeframe] = useState<PersonalGoal['timeframe']>('monthly');
  const [goalTargetValue, setGoalTargetValue] = useState<number | ''>('');
  const [goalUnit, setGoalUnit] = useState('');

  // Notes Modal
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');

  useEffect(() => {
    if (!isSuperAdmin) return;

    const unsubIdeas = onSnapshot(
      query(collection(db, 'personal_ideas'), orderBy('createdAt', 'desc')), 
      (snap) => {
        setIdeas(snap.docs.map(d => ({ id: d.id, ...d.data() } as PersonalIdea)));
        setIsLoading(false);
      },
      () => setIsLoading(false)
    );

    const unsubGoals = onSnapshot(
      query(collection(db, 'personal_goals'), orderBy('createdAt', 'desc')), 
      (snap) => {
        setGoals(snap.docs.map(d => ({ id: d.id, ...d.data() } as PersonalGoal)));
      },
      () => {}
    );

    const unsubNotes = onSnapshot(
      query(collection(db, 'personal_notes'), orderBy('createdAt', 'desc')), 
      (snap) => {
        setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() } as PersonalNote)));
      },
      () => {}
    );

    return () => {
      unsubIdeas();
      unsubGoals();
      unsubNotes();
    };
  }, [isSuperAdmin]);

  // AI Auto-Classification for Idea
  const handleSaveIdea = async () => {
    if (!ideaTitle.trim()) return;

    // Smart classification heuristic
    let autoCat: PersonalIdea['category'] = ideaCategory;
    const lower = (ideaTitle + ' ' + ideaDesc).toLowerCase();
    if (lower.includes('حماية') || lower.includes('أمن') || lower.includes('security') || lower.includes('اختراق')) {
      autoCat = 'security';
    } else if (lower.includes('تطبيق') || lower.includes('موقع') || lower.includes('كود') || lower.includes('برمجة')) {
      autoCat = 'technology';
    } else if (lower.includes('محتوى') || lower.includes('فيديو') || lower.includes('بوست') || lower.includes('نشر')) {
      autoCat = 'content';
    } else if (lower.includes('ربح') || lower.includes('تسويق') || lower.includes('عميل') || lower.includes('استشارة')) {
      autoCat = 'business';
    }

    await addDoc(collection(db, 'personal_ideas'), {
      title: ideaTitle.trim(),
      description: ideaDesc.trim(),
      category: autoCat,
      priority: 'medium',
      status: 'new',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    setIsIdeaModalOpen(false);
    setIdeaTitle('');
    setIdeaDesc('');
  };

  const handleSaveGoal = async () => {
    if (!goalTitle.trim()) return;

    await addDoc(collection(db, 'personal_goals'), {
      title: goalTitle.trim(),
      description: goalDesc.trim(),
      timeframe: goalTimeframe,
      type: 'business',
      targetValue: goalTargetValue ? Number(goalTargetValue) : 100,
      currentValue: 0,
      unit: goalUnit.trim() || '%',
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    setIsGoalModalOpen(false);
    setGoalTitle('');
    setGoalDesc('');
    setGoalTargetValue('');
    setGoalUnit('');
  };

  const handleSaveNote = async () => {
    if (!noteTitle.trim() || !noteContent.trim()) return;

    await addDoc(collection(db, 'personal_notes'), {
      title: noteTitle.trim(),
      content: noteContent.trim(),
      isPinned: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    setIsNoteModalOpen(false);
    setNoteTitle('');
    setNoteContent('');
  };

  if (!isSuperAdmin) {
    return (
      <div className="bg-[#121214] border border-rose-500/30 rounded-xl p-12 text-center text-rose-400">
        <Lock className="w-12 h-12 mx-auto mb-3" />
        <h2 className="text-lg font-bold">{isRTL ? 'منطقة محظورة' : 'Access Restricted'}</h2>
        <p className="text-xs text-[#A1A1AA] mt-1">{isRTL ? 'هذا القسم خاص بالمشرف العام فقط.' : 'Super Admin Only.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#121214] border border-[#27272A] p-5 rounded-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">
                {isRTL ? 'المساحة الشخصية الخاصة (Personal Workspace)' : 'Jaafar Personal OS & Ideation Hub'}
              </h1>
              <span className="text-[11px] bg-amber-500/20 text-amber-300 font-semibold px-2 py-0.5 rounded-full border border-amber-500/30">
                VIP Private
              </span>
            </div>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              {isRTL 
                ? 'خاصة بجعفر بدران فقط: تسجيل الأفكار السريعة، الأهداف الشخصية والمشاريع المستقبلية'
                : 'Super admin private hub for idea capture, personal goals, notes, and strategic planning'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'ideas' && (
            <button
              onClick={() => setIsIdeaModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {isRTL ? 'فكرة جديدة' : 'New Idea'}
            </button>
          )}
          {activeTab === 'goals' && (
            <button
              onClick={() => setIsGoalModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {isRTL ? 'هدف جديد' : 'New Goal'}
            </button>
          )}
          {activeTab === 'notes' && (
            <button
              onClick={() => setIsNoteModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {isRTL ? 'ملاحظة خاصة' : 'New Note'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#27272A] pb-3">
        <button
          onClick={() => setActiveTab('ideas')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            activeTab === 'ideas'
              ? 'bg-amber-600 text-white'
              : 'bg-[#18181B] text-[#A1A1AA] hover:text-white hover:bg-[#27272A]'
          }`}
        >
          <Lightbulb className="w-4 h-4" />
          {isRTL ? 'بنك الأفكار والتصنيف الذكي' : 'Ideas Bank'} ({ideas.length})
        </button>

        <button
          onClick={() => setActiveTab('goals')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            activeTab === 'goals'
              ? 'bg-indigo-600 text-white'
              : 'bg-[#18181B] text-[#A1A1AA] hover:text-white hover:bg-[#27272A]'
          }`}
        >
          <Target className="w-4 h-4" />
          {isRTL ? 'الأهداف ومؤشرات الإنجاز' : 'Goals & OKRs'} ({goals.length})
        </button>

        <button
          onClick={() => setActiveTab('notes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            activeTab === 'notes'
              ? 'bg-emerald-600 text-white'
              : 'bg-[#18181B] text-[#A1A1AA] hover:text-white hover:bg-[#27272A]'
          }`}
        >
          <StickyNote className="w-4 h-4" />
          {isRTL ? 'الملاحظات الشخصية' : 'Private Notes'} ({notes.length})
        </button>
      </div>

      {/* Ideas Tab */}
      {activeTab === 'ideas' && (
        <div className="space-y-4">
          {ideas.length === 0 ? (
            <div className="bg-[#121214] border border-[#27272A] rounded-xl p-12 text-center">
              <Lightbulb className="w-12 h-12 text-[#52525B] mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-white mb-1">{isRTL ? 'لا توجد أفكار مسجلة بعد' : 'No Ideas Recorded'}</h3>
              <p className="text-xs text-[#A1A1AA]">{isRTL ? 'سجل أي فكرة خطرت ببالك وسيقوم الذكاء الاصطناعي بتصنيفها تلقائياً' : 'Capture raw ideas with automatic classification'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ideas.map((idea) => (
                <div key={idea.id} className="bg-[#121214] border border-[#27272A] hover:border-[#3F3F46] rounded-xl p-5 flex flex-col justify-between transition-colors">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        {idea.category}
                      </span>
                      <span className="text-[10px] bg-[#18181B] text-[#A1A1AA] px-2 py-0.5 rounded border border-[#27272A]">
                        {idea.status}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white mb-1.5">{idea.title}</h4>
                    <p className="text-xs text-[#A1A1AA] leading-relaxed mb-4 whitespace-pre-wrap">
                      {idea.description || (isRTL ? 'لا يوجد تفاصيل إضافية' : 'No details')}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#27272A] flex items-center justify-between">
                    <button
                      onClick={async () => {
                        // Convert to Task
                        await addDoc(collection(db, 'tasks'), {
                          caseId: 'personal',
                          title: `[فكرة] ${idea.title}`,
                          description: idea.description,
                          priority: 'medium',
                          status: 'todo',
                          assignedTo: { uid: userProfile?.uid || 'super_admin', name: userProfile?.displayName || 'Jaafar' },
                          createdAt: serverTimestamp(),
                          createdBy: { uid: userProfile?.uid || 'super_admin', name: userProfile?.displayName || 'Jaafar' }
                        });
                        await updateDoc(doc(db, 'personal_ideas', idea.id), { status: 'implemented' });
                        alert(isRTL ? 'تم تحويل الفكرة إلى مهمة عمل في النظام!' : 'Converted to Task!');
                      }}
                      className="text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                    >
                      {isRTL ? 'تحويل لمهمة عمل →' : 'Convert to Task →'}
                    </button>

                    <button
                      onClick={async () => {
                        if (window.confirm(isRTL ? 'حذف هذه الفكرة؟' : 'Delete idea?')) {
                          setIdeas(prev => prev.filter(i => i.id !== idea.id));
                          await deleteEntity('personal_idea', idea.id, userProfile, {
                            customTitle: idea.title,
                            reason: 'حذف فكرة شخصية'
                          });
                        }
                      }}
                      className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                      title={isRTL ? 'حذف الفكرة' : 'Delete'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Goals Tab */}
      {activeTab === 'goals' && (
        <div className="space-y-4">
          {goals.length === 0 ? (
            <div className="bg-[#121214] border border-[#27272A] rounded-xl p-12 text-center">
              <Target className="w-12 h-12 text-[#52525B] mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-white mb-1">{isRTL ? 'لا توجد أهداف محددة' : 'No Goals Defined'}</h3>
              <p className="text-xs text-[#A1A1AA]">{isRTL ? 'حدد أهدافك الشهرية والسنوية وتابع تقدمك' : 'Set and track your strategic goals'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {goals.map((g) => {
                const percent = Math.min(100, Math.round(((g.currentValue || 0) / (g.targetValue || 100)) * 100));
                return (
                  <div key={g.id} className="bg-[#121214] border border-[#27272A] rounded-xl p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          {g.timeframe}
                        </span>
                        <span className="text-xs text-white font-bold">
                          {g.currentValue || 0} / {g.targetValue || 100} {g.unit}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-white mb-1">{g.title}</h4>
                      <p className="text-xs text-[#A1A1AA] mb-4">{g.description}</p>

                      <div className="bg-[#18181B] p-3 rounded-lg border border-[#27272A] mb-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-[#71717A]">{isRTL ? 'نسبة الإنجاز:' : 'Progress:'}</span>
                          <span className="font-semibold text-emerald-400">{percent}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-[#27272A] rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#27272A] flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={async () => {
                            const updated = (g.currentValue || 0) + 1;
                            setGoals(prev => prev.map(item => item.id === g.id ? { ...item, currentValue: updated } : item));
                            await updateDoc(doc(db, 'personal_goals', g.id), { currentValue: updated });
                          }}
                          className="px-2 py-1 bg-[#27272A] hover:bg-[#3F3F46] text-white text-[11px] rounded cursor-pointer"
                        >
                          +1 {g.unit}
                        </button>
                        <button
                          onClick={async () => {
                            const updated = Math.max(0, (g.currentValue || 0) - 1);
                            setGoals(prev => prev.map(item => item.id === g.id ? { ...item, currentValue: updated } : item));
                            await updateDoc(doc(db, 'personal_goals', g.id), { currentValue: updated });
                          }}
                          className="px-2 py-1 bg-[#27272A] hover:bg-[#3F3F46] text-white text-[11px] rounded cursor-pointer"
                        >
                          -1
                        </button>
                      </div>

                      <button
                        onClick={async () => {
                          if (window.confirm(isRTL ? 'حذف هذا الهدف؟' : 'Delete goal?')) {
                            setGoals(prev => prev.filter(item => item.id !== g.id));
                            await deleteEntity('personal_goal', g.id, userProfile, {
                              customTitle: g.title,
                              reason: 'حذف هدف شخصي'
                            });
                          }
                        }}
                        className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                        title={isRTL ? 'حذف الهدف' : 'Delete'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Notes Tab */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          {notes.length === 0 ? (
            <div className="bg-[#121214] border border-[#27272A] rounded-xl p-12 text-center">
              <StickyNote className="w-12 h-12 text-[#52525B] mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-white mb-1">{isRTL ? 'لا توجد ملاحظات سرية' : 'No Private Notes'}</h3>
              <p className="text-xs text-[#A1A1AA]">{isRTL ? 'احفظ نصوصك وخواطرك في مكان آمن ومحمي' : 'Keep private thoughts and scratchpads safe'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {notes.map((n) => (
                <div key={n.id} className="bg-[#121214] border border-[#27272A] rounded-xl p-5 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white mb-2">{n.title}</h4>
                    <p className="text-xs text-[#D4D4D8] leading-relaxed whitespace-pre-wrap mb-4">
                      {n.content}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#27272A] flex items-center justify-end">
                    <button
                      onClick={async () => {
                        if (window.confirm(isRTL ? 'حذف هذه الملاحظة؟' : 'Delete note?')) {
                          setNotes(prev => prev.filter(item => item.id !== n.id));
                          await deleteEntity('personal_note', n.id, userProfile, {
                            customTitle: n.title,
                            reason: 'حذف ملاحظة شخصية'
                          });
                        }
                      }}
                      className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                      title={isRTL ? 'حذف الملاحظة' : 'Delete'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Idea Modal */}
      {isIdeaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121214] border border-[#27272A] rounded-xl w-full max-w-md p-5 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-400" />
              {isRTL ? 'تسجيل فكرة جديدة' : 'New Idea'}
            </h3>
            <div>
              <label className="block text-xs text-[#A1A1AA] mb-1">{isRTL ? 'عنوان الفكرة' : 'Title'} *</label>
              <input
                type="text"
                value={ideaTitle}
                onChange={(e) => setIdeaTitle(e.target.value)}
                placeholder={isRTL ? 'مثال: إطلاق بودكاست توعوي أمني' : 'Idea Title'}
                className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-[#A1A1AA] mb-1">{isRTL ? 'شرح وتفاصيل الفكرة' : 'Details'}</label>
              <textarea
                value={ideaDesc}
                onChange={(e) => setIdeaDesc(e.target.value)}
                rows={3}
                className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsIdeaModalOpen(false)} className="px-3 py-1.5 bg-[#27272A] text-white text-xs rounded-lg">{isRTL ? 'إلغاء' : 'Cancel'}</button>
              <button onClick={handleSaveIdea} disabled={!ideaTitle.trim()} className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg">{isRTL ? 'حفظ الفكرة' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Goal Modal */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121214] border border-[#27272A] rounded-xl w-full max-w-md p-5 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-400" />
              {isRTL ? 'تحديد هدف جديد' : 'New Goal'}
            </h3>
            <div>
              <label className="block text-xs text-[#A1A1AA] mb-1">{isRTL ? 'عنوان الهدف' : 'Goal Title'} *</label>
              <input
                type="text"
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                placeholder={isRTL ? 'مثال: حل 50 قضية هذا الشهر' : 'Goal Title'}
                className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#A1A1AA] mb-1">{isRTL ? 'القيمة المستهدفة' : 'Target Value'}</label>
                <input
                  type="number"
                  value={goalTargetValue}
                  onChange={(e) => setGoalTargetValue(e.target.value ? Number(e.target.value) : '')}
                  placeholder="50"
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-[#A1A1AA] mb-1">{isRTL ? 'الوحدة' : 'Unit'}</label>
                <input
                  type="text"
                  value={goalUnit}
                  onChange={(e) => setGoalUnit(e.target.value)}
                  placeholder="قضية / $"
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsGoalModalOpen(false)} className="px-3 py-1.5 bg-[#27272A] text-white text-xs rounded-lg">{isRTL ? 'إلغاء' : 'Cancel'}</button>
              <button onClick={handleSaveGoal} disabled={!goalTitle.trim()} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg">{isRTL ? 'حفظ الهدف' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Note Modal */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121214] border border-[#27272A] rounded-xl w-full max-w-md p-5 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-emerald-400" />
              {isRTL ? 'ملاحظة خاصة' : 'New Note'}
            </h3>
            <div>
              <label className="block text-xs text-[#A1A1AA] mb-1">{isRTL ? 'العنوان' : 'Title'} *</label>
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder={isRTL ? 'عنوان الملاحظة' : 'Note Title'}
                className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-[#A1A1AA] mb-1">{isRTL ? 'المحتوى' : 'Content'} *</label>
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={5}
                className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsNoteModalOpen(false)} className="px-3 py-1.5 bg-[#27272A] text-white text-xs rounded-lg">{isRTL ? 'إلغاء' : 'Cancel'}</button>
              <button onClick={handleSaveNote} disabled={!noteTitle.trim() || !noteContent.trim()} className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg">{isRTL ? 'حفظ' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
