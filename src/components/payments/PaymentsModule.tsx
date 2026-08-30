import React, { useState, useEffect } from 'react';
import { useI18n } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { PaymentRecord, CaseItem } from '../../types';
import { logAuditAndEvent } from '../../lib/audit';
import { deleteEntity } from '../../services/database/deleteService';
import { 
  DollarSign, 
  Plus, 
  CreditCard, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search,
  X,
  Layers,
  Trash2
} from 'lucide-react';

interface PaymentsModuleProps {
  onSelectCase?: (caseId: string) => void;
}

export const PaymentsModule: React.FC<PaymentsModuleProps> = ({ onSelectCase }) => {
  const { t, isRTL } = useI18n();
  const { userProfile, canManageFinance } = useAuth();

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [amount, setAmount] = useState<number>(0);
  const [currency, setCurrency] = useState<string>('SYP');
  const [caseNumber, setCaseNumber] = useState<string>('');
  const [clientName, setClientName] = useState<string>('');
  const [method, setMethod] = useState<string>('Cash');
  const [status, setStatus] = useState<'paid' | 'pending' | 'refunded'>('paid');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    const q = query(collection(db, 'payments'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentRecord)));
      setLoading(false);
    }, (err) => {
      console.warn('Payments snapshot fallback:', err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !userProfile) return;

    try {
      await addDoc(collection(db, 'payments'), {
        amount: Number(amount),
        currency,
        caseNumber: caseNumber.trim(),
        clientName: clientName.trim(),
        paymentMethod: method,
        status,
        notes: notes.trim(),
        paidAt: status === 'paid' ? serverTimestamp() : null,
        createdAt: serverTimestamp(),
        createdBy: {
          uid: userProfile.uid,
          name: userProfile.displayName
        }
      });

      await logAuditAndEvent({
        action: 'CREATE_PAYMENT',
        details: `تسجيل دفعة مالية: ${amount} ${currency === 'SYP' ? 'ل.س' : '$'} للعميل ${clientName || caseNumber}`,
        entityType: 'payment',
        entityTitle: `${amount} ${currency}`,
        user: userProfile
      });

      setAmount(0);
      setCaseNumber('');
      setClientName('');
      setNotes('');
      setShowAddModal(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePayment = async (e: React.MouseEvent, pay: PaymentRecord) => {
    e.stopPropagation();
    if (!window.confirm(isRTL ? `هل أنت متأكد من حذف سجل الدفعة: ${pay.amount} ${pay.currency}؟` : `Delete payment record: ${pay.amount} ${pay.currency}?`)) return;

    setPayments(prev => prev.filter(p => p.id !== pay.id));
    await deleteEntity('payment', pay.id, userProfile, {
      customTitle: `${pay.amount} ${pay.currency} - ${pay.clientName || pay.caseNumber || ''}`,
      reason: `حذف دفعة مالية من قسم المدفوعات`
    });
  };

  const totalCollectedSYP = payments
    .filter(p => !p.isDeleted && !(p as any)._deleted)
    .filter(p => (p.currency === 'SYP' || !p.currency) && p.status === 'paid')
    .reduce((acc, p) => acc + (p.amount || (p as any).paymentAmount || 0), 0);

  const totalCollectedUSD = payments
    .filter(p => !p.isDeleted && !(p as any)._deleted)
    .filter(p => p.currency === 'USD' && p.status === 'paid')
    .reduce((acc, p) => acc + (p.amount || (p as any).paymentAmount || 0), 0);

  const pendingAmount = payments
    .filter(p => !p.isDeleted && !(p as any)._deleted)
    .filter(p => p.status === 'pending')
    .reduce((acc, p) => acc + (p.amount || (p as any).paymentAmount || 0), 0);

  const filtered = payments.filter(p => {
    if (p.isDeleted || (p as any)._deleted) return false;
    return (
      p.caseNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.paymentMethod?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <span>{t('navPayments')}</span>
            <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2.5 py-0.5 rounded-full border border-slate-800">
              {filtered.length}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {isRTL ? 'إدارة التحصيلات والمدفوعات والمستحقات المالية للقضايا' : 'Financial collections, payments, and invoice tracking'}
          </p>
        </div>

        {canManageFinance && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isRTL ? 'تسجيل دفعة جديدة' : 'Record Payment'}</span>
          </button>
        )}
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Total Collected SYP */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
          <span className="text-xs font-semibold text-slate-400 block">{isRTL ? 'المحصل بالليرة السورية (ل.س)' : 'Collected (SYP)'}</span>
          <p className="text-2xl font-black text-amber-400 font-mono mt-1">
            {totalCollectedSYP.toLocaleString()} <span className="text-xs font-normal text-slate-400">{isRTL ? 'ل.س' : 'SYP'}</span>
          </p>
          <span className="text-[10px] text-amber-500/80 font-mono mt-1 block">
            {isRTL ? 'الدفعات المستلمة بالليرة' : 'Paid transactions in SYP'}
          </span>
        </div>

        {/* Total Collected USD */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
          <span className="text-xs font-semibold text-slate-400 block">{isRTL ? 'المحصل بالدولار الأمريكي ($)' : 'Collected (USD)'}</span>
          <p className="text-2xl font-black text-emerald-400 font-mono mt-1">
            ${totalCollectedUSD.toLocaleString()}
          </p>
          <span className="text-[10px] text-emerald-500/80 font-mono mt-1 block">
            {isRTL ? 'الدفعات المستلمة بالدولار' : 'Paid transactions in USD'}
          </span>
        </div>

        {/* Pending Amounts */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
          <span className="text-xs font-semibold text-slate-400 block">{isRTL ? 'المستحقات المعلقة' : 'Pending Receivables'}</span>
          <p className="text-2xl font-black text-blue-400 font-mono mt-1">
            {pendingAmount.toLocaleString()}
          </p>
          <span className="text-[10px] text-blue-500/80 font-mono mt-1 block">
            {isRTL ? 'بانتظار التحصيل' : 'Awaiting settlement'}
          </span>
        </div>

      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={isRTL ? 'ابحث برقم القضية، اسم العميل، وسيلة الدفع...' : 'Search by case number, client, payment method...'}
          className="w-full bg-slate-900/90 border border-slate-800 rounded-xl ps-10 pe-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* Payments Table / List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 font-mono">
          {isRTL ? 'جارٍ تحميل البيانات المالية...' : 'Loading financial records...'}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-500">
          {t('noPaymentsFound')}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((pay) => (
            <div key={pay.id} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800/80 flex items-center justify-center font-bold text-emerald-400 shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-black text-white">
                      {pay.currency === 'USD' 
                        ? `$${pay.amount.toLocaleString()}` 
                        : `${pay.amount.toLocaleString()} ${pay.currency === 'SYP' ? (isRTL ? 'ل.س' : 'SYP') : (pay.currency || '')}`
                      }
                    </span>
                    <span className="text-[10px] font-semibold text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                      {pay.paymentMethod}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                    {pay.clientName && <span>{pay.clientName}</span>}
                    {pay.caseNumber && (
                      <span className="font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded">
                        {pay.caseNumber}
                      </span>
                    )}
                    {pay.notes && <span>• {pay.notes}</span>}
                  </div>
                </div>
              </div>

              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 self-start sm:self-center ${
                pay.status === 'paid' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                pay.status === 'refunded' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                'bg-amber-950 text-amber-300 border border-amber-800'
              }`}>
                {pay.status.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Add Payment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>{isRTL ? 'تسجيل دفعة مالية' : 'Record Payment'}</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPayment} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{isRTL ? 'المبلغ' : 'Amount'} *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{isRTL ? 'العملة' : 'Currency'}</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="SYP">{isRTL ? 'ليرة سورية (SYP - ل.س)' : 'Syrian Pound (SYP)'}</option>
                    <option value="USD">{isRTL ? 'دولار أمريكي (USD - $)' : 'US Dollar (USD)'}</option>
                    <option value="IQD">IQD (د.ع)</option>
                    <option value="AED">AED (د.إ)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{isRTL ? 'وسيلة الدفع' : 'Payment Method'}</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="Zain Cash">Zain Cash (زين كاش)</option>
                    <option value="AsiaHawala">AsiaCell / AsiaHawala (آسيا حوالة)</option>
                    <option value="Cash">Cash (نقدي)</option>
                    <option value="Bank Transfer">Bank Transfer (حوالة بنكية)</option>
                    <option value="Crypto / USDT">Crypto / USDT (عملات رقمية)</option>
                    <option value="Credit Card">Credit Card (فيزا / ماستركارد)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{isRTL ? 'الحالة' : 'Status'}</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="paid">{isRTL ? 'مدفوع / مستلم' : 'Paid / Received'}</option>
                    <option value="pending">{isRTL ? 'معلق / مستحق' : 'Pending'}</option>
                    <option value="refunded">{isRTL ? 'مسترد' : 'Refunded'}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{isRTL ? 'اسم العميل' : 'Client Name'}</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{isRTL ? 'رقم القضية' : 'Case Number'}</label>
                  <input
                    type="text"
                    value={caseNumber}
                    onChange={(e) => setCaseNumber(e.target.value)}
                    placeholder="JB-2026-000001"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{isRTL ? 'ملاحظات الدفعة' : 'Notes'}</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
