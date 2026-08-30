import React, { useState, useEffect } from 'react';
import { useI18n } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';
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
  const { isDark } = useTheme();

  const [myCases, setMyCases] = useState<CaseItem[]>([]);
  const [reminders, setReminders] = useState<CaseReminder[]>([]);
  const [tasks, setTasks] = useState<CaseTask[]>([]);
  const [requests, setRequests] = useState<InternalRequest[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!userProfile) return;

    // Jaafar's assigned cases or urgent cases
    const qCases = query(collection(db, 'cases'));
    const unsubCases = onSnapshot(qCases, (snap) => {
      const items = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as CaseItem))
        .filter(c => !c.isDeleted)
        .sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        })
        .slice(0, 15);
      setMyCases(items);
    });

    const qReminders = query(collection(db, 'caseReminders'));
    const unsubReminders = onSnapshot(qReminders, (snap) => {
      const items = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as CaseReminder))
        .sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        })
        .slice(0, 10);
      setReminders(items);
    });

    const qTasks = query(collection(db, 'caseTasks'), where('status', '==', 'todo'), limit(10));
    const unsubTasks = onSnapshot(qTasks, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as CaseTask)));
    });

    const qRequests = query(collection(db, 'requests'));
    const unsubRequests = onSnapshot(qRequests, (snap) => {
      const items = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as InternalRequest))
        .sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        })
        .slice(0, 8);
      setRequests(items);
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
      <div className={`border rounded-3xl p-6 sm:p-7 shadow-sm relative overflow-hidden transition-colors ${
        isDark 
          ? 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 border-amber-900/40 ring-1 ring-amber-500/20' 
          : 'bg-gradient-to-r from-amber-50 via-white to-orange-50 border-amber-200/80 shadow-amber-100/50'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                isDark 
                  ? 'text-amber-400 bg-amber-950/80 border-amber-800/60' 
                  : 'text-amber-800 bg-amber-100 border-amber-300'
              }`}>
                {isRTL ? 'مساحة العمل الخاصة بجعفر بدران' : 'Jaafar Bdran Private Suite'}
              </span>
            </div>
            <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isRTL ? 'مساحة جعفر — المتابعة والتحكم' : 'Jaafar Workspace & Control'}
            </h1>
            <p className={`text-xs mt-1 max-w-xl ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
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
              className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' 
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm'
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid: 3 Main Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Col 1: Pending Approvals & Requests */}
        <div className={`border rounded-3xl p-5 shadow-sm space-y-4 transition-colors ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <div className="flex items-center gap-2">
              <Inbox className={`w-4 h-4 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
              <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {isRTL ? 'طلبات الموافقة والمراجعة' : 'Pending Approvals'}
              </h2>
            </div>
            <button 
              onClick={() => onNavigate('requests')}
              className={`text-xs font-semibold hover:underline cursor-pointer ${isDark ? 'text-purple-400' : 'text-purple-600'}`}
            >
              {isRTL ? 'عرض الكل' : 'View All'}
            </button>
          </div>

          {requests.length === 0 ? (
            <p className={`text-xs py-6 text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t('noRequestsFound')}</p>
          ) : (
            <div className="space-y-2.5">
              {requests.map((req) => (
                <div 
                  key={req.id} 
                  className={`p-3 rounded-2xl border space-y-1 ${
                    isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{req.title}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      isDark 
                        ? 'text-purple-300 bg-purple-950 border-purple-800/60' 
                        : 'text-purple-700 bg-purple-50 border-purple-200'
                    }`}>
                      {req.type}
                    </span>
                  </div>
                  <div className={`flex items-center justify-between text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    <span>{req.requestedBy?.name}</span>
                    {req.caseNumber && <span className={`font-mono ${isDark ? 'text-cyan-400' : 'text-cyan-700 font-bold'}`}>{req.caseNumber}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Col 2: High Priority & Overdue Cases */}
        <div className={`border rounded-3xl p-5 shadow-sm space-y-4 transition-colors ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {isRTL ? 'أحدث القضايا النشطة' : 'Active Cases Overview'}
              </h2>
            </div>
            <button 
              onClick={() => onNavigate('cases')}
              className={`text-xs font-semibold hover:underline cursor-pointer ${isDark ? 'text-amber-400' : 'text-amber-700'}`}
            >
              {isRTL ? 'عرض القضايا' : 'View Cases'}
            </button>
          </div>

          <div className="space-y-2.5">
            {myCases.slice(0, 5).map((c) => (
              <div 
                key={c.id} 
                onClick={() => onSelectCase(c.id)}
                className={`p-3 rounded-2xl border cursor-pointer transition-colors ${
                  isDark 
                    ? 'bg-slate-950 border-slate-800 hover:border-slate-700' 
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-mono text-xs font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>{c.caseNumber}</span>
                  <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{c.platform}</span>
                </div>
                <h4 className={`text-xs font-bold truncate mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{c.title}</h4>
              </div>
            ))}
          </div>
        </div>

        {/* Col 3: Team Status & Key Controls */}
        <div className={`border rounded-3xl p-5 shadow-sm space-y-4 transition-colors ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <div className="flex items-center gap-2">
              <Users className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
              <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {isRTL ? 'حالة فريق العمل' : 'Team Status'}
              </h2>
            </div>
            <button 
              onClick={() => onNavigate('team')}
              className={`text-xs font-semibold hover:underline cursor-pointer ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}
            >
              {t('navTeam')}
            </button>
          </div>

          <div className="space-y-2">
            {teamMembers.map((member) => (
              <div 
                key={member.uid} 
                className={`flex items-center justify-between p-2.5 rounded-2xl border ${
                  isDark ? 'bg-slate-950 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-xl border flex items-center justify-center font-bold text-xs ${
                    isDark ? 'bg-cyan-950 border-cyan-800 text-cyan-400' : 'bg-cyan-100 border-cyan-300 text-cyan-800'
                  }`}>
                    {member.displayName?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <h4 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{member.displayName}</h4>
                    <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{member.role}</p>
                  </div>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};

