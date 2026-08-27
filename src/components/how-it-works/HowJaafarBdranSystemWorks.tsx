import React, { useState } from 'react';
import { useI18n } from '../../lib/i18n';
import { useTheme } from '../../lib/theme';
import { 
  ShieldCheck, 
  WifiOff, 
  Wifi, 
  Database, 
  Users, 
  Layers, 
  CopyCheck, 
  Trash2, 
  Sparkles, 
  Lock, 
  FileText, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  HardDrive,
  UserPlus,
  KeyRound,
  DollarSign,
  Calendar,
  Share2,
  RefreshCw,
  Search,
  Zap,
  HelpCircle,
  FolderLock
} from 'lucide-react';

export const HowJaafarBdranSystemWorks: React.FC<{ onNavigate?: (view: string) => void }> = ({ onNavigate }) => {
  const { t, isRTL } = useI18n();
  const { isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<'offline_first' | 'cases_duplicates' | 'team_rbac' | 'assistant_life' | 'recycle_backup' | 'quick_faq'>('offline_first');

  const tabs = [
    { id: 'offline_first', labelAr: '1. معمارية الأوفلاين والاستقلالية', labelEn: '1. Offline-First Architecture', icon: WifiOff },
    { id: 'cases_duplicates', labelAr: '2. القضايا ومنع التكرار الذكي', labelEn: '2. Cases & Anti-Duplicate', icon: CopyCheck },
    { id: 'team_rbac', labelAr: '3. الفريق وإدارة الصلاحيات (50 مستخدم)', labelEn: '3. Team & RBAC (50 Users)', icon: Users },
    { id: 'assistant_life', labelAr: '4. المساعد الذكي وإدارة الحياة', labelEn: '4. AI Assistant & Life OS', icon: Sparkles },
    { id: 'recycle_backup', labelAr: '5. سلة المهملات والنسخ الاحتياطي', labelEn: '5. Trash & JSON Backup', icon: Database },
    { id: 'quick_faq', labelAr: '6. الأسئلة الشائعة والأمان', labelEn: '6. Security & FAQ', icon: ShieldCheck },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300 pb-16">
      
      {/* Hero Header */}
      <div className={`rounded-3xl p-6 sm:p-8 border relative overflow-hidden transition-all ${
        isDark ? 'bg-gradient-to-br from-[#121216] via-[#18181B] to-[#09090B] border-[#27272A]' : 'bg-gradient-to-br from-indigo-50 via-white to-slate-50 border-slate-200 shadow-sm'
      }`}>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Zap className="w-3.5 h-3.5" />
              <span>JAAFAR BDRAN SYSTEM • دليل التشغيل الشامل</span>
            </div>
            <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isRTL ? 'كيف يعمل نظام جعفر بدران لإدارة العمل والحياة؟' : 'How Jaafar Bdran System Works'}
            </h1>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-[#A1A1AA]' : 'text-slate-600'}`}>
              {isRTL 
                ? 'منظومة إدارية وشخصية متكاملة فائقة السرعة، مصممة لتعمل محلياً (Offline-First) بشكل كامل ومستقل 100%، مع إمكانية التزامن السحابي الاختياري دون أي اعتماد إجباري على أي منصة خارجية.'
                : 'A high-speed, local-first integrated management platform designed for full offline autonomy with optional cloud synchronization and zero mandatory external auth.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <div className={`p-3.5 rounded-2xl border text-center min-w-[110px] ${
              isDark ? 'bg-[#18181B]/80 border-[#27272A]' : 'bg-white border-slate-200'
            }`}>
              <div className="text-xl font-black text-emerald-500 font-mono">100%</div>
              <div className="text-[11px] font-medium text-slate-400">{isRTL ? 'جاهزية أوفلاين' : 'Offline Ready'}</div>
            </div>
            <div className={`p-3.5 rounded-2xl border text-center min-w-[110px] ${
              isDark ? 'bg-[#18181B]/80 border-[#27272A]' : 'bg-white border-slate-200'
            }`}>
              <div className="text-xl font-black text-indigo-400 font-mono">0</div>
              <div className="text-[11px] font-medium text-slate-400">{isRTL ? 'أذونات إجبارية' : 'Mandatory Auth'}</div>
            </div>
            <div className={`p-3.5 rounded-2xl border text-center min-w-[110px] ${
              isDark ? 'bg-[#18181B]/80 border-[#27272A]' : 'bg-white border-slate-200'
            }`}>
              <div className="text-xl font-black text-amber-400 font-mono">50+</div>
              <div className="text-[11px] font-medium text-slate-400">{isRTL ? 'فريق عمل حقيقي' : 'Team Capacity'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                  : isDark
                    ? 'bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white border-[#27272A]'
                    : 'bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{isRTL ? tab.labelAr : tab.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Offline-First & Autonomy */}
      {activeTab === 'offline_first' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className={`p-6 sm:p-8 rounded-3xl border ${isDark ? 'bg-[#121216] border-[#27272A]' : 'bg-white border-slate-200'}`}>
            <h2 className="text-lg font-bold text-indigo-400 flex items-center gap-2 mb-4">
              <WifiOff className="w-5 h-5 text-indigo-400" />
              <span>{isRTL ? 'المبدأ الأساسي: محلي أولاً (Local-First, Not Cloud-Dependent)' : 'Core Principle: Local-First'}</span>
            </h2>
            <p className={`text-sm leading-relaxed mb-6 ${isDark ? 'text-[#D4D4D8]' : 'text-slate-700'}`}>
              {isRTL 
                ? 'النظام مبني على مبدأ أن كل عملية حيوية (إنشاء قضايا، إرفاق ملفات، تسجيل مدفوعات، إدارة المهام، البحث الشامل) تحدث محلياً فوراً داخل جهازك دون انتظار خادم خارجي أو اتصال بالإنترنت.'
                : 'All core actions execute instantly on your local device without requiring an external server or active internet connection.'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-slate-50 border-slate-200'}`}>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold mb-3">
                  <Database className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1.5">{isRTL ? 'قاعدة بيانات محلية نشطة' : 'Active Local Database'}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isRTL ? 'حفظ تلقائي وفوري للقضايا والمستندات والمهام والملاحظات في الذاكرة المحلية والذاكرة المخبأة.' : 'Instant local caching of all cases, files, and tasks with zero latency.'}
                </p>
              </div>

              <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-slate-50 border-slate-200'}`}>
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold mb-3">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1.5">{isRTL ? 'تسجيل دخول محلي آمن' : 'Local Offline Auth'}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isRTL ? 'دخول فوري بحساب المشرف العام والرمز السري دون الحاجة لـ Google OAuth أو Firebase Login.' : 'Immediate login with owner profile without mandatory Google or cloud token requirements.'}
                </p>
              </div>

              <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-slate-50 border-slate-200'}`}>
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold mb-3">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1.5">{isRTL ? 'تزامن سحابي اختياري' : 'Optional Cloud Sync'}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isRTL ? 'في حال توفر الإنترنت، تتم مزامنة البيانات في الخلفية دون تعطيل عملك المحلي مطلقاً.' : 'Background synchronization only when online without ever blocking UI responsiveness.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Case Lifecycle & Anti-Duplicate */}
      {activeTab === 'cases_duplicates' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className={`p-6 sm:p-8 rounded-3xl border ${isDark ? 'bg-[#121216] border-[#27272A]' : 'bg-white border-slate-200'}`}>
            <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2 mb-4">
              <CopyCheck className="w-5 h-5 text-amber-400" />
              <span>{isRTL ? 'محرك منع تكرار القضايا الذكي (Intelligent Duplicate Prevention)' : 'Smart Anti-Duplicate Engine'}</span>
            </h2>
            <p className={`text-sm leading-relaxed mb-6 ${isDark ? 'text-[#D4D4D8]' : 'text-slate-700'}`}>
              {isRTL 
                ? 'لمنع تكرار فتح ملفات قضايا للموكل نفسه أو للواقعة نفسها عن طريق الخطأ، يقوم المحرك الذكي بفحص وتطبيع النصوص العربية والإنجليزية وأرقام الهواتف والروابط في الوقت الفعلي أثناء الكتابة.'
                : 'To prevent duplicate case creation, the engine normalizes Arabic/English text, phone numbers, and URLs in real-time, displaying similarity scores.'}
            </p>

            <div className="space-y-4">
              <div className={`p-4 rounded-2xl border flex items-start gap-3.5 ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-slate-50 border-slate-200'}`}>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">{isRTL ? '1. فحص رقم القضية الرسمي والداخلي (Exact Case # Match)' : 'Exact Case Number Match'}</h4>
                  <p className="text-xs text-slate-400">
                    {isRTL ? 'تطابق تام (100%) عند إدخال رقم دعوى رسمي لدى المحكمة أو رقم مرجعي موجود مسبقاً.' : '100% exact match trigger on official court numbers or system internal numbers.'}
                  </p>
                </div>
              </div>

              <div className={`p-4 rounded-2xl border flex items-start gap-3.5 ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-slate-50 border-slate-200'}`}>
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">{isRTL ? '2. تطبيع ومطابقة رقم هاتف الموكل (Phone Normalization)' : 'Phone Normalization'}</h4>
                  <p className="text-xs text-slate-400">
                    {isRTL ? 'إزالة الفواصل ومفاتيح الدول والمقارنة برقم الهاتف الفعلي للعميل بنسبة تطابق تصل إلى 85%.' : 'Strips country codes, dashes, and spaces to match phone records accurately.'}
                  </p>
                </div>
              </div>

              <div className={`p-4 rounded-2xl border flex items-start gap-3.5 ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-slate-50 border-slate-200'}`}>
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">{isRTL ? '3. معالجة النصوص العربية وحساب التشابه (Arabic Fuzzy Matching)' : 'Arabic Fuzzy Matching'}</h4>
                  <p className="text-xs text-slate-400">
                    {isRTL ? 'توحيد الهمزات والتاء المربوطة وإزالة التشكيل وحساب نسبة التشابه (Levenshtein Distance) مع كشف القضايا المشابهة.' : 'Normalizes Arabic characters and calculates Levenshtein similarity scores for titles and names.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Team & RBAC */}
      {activeTab === 'team_rbac' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className={`p-6 sm:p-8 rounded-3xl border ${isDark ? 'bg-[#121216] border-[#27272A]' : 'bg-white border-slate-200'}`}>
            <h2 className="text-lg font-bold text-emerald-400 flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-emerald-400" />
              <span>{isRTL ? 'إدارة الفريق والصلاحيات: حتى 50 عضواً حقيقياً فقط عند الطلب' : 'Team & RBAC: Up to 50 Real Users on Demand'}</span>
            </h2>
            <p className={`text-sm leading-relaxed mb-6 ${isDark ? 'text-[#D4D4D8]' : 'text-slate-700'}`}>
              {isRTL 
                ? 'النظام يبدأ نظيفاً بالمشرف العام (Jaafar Bdran) دون إنشاء أي حسابات وهمية أو مستخدمين غير حقيقيين مسبقاً. يمكن للمشرف العام إضافة حتى 50 عضواً حقيقياً وتعيين الصلاحيات الدقيقة لكل موظف.'
                : 'Starts clean with the Primary Administrator only. Supports creating up to 50 real accounts with granular permissions without dummy clutter.'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-slate-50 border-slate-200'}`}>
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>{isRTL ? 'المشرف العام (Primary Administrator)' : 'Primary Administrator'}</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isRTL ? 'المالك الأعلى للمنظومة، يمتلك السيطرة الكاملة على القضايا، الحسابات، الأقسام، المالية، الحذف النهائي، والنسخ الاحتياطي، ولا يمكن حذفه أو تعطيله من أي مستخدم آخر.' : 'Sole system owner with irreversible root control over all modules, permissions, and settings.'}
                </p>
              </div>

              <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-slate-50 border-slate-200'}`}>
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-indigo-400" />
                  <span>{isRTL ? 'مصفوفة الصلاحيات الدقيقة (Fine-Grained Permissions)' : 'Fine-Grained Permissions'}</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isRTL ? 'تخصيص كامل لصلاحيات العرض، الإضافة، التعديل، الحذف، الاطلاع على المالية، وأقسام العمل المصرح بالوصول إليها لكل موظف.' : 'Custom assignment for viewing, editing, deleting, financial access, and departmental filtering.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: AI Assistant & Life OS */}
      {activeTab === 'assistant_life' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className={`p-6 sm:p-8 rounded-3xl border ${isDark ? 'bg-[#121216] border-[#27272A]' : 'bg-white border-slate-200'}`}>
            <h2 className="text-lg font-bold text-indigo-400 flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <span>{isRTL ? 'المساعد الذكي وإدارة الحياة الشخصية والمهنية' : 'Intelligent Assistant & Personal Life OS'}</span>
            </h2>
            <p className={`text-sm leading-relaxed mb-6 ${isDark ? 'text-[#D4D4D8]' : 'text-slate-700'}`}>
              {isRTL 
                ? 'مساعد مدمج صمم خصيصاً ليجمع بين إدارة القضايا المعقدة وتنظيم تفاصيل الحياة اليومية للمشرف العام بأعلى معايير الخصوصية.'
                : 'A privacy-focused assistant organizing high-stakes cases and daily life routines completely on-device.'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-slate-50 border-slate-200'}`}>
                <h3 className="text-sm font-bold text-white mb-2">{isRTL ? 'الجانب المهني (Professional Hub)' : 'Professional Hub'}</h3>
                <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                  <li>{isRTL ? 'تلخيص فوري لوضع القضايا ومراحلها الحالية' : 'Instant case status summaries'}</li>
                  <li>{isRTL ? 'تنبيهات الجلسات القضائية والمواعيد الحرجة' : 'Court hearing reminders & urgent deadlines'}</li>
                  <li>{isRTL ? 'ترتيب أولويات المهام والمتابعات' : 'Automated task prioritization'}</li>
                  <li>{isRTL ? 'كشف المستحقات المالية والأتعاب المعلقة' : 'Outstanding fee tracking'}</li>
                </ul>
              </div>

              <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-slate-50 border-slate-200'}`}>
                <h3 className="text-sm font-bold text-white mb-2">{isRTL ? 'الحياة اليومية والإنتاجية (Daily Life OS)' : 'Daily Life OS'}</h3>
                <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                  <li>{isRTL ? 'خطة اليوم والتركيز (My Day & Habit Tracker)' : 'Daily focus plan & habit routines'}</li>
                  <li>{isRTL ? 'المفكرة الخاصة وصندوق الأفكار الآمن' : 'Private idea vault & quick notes'}</li>
                  <li>{isRTL ? 'متابعة الميزانية الشخصية والمصروفات' : 'Personal cashflow & expense ledger'}</li>
                  <li>{isRTL ? 'مؤشر الإنجاز والإنتاجية اليومية' : 'Daily productivity index'}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Recycle Bin & Backup */}
      {activeTab === 'recycle_backup' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className={`p-6 sm:p-8 rounded-3xl border ${isDark ? 'bg-[#121216] border-[#27272A]' : 'bg-white border-slate-200'}`}>
            <h2 className="text-lg font-bold text-rose-400 flex items-center gap-2 mb-4">
              <Database className="w-5 h-5 text-rose-400" />
              <span>{isRTL ? 'سلة المهملات المتقدمة والنسخ الاحتياطي الشامل' : 'Recycle Bin & Local JSON Backup'}</span>
            </h2>
            <p className={`text-sm leading-relaxed mb-6 ${isDark ? 'text-[#D4D4D8]' : 'text-slate-700'}`}>
              {isRTL 
                ? 'حماية كاملة من فقدان البيانات العرضي. أي عملية حذف تخضع للحذف المؤقت (Soft Delete) مع إمكانية الاستعادة بنقرة واحدة أو الحذف النهائي المأمون للمشرف العام فقط.'
                : 'Zero risk of accidental data loss with soft deletion, instant recovery, and single-click full JSON exports.'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-slate-50 border-slate-200'}`}>
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold mb-3">
                  <Trash2 className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1.5">{isRTL ? 'سلة المهملات واسترجاع العناصر' : 'Recycle Bin & Restore'}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isRTL ? 'استرجاع فوري للقضايا، المهام، المستندات، والمدفوعات المحذوفة مع تصفية سهلة وسجلات رقابية تدقيقية.' : 'One-click restore for cases, documents, tasks, and payments.'}
                </p>
              </div>

              <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-slate-50 border-slate-200'}`}>
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold mb-3">
                  <HardDrive className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1.5">{isRTL ? 'تصدير واستيراد النسخ الاحتياطية' : 'JSON Backup & Restore'}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isRTL ? 'تصدير ملف JSON محلي متكامل لكافة سجلات المنظومة في أي وقت، وإمكانية استعادته ودمجه بأمان.' : 'Download complete offline snapshot files anytime with zero external cloud dependencies.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Security & FAQ */}
      {activeTab === 'quick_faq' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className={`p-6 sm:p-8 rounded-3xl border ${isDark ? 'bg-[#121216] border-[#27272A]' : 'bg-white border-slate-200'}`}>
            <h2 className="text-lg font-bold text-cyan-400 flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <span>{isRTL ? 'معايير الأمان والأسئلة الشائعة' : 'Security Standards & FAQ'}</span>
            </h2>

            <div className="space-y-4">
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-slate-50 border-slate-200'}`}>
                <h4 className="text-sm font-bold text-white mb-1.5 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-indigo-400" />
                  <span>{isRTL ? 'هل يتطلب النظام إذن حساب Google بعد بنائه؟' : 'Does the system require Google Auth after build?'}</span>
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isRTL 
                    ? 'إطلاقاً. النظام يعمل محلياً 100% بكامل طاقته دون الحاجة لتسجيل الدخول بـ Google أو Firebase أو إنشاء أي مشروع سحابي. ربط أوراق Google Sheets أو النماذج هو ميزة اختيارية إضافية فقط لمن يرغب بربط بيانات عامة.'
                    : 'No. The system operates 100% locally without requiring Google or cloud authorization.'}
                </p>
              </div>

              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-slate-50 border-slate-200'}`}>
                <h4 className="text-sm font-bold text-white mb-1.5 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-indigo-400" />
                  <span>{isRTL ? 'كيف أضمن عدم ضياع بياناتي عند مسح ذاكرة المتصفح؟' : 'How to protect data from browser cache clearing?'}</span>
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isRTL 
                    ? 'يُنصح بتحميل نسخة احتياطية محلية (JSON Backup) بنقرة واحدة دورياً من قسم النسخ الاحتياطي، وحفظها على قرصك الخارجي أو بريدك الخاص.'
                    : 'Regularly download a JSON backup from the Backup Center to your storage device.'}
                </p>
              </div>

              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-slate-50 border-slate-200'}`}>
                <h4 className="text-sm font-bold text-white mb-1.5 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-indigo-400" />
                  <span>{isRTL ? 'كيف أستخدم لوحة الأوامر السريعة (Command Palette)؟' : 'How to use the Command Palette?'}</span>
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isRTL 
                    ? 'اضغط في أي وقت على الاختصار (Ctrl + K أو Cmd + K) للبحث الفوري في القضايا، الموكلين، المهام، فتح قضية جديدة، أو الانتقال لأي قسم بسرعة.'
                    : 'Press Ctrl+K or Cmd+K anytime to quickly search cases, clients, tasks, or open actions.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Action Navigation Footer */}
      {onNavigate && (
        <div className={`p-6 rounded-3xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
          isDark ? 'bg-[#121216] border-[#27272A]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <h3 className="text-sm font-bold text-white">{isRTL ? 'جاهز للبدء؟' : 'Ready to start?'}</h3>
            <p className="text-xs text-slate-400">{isRTL ? 'انتقل إلى منظومة الحياة اليومية أو لوحة القضايا للبدء في تنظيم أعمالك' : 'Jump directly into your Life OS or Case Dashboard'}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('life_os')}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-2"
            >
              <span>{isRTL ? 'فتح منظومة الحياة (Life OS)' : 'Open Life OS'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('cases')}
              className={`px-4 py-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                isDark ? 'bg-[#18181B] hover:bg-[#27272A] text-white border-[#27272A]' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
              }`}
            >
              <span>{isRTL ? 'إدارة القضايا' : 'Cases Dashboard'}</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
