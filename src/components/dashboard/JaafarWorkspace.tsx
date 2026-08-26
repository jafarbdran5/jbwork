import React, { useState, useEffect } from 'react';
import { useI18n } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import { db } from '../../lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { CaseItem, CaseReminder, CaseTask, InternalRequest, UserProfile } from '../../types';
import { 
  Briefcase, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  CheckSquare, 
  Users, 
  Inbox, 
  FolderPlus, 
  ChevronRight, 
  Settings, 
  Layers,
  Zap,
  TrendingUp,
  FileText
} from 'lucide-react';

interface JaafarWorkspaceProps {
  onSelectCase: (caseId: string) => void;
  onOpenQuickCase: (type?: string) => void;
  onNavigate: (view: string) => void;
}

export const JaafarWorkspace: React.FC<JaafarWorkspaceProps> = ({
  onSelectCase,
  onOpenQuickCase,
  onNavigate
}) => {
  const { t, isRTL } = useI18n();
  const { userProfile, isSuperAdmin } = useAuth();

  const [myCases, setMyCases] = useState<CaseItem[]>([]);
  const [reminders, setReminders] = useState<CaseReminder[]>([]);
  const [tasks, setTasks] = useState<CaseTask[]>([]);
  const [requests, setRequests] = useState<InternalRequest[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!userProfile) return;

    // Jaafar's assigned cases or urgent cases
    const qCases = query(collection(db, 'cases'), where('isDeleted', '==', false), orderBy('createdAt', 'desc'), limit(15));
    const unsubCases = onSnapshot(qCases, (snap) => {
      setMyCases(snap.docs.map(d => ({ id: d.id, ...d.data() } as CaseItem)));
    });

    const qReminders = query(collection(db, 'caseReminders'), orderBy('createdAt', 'desc'), limit(10));
    const unsubReminders = onSnapshot(qReminders, (snap) => {
      setReminders(snap.docs.map(d => ({ id: d.id, ...d.data() } as CaseReminder)));
    });

    const qTasks = query(collection(db, 'caseTasks'), where('status', '==', 'todo'), limit(10));
    const unsubTasks = onSnapshot(qTasks, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as CaseTask)));
    });

    const qRequests = query(collection(db, 'requests'), orderBy('createdAt', 'desc'), limit(8));
    const unsubRequests = onSnapshot(qRequests, (snap) => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as InternalRequest)));
    });

    const unsubTeam = onSnapshot(collection(db, 'users'), (snap) => {
      setTeamMembers(snap.docs.map(d => d.data() as UserProfile));
    });

    return () => {
      unsubCases();
      unsubReminders();
      unsubTasks();
      unsubRequests();
      unsubTeam();
    };
  }, [userProfile]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 border border-amber-900/40 rounded-3xl p-6 sm:p-7 shadow-2xl ring-1 ring-amber-500/20 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-800/60">
                {isRTL ? 'مساحة العمل الخاصة بجعفر بدران' : 'Jaafar Bdran Private Suite'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {isRTL ? 'مساحة جعفر — المتابعة والتحكم' : 'Jaafar Workspace & Control'}
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              {isRTL 
                ? 'لوحة الإشراف المباشر على كافة القضايا والطلبات العالقة واعتمادات الفريق والمؤشرات الحيوية.'
                : 'Direct supervisor dashboard for cases, pending approvals, team operations and vital stats.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onOpenQuickCase()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/20 transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              <span>{t('newCase')}</span>
            </button>
            <button
              onClick={() => onNavigate('settings')}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid: 3 Main Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Col 1: Pending Approvals & Requests */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Inbox className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-bold text-white">
                {isRTL ? 'طلبات الموافقة والمراجعة' : 'Pending Approvals'}
              </h2>
            </div>
            <button 
              onClick={() => onNavigate('requests')}
              className="text-xs text-purple-400 hover:underline font-semibold"
            >
              {isRTL ? 'عرض الكل' : 'View All'}
            </button>
          </div>

          {requests.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">{t('noRequestsFound')}</p>
          ) : (
            <div className="space-y-2.5">
              {requests.map((req) => (
                <div key={req.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">{req.title}</span>
                    <span className="text-[10px] font-bold text-purple-300 bg-purple-950 px-2 py-0.5 rounded border border-purple-800/60">
                      {req.type}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{req.requestedBy?.name}</span>
                    {req.caseNumber && <span className="font-mono text-cyan-400">{req.caseNumber}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Col 2: High Priority & Overdue Cases */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white">
                {isRTL ? 'أحدث القضايا النشطة' : 'Active Cases Overview'}
              </h2>
            </div>
            <button 
              onClick={() => onNavigate('cases')}
              className="text-xs text-amber-400 hover:underline font-semibold"
            >
              {isRTL ? 'عرض القضايا' : 'View Cases'}
            </button>
          </div>

          <div className="space-y-2.5">
            {myCases.slice(0, 5).map((c) => (
              <div 
                key={c.id} 
                onClick={() => onSelectCase(c.id)}
                className="p-3 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-cyan-400">{c.caseNumber}</span>
                  <span className="text-[10px] text-slate-400">{c.platform}</span>
                </div>
                <h4 className="text-xs font-bold text-white truncate mt-1">{c.title}</h4>
              </div>
            ))}
          </div>
        </div>

        {/* Col 3: Team Status & Key Controls */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white">
                {isRTL ? 'حالة فريق العمل' : 'Team Status'}
              </h2>
            </div>
            <button 
              onClick={() => onNavigate('team')}
              className="text-xs text-cyan-400 hover:underline font-semibold"
            >
              {t('navTeam')}
            </button>
          </div>

          <div className="space-y-2">
            {teamMembers.map((member) => (
              <div key={member.uid} className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center font-bold text-cyan-400 text-xs">
                    {member.displayName?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{member.displayName}</h4>
                    <p className="text-[10px] text-slate-400">{member.role}</p>
                  </div>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
