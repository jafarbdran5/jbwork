import React, { useState, useEffect } from 'react';
import { useI18n } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { CaseReminder, CaseItem } from '../../types';
import { logAuditAndEvent } from '../../lib/audit';
import { deleteEntity } from '../../services/database/deleteService';
import { Bell, Clock, Plus, CheckCircle2, Circle, Calendar, AlertCircle, X, Search, Trash2 } from 'lucide-react';

interface RemindersModuleProps {
  onSelectCase?: (caseId: string) => void;
}

export const RemindersModule: React.FC<RemindersModuleProps> = ({ onSelectCase }) => {
  const { t, isRTL } = useI18n();
  const { userProfile, canEdit } = useAuth();

  const [reminders, setReminders] = useState<CaseReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<'today' | 'upcoming' | 'overdue' | 'all'>('today');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueTime, setDueTime] = useState('10:00');
  const [note, setNote] = useState('');
  const [caseNumber, setCaseNumber] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'caseReminders'), orderBy('dueDate', 'asc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setReminders(snap.docs.map(d => ({ id: d.id, ...d.data() } as CaseReminder)));
      setLoading(false);
    }, (err) => {
      console.warn('Reminders snapshot fallback:', err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate || !userProfile) return;

    try {
      await addDoc(collection(db, 'caseReminders'), {
        title: title.trim(),
        dueDate,
        dueTime,
        note: note.trim(),
        caseNumber: caseNumber.trim(),
        status: 'upcoming',
        createdAt: serverTimestamp(),
        createdBy: { uid: userProfile.uid, name: userProfile.displayName }
      });

      await logAuditAndEvent({
        action: 'CREATE_REMINDER',
        details: `إنشاء تذكير: ${title} (${dueDate})`,
        entityType: 'reminder',
        entityTitle: title,
        user: userProfile
      });

      setTitle('');
      setNote('');
      setCaseNumber('');
      setShowAddModal(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleStatus = async (reminder: CaseReminder) => {
    if (!userProfile || !canEdit) return;
    const nextStatus = reminder.status === 'completed' ? 'upcoming' : 'completed';
    try {
      await updateDoc(doc(db, 'caseReminders', reminder.id), {
        status: nextStatus
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteReminder = async (e: React.MouseEvent, reminder: CaseReminder) => {
    e.stopPropagation();
    if (!window.confirm(isRTL ? `هل أنت متأكد من حذف التذكير: ${reminder.title}؟` : `Delete reminder: ${reminder.title}?`)) return;

    setReminders(prev => prev.filter(r => r.id !== reminder.id));
    await deleteEntity('reminder', reminder.id, userProfile, {
      customTitle: reminder.title,
      reason: `حذف تذكير من قسم التذكيرات`
    });
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const filtered = reminders.filter(r => {
    if (r.isDeleted || (r as any)._deleted) return false;
    if (filterCategory === 'today') return r.dueDate === todayStr;
    if (filterCategory === 'upcoming') return r.dueDate > todayStr;
    if (filterCategory === 'overdue') return r.dueDate < todayStr && r.status !== 'completed';
    return true;
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Bell className="w-5 h-5 text-orange-400" />
            <span>{t('navReminders')}</span>
            <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2.5 py-0.5 rounded-full border border-slate-800">
              {filtered.length}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {isRTL ? 'إدارة مواعيد المتابعة والتذكيرات المرتبطة بالقضايا' : 'Follow-up alerts and time-sensitive reminders'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-lg shadow-orange-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isRTL ? 'إضافة تذكير' : 'New Reminder'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'today', label: isRTL ? 'تذكيرات اليوم' : 'Today', count: reminders.filter(r => r.dueDate === todayStr).length },
          { id: 'upcoming', label: isRTL ? 'القادمة' : 'Upcoming', count: reminders.filter(r => r.dueDate > todayStr).length },
          { id: 'overdue', label: isRTL ? 'المتأخرة' : 'Overdue', count: reminders.filter(r => r.dueDate < todayStr && r.status !== 'completed').length },
          { id: 'all', label: isRTL ? 'الكل' : 'All', count: reminders.length },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setFilterCategory(item.id as any)}
            className={`px-3.5 py-2 rounded-xl font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              filterCategory === item.id
                ? 'bg-orange-600 text-white shadow-md'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span>{item.label}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-950/60">
              {item.count}
            </span>
          </button>
        ))}
      </div>

      {/* Reminders List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 font-mono">
          {isRTL ? 'جارٍ تحميل التذكيرات...' : 'Loading reminders...'}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-500">
          {t('noRemindersToday')}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((rem) => (
            <div
              key={rem.id}
              className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                rem.status === 'completed'
                  ? 'bg-slate-950/40 border-slate-800/40 opacity-60'
                  : 'bg-slate-900/90 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3.5 overflow-hidden">
                <button
                  onClick={() => handleToggleStatus(rem)}
                  className="cursor-pointer text-slate-400 hover:text-orange-400 transition-colors shrink-0"
                >
                  {rem.status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-600" />
                  )}
                </button>

                <div className="overflow-hidden">
                  <h3 className={`text-xs sm:text-sm font-bold ${rem.status === 'completed' ? 'line-through text-slate-400' : 'text-white'}`}>
                    {rem.title}
                  </h3>
                  {rem.note && <p className="text-[11px] text-slate-400 mt-0.5">{rem.note}</p>}
                  {rem.caseNumber && (
                    <div className="mt-1">
                      <span className="font-mono text-[10px] text-cyan-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {rem.caseNumber}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <div className="text-end font-mono text-xs text-orange-400 font-bold">
                  <p>{rem.dueDate}</p>
                  <p className="text-[10px] text-slate-500">{rem.dueTime || ''}</p>
                </div>

                {canEdit && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteReminder(e, rem)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/40 transition-colors cursor-pointer"
                    title={isRTL ? 'حذف التذكير' : 'Delete reminder'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Reminder Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-400" />
                <span>{isRTL ? 'إضافة تذكير جديد' : 'New Reminder'}</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddReminder} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{isRTL ? 'عنوان التذكير' : 'Title'} *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={isRTL ? 'مثال: مراجعة رد فيسبوك بخصوص البلاغ' : 'e.g. Follow up on Meta report'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{isRTL ? 'التاريخ' : 'Date'} *</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{isRTL ? 'الوقت' : 'Time'}</label>
                  <input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{isRTL ? 'رقم القضية المرتبطة (اختياري)' : 'Case Number (optional)'}</label>
                <input
                  type="text"
                  value={caseNumber}
                  onChange={(e) => setCaseNumber(e.target.value)}
                  placeholder="JB-2026-000001"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{isRTL ? 'ملاحظة' : 'Note'}</label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
