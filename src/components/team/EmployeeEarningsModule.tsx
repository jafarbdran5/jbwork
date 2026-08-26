import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Briefcase, 
  Calendar, 
  User, 
  Filter, 
  FileText,
  Building2
} from 'lucide-react';
import { EmployeeAllocation, UserProfile } from '../../types';
import { logAuditAndEvent } from '../../lib/audit';

interface EmployeeEarningsModuleProps {
  onSelectCase?: (caseId: string) => void;
}

export const EmployeeEarningsModule: React.FC<EmployeeEarningsModuleProps> = ({ onSelectCase }) => {
  const { userProfile, isSuperAdmin } = useAuth();
  const { isRTL } = useI18n();

  const [allocations, setAllocations] = useState<EmployeeAllocation[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [selectedMemberUid, setSelectedMemberUid] = useState<string>(userProfile?.uid || '');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [loading, setLoading] = useState<boolean>(true);

  // Subscriptions
  useEffect(() => {
    if (!userProfile) return;
    setLoading(true);

    // If Super Admin, fetch all team members for dropdown
    if (isSuperAdmin) {
      const unsubTeam = onSnapshot(collection(db, 'users'), (snap) => {
        setTeamMembers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
      });

      const unsubAlloc = onSnapshot(collection(db, 'employee_allocations'), (snap) => {
        setAllocations(snap.docs.map(d => ({ id: d.id, ...d.data() } as EmployeeAllocation)));
        setLoading(false);
      });

      return () => {
        unteamMembers: unsubTeam();
        unsubAlloc();
      };
    } else {
      // Regular employee -> strictly their own allocations
      const q = query(collection(db, 'employee_allocations'), where('employeeUid', '==', userProfile.uid));
      const unsubAlloc = onSnapshot(q, (snap) => {
        setAllocations(snap.docs.map(d => ({ id: d.id, ...d.data() } as EmployeeAllocation)));
        setLoading(false);
      });

      return () => unsubAlloc();
    }
  }, [userProfile, isSuperAdmin]);

  // Filtered Allocations
  const filteredList = useMemo(() => {
    return allocations.filter(a => {
      // Employee isolation
      if (!isSuperAdmin) {
        if (a.employeeUid !== userProfile?.uid) return false;
      } else if (selectedMemberUid && selectedMemberUid !== 'ALL') {
        if (a.employeeUid !== selectedMemberUid) return false;
      }

      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      return true;
    });
  }, [allocations, isSuperAdmin, selectedMemberUid, userProfile, statusFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const totalEarned = filteredList.filter(a => a.status !== 'cancelled').reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
    const totalPaid = filteredList.filter(a => a.status === 'paid').reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
    const totalPending = filteredList.filter(a => a.status === 'pending').reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

    return { totalEarned, totalPaid, totalPending };
  }, [filteredList]);

  // Mark as Paid (Super Admin Only)
  const handleMarkAsPaid = async (allocationId: string) => {
    if (!isSuperAdmin) return;
    try {
      await updateDoc(doc(db, 'employee_allocations', allocationId), {
        status: 'paid',
        paidAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await logAuditAndEvent({
        action: 'EMPLOYEE_ALLOCATION_PAID',
        details: `تسليم مستحقات الموظف للحوالة ${allocationId}`,
        entityType: 'employee_allocation',
        user: userProfile || undefined
      });
    } catch (err) {
      console.error('Error updating allocation status:', err);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {isSuperAdmin 
                ? (isRTL ? 'مستحقات وأجور فريق العمل' : 'Team Earnings & Allocations')
                : (isRTL ? 'مستحقاتي وأرباحي من القضايا' : 'My Case Earnings')}
            </h1>
            <p className="text-xs text-slate-400">
              {isRTL 
                ? 'سجل المخصصات والمبالغ المعتمدة من القضايا المنجزة' 
                : 'Allocated earnings and payouts from assigned cases'}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Member Selector for Super Admin */}
          {isSuperAdmin && (
            <select
              value={selectedMemberUid}
              onChange={e => setSelectedMemberUid(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">{isRTL ? 'كل أعضاء الفريق' : 'All Team Members'}</option>
              {teamMembers.map(m => (
                <option key={m.uid} value={m.uid}>{m.displayName} ({m.role})</option>
              ))}
            </select>
          )}

          {/* Status Filter */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {(['all', 'pending', 'paid'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  statusFilter === st
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st === 'all' ? (isRTL ? 'الكل' : 'All') :
                 st === 'pending' ? (isRTL ? 'معلقة' : 'Pending') :
                 (isRTL ? 'مدفوعة' : 'Paid')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Total Earned */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>{isRTL ? 'إجمالي المخصصات' : 'Total Allocations'}</span>
            <div className="p-2 rounded-lg bg-blue-950/60 text-blue-400 border border-blue-800/40">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-400 font-mono">
            {metrics.totalEarned.toLocaleString()} <span className="text-xs font-sans text-blue-500/80">USD/SYP</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {isRTL ? 'مجموع المبالغ المخصصة من القضايا' : 'Total shares across cases'}
          </p>
        </div>

        {/* Total Paid */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>{isRTL ? 'تم تسليمه (مدفوع)' : 'Total Paid Out'}</span>
            <div className="p-2 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {metrics.totalPaid.toLocaleString()} <span className="text-xs font-sans text-emerald-500/80">USD/SYP</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {isRTL ? 'مبالغ تم استلامها بالكامل' : 'Completed payouts'}
          </p>
        </div>

        {/* Total Pending */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>{isRTL ? 'المستحقات المعلقة' : 'Pending Payouts'}</span>
            <div className="p-2 rounded-lg bg-amber-950/60 text-amber-400 border border-amber-800/40">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">
            {metrics.totalPending.toLocaleString()} <span className="text-xs font-sans text-amber-500/80">USD/SYP</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {isRTL ? 'مستحقات قيد الصرف' : 'Awaiting payout'}
          </p>
        </div>

      </div>

      {/* Allocations Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <h3 className="font-bold text-white text-sm">
            {isRTL ? 'تفاصيل المخصصات حسب القضايا' : 'Case Allocation Records'}
          </h3>
          <span className="text-xs font-mono text-slate-400">{filteredList.length} سجل</span>
        </div>

        <div className="space-y-3">
          {filteredList.length > 0 ? (
            filteredList.map(alloc => (
              <div 
                key={alloc.id} 
                className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-slate-700 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-cyan-400 font-bold">{alloc.caseNumber}</span>
                    <span className="font-semibold text-slate-200">{alloc.caseTitle || alloc.caseNumber}</span>
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                    {isSuperAdmin && <span className="text-blue-400 font-medium">{alloc.employeeName} •</span>}
                    <span>{alloc.allocatedDate}</span>
                    {alloc.clientName && <span>• {isRTL ? 'العميل:' : 'Client:'} {alloc.clientName}</span>}
                    {alloc.note && <span>• {alloc.note}</span>}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <div className="text-right">
                    <div className="font-bold text-blue-400 font-mono text-sm">
                      {alloc.amount.toLocaleString()} {alloc.currency}
                    </div>
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium mt-0.5 ${
                      alloc.status === 'paid' 
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                        : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}>
                      {alloc.status === 'paid' ? (isRTL ? 'تم التسليم' : 'Paid') : (isRTL ? 'معلق للصرف' : 'Pending')}
                    </span>
                  </div>

                  {isSuperAdmin && alloc.status === 'pending' && (
                    <button
                      onClick={() => handleMarkAsPaid(alloc.id)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 cursor-pointer transition-colors"
                    >
                      {isRTL ? 'تسجيل كمدفوع' : 'Mark as Paid'}
                    </button>
                  )}

                  {onSelectCase && alloc.caseId && (
                    <button
                      onClick={() => onSelectCase(alloc.caseId)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                      title="Open Case"
                    >
                      <Briefcase className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">
              {isRTL ? 'لا توجد مخصصات مسجلة في هذا القسم.' : 'No allocation records found.'}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
