import { 
  CustomSectionConfig, 
  CustomTabConfig, 
  CustomRoleDef, 
  SupervisorUiConfig,
  DEFAULT_SYSTEM_ROLES,
  ALL_SYSTEM_PERMISSIONS
} from './customizationTypes';
import { UserProfile } from '../types';
import { logAuditAndEvent } from './audit';
import { getLocalCases, getLocalUsers } from './offlineStore';
import { getSavedPublicSheets } from './googleSheetsReader';
import { getSavedSupportPortals } from './supportPortalsStore';

const SECTIONS_STORAGE_KEY = 'jb_dynamic_sections_config';
const TABS_STORAGE_KEY = 'jb_dynamic_tabs_config';
const ROLES_STORAGE_KEY = 'jb_custom_roles_config';
const SUPERVISOR_UI_KEY = 'jb_supervisor_ui_profiles';

export const INITIAL_DEFAULT_SECTIONS: CustomSectionConfig[] = [
  {
    id: 'sec_life_os',
    titleAr: 'إدارة الحياة واليوم (Life OS)',
    titleEn: 'Life & Personal OS',
    sortOrder: 1,
    requiredPermissions: []
  },
  {
    id: 'sec_cases_work',
    titleAr: 'إدارة القضايا والعمل (Legal Cases)',
    titleEn: 'Legal Cases & Work',
    sortOrder: 2,
    requiredPermissions: ['cases_view']
  },
  {
    id: 'sec_vault_tools',
    titleAr: 'المعرفة والمستندات (Vault & Tools)',
    titleEn: 'Vault & Tools',
    sortOrder: 3,
    requiredPermissions: []
  },
  {
    id: 'sec_system_backup',
    titleAr: 'النظام والأمان (System & Backup)',
    titleEn: 'System & Backup',
    sortOrder: 4,
    requiredPermissions: []
  }
];

