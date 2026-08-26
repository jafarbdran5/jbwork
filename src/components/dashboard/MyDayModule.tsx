import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
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
      <div className="relative overflow-hidden bg-gradient-to-r from-[#1E1B4B] via-[#121214] to-[#18181B] border border-indigo-500/30 p-6 rounded-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300">
                <Sun className="w-5 h-5" />
              </span>
              <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                {isRTL ? 'خطة العمل اليومية (My Day)' : 'Executive Daily Brief'}
              </span>
            </div>
            
            <h1 className="text-xl md:text-2xl font-black text-white">
              {isRTL 
                ? `مرحباً، ${userProfile?.displayName || 'جعفر بدران'}` 
                : `Welcome back, ${userProfile?.displayName || 'Jaafar'}`}
            </h1>
            <p className="text-xs text-[#A1A1AA] mt-1">{todayDateFormatted}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-[#121214]/80 backdrop-blur-sm border border-[#27272A] px-4 py-2.5 rounded-xl text-center">
              <div className="text-lg font-black text-white">{activeCases.length}</div>
              <div className="text-[10px] text-[#A1A1AA]">{isRTL ? 'قضايا نشطة' : 'Active Cases'}</div>
            </div>

            {isSuperAdmin && (
              <div className="bg-[#121214]/80 backdrop-blur-sm border border-amber-500/30 px-4 py-2.5 rounded-xl text-center">
                <div className="text-lg font-black text-amber-400">{pendingApprovals.length}</div>
                <div className="text-[10px] text-[#A1A1AA]">{isRTL ? 'موافقات معلقة' : 'Approvals'}</div>
              </div>
            )}
          </div>
        </div>

        {/* AI Recommendation Alert */}
        <div className="mt-5 p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-start gap-3 text-xs text-indigo-200">
          <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold text-white">
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
        <div className="bg-[#121214] border border-[#27272A] rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                {isRTL ? 'القضايا التي تتطلب اهتماماً عاجلاً' : 'High Priority Cases'}
              </h3>
              <span className="text-xs text-[#71717A] font-semibold">{urgentCases.length}</span>
            </div>

            {urgentCases.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#71717A]">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mx-auto mb-2" />
                {isRTL ? 'جميع القضايا العاجلة تحت السيطرة' : 'No urgent alerts today'}
              </div>
            ) : (
              <div className="space-y-2.5">
                {urgentCases.slice(0, 5).map((c) => (
                  <div 
                    key={c.id} 
                    onClick={() => onSelectCase && onSelectCase(c.id)}
                    className="p-3 bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] rounded-lg flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-mono text-indigo-400">{c.caseNumber}</span>
                        <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded font-semibold uppercase">{c.priority}</span>
                      </div>
                      <div className="text-xs font-bold text-white">{c.clientName}</div>
                      <div className="text-[11px] text-[#A1A1AA] truncate">{c.issueType}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#71717A]" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-[#27272A]">
            <button
              onClick={() => onNavigate && onNavigate('cases')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              {isRTL ? 'الانتقال إلى جميع القضايا →' : 'View All Cases →'}
            </button>
          </div>
        </div>

        {/* Approvals & Active Projects */}
        <div className="space-y-6">
          
          {/* Pending Approvals */}
          {isSuperAdmin && (
            <div className="bg-[#121214] border border-[#27272A] rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  {isRTL ? 'طلبات الموافقة المعلقة' : 'Pending Approvals'}
                </h3>
                <span className="text-xs text-amber-400 font-semibold">{pendingApprovals.length}</span>
              </div>

              {pendingApprovals.length === 0 ? (
                <div className="py-4 text-center text-xs text-[#71717A]">
                  {isRTL ? 'لا توجد طلبات معلقة بانتظار موافقتك' : 'No pending approvals'}
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingApprovals.slice(0, 3).map((a) => (
                    <div key={a.id} className="p-2.5 bg-[#18181B] border border-[#27272A] rounded-lg flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-amber-300 uppercase font-semibold block">{a.type}</span>
                        <span className="text-white font-medium">{a.title}</span>
                      </div>
                      <button
                        onClick={() => onNavigate && onNavigate('approvals')}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
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
          <div className="bg-[#121214] border border-[#27272A] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-400" />
                {isRTL ? 'المشاريع الجارية' : 'Ongoing Projects'}
              </h3>
              <button
                onClick={() => onNavigate && onNavigate('projects')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
              >
                {isRTL ? 'المزيد' : 'More'}
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="py-4 text-center text-xs text-[#71717A]">
                {isRTL ? 'لا توجد مشاريع مسجلة بعد' : 'No active projects'}
              </div>
            ) : (
              <div className="space-y-2">
                {projects.slice(0, 3).map((p) => (
                  <div key={p.id} className="p-2.5 bg-[#18181B] border border-[#27272A] rounded-lg flex items-center justify-between text-xs">
                    <span className="text-white font-medium truncate max-w-xs">{p.title}</span>
                    <span className="text-[10px] bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20 uppercase font-semibold">
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
