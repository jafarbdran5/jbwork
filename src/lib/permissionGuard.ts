import { UserProfile } from '../types';
import { getSavedRoles, getSupervisorUiConfig, getSavedSections, getSavedTabs } from './customizationStore';
import { CustomSectionConfig, CustomTabConfig } from './customizationTypes';

export function isSuperAdmin(user?: UserProfile | null): boolean {
  if (!user) return false;
  return user.role === 'super_admin' || user.email === 'jaafarbdran@gmail.com';
}

export function getUserEffectivePermissions(user?: UserProfile | null): Set<string> {
  if (!user) return new Set();
  if (isSuperAdmin(user)) {
    // Super admin has every permission
    return new Set([
      'cases_view', 'cases_create', 'cases_edit', 'cases_delete',
      'clients_view', 'clients_create', 'clients_edit', 'clients_delete',
      'requests_view', 'requests_create', 'requests_edit', 'requests_process',
      'tasks_view', 'tasks_create', 'tasks_edit', 'tasks_delete',
      'sheets_view', 'sheets_manage', 'sheets_sync',
      'support_portals_view', 'support_portals_manage',
      'manual_view', 'manual_manage',
      'ai_assistant_use',
      'team_view', 'team_manage', 'team_customize_ui',
      'roles_manage', 'permissions_manage',
      'sections_manage', 'tabs_manage', 'pages_manage',
      'finance_view', 'finance_manage',
      'security_view', 'audit_logs_view', 'audit_logs_manage',
      'backup_manage', 'settings_manage'
    ]);
  }

  const permissionsSet = new Set<string>();

  // 1. Find role definition
  const allRoles = getSavedRoles();
  const matchedRole = allRoles.find(r => r.id === user.role);
  if (matchedRole && Array.isArray(matchedRole.permissions)) {
    matchedRole.permissions.forEach(p => permissionsSet.add(p));
  }

  // 2. Add any direct user permissions object overrides
  if (user.permissions) {
    Object.entries(user.permissions).forEach(([key, val]) => {
      if (val === true) {
        permissionsSet.add(key);
      }
    });
  }

  return permissionsSet;
}

export function hasPermission(user: UserProfile | null | undefined, permissionKey: string): boolean {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  const perms = getUserEffectivePermissions(user);
  return perms.has(permissionKey);
}

export function canAccessTab(user: UserProfile | null | undefined, tab: CustomTabConfig): boolean {
  if (!user) return false;
  if (tab.isHidden && !isSuperAdmin(user)) return false;

  // 1. Check Supervisor UI customization override
  const uiConfig = getSupervisorUiConfig(user.uid);
  if (uiConfig?.isCustomized) {
    if (uiConfig.hiddenTabIds?.includes(tab.id)) return false;
    if (uiConfig.visibleTabIds && uiConfig.visibleTabIds.length > 0) {
      if (!uiConfig.visibleTabIds.includes(tab.id) && !isSuperAdmin(user)) {
        return false;
      }
    }
  }

  // 2. Check Allowed Roles
  if (tab.allowedRoles && tab.allowedRoles.length > 0) {
    if (!tab.allowedRoles.includes(user.role) && !isSuperAdmin(user)) {
      return false;
    }
  }

  // 3. Check Required Permissions
  if (tab.requiredPermissions && tab.requiredPermissions.length > 0) {
    const userPerms = getUserEffectivePermissions(user);
    const hasAll = tab.requiredPermissions.every(p => userPerms.has(p) || isSuperAdmin(user));
    if (!hasAll) return false;
  }

  return true;
}

export function canAccessSection(
  user: UserProfile | null | undefined, 
  section: CustomSectionConfig,
  sectionTabs: CustomTabConfig[]
): boolean {
  if (!user) return false;
  if (section.isHidden && !isSuperAdmin(user)) return false;

  // Check section-level roles
  if (section.allowedRoles && section.allowedRoles.length > 0) {
    if (!section.allowedRoles.includes(user.role) && !isSuperAdmin(user)) {
      return false;
    }
  }

  // Check required permissions
  if (section.requiredPermissions && section.requiredPermissions.length > 0) {
    const userPerms = getUserEffectivePermissions(user);
    const hasAll = section.requiredPermissions.every(p => userPerms.has(p) || isSuperAdmin(user));
    if (!hasAll) return false;
  }

  // Section must contain at least one accessible tab for this user
  const accessibleTabs = sectionTabs.filter(t => canAccessTab(user, t));
  return accessibleTabs.length > 0;
}

export function getVisibleNavigation(user: UserProfile | null | undefined): {
  sections: Array<CustomSectionConfig & { tabs: CustomTabConfig[] }>;
  allAccessibleTabs: CustomTabConfig[];
} {
  const rawSections = getSavedSections().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const rawTabs = getSavedTabs().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const allAccessibleTabs = rawTabs.filter(t => canAccessTab(user, t));

  const structuredSections = rawSections
    .map(sec => {
      const tabsForSec = rawTabs.filter(t => t.sectionId === sec.id && canAccessTab(user, t));
      return {
        ...sec,
        tabs: tabsForSec
      };
    })
    .filter(sec => canAccessSection(user, sec, sec.tabs));

  return {
    sections: structuredSections,
    allAccessibleTabs
  };
}

export function assertPermission(
  user: UserProfile | null | undefined, 
  permissionKey: string, 
  actionNameAr: string = 'تنفيذ هذه العملية'
): void {
  if (!hasPermission(user, permissionKey)) {
    throw new Error(`عذراً، ليس لديك الصلاحية الكافية لـ (${actionNameAr}). يرجى التواصل مع المشرف العام.`);
  }
}
