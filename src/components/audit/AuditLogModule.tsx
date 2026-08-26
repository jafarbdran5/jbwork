import React, { useState, useEffect } from 'react';
import { useI18n } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { AuditLogEntry } from '../../types';
import { 
  ShieldCheck, 
  Search, 
  Clock, 
  User, 
  Activity, 
  Filter,
  FileText
} from 'lucide-react';

export const AuditLogModule: React.FC = () => {
  const { t, isRTL } = useI18n();
  const { userProfile, canManageFinance } = useAuth();

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  useEffect(() => {
    const q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLogEntry)));
      setLoading(false);
    }, (err) => {
      console.warn('Audit logs snapshot fallback:', err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filtered = logs.filter(item => {
    if (actionFilter !== 'all' && item.action !== actionFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.details?.toLowerCase().includes(q) ||
        item.performedBy?.name?.toLowerCase().includes(q) ||
        item.entityTitle?.toLowerCase().includes(q) ||
        item.action?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          <span>{t('navActivityLog')}</span>
          <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2.5 py-0.5 rounded-full border border-slate-800">
            {filtered.length}
          </span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          {isRTL ? 'سجل العمليات والرقابة الأمنية غير القابل للتعديل' : 'Immutable audit trail of all system actions and operations'}
        </p>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isRTL ? 'ابحث في سجل العمليات، اسم المستخدم، تفاصيل الإجراء...' : 'Search logs, users, details...'}
            className="w-full bg-slate-900/90 border border-slate-800 rounded-xl ps-10 pe-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
        >
          <option value="all">{isRTL ? 'جميع العمليات' : 'All Actions'}</option>
          <option value="CREATE_CASE">CREATE CASE</option>
          <option value="UPDATE_CASE">UPDATE CASE</option>
          <option value="STATUS_CHANGE">STATUS CHANGE</option>
          <option value="ADD_NOTE">ADD NOTE</option>
          <option value="UPLOAD_ATTACHMENT">UPLOAD ATTACHMENT</option>
          <option value="CREATE_PAYMENT">CREATE PAYMENT</option>
          <option value="UPDATE_TEAM_MEMBER">UPDATE TEAM MEMBER</option>
        </select>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 font-mono">
          {isRTL ? 'جارٍ تحميل سجل العمليات...' : 'Loading audit trail...'}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-500">
          {isRTL ? 'لا توجد سجلات تطابق البحث' : 'No audit records match search'}
        </div>
      ) : (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="divide-y divide-slate-800/80">
            {filtered.map((log) => (
              <div key={log.id} className="p-4 hover:bg-slate-850 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                      {log.action}
                    </span>
                    <span className="font-semibold text-white">{log.details}</span>
                  </div>

                  {log.entityTitle && (
                    <p className="text-[11px] text-slate-400">
                      {isRTL ? 'العنصر:' : 'Target:'} <span className="text-slate-300 font-medium">{log.entityTitle}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 text-slate-400 text-[11px] shrink-0">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>{log.performedBy?.name}</span>
                  </span>
                  <span className="font-mono text-slate-500">
                    {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString('ar-EG') : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