export const INITIAL_DEFAULT_TABS: CustomTabConfig[] = [
  // Life OS Section
  {
    id: 'life_os',
    sectionId: 'sec_life_os',
    labelAr: 'نظام الحياة والروتين',
    labelEn: 'Life & Habits OS',
    iconName: 'Sparkles',
    targetView: 'life_os',
    sortOrder: 1,
    showOnHome: true,
    badge: 'OFFLINE'
  },
  {
    id: 'my_day',
    sectionId: 'sec_life_os',
    labelAr: 'خطة اليوم والتركيز',
    labelEn: 'My Day & Focus',
    iconName: 'CalendarCheck',
    targetView: 'my_day',
    sortOrder: 2,
    showOnHome: true,
    badge: 'DAY'
  },
  {
    id: 'personal_area',
    sectionId: 'sec_life_os',
    labelAr: 'المفكرة والأفكار الخاصة',
    labelEn: 'Personal Vault & Ideas',
    iconName: 'Lock',
    targetView: 'personal_area',
    sortOrder: 3,
    badge: 'VIP',
    allowedRoles: ['super_admin']
  },
  {
    id: 'my_finances',
    sectionId: 'sec_life_os',
    labelAr: 'ماليتي والميزانية',
    labelEn: 'My Finances & Cashflow',
    iconName: 'Wallet',
    targetView: 'my_finances',
    sortOrder: 4,
    badge: 'VIP',
    allowedRoles: ['super_admin']
  },

  // Cases Section
  {
    id: 'dashboard',
    sectionId: 'sec_cases_work',
    labelAr: 'لوحة المتابعة الشاملة',
    labelEn: 'Work Dashboard',
    iconName: 'LayoutDashboard',
    targetView: 'dashboard',
    sortOrder: 5,
    showOnHome: true,
    requiredPermissions: ['cases_view']
  },
  {
    id: 'cases',
    sectionId: 'sec_cases_work',
    labelAr: 'جميع القضايا',
    labelEn: 'All Cases',
    iconName: 'Layers',
    targetView: 'cases',
    sortOrder: 6,
    showOnHome: true,
    requiredPermissions: ['cases_view']
  },
  {
    id: 'my_cases',
    sectionId: 'sec_cases_work',
    labelAr: 'قضاياي المباشرة',
    labelEn: 'My Active Cases',
    iconName: 'UserCheck',
    targetView: 'my_cases',
    sortOrder: 7,
    requiredPermissions: ['cases_view']
  },
  {
    id: 'external_requests',
    sectionId: 'sec_cases_work',
    labelAr: 'الطلبات الخارجية واستجابات الشيت',
    labelEn: 'External Requests & Sheets',
    iconName: 'Inbox',
    targetView: 'external_requests',
    sortOrder: 8,
    badge: 'SHEETS',
    requiredPermissions: ['requests_view']
  },
  {
    id: 'clients',
    sectionId: 'sec_cases_work',
    labelAr: 'دليل الموكلين',
    labelEn: 'Clients Directory',
    iconName: 'Users',
    targetView: 'clients',
    sortOrder: 9,
    requiredPermissions: ['clients_view']
  },
  {
    id: 'tasks',
    sectionId: 'sec_cases_work',
    labelAr: 'المهام والمتابعات',
    labelEn: 'Tasks & Todos',
    iconName: 'CheckSquare',
    targetView: 'tasks',
    sortOrder: 10,
    showOnHome: true,
    requiredPermissions: ['tasks_view']
  },
  {
    id: 'reminders',
    sectionId: 'sec_cases_work',
    labelAr: 'التذكيرات والجلسات',
    labelEn: 'Reminders & Hearings',
    iconName: 'Bell',
    targetView: 'reminders',
    sortOrder: 11,
    requiredPermissions: ['tasks_view']
  },
  {
    id: 'payments',
    sectionId: 'sec_cases_work',
    labelAr: 'أتعاب ومدفوعات القضايا',
    labelEn: 'Case Payments & Fees',
    iconName: 'DollarSign',
    targetView: 'payments',
    sortOrder: 12,
    requiredPermissions: ['finance_view']
  },
  {
    id: 'profits',
    sectionId: 'sec_cases_work',
    labelAr: 'أرباح الأعمال والمنظومة',
    labelEn: 'Profits & Revenue',
    iconName: 'TrendingUp',
    targetView: 'profits',
    sortOrder: 13,
    requiredPermissions: ['finance_manage'],
    allowedRoles: ['super_admin']
  },

  // Vault & Tools
  {
    id: 'sheets',
    sectionId: 'sec_vault_tools',
    labelAr: 'قارئ Google Sheets والفورمز',
    labelEn: 'Google Sheets Hub',
    iconName: 'FileSpreadsheet',
    targetView: 'sheets',
    sortOrder: 14,
    badge: 'ZERO-AUTH',
    requiredPermissions: ['sheets_view']
  },
  {
    id: 'support_portals',
    sectionId: 'sec_vault_tools',
    labelAr: 'بوابات دعم الشركات والمنصات',
    labelEn: 'Official Support Portals',
    iconName: 'Globe',
    targetView: 'support_portals',
    sortOrder: 15,
    badge: 'OFFICIAL',
    showOnHome: true,
    requiredPermissions: ['support_portals_view']
  },
  {
    id: 'projects',
    sectionId: 'sec_vault_tools',
    labelAr: 'المشاريع والمبادرات',
    labelEn: 'Projects & Milestones',
    iconName: 'Briefcase',
    targetView: 'projects',
    sortOrder: 16
  },
  {
    id: 'files',
    sectionId: 'sec_vault_tools',
    labelAr: 'المستندات والملفات',
    labelEn: 'Files & Documents',
    iconName: 'HardDrive',
    targetView: 'files',
    sortOrder: 17
  },
  {
    id: 'knowledge',
    sectionId: 'sec_vault_tools',
    labelAr: 'الموسوعة والمعرفة',
    labelEn: 'Knowledge Base',
    iconName: 'BookOpen',
    targetView: 'knowledge',
    sortOrder: 18
  },
  {
    id: 'content_studio',
    sectionId: 'sec_vault_tools',
    labelAr: 'استوديو صناعة المحتوى',
    labelEn: 'Content Studio',
    iconName: 'Share2',
    targetView: 'content_studio',
    sortOrder: 19
  },
  {
    id: 'forms',
    sectionId: 'sec_vault_tools',
    labelAr: 'نماذج الاستقبال',
    labelEn: 'Form Center',
    iconName: 'FileSpreadsheet',
    targetView: 'forms',
    sortOrder: 20
  },

  // System & Backup
  {
    id: 'how_it_works',
    sectionId: 'sec_system_backup',
    labelAr: 'دليل تشغيل التطبيق',
    labelEn: 'System Operation Manual',
    iconName: 'HelpCircle',
    targetView: 'how_it_works',
    sortOrder: 21,
    badge: 'GUIDE',
    showOnHome: true,
    requiredPermissions: ['manual_view']
  },
  {
    id: 'team',
    sectionId: 'sec_system_backup',
    labelAr: 'إدارة المشرفين والأدوار',
    labelEn: 'Supervisors & Roles',
    iconName: 'Users',
    targetView: 'team',
    sortOrder: 22,
    badge: 'RBAC',
    requiredPermissions: ['team_manage']
  },
  {
    id: 'app_customizer',
    sectionId: 'sec_system_backup',
    labelAr: 'تخصيص بنية التطبيق',
    labelEn: 'App Customization Center',
    iconName: 'Settings',
    targetView: 'app_customizer',
    sortOrder: 23,
    badge: 'CUSTOM',
    requiredPermissions: ['sections_manage']
  },
  {
    id: 'security',
    sectionId: 'sec_system_backup',
    labelAr: 'مركز الأمان وسجل العمليات',
    labelEn: 'Security & Audit Logs',
    iconName: 'ShieldCheck',
    targetView: 'security',
    sortOrder: 24,
    requiredPermissions: ['security_view']
  },
  {
    id: 'backup',
    sectionId: 'sec_system_backup',
    labelAr: 'النسخ الاحتياطي والاستعادة',
    labelEn: 'Offline Backup (JSON)',
    iconName: 'Database',
    targetView: 'backup',
    sortOrder: 25,
    badge: 'JSON',
    requiredPermissions: ['settings_manage']
  },
  {
    id: 'reports',
    sectionId: 'sec_system_backup',
    labelAr: 'التقارير والإحصائيات',
    labelEn: 'Reports & Analytics',
    iconName: 'BarChart3',
    targetView: 'reports',
    sortOrder: 26,
    requiredPermissions: ['finance_view']
  },
  {
    id: 'trash',
    sectionId: 'sec_system_backup',
    labelAr: 'سلة المهملات',
    labelEn: 'Trash & Recycle Bin',
    iconName: 'Trash2',
    targetView: 'trash',
    sortOrder: 27
  },
  {
    id: 'settings',
    sectionId: 'sec_system_backup',
    labelAr: 'إعدادات المظهر والنظام',
    labelEn: 'Settings & Themes',
    iconName: 'Settings',
    targetView: 'settings',
    sortOrder: 28,
    requiredPermissions: ['settings_manage']
  }
];

