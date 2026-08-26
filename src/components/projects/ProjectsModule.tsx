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
import { ProjectItem, ProjectMilestone, CasePriority } from '../../types';
import { 
  Briefcase, 
  Plus, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Users, 
  DollarSign, 
  ExternalLink, 
  Trash2, 
  FolderPlus, 
  CheckSquare, 
  Sparkles,
  ChevronRight,
  Filter,
  Search
} from 'lucide-react';
import { logAuditAndEvent } from '../../lib/audit';

export const ProjectsModule: React.FC<{ onSelectCase?: (caseId: string) => void }> = () => {
  const { userProfile, isSuperAdmin } = useAuth();
  const { isRTL } = useI18n();

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ProjectItem['category']>('internal');
  const [status, setStatus] = useState<ProjectItem['status']>('planning');
  const [priority, setPriority] = useState<CasePriority>('medium');
  const [deadline, setDeadline] = useState('');
  const [budget, setBudget] = useState<number | ''>('');
  const [currency, setCurrency] = useState('USD');
  const [driveFolderUrl, setDriveFolderUrl] = useState('');
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'projects'), orderBy('createdAt', 'desc')), (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as ProjectItem));
      setProjects(items);
      setIsLoading(false);
    }, () => setIsLoading(false));

    return () => unsub();
  }, []);

  const handleSaveProject = async () => {
    if (!title.trim()) return;

    const payload = {
      title: title.trim(),
      description: description.trim(),
      category,
      status,
      priority,
      deadline: deadline || undefined,
      budget: budget ? Number(budget) : 0,
      currency,
      driveFolderUrl: driveFolderUrl.trim() || undefined,
      milestones,
      team: [{ uid: userProfile?.uid || 'super_admin', name: userProfile?.displayName || 'Jaafar Bdran', role: 'Lead' }],
      updatedAt: serverTimestamp()
    };

    if (editingProjectId) {
      await updateDoc(doc(db, 'projects', editingProjectId), payload);
      await logAuditAndEvent({
        action: 'PROJECT_UPDATED',
        details: `Updated project: ${title}`,
        entityType: 'settings',
        entityId: editingProjectId,
        user: userProfile || undefined
      });
    } else {
      const docRef = await addDoc(collection(db, 'projects'), {
        ...payload,
        spentAmount: 0,
        createdAt: serverTimestamp(),
        createdBy: {
          uid: userProfile?.uid || 'super_admin',
          name: userProfile?.displayName || 'Jaafar Bdran'
        }
      });
      await logAuditAndEvent({
        action: 'PROJECT_CREATED',
        details: `Created new project: ${title}`,
        entityType: 'settings',
        entityId: docRef.id,
        user: userProfile || undefined
      });
    }

    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setEditingProjectId(null);
    setTitle('');
    setDescription('');
    setCategory('internal');
    setStatus('planning');
    setPriority('medium');
    setDeadline('');
    setBudget('');
    setCurrency('USD');
    setDriveFolderUrl('');
    setMilestones([]);
    setNewMilestoneTitle('');
  };

  const handleAddMilestone = () => {
    if (!newMilestoneTitle.trim()) return;
    setMilestones([
      ...milestones,
      {
        id: `ms_${Date.now()}`,
        title: newMilestoneTitle.trim(),
        dueDate: deadline || new Date().toISOString().split('T')[0],
        completed: false
      }
    ]);
    setNewMilestoneTitle('');
  };

  const handleToggleMilestone = async (project: ProjectItem, milestoneId: string) => {
    const updatedMilestones = (project.milestones || []).map(m => {
      if (m.id === milestoneId) {
        return { ...m, completed: !m.completed, completedAt: !m.completed ? new Date().toISOString() : null };
      }
      return m;
    });

    await updateDoc(doc(db, 'projects', project.id), {
      milestones: updatedMilestones,
      updatedAt: serverTimestamp()
    });
  };

  const filteredProjects = projects.filter(p => {
    const matchesFilter = filterStatus === 'all' || p.status === filterStatus;
    const matchesSearch = searchQuery === '' || 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#121214] border border-[#27272A] p-5 rounded-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">
                {isRTL ? 'إدارة المشاريع والمبادرات التقنية' : 'Projects & Technical Initiatives'}
              </h1>
              <span className="text-[11px] bg-indigo-500/20 text-indigo-300 font-semibold px-2 py-0.5 rounded-full border border-indigo-500/30">
                PRO Management
              </span>
            </div>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              {isRTL 
                ? 'متابعة المشاريع، المراحل الرئيسية (Milestones)، الميزانيات، وفريق العمل'
                : 'Manage internal and client projects, milestones, budgets, and team allocations'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <button
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {isRTL ? 'مشروع جديد' : 'New Project'}
            </button>
          )}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#71717A] absolute top-2.5 left-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isRTL ? 'بحث في المشاريع...' : 'Search projects...'}
            className="w-full bg-[#121214] border border-[#27272A] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['all', 'planning', 'active', 'on_hold', 'completed'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                filterStatus === st
                  ? 'bg-indigo-600 text-white'
                  : 'bg-[#18181B] text-[#A1A1AA] hover:text-white hover:bg-[#27272A]'
              }`}
            >
              {st === 'all' ? (isRTL ? 'الكل' : 'All') : st}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="bg-[#121214] border border-[#27272A] rounded-xl p-12 text-center">
          <Briefcase className="w-12 h-12 text-[#52525B] mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white mb-1">
            {isRTL ? 'لا توجد مشاريع مطابقة' : 'No Projects Found'}
          </h3>
          <p className="text-xs text-[#A1A1AA] max-w-sm mx-auto">
            {isRTL ? 'يمكنك إنشاء مشروع وتكليف الفريق بمراحله من الزر أعلاه' : 'Create a new project to start tracking milestones and budget'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredProjects.map((proj) => {
            const completedMilestones = (proj.milestones || []).filter(m => m.completed).length;
            const totalMilestones = (proj.milestones || []).length;
            const progressPercent = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

            return (
              <div key={proj.id} className="bg-[#121214] border border-[#27272A] hover:border-[#3F3F46] rounded-xl p-5 flex flex-col justify-between transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      {proj.category || 'project'}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase ${
                      proj.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      proj.status === 'active' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      proj.status === 'on_hold' ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' :
                      'bg-purple-500/10 text-purple-300 border-purple-500/20'
                    }`}>
                      {proj.status}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mb-1">{proj.title}</h3>
                  <p className="text-xs text-[#A1A1AA] line-clamp-2 mb-4 leading-relaxed">
                    {proj.description || (isRTL ? 'لا يوجد وصف للمشروع' : 'No description')}
                  </p>

                  {/* Progress Bar */}
                  {totalMilestones > 0 && (
                    <div className="mb-4 bg-[#18181B] p-3 rounded-lg border border-[#27272A]">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-[#A1A1AA]">{isRTL ? 'نسبة إنجاز المراحل:' : 'Milestones Progress:'}</span>
                        <span className="font-semibold text-white">{completedMilestones} / {totalMilestones} ({progressPercent}%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#27272A] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Milestones Checklist */}
                  <div className="space-y-1.5 mb-4">
                    {(proj.milestones || []).map((m) => (
                      <div 
                        key={m.id}
                        onClick={() => handleToggleMilestone(proj, m.id)}
                        className="flex items-center gap-2 text-xs text-[#D4D4D8] hover:text-white p-1.5 rounded bg-[#18181B] border border-[#27272A] cursor-pointer transition-colors"
                      >
                        <CheckCircle2 className={`w-3.5 h-3.5 ${m.completed ? 'text-emerald-400' : 'text-[#52525B]'}`} />
                        <span className={`flex-1 ${m.completed ? 'line-through text-[#71717A]' : ''}`}>{m.title}</span>
                      </div>
                    ))}
                  </div>

                  {/* Meta Badges */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#A1A1AA] pt-3 border-t border-[#27272A]">
                    {proj.deadline && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#71717A]" />
                        {proj.deadline}
                      </span>
                    )}
                    {proj.budget ? (
                      <span className="flex items-center gap-1 font-semibold text-emerald-400">
                        <DollarSign className="w-3.5 h-3.5" />
                        {proj.budget.toLocaleString()} {proj.currency}
                      </span>
                    ) : null}
                    {proj.driveFolderUrl && (
                      <a
                        href={proj.driveFolderUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300"
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                        {isRTL ? 'مجلد Drive' : 'Drive'}
                      </a>
                    )}
                  </div>
                </div>

                {isSuperAdmin && (
                  <div className="pt-3 mt-3 border-t border-[#27272A] flex items-center justify-end gap-2">
                    <button
                      onClick={async () => {
                        if (window.confirm(isRTL ? 'هل أنت متأكد من حذف هذا المشروع؟' : 'Delete this project?')) {
                          await deleteDoc(doc(db, 'projects', proj.id));
                        }
                      }}
                      className="text-xs text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#121214] border border-[#27272A] rounded-xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl">
            
            <div className="p-5 border-b border-[#27272A] flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-400" />
                {isRTL ? 'إنشاء مشروع تقني جديد' : 'New Project'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#71717A] hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1">{isRTL ? 'اسم المشروع' : 'Project Title'} *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={isRTL ? 'مثال: نظام أتمتة بلاغات منصة X' : 'Project Title'}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1">{isRTL ? 'الوصف والأهداف' : 'Description'}</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">{isRTL ? 'الحالة' : 'Status'}</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="planning">Planning / تخطيط</option>
                    <option value="active">Active / قيد التنفيذ</option>
                    <option value="on_hold">On Hold / معلق</option>
                    <option value="completed">Completed / مكتمل</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">{isRTL ? 'الموعد النهائي (Deadline)' : 'Deadline'}</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">{isRTL ? 'الميزانية التقديرية' : 'Budget'}</label>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value ? Number(e.target.value) : '')}
                    placeholder="0"
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">{isRTL ? 'العملة' : 'Currency'}</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="SYP">SYP (ل.س)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="AED">AED (د.إ)</option>
                  </select>
                </div>
              </div>

              {/* Milestones Builder */}
              <div className="bg-[#18181B] border border-[#27272A] p-4 rounded-lg space-y-3">
                <h4 className="text-xs font-semibold text-white">{isRTL ? 'المراحل الرئيسية (Milestones)' : 'Milestones'}</h4>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newMilestoneTitle}
                    onChange={(e) => setNewMilestoneTitle(e.target.value)}
                    placeholder={isRTL ? 'اسم المرحلة...' : 'Milestone title...'}
                    className="flex-1 bg-[#121214] border border-[#27272A] rounded px-3 py-1.5 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddMilestone}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded cursor-pointer"
                  >
                    + {isRTL ? 'إضافة' : 'Add'}
                  </button>
                </div>

                <div className="space-y-1.5">
                  {milestones.map((m, i) => (
                    <div key={m.id} className="flex items-center justify-between text-xs text-[#D4D4D8] bg-[#121214] p-2 rounded border border-[#27272A]">
                      <span>{i + 1}. {m.title}</span>
                      <button
                        type="button"
                        onClick={() => setMilestones(milestones.filter(x => x.id !== m.id))}
                        className="text-rose-400 hover:text-rose-300"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
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
                onClick={handleSaveProject}
                disabled={!title.trim()}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                {isRTL ? 'حفظ المشروع' : 'Save Project'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
