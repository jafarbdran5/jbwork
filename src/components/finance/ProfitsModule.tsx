import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  orderBy,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Receipt, 
  Plus, 
  Calendar, 
  Filter, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  Building2,
  FileText,
  AlertCircle,
  ChevronDown
} from 'lucide-react';
import { 
  CaseItem, 
  PaymentRecord, 
  EmployeeAllocation, 
  BusinessExpense, 
  SystemSetting 
} from '../../types';
import { logAuditAndEvent } from '../../lib/audit';

export const ProfitsModule: React.FC<{ onSelectCase?: (caseId: string) => void }> = ({ onSelectCase }) => {
  const { userProfile, isSuperAdmin } = useAuth();
  const { isRTL } = useI18n();

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [allocations, setAllocations] = useState<EmployeeAllocation[]>([]);
  const [expenses, setExpenses] = useState<BusinessExpense[]>([]);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Time Filter: 'all' | 'today' | 'week' | 'month' | 'year' | 'custom'
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('month');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('ALL');

  // Modals
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [newExpense, setNewExpense] = useState<{
    title: string;
    category: BusinessExpense['category'];
    amount: number;
    currency: string;
    expenseDate: string;
    paymentMethod: string;
    recipient: string;
    notes: string;
  }>({
    title: '',
    category: 'tools_software',
    amount: 0,
    currency: 'USD',
    expenseDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'Cash',
    recipient: '',
    notes: ''
  });
  const [savingExpense, setSavingExpense] = useState<boolean>(false);

  // Load Realtime Data
  useEffect(() => {
    if (!isSuperAdmin) return;

    setLoading(true);

    // 1. Payments
    const unsubPayments = onSnapshot(collection(db, 'payments'), (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentRecord));
      setPayments(items);
    });

    // 2. Employee Allocations
    const unsubAlloc = onSnapshot(collection(db, 'employee_allocations'), (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as EmployeeAllocation));
      setAllocations(items);
    });

    // 3. Business Expenses
    const unsubExpenses = onSnapshot(collection(db, 'business_expenses'), (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as BusinessExpense));
      setExpenses(items);
    });

    // 4. Cases
    const unsubCases = onSnapshot(query(collection(db, 'cases'), where('isDeleted', '==', false)), (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as CaseItem));
      setCases(items);
      setLoading(false);
    });

    return () => {
      unsubPayments();
      unsubAlloc();
      unsubExpenses();
      unsubCases();
    };
  }, [isSuperAdmin]);

  // Date Filter Logic
  const filterDateRange = useMemo(() => {
    const now = new Date();
    if (timeFilter === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      return { start };
    }
    if (timeFilter === 'week') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return { start: d.toISOString() };
    }
    if (timeFilter === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      return { start };
    }
    if (timeFilter === 'year') {
      const start = new Date(now.getFullYear(), 0, 1).toISOString();
      return { start };
    }
    return { start: '1970-01-01' };
  }, [timeFilter]);

  // Filtered Financial Totals
  const { filteredPayments, filteredAllocations, filteredExpenses, totalsByCurrency } = useMemo(() => {
    const minDateStr = filterDateRange.start.split('T')[0];

    const fPayments = payments.filter(p => (p.paymentDate || '') >= minDateStr);
    const fAlloc = allocations.filter(a => (a.allocatedDate || '') >= minDateStr && a.status !== 'cancelled');
    const fExp = expenses.filter(e => (e.expenseDate || '') >= minDateStr && e.status !== 'reversal');

    // Grouping by currency
    const currencies = Array.from(new Set([
      ...fPayments.map(p => p.currency || 'USD'),
      ...fAlloc.map(a => a.currency || 'USD'),
      ...fExp.map(e => e.currency || 'USD')
    ]));

    const summary: Record<string, { revenue: number; allocations: number; expenses: number; netProfit: number }> = {};

    currencies.forEach(curr => {
      const rev = fPayments.filter(p => (p.currency || 'USD') === curr).reduce((sum, p) => sum + (Number(p.paymentAmount) || 0), 0);
      const alloc = fAlloc.filter(a => (a.currency || 'USD') === curr).reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
      const exp = fExp.filter(e => (e.currency || 'USD') === curr).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const net = rev - alloc - exp;

      summary[curr] = {
        revenue: rev,
        allocations: alloc,
        expenses: exp,
        netProfit: net
      };
    });

    return {
      filteredPayments: fPayments,
      filteredAllocations: fAlloc,
      filteredExpenses: fExp,
      totalsByCurrency: summary
    };
  }, [payments, allocations, expenses, filterDateRange]);

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.title.trim() || newExpense.amount <= 0) return;

    setSavingExpense(true);
    try {
      const docData: Omit<BusinessExpense, 'id'> = {
        title: newExpense.title.trim(),
        category: newExpense.category,
        amount: Number(newExpense.amount),
        currency: newExpense.currency,
        expenseDate: newExpense.expenseDate,
        paymentMethod: newExpense.paymentMethod,
        recipient: newExpense.recipient.trim(),
        notes: newExpense.notes.trim(),
        status: 'confirmed',
        recordedBy: {
          uid: userProfile?.uid || 'admin',
          name: userProfile?.displayName || 'Jaafar Bdran'
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'business_expenses'), docData);

      await logAuditAndEvent({
        action: 'BUSINESS_EXPENSE_ADDED',
        details: `إضافة مصروف عمل: ${newExpense.title} بمبلغ ${newExpense.amount} ${newExpense.currency}`,
        entityType: 'finance',
        user: userProfile || undefined
      });

      setIsExpenseModalOpen(false);
      setNewExpense({
        title: '',
        category: 'tools_software',
        amount: 0,
        currency: 'USD',
        expenseDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'Cash',
        recipient: '',
        notes: ''
      });
    } catch (err) {
      console.error('Error saving business expense:', err);
    } finally {
      setSavingExpense(false);
    }
  };

  const exportFinancialReport = () => {
    const rows = [
      ['نوع الحركة', 'العنوان / القضية', 'التاريخ', 'المبلغ', 'العملة', 'طريقة الدفع / الموظف', 'الحالة'],
      ...filteredPayments.map(p => ['إيراد قضية', p.caseTitle || p.caseNumber || 'إيراد', p.paymentDate, p.paymentAmount, p.currency, p.paymentMethod, 'مقبوض']),
      ...filteredAllocations.map(a => ['مستحقات موظف', a.caseNumber + ' - ' + a.employeeName, a.allocatedDate, a.amount, a.currency, a.employeeName, a.status]),
      ...filteredExpenses.map(e => ['مصروف عمل', e.title, e.expenseDate, e.amount, e.currency, e.category, e.status])
    ];

    const csvContent = '\uFEFF' + rows.map(r => r.map(cell => `"${cell || ''}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `JB_Work_Financial_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white mb-2">وصول محظور</h2>
        <p className="text-sm text-slate-400">قسم الأرباح والإدارة المالية خاص بالمشرف العام فقط.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Top Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                {isRTL ? 'إدارة الأرباح والمالية العامة' : 'Business Profits & Finance'}
              </h1>
              <p className="text-xs text-slate-400">
                {isRTL ? 'معادلة الأرباح: الإيرادات المحصلة — أجور الموظفين — المصاريف التشغيلية' : 'Formula: Gross Revenue — Employee Allocations — Operating Expenses'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Time Filter Pill Buttons */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {(['all', 'year', 'month', 'week', 'today'] as const).map(f => (
              <button
                key={f}
                onClick={() => setTimeFilter(f)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  timeFilter === f
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f === 'all' ? (isRTL ? 'الكل' : 'All') :
                 f === 'year' ? (isRTL ? 'هذا العام' : 'Year') :
                 f === 'month' ? (isRTL ? 'هذا الشهر' : 'Month') :
                 f === 'week' ? (isRTL ? 'هذا الأسبوع' : 'Week') :
                 (isRTL ? 'اليوم' : 'Today')}
              </button>
            ))}
          </div>

          {/* Add Expense Button */}
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-md shadow-rose-600/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isRTL ? 'إضافة مصروف عمل' : 'Add Expense'}</span>
          </button>

          {/* Export Report */}
          <button
            onClick={exportFinancialReport}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3 py-2 rounded-xl border border-slate-700 transition-colors cursor-pointer"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isRTL ? 'تصدير' : 'Export'}</span>
          </button>
        </div>
      </div>

      {/* Primary Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. Gross Revenue */}
        {Object.entries(totalsByCurrency).length > 0 ? (
          (Object.entries(totalsByCurrency) as [string, { revenue: number; allocations: number; expenses: number; netProfit: number }][]).map(([currency, data]) => (
            <React.Fragment key={currency}>
              
              {/* Gross Revenue Card */}
              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>{isRTL ? 'إجمالي الإيرادات المحصلة' : 'Gross Revenue'} ({currency})</span>
                  <div className="p-2 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-emerald-400 font-mono tracking-tight">
                  {data.revenue.toLocaleString()} <span className="text-xs font-sans text-emerald-500/80">{currency}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  {isRTL ? 'من دفعات القضايا الفعلية' : 'From collected case payments'}
                </p>
              </div>

              {/* Employee Allocations Card */}
              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>{isRTL ? 'مستحقات وأجور الموظفين' : 'Employee Allocations'} ({currency})</span>
                  <div className="p-2 rounded-lg bg-blue-950/60 text-blue-400 border border-blue-800/40">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-blue-400 font-mono tracking-tight">
                  {data.allocations.toLocaleString()} <span className="text-xs font-sans text-blue-500/80">{currency}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  {isRTL ? 'مخصصات الموظفين من القضايا' : 'Allocated shares for team'}
                </p>
              </div>

              {/* Operating Expenses Card */}
              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>{isRTL ? 'المصاريف التشغيلية' : 'Operating Expenses'} ({currency})</span>
                  <div className="p-2 rounded-lg bg-rose-950/60 text-rose-400 border border-rose-800/40">
                    <Receipt className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-rose-400 font-mono tracking-tight">
                  {data.expenses.toLocaleString()} <span className="text-xs font-sans text-rose-500/80">{currency}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  {isRTL ? 'سيرفرات، برمجيات، عتاد، مكتب' : 'Servers, tools, equipment'}
                </p>
              </div>

              {/* Net Profit Card */}
              <div className="bg-gradient-to-br from-slate-900 to-emerald-950/40 border border-emerald-500/30 p-5 rounded-2xl relative overflow-hidden ring-1 ring-emerald-500/20">
                <div className="flex items-center justify-between text-xs text-emerald-300 font-medium mb-2">
                  <span>{isRTL ? 'صافي أرباح العمل (Net Profit)' : 'Net Business Profit'} ({currency})</span>
                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className={`text-2xl font-bold font-mono tracking-tight ${data.netProfit >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}>
                  {data.netProfit.toLocaleString()} <span className="text-xs font-sans text-emerald-400/80">{currency}</span>
                </div>
                <p className="text-[11px] text-emerald-400/70 mt-2 font-medium">
                  {data.netProfit >= 0 ? (isRTL ? 'ربح صافي إيجابي' : 'Profitable') : (isRTL ? 'عجز مالي' : 'Deficit')}
                </p>
              </div>

            </React.Fragment>
          ))
        ) : (
          <div className="col-span-full p-8 text-center bg-slate-900/50 border border-slate-800 rounded-2xl text-slate-400 text-xs">
            {isRTL ? 'لا توجد حركات مالية مسجلة في هذه الفترة الزمنية.' : 'No financial transactions recorded in this period.'}
          </div>
        )}

      </div>

      {/* Grid: Employee Allocations Breakdown & Business Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. Employee Allocations List */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <h3 className="font-bold text-sm text-white">
                {isRTL ? 'مخصصات الموظفين من القضايا' : 'Case Employee Allocations'}
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">{filteredAllocations.length} سجل</span>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {filteredAllocations.length > 0 ? (
              filteredAllocations.map(alloc => (
                <div key={alloc.id} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-semibold text-slate-200">{alloc.employeeName}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-cyan-400">{alloc.caseNumber}</span>
                      <span>•</span>
                      <span>{alloc.allocatedDate}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-blue-400 font-mono">
                      {alloc.amount.toLocaleString()} {alloc.currency}
                    </div>
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium mt-1 ${
                      alloc.status === 'paid' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}>
                      {alloc.status === 'paid' ? (isRTL ? 'مدفوع' : 'Paid') : (isRTL ? 'معلق' : 'Pending')}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-slate-500 text-xs">
                {isRTL ? 'لا توجد مخصصات مسجلة للموظفين حالياً.' : 'No employee allocations recorded.'}
              </div>
            )}
          </div>
        </div>

        {/* 2. Business Expenses List */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-rose-400" />
              <h3 className="font-bold text-sm text-white">
                {isRTL ? 'المصاريف التشغيلية المسجلة' : 'Operating Expenses'}
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">{filteredExpenses.length} سجل</span>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {filteredExpenses.length > 0 ? (
              filteredExpenses.map(exp => (
                <div key={exp.id} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-semibold text-slate-200">{exp.title}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-slate-300 font-mono">
                        {exp.category}
                      </span>
                      <span>•</span>
                      <span>{exp.expenseDate}</span>
                      {exp.recipient && <span>• {exp.recipient}</span>}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-rose-400 font-mono">
                      -{exp.amount.toLocaleString()} {exp.currency}
                    </div>
                    <span className="text-[10px] text-slate-500">{exp.paymentMethod}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-slate-500 text-xs">
                {isRTL ? 'لا توجد مصاريف مسجلة في هذا النطاق.' : 'No expenses recorded.'}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Add Business Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">
                {isRTL ? 'تسجيل مصروف عمل جديد' : 'Record Business Expense'}
              </h3>
              <button 
                onClick={() => setIsExpenseModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">{isRTL ? 'بند المصروف / العنوان' : 'Expense Title'}</label>
                <input
                  type="text"
                  required
                  value={newExpense.title}
                  onChange={e => setNewExpense({ ...newExpense, title: e.target.value })}
                  placeholder="مثال: تجديد استضافة السيرفرات، أدوات AI"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">{isRTL ? 'المبلغ' : 'Amount'}</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    value={newExpense.amount || ''}
                    onChange={e => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">{isRTL ? 'العملة' : 'Currency'}</label>
                  <select
                    value={newExpense.currency}
                    onChange={e => setNewExpense({ ...newExpense, currency: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="USD">USD</option>
                    <option value="SYP">SYP</option>
                    <option value="EUR">EUR</option>
                    <option value="AED">AED</option>
                    <option value="SAR">SAR</option>
                    <option value="TRY">TRY</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">{isRTL ? 'التصنيف' : 'Category'}</label>
                  <select
                    value={newExpense.category}
                    onChange={e => setNewExpense({ ...newExpense, category: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="tools_software">{isRTL ? 'برمجيات وأدوات' : 'Tools & Software'}</option>
                    <option value="servers_hosting">{isRTL ? 'سيرفرات واستضافة' : 'Servers & Hosting'}</option>
                    <option value="equipment">{isRTL ? 'عتاد ومعدات' : 'Equipment'}</option>
                    <option value="marketing">{isRTL ? 'تسويق وإعلانات' : 'Marketing'}</option>
                    <option value="office">{isRTL ? 'نفقات مكتبية' : 'Office'}</option>
                    <option value="transport">{isRTL ? 'مواصلات ونقل' : 'Transport'}</option>
                    <option value="salaries">{isRTL ? 'رواتب إضافية' : 'Salaries'}</option>
                    <option value="legal_fees">{isRTL ? 'رسوم قانونية' : 'Legal'}</option>
                    <option value="other">{isRTL ? 'أخرى' : 'Other'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">{isRTL ? 'تاريخ الصرف' : 'Date'}</label>
                  <input
                    type="date"
                    required
                    value={newExpense.expenseDate}
                    onChange={e => setNewExpense({ ...newExpense, expenseDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">{isRTL ? 'المستلم / الجهة المدفوع لها' : 'Recipient / Vendor'}</label>
                <input
                  type="text"
                  value={newExpense.recipient}
                  onChange={e => setNewExpense({ ...newExpense, recipient: e.target.value })}
                  placeholder="مثال: Google Cloud, OpenAI, Hetzner"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">{isRTL ? 'ملاحظات إضافية' : 'Notes'}</label>
                <textarea
                  rows={2}
                  value={newExpense.notes}
                  onChange={e => setNewExpense({ ...newExpense, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={savingExpense}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-md shadow-rose-600/20 cursor-pointer disabled:opacity-50"
                >
                  {savingExpense ? (isRTL ? 'جار الحفظ...' : 'Saving...') : (isRTL ? 'حفظ المصروف' : 'Save Expense')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
