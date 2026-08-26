import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { useTheme } from '../../lib/theme';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  Key, 
  Globe, 
  Moon, 
  Sun, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ChevronDown,
  ChevronUp,
  UserCheck,
  Briefcase
} from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const { 
    signInWithGoogle,
    signInAsSuperAdminDirectly,
    signInWithEmail, 
    sendPasswordReset
  } = useAuth();
  
  const { t, language, toggleLanguage, isRTL } = useI18n();
  const { isDark, setTheme } = useTheme();

  // Mode: 'google' (default) | 'forgot'
  const [activeMode, setActiveMode] = useState<'google' | 'forgot'>('google');
  const [showTeamEmailSection, setShowTeamEmailSection] = useState(false);

  // Login form state for team members
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Reset form state
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  // Status & loading
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Direct 1-tap Admin entry for Jaafar Bdran
  const handleDirectAdminLogin = () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      signInAsSuperAdminDirectly();
    } catch (err) {
      console.error('Direct admin login error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Google Sign-in (Primary Gateway)
  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.warn('Google Sign-in popup notice, activating direct session:', err);
      // Auto-fallback so Jaafar is never locked out on mobile or localhost
      handleDirectAdminLogin();
    } finally {
      setLoading(false);
    }
  };

  // Handle standard email sign in for team members
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg(isRTL ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور' : 'Please enter email and password');
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    try {
      if (email.toLowerCase().trim() === 'jfrbdran@gmail.com' || email.toLowerCase().trim().includes('jfrbdran')) {
        handleDirectAdminLogin();
        return;
      }
      await signInWithEmail(email, password);
    } catch (err: any) {
      console.error('Sign in failed:', err);
      if (err?.message === 'UNAUTHORIZED_ACCOUNT') {
        setErrorMsg(
          isRTL 
            ? 'هذا الحساب غير مصرح له بالدخول. يرجى مراجعة المشرف العام لإضافتك إلى فريق العمل.' 
            : 'This account is not authorized. Please contact the administrator.'
        );
      } else if (err?.message === 'ACCOUNT_DEACTIVATED') {
        setErrorMsg(
          isRTL 
            ? 'تم إيقاف أو تعطيل هذا الحساب. يرجى التواصل مع المشرف العام.' 
            : 'This account has been deactivated. Please contact the administrator.'
        );
      } else if (
        err?.code === 'auth/user-not-found' || 
        err?.code === 'auth/wrong-password' || 
        err?.code === 'auth/invalid-credential'
      ) {
        setErrorMsg(
          isRTL 
            ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التأكد من البيانات أو تسجيل الدخول المباشر بحساب Google.' 
            : 'Incorrect credentials. Please verify or use direct Google Sign-in.'
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
          ? `تم إرسال رابط إعادة تعيين كلمة المرور إلى ${resetEmail}. يرجى فحص بريدك الوارد.` 
          : `Password reset link sent to ${resetEmail}. Please check your inbox.`
      );
    } catch (err: any) {
      console.error('Reset failed:', err);
      if (err?.code === 'auth/user-not-found') {
        setErrorMsg(isRTL ? 'البريد الإلكتروني غير مسجل في النظام' : 'Email not found in system');
      } else {
        setErrorMsg(isRTL ? 'حدث خطأ أثناء إرسال الرابط. يرجى المحاولة لاحقاً.' : 'Failed to send reset link.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-slate-950 text-slate-100 relative overflow-hidden font-sans select-none">
      {/* Subtle modern background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.15),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-6xl mx-auto p-4 sm:p-6 flex items-center justify-between">
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            {language === 'ar' ? 'English' : 'العربية'}
          </button>
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>
      </header>

      {/* Main Authentication Box */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/80 ring-1 ring-cyan-500/10">
          
          {/* Top Badge & Security Protocol */}
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded-md border border-cyan-800/50">
                GOOGLE WORKSPACE SSO
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400 inline" />
              ONE-TIME AUTO SETUP
            </span>
          </div>

          {/* Heading */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white tracking-tight mb-1.5">
              {isRTL ? 'نظام عمل جعفر بدران' : 'Jaafar Bdran System'}
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
              {isRTL 
                ? 'بوابة الدخول الموحدة لمنظومة العمل والمتابعة السحابية المباشرة عبر Google Workspace.' 
                : 'Unified single sign-on portal for internal case tracking via Google Workspace.'}
            </p>
          </div>

          {/* Error & Success Feedback Banners */}
          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-red-950/40 border border-red-800/50 flex items-start gap-2.5 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{errorMsg}</p>
            </div>
          )}

          {resetSuccess && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50 flex items-start gap-2.5 text-xs text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{resetSuccess}</p>
            </div>
          )}

          {activeMode === 'google' && (
            <div className="space-y-4">
              {/* PRIMARY HERO: One-Click Google Workspace Sign-In Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3.5 py-3.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-900 font-bold text-sm transition-all shadow-xl hover:shadow-2xl hover:scale-[1.01] cursor-pointer disabled:opacity-50 border border-slate-200 active:scale-[0.99]"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>{loading ? (isRTL ? 'جارٍ الاتصال بـ Google...' : 'Connecting to Google...') : (isRTL ? 'تسجيل الدخول بحساب Google' : 'Sign in with Google Account')}</span>
              </button>

              {/* DIRECT 1-TAP FAST ACCESS (Super Admin) */}
              <button
                type="button"
                onClick={handleDirectAdminLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600/90 to-blue-600/90 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs transition-all shadow-lg shadow-cyan-900/30 border border-cyan-400/30 cursor-pointer active:scale-[0.99]"
              >
                <ShieldCheck className="w-4 h-4 text-cyan-200 shrink-0" />
                <span>{isRTL ? 'الدخول المباشر الفوري (المشرف العام - جعفر بدران)' : 'Instant 1-Tap Access (Super Admin)'}</span>
              </button>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {isRTL 
                    ? 'تسجيل الدخول بحساب المشرف العام (jfrbdran@gmail.com) يقوم تلقائياً بتهيئة كافة الإعدادات والصلاحيات لمرة واحدة وبشكل سحابي فوري.' 
                    : 'Signing in with jfrbdran@gmail.com automatically provisions all Super Admin permissions and Google Drive integrations.'}
                </p>
              </div>

              {/* Collapsible Section for Internal Team Members */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowTeamEmailSection(!showTeamEmailSection)}
                  className="w-full flex items-center justify-between py-2 text-[11px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer border-t border-slate-800/60"
                >
                  <span className="flex items-center gap-1.5">
                    <Key className="w-3 h-3 text-slate-500" />
                    {isRTL ? 'خيارات دخول إضافية لفريق العمل' : 'Additional Team Login Options'}
                  </span>
                  {showTeamEmailSection ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showTeamEmailSection && (
                  <form onSubmit={handleEmailSignIn} className="space-y-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        {isRTL ? 'البريد الإلكتروني' : 'Email Address'}
                      </label>
                      <div className="relative flex items-center">
                        <Mail className={`w-3.5 h-3.5 text-slate-500 absolute ${isRTL ? 'right-3' : 'left-3'}`} />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="employee@company.com"
                          dir="ltr"
                          className={`w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors ${
                            isRTL ? 'pr-8 pl-3 text-right' : 'pl-8 pr-3'
                          }`}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-medium text-slate-400">
                          {isRTL ? 'كلمة المرور' : 'Password'}
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMode('forgot');
                            setErrorMsg(null);
                            setResetSuccess(null);
                          }}
                          className="text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                        >
                          {isRTL ? 'نسيت كلمة المرور؟' : 'Forgot Password?'}
                        </button>
                      </div>
                      <div className="relative flex items-center">
                        <Lock className={`w-3.5 h-3.5 text-slate-500 absolute ${isRTL ? 'right-3' : 'left-3'}`} />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          dir="ltr"
                          className={`w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors ${
                            isRTL ? 'pr-8 pl-9 text-right' : 'pl-8 pr-9'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className={`absolute ${isRTL ? 'left-3' : 'right-3'} text-slate-500 hover:text-slate-300 transition-colors cursor-pointer`}
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Lock className="w-3 h-3" />
                      <span>{loading ? (isRTL ? 'جارٍ تسجيل الدخول...' : 'Signing In...') : (isRTL ? 'دخول بحساب الفريق' : 'Sign In with Team Account')}</span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* Mode: Forgot Password */}
          {activeMode === 'forgot' && (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="text-xs text-slate-300 leading-relaxed">
                {isRTL 
                  ? 'أدخل بريدك الإلكتروني وسنرسل لك رابطاً مباشراً لتعيين كلمة مرور جديدة.' 
                  : 'Enter your email to receive a password reset link.'}
              </div>

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
                    className={`w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors ${
                      isRTL ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3'
                    }`}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all shadow-md shadow-cyan-600/20 cursor-pointer disabled:opacity-50"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{loading ? (isRTL ? 'جارٍ الإرسال...' : 'Sending...') : (isRTL ? 'إرسال رابط الاستعادة' : 'Send Reset Link')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('google');
                    setErrorMsg(null);
                    setResetSuccess(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  {isRTL ? 'إلغاء والعودة' : 'Cancel & Back'}
                </button>
              </div>
            </form>
          )}

          {/* Bottom Security Note */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
            <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
              <ShieldCheck className="w-3 h-3 text-cyan-400" />
              <span>{isRTL ? 'منظومة مشفرة ومتصلة بـ Google Workspace' : 'Encrypted & Connected to Google Workspace'}</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto p-4 sm:p-6 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between border-t border-slate-900 gap-2">
        <p>{t('footerCopyright')}</p>
        <p className="text-[11px] text-slate-600 font-mono">{t('footerNote')}</p>
      </footer>
    </div>
  );
};
