import React, { useState, useEffect } from 'react';
import { 
  Edit3, 
  Check, 
  RotateCcw, 
  X, 
  Shield, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2, 
  Globe,
  Sparkles
} from 'lucide-react';
import { 
  getAppLabelItem, 
  saveCustomLabel, 
  resetLabelToDefault,
  renameGoogleSheetRemote,
  renameGoogleWorksheetRemote,
  DynamicLabelItem 
} from '../../lib/dynamicLabelsStore';
import { useAuth } from '../../lib/auth';
import { hasPermission } from '../../lib/permissionGuard';
import { useModalLifecycle } from '../../hooks/useModalLifecycle';

interface QuickRenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  labelId: string;
  defaultFallback?: string;
  onSuccess?: (newLabel: string) => void;
}

export const QuickRenameModal: React.FC<QuickRenameModalProps> = ({
  isOpen,
  onClose,
  labelId,
  defaultFallback,
  onSuccess
}) => {
  const { userProfile } = useAuth();
  const canManage = userProfile?.role === 'super_admin' || hasPermission(userProfile, 'sections_manage');

  const [item, setItem] = useState<DynamicLabelItem | null>(null);
  const [newLabelAr, setNewLabelAr] = useState('');
  const [newLabelEn, setNewLabelEn] = useState('');
  const [remoteGoogleRename, setRemoteGoogleRename] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const { handleSafeClose, handleBackdropClick } = useModalLifecycle({
    isOpen,
    onClose,
    id: 'quick-rename-modal',
    isSubmitting: loading,
  });

  useEffect(() => {
    if (isOpen && labelId) {
      const found = getAppLabelItem(labelId);
      if (found) {
        setItem(found);
        setNewLabelAr(found.customLabelAr || found.defaultLabelAr || defaultFallback || '');
        setNewLabelEn(found.customLabelEn || found.defaultLabelEn || '');
      } else {
        setItem({
          id: labelId,
          category: 'sections',
          defaultLabelAr: defaultFallback || labelId,
          defaultLabelEn: defaultFallback || labelId,
          isSystemCore: true
        });
        setNewLabelAr(defaultFallback || labelId);
        setNewLabelEn('');
      }
      setFeedback(null);
      setRemoteGoogleRename(false);
    }
  }, [isOpen, labelId, defaultFallback]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!newLabelAr.trim()) {
      setFeedback({ type: 'error', text: 'يرجى إدخال اسم صحيح غير فارغ' });
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      // Check if Google Sheet remote rename is requested
      if (remoteGoogleRename && item?.category === 'google_sheets') {
        if (item.meta?.isSpreadsheet && item.meta.sheetId) {
          const res = await renameGoogleSheetRemote(item.meta.sheetId, newLabelAr.trim(), userProfile);
          if (res.success) {
            setFeedback({ type: 'success', text: res.message });
            if (onSuccess) onSuccess(newLabelAr.trim());
            setTimeout(() => {
              handleSafeClose();
            }, 1200);
            return;
          } else {
            setFeedback({ type: 'info', text: res.message });
            if (onSuccess) onSuccess(newLabelAr.trim());
            return;
          }
        } else if (item.meta?.isWorksheetTab && item.meta.sheetId && item.meta.gid) {
          const res = await renameGoogleWorksheetRemote(item.meta.sheetId, item.meta.gid, newLabelAr.trim(), userProfile);
          setFeedback({ type: res.success ? 'success' : 'info', text: res.message });
          if (onSuccess) onSuccess(newLabelAr.trim());
          return;
        }
      }

      // Standard in-app dynamic rename
      const res = saveCustomLabel(labelId, newLabelAr.trim(), newLabelEn.trim() || undefined, userProfile);
      if (res.success) {
        setFeedback({ type: 'success', text: res.message });
        if (onSuccess) onSuccess(newLabelAr.trim());
        setTimeout(() => {
          handleSafeClose();
        }, 800);
      } else {
        setFeedback({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'حدث خطأ أثناء الحفظ' });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    const res = resetLabelToDefault(labelId, userProfile);
    if (res.success) {
      setFeedback({ type: 'success', text: res.message });
      if (item) {
        setNewLabelAr(item.defaultLabelAr);
        setNewLabelEn(item.defaultLabelEn);
      }
      if (onSuccess && item) onSuccess(item.defaultLabelAr);
      setTimeout(() => {
        handleSafeClose();
      }, 800);
    } else {
      setFeedback({ type: 'error', text: res.message });
    }
  };

  const isGoogleSheet = item?.category === 'google_sheets';

  return (
    <div 
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200" 
      onClick={handleBackdropClick}
      dir="rtl"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-white flex flex-col animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2">
                إعادة تسمية العنصر
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                  {labelId}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                تعديل الاسم المعروض في كافة واجهات النظام مع الحفاظ التام على المعرف والربط البرمجي
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={handleSafeClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 flex-1 overflow-y-auto">
          {/* Internal Immutable ID Badge Notice */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-3">
            <Shield className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">المعرف الثابت في قاعدة البيانات:</span>
                <span className="font-mono text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">{labelId}</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                تغيير الاسم المعروض آمن تماماً ولا يؤثر على القضايا أو الصلاحيات أو الربط الداخلي.
              </p>
            </div>
          </div>

          {/* Current / Original Name Info */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-800/40 p-3 rounded-xl border border-slate-800">
            <div>
              <span className="text-slate-400 block mb-1">الاسم الافتراضي في النظام:</span>
              <span className="font-semibold text-slate-200">{item?.defaultLabelAr || defaultFallback || '-'}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">الاسم المعروض حالياً:</span>
              <span className="font-semibold text-amber-300">{item?.customLabelAr || item?.defaultLabelAr || defaultFallback || '-'}</span>
            </div>
          </div>

          {/* New Arabic Name Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-200">
              الاسم الجديد (بالعربية) <span className="text-rose-400">*</span>
            </label>
            <input 
              type="text"
              value={newLabelAr}
              onChange={(e) => setNewLabelAr(e.target.value)}
              placeholder="اكتب الاسم الجديد الذي سيظهر في الواجهة..."
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              autoFocus
            />
          </div>

          {/* New English Name Input (Optional) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">
              الاسم الإنجليزي (اختياري للواجهة الإنجليزية)
            </label>
            <input 
              type="text"
              value={newLabelEn}
              onChange={(e) => setNewLabelEn(e.target.value)}
              placeholder="e.g. Legal Cases Vault"
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-left"
              dir="ltr"
            />
          </div>

          {/* Special Google Sheets Options */}
          {isGoogleSheet && (
            <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-800/40 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-300">
                <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                خيارات Google Sheets المتقدمة
              </div>
              <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={remoteGoogleRename}
                  onChange={(e) => setRemoteGoogleRename(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900"
                />
                <div>
                  <span className="font-medium text-slate-200">محاولة تغيير الاسم الحقيقي في Google Drive / Sheets أيضاً</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    إذا كان الحساب موثقاً بصلاحية الكتابة (OAuth)، سيتم تعديل الملف الأصلي. بدون OAuth، سيتم تغيير الاسم المعروض داخل المنظومة فقط دون أي خطأ في المزامنة.
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Feedback banner */}
          {feedback && (
            <div className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
              feedback.type === 'success' ? 'bg-emerald-950/60 border border-emerald-800/60 text-emerald-300' :
              feedback.type === 'error' ? 'bg-rose-950/60 border border-rose-800/60 text-rose-300' :
              'bg-blue-950/60 border border-blue-800/60 text-blue-300'
            }`}>
              {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              <span className="leading-relaxed">{feedback.text}</span>
            </div>
          )}

          {!canManage && (
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/40 text-amber-300 text-xs">
              ⚠️ ملاحظة: يتطلب حفظ وتعديل أسماء المنظومة صلاحية إدارة الأقسام أو حساب المشرف العام.
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
          <div>
            {item?.customLabelAr && (
              <button
                type="button"
                onClick={handleReset}
                disabled={loading || !canManage}
                className="px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                استعادة الافتراضي
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-xl transition"
            >
              إلغاء
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={loading || !canManage}
              className="px-5 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              حفظ الاسم الجديد
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
