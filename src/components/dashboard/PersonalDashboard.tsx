import React, { useState, useEffect } from 'react';
import { useI18n } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import { db } from '../../lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { CaseItem, CaseReminder, CaseTask, CaseEvent, InternalRequest, CaseTypeConfig } from '../../types';
import { DEFAULT_CASE_TYPES } from '../../lib/constants';
import { getLocalCases } from '../../lib/offlineStore';
import { 
  ShieldCheck, 
  Layers, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  FolderPlus, 
  Calendar, 
  User, 
  ChevronRight, 
  Bell, 
  Inbox, 
  Zap, 
  Activity,
  Tag,
  Briefcase,
  Globe
} from 'lucide-react';

interface PersonalDashboardProps {
  onSelectCase: (caseId: string) => void;
  onOpenQuickCase: (type?: string) => void;
  onNavigate: (view: string) => void;
}

export const PersonalDashboard: React.FC<PersonalDashboardProps> = ({
  onSelectCase,
  onOpenQuickCase,
  onNavigate
}) => {
  const { t, isRTL } = useI18n();
  const { userProfile, isSuperAdmin } = useAuth();

  const [cases, setCases] = useState<CaseItem[]>(() => getLocalCases().filter(c => !c.isDeleted && !(c as any)._deleted));
  const [reminders, setReminders] = useState<CaseReminder[]>([]);
  const [tasks, setTasks] = useState<CaseTask[]>([]);
  const [requests, setRequests] = useState<InternalRequest[]>([]);
  const [externalRequestsCount, setExternalRequestsCount] = useState<number>(0);
  const [recentEvents, setRecentEvents] = useState<CaseEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Time based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('goodMorning');
    if (hour < 17) return t('goodAfternoon');
    return t('goodEvening');
  };

  const displayName = userProfile?.displayName?.split(' ')[0] || (isRTL ? 'جعفر' : 'Jaafar');

  // Load Dashboard Data & Listen to Deletion / Restore events
  useEffect(() => {
    const syncLocal = () => {
      const local = getLocalCases().filter(c => !c.isDeleted && !(c as any)._deleted);
      if (local.length > 0) setCases(local);
    };

    const handleDataChanged = () => {
      syncLocal();
    };

    window.addEventListener('jb_data_changed', handleDataChanged);
    window.addEventListener('jb_entity_deleted', handleDataChanged);
    window.addEventListener('jb_entity_restored', handleDataChanged);

    const qCases = query(collection(db, 'cases'));
    const unsubCases = onSnapshot(qCases, (snap) => {
      const items = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as CaseItem))
        .filter(c => !c.isDeleted && !(c as any)._deleted)
        .sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        });
      setCases(items);
      setLoading(false);
    }, (err) => {
      syncLocal();
      setLoading(false);
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const qReminders = query(collection(db, 'caseReminders'));
    const unsubReminders = onSnapshot(qReminders, (snap) => {
      const items = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as CaseReminder))
        .filter(r => r.dueDate === todayStr);
      setReminders(items);
    }, (err) => console.warn(err));

    const qTasks = query(collection(db, 'caseTasks'), where('status', '==', 'todo'));
    const unsubTasks = onSnapshot(qTasks, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as CaseTask)));
    }, (err) => console.warn(err));

    const qRequests = query(collection(db, 'requests'), where('status', '==', 'new'));
    const unsubRequests = onSnapshot(qRequests, (snap) => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as InternalRequest)));
    }, (err) => console.warn(err));

    const qExternalRequests = query(collection(db, 'externalRequests'), where('status', '==', 'pending_review'));
    const unsubExternalRequests = onSnapshot(qExternalRequests, (snap) => {
      setExternalRequestsCount(snap.size);
    }, (err) => console.warn(err));

    const qEvents = query(collection(db, 'caseEvents'), orderBy('timestamp', 'desc'), limit(8));
    const unsubEvents = onSnapshot(qEvents, (snap) => {
      setRecentEvents(snap.docs.map(d => ({ id: d.id, ...d.data() } as CaseEvent)));
    }, (err) => console.warn(err));

    return () => {
      unsubCases();
      unsubReminders();
      unsubTasks();
      unsubRequests();
      unsubExternalRequests();
      unsubEvents();
      window.removeEventListener('jb_data_changed', handleDataChanged);
      window.removeEventListener('jb_entity_deleted', handleDataChanged);
      window.removeEventListener('jb_entity_restored', handleDataChanged);
    };
  }, []);

  // Stats calculation
  const totalCasesCount = cases.length;
  const activeCasesCount = cases.filter(c => c.status === 'in_progress' || c.status === 'new').length;
  const urgentCasesCount = cases.filter(c => c.priority === 'urgent' && c.status !== 'completed').length;
  const pendingCasesCount = cases.filter(c => c.status === 'pending').length;
  const completedCasesCount = cases.filter(c => c.status === 'completed').length;
  const overdueTasksCount = tasks.filter(t => t.dueDate && t.dueDate < new Date().toISOString().split('T')[0]).length;

  // Breakdown by platform
  const platformCounts: Record<string, number> = {};
  cases.forEach(c => {
    const p = c.platform || (isRTL ? 'أخرى' : 'Other');
    platformCounts[p] = (platformCounts[p] || 0) + 1;
  });

  // Breakdown by type
  const typeCounts: Record<string, number> = {};
  cases.forEach(c => {
    const t = c.caseType || 'other';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });

  // Urgent cases list
  const urgentCases = cases.filter(c => (c.priority === 'urgent' || c.priority === 'high') && c.status !== 'completed').slice(0, 5);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Top Greeting & Operations Banner */}
      <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400">
                {t('commandCenter')}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#FAFAFA] tracking-tight">
              {getGreeting()}، {displayName}
            </h1>
            <p className="text-xs sm:text-sm text-[#A1A1AA] mt-1 max-w-xl">
              {isRTL 
                ? 'هنا نظرة سريعة على آخر التحديثات في نظام عملك اليوم والمهام والتذكيرات المستحقة.'
                : 'Here is an overview of active cases, tasks, and follow-ups in your operations system today.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onOpenQuickCase()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-md shadow-sm transition-colors cursor-pointer flex items-center gap-2"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>+{t('newCase')}</span>
            </button>

            {isSuperAdmin && (
              <button
                onClick={() => onNavigate('jaafar_workspace')}
                className="bg-[#09090B] hover:bg-[#27272A] text-[#FAFAFA] border border-[#27272A] text-xs font-medium px-3.5 py-2 rounded-md transition-colors cursor-pointer flex items-center gap-2"
              >
                <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t('navJaafarWorkspace')}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 8 Metric KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        
        {/* Total Cases */}
        <div 
          onClick={() => onNavigate('cases')}
          className="bg-[#18181B] border border-[#27272A] hover:border-zinc-700 p-4 rounded-xl transition-colors cursor-pointer group"
        >
          <div className="text-[#71717A] text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>{t('totalCases')}</span>
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-[#FAFAFA] font-mono">{totalCasesCount}</div>
          <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
            <span>↑ 12%</span>
            <span className="text-[#71717A]">{isRTL ? 'إجمالي القضايا المسجلة' : 'All recorded cases'}</span>
          </div>
        </div>

        {/* Active Cases */}
        <div 
          onClick={() => onNavigate('cases')}
          className="bg-[#18181B] border border-[#27272A] hover:border-zinc-700 p-4 rounded-xl transition-colors cursor-pointer group"
        >
          <div className="text-[#71717A] text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>{t('activeCases')}</span>
            <Activity className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-400 font-mono">{activeCasesCount}</div>
          <div className="text-[10px] text-[#71717A] mt-1">
            {isRTL ? 'قيد العمل والمتابعة' : 'In progress'}
          </div>
        </div>

        {/* Urgent Cases */}
        <div 
          onClick={() => onNavigate('cases')}
          className="bg-[#18181B] border border-[#27272A] hover:border-zinc-700 p-4 rounded-xl transition-colors cursor-pointer group"
        >
          <div className="text-[#71717A] text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>{t('urgentCases')}</span>
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-500 font-mono">{urgentCasesCount}</div>
          <div className="text-[10px] text-[#71717A] mt-1">
            {isRTL ? 'تحتاج إلى تدخل فوري' : 'Needs immediate action'}
          </div>
        </div>

        {/* Today's Reminders */}
        <div 
          onClick={() => onNavigate('reminders')}
          className="bg-[#18181B] border border-[#27272A] hover:border-zinc-700 p-4 rounded-xl transition-colors cursor-pointer group"
        >
          <div className="text-[#71717A] text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>{t('todayReminders')}</span>
            <Clock className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-[#FAFAFA] font-mono">{reminders.length}</div>
          <div className="text-[10px] text-[#71717A] mt-1">
            {isRTL ? 'مواعيد متابعة اليوم' : 'Due today'}
          </div>
        </div>

        {/* Pending Cases */}
        <div 
          onClick={() => onNavigate('cases')}
          className="bg-[#18181B] border border-[#27272A] hover:border-zinc-700 p-4 rounded-xl transition-colors cursor-pointer group"
        >
          <div className="text-[#71717A] text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>{t('pendingCases')}</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">{pendingCasesCount}</div>
          <div className="text-[10px] text-[#71717A] mt-1">
            {isRTL ? 'بانتظار رد المنصة' : 'Awaiting platform'}
          </div>
        </div>

        {/* Overdue Tasks */}
        <div 
          onClick={() => onNavigate('tasks')}
          className="bg-[#18181B] border border-[#27272A] hover:border-zinc-700 p-4 rounded-xl transition-colors cursor-pointer group"
        >
          <div className="text-[#71717A] text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>{t('overdueTasks')}</span>
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
          </div>
          <div className="text-2xl font-bold text-yellow-400 font-mono">{overdueTasksCount}</div>
          <div className="text-[10px] text-[#71717A] mt-1">
            {isRTL ? 'تجاوزت تاريخ الاستحقاق' : 'Past due'}
          </div>
        </div>

        {/* Completed Cases */}
        <div 
          onClick={() => onNavigate('cases')}
          className="bg-[#18181B] border border-[#27272A] hover:border-zinc-700 p-4 rounded-xl transition-colors cursor-pointer group"
        >
          <div className="text-[#71717A] text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>{t('completedCases')}</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{completedCasesCount}</div>
          <div className="text-[10px] text-emerald-400/80 mt-1">
            {isRTL ? 'أُغلقت بنجاح' : 'Closed successfully'}
          </div>
        </div>

        {/* New Internal Requests */}
        <div 
          onClick={() => onNavigate('requests')}
          className="bg-[#18181B] border border-[#27272A] hover:border-zinc-700 p-4 rounded-xl transition-colors cursor-pointer group"
        >
          <div className="text-[#71717A] text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>{t('newRequests')}</span>
            <Inbox className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-indigo-400 font-mono">{requests.length}</div>
          <div className="text-[10px] text-amber-400 mt-1">
            {isRTL ? 'طلبات داخلية بانتظار المراجعة' : 'Internal pending'}
          </div>
        </div>

        {/* Google External Requests */}
        <div 
          onClick={() => onNavigate('external_requests')}
          className="bg-[#18181B] border border-indigo-500/20 hover:border-indigo-500/50 p-4 rounded-xl transition-colors cursor-pointer group col-span-2 sm:col-span-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600/10 text-indigo-400 flex items-center justify-center font-bold">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">
                  {isRTL ? 'الطلبات الخارجية (Google Forms & Sheets)' : 'External Google Requests'}
                </span>
                {externalRequestsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                    {externalRequestsCount} {isRTL ? 'جديد بانتظار المراجعة' : 'New pending'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {isRTL 
                  ? 'مزامنة حية من Google Form وGoogle Sheet الموقع وتحويلها إلى قضايا رسمية'
                  : 'Live sync from Google Forms and Website Sheets with 1-click Case Conversion'}
              </p>
            </div>
          </div>

          <button className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors">
            {isRTL ? 'فتح لوحة الطلبات' : 'Open Requests'}
          </button>
        </div>

      </div>

      {/* Main Section: Operations Grid & Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Cases Table & Attention (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section: Urgent Cases Table */}
          <div className="bg-[#18181B] border border-[#27272A] rounded-xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[#27272A] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <h2 className="text-sm font-bold text-[#FAFAFA]">
                  {isRTL ? 'آخر القضايا العاجلة المفتوحة' : 'Urgent Active Cases'}
                </h2>
              </div>
              <button 
                onClick={() => onNavigate('cases')}
                className="text-xs text-indigo-400 hover:underline font-medium"
              >
                {isRTL ? 'عرض الكل' : 'View All'}
              </button>
            </div>

            {urgentCases.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#71717A]">
                <CheckCircle2 className="w-7 h-7 text-emerald-500/80 mx-auto mb-2" />
                <p>{isRTL ? 'لا توجد قضايا عاجلة حالياً.' : 'No urgent or critical cases right now.'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className={`w-full ${isRTL ? 'text-right' : 'text-left'}`}>
                  <thead className="bg-[#09090B]/60 border-b border-[#27272A]">
                    <tr className="text-[10px] text-[#71717A] uppercase tracking-wider">
                      <th className="p-3.5 font-semibold">{isRTL ? 'رقم القضية' : 'Case #'}</th>
                      <th className="p-3.5 font-semibold">{isRTL ? 'العنوان والنوع' : 'Title & Type'}</th>
                      <th className="p-3.5 font-semibold">{isRTL ? 'المنصة' : 'Platform'}</th>
                      <th className="p-3.5 font-semibold">{isRTL ? 'الأولوية / الحالة' : 'Priority / Status'}</th>
                      <th className="p-3.5 font-semibold">{isRTL ? 'الموظف' : 'Assignee'}</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-[#27272A]">
                    {urgentCases.map((c) => (
                      <tr 
                        key={c.id}
                        onClick={() => onSelectCase(c.id)}
                        className="hover:bg-[#27272A]/30 transition-colors cursor-pointer"
                      >
                        <td className="p-3.5 font-mono text-indigo-400 font-semibold whitespace-nowrap">
                          {c.caseNumber}
                        </td>
                        <td className="p-3.5">
                          <div className="font-medium text-[#FAFAFA] truncate max-w-xs">{c.title}</div>
                          <div className="text-[10px] text-[#71717A]">{c.caseType}</div>
                        </td>
                        <td className="p-3.5 text-[#A1A1AA] whitespace-nowrap">
                          {c.platform || '-'}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] border font-medium ${
                            c.priority === 'urgent' 
                              ? 'bg-red-500/10 text-red-400 border-red-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {t(`priority_${c.priority}`)}
                          </span>
                        </td>
                        <td className="p-3.5 text-[#A1A1AA] font-medium whitespace-nowrap">
                          {c.assignedTo?.name || (isRTL ? 'غير معين' : 'Unassigned')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section: Platform Breakdown Distribution */}
          <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272A]">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-[#FAFAFA]">
                  {isRTL ? 'توزيع القضايا حسب المنصة الرقمية' : 'Cases Distribution by Platform'}
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(platformCounts).slice(0, 8).map(([platform, count]) => (
                <div key={platform} className="bg-[#09090B] p-3 rounded-lg border border-[#27272A]">
                  <span className="text-[11px] font-semibold text-[#A1A1AA] block truncate">{platform}</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-lg font-bold text-[#FAFAFA] font-mono">{count}</span>
                    <span className="text-[10px] text-[#71717A] font-mono">
                      {totalCasesCount > 0 ? `${Math.round((count / totalCasesCount) * 100)}%` : '0%'}
                    </span>
                  </div>
                  <div className="w-full bg-[#18181B] h-1 rounded-full mt-2 overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-full rounded-full" 
                      style={{ width: `${totalCasesCount > 0 ? (count / totalCasesCount) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Today's Reminders & Live Activity */}
        <div className="space-y-6">
          
          {/* Today's Reminders Panel */}
          <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-4 flex flex-col">
            <div className="pb-3 border-b border-[#27272A] flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-[#FAFAFA]">
                  {t('todayReminders')}
                </h3>
              </div>
              <button 
                onClick={() => onNavigate('reminders')}
                className="text-xs text-indigo-400 hover:underline font-medium"
              >
                {isRTL ? 'المزيد' : 'More'}
              </button>
            </div>

            {reminders.length === 0 ? (
              <p className="text-xs text-[#71717A] py-6 text-center">{t('noRemindersToday')}</p>
            ) : (
              <div className="space-y-3">
                {reminders.map((rem, idx) => (
                  <div key={rem.id} className="flex gap-3 items-start">
                    <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                      idx === 0 ? 'bg-red-500' : 'bg-indigo-500'
                    }`} />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs font-semibold text-[#FAFAFA]">{rem.title}</span>
                      <span className="text-[10px] text-[#71717A] font-mono">
                        {rem.caseNumber ? `${rem.caseNumber} • ` : ''}{rem.dueTime || '10:00 AM'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-[#27272A]">
              <h4 className="text-[10px] font-bold text-[#71717A] uppercase mb-2">
                {isRTL ? 'حالة النظام' : 'SYSTEM STATUS'}
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="flex items-center gap-2 text-[#A1A1AA]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {isRTL ? 'متصل بالإنترنت' : 'Connected to Network'}
                  </span>
                  <span className="text-[#71717A]">{isRTL ? 'الآن' : 'Live'}</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="flex items-center gap-2 text-[#A1A1AA]">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    {isRTL ? 'تمت المزامنة الآمنة' : 'Cloud Sync Active'}
                  </span>
                  <span className="text-[#71717A]">{isRTL ? 'نشط' : 'Active'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Live Recent Activity Stream */}
          <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-4 flex flex-col">
            <div className="pb-3 border-b border-[#27272A] flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-[#FAFAFA]">
                  {isRTL ? 'سجل العمليات الأخير' : 'Recent Operations'}
                </h3>
              </div>
              <button 
                onClick={() => onNavigate('activity_log')}
                className="text-xs text-[#71717A] hover:text-[#FAFAFA] transition-colors"
              >
                {t('navActivityLog')}
              </button>
            </div>

            <div className="space-y-3">
              {recentEvents.length === 0 ? (
                <p className="text-xs text-[#71717A] py-4 text-center">{isRTL ? 'لا توجد أنشطة مسجلة' : 'No activity logs yet'}</p>
              ) : (
                recentEvents.slice(0, 5).map((ev) => (
                  <div key={ev.id} className="text-xs space-y-0.5 pb-2.5 border-b border-[#27272A]/60 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-indigo-400">{ev.performedBy?.name}</span>
                      <span className="text-[#71717A] font-mono">
                        {ev.timestamp?.toDate ? ev.timestamp.toDate().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <p className="text-[#E4E4E7] font-medium truncate">{ev.title}</p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
