import React, { useState, useEffect } from 'react';
import { useI18n } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import { db } from '../../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { CaseItem } from '../../types';
import { logAuditAndEvent } from '../../lib/audit';
import { 
  Trash2, 
  RotateCcw, 
  AlertTriangle, 
  Layers, 
  Calendar,
  XCircle
} from 'lucide-react';

export const TrashModule: React.FC = () => {
  const { t, isRTL } = useI18n();
  const { userProfile, isSuperAdmin } = useAuth();

  const [deletedCases, setDeletedCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'cases'),
      where('isDeleted', '==', true),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setDeletedCases(snap.docs.map(d => ({ id: d.id, ...d.data() } as CaseItem)));
      setLoading(false);
    }, (err) => {
      console.warn('Trash snapshot fallback:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleRestore = async (item: CaseItem) => {
    if (!userProfile) return;
    try {
      await updateDoc(doc(db, 'cases', item.id), {
        isDeleted: false
      });

      await logAuditAndEvent({
        action: 'RESTORE_CASE',
        details: `استعادة القضية من سلة المهملات: ${item.caseNumber}`,
        entityType: 'case',
        entityId: item.id,
        entityTitle: item.title,
        caseId: item.id,
        user: userProfile
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handlePermanentDelete = async (item: CaseItem) => {
    if (!userProfile || !isSuperAdmin) return;
    const confirmMsg = isRTL 
      ? `تحذير: هل أنت متأكد من الحذف النهائي للقضية ${item.caseNumber}؟ لا يمكن التراجع عن هذا الإجراء.`
      : `Warning: Permanently delete case ${item.caseNumber}? This action is irreversible.`;
    
    if (!window.confirm(confirmMsg)) return;

    try {
      await deleteDoc(doc(db, 'cases', item.id));

      await logAuditAndEvent({
        action: 'PERMANENT_DELETE_CASE',
        details: `حذف نهائي للقضية: ${item.caseNumber}`,
        entityType: 'case',
        entityId: item.id,
        entityTitle: item.title,
        user: userProfile
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-rose-400" />
          <span>{t('navTrash')}</span>
          <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2.5 py-0.5 rounded-full border border-slate-800">
            {deletedCases.length}
          </span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          {isRTL ? 'القضايا المحذوفة مؤقتاً مع إمكانية الاستعادة أو الحذف النهائي' : 'Soft-deleted cases with restore and permanent purge capabilities'}
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 font-mono">
          {isRTL ? 'جارٍ التحميل...' : 'Loading trash...'}
        </div>
      ) : deletedCases.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-500">
          {isRTL ? 'سلة المهملات فارغة' : 'Trash is empty'}
        </div>
      ) : (
        <div className="space-y-3">
          {deletedCases.map((item) => (
            <div key={item.id} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-rose-400 bg-rose-950 px-2 py-0.5 rounded border border-rose-800">
                    {item.caseNumber}
                  </span>
                  <h3 className="text-sm font-bold text-white line-through opacity-70">{item.title}</h3>
                </div>
                <p className="text-xs text-slate-400">
                  {item.caseType} • {item.platform || ''}
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={() => handleRestore(item)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{isRTL ? 'استعادة' : 'Restore'}</span>
                </button>

                {isSuperAdmin && (
                  <button
                    onClick={() => handlePermanentDelete(item)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isRTL ? 'حذف نهائي' : 'Purge'}</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
