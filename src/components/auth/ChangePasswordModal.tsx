import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { 
  Lock, 
  KeyRound, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ShieldCheck 
} from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const { changePassword, userProfile } = useAuth();
  const { isRTL } = useI18n();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!currentPassword) {
      setErrorMsg(isRTL ? 'يرجى إدخال كلمة المرور الحالية' : 'Please enter your current password');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg(isRTL ? 'كلمة المرور الجديدة يجب أن تكون 6 خانات على الأقل' : 'New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg(isRTL ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await changePassword(currentPassword, newPassword);
      setSuccessMsg(isRTL ? 'تم تغيير كلمة المرور بنجاح!' : 'Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      console.error('Change password failed:', err);
      if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        setErrorMsg(isRTL ? 'كلمة المرور الحالية غير صحيحة' : 'Current password is incorrect');
      } else if (err?.code === 'auth/weak-password') {
        setErrorMsg(isRTL ? 'كلمة المرور الجديدة ضعيفة جداً' : 'New password is too weak');
      } else {
        setErrorMsg(isRTL ? 'فشل تحديث كلمة المرور، يرجى المحاولة لاحقاً' : 'Failed to update password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative text-slate-100 ring-1 ring-cyan-500/10"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 sm:left-4 sm:right-auto text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">
              {isRTL ? 'تغيير كلمة المرور' : 'Change Password'}
            </h3>
            <p className="text-xs text-slate-400">
              {userProfile?.email || 'الحساب الحالي'}
            </p>
          </div>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-800/50 flex items-start gap-2.5 text-xs text-red-200">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/50 border border-emerald-800/50 flex items-start gap-2.5 text-xs text-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {isRTL ? 'كلمة المرور الحالية' : 'Current Password'}
            </label>
            <div className="relative flex items-center">
              <input
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 px-3 pr-10 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute left-3 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {isRTL ? 'كلمة المرور الجديدة' : 'New Password'}
            </label>
            <div className="relative flex items-center">
              <input
                type={showNew ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 px-3 pr-10 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute left-3 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {isRTL ? '6 خانات على الأقل (يفضل خليط من أحرف وأرقام)' : 'At least 6 characters'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {isRTL ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}
            </label>
            <div className="relative flex items-center">
              <input
                type={showNew ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all shadow-md shadow-cyan-600/20 cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{loading ? (isRTL ? 'جارٍ الحفظ...' : 'Saving...') : (isRTL ? 'تحديث كلمة المرور' : 'Update Password')}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
            >
              {isRTL ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