// =================== SECTIONS API ===================
export function getSavedSections(): CustomSectionConfig[] {
  if (typeof window === 'undefined') return INITIAL_DEFAULT_SECTIONS;
  try {
    const raw = localStorage.getItem(SECTIONS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(SECTIONS_STORAGE_KEY, JSON.stringify(INITIAL_DEFAULT_SECTIONS));
      return INITIAL_DEFAULT_SECTIONS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch (e) {
    console.warn('Error reading sections:', e);
  }
  return INITIAL_DEFAULT_SECTIONS;
}

export function saveSectionConfig(
  section: CustomSectionConfig,
  userProfile?: UserProfile | null
): CustomSectionConfig[] {
  const current = getSavedSections();
  const existingIdx = current.findIndex(s => s.id === section.id);
  let updated: CustomSectionConfig[];

  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = section;
  } else {
    const newSec: CustomSectionConfig = {
      ...section,
      id: section.id || `sec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sortOrder: section.sortOrder || current.length + 1,
      isCustom: true
    };
    updated = [...current, newSec];
  }

  localStorage.setItem(SECTIONS_STORAGE_KEY, JSON.stringify(updated));

  logAuditAndEvent({
    action: existingIdx >= 0 ? 'UPDATE_SECTION' : 'CREATE_SECTION',
    details: `${existingIdx >= 0 ? 'تعديل' : 'إضافة'} قسم: (${section.titleAr})`,
    entityType: 'section',
    entityId: section.id,
    entityTitle: section.titleAr,
    user: userProfile || undefined
  });

  window.dispatchEvent(new CustomEvent('jb_customization_changed', { detail: { type: 'sections' } }));
  return updated;
}

export function deleteSectionConfig(
  sectionId: string,
  cascadeDeleteTabs: boolean = false,
  userProfile?: UserProfile | null
): CustomSectionConfig[] {
  const currentSections = getSavedSections();
  const target = currentSections.find(s => s.id === sectionId);
  const updatedSections = currentSections.filter(s => s.id !== sectionId);

  localStorage.setItem(SECTIONS_STORAGE_KEY, JSON.stringify(updatedSections));

  if (cascadeDeleteTabs) {
    const currentTabs = getSavedTabs();
    const filteredTabs = currentTabs.filter(t => t.sectionId !== sectionId);
    localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(filteredTabs));
  } else {
    // Reassign orphaned tabs to first section
    const fallbackSec = updatedSections[0]?.id || 'sec_vault_tools';
    const currentTabs = getSavedTabs();
    const remappedTabs = currentTabs.map(t => t.sectionId === sectionId ? { ...t, sectionId: fallbackSec } : t);
    localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(remappedTabs));
  }

  if (target) {
    logAuditAndEvent({
      action: 'DELETE_SECTION',
      details: `حذف قسم: (${target.titleAr}) ${cascadeDeleteTabs ? 'مع التبويبات التابعة' : 'مع نقل التبويبات'}`,
      entityType: 'section',
      entityId: sectionId,
      entityTitle: target.titleAr,
      user: userProfile || undefined
    });
  }

  window.dispatchEvent(new CustomEvent('jb_customization_changed', { detail: { type: 'sections' } }));
  return updatedSections;
}

// =================== TABS API ===================
export function getSavedTabs(): CustomTabConfig[] {
  if (typeof window === 'undefined') return INITIAL_DEFAULT_TABS;
  try {
    const raw = localStorage.getItem(TABS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(INITIAL_DEFAULT_TABS));
      return INITIAL_DEFAULT_TABS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch (e) {
    console.warn('Error reading tabs:', e);
  }
  return INITIAL_DEFAULT_TABS;
}

export function saveTabConfig(
  tab: CustomTabConfig,
  userProfile?: UserProfile | null
): CustomTabConfig[] {
  const current = getSavedTabs();
  const existingIdx = current.findIndex(t => t.id === tab.id);
  let updated: CustomTabConfig[];

  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = tab;
  } else {
    const newTab: CustomTabConfig = {
      ...tab,
      id: tab.id || `tab_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sortOrder: tab.sortOrder || current.length + 1,
      isCustom: true
    };
    updated = [...current, newTab];
  }

  localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(updated));

  logAuditAndEvent({
    action: existingIdx >= 0 ? 'UPDATE_TAB' : 'CREATE_TAB',
    details: `${existingIdx >= 0 ? 'تعديل' : 'إضافة'} علامة تبويب: (${tab.labelAr})`,
    entityType: 'tab',
    entityId: tab.id,
    entityTitle: tab.labelAr,
    user: userProfile || undefined
  });

  window.dispatchEvent(new CustomEvent('jb_customization_changed', { detail: { type: 'tabs' } }));
  return updated;
}

