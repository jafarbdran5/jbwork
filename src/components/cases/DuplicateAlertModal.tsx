import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ExternalLink, 
  GitMerge, 
  PlusCircle, 
  X, 
  CheckCircle2, 
  Phone, 
  Mail, 
  User, 
  Layers, 
  ShieldAlert,
  Clock,
  ArrowRight
} from 'lucide-react';
import { CaseItem, UserProfile } from '../../types';
import { DuplicateMatchResult } from '../../lib/duplicateDetector';
import { mergeDataIntoExistingCase, MergeInputData } from '../../lib/caseMergeService';

interface DuplicateAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  duplicateResult: DuplicateMatchResult;
  currentInputData?: MergeInputData;
  userProfile?: UserProfile | null;
  onOpenExistingCase: (caseId: string) => void;
  onMergeSuccess: (mergedCaseId: string) => void;
  onProceedAnyway: () => void;
}

export const DuplicateAlertModal: React.FC<DuplicateAlertModalProps> = ({
  isOpen,
  onClose,
  duplicateResult,
  currentInputData,
  userProfile,
  onOpenExistingCase,
  onMergeSuccess,
  onProceedAnyway
}) => {
  const [isMerging, setIsMerging] = useState(false);
  const [mergeStatus, setMergeStatus] = useState<string | null>(null);

  if (!isOpen || !duplicateResult.matchedCase) return null;

  const matched = duplicateResult.matchedCase;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-900/60 text-blue-300 border border-blue-700/60">جديدة</span>;
      case 'in_progress':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-900/60 text-cyan-300 border border-cyan-700/60">قيد المعالجة</span>;
      case 'pending':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-900/60 text-amber-300 border border-amber-700/60">معلقة / بانتظار رد</span>;
      case 'completed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-900/60 text-emerald-300 border border-emerald-700/60">مكتملة ومغلقة</span>;
      case 'cancelled':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">ملغاة</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">{status}</span>;
    }
  };

  const handleMerge = async () => {
    if (!currentInputData) {
      onOpenExistingCase(matched.id);
      return;
    }

    setIsMerging(true);
    setMergeStatus('جارٍ دمج المعلومات وتحديث القضية السابقة...');

    try {
      const res = await mergeDataIntoExistingCase(matched.id, currentInputData, userProfile);
      if (res.success && res.mergedCase) {
        setMergeStatus('تم الدمج بنجاح!');
        setTimeout(() => {
          onMergeSuccess(res.mergedCase!.id);
        }, 500);
      } else {
        alert(res.messageAr);
        setIsMerging(false);
      }
    } catch (err: any) {
      alert(`حدث خطأ أثناء الدمج: ${err.message || err}`);
      setIsMerging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-slate-900 border-2 border-amber-500/50 rounded-2xl shadow-2xl p-6 space-y-5 text-white animate-in zoom-in-95 duration-150"
        dir="rtl"
      >
        {/* Top Warning Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-amber-300 flex items-center gap-2">
                <span>⚠️ تم العثور على قضية مرتبطة بهذه المعلومات</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {duplicateResult.isDefiniteMatch
                  ? 'تم العثور على تطابق دقيق ومؤكد في بيانات الاتصال أو الهوية'
                  : 'تنبيه لاحتمال وجود قضية مرتبطة بنفس العميل أو البيانات'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Case Details Box */}
        <div className="bg-slate-950/90 border border-amber-500/30 rounded-xl p-4.5 space-y-3 shadow-inner">
          <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>هذه المعلومات موجودة مسبقاً ضمن:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Case Number */}
            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-1">رقم القضية:</span>
              <span className="text-sm font-mono font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60 inline-block">
                {matched.caseNumber}
              </span>
            </div>

            {/* Client Name */}
            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-1">اسم العميل:</span>
              <span className="text-sm font-bold text-white flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                {matched.client?.name || 'غير محدد'}
              </span>
            </div>

            {/* Case Status */}
            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-1">حالة القضية:</span>
              <div>{getStatusBadge(matched.status)}</div>
            </div>

            {/* Case Title */}
            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-1">عنوان القضية:</span>
              <span className="text-xs font-semibold text-slate-200 truncate block" title={matched.title}>
                {matched.title}
              </span>
            </div>
          </div>

          {/* Reason Badge */}
          {duplicateResult.matchReasonAr && (
            <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-900/50 text-[11px] text-amber-200 flex items-start gap-2">
              <span className="font-bold shrink-0">سبب التنبيه:</span>
              <span>{duplicateResult.matchReasonAr}</span>
            </div>
          )}
        </div>

        {/* Prompt Header */}
        <div className="pt-1">
          <h3 className="text-sm font-bold text-slate-200">ماذا تريد أن تفعل؟</h3>
        </div>

        {/* 3 Clear Action Cards (As per exact user specifications) */}
        <div className="space-y-2.5">
          {/* Action 1: Open Existing Case */}
          <button
            type="button"
            onClick={() => onOpenExistingCase(matched.id)}
            className="w-full text-right p-3.5 rounded-xl bg-slate-950 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/50 transition-all flex items-start gap-3 cursor-pointer group shadow-xs"
          >
            <div className="w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform mt-0.5">
              <ExternalLink className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-cyan-300 group-hover:text-cyan-200">
                  فتح القضية الحالية
                </h4>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                لفتح القضية الموجودة وعرض جميع تفاصيلها ومتابعتها مباشرة.
              </p>
            </div>
          </button>

          {/* Action 2: Merge into Existing Case */}
          <button
            type="button"
            disabled={isMerging}
            onClick={handleMerge}
            className="w-full text-right p-3.5 rounded-xl bg-slate-950 hover:bg-emerald-950/40 border border-slate-800 hover:border-emerald-500/50 transition-all flex items-start gap-3 cursor-pointer group shadow-xs disabled:opacity-50"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform mt-0.5">
              <GitMerge className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-emerald-300 group-hover:text-emerald-200">
                  دمج المعلومات مع القضية الحالية
                </h4>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full font-bold">
                  موصى به
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                لإضافة المعلومات الجديدة والملاحظات والمرفقات إلى القضية الموجودة بدلاً من إنشاء قضية مكررة.
              </p>
            </div>
          </button>

          {/* Action 3: Create New Case Anyway */}
          <button
            type="button"
            onClick={onProceedAnyway}
            className="w-full text-right p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-all flex items-start gap-3 cursor-pointer group shadow-xs"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform mt-0.5">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-300 group-hover:text-white">
                  إنشاء قضية جديدة
                </h4>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                إذا كانت المعلومات تخص قضية مختلفة تماماً رغم وجود تشابه في البيانات.
              </p>
            </div>
          </button>
        </div>

        {mergeStatus && (
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-bold text-center animate-fade-in flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{mergeStatus}</span>
          </div>
        )}
      </div>
    </div>
  );
};
