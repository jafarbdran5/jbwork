import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { db } from '../../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { ApprovalRequest, ApprovalType } from '../../types';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Plus, 
  Filter, 
  DollarSign, 
  Lock, 
  ShieldCheck, 
  CheckCheck,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { logAuditAndEvent } from '../../lib/audit';

export const ApprovalCenterModule: React.FC = () => {
  const { userProfile, isSuperAdmin } = useAuth();
  const { isRTL } = useI18n();

  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('pending');

  // New Request Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [type, setType] = useState<ApprovalType>('expense');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'approval_requests'), orderBy('createdAt', 'desc')), (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as ApprovalRequest));
      setRequests(items);
      setIsLoading(false);
    }, () => setIsLoading(false));

    return () => unsub();
  }, []);

  const handleCreateRequest = async () => {
    if (!title.trim() || !description.trim()) return;

    const docRef = await addDoc(collection(db, 'approval_requests'), {
      type,
      title: title.trim(),
      description: description.trim(),
      amount: amount ? Number(amount) : undefined,
      currency: amount ? currency : undefined,
      status: 'pending',
      requestedBy: {
        uid: userProfile?.uid || 'anonymous',
        name: userProfile?.displayName || 'Team Member'
      },
      createdAt: serverTimestamp()
    });

    await logAuditAndEvent({
      action: 'APPROVAL_REQUESTED',
      details: `Submitted approval request: ${title} (${type})`,
      entityType: 'settings',
      entityId: docRef.id,
      user: userProfile || undefined
    });

    setIsModalOpen(false);
    setTitle('');
    setDescription('');
    setAmount('');
  };

  const handleDecision = async (request: ApprovalRequest, decision: 'approved' | 'rejected') => {
    if (!isSuperAdmin) return;

    await updateDoc(doc(db, 'approval_requests', request.id), {
      status: decision,
      reviewedBy: {
        uid: userProfile?.uid || 'super_admin',
        name: userProfile?.displayName || 'Jaafar Bdran'
      },
      reviewedAt: serverTimestamp()
    });

    await logAuditAndEvent({
      action: decision === 'approved' ? 'APPROVAL_GRANTED' : 'APPROVAL_REJECTED',
      details: `${decision === 'approved' ? 'Approved' : 'Rejected'} request: ${request.title}`,
      entityType: 'settings',
      entityId: request.id,
      user: userProfile || undefined
    });
  };

  const filteredRequests = requests.filter(r => {
    if (statusFilter === 'all') return true;
    return r.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#121214] border border-[#27272A] p-5 rounded-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <CheckCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">
                {isRTL ? 'مركز الموافقات والقرارات الإدارية' : 'Approval & Governance Center'}
              </h1>
              <span className="text-[11px] bg-amber-500/20 text-amber-300 font-semibold px-2 py-0.5 rounded-full border border-amber-500/30">
                Super Admin Gate
              </span>
            </div>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              {isRTL 
                ? 'إدارة طلبات الخصم، الاسترجاع المالي، إغلاق القضايا، والمصروفات الاستثنائية'
                : 'Centralized decision gate for refunds, discounts, case closures, and expense requests'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {isRTL ? 'تقديم طلب موافقة' : 'Submit Request'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#27272A] pb-3">
        {['pending', 'approved', 'rejected', 'all'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              statusFilter === st
                ? 'bg-amber-600 text-white'
                : 'bg-[#18181B] text-[#A1A1AA] hover:text-white hover:bg-[#27272A]'
            }`}
          >
            {st === 'pending' ? (isRTL ? 'قيد الانتظار' : 'Pending') :
             st === 'approved' ? (isRTL ? 'تمت الموافقة' : 'Approved') :
             st === 'rejected' ? (isRTL ? 'مرفوضة' : 'Rejected') : (isRTL ? 'الكل' : 'All')}
          </button>
        ))}
      </div>

      {/* List */}
      {filteredRequests.length === 0 ? (
        <div className="bg-[#121214] border border-[#27272A] rounded-xl p-12 text-center">
          <CheckCheck className="w-12 h-12 text-[#52525B] mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white mb-1">{isRTL ? 'لا توجد طلبات في هذه الحالة' : 'No Requests Found'}</h3>
          <p className="text-xs text-[#A1A1AA]">{isRTL ? 'جميع القرارات تم البت فيها بنجاح' : 'All requests have been reviewed'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => (
            <div key={req.id} className="bg-[#121214] border border-[#27272A] hover:border-[#3F3F46] rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    {req.type}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase ${
                    req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    req.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                    'bg-amber-500/10 text-amber-300 border-amber-500/20'
                  }`}>
                    {req.status}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white">{req.title}</h4>
                <p className="text-xs text-[#A1A1AA] leading-relaxed max-w-2xl">{req.description}</p>
                <div className="flex items-center gap-3 text-[11px] text-[#71717A] pt-1">
                  <span>{isRTL ? 'مقدم الطلب:' : 'Requested by:'} {req.requestedBy?.name || 'User'}</span>
                  {req.amount && (
                    <span className="font-semibold text-emerald-400">{req.amount.toLocaleString()} {req.currency}</span>
                  )}
                </div>
              </div>

              {/* Action Buttons for Super Admin */}
              {isSuperAdmin && req.status === 'pending' && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleDecision(req, 'approved')}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    {isRTL ? 'موافقة' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleDecision(req, 'rejected')}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    {isRTL ? 'رفض' : 'Reject'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121214] border border-[#27272A] rounded-xl w-full max-w-md p-5 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCheck className="w-5 h-5 text-amber-400" />
              {isRTL ? 'تقديم طلب موافقة إدارية' : 'New Approval Request'}
            </h3>

            <div>
              <label className="block text-xs text-[#A1A1AA] mb-1">{isRTL ? 'نوع الطلب' : 'Request Type'}</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white"
              >
                <option value="discount">Discount / خصم لعميل</option>
                <option value="refund">Refund / استرجاع مالي</option>
                <option value="case_closure">Case Closure / إغلاق قضية حساسة</option>
                <option value="expense">Expense / مصروف أو مشتريات</option>
                <option value="profit_allocation">Profit Allocation / توزيع أرباح</option>
                <option value="permission_change">Permission Change / تعديل صلاحيات</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-[#A1A1AA] mb-1">{isRTL ? 'عنوان الطلب' : 'Title'} *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={isRTL ? 'مثال: خصم 20% لعميل قضية JB-102' : 'Request Title'}
                className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-[#A1A1AA] mb-1">{isRTL ? 'المبررات والتفاصيل' : 'Description'} *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#A1A1AA] mb-1">{isRTL ? 'المبلغ (إن وجد)' : 'Amount'}</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                  placeholder="0"
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-[#A1A1AA] mb-1">{isRTL ? 'العملة' : 'Currency'}</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="USD">USD ($)</option>
                  <option value="SYP">SYP (ل.س)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="AED">AED (د.إ)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsModalOpen(false)} className="px-3 py-1.5 bg-[#27272A] text-white text-xs rounded-lg">{isRTL ? 'إلغاء' : 'Cancel'}</button>
              <button onClick={handleCreateRequest} disabled={!title.trim() || !description.trim()} className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg">{isRTL ? 'إرسال الطلب' : 'Submit'}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
