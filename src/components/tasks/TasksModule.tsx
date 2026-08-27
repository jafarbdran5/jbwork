import React, { useState, useEffect } from 'react';
import { useI18n } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, onSnapshot, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { CaseTask } from '../../types';
import { logAuditAndEvent } from '../../lib/audit';
import { deleteEntity } from '../../services/database/deleteService';
import { CheckSquare, CheckCircle2, Circle, Clock, Tag, User, Search, Filter, Trash2 } from 'lucide-react';

interface TasksModuleProps {
  onSelectCase?: (caseId: string) => void;
}

export const TasksModule: React.FC<TasksModuleProps> = ({ onSelectCase }) => {
  const { t, isRTL } = useI18n();
  const { userProfile, canEdit } = useAuth();

  const [tasks, setTasks] = useState<CaseTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'todo' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'caseTasks'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as CaseTask)));
      setLoading(false);
    }, (err) => {
      console.warn('Tasks snapshot fallback:', err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleToggleTask = async (task: CaseTask) => {
    if (!userProfile || !canEdit) return;
    const nextStatus = task.status === 'completed' ? 'todo' : 'completed';
    try {
      await updateDoc(doc(db, 'caseTasks', task.id), {
        status: nextStatus,
        completedAt: nextStatus === 'completed' ? serverTimestamp() : null
      });

      await logAuditAndEvent({
        action: nextStatus === 'completed' ? 'COMPLETE_TASK' : 'UPDATE_TASK',
        details: `تحديث حالة المهمة: ${task.title} إلى ${nextStatus}`,
        entityType: 'task',
        caseId: task.caseId,
        entityTitle: task.title,
        user: userProfile
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTask = async (e: React.MouseEvent, task: CaseTask) => {
    e.stopPropagation();
    if (!window.confirm(isRTL ? `هل أنت متأكد من حذف المهمة: ${task.title}؟` : `Delete task: ${task.title}?`)) return;

    setTasks(prev => prev.filter(t => t.id !== task.id));
    await deleteEntity('task', task.id, userProfile, {
      customTitle: task.title,
      reason: `حذف مهمة من قسم المهام`
    });
  };

  const filtered = tasks.filter(t => {
    if (t.isDeleted || (t as any)._deleted) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return t.title.toLowerCase().includes(q) || t.caseNumber?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-cyan-400" />
            <span>{t('navTasks')}</span>
            <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2.5 py-0.5 rounded-full border border-slate-800">
              {filtered.length}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {isRTL ? 'إدارة ومتابعة مهام العمل عبر كافة القضايا' : 'Track and manage operational tasks across all cases'}
          </p>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
              statusFilter === 'all' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t('filterAll')}
          </button>
          <button
            onClick={() => setStatusFilter('todo')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
              statusFilter === 'todo' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {isRTL ? 'قيد التنفيذ' : 'To Do'}
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
              statusFilter === 'completed' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {isRTL ? 'المكتملة' : 'Completed'}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={isRTL ? 'ابحث في المهام أو أرقام القضايا...' : 'Search tasks or case numbers...'}
          className="w-full bg-slate-900/90 border border-slate-800 rounded-xl ps-10 pe-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* Task items */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 font-mono">
          {isRTL ? 'جارٍ تحميل المهام...' : 'Loading tasks...'}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-500">
          {t('noTasksFound')}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((task) => (
            <div
              key={task.id}
              className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                task.status === 'completed'
                  ? 'bg-slate-950/40 border-slate-800/40 opacity-60'
                  : 'bg-slate-900/90 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3.5 overflow-hidden">
                <button
                  onClick={() => handleToggleTask(task)}
                  className="cursor-pointer text-slate-400 hover:text-cyan-400 transition-colors shrink-0"
                >
                  {task.status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-600" />
                  )}
                </button>

                <div className="overflow-hidden">
                  <h3 className={`text-xs sm:text-sm font-bold ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-white'}`}>
                    {task.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                    {task.caseNumber && (
                      <button
                        onClick={() => onSelectCase && onSelectCase(task.caseId)}
                        className="font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60 hover:underline cursor-pointer"
                      >
                        {task.caseNumber}
                      </button>
                    )}
                    {task.dueDate && (
                      <span className="flex items-center gap-1 font-mono text-[10px]">
                        <Clock className="w-3 h-3" />
                        <span>{task.dueDate}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${
                  task.priority === 'urgent' ? 'bg-red-950 text-red-300 border border-red-800' :
                  task.priority === 'high' ? 'bg-orange-950 text-orange-300 border border-orange-800' :
                  'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  {t(`priority_${task.priority}`)}
                </span>

                {canEdit && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteTask(e, task)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/40 transition-colors cursor-pointer"
                    title={isRTL ? 'حذف المهمة' : 'Delete task'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
