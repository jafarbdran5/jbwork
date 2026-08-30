import React, { useState } from 'react';
import { AlertTriangle, Trash2, ShieldAlert, CheckCircle2, X } from 'lucide-react';
import { DependencyCheckResult } from '../../lib/customizationStore';

interface DependencyDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (cascade: boolean) => void;
  itemTitle: string;
  itemTypeLabel: string;
  dependencyCheck: DependencyCheckResult;
  isDeleting?: boolean;
}

export const DependencyDeleteModal: React.FC<DependencyDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemTitle,
  itemTypeLabel,
  dependencyCheck,
  isDeleting = false
}) => {
  const [deleteMode, setDeleteMode] = useState<'item_only' | 'cascade'>('item_only');
  const [confirmInput, setConfirmInput] = useState('');

  if (!isOpen) return null;

  const requiresTypingConfirm = dependencyCheck.hasDependencies && deleteMode === 'cascade' && dependencyCheck.totalCount > 3;
  const isConfirmDisabled = requiresTypingConfirm && confirmInput.trim() !== 'حذف شامل';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        id="modal-dependency-delete"
        className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">تأكيد حذف {itemTypeLabel}</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{itemTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {dependencyCheck.hasDependencies ? (
            <>
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
                  <div className="text-xs leading-relaxed space-y-1">
                    <p className="font-bold text-sm text-amber-200">تنبيه وجود عناصر وبيانات مرتبطة</p>
                    <p>{dependencyCheck.warningMessageAr}</p>
                  </div>
                </div>
              </div>

              {/* Breakdown list */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-300">تفاصيل العناصر المرتبطة ({dependencyCheck.totalCount}):</p>
                <div className="space-y-1.5">
                  {dependencyCheck.breakdown.map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">{item.labelAr}</span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-700 text-cyan-300 font-bold font-mono">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Decision Options */}
              <div className="space-y-2 pt-2">
                <p className="text-xs font-bold text-slate-200">اختر طريقة الحذف المناسبة:</p>
                <div className="grid grid-cols-1 gap-2.5">
                  <label 
                    onClick={() => setDeleteMode('item_only')}
                    className={`p-3 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                      deleteMode === 'item_only' 
                        ? 'bg-cyan-950/40 border-cyan-500/50 text-white shadow-xs' 
                        : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="deleteMode" 
                      checked={deleteMode === 'item_only'} 
                      onChange={() => setDeleteMode('item_only')} 
                      className="mt-1 accent-cyan-500"
                    />
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-cyan-300">حذف هذا العنصر فقط (الخيار الآمن)</p>
                      <p className="text-[11px] text-slate-400 leading-normal">
                        سيتم حذف ({itemTitle}) فقط مع الحفاظ على جميع البيانات والقضايا والمهام المرتبطة به مفصولة وسليمة.
                      </p>
                    </div>
                  </label>

                  <label 
                    onClick={() => setDeleteMode('cascade')}
                    className={`p-3 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                      deleteMode === 'cascade' 
                        ? 'bg-rose-950/40 border-rose-500/50 text-white shadow-xs' 
                        : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="deleteMode" 
                      checked={deleteMode === 'cascade'} 
                      onChange={() => setDeleteMode('cascade')} 
                      className="mt-1 accent-rose-500"
                    />
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-rose-300">حذف العنصر وجميع البيانات المرتبطة به (حذف شامل)</p>
                      <p className="text-[11px] text-slate-400 leading-normal">
                        سيتم إزالة هذا العنصر مع حذف كافة العناصر التابعة له من المنظومة.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {requiresTypingConfirm && (
                <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 space-y-2">
                  <p className="text-xs text-rose-300 font-bold">للتأكيد الشامل، يرجى كتابة كلمة "حذف شامل" أدناه:</p>
                  <input
                    type="text"
                    value={confirmInput}
                    onChange={e => setConfirmInput(e.target.value)}
                    placeholder="اكتب: حذف شامل"
                    className="w-full px-3 py-2 bg-slate-900 border border-rose-500/40 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 text-center"
                  />
                </div>
              )}
            </>
          ) : (
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 text-slate-300 text-xs leading-relaxed space-y-2">
              <p>هل أنت متأكد من رغبتك في حذف <strong className="text-white">"{itemTitle}"</strong>؟</p>
              <p className="text-slate-400 text-[11px]">يمكنك استرجاع العنصر لاحقاً من سلة المهملات إذا لزم الأمر.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            إلغاء الأمر
          </button>
          
          <button
            type="button"
            onClick={() => onConfirm(deleteMode === 'cascade')}
            disabled={isDeleting || isConfirmDisabled}
            className={`px-5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
              isConfirmDisabled
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : deleteMode === 'cascade'
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/30'
                  : 'bg-rose-700 hover:bg-rose-600 text-white shadow-lg'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            {isDeleting ? 'جاري الحذف...' : deleteMode === 'cascade' ? 'تأكيد الحذف الشامل' : 'تأكيد الحذف'}
          </button>
        </div>
      </div>
    </div>
  );
};
