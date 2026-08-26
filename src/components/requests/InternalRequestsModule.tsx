import React, { useState, useEffect } from 'react';
import { useI18n } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { InternalRequest } from '../../types';
import { logAuditAndEvent } from '../../lib/audit';
import { 
  Inbox, 
  Plus, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Tag, 
  Layers, 
  MessageSquare,
  X
} from 'lucide-react';

interface InternalRequestsModuleProps {
  onSelectCase?: (caseId: string) => void;
}

export const InternalRequestsModule: React.FC<InternalRequestsModuleProps> = ({ onSelectCase }) => {
  const { t, isRTL } = useI18n();
  const { userProfile, isSuperAdmin, isManager } = useAuth();

  const [requests, setRequests] = useState<InternalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState<InternalRequest['type']>('financial_approval');
  const [caseNumber, setCaseNumber] = useState('');
  const [details, setDetails] = useState('');

  // Review modal state
  const [selectedReq, setSelectedReq] = useState<InternalRequest | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'requests'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as InternalRequest)));
      setLoading(false);
    }, (err) => {
      console.warn('Requests snapshot fallback:', err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !userProfile) return;

    try {
      await addDoc(collection(db, 'requests'), {
        title: title.trim(),
        type,
        caseNumber: caseNumber.trim(),
        details: details.trim(),
        status: 'new',
        requestedBy: {
          uid: userProfile.uid,
          name: userProfile.displayName
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await logAuditAndEvent({
        action: 'CREATE_REQUEST',
        details: `تقديم طلب داخلي: ${title} (${type})`,
        entityType: 'request',
        entityTitle: title,
        user: userProfile
      });

      setTitle('');
      setCaseNumber('');
      setDetails('');
      setShowNewModal(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReviewAction = async (status: 'approved' | 'rejected') => {
    if (!selectedReq || !userProfile) return;

    try {
      await updateDoc(doc(db, 'requests', selectedReq.id), {
        status,
        reviewNotes: reviewNote.trim(),
        reviewedBy: {
          uid: userProfile.uid,
          name: userProfile.displayName
        },
        updatedAt: serverTimestamp(),
      });

      await logAuditAndEvent({
        action: status === 'approved' ? 'APPROVE_REQUEST' : 'REJECT_REQUEST',
        details: `${status === 'approved' ? 'الموافقة على' : 'رفض'} الطلب: ${selectedReq.title}`,
        entityType: 'request',
        entityId: selectedReq.id,
        entityTitle: selectedReq.title,
        user: userProfile
      });

      setSelectedReq(null);
      setReviewNote('');
    } catch (e) {
      console.error(e);
    }
  };

  const canReview = isSuperAdmin || isManager;

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Inbox className="w-5 h-5 text-purple-400" />
            <span>{t('navRequests')}</span>
            <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2.5 py-0.5 rounded-full border border-slate-800">
              {requests.length}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {isRTL ? 'نظام الطلبات والموافقات الداخلية بين أعضاء الفريق والإدارة' : 'Internal requests, approvals, and escalations workflow'}
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{isRTL ? 'تقديم طلب جديد' : 'New Request'}</span>
        </button>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 font-mono">
          {isRTL ? 'جارٍ تحميل الطلبات...' : 'Loading requests...'}
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-500">
          {t('noRequestsFound')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {requests.map((req) => (
            <div key={req.id} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3.5 shadow-md flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-purple-300 bg-purple-950 px-2 py-0.5 rounded border border-purple-800/60 uppercase">
                      {req.type.replace('_', ' ')}
                    </span>
                    <h3 className="text-sm font-bold text-white mt-1">{req.title}</h3>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                    req.status === 'approved' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                    req.status === 'rejected' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                    'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}>
                    {req.status.toUpperCase()}
                  </span>
                </div>

                {req.caseNumber && (
                  <span className="font-mono text-xs text-cyan-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 inline-block">
                    {req.caseNumber}
                  </span>
                )}

                {req.details && (
                  <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800/60 leading-relaxed">
                    {req.details}
                  </p>
                )}

                {req.reviewNotes && (
                  <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-0.5">
                    <span className="font-bold text-slate-300">{isRTL ? 'ملاحظات المراجعة:' : 'Review Notes:'}</span>
                    <p>{req.reviewNotes}</p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>{req.requestedBy?.name}</span>
                </span>

                {canReview && req.status === 'new' && (
                  <button
                    onClick={() => setSelectedReq(req)}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] rounded-lg shadow-sm cursor-pointer"
                  >
                    {isRTL ? 'اتخاذ قرار' : 'Review'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white">{isRTL ? 'مراجعة واعتماد الطلب' : 'Review Request'}</h3>
            <p className="text-xs text-slate-300 font-semibold">{selectedReq.title}</p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">{isRTL ? 'ملاحظات القرار' : 'Notes'}</label>
              <textarea
                rows={3}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder={isRTL ? 'اكتب سبب القبول أو الرفض...' : 'Enter reason for approval or rejection...'}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
              />
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-800">
              <button
                onClick={() => setSelectedReq(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                {t('cancel')}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleReviewAction('rejected')}
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  {isRTL ? 'رفض' : 'Reject'}
                </button>
                <button
                  onClick={() => handleReviewAction('approved')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  {isRTL ? 'موافقة واعتماد' : 'Approve'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Request Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Inbox className="w-4 h-4 text-purple-400" />
                <span>{isRTL ? 'تقديم طلب داخلي جديد' : 'New Internal Request'}</span>
              </h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{isRTL ? 'نوع الطلب' : 'Request Type'} *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="financial_approval">{isRTL ? 'موافقة مالية / صرف' : 'Financial Approval'}</option>
                  <option value="reassignment">{isRTL ? 'طلب إعادة إسناد قضية' : 'Case Reassignment'}</option>
                  <option value="price_exception">{isRTL ? 'طلب استثناء سعري للعميل' : 'Price Exception'}</option>
                  <option value="close_case">{isRTL ? 'طلب اعتماد إغلاق قضية' : 'Close Case Approval'}</option>
                  <option value="custom">{isRTL ? 'طلب مخصص آخر' : 'Other / Custom'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{isRTL ? 'عنوان الطلب' : 'Title'} *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={isRTL ? 'موجز الطلب المطلوب اعتماده' : 'Brief summary of what needs approval'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{isRTL ? 'رقم القضية المرتبطة (إن وجدت)' : 'Case Number (if applicable)'}</label>
                <input
                  type="text"
                  value={caseNumber}
                  onChange={(e) => setCaseNumber(e.target.value)}
                  placeholder="JB-2026-000001"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{isRTL ? 'تفاصيل ومبررات الطلب' : 'Details & Justification'} *</label>
                <textarea
                  rows={3}
                  required
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md cursor-pointer"
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
