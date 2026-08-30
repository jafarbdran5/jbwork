import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Layers, 
  Users, 
  ShieldCheck, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  Eye, 
  EyeOff, 
  Sparkles, 
  FolderPlus, 
  ArrowUp, 
  ArrowDown, 
  Layout, 
  KeyRound, 
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { 
  CustomSectionConfig, 
  CustomTabConfig, 
  CustomRoleDef,
  SupervisorUiConfig,
  ALL_SYSTEM_PERMISSIONS
} from '../../lib/customizationTypes';
import { 
  getSavedSections, 
  saveSectionConfig, 
  deleteSectionConfig,
  getSavedTabs, 
  saveTabConfig, 
  deleteTabConfig,
  getSavedRoles, 
  saveCustomRole, 
  deleteCustomRole,
  getSupervisorUiConfig, 
  saveSupervisorUiConfig,
  resetCustomizationToDefault,
  checkItemDependencies,
  DependencyCheckResult
} from '../../lib/customizationStore';
import { getLocalUsers } from '../../lib/offlineStore';
import { UserProfile } from '../../types';
import { useAuth } from '../../lib/auth';
import { DependencyDeleteModal } from '../common/DependencyDeleteModal';
import { AppLabelsManagerModule } from './AppLabelsManagerModule';
import { Tag } from 'lucide-react';

