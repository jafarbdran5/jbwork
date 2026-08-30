import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { useTheme } from '../../lib/theme';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  Globe, 
  Moon, 
  Sun, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Shield, 
  LogIn
} from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const { 
    signInWithEmail, 
    sendPasswordReset,
  } = useAuth();
  
  const { t, language, toggleLanguage, isRTL } = useI18n();
  const { isDark, setTheme } = useTheme();

  // Mode: 'login' | 'forgot'
  const [activeMode, setActiveMode] = useState<'login' | 'forgot'>('login');

  // Login form state
  const [identifier, setIdentifier] = useState('jfrbdran@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Reset form state
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  // Status & loading
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Quick autofill helper for Jaafar
  const handleAutofillOwner = () => {
    setIdentifier('jfrbdran@gmail.com');
  };

  // Handle Local Sign In
  const handleLocalSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setErrorMsg(isRTL ? 'يرجى إدخال اسم المستخدم أو البريد الإلكتروني وكلمة المرور' : 'Please enter username/email and password');
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    try {
      // Normalize identifier
      let loginEmail = identifier.trim().toLowerCase();
      if (!loginEmail.includes('@')) {
        loginEmail = `${loginEmail}@jbwork.com`;
      }

      await signInWithEmail(loginEmail, password);
    } catch (err: any) {
      console.error('Sign in failed:', err);
      if (err?.message === 'UNAUTHORIZED_ACCOUNT') {
        setErrorMsg(
          isRTL 
            ? 'هذا الحساب غير مصرح له بالدخول. يرجى التواصل مع المشرف الرئيسي لإضافتك إلى فريق العمل.' 
            : 'This account is not authorized. Please contact the main supervisor.'
        );
      } else if (err?.message === 'ACCOUNT_DEACTIVATED') {
        setErrorMsg(
          isRTL 
            ? 'تم إيقاف أو تعطيل هذا الحساب. يرجى مراجعة المشرف الرئيسي.' 
            : 'This account has been deactivated. Please contact the main supervisor.'
        );
      } else if (
        err?.code === 'auth/user-not-found' || 
        err?.code === 'auth/wrong-password' || 
        err?.code === 'auth/invalid-credential' ||
        err?.message === 'INVALID_CREDENTIALS' ||
        err?.message === 'USER_NOT_FOUND'
      ) {
        setErrorMsg(
          isRTL 
            ? 'بيانات الدخول غير صحيحة. يرجى التأكد من البريد وكلمة المرور.' 
            : 'Incorrect email or password. Please verify your credentials.'
        );
      } else {
        setErrorMsg(
          isRTL 
            ? 'فشل تسجيل الدخول. يرجى التأكد من صحة البيانات والمحاولة مرة أخرى.' 
            : 'Sign in failed. Please check credentials and try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle password reset
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setErrorMsg(isRTL ? 'يرجى إدخال البريد الإلكتروني' : 'Please enter your email');
      return;
    }

    setErrorMsg(null);
    setResetSuccess(null);
    setLoading(true);

    try {
      await sendPasswordReset(resetEmail.trim());
      setResetSuccess(
        isRTL 
          ? `تم إرسال رابط تعيين كلمة المرور إلى ${resetEmail}. يرجى فحص بريدك الوارد.` 
          : `Password reset link sent to ${resetEmail}. Please check your inbox.`
      );
    } catch (err: any) {
      console.error('Reset failed:', err);
      setErrorMsg(isRTL ? 'حدث خطأ أثناء إرسال الرابط. يرجى التأكد من البريد والمحاولة لاحقاً.' : 'Failed to send reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-[#080B11] text-slate-100 relative overflow-hidden font-sans select-none">
      {/* Ambient Visual Accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-72 bg-gradient-to-b from-indigo-600/15 via-blue-600/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-4xl mx-auto p-4 sm:p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-indigo-600/25 ring-1 ring-white/10">
            JB
          </div>
          <div>
            <span className="font-bold text-white tracking-wide text-base block">منظومة جعفر بدران</span>
            <span className="text-[11px] text-indigo-400 font-medium font-mono">نظام تسجيل الدخول المحلي المباشر</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            {language === 'ar' ? 'English' : 'العربية'}
          </button>
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>
        </div>
      </header>

      {/* Main Authentication Box */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#0F1523] border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 backdrop-blur-md">
          
          {/* Security & System Badge */}
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span className="text-[11px] font-bold tracking-wider text-indigo-300 font-mono">
                {isRTL ? 'تسجيل دخول المشرف العام' : 'MASTER SUPER ADMIN AUTH'}
              </span>
            </div>
            <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1.5 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-800/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {isRTL ? 'جلسة محمية' : 'Secured'}
            </span>
          </div>

          {/* Heading */}
          <div className="text-center mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-1.5">
              {activeMode === 'forgot'
                ? (isRTL ? 'استعادة كلمة المرور' : 'Password Recovery')
                : (isRTL ? 'تسجيل الدخول إلى المنظومة' : 'Sign In to System')}
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
              {activeMode === 'forgot'
                ? (isRTL ? 'أدخل بريدك الإلكتروني لإرسال تعليمات إعادة تعيين كلمة المرور.' : 'Enter email to receive password reset instructions.')
                : (isRTL ? 'أدخل البريد الإلكتروني وكلمة المرور للوصول لكافة بيانات المنظومة.' : 'Enter email and password to access the system.')}
            </p>
          </div>

          {/* Error & Success Feedback Banners */}
          {errorMsg && (
            <div className="mb-5 p-3 rounded-2xl bg-rose-950/40 border border-rose-800/50 flex items-start gap-2.5 text-xs text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{errorMsg}</p>
            </div>
          )}

          {resetSuccess && (
            <div className="mb-5 p-3 rounded-2xl bg-emerald-950/40 border border-emerald-800/50 flex items-start gap-2.5 text-xs text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{resetSuccess}</p>
            </div>
          )}

          {/* MODE: Sign In */}
          {activeMode === 'login' && (
            <form onSubmit={handleLocalSignIn} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    {isRTL ? 'البريد الإلكتروني أو اسم المستخدم' : 'Email or Username'}
                  </label>
                  <button
                    type="button"
                    onClick={handleAutofillOwner}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer font-mono"
                  >
                    {isRTL ? 'تعبئة حساب المالك' : 'Fill Owner'}
                  </button>
                </div>
                <div className="relative flex items-center">
                  <User className={`w-4 h-4 text-slate-500 absolute ${isRTL ? 'right-3.5' : 'left-3.5'}`} />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="jfrbdran@gmail.com"
                    dir="ltr"
                    className={`w-full bg-[#080C14] border border-slate-700/80 rounded-2xl py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all ${
                      isRTL ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4'
                    }`}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    {isRTL ? 'كلمة المرور' : 'Password'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMode('forgot');
                      setErrorMsg(null);
                      setResetSuccess(null);
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                  >
                    {isRTL ? 'نسيت كلمة المرور؟' : 'Forgot Password?'}
                  </button>
                </div>
                <div className="relative flex items-center">
                  <Lock className={`w-4 h-4 text-slate-500 absolute ${isRTL ? 'right-3.5' : 'left-3.5'}`} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    dir="ltr"
                    className={`w-full bg-[#080C14] border border-slate-700/80 rounded-2xl py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all ${
                      isRTL ? 'pr-10 pl-11 text-right' : 'pl-10 pr-11'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute ${isRTL ? 'left-3.5' : 'right-3.5'} text-slate-500 hover:text-slate-300 transition-colors cursor-pointer p-1`}
                    title={showPassword ? (isRTL ? 'إخفاء كلمة المرور' : 'Hide password') : (isRTL ? 'إظهار كلمة المرور' : 'Show password')}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-bold text-sm transition-all shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50 min-h-[48px]"
              >
                <LogIn className="w-4 h-4" />
                <span>{loading ? (isRTL ? 'جارٍ التحقق والدخول...' : 'Signing In...') : (isRTL ? 'دخول فوري للمنظومة' : 'Sign In Now')}</span>
              </button>
            </form>
          )}

          {/* MODE: Forgot Password */}
          {activeMode === 'forgot' && (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                {isRTL 
                  ? 'أدخل بريدك الإلكتروني المعتمد وسنرسل لك رابطاً لإعادة تعيين كلمة المرور فوراً.' 
                  : 'Enter your email to receive a password reset link.'}
              </p>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  {isRTL ? 'البريد الإلكتروني' : 'Email Address'}
                </label>
                <div className="relative flex items-center">
                  <Mail className={`w-4 h-4 text-slate-500 absolute ${isRTL ? 'right-3' : 'left-3'}`} />
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="jfrbdran@gmail.com"
                    dir="ltr"
                    className={`w-full bg-[#080C14] border border-slate-700 rounded-2xl py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors ${
                      isRTL ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3'
                    }`}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md cursor-pointer disabled:opacity-50 min-h-[44px]"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{loading ? (isRTL ? 'جارٍ الإرسال...' : 'Sending...') : (isRTL ? 'إرسال رابط الاستعادة' : 'Send Reset Link')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('login');
                    setErrorMsg(null);
                    setResetSuccess(null);
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer min-h-[44px]"
                >
                  {isRTL ? 'عودة' : 'Back'}
                </button>
              </div>
            </form>
          )}

          {/* Footer Note */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
            <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              <span>{isRTL ? 'منظومة مشفرة وخاصة بالمشرف العام جعفر بدران' : 'Private Protected System for Jaafar Bdran'}</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-4xl mx-auto p-4 text-center text-xs text-slate-500 border-t border-slate-900/60">
        <p>{t('footerCopyright')}</p>
      </footer>
    </div>
  );
};
