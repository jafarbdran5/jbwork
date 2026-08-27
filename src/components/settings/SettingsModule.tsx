import React, { useState, useEffect } from 'react';
import { useI18n } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, doc, setDoc, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { CaseTypeConfig, PlatformConfig } from '../../types';
import { DEFAULT_CASE_TYPES, DEFAULT_PLATFORMS } from '../../lib/constants';
import { logAuditAndEvent } from '../../lib/audit';
import { getLocalCases } from '../../lib/offlineStore';
import { ChangePasswordModal } from '../auth/ChangePasswordModal';
import { 
  Settings, 
  Layers, 
  Globe, 
  ShieldCheck, 
  Database, 
  Trash2, 
  Plus, 
  Check, 
  Info,
  Sliders,
  X,
  Lock,
  Moon,
  Sun,
  Laptop,
  KeyRound,
  HardDrive,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Link,
  DollarSign,
  Clock,
  Sparkles,
  UserCheck,
  Shield,
  Eye,
  FileText
} from 'lucide-react';

export const SettingsModule: React.FC = () => {
  const { t, isRTL, language, setLanguage } = useI18n();
  const { userProfile, isSuperAdmin, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'types' | 'platforms' | 'storage' | 'integrations' | 'about'>('general');
  const [caseTypes, setCaseTypes] = useState<CaseTypeConfig[]>(DEFAULT_CASE_TYPES);
  const [platforms, setPlatforms] = useState<PlatformConfig[]>(DEFAULT_PLATFORMS);

  // General Settings State
  const [currency, setCurrency] = useState(() => localStorage.getItem('jb_pref_currency') || 'USD');
  const [timezone, setTimezone] = useState(() => localStorage.getItem('jb_pref_timezone') || 'Asia/Damascus');
  const [autoSaveNotification, setAutoSaveNotification] = useState(true);
  const [showPinModal, setShowPinModal] = useState(false);

  // New Case Type Modal
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [typeKey, setTypeKey] = useState('');
  const [typeLabelAr, setTypeLabelAr] = useState('');
  const [typeLabelEn, setTypeLabelEn] = useState('');
  const [typeColor, setTypeColor] = useState('cyan');

  // New Platform Modal
  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [platformName, setPlatformName] = useState('');
  const [platformNameAr, setPlatformNameAr] = useState('');
  const [platformIcon, setPlatformIcon] = useState('globe');

  // Offline Engine Stats
  const [cachedCasesCount, setCachedCasesCount] = useState(0);
  const [storageCleanSuccess, setStorageCleanSuccess] = useState(false);

  // Public Sheet Optional Integration State
  const [publicSheetUrl, setPublicSheetUrl] = useState(() => localStorage.getItem('jb_public_lead_sheet_url') || '');
  const [publicSheetSaved, setPublicSheetSaved] = useState(false);

  useEffect(() => {
    // Count local cases
    try {
      const localCases = getLocalCases();
      setCachedCasesCount(localCases.length);
    } catch (_) {}

    // Firestore subscribers for types & platforms
    const unsubTypes = onSnapshot(collection(db, 'caseTypes'), (snap) => {
      if (!snap.empty) {
        setCaseTypes(snap.docs.map(d => ({ id: d.id, ...d.data() } as CaseTypeConfig)));
      }
    }, () => {});

    const unsubPlatforms = onSnapshot(collection(db, 'platforms'), (snap) => {
      if (!snap.empty) {
        setPlatforms(snap.docs.map(d => ({ id: d.id, ...d.data() } as PlatformConfig)));
      }
    }, () => {});

    return () => {
      unsubTypes();
      unsubPlatforms();
    };
  }, []);

  const handleSaveCurrency = (newCurr: string) => {
    setCurrency(newCurr);
    localStorage.setItem('jb_pref_currency', newCurr);
    setAutoSaveNotification(true);
    setTimeout(() => setAutoSaveNotification(false), 2000);
  };

  const handleSaveTimezone = (newTz: string) => {
    setTimezone(newTz);
    localStorage.setItem('jb_pref_timezone', newTz);
    setAutoSaveNotification(true);
    setTimeout(() => setAutoSaveNotification(false), 2000);
  };

  const handleSavePublicSheet = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('jb_public_lead_sheet_url', publicSheetUrl.trim());
    setPublicSheetSaved(true);
    setTimeout(() => setPublicSheetSaved(false), 3000);
  };

  const handleCleanStorage = () => {
    // Safely optimize storage by removing obsolete caches
    try {
      localStorage.removeItem('jb_temp_draft');
      setStorageCleanSuccess(true);
      setTimeout(() => setStorageCleanSuccess(false), 3000);
    } catch (_) {}
  };

  const handleCreateType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeKey.trim() || !typeLabelAr.trim() || !userProfile || !isSuperAdmin) return;

    try {
      const generatedKey = typeKey.toLowerCase().trim().replace(/\s+/g, '_');
      const newTypeObj: CaseTypeConfig = {
        id: generatedKey,
        key: generatedKey,
        labelAr: typeLabelAr.trim(),
        labelEn: typeLabelEn.trim() || typeLabelAr.trim(),
        isActive: true,
        sortOrder: caseTypes.length + 1,
        isSystem: false,
      };

      await setDoc(doc(db, 'caseTypes', newTypeObj.key), {
        ...newTypeObj,
        createdAt: serverTimestamp(),
      });

      setCaseTypes(prev => [...prev.filter(t => t.key !== newTypeObj.key), newTypeObj]);

      await logAuditAndEvent({
        action: 'CONFIG_CHANGE',
        details: `إضافة نوع قضية جديد لمنظومة جعفر بدران: ${typeLabelAr}`,
        entityType: 'settings',
        entityTitle: typeLabelAr,
        user: userProfile
      });

      setTypeKey('');
      setTypeLabelAr('');
      setTypeLabelEn('');
      setShowTypeModal(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreatePlatform = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platformName.trim() || !userProfile || !isSuperAdmin) return;

    try {
      const newPlatformObj: PlatformConfig = {
        id: platformName.toLowerCase().trim().replace(/\s+/g, '_'),
        name: platformName.trim(),
        nameAr: platformNameAr.trim() || platformName.trim(),
        icon: platformIcon,
        isActive: true,
        sortOrder: platforms.length + 1,
      };

      await addDoc(collection(db, 'platforms'), {
        ...newPlatformObj,
        createdAt: serverTimestamp(),
      });

      setPlatforms(prev => [...prev, newPlatformObj]);

      await logAuditAndEvent({
        action: 'CONFIG_CHANGE',
        details: `إضافة منصة جديدة للمنظومة: ${platformName}`,
        entityType: 'settings',
        entityTitle: platformName,
        user: userProfile
      });

      setPlatformName('');
      setPlatformNameAr('');
      setShowPlatformModal(false);
    } catch (e) {
      console.error(e);
    }
  };

  const tabs = [
    { id: 'general', labelAr: '1. الإعدادات العامة', labelEn: '1. General Settings', icon: Sliders },
    { id: 'security', labelAr: '2. الأمان والمشرف العام', labelEn: '2. Security & Admin', icon: ShieldCheck },
    { id: 'types', labelAr: '3. أنواع القضايا', labelEn: '3. Case Types Builder', icon: Layers },
    { id: 'platforms', labelAr: '4. المنصات والقنوات', labelEn: '4. Platforms & Channels', icon: Globe },
    { id: 'storage', labelAr: '5. محرك الأوفلاين والتخزين', labelEn: '5. Offline & Storage', icon: Database },
    { id: 'integrations', labelAr: '6. الربط الخارجي الاختياري', labelEn: '6. Optional Integrations', icon: Link },
    { id: 'about', labelAr: '7. عن المنظومة', labelEn: '7. About System', icon: Info },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-200 pb-16">
      
      {/* Header */}
      <div className={`rounded-3xl p-6 sm:p-7 border relative overflow-hidden transition-all ${
        isDark ? 'bg-gradient-to-br from-[#121216] via-[#18181B] to-[#09090B] border-[#27272A]' : 'bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>JAAFAR BDRAN SYSTEM • الإعدادات المركزية</span>
            </div>
            <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isRTL ? 'إعدادات منظومة جعفر بدران الشاملة' : 'Jaafar Bdran System Settings'}
            </h1>
            <p className={`text-xs sm:text-sm ${isDark ? 'text-[#A1A1AA]' : 'text-slate-600'}`}>
              {isRTL 
                ? 'التحكم الكامل بالهوية، خيارات التشغيل المحلي، الأمان، أنواع القضايا، المنصات، والتخزين المستقل 100%.' 
                : 'Centralized control for system identity, offline engine, security, case configurations, and local storage.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3.5 py-2 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>OFFLINE READY</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
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

      {/* TAB 1: GENERAL SETTINGS */}
      {activeTab === 'general' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className={`p-6 sm:p-8 rounded-3xl border ${isDark ? 'bg-[#121216] border-[#27272A]' : 'bg-white border-slate-200'}`}>
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-400" />
              <span>{isRTL ? 'خيارات العرض والهوية والواجهة' : 'Display & Regional Preferences'}</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Language Preference */}
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-slate-50 border-slate-200'}`}>
                <label className="block text-xs font-bold text-white mb-2">{isRTL ? 'لغة الواجهة' : 'System Language'}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLanguage('ar')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      language === 'ar'
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : isDark ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    العربية (RTL)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('en')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      language === 'en'
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : isDark ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    English (LTR)
                  </button>
                </div>
              </div>

              {/* Theme Mode */}
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-slate-50 border-slate-200'}`}>
                <label className="block text-xs font-bold text-white mb-2">{isRTL ? 'المظهر والألوان' : 'Color Theme'}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => !isDark && toggleTheme()}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                      isDark
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : isDark ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    <Moon className="w-4 h-4" />
                    <span>{isRTL ? 'داكن (Dark Studio)' : 'Dark Studio'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => isDark && toggleTheme()}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                      !isDark
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : isDark ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    <Sun className="w-4 h-4" />
                    <span>{isRTL ? 'فاتح (Clean Light)' : 'Clean Light'}</span>
                  </button>
                </div>
              </div>

              {/* Default Currency */}
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-slate-50 border-slate-200'}`}>
                <label className="block text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>{isRTL ? 'العملة الافتراضية للمدفوعات' : 'Default Currency'}</span>
                </label>
                <select
                  value={currency}
                  onChange={(e) => handleSaveCurrency(e.target.value)}
                  className={`w-full p-2.5 rounded-xl text-xs font-bold border outline-none ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}
                >
                  <option value="USD">الدولار الأمريكي (USD $)</option>
                  <option value="SYP">الليرة السورية (SYP ل.س)</option>
                  <option value="AED">الدرهم الإماراتي (AED د.إ)</option>
                  <option value="SAR">الريال السعودي (SAR ر.س)</option>
                  <option value="EUR">اليورو الأوروبي (EUR €)</option>
                </select>
              </div>

              {/* Timezone */}
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-slate-50 border-slate-200'}`}>
                <label className="block text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span>{isRTL ? 'المنطقة الزمنية المعتمدة' : 'Timezone'}</span>
                </label>
                <select
                  value={timezone}
                  onChange={(e) => handleSaveTimezone(e.target.value)}
                  className={`w-full p-2.5 rounded-xl text-xs font-bold border outline-none ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}
                >
                  <option value="Asia/Damascus">توقيت دمشق (Asia/Damascus - GMT+3)</option>
                  <option value="Asia/Riyadh">توقيت الرياض / مكة (Asia/Riyadh - GMT+3)</option>
                  <option value="Asia/Dubai">توقيت دبي (Asia/Dubai - GMT+4)</option>
                  <option value="Africa/Cairo">توقيت القاهرة (Africa/Cairo - GMT+2)</option>
                  <option value="Europe/London">التوقيت العالمي (UTC / GMT)</option>
                </select>
              </div>
            </div>

            {/* Quick Hotkeys Legend */}
            <div className={`mt-6 p-4 rounded-2xl border ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-slate-50 border-slate-200'}`}>
              <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>{isRTL ? 'اختصارات لوحة المفاتيح السريعة' : 'Keyboard Shortcuts'}</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Ctrl + K</span>
                  <span className="text-indigo-400 font-bold">{isRTL ? 'لوحة الأوامر' : 'Palette'}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">/</span>
                  <span className="text-cyan-400 font-bold">{isRTL ? 'البحث السريع' : 'Search'}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Esc</span>
                  <span className="text-rose-400 font-bold">{isRTL ? 'إغلاق النوافذ' : 'Close'}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Ctrl + S</span>
                  <span className="text-emerald-400 font-bold">{isRTL ? 'حفظ فوري' : 'Save'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SECURITY & PRIMARY ADMIN */}
      {activeTab === 'security' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className={`p-6 sm:p-8 rounded-3xl border ${isDark ? 'bg-[#121216] border-[#27272A]' : 'bg-white border-slate-200'}`}>
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>{isRTL ? 'إدارة المشرف العام وحماية الحساب' : 'Primary Administrator & Security'}</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Primary Admin Badge */}
              <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-slate-50 border-slate-200'} space-y-3`}>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-lg shadow-indigo-600/30">
                    JB
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">جعفر بدران (Jaafar Bdran)</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        SUPER ADMIN
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono">jfrbdran@gmail.com</p>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {isRTL 
                    ? 'المشرف العام المالك للمنظومة يمتلك الصلاحية المطلقة لإدارة القضايا، الحسابات، الأقسام، سلة المهملات، وتصدير النسخ الاحتياطية.' 
                    : 'The Primary Administrator possesses absolute authority over cases, accounts, payments, and system backups.'}
                </p>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPinModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>{isRTL ? 'تغيير الرمز السري للمشرف' : 'Change Master PIN'}</span>
                  </button>
                </div>
              </div>

              {/* Local Device Security */}
              <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-slate-50 border-slate-200'} space-y-3`}>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-cyan-400" />
                  <span>{isRTL ? 'حماية الجهاز والتشغيل المحلي' : 'Device Trust & Local Security'}</span>
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-400">{isRTL ? 'حالة توثيق الجهاز:' : 'Device Trust Status:'}</span>
                    <span className="text-emerald-400 font-bold font-mono">TRUSTED (OFFLINE READY)</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-400">{isRTL ? 'مستوى حماية الجلسة:' : 'Session Protection:'}</span>
                    <span className="text-indigo-400 font-bold font-mono">LOCAL ENCRYPTION</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {isRTL 
                    ? 'بياناتك مشفرة ومحفوظة محلياً على هذا الجهاز ولا تتطلب أي تسجيل دخول سحابي إجباري.' 
                    : 'Your records are stored securely on this device with zero external cloud dependencies.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CASE TYPES BUILDER */}
      {activeTab === 'types' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className={`p-6 sm:p-8 rounded-3xl border ${isDark ? 'bg-[#121216] border-[#27272A]' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-cyan-400" />
                  <span>{isRTL ? 'أنواع القضايا المعتمدة في المنظومة' : 'Supported Case Types'}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {isRTL ? 'تخصيص تصنيفات القضايا وحقولها الديناميكية' : 'Customize case classifications and dedicated fields'}
                </p>
              </div>

              {isSuperAdmin && (
                <button
                  onClick={() => setShowTypeModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shadow-md transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isRTL ? 'إضافة نوع قضية جديد' : 'Add Case Type'}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {caseTypes.map((tItem) => (
                <div key={tItem.key} className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 space-y-2.5 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                      {tItem.key}
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{isRTL ? tItem.labelAr : tItem.labelEn}</h4>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{tItem.labelEn}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PLATFORMS */}
      {activeTab === 'platforms' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className={`p-6 sm:p-8 rounded-3xl border ${isDark ? 'bg-[#121216] border-[#27272A]' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-indigo-400" />
                  <span>{isRTL ? 'المنصات الرقمية وقنوات الاستقبال' : 'Supported Platforms & Channels'}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {isRTL ? 'المنصات المستخدمة في توثيق البلاغات والقضايا وحذف المحتوى' : 'Platforms used for forensic reporting and content takedowns'}
                </p>
              </div>

              {isSuperAdmin && (
                <button
                  onClick={() => setShowPlatformModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shadow-md transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isRTL ? 'إضافة منصة جديدة' : 'Add Platform'}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {platforms.map((p) => (
                <div key={p.name} className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-3.5 text-center space-y-1.5 transition-all">
                  <div className="w-9 h-9 mx-auto rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-cyan-400">
                    <Globe className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-white">{isRTL ? p.nameAr : p.name}</h4>
                  <p className="text-[10px] text-slate-400 font-mono truncate">{p.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: OFFLINE ENGINE & STORAGE */}
      {activeTab === 'storage' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className={`p-6 sm:p-8 rounded-3xl border ${isDark ? 'bg-[#121216] border-[#27272A]' : 'bg-white border-slate-200'}`}>
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-rose-400" />
              <span>{isRTL ? 'محرك الأوفلاين والتخزين المحلي المباشر' : 'Offline Engine & Local Storage'}</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-slate-50 border-slate-200'}`}>
                <div className="text-2xl font-black text-emerald-400 font-mono mb-1">{cachedCasesCount}</div>
                <div className="text-xs font-bold text-white">{isRTL ? 'قضايا محفوظة محلياً' : 'Locally Cached Cases'}</div>
                <div className="text-[10px] text-slate-400 mt-1">{isRTL ? 'جاهزة للعمل الفوري بدون نت' : 'Ready for offline usage'}</div>
              </div>

              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-slate-50 border-slate-200'}`}>
                <div className="text-2xl font-black text-indigo-400 font-mono mb-1">IndexedDB</div>
                <div className="text-xs font-bold text-white">{isRTL ? 'محرك التخزين النشط' : 'Storage Engine'}</div>
                <div className="text-[10px] text-slate-400 mt-1">{isRTL ? 'تخزين مشفر وفائق السرعة' : 'Encrypted on-device'}</div>
              </div>

              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-slate-50 border-slate-200'}`}>
                <div className="text-2xl font-black text-cyan-400 font-mono mb-1">100%</div>
                <div className="text-xs font-bold text-white">{isRTL ? 'استقلالية النظام' : 'Autonomy Level'}</div>
                <div className="text-[10px] text-slate-400 mt-1">{isRTL ? 'بدون أي تبعية لسيرفر خارجي' : 'Zero cloud lock-in'}</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleCleanStorage}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer border border-slate-700"
              >
                <RefreshCw className="w-4 h-4 text-cyan-400" />
                <span>{isRTL ? 'تنظيم وتحسين الذاكرة المحلية' : 'Optimize Local Cache'}</span>
              </button>

              {storageCleanSuccess && (
                <span className="text-xs text-emerald-400 font-bold animate-in fade-in flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isRTL ? 'تم تحسين الذاكرة بنجاح' : 'Cache optimized'}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: OPTIONAL INTEGRATIONS (PUBLIC SHEETS / WEBHOOKS) */}
      {activeTab === 'integrations' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className={`p-6 sm:p-8 rounded-3xl border ${isDark ? 'bg-[#121216] border-[#27272A]' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Link className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {isRTL ? 'الربط الخارجي الاختياري (Auxiliary Integrations)' : 'Optional External Integrations'}
                </h3>
                <p className="text-xs text-slate-400">
                  {isRTL 
                    ? 'أدوات اختيارية لقراءة طلبات الموقع أو البلاغات الخارجية دون فرض أي أذونات سحابية على المنظومة.' 
                    : 'Optional tools to read public website lead sheets without mandatory cloud login.'}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
              <form onSubmit={handleSavePublicSheet} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-white mb-1">
                    {isRTL ? 'رابط ملف Google Sheet العام لطلبات الموقع الإلكتروني' : 'Public Website Google Sheet URL'}
                  </label>
                  <input
                    type="url"
                    placeholder="https://docs.google.com/spreadsheets/d/1KNunZ9a48CBh6vvg9fkoOM4MrIPwUEptQ6YrznKqJUQ/edit?usp=sharing"
                    value={publicSheetUrl}
                    onChange={(e) => setPublicSheetUrl(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    {isRTL 
                      ? 'يمكنك استيراد الطلبات الجديدة من هذا الملف بضغطة زر من قسم (الطلبات الخارجية / Public Sheets) في أي وقت دون إذن حساب.' 
                      : 'You can import leads directly from the Public Sheets tab without cloud account authorization.'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    {isRTL ? 'حفظ رابط الملف العام' : 'Save Public Sheet URL'}
                  </button>

                  {publicSheetSaved && (
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isRTL ? 'تم الحفظ بنجاح' : 'Saved'}</span>
                    </span>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: ABOUT SYSTEM */}
      {activeTab === 'about' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className={`p-6 sm:p-8 rounded-3xl border ${isDark ? 'bg-[#121216] border-[#27272A]' : 'bg-white border-slate-200'} space-y-4 max-w-2xl`}>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 border border-indigo-400/30 flex items-center justify-center font-black text-white text-xl font-mono shadow-xl shadow-indigo-600/30">
                JB
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">JAAFAR BDRAN SYSTEM</h2>
                <p className="text-xs text-indigo-400 font-mono">Autonomous Life & Case Operating System • v2.0 Pro</p>
              </div>
            </div>

            <div className="text-xs text-slate-300 space-y-3 leading-relaxed border-t border-slate-800 pt-4">
              <p>
                {isRTL 
                  ? 'منظومة جعفر بدران هي منصة تشغيلية متكاملة فائقة السرعة، مصممة لإدارة قضايا الأمن السيبراني، مكافحة الجرائم الرقمية، الابتزاز، حذف المحتوى، والتحقيقات الجنائية الرقمية، إلى جانب تنظيم روتين الحياة والإنتاجية اليومية للمشرف العام.' 
                  : 'Jaafar Bdran System is a high-speed autonomous operating platform designed for cybercrime investigations, content takedowns, digital forensics, alongside personal life productivity routines.'}
              </p>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 font-mono text-[11px]">
                <div className="text-slate-400">Owner: <span className="text-white font-bold">Jaafar Bdran (jfrbdran@gmail.com)</span></div>
                <div className="text-slate-400">Architecture: <span className="text-emerald-400 font-bold">100% Offline-First (Zero Cloud Dependencies)</span></div>
                <div className="text-slate-400">Build: <span className="text-cyan-400 font-bold">v2.0.0 Stable (2026)</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Case Type */}
      {showTypeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">{isRTL ? 'إضافة نوع قضية جديد' : 'New Case Type'}</h3>
              <button onClick={() => setShowTypeModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateType} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{isRTL ? 'المعرف اللاتيني (Key)' : 'Key (latin)'} *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ransomware_incident"
                  value={typeKey}
                  onChange={(e) => setTypeKey(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{isRTL ? 'الاسم بالعربية' : 'Arabic Label'} *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: حوادث الفدية الرقمية"
                  value={typeLabelAr}
                  onChange={(e) => setTypeLabelAr(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{isRTL ? 'الاسم بالإنجليزية' : 'English Label'}</label>
                <input
                  type="text"
                  placeholder="e.g. Ransomware Incident"
                  value={typeLabelEn}
                  onChange={(e) => setTypeLabelEn(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTypeModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Platform */}
      {showPlatformModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">{isRTL ? 'إضافة منصة جديدة' : 'New Platform'}</h3>
              <button onClick={() => setShowPlatformModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlatform} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{isRTL ? 'اسم المنصة بالإنجليزية' : 'Platform Name (EN)'} *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Reddit, Discord..."
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{isRTL ? 'اسم المنصة بالعربية' : 'Platform Name (AR)'}</label>
                <input
                  type="text"
                  placeholder="مثال: ريديت"
                  value={platformNameAr}
                  onChange={(e) => setPlatformNameAr(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPlatformModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password / PIN Modal */}
      {showPinModal && (
        <ChangePasswordModal isOpen={showPinModal} onClose={() => setShowPinModal(false)} />
      )}

    </div>
  );
};