export const AppCustomizerModule: React.FC = () => {
  const { userProfile } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<'sections' | 'labels' | 'roles' | 'supervisor_ui' | 'reset'>('sections');

  const [sections, setSections] = useState<CustomSectionConfig[]>([]);
  const [tabs, setTabs] = useState<CustomTabConfig[]>([]);
  const [roles, setRoles] = useState<CustomRoleDef[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  // Selected Supervisor for UI Customizer
  const [selectedUserUid, setSelectedUserUid] = useState<string>('');
  const [supervisorUi, setSupervisorUi] = useState<SupervisorUiConfig>({
    uid: '',
    visibleTabIds: [],
    defaultHomeView: 'dashboard',
    isCustomized: false
  });

  // Section Modal
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Partial<CustomSectionConfig> | null>(null);

  // Tab Modal
  const [isTabModalOpen, setIsTabModalOpen] = useState(false);
  const [editingTab, setEditingTab] = useState<Partial<CustomTabConfig> | null>(null);

  // Role Modal
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Partial<CustomRoleDef> | null>(null);

  // Deletion Modal
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'section' | 'tab' | 'role'; item: any } | null>(null);
  const [dependencyInfo, setDependencyInfo] = useState<DependencyCheckResult | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadAll = () => {
    setSections(getSavedSections().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
    setTabs(getSavedTabs().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
    setRoles(getSavedRoles());
    const allUsers = getLocalUsers().filter(u => u.status !== 'deleted');
    setUsers(allUsers);

    if (allUsers.length > 0 && !selectedUserUid) {
      setSelectedUserUid(allUsers[0].uid);
    }
  };

  useEffect(() => {
    loadAll();
    const handleCustomizationChange = () => loadAll();
    window.addEventListener('jb_customization_changed', handleCustomizationChange);
    return () => window.removeEventListener('jb_customization_changed', handleCustomizationChange);
  }, []);

  // Update supervisor UI state when selected user changes
  useEffect(() => {
    if (selectedUserUid) {
      const existing = getSupervisorUiConfig(selectedUserUid);
      if (existing) {
        setSupervisorUi(existing);
      } else {
        const allTabIds = tabs.map(t => t.id);
        setSupervisorUi({
          uid: selectedUserUid,
          visibleTabIds: allTabIds,
          defaultHomeView: 'dashboard',
          isCustomized: false
        });
      }
    }
  }, [selectedUserUid, tabs]);

  // Section Handlers
  const handleOpenSectionModal = (sec?: CustomSectionConfig) => {
    if (sec) {
      setEditingSection({ ...sec });
    } else {
      setEditingSection({
        titleAr: '',
        titleEn: '',
        sortOrder: sections.length + 1,
        isHidden: false,
        requiredPermissions: []
      });
    }
    setIsSectionModalOpen(true);
  };

  const handleSaveSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection || !editingSection.titleAr) return;
    saveSectionConfig(editingSection as CustomSectionConfig, userProfile);
    setIsSectionModalOpen(false);
    setEditingSection(null);
    loadAll();
    showToast('تم حفظ إعدادات القسم بنجاح');
  };

  // Tab Handlers
  const handleOpenTabModal = (tab?: CustomTabConfig) => {
    if (tab) {
      setEditingTab({ ...tab });
    } else {
      setEditingTab({
        sectionId: sections[0]?.id || 'sec_cases_work',
        labelAr: '',
        labelEn: '',
        iconName: 'Layers',
        targetView: 'cases',
        sortOrder: tabs.length + 1,
        showOnHome: true,
        isHidden: false,
        requiredPermissions: []
      });
    }
    setIsTabModalOpen(true);
  };

  const handleSaveTab = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTab || !editingTab.labelAr || !editingTab.targetView) return;
    saveTabConfig(editingTab as CustomTabConfig, userProfile);
    setIsTabModalOpen(false);
    setEditingTab(null);
    loadAll();
    showToast('تم حفظ علامة التبويب بنجاح');
  };

  // Role Handlers
  const handleOpenRoleModal = (role?: CustomRoleDef) => {
    if (role) {
      setEditingRole({ ...role });
    } else {
      setEditingRole({
        nameAr: '',
        nameEn: '',
        descriptionAr: '',
        permissions: ['cases_view', 'tasks_view', 'manual_view', 'ai_assistant_use'],
        color: 'cyan'
      });
    }
    setIsRoleModalOpen(true);
  };

  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole || !editingRole.nameAr) return;
    saveCustomRole(editingRole as CustomRoleDef, userProfile);
    setIsRoleModalOpen(false);
    setEditingRole(null);
    loadAll();
    showToast('تم حفظ الدور الإداري ومصفوفة الصلاحيات');
  };

  // Delete Prompt
  const handleDeletePrompt = (type: 'section' | 'tab' | 'role', item: any) => {
    const deps = checkItemDependencies(type, item.id);
    setDependencyInfo(deps);
    setDeleteTarget({ type, item });
  };

  const handleConfirmDelete = (cascade: boolean) => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'section') {
      deleteSectionConfig(deleteTarget.item.id, cascade, userProfile);
    } else if (deleteTarget.type === 'tab') {
      deleteTabConfig(deleteTarget.item.id, userProfile);
    } else if (deleteTarget.type === 'role') {
      deleteCustomRole(deleteTarget.item.id, userProfile);
    }

    setDeleteTarget(null);
    setDependencyInfo(null);
    loadAll();
    showToast('تم الحذف بنجاح');
  };

  // Supervisor UI Save
  const handleSaveSupervisorUi = () => {
    if (!selectedUserUid) return;
    saveSupervisorUiConfig({
      ...supervisorUi,
      uid: selectedUserUid,
      isCustomized: true
    }, userProfile);
    showToast('تم حفظ تخصيص واجهة المشرف وتطبيق التغييرات فوراً');
  };

  const toggleTabForSupervisor = (tabId: string) => {
    const currentList = supervisorUi.visibleTabIds || [];
    let updated: string[];
    if (currentList.includes(tabId)) {
      updated = currentList.filter(id => id !== tabId);
    } else {
      updated = [...currentList, tabId];
    }
    setSupervisorUi({ ...supervisorUi, visibleTabIds: updated, isCustomized: true });
  };

  return (
    <div id="module-app-customizer" className="space-y-6 animate-in fade-in duration-300 pb-12" dir="rtl">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 p-4 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4" /> {toastMessage}
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-xs">
                <Settings className="w-6 h-6" />
              </div>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                مركز تخصيص وإدارة بنية التطبيق
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold font-mono">
                Super Admin Master
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-400 max-w-3xl leading-relaxed">
              تحكم كامل في أقسام المنظومة، علامات التبويب، الأدوار المخصصة، مصفوفات الصلاحيات الدقيقة، وتخصيص واجهة كل مشرف دون الحاجة لتعديل الكود.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800">
        <button
          onClick={() => setActiveSubTab('sections')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeSubTab === 'sections'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" /> الأقسام وعلامات التبويب ({sections.length} / {tabs.length})
        </button>

        <button
          onClick={() => setActiveSubTab('labels')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeSubTab === 'labels'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'text-amber-400 hover:text-white hover:bg-amber-500/10'
          }`}
        >
          <Tag className="w-4 h-4" /> مدير أسماء وتسميات التطبيق (إعادة التسمية)
        </button>

        <button
          onClick={() => setActiveSubTab('roles')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeSubTab === 'roles'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> الأدوار والصلاحيات المخصصة ({roles.length})
        </button>

        <button
          onClick={() => setActiveSubTab('supervisor_ui')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeSubTab === 'supervisor_ui'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" /> تخصيص واجهات المشرفين ({users.length})
        </button>

        <button
          onClick={() => setActiveSubTab('reset')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 mr-auto ${
            activeSubTab === 'reset'
              ? 'bg-rose-600 text-white shadow-md'
              : 'text-rose-400 hover:bg-rose-950/40'
          }`}
        >
          <RotateCcw className="w-4 h-4" /> استعادة الضبط الافتراضي
        </button>
      </div>

      {/* ================= TAB 1: SECTIONS & TABS ================= */}
      {activeSubTab === 'sections' && (
        <div className="space-y-6">
          {/* Action Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" /> هيكل الأقسام والتبويبات الحالية:
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenSectionModal()}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-bold border border-indigo-500/20 transition-all flex items-center gap-1.5"
              >
                <FolderPlus className="w-4 h-4" /> + إضافة قسم رئيسي جديد
              </button>
              <button
                onClick={() => handleOpenTabModal()}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-900/30 transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> + إنشاء علامة تبويب جديدة
              </button>
            </div>
          </div>

          {/* Sections Accordion / Hierarchy Cards */}
          <div className="space-y-4">
            {sections.map((sec, secIdx) => {
              const secTabs = tabs.filter(t => t.sectionId === sec.id);

              return (
                <div 
                  key={sec.id}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg"
                >
                  {/* Section Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold flex items-center justify-center font-mono">
                        {secIdx + 1}
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          {sec.titleAr}
                          {sec.isHidden && (
                            <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 text-[10px]">
                              مخفي
                            </span>
                          )}
                          {sec.isCustom && (
                            <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 text-[10px]">
                              مخصص
                            </span>
                          )}
                        </h3>
                        <p className="text-[11px] text-slate-500 font-mono">{sec.titleEn || sec.id}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleOpenSectionModal(sec)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition-colors flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> تعديل القسم
                      </button>
                      <button
                        onClick={() => handleDeletePrompt('section', sec)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
                        title="حذف القسم"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Tabs List inside this Section */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-400">علامات التبويب في هذا القسم ({secTabs.length}):</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {secTabs.map(tab => (
                        <div
                          key={tab.id}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                            tab.isHidden
                              ? 'bg-slate-950/40 border-slate-800/80 opacity-60'
                              : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <span className="p-2 rounded-lg bg-slate-800 text-indigo-400">
                              <Layout className="w-3.5 h-3.5" />
                            </span>
                            <div className="text-xs truncate">
                              <p className="font-bold text-slate-200 truncate">{tab.labelAr}</p>
                              <p className="text-[10px] text-slate-500 font-mono truncate">target: {tab.targetView}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {tab.badge && (
                              <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-cyan-300 font-mono text-[9px]">
                                {tab.badge}
                              </span>
                            )}
                            <button
                              onClick={() => handleOpenTabModal(tab)}
                              className="p-1 text-slate-400 hover:text-white"
                              title="تعديل"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeletePrompt('tab', tab)}
                              className="p-1 text-slate-400 hover:text-rose-400"
                              title="حذف"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {secTabs.length === 0 && (
                        <div className="col-span-full p-4 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                          لا توجد علامات تبويب في هذا القسم بعد. اضغط "+ إنشاء علامة تبويب" لإضافة عنصر.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB: APP LABELS & NAMES MANAGER ================= */}
      {activeSubTab === 'labels' && (
        <div className="space-y-6">
          <AppLabelsManagerModule />
        </div>
      )}

      {/* ================= TAB 2: ROLES & PERMISSIONS MATRIX ================= */}
      {activeSubTab === 'roles' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" /> مصفوفة الأدوار والصلاحيات المخصصة:
            </h2>
            <button
              onClick={() => handleOpenRoleModal()}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-900/30 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> + إنشاء دور مخصص جديد
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map(role => {
              const isSuper = role.id === 'super_admin';

              return (
                <div
                  key={role.id}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          <KeyRound className="w-4 h-4" />
                        </span>
                        <div>
                          <h3 className="text-sm font-bold text-white">{role.nameAr}</h3>
                          <p className="text-[10px] text-slate-500 font-mono">{role.id}</p>
                        </div>
                      </div>

                      {!isSuper && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenRoleModal(role)}
                            className="p-1 text-slate-400 hover:text-white"
                            title="تعديل الدور"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePrompt('role', role)}
                            className="p-1 text-slate-400 hover:text-rose-400"
                            title="حذف الدور"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed min-h-[36px]">
                      {role.descriptionAr || 'لا يوجد وصف مدخل.'}
                    </p>

                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">إجمالي الصلاحيات:</span>
                        <span className="font-bold text-cyan-300 font-mono">
                          {isSuper ? 'كامل الصلاحيات (100%)' : `${role.permissions.length} من ${ALL_SYSTEM_PERMISSIONS.length}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenRoleModal(role)}
                    className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors text-center"
                  >
                    استعراض وتعديل الصلاحيات
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 3: SUPERVISOR UI CUSTOMIZER ================= */}
      {activeSubTab === 'supervisor_ui' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" /> تخصيص واجهة مشرف محدد:
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  اختر المشرف لتحديد علامات التبويب الظاهرة له، صفحته الرئيسية، وحجب الأقسام غير الضرورية.
                </p>
              </div>

              {/* User Selector */}
              <select
                value={selectedUserUid}
                onChange={e => setSelectedUserUid(e.target.value)}
                className="px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
              >
                {users.map(u => (
                  <option key={u.uid} value={u.uid}>
                    {u.displayName || u.email} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Supervisor Customization Options */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-300">حدد علامات التبويب المتاحة لهذا المشرف:</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSupervisorUi({ ...supervisorUi, visibleTabIds: tabs.map(t => t.id), isCustomized: true })}
                    className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                  >
                    تحديد الكل
                  </button>
                  <button
                    type="button"
                    onClick={() => setSupervisorUi({ ...supervisorUi, visibleTabIds: [], isCustomized: true })}
                    className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                  >
                    إلغاء الكل
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {tabs.map(tab => {
                  const isChecked = (supervisorUi.visibleTabIds || []).includes(tab.id);

                  return (
                    <label
                      key={tab.id}
                      onClick={() => toggleTabForSupervisor(tab.id)}
                      className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between gap-2 transition-all ${
                        isChecked
                          ? 'bg-indigo-950/40 border-indigo-500/50 text-white'
                          : 'bg-slate-950/40 border-slate-800 text-slate-500 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded-sm accent-indigo-500"
                        />
                        <span className="text-xs font-bold">{tab.labelAr}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">{tab.targetView}</span>
                    </label>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  سيتم حفظ التفضيلات وتطبيقها تلقائياً عند تسجيل دخول هذا المشرف.
                </p>
                <button
                  type="button"
                  onClick={handleSaveSupervisorUi}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-900/30 transition-all flex items-center gap-2"
                >
                  <Check className="w-4 h-4" /> حفظ تخصيص الواجهة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: RESET TO FACTORY ================= */}
      {activeSubTab === 'reset' && (
        <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-4 max-w-xl">
          <div className="flex items-center gap-3 text-rose-400">
            <AlertTriangle className="w-6 h-6" />
            <h3 className="text-base font-bold">استعادة ضبط المصنع لبنية النظام</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            سيتم إعادة تعيين جميع الأقسام، علامات التبويب، الأدوار، وتخصيصات المشرفين إلى الحالة الافتراضية الأصلية للمنظومة دون المساس ببيانات القضايا أو الموكلين.
          </p>
          <button
            onClick={() => {
              if (window.confirm('هل أنت متأكد من رغبتك في استعادة الضبط الافتراضي للبنية؟')) {
                resetCustomizationToDefault();
                loadAll();
                showToast('تمت استعادة الضبط الافتراضي بنجاح');
              }
            }}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all"
          >
            تأكيد استعادة ضبط المصنع
          </button>
        </div>
      )}

      {/* Section Create/Edit Modal */}
      {isSectionModalOpen && editingSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                {editingSection.id ? 'تعديل القسم' : 'إضافة قسم جديد'}
              </h3>
              <button onClick={() => setIsSectionModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSaveSection} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">اسم القسم بالعربية:</label>
                <input
                  type="text"
                  required
                  value={editingSection.titleAr || ''}
                  onChange={e => setEditingSection({ ...editingSection, titleAr: e.target.value })}
                  placeholder="مثال: إدارة القضايا الخاصة"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-bold mb-1">Section Title (English):</label>
                <input
                  type="text"
                  value={editingSection.titleEn || ''}
                  onChange={e => setEditingSection({ ...editingSection, titleEn: e.target.value })}
                  placeholder="e.g. Special Cases"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-bold mb-1">الترتيب:</label>
                <input
                  type="number"
                  value={editingSection.sortOrder || 1}
                  onChange={e => setEditingSection({ ...editingSection, sortOrder: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  checked={editingSection.isHidden || false}
                  onChange={e => setEditingSection({ ...editingSection, isHidden: e.target.checked })}
                  className="rounded-sm accent-rose-500"
                />
                <span className="text-slate-300">إخفاء هذا القسم مؤقتاً</span>
              </div>
              <div className="pt-4 border-t border-slate-800 flex justify-between">
                <button type="button" onClick={() => setIsSectionModalOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl">إلغاء</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl">حفظ القسم</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab Create/Edit Modal */}
      {isTabModalOpen && editingTab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                {editingTab.id ? 'تعديل علامة التبويب' : 'إنشاء علامة تبويب جديدة'}
              </h3>
              <button onClick={() => setIsTabModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSaveTab} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">القسم التابع له:</label>
                <select
                  value={editingTab.sectionId || sections[0]?.id}
                  onChange={e => setEditingTab({ ...editingTab, sectionId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                >
                  {sections.map(s => (
                    <option key={s.id} value={s.id}>{s.titleAr}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">اسم التبويب بالعربية:</label>
                  <input
                    type="text"
                    required
                    value={editingTab.labelAr || ''}
                    onChange={e => setEditingTab({ ...editingTab, labelAr: e.target.value })}
                    placeholder="مثال: القضايا المستعجلة"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Target View (معرف الواجهة):</label>
                  <input
                    type="text"
                    required
                    value={editingTab.targetView || ''}
                    onChange={e => setEditingTab({ ...editingTab, targetView: e.target.value })}
                    placeholder="e.g. cases, sheets, my_day"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">شعار / شارة (Badge):</label>
                  <input
                    type="text"
                    value={editingTab.badge || ''}
                    onChange={e => setEditingTab({ ...editingTab, badge: e.target.value })}
                    placeholder="مثال: NEW, VIP, OFFLINE"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">الترتيب:</label>
                  <input
                    type="number"
                    value={editingTab.sortOrder || 1}
                    onChange={e => setEditingTab({ ...editingTab, sortOrder: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={editingTab.showOnHome !== false}
                    onChange={e => setEditingTab({ ...editingTab, showOnHome: e.target.checked })}
                    className="rounded-sm accent-indigo-500"
                  />
                  <span>إظهار في بطاقات الصفحة الرئيسية</span>
                </label>
              </div>
              <div className="pt-4 border-t border-slate-800 flex justify-between">
                <button type="button" onClick={() => setIsTabModalOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl">إلغاء</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl">حفظ التبويب</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Create/Edit Modal with Granular Permissions */}
      {isRoleModalOpen && editingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                {editingRole.id ? `تعديل دور: ${editingRole.nameAr}` : 'إنشاء دور إداري جديد'}
              </h3>
              <button onClick={() => setIsRoleModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveRole} className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">اسم الدور بالعربية:</label>
                  <input
                    type="text"
                    required
                    value={editingRole.nameAr || ''}
                    onChange={e => setEditingRole({ ...editingRole, nameAr: e.target.value })}
                    placeholder="مثال: مشرف قضايا ودعم"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">الوصف الإداري:</label>
                  <input
                    type="text"
                    value={editingRole.descriptionAr || ''}
                    onChange={e => setEditingRole({ ...editingRole, descriptionAr: e.target.value })}
                    placeholder="مثال: مسؤول عن متابعة القضايا وبوابات الدعم"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              {/* Permissions Checklist */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-200 font-bold">
                    مصفوفة الصلاحيات الممنوحة لهذا الدور ({editingRole.permissions?.length || 0}):
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingRole({ ...editingRole, permissions: ALL_SYSTEM_PERMISSIONS.map(p => p.key) })}
                      className="px-2 py-0.5 text-[10px] bg-slate-800 text-cyan-300 rounded-md"
                    >
                      تحديد كل الصلاحيات
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingRole({ ...editingRole, permissions: [] })}
                      className="px-2 py-0.5 text-[10px] bg-slate-800 text-slate-400 rounded-md"
                    >
                      إلغاء الكل
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-72 overflow-y-auto custom-scrollbar p-1">
                  {ALL_SYSTEM_PERMISSIONS.map(perm => {
                    const isChecked = (editingRole.permissions || []).includes(perm.key);

                    return (
                      <label
                        key={perm.key}
                        onClick={() => {
                          const list = editingRole.permissions || [];
                          const updated = isChecked ? list.filter(k => k !== perm.key) : [...list, perm.key];
                          setEditingRole({ ...editingRole, permissions: updated });
                        }}
                        className={`p-2.5 rounded-xl border cursor-pointer flex items-start gap-2.5 transition-all ${
                          isChecked
                            ? 'bg-cyan-950/40 border-cyan-500/50 text-white'
                            : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800/40'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-0.5 rounded-sm accent-cyan-500"
                        />
                        <div className="space-y-0.5">
                          <p className="font-bold text-xs text-slate-200">{perm.labelAr}</p>
                          <p className="text-[10px] text-slate-400 leading-normal">{perm.descriptionAr}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-between">
                <button type="button" onClick={() => setIsRoleModalOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl">إلغاء</button>
                <button type="submit" className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl">حفظ الدور والصلاحيات</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deletion Dependency Modal */}
      {deleteTarget && dependencyInfo && (
        <DependencyDeleteModal
          isOpen={true}
          onClose={() => { setDeleteTarget(null); setDependencyInfo(null); }}
          onConfirm={handleConfirmDelete}
          itemTitle={deleteTarget.item.titleAr || deleteTarget.item.labelAr || deleteTarget.item.nameAr || deleteTarget.item.id}
          itemTypeLabel={deleteTarget.type === 'section' ? 'القسم' : deleteTarget.type === 'tab' ? 'علامة التبويب' : 'الدور الإداري'}
          dependencyCheck={dependencyInfo}
        />
      )}
    </div>
  );
};
