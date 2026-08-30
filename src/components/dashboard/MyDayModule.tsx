import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { useTheme } from '../../lib/theme';
import { db } from '../../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { CaseItem, ProjectItem, ApprovalRequest } from '../../types';
import { 
  Sun, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Briefcase, 
  Calendar, 
  CheckSquare, 
  ArrowRight, 
  DollarSign, 
  Activity, 
  Layers 
} from 'lucide-react';

export const MyDayModule: React.FC<{
  onSelectCase?: (caseId: string) => void;
  onNavigate?: (view: string) => void;
}> = ({ onSelectCase, onNavigate }) => {
  const { userProfile, isSuperAdmin } = useAuth();
  const { isRTL } = useI18n();
  const { isDark } = useTheme();

  const [activeCases, setActiveCases] = useState<CaseItem[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load active cases
    const unsubCases = onSnapshot(
      query(collection(db, 'cases'), limit(20)), 
      (snap) => {
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as CaseItem));
        const urgentOrOpen = all.filter(c => c.status !== 'completed' && c.status !== 'cancelled');
        setActiveCases(urgentOrOpen);
        setIsLoading(false);
      },
      (error) => {
        console.warn("MyDay: cases snapshot error", error);
        setIsLoading(false);
      }
    );

    const unsubApprovals = onSnapshot(
      query(collection(db, 'approval_requests'), limit(10)), 
      (snap) => {
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as ApprovalRequest));
        setPendingApprovals(all.filter(a => a.status === 'pending'));
      },
      (error) => {
        console.warn("MyDay: approvals snapshot error", error);
      }
    );

    const unsubProjects = onSnapshot(
      query(collection(db, 'projects'), limit(5)), 
      (snap) => {
        setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProjectItem)));
      },
      (error) => {
        console.warn("MyDay: projects snapshot error", error);
      }
    );

    return () => {
      unsubCases();
      unsubApprovals();
      unsubProjects();
    };
  }, []);

  const urgentCases = activeCases.filter(c => c.priority === 'urgent' || c.priority === 'high');
  const todayDateFormatted = new Date().toLocaleDateString(isRTL ? 'ar-SY' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="space-y-6">
      
      {/* Morning Greeting & AI Recommendations Hero */}
      <div className={`relative overflow-hidden border p-6 rounded-3xl shadow-sm transition-colors ${
        isDark 
          ? 'bg-gradient-to-r from-[#1E1B4B] via-[#121214] to-[#18181B] border-indigo-500/30' 
          : 'bg-gradient-to-r from-indigo-50 via-white to-blue-50 border-indigo-100 shadow-indigo-100/50'
      }`}>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`p-1.5 rounded-lg ${isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700'}`}>
                <Sun className="w-5 h-5" />
              </span>
              <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                {isRTL ? 'خطة العمل اليومية (My Day)' : 'Executive Daily Brief'}
              </span>
            </div>
            
            <h1 className={`text-xl md:text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isRTL 
                ? `مرحباً، ${userProfile?.displayName || 'جعفر بدران'}` 
                : `Welcome back, ${userProfile?.displayName || 'Jaafar'}`}
            </h1>
            <p className={`text-xs mt-1 ${isDark ? 'text-[#A1A1AA]' : 'text-slate-500'}`}>{todayDateFormatted}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className={`backdrop-blur-sm border px-4 py-2.5 rounded-2xl text-center shadow-sm ${
              isDark 
                ? 'bg-[#121214]/80 border-[#27272A]' 
                : 'bg-white border-slate-200'
            }`}>
              <div className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{activeCases.length}</div>
              <div className={`text-[10px] ${isDark ? 'text-[#A1A1AA]' : 'text-slate-500'}`}>{isRTL ? 'قضايا نشطة' : 'Active Cases'}</div>
            </div>

            {isSuperAdmin && (
              <div className={`backdrop-blur-sm border px-4 py-2.5 rounded-2xl text-center shadow-sm ${
                isDark 
                  ? 'bg-[#121214]/80 border-amber-500/30' 
                  : 'bg-amber-50 border-amber-200'
              }`}>
                <div className={`text-lg font-black ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>{pendingApprovals.length}</div>
                <div className={`text-[10px] ${isDark ? 'text-[#A1A1AA]' : 'text-amber-800'}`}>{isRTL ? 'موافقات معلقة' : 'Approvals'}</div>
              </div>
            )}
          </div>
        </div>

        {/* AI Recommendation Alert */}
        <div className={`mt-5 p-3.5 border rounded-2xl flex items-start gap-3 text-xs ${
          isDark 
            ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-200' 
            : 'bg-indigo-100/60 border-indigo-200 text-indigo-900'
        }`}>
          <Sparkles className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
          <div className="flex-1">
            <span className={`font-semibold ${isDark ? 'text-white' : 'text-indigo-950'}`}>
              {isRTL ? 'توصيات الذكاء الاصطناعي لليوم: ' : 'AI Daily Action Plan: '}
            </span>
            {urgentCases.length > 0 ? (
              <span>
                {isRTL 
                  ? `يوجد ${urgentCases.length} قضايا عاجلة بحاجة إلى تدخل أمني فوري ومتابعة مع العميل اليوم.` 
                  : `You have ${urgentCases.length} urgent cases requiring immediate attention.`}
              </span>
            ) : (
              <span>
                {isRTL 
                  ? 'لا توجد قضايا عاجلة متأخرة اليوم. وقت ممتاز لمراجعة أهداف المشاريع وصناعة المحتوى.' 
                  : 'All urgent cases are handled. Great time to focus on strategic milestones.'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Urgent Cases & Action Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Urgent Cases Card */}
        <div className={`border rounded-3xl p-5 flex flex-col justify-between shadow-sm transition-colors ${
          isDark ? 'bg-[#121214] border-[#27272A]' : 'bg-white border-slate-200'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                {isRTL ? 'القضايا التي تتطلب اهتماماً عاجلاً' : 'High Priority Cases'}
              </h3>
              <span className={`text-xs font-semibold ${isDark ? 'text-[#71717A]' : 'text-slate-500'}`}>{urgentCases.length}</span>
            </div>

            {urgentCases.length === 0 ? (
              <div className={`py-8 text-center text-xs ${isDark ? 'text-[#71717A]' : 'text-slate-400'}`}>
                <CheckCircle2 className={`w-8 h-8 mx-auto mb-2 opacity-60 ${isDark ? 'text-emerald-500' : 'text-emerald-600'}`} />
                {isRTL ? 'جميع القضايا العاجلة تحت السيطرة' : 'No urgent alerts today'}
              </div>
            ) : (
              <div className="space-y-2.5">
                {urgentCases.slice(0, 5).map((c) => (
                  <div 
                    key={c.id} 
                    onClick={() => onSelectCase && onSelectCase(c.id)}
                    className={`p-3 border rounded-2xl flex items-center justify-between cursor-pointer transition-colors ${
                      isDark 
                        ? 'bg-[#18181B] hover:bg-[#27272A] border-[#27272A]' 
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 shadow-sm'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[10px] font-mono font-bold ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>{c.caseNumber}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                          isDark ? 'bg-rose-500/20 text-rose-300' : 'bg-rose-100 text-rose-700'
                        }`}>{c.priority}</span>
                      </div>
                      <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{c.clientName}</div>
                      <div className={`text-[11px] truncate ${isDark ? 'text-[#A1A1AA]' : 'text-slate-500'}`}>{c.issueType}</div>
                    </div>
                    <ArrowRight className={`w-4 h-4 ${isDark ? 'text-[#71717A]' : 'text-slate-400'}`} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={`pt-4 mt-4 border-t ${isDark ? 'border-[#27272A]' : 'border-slate-100'}`}>
            <button
              onClick={() => onNavigate && onNavigate('cases')}
              className={`text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'
              }`}
            >
              {isRTL ? 'الانتقال إلى جميع القضايا ←' : 'View All Cases →'}
            </button>
          </div>
        </div>

        {/* Approvals & Active Projects */}
        <div className="space-y-6">
          
          {/* Pending Approvals */}
          {isSuperAdmin && (
            <div className={`border rounded-3xl p-5 shadow-sm transition-colors ${
              isDark ? 'bg-[#121214] border-[#27272A]' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <Clock className="w-4 h-4 text-amber-500" />
                  {isRTL ? 'طلبات الموافقة المعلقة' : 'Pending Approvals'}
                </h3>
                <span className="text-xs text-amber-500 font-semibold">{pendingApprovals.length}</span>
              </div>

              {pendingApprovals.length === 0 ? (
                <div className={`py-4 text-center text-xs ${isDark ? 'text-[#71717A]' : 'text-slate-400'}`}>
                  {isRTL ? 'لا توجد طلبات معلقة بانتظار موافقتك' : 'No pending approvals'}
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingApprovals.slice(0, 3).map((a) => (
                    <div 
                      key={a.id} 
                      className={`p-2.5 border rounded-2xl flex items-center justify-between text-xs ${
                        isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-slate-50 border-slate-200 shadow-sm'
                      }`}
                    >
                      <div>
                        <span className={`text-[10px] uppercase font-semibold block ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>{a.type}</span>
                        <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{a.title}</span>
                      </div>
                      <button
                        onClick={() => onNavigate && onNavigate('approvals')}
                        className={`text-[11px] font-semibold cursor-pointer transition-colors ${
                          isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'
                        }`}
                      >
                        {isRTL ? 'مراجعة' : 'Review'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quick Active Projects */}
          <div className={`border rounded-3xl p-5 shadow-sm transition-colors ${
            isDark ? 'bg-[#121824] border-[#27272A]' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <Briefcase className={`w-4 h-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                {isRTL ? 'المشاريع الجارية' : 'Ongoing Projects'}
              </h3>
              <button
                onClick={() => onNavigate && onNavigate('projects')}
                className={`text-xs font-semibold cursor-pointer transition-colors ${
                  isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'
                }`}
              >
                {isRTL ? 'المزيد' : 'More'}
              </button>
            </div>

            {projects.length === 0 ? (
              <div className={`py-4 text-center text-xs ${isDark ? 'text-[#71717A]' : 'text-slate-400'}`}>
                {isRTL ? 'لا توجد مشاريع مسجلة بعد' : 'No active projects'}
              </div>
            ) : (
              <div className="space-y-2">
                {projects.slice(0, 3).map((p) => (
                  <div 
                    key={p.id} 
                    className={`p-2.5 border rounded-2xl flex items-center justify-between text-xs ${
                      isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-slate-50 border-slate-200 shadow-sm'
                    }`}
                  >
                    <span className={`font-medium truncate max-w-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>{p.title}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-semibold ${
                      isDark 
                        ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' 
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    }`}>
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};

