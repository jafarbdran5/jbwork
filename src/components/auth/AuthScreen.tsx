import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { useTheme } from '../../lib/theme';
import { ShieldCheck, Lock, Key, Globe, Moon, Sun, ArrowRight, UserCheck, AlertCircle } from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const { signInWithGoogle, signInWithEmail, initializeFirstSuperAdmin, isSystemInitialized } = useAuth();
  const { t, language, toggleLanguage, isRTL } = useI18n();
  const { isDark, setTheme } = useTheme();

  const [mode, setMode] = useState<'login' | 'setup'>(isSystemInitialized ? 'login' : 'setup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ownerName, setOwnerName] = useState('جعفر بدران (Jaafar Bdran)');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleAuth = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || 
          err?.code === 'auth/cancelled-popup-request' ||
          err?.message?.includes('popup-closed-by-user')) {
        // User closed popup; no error banner needed
        return;
      }
      console.error(err);
      if (err?.message === 'UNAUTHORIZED_ACCOUNT') {
        setErrorMsg(t('unauthorizedAccountMsg'));
      } else if (err?.message === 'ACCOUNT_DEACTIVATED') {
        setErrorMsg(t('accountDeactivatedMsg'));
      } else {
        setErrorMsg(isRTL ? 'فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.' : 'Sign in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setErrorMsg(null);
    setLoading(true);
    try {
      await signInWithEmail(email, password);
    } catch (err: any) {
      console.error(err);
      if (err?.message === 'UNAUTHORIZED_ACCOUNT') {
        setErrorMsg(t('unauthorizedAccountMsg'));
      } else if (err?.message === 'ACCOUNT_DEACTIVATED') {
        setErrorMsg(t('accountDeactivatedMsg'));
      } else if (err?.code === 'auth/user-not-found' || err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        setErrorMsg(isRTL ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التأكد من البيانات المزودة لك من قبل الإدارة.' : 'Invalid email or password. Please verify the credentials provided by your administrator.');
      } else {
        setErrorMsg(isRTL ? 'بيانات الاعتماد غير صالحة أو الحساب غير مصرح له بالدخول.' : 'Invalid credentials or unauthorized account.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFirstRunSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      await initializeFirstSuperAdmin(ownerName, ownerPhone);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(isRTL ? 'حدث خطأ أثناء تهيئة المنظومة.' : 'An error occurred during system initialization.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-slate-950 text-slate-100 relative overflow-hidden font-sans">
      {/* Background cyber grid & glow lines */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.15),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b10_1px,transparent_1px),linear-gradient(to_bottom,#1e293b10_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Top Bar with Language & Theme toggle */}
      <header className="relative z-10 w-full max-w-6xl mx-auto p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-cyan-500/20 ring-1 ring-white/20">
            JB
          </div>
          <div>
            <span className="font-bold text-slate-100 tracking-wide text-base block">JB WORK</span>
            <span className="text-xs text-cyan-400 font-medium">{t('appSubtitle')}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            {language === 'ar' ? 'English' : 'العربية'}
          </button>
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>
      </header>

      {/* Main Login Box */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-7 shadow-2xl shadow-black/80 ring-1 ring-cyan-500/10">
          {/* Badge */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded-md border border-cyan-800/50">
                {t('privateWorkspaceBadge')}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">v1.0 • SECURE</span>
          </div>

          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white tracking-tight mb-1.5">
              {isRTL ? 'نظام عمل جعفر بدران' : 'Jaafar Bdran System'}
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
              {isRTL 
                ? 'منظومة داخلية خاصة لإدارة القضايا والمهام والمتابعة. الدخول مخصص فقط للمصرح لهم.'
                : 'Private internal workspace for cases, tasks and operations. Authorized access only.'}
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-red-950/40 border border-red-800/50 flex items-start gap-2.5 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{errorMsg}</p>
            </div>
          )}

          {/* Setup / Login toggler for Owner initialization */}
          {!isSystemInitialized && (
            <div className="mb-5 p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/50 text-xs text-cyan-200">
              <div className="flex items-center gap-2 font-bold mb-1">
                <UserCheck className="w-4 h-4 text-cyan-400" />
                {isRTL ? 'تهيئة النظام لأول مرة' : 'First-Run Setup'}
              </div>
              <p className="text-[11px] text-slate-300">
                {isRTL 
                  ? 'يرجى تسجيل الدخول بحساب المشرف العام لتعيين الصلاحيات وإعداد المنظومة.' 
                  : 'Please sign in with the Super Admin account to initialize the system.'}
              </p>
            </div>
          )}

          {/* Quick Sign In with Google */}
          <div className="space-y-4">
            <button
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700/80 text-white font-semibold text-sm transition-all duration-200 shadow-md hover:shadow-cyan-500/10 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.1s.7 5.4 1.9 7.8l3.7-2.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"
                />
              </svg>
              <span>{isRTL ? 'الدخول بحساب Google المعتمد' : 'Sign in with Google'}</span>
            </button>

            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-slate-800 w-full" />
              <span className="bg-slate-900 px-3 text-[11px] uppercase tracking-wider text-slate-500 font-mono">
                {isRTL ? 'أو عبر البريد المصرح' : 'OR VIA AUTHORIZED EMAIL'}
              </span>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  {isRTL ? 'البريد الإلكتروني' : 'Email Address'}
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@jbwork.internal"
                    className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  {isRTL ? 'كلمة المرور' : 'Password'}
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all shadow-lg shadow-cyan-600/20 cursor-pointer disabled:opacity-50 mt-2"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{loading ? t('saving') : isRTL ? 'تسجيل الدخول' : 'Sign In'}</span>
              </button>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
            <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
              <Lock className="w-3 h-3 text-cyan-400" />
              <span>{isRTL ? 'نظام خاص — التسجيل العام معطل' : 'Private System — Registration Closed'}</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto p-6 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between border-t border-slate-900 gap-2">
        <p>{t('footerCopyright')}</p>
        <p className="text-[11px] text-slate-600 font-mono">{t('footerNote')}</p>
      </footer>
    </div>
  );
};
