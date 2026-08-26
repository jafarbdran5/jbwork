import React, { useState, useEffect } from 'react';
import { useI18n } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, setDoc, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { CaseTypeConfig, PlatformConfig } from '../../types';
import { DEFAULT_CASE_TYPES, DEFAULT_PLATFORMS } from '../../lib/constants';
import { logAuditAndEvent } from '../../lib/audit';
import { GoogleWorkspaceSettings } from './GoogleWorkspaceSettings';
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
  Share2,
  FileSpreadsheet
} from 'lucide-react';

export const SettingsModule: React.FC = () => {
  const { t, isRTL, language, setLanguage } = useI18n();
  const { userProfile, isSuperAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'google' | 'types' | 'platforms' | 'offline' | 'about'>('google');
  const [caseTypes, setCaseTypes] = useState<CaseTypeConfig[]>(DEFAULT_CASE_TYPES);
  const [platforms, setPlatforms] = useState<PlatformConfig[]>(DEFAULT_PLATFORMS);

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

  useEffect(() => {
    const unsubTypes = onSnapshot(collection(db, 'caseTypes'), (snap) => {
      if (!snap.empty) {
        setCaseTypes(snap.docs.map(d => ({ id: d.id, ...d.data() } as CaseTypeConfig)));
      }
    });

    const unsubPlatforms = onSnapshot(collection(db, 'platforms'), (snap) => {
      if (!snap.empty) {
        setPlatforms(snap.docs.map(d => ({ id: d.id, ...d.data() } as PlatformConfig)));
      }
    });

    return () => {
      unsubTypes();
      unsubPlatforms();
    };
  }, []);

  const handleCreateType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeKey.trim() || !typeLabelAr.trim() || !userProfile || !isSuperAdmin) return;

    try {
      await setDoc(doc(db, 'caseTypes', typeKey.toLowerCase().trim()), {
        key: typeKey.toLowerCase().trim(),
        labelAr: typeLabelAr.trim(),
        labelEn: typeLabelEn.trim() || typeLabelAr.trim(),
        color: typeColor,
        isCustom: true,
        createdAt: serverTimestamp(),
      });

      await logAuditAndEvent({
        action: 'CONFIG_CHANGE',
        details: `إضافة نوع قضية جديد للنظام: ${typeLabelAr}`,
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
      await addDoc(collection(db, 'platforms'), {
        name: platformName.trim(),
        nameAr: platformNameAr.trim() || platformName.trim(),
        icon: platformIcon,
        isActive: true,
        createdAt: serverTimestamp(),
      });

      await logAuditAndEvent({
        action: 'CONFIG_CHANGE',
        details: `إضافة منصة جديدة للنظام: ${platformName}`,
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

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-cyan-400" />
          <span>{t('navSettings')}</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          {isRTL ? 'إعدادات النظام، منشئ أنواع القضايا، المنصات، والتخزين المحلي' : 'System configuration, Case Type builder, Platforms, and Storage'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('google')}
          className={`px-4 py-2 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'google' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Share2 className="w-4 h-4 text-indigo-300" />
          <span>{isRTL ? 'تكامل Google Workspace (Sheets/Forms/Drive)' : 'Google Workspace Integration'}</span>
        </button>

        <button
          onClick={() => setActiveTab('types')}
          className={`px-4 py-2 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'types' ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>{isRTL ? 'أنواع القضايا وحقولها' : 'Case Types Builder'}</span>
        </button>

        <button
          onClick={() => setActiveTab('platforms')}
          className={`px-4 py-2 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'platforms' ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>{isRTL ? 'إدارة المنصات' : 'Platforms'}</span>
        </button>

        <button
          onClick={() => setActiveTab('offline')}
          className={`px-4 py-2 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'offline' ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>{isRTL ? 'الأمان والتخزين والمزامنة' : 'Offline & Security'}</span>
        </button>

        <button
          onClick={() => setActiveTab('about')}
          className={`px-4 py-2 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'about' ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Info className="w-4 h-4" />
          <span>{isRTL ? 'عن المنظومة' : 'About JB Work'}</span>
        </button>
      </div>

      {/* Tab 0: Google Workspace Integration */}
      {activeTab === 'google' && (
        <GoogleWorkspaceSettings />
      )}

      {/* Tab 1: Case Types Builder */}
      {activeTab === 'types' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">
              {isRTL ? 'أنواع القضايا المعرفة بالنظام' : 'Configured Case Types'}
            </h3>
            {isSuperAdmin && (
              <button
                onClick={() => setShowTypeModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isRTL ? 'إضافة نوع قضية' : 'Add Case Type'}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {caseTypes.map((tItem) => (
              <div key={tItem.key} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                    {tItem.key}
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                </div>
                <h4 className="text-sm font-bold text-white">{isRTL ? tItem.labelAr : tItem.labelEn}</h4>
                <p className="text-xs text-slate-400 font-mono">{tItem.labelEn}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Platforms Manager */}
      {activeTab === 'platforms' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">
              {isRTL ? 'المنصات الرقمية المعتمدة' : 'Supported Digital Platforms'}
            </h3>
            {isSuperAdmin && (
              <button
                onClick={() => setShowPlatformModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isRTL ? 'إضافة منصة' : 'Add Platform'}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {platforms.map((p) => (
              <div key={p.name} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-cyan-400">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{isRTL ? p.nameAr : p.name}</h4>
                  <p className="text-[10px] text-slate-400 font-mono">{p.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Offline & Cache */}
      {activeTab === 'offline' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 max-w-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{isRTL ? 'الأمان والتخزين في وضع عدم الاتصال' : 'Security & Offline Trust'}</span>
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            {isRTL 
              ? 'تعتمد منظومة JB Work على تقنية IndexedDB المشفرة محلياً لحفظ المستندات والملفات المرفقة حتى في حال انقطاع شبكة الإنترنت، وتتم مزامنتها تلقائياً فور عودة الاتصال بقواعد بيانات Firestore.'
              : 'JB Work utilizes local encrypted IndexedDB storage for offline attachments & records with automatic Firestore synchronization upon reconnection.'}
          </p>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">{isRTL ? 'حالة التخزين المحلي:' : 'Local Storage Engine:'}</span>
              <span className="font-mono text-emerald-400 font-bold">IndexedDB (Active)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">{isRTL ? 'مستوى التشفير والخصوصية:' : 'Privacy Level:'}</span>
              <span className="font-mono text-cyan-400 font-bold">Private Internal RBAC</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: About JB Work */}
      {activeTab === 'about' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 max-w-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-950 border border-cyan-800 flex items-center justify-center font-black text-cyan-400 text-lg font-mono">
              JB
            </div>
            <div>
              <h2 className="text-base font-bold text-white">JB Work — نظام عمل جعفر بدران الداخلي</h2>
              <p className="text-xs text-slate-400 font-mono">Jaafar Bdran Internal Work System v1.0.0 Pro</p>
            </div>
          </div>

          <div className="text-xs text-slate-300 space-y-2 leading-relaxed border-t border-slate-800 pt-3">
            <p>
              {isRTL 
                ? 'هذا النظام هو منظومة تشغيلية داخلية خاصة ومحمية مخصصة لإدارة قضايا الأمن السيبراني ومكافحة الجرائم الرقمية وحذف المحتوى والتحقيقات الرقمية تحت إشراف جعفر بدران وفريقه المصرح لهم.'
                : 'This is a private internal enterprise suite created exclusively for Jaafar Bdran and his authorized team to manage cybersecurity investigations, content takedowns, extortion, and operational workflows.'}
            </p>
            <p className="text-slate-500 font-mono text-[11px]">
              Owner: Jaafar Bdran (jfrbdran@gmail.com) • All Rights Reserved © 2026
            </p>
          </div>
        </div>
      )}

      {/* Add Case Type Modal */}
      {showTypeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
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
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Platform Modal */}
      {showPlatformModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
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
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
