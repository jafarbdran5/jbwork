import React, { useState, useEffect } from 'react';
import { useI18n } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import { db } from '../../lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { CaseItem, PaymentRecord } from '../../types';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Layers, 
  DollarSign, 
  Calendar,
  AlertCircle
} from 'lucide-react';

export const ReportsModule: React.FC = () => {
  const { t, isRTL } = useI18n();
  const { userProfile } = useAuth();

  const [cases, setCases] = useState<CaseItem[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const qCases = query(collection(db, 'cases'), where('isDeleted', '==', false));
    const unsubCases = onSnapshot(qCases, (snap) => {
      setCases(snap.docs.map(d => ({ id: d.id, ...d.data() } as CaseItem)));
      setLoading(false);
    });

    const qPayments = query(collection(db, 'payments'));
    const unsubPayments = onSnapshot(qPayments, (snap) => {
      setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentRecord)));
    });

    return () => {
      unsubCases();
      unsubPayments();
    };
  }, []);

  const total = cases.length;
  const completed = cases.filter(c => c.status === 'completed').length;
  const inProgress = cases.filter(c => c.status === 'in_progress').length;
  const pending = cases.filter(c => c.status === 'pending').length;
  const overdue = cases.filter(c => c.status === 'overdue').length;

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Platform Distribution
  const platformCounts: Record<string, number> = {};
  cases.forEach(c => {
    const p = c.platform || (isRTL ? 'أخرى' : 'Other');
    platformCounts[p] = (platformCounts[p] || 0) + 1;
  });

  // Type Distribution
  const typeCounts: Record<string, number> = {};
  cases.forEach(c => {
    const t = c.caseType || 'other';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-cyan-400" />
          <span>{t('navReports')}</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          {isRTL ? 'التقارير التحليلية والإحصاءات ومعدلات إنجاز القضايا' : 'Performance reports, completion rates, and operational breakdown'}
        </p>
      </div>

      {/* 4 Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
          <span className="text-xs font-semibold text-slate-400 block">{t('totalCases')}</span>
          <p className="text-2xl font-black text-white font-mono mt-1">{total}</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
          <span className="text-xs font-semibold text-slate-400 block">{isRTL ? 'نسبة الإنجاز' : 'Completion Rate'}</span>
          <p className="text-2xl font-black text-emerald-400 font-mono mt-1">{completionRate}%</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
          <span className="text-xs font-semibold text-slate-400 block">{t('filterInProgress')}</span>
          <p className="text-2xl font-black text-cyan-400 font-mono mt-1">{inProgress}</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
          <span className="text-xs font-semibold text-slate-400 block">{t('filterPending')}</span>
          <p className="text-2xl font-black text-amber-400 font-mono mt-1">{pending}</p>
        </div>

      </div>

      {/* Grid: 2 Breakdown modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Platform Breakdown */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-cyan-400" />
              <span>{isRTL ? 'حسب المنصة' : 'By Platform'}</span>
            </h3>
          </div>

          <div className="space-y-3">
            {Object.entries(platformCounts).map(([platform, count]) => {
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={platform} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-semibold">{platform}</span>
                    <span className="font-mono text-slate-400">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div className="bg-cyan-500 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Case Type Breakdown */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              <span>{isRTL ? 'حسب نوع القضية' : 'By Case Type'}</span>
            </h3>
          </div>

          <div className="space-y-3">
            {Object.entries(typeCounts).map(([type, count]) => {
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={type} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-semibold">{type}</span>
                    <span className="font-mono text-slate-400">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
};
