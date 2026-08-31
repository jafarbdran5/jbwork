import React, { useState, useEffect } from 'react';
import { useI18n } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';
import { db } from '../../lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { CaseItem, CaseReminder, CaseTask, CaseEvent, InternalRequest } from '../../types';
import { getLocalCases } from '../../lib/offlineStore';
import { getSavedPublicSheets } from '../../lib/googleSheetsReader';
import { 
  ShieldCheck, 
  Layers, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  FolderPlus, 
  User, 
  ChevronRight, 
  Inbox, 
  Zap, 
  Activity,
  Globe,
  Plus,
  Search,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  FileSpreadsheet,
  Settings,
  Flame,
  Shield,
  Briefcase
} from 'lucide-react';

interface PersonalDashboardProps {
  onSelectCase: (caseId: string) => void;
  onOpenQuickCase: (type?: string) => void;
  onNavigate: (view: string) => void;
  onOpenAiAssistant?: () => void;
}

export const PersonalDashboard: React.FC<PersonalDashboardProps> = ({
  onSelectCase,
  onOpenQuickCase,
  onNavigate,
  onOpenAiAssistant
}) => {
  const { t, isRTL } = useI18n();
  const { userProfile, isSuperAdmin, isAdmin } = useAuth();
  const { isDark } = useTheme();

  const [cases, setCases] = useState<CaseItem[]>(() => getLocalCases().filter(c => !c.isDeleted && !(c as any)._deleted));
  const [reminders, setReminders] = useState<CaseReminder[]>([]);
  const [tasks, setTasks] = useState<CaseTask[]>([]);
  const [recentEvents, setRecentEvents] = useState<CaseEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // External Sheets metrics
  const [externalStats, setExternalStats] = useState({
    sheetsCount: 0,
    totalRows: 0,
    newRows: 0
  });

  // Time based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return isRTL ? 'صباح الخير' : 'Good morning';
    if (hour < 17) return isRTL ? 'مساء الخير' : 'Good afternoon';
    return isRTL ? 'مساء النور' : 'Good evening';
  };

  const displayName = userProfile?.displayName?.split(' ')[0] || (isRTL ? 'المشرف' : 'Supervisor');

  // Load Dashboard Data
  useEffect(() => {
    const syncLocal = () => {
      const local = getLocalCases().filter(c => !c.isDeleted && !(c as any)._deleted);
      if (local.length > 0) setCases(local);
      
      const sheets = getSavedPublicSheets();
      let totalR = 0;
      let newR = 0;
      sheets.forEach(s => {
        const rows = s.rows || [];
        totalR += rows.length;
        newR += rows.filter(r => !r._systemStatus || r._systemStatus === 'unlinked').length;
      });
      setExternalStats({
        sheetsCount: sheets.length,
        totalRows: totalR,
        newRows: newR
      });
    };

    syncLocal();

    const handleDataChanged = () => {
      syncLocal();
    };

    window.addEventListener('jb_data_changed', handleDataChanged);
    window.addEventListener('jb_entity_deleted', handleDataChanged);
    window.addEventListener('jb_entity_restored', handleDataChanged);
    window.addEventListener('jb_entity_purged', handleDataChanged);

    let unsubCases = () => {};
    let unsubReminders = () => {};
    let unsubEvents = () => {};

    try {
      const qCases = query(collection(db, 'cases'));
      unsubCases = onSnapshot(qCases, (snap) => {
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
    } catch (_) {
      syncLocal();
      setLoading(false);
    }

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const qReminders = query(collection(db, 'caseReminders'));
      unsubReminders = onSnapshot(qReminders, (snap) => {
        const items = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as CaseReminder))
          .filter(r => r.dueDate === todayStr);
        setReminders(items);
      }, (err) => console.warn(err));
    } catch (_) {}

    try {
      const qEvents = query(collection(db, 'caseEvents'), orderBy('timestamp', 'desc'), limit(6));
      unsubEvents = onSnapshot(qEvents, (snap) => {
        setRecentEvents(snap.docs.map(d => ({ id: d.id, ...d.data() } as CaseEvent)));
      }, (err) => console.warn(err));
    } catch (_) {}

    return () => {
      unsubCases();
      unsubReminders();
      unsubEvents();
      window.removeEventListener('jb_data_changed', handleDataChanged);
      window.removeEventListener('jb_entity_deleted', handleDataChanged);
      window.removeEventListener('jb_entity_restored', handleDataChanged);
      window.removeEventListener('jb_entity_purged', handleDataChanged);
    };
  }, []);

  // Cases breakdown
  const openCasesCount = cases.filter(c => c.status === 'new').length;
  const inProgressCasesCount = cases.filter(c => c.status === 'in_progress' || c.status === 'pending').length;
  const closedCasesCount = cases.filter(c => c.status === 'completed' || c.status === 'closed' || c.status === 'resolved').length;
  const urgentCases = cases.filter(c => (c.priority === 'urgent' || c.priority === 'high') && c.status !== 'completed').slice(0, 5);

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-150 pb-20">
      
      {/* Welcome & Supervisor Header */}
      <div className={`border rounded-3xl p-5 sm:p-6 transition-colors shadow-sm ${
        isDark ? 'bg-[#121824] border-slate-800' : 'bg-white border-slate-200 shadow-slate-100'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                {isRTL ? 'لوحة التحكم والعمليات' : 'OPERATIONS DASHBOARD'}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                isDark 
                  ? 'bg-slate-800 text-slate-300 border-slate-700' 
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                {userProfile?.role === 'super_admin' ? (isRTL ? 'المشرف الرئيسي' : 'Master Admin') : (isRTL ? 'مشرف' : 'Supervisor')}
              </span>
            </div>
            <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {getGreeting()}، {displayName}
            </h1>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {isRTL 
                ? 'إدارة فورية ومتابعة شاملة للقضايا الداخلية والطلبات الخارجية الواردة.'
                : 'Live tracking and management for internal cases and incoming external requests.'}
            </p>
          </div>

          {/* Quick Primary Android Touch Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => onOpenQuickCase()}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-md shadow-blue-600/20 transition-all cursor-pointer min-h-[46px]"
            >
              <Plus className="w-4 h-4" />
              <span>{isRTL ? '+ قضية جديدة' : '+ New Case'}</span>
            </button>

            <button
              onClick={() => onNavigate('external_requests')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 border text-xs font-semibold px-4 py-3 rounded-2xl transition-all cursor-pointer min-h-[46px] active:scale-[0.98] ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 shadow-sm'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              <span>{isRTL ? 'الطلبات الخارجية' : 'External Requests'}</span>
            </button>

            {onOpenAiAssistant && (
              <button
                onClick={onOpenAiAssistant}
                className={`flex items-center justify-center gap-1.5 border text-xs font-bold px-3.5 py-3 rounded-2xl transition-all cursor-pointer min-h-[46px] ${
                  isDark 
                    ? 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border-indigo-500/40' 
                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                }`}
                title={isRTL ? 'المساعد الذكي' : 'AI Assistant'}
              >
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span className="hidden sm:inline">{isRTL ? 'المساعد الذكي' : 'AI'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CORE DIVISION: 2 Distinct Pillars (External Requests vs Internal Cases) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* PILLAR 1: External Requests (Google Forms & Sheets) */}
        <div 
          onClick={() => onNavigate('external_requests')}
          className={`border-2 rounded-3xl p-5 shadow-sm transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden ${
            isDark 
              ? 'bg-[#121824] border-emerald-500/30 hover:border-emerald-500/60 hover:shadow-emerald-950/20' 
              : 'bg-white border-emerald-300 hover:border-emerald-500 hover:shadow-md hover:shadow-emerald-100'
          }`}
        >
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-400" />
          
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center ${
                  isDark 
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
                    : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                }`}>
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h2 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {isRTL ? '1. الطلبات الخارجية' : '1. External Requests'}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isDark 
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      Google Sheets
                    </span>
                  </h2>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {isRTL ? 'الطلبات الواردة من النماذج وموقع الويب' : 'Incoming website & form submissions'}
                  </p>
                </div>
              </div>

              {isRTL ? (
                <ArrowLeft className={`w-5 h-5 group-hover:-translate-x-1 transition-transform ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
              ) : (
                <ArrowRight className={`w-5 h-5 group-hover:translate-x-1 transition-transform ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
              )}
            </div>

            {/* 3 Status Counters for External Requests */}
            <div className="grid grid-cols-3 gap-2 my-4">
              <div className={`border rounded-2xl p-3 text-center transition-colors ${
                isDark ? 'bg-[#0B0F17] border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className={`text-[10px] font-semibold block mb-0.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  {isRTL ? 'طلبات جديدة' : 'New'}
                </span>
                <span className={`text-lg font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {externalStats.newRows}
                </span>
              </div>

              <div className={`border rounded-2xl p-3 text-center transition-colors ${
                isDark ? 'bg-[#0B0F17] border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className={`text-[10px] font-semibold block mb-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {isRTL ? 'الملفات المربوطة' : 'Sheets'}
                </span>
                <span className={`text-lg font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {externalStats.sheetsCount}
                </span>
              </div>

              <div className={`border rounded-2xl p-3 text-center transition-colors ${
                isDark ? 'bg-[#0B0F17] border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className={`text-[10px] font-semibold block mb-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {isRTL ? 'إجمالي السجلات' : 'Total'}
                </span>
                <span className={`text-lg font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {externalStats.totalRows}
                </span>
              </div>
            </div>
          </div>

          <div className={`pt-2.5 border-t flex items-center justify-between text-xs font-semibold ${
            isDark ? 'border-slate-800/80 text-emerald-400' : 'border-slate-100 text-emerald-600'
          }`}>
            <span>{isRTL ? 'استعراض وتحويل الطلبات إلى قضايا' : 'Review & Convert to Cases'}</span>
            <span className={`text-[11px] font-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {isRTL ? 'اختيار الورقة بالاسم بدون GID' : 'Select by tab name'}
            </span>
          </div>
        </div>

        {/* PILLAR 2: Internal Cases (System Case Management) */}
        <div 
          onClick={() => onNavigate('cases')}
          className={`border-2 rounded-3xl p-5 shadow-sm transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden ${
            isDark 
              ? 'bg-[#121824] border-blue-500/30 hover:border-blue-500/60 hover:shadow-blue-950/20' 
              : 'bg-white border-blue-300 hover:border-blue-500 hover:shadow-md hover:shadow-blue-100'
          }`}
        >
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
          
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center ${
                  isDark 
                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-400' 
                    : 'bg-blue-50 border-blue-200 text-blue-600'
                }`}>
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {isRTL ? '2. القضايا الداخلية' : '2. Internal Cases'}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isDark 
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' 
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      قاعدة المنظومة
                    </span>
                  </h2>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {isRTL ? 'ملفات العمل، المتابعة، والتوثيق المعتمدة' : 'Official active cases, timeline & files'}
                  </p>
                </div>
              </div>

              {isRTL ? (
                <ArrowLeft className={`w-5 h-5 group-hover:-translate-x-1 transition-transform ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
              ) : (
                <ArrowRight className={`w-5 h-5 group-hover:translate-x-1 transition-transform ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
              )}
            </div>

            {/* 3 Status Counters for Internal Cases */}
            <div className="grid grid-cols-3 gap-2 my-4">
              <div className={`border rounded-2xl p-3 text-center transition-colors ${
                isDark ? 'bg-[#0B0F17] border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className={`text-[10px] font-semibold block mb-0.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                  {isRTL ? 'قضايا مفتوحة' : 'Open'}
                </span>
                <span className={`text-lg font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {openCasesCount}
                </span>
              </div>

              <div className={`border rounded-2xl p-3 text-center transition-colors ${
                isDark ? 'bg-[#0B0F17] border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className={`text-[10px] font-semibold block mb-0.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                  {isRTL ? 'قيد المتابعة' : 'In Progress'}
                </span>
                <span className={`text-lg font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {inProgressCasesCount}
                </span>
              </div>

              <div className={`border rounded-2xl p-3 text-center transition-colors ${
                isDark ? 'bg-[#0B0F17] border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className={`text-[10px] font-semibold block mb-0.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  {isRTL ? 'المكتملة' : 'Closed'}
                </span>
                <span className={`text-lg font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {closedCasesCount}
                </span>
              </div>
            </div>
          </div>

          <div className={`pt-2.5 border-t flex items-center justify-between text-xs font-semibold ${
            isDark ? 'border-slate-800/80 text-blue-400' : 'border-slate-100 text-blue-600'
          }`}>
            <span>{isRTL ? 'إجمالي القضايا:' : 'Total Cases:'} {cases.length}</span>
            <span className={`text-[11px] font-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {isRTL ? 'بحث، تعديل، وإجراءات' : 'Search, edit, workflow'}
            </span>
          </div>
        </div>

      </div>

      {/* Urgent Attention & Today's Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Urgent Cases List (2 Cols) */}
        <div className={`lg:col-span-2 border rounded-3xl p-5 flex flex-col shadow-sm transition-colors ${
          isDark ? 'bg-[#121824] border-slate-800' : 'bg-white border-slate-200 shadow-slate-100'
        }`}>
          <div className={`flex items-center justify-between pb-3 border-b mb-3 ${
            isDark ? 'border-slate-800' : 'border-slate-100'
          }`}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {isRTL ? 'قضايا عاجلة بحاجة لمتابعة' : 'Urgent Cases Requiring Action'}
              </h3>
            </div>
            <button 
              onClick={() => onNavigate('cases')}
              className={`text-xs font-semibold cursor-pointer transition-colors ${
                isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
              }`}
            >
              {isRTL ? 'عرض كل القضايا' : 'View All'}
            </button>
          </div>

          {urgentCases.length === 0 ? (
            <div className={`py-8 text-center text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p>{isRTL ? 'ممتاز! لا توجد أي قضايا عاجلة متأخرة حالياً.' : 'No urgent cases requiring immediate intervention.'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {urgentCases.map((c) => (
                <div
                  key={c.id}
                  onClick={() => onSelectCase(c.id)}
                  className={`p-3 border rounded-2xl transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isDark 
                      ? 'bg-[#0B0F17] hover:bg-[#182132] border-slate-800 hover:border-slate-700' 
                      : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 hover:border-slate-300 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`font-mono text-xs font-bold px-2 py-1 rounded-lg border shrink-0 ${
                      isDark 
                        ? 'text-blue-400 bg-blue-950/60 border-blue-800/40' 
                        : 'text-blue-700 bg-blue-50 border-blue-200'
                    }`}>
                      {c.caseNumber}
                    </span>
                    <div className="min-w-0">
                      <p className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{c.title}</p>
                      <p className={`text-[10px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {c.client?.name || 'صاحب البلاغ'} • {c.platform || 'عام'}
                      </p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                    isDark 
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {c.priority === 'urgent' ? (isRTL ? 'عاجل جداً' : 'Urgent') : (isRTL ? 'أولوية عالية' : 'High')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today's Follow-ups & Reminders (1 Col) */}
        <div className={`border rounded-3xl p-5 flex flex-col shadow-sm transition-colors ${
          isDark ? 'bg-[#121824] border-slate-800' : 'bg-white border-slate-200 shadow-slate-100'
        }`}>
          <div className={`flex items-center justify-between pb-3 border-b mb-3 ${
            isDark ? 'border-slate-800' : 'border-slate-100'
          }`}>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {isRTL ? 'مواعيد متابعة اليوم' : "Today's Reminders"}
              </h3>
            </div>
            <button 
              onClick={() => onNavigate('reminders')}
              className={`text-xs font-semibold cursor-pointer transition-colors ${
                isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
              }`}
            >
              {isRTL ? 'الكل' : 'All'}
            </button>
          </div>

          {reminders.length === 0 ? (
            <div className={`py-8 text-center text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <Clock className={`w-7 h-7 mx-auto mb-2 opacity-50 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
              <p>{isRTL ? 'لا توجد مواعيد متابعة مجدولة لليوم.' : 'No follow-up reminders due today.'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {reminders.map((rem) => (
                <div 
                  key={rem.id} 
                  className={`p-2.5 border rounded-2xl text-xs space-y-1 ${
                    isDark ? 'bg-[#0B0F17] border-slate-800' : 'bg-slate-50 border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-amber-500 font-semibold">
                    <span>{rem.caseNumber || 'تذكير'}</span>
                    <span>{rem.dueTime || '10:00 AM'}</span>
                  </div>
                  <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{rem.title}</p>
                </div>
              ))}
            </div>
          )}

          {/* Supervisor Quick Links */}
          <div className={`mt-auto pt-4 border-t space-y-2 ${isDark ? 'border-slate-800/80' : 'border-slate-100'}`}>
            <button
              onClick={() => onNavigate('search')}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                isDark 
                  ? 'bg-[#0B0F17] hover:bg-slate-800 text-slate-300 hover:text-white' 
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 shadow-sm'
              }`}
            >
              <span className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-blue-500" />
                {isRTL ? 'البحث الشامل والمتقدم' : 'Global Search'}
              </span>
              <ChevronRight className={`w-3.5 h-3.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
            </button>

            {isSuperAdmin && (
              <button
                onClick={() => onNavigate('team')}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  isDark 
                    ? 'bg-[#0B0F17] hover:bg-slate-800 text-slate-300 hover:text-white' 
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 shadow-sm'
                }`}
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  {isRTL ? 'إدارة المشرفين والصلاحيات' : 'Admin & Permissions'}
                </span>
                <ChevronRight className={`w-3.5 h-3.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
              </button>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