export function deleteTabConfig(
  tabId: string,
  userProfile?: UserProfile | null
): CustomTabConfig[] {
  const current = getSavedTabs();
  const target = current.find(t => t.id === tabId);
  const updated = current.filter(t => t.id !== tabId);

  localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(updated));

  if (target) {
    logAuditAndEvent({
      action: 'DELETE_TAB',
      details: `حذف علامة تبويب: (${target.labelAr})`,
      entityType: 'tab',
      entityId: tabId,
      entityTitle: target.labelAr,
      user: userProfile || undefined
    });
  }

  window.dispatchEvent(new CustomEvent('jb_customization_changed', { detail: { type: 'tabs' } }));
  return updated;
}

// =================== ROLES API ===================
export function getSavedRoles(): CustomRoleDef[] {
  if (typeof window === 'undefined') return DEFAULT_SYSTEM_ROLES;
  try {
    const raw = localStorage.getItem(ROLES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(DEFAULT_SYSTEM_ROLES));
      return DEFAULT_SYSTEM_ROLES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch (e) {
    console.warn('Error reading roles:', e);
  }
  return DEFAULT_SYSTEM_ROLES;
}

export function saveCustomRole(
  role: CustomRoleDef,
  userProfile?: UserProfile | null
): CustomRoleDef[] {
  const current = getSavedRoles();
  const existingIdx = current.findIndex(r => r.id === role.id);
  const now = new Date().toISOString();
  let updated: CustomRoleDef[];

  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = { ...role, updatedAt: now };
  } else {
    const newRole: CustomRoleDef = {
      ...role,
      id: role.id || `role_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now,
      updatedAt: now
    };
    updated = [...current, newRole];
  }

  localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(updated));

  logAuditAndEvent({
    action: existingIdx >= 0 ? 'UPDATE_CUSTOM_ROLE' : 'CREATE_CUSTOM_ROLE',
    details: `${existingIdx >= 0 ? 'تعديل' : 'إنشاء'} دور إداري: (${role.nameAr}) مع ${role.permissions.length} صلاحية`,
    entityType: 'role',
    entityId: role.id,
    entityTitle: role.nameAr,
    user: userProfile || undefined
  });

  window.dispatchEvent(new CustomEvent('jb_customization_changed', { detail: { type: 'roles' } }));
  return updated;
}

export function deleteCustomRole(
  roleId: string,
  userProfile?: UserProfile | null
): CustomRoleDef[] {
  const current = getSavedRoles();
  const target = current.find(r => r.id === roleId);
  if (target?.isSystem && target.id === 'super_admin') {
    throw new Error('لا يمكن حذف دور المشرف العام الرئيسي.');
  }

  const updated = current.filter(r => r.id !== roleId);
  localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(updated));

  if (target) {
    logAuditAndEvent({
      action: 'DELETE_CUSTOM_ROLE',
      details: `حذف دور إداري: (${target.nameAr})`,
      entityType: 'role',
      entityId: roleId,
      entityTitle: target.nameAr,
      user: userProfile || undefined
    });
  }

  window.dispatchEvent(new CustomEvent('jb_customization_changed', { detail: { type: 'roles' } }));
  return updated;
}

// =================== SUPERVISOR UI CUSTOMIZATION API ===================
export function getSupervisorUiConfig(uid: string): SupervisorUiConfig | null {
  if (typeof window === 'undefined' || !uid) return null;
  try {
    const raw = localStorage.getItem(SUPERVISOR_UI_KEY);
    if (!raw) return null;
    const map: Record<string, SupervisorUiConfig> = JSON.parse(raw);
    return map[uid] || null;
  } catch (e) {
    console.warn('Error reading supervisor UI config:', e);
  }
  return null;
}

export function saveSupervisorUiConfig(
  config: SupervisorUiConfig,
  operatorUser?: UserProfile | null
): void {
  try {
    const raw = localStorage.getItem(SUPERVISOR_UI_KEY);
    const map: Record<string, SupervisorUiConfig> = raw ? JSON.parse(raw) : {};
    map[config.uid] = { ...config, updatedAt: new Date().toISOString(), isCustomized: true };
    localStorage.setItem(SUPERVISOR_UI_KEY, JSON.stringify(map));

    logAuditAndEvent({
      action: 'CUSTOMIZE_SUPERVISOR_UI',
      details: `تخصيص واجهة المشرف (معرف: ${config.uid}) - تحديد ${config.visibleTabIds?.length || 0} تبويب ظاهر`,
      entityType: 'supervisor_ui',
      entityId: config.uid,
      user: operatorUser || undefined
    });

    window.dispatchEvent(new CustomEvent('jb_customization_changed', { detail: { type: 'supervisor_ui', uid: config.uid } }));
  } catch (e) {
    console.error('Error saving supervisor UI config:', e);
  }
}

// =================== DEPENDENCY CHECKER ===================
export interface DependencyCheckResult {
  hasDependencies: boolean;
  totalCount: number;
  breakdown: {
    type: string;
    labelAr: string;
    count: number;
    sampleTitles?: string[];
  }[];
  warningMessageAr: string;
}

export function checkItemDependencies(
  itemType: 'section' | 'tab' | 'case' | 'client' | 'task' | 'sheet' | 'support_portal' | 'role',
  itemId: string
): DependencyCheckResult {
  const breakdown: DependencyCheckResult['breakdown'] = [];
  let total = 0;

  if (itemType === 'section') {
    const tabs = getSavedTabs().filter(t => t.sectionId === itemId);
    if (tabs.length > 0) {
      breakdown.push({
        type: 'tab',
        labelAr: 'علامات تبويب منتمية لهذا القسم',
        count: tabs.length,
        sampleTitles: tabs.slice(0, 3).map(t => t.labelAr)
      });
      total += tabs.length;
    }
  } else if (itemType === 'client') {
    const cases = getLocalCases().filter(c => c.client?.id === itemId || c.client?.clientId === itemId);
    if (cases.length > 0) {
      breakdown.push({
        type: 'case',
        labelAr: 'قضايا وملفات مسجلة باسم هذا الموكل',
        count: cases.length,
        sampleTitles: cases.slice(0, 3).map(c => c.title)
      });
      total += cases.length;
    }
  } else if (itemType === 'case') {
    // Check linked tasks in local storage
    try {
      const raw = localStorage.getItem(`jb_tasks_${itemId}`);
      if (raw) {
        const tasks = JSON.parse(raw);
        if (Array.isArray(tasks) && tasks.length > 0) {
          breakdown.push({
            type: 'task',
            labelAr: 'مهام ومتابعات مرتبطة بهذه القضية',
            count: tasks.length,
            sampleTitles: tasks.slice(0, 3).map((t: any) => t.title)
          });
          total += tasks.length;
        }
      }
    } catch (_) {}
  } else if (itemType === 'role') {
    const users = getLocalUsers().filter(u => u.role === (itemId as any));
    if (users.length > 0) {
      breakdown.push({
        type: 'user',
        labelAr: 'مشرفين وأعضاء فريق مسجلين بهذا الدور',
        count: users.length,
        sampleTitles: users.slice(0, 3).map(u => u.displayName)
      });
      total += users.length;
    }
  } else if (itemType === 'sheet') {
    const sheets = getSavedPublicSheets();
    const target = sheets.find(s => s.id === itemId);
    const rowCount = (target?.rows || []).length;
    if (rowCount > 0) {
      breakdown.push({
        type: 'row',
        labelAr: 'سجلات وبيانات مستوردة من ورقة العمل',
        count: rowCount
      });
      total += rowCount;
    }
  }

  const warningMessageAr = total > 0
    ? `هذا العنصر مرتبط بـ (${total}) من البيانات والملفات والمهام التابعة. ماذا تريد أن تفعل؟`
    : 'هذا العنصر غير مرتبط بأي بيانات حرجة أخرى.';

  return {
    hasDependencies: total > 0,
    totalCount: total,
    breakdown,
    warningMessageAr
  };
}

export function resetCustomizationToDefault(): void {
  localStorage.setItem(SECTIONS_STORAGE_KEY, JSON.stringify(INITIAL_DEFAULT_SECTIONS));
  localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(INITIAL_DEFAULT_TABS));
  localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(DEFAULT_SYSTEM_ROLES));
  localStorage.removeItem(SUPERVISOR_UI_KEY);
  window.dispatchEvent(new CustomEvent('jb_customization_changed', { detail: { type: 'reset' } }));
}
