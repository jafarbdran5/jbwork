import { UserRole, UserProfile } from '../types';

export interface SystemPermissionDef {
  key: string;
  categoryAr: string;
  categoryEn: string;
  labelAr: string;
  labelEn: string;
  descriptionAr: string;
  descriptionEn: string;
}

export const ALL_SYSTEM_PERMISSIONS: SystemPermissionDef[] = [
  // Cases
  {
    key: 'cases_view',
    categoryAr: 'القضايا والملفات',
    categoryEn: 'Cases & Files',
    labelAr: 'مشاهدة القضايا',
    labelEn: 'View Cases',
    descriptionAr: 'استعراض قائمة القضايا وتفاصيلها',
    descriptionEn: 'View cases list and case details'
  },
  {
    key: 'cases_create',
    categoryAr: 'القضايا والملفات',
    categoryEn: 'Cases & Files',
    labelAr: 'إنشاء قضية جديدة',
    labelEn: 'Create Case',
    descriptionAr: 'إضافة وتسجيل قضايا جديدة في المنظومة',
    descriptionEn: 'Add and register new cases in system'
  },
  {
    key: 'cases_edit',
    categoryAr: 'القضايا والملفات',
    categoryEn: 'Cases & Files',
    labelAr: 'تعديل القضايا',
    labelEn: 'Edit Cases',
    descriptionAr: 'تعديل بيانات القضايا ومراحلها وملاحظاتها',
    descriptionEn: 'Edit case details, status, and notes'
  },
  {
    key: 'cases_delete',
    categoryAr: 'القضايا والملفات',
    categoryEn: 'Cases & Files',
    labelAr: 'حذف القضايا',
    labelEn: 'Delete Cases',
    descriptionAr: 'حذف القضايا ونقلها لسلة المهملات',
    descriptionEn: 'Delete cases and move to trash'
  },

  // Clients
  {
    key: 'clients_view',
    categoryAr: 'الموكلين والعملاء',
    categoryEn: 'Clients & Customers',
    labelAr: 'مشاهدة الموكلين',
    labelEn: 'View Clients',
    descriptionAr: 'استعراض دليل الموكلين وبياناتهم',
    descriptionEn: 'View clients directory and contact details'
  },
  {
    key: 'clients_create',
    categoryAr: 'الموكلين والعملاء',
    categoryEn: 'Clients & Customers',
    labelAr: 'إضافة موكل',
    labelEn: 'Create Client',
    descriptionAr: 'تسجيل موكلين جدد وتوليد معرف فريد',
    descriptionEn: 'Register new clients and generate unique ID'
  },
  {
    key: 'clients_edit',
    categoryAr: 'الموكلين والعملاء',
    categoryEn: 'Clients & Customers',
    labelAr: 'تعديل الموكلين',
    labelEn: 'Edit Clients',
    descriptionAr: 'تحديث بيانات الموكل ومعلومات الاتصال',
    descriptionEn: 'Update client details and contact info'
  },
  {
    key: 'clients_delete',
    categoryAr: 'الموكلين والعملاء',
    categoryEn: 'Clients & Customers',
    labelAr: 'حذف الموكلين',
    labelEn: 'Delete Clients',
    descriptionAr: 'حذف بيانات الموكلين من المنظومة',
    descriptionEn: 'Remove clients from system'
  },

  // Requests / Intake
  {
    key: 'requests_view',
    categoryAr: 'مركز الاستقبال والطلبات',
    categoryEn: 'Intake & Requests',
    labelAr: 'مشاهدة مركز الاستقبال',
    labelEn: 'View Intake Center',
    descriptionAr: 'مشاهدة الطلبات الخارجية واستجابات النماذج',
    descriptionEn: 'View incoming external requests and form submissions'
  },
  {
    key: 'requests_process',
    categoryAr: 'مركز الاستقبال والطلبات',
    categoryEn: 'Intake & Requests',
    labelAr: 'معالجة وتحويل الطلبات',
    labelEn: 'Process & Convert Requests',
    descriptionAr: 'تحويل الطلبات الواردة إلى قضايا أو مهام',
    descriptionEn: 'Convert incoming requests to cases or tasks'
  },

  // Tasks
  {
    key: 'tasks_view',
    categoryAr: 'المهام والمتابعات',
    categoryEn: 'Tasks & Todos',
    labelAr: 'مشاهدة المهام',
    labelEn: 'View Tasks',
    descriptionAr: 'استعراض المهام والمتابعات اليومية',
    descriptionEn: 'View daily tasks and todo items'
  },
  {
    key: 'tasks_create',
    categoryAr: 'المهام والمتابعات',
    categoryEn: 'Tasks & Todos',
    labelAr: 'إنشاء المهام',
    labelEn: 'Create Tasks',
    descriptionAr: 'إضافة مهام جديدة وتعيينها للمشرفين',
    descriptionEn: 'Create new tasks and assign to team'
  },
  {
    key: 'tasks_edit',
    categoryAr: 'المهام والمتابعات',
    categoryEn: 'Tasks & Todos',
    labelAr: 'تعديل المهام',
    labelEn: 'Edit Tasks',
    descriptionAr: 'تحديث حالة المهام ومواعيد الاستحقاق',
    descriptionEn: 'Update task status and due dates'
  },
  {
    key: 'tasks_delete',
    categoryAr: 'المهام والمتابعات',
    categoryEn: 'Tasks & Todos',
    labelAr: 'حذف المهام',
    labelEn: 'Delete Tasks',
    descriptionAr: 'حذف المهام المكتملة أو الملغاة',
    descriptionEn: 'Delete completed or cancelled tasks'
  },

  // Google Sheets
  {
    key: 'sheets_view',
    categoryAr: 'Google Sheets والبيانات',
    categoryEn: 'Google Sheets & Data',
    labelAr: 'مشاهدة ملفات Google Sheets',
    labelEn: 'View Google Sheets',
    descriptionAr: 'استعراض الجداول والبيانات المربوطة',
    descriptionEn: 'View connected sheets and imported rows'
  },
  {
    key: 'sheets_manage',
    categoryAr: 'Google Sheets والبيانات',
    categoryEn: 'Google Sheets & Data',
    labelAr: 'إدارة وتعديل مصادر البيانات',
    labelEn: 'Manage Data Sources',
    descriptionAr: 'إضافة وربط ملفات الشيت واكتشاف الأوراق وتعديل الربط',
    descriptionEn: 'Add, link, discover tabs, and remap Google Sheets'
  },

  // Support Portals
  {
    key: 'support_portals_view',
    categoryAr: 'بوابات الدعم الرسمية',
    categoryEn: 'Support Portals',
    labelAr: 'مشاهدة بوابات الدعم',
    labelEn: 'View Support Portals',
    descriptionAr: 'استعراض بوابات دعم الشركات والمنصات الرسمية',
    descriptionEn: 'Browse verified official platform support links'
  },
  {
    key: 'support_portals_manage',
    categoryAr: 'بوابات الدعم الرسمية',
    categoryEn: 'Support Portals',
    labelAr: 'إدارة روابط وبوابات الدعم',
    labelEn: 'Manage Support Portals',
    descriptionAr: 'إضافة وتعديل وحذف الشركات والروابط ومعلومات الاتصال الرسمية',
    descriptionEn: 'Add, edit, delete companies, links, and contact info'
  },

  // System Manual
  {
    key: 'manual_view',
    categoryAr: 'دليل تشغيل التطبيق',
    categoryEn: 'System Manual',
    labelAr: 'مشاهدة دليل التشغيل',
    labelEn: 'View Manual',
    descriptionAr: 'قراءة شروحات واستخدامات النظام',
    descriptionEn: 'Read system operation guide and tutorials'
  },
  {
    key: 'manual_manage',
    categoryAr: 'دليل تشغيل التطبيق',
    categoryEn: 'System Manual',
    labelAr: 'تعديل وإدارة دليل التشغيل',
    labelEn: 'Manage Manual Content',
    descriptionAr: 'إضافة وتعديل مقالات وشروحات وخطوات دليل التشغيل',
    descriptionEn: 'Add and edit manual articles, steps, and explanations'
  },

  // AI Assistant
  {
    key: 'ai_assistant_use',
    categoryAr: 'المساعد الذكي',
    categoryEn: 'AI Assistant',
    labelAr: 'استخدام المساعد الذكي',
    labelEn: 'Use AI Assistant',
    descriptionAr: 'طرح الأسئلة واستخراج الإحصائيات والأوامر عبر المساعد',
    descriptionEn: 'Ask questions, query statistics, and command the AI'
  },

  // System Customization & Navigation
  {
    key: 'sections_manage',
    categoryAr: 'تخصيص بنية النظام',
    categoryEn: 'System Customization',
    labelAr: 'إدارة الأقسام وعلامات التبويب',
    labelEn: 'Manage Sections & Tabs',
    descriptionAr: 'إضافة وتعديل وحذف وترتيب الأقسام والتبويبات والصفحات',
    descriptionEn: 'Add, edit, delete, reorder sections, tabs, and pages'
  },
  {
    key: 'team_manage',
    categoryAr: 'إدارة المشرفين والأدوار',
    categoryEn: 'Team & Role Management',
    labelAr: 'إدارة المشرفين والمستخدمين',
    labelEn: 'Manage Supervisors & Staff',
    descriptionAr: 'إضافة المشرفين وتعديل حساباتهم وحالاتهم',
    descriptionEn: 'Add supervisors, edit profiles, and manage status'
  },
  {
    key: 'team_customize_ui',
    categoryAr: 'إدارة المشرفين والأدوار',
    categoryEn: 'Team & Role Management',
    labelAr: 'تخصيص واجهات المشرفين',
    labelEn: 'Customize Supervisor UIs',
    descriptionAr: 'تحديد علامات التبويب والأقسام المتاحة لكل مشرف',
    descriptionEn: 'Configure visible tabs and default view per supervisor'
  },
  {
    key: 'roles_manage',
    categoryAr: 'إدارة المشرفين والأدوار',
    categoryEn: 'Team & Role Management',
    labelAr: 'إنشاء وإدارة الأدوار والصلاحيات',
    labelEn: 'Manage Roles & Permissions',
    descriptionAr: 'إنشاء أدوار مخصصة وتحديد صلاحيات كل دور بدقة',
    descriptionEn: 'Create custom roles and configure permission matrices'
  },

  // Finance & Security
  {
    key: 'finance_view',
    categoryAr: 'المالية والأرباح',
    categoryEn: 'Finance & Profits',
    labelAr: 'مشاهدة التقارير المالية',
    labelEn: 'View Financials',
    descriptionAr: 'استعراض الإيرادات والمدفوعات والمستحقات',
    descriptionEn: 'View revenues, payments, and receivables'
  },
  {
    key: 'finance_manage',
    categoryAr: 'المالية والأرباح',
    categoryEn: 'Finance & Profits',
    labelAr: 'إدارة الحسابات والأتعاب',
    labelEn: 'Manage Financials',
    descriptionAr: 'تسجيل وتعديل الأتعاب وتوزيع الحصص والمصروفات',
    descriptionEn: 'Record payments, allocations, and business expenses'
  },
  {
    key: 'security_view',
    categoryAr: 'الأمان وسجل العمليات',
    categoryEn: 'Security & Audit',
    labelAr: 'مشاهدة سجل العمليات والأمان',
    labelEn: 'View Audit Logs & Security',
    descriptionAr: 'استعراض سجلات النشاط الإداري والعمليات الأمنية',
    descriptionEn: 'View administrative audit trail and security logs'
  },
  {
    key: 'settings_manage',
    categoryAr: 'الإعدادات والنسخ الاحتياطي',
    categoryEn: 'Settings & Backup',
    labelAr: 'إدارة إعدادات المنظومة والنسخ الاحتياطي',
    labelEn: 'Manage System Settings & Backup',
    descriptionAr: 'تغيير خيارات النظام والنسخ الاحتياطي والاستعادة',
    descriptionEn: 'Manage system preferences, backup, and restore'
  }
];

export interface CustomRoleDef {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  color?: string;
  isSystem?: boolean;
  permissions: string[]; // List of permission keys
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_SYSTEM_ROLES: CustomRoleDef[] = [
  {
    id: 'super_admin',
    nameAr: 'المشرف العام (المالك)',
    nameEn: 'Super Admin (Owner)',
    descriptionAr: 'كامل الصلاحيات والتحكم الشامل في بنية النظام والمشرفين والبيانات',
    descriptionEn: 'Full master access to all system modules, structure, and users',
    color: 'indigo',
    isSystem: true,
    permissions: ALL_SYSTEM_PERMISSIONS.map(p => p.key),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'admin_cases',
    nameAr: 'مشرف القضايا والملفات',
    nameEn: 'Cases Supervisor',
    descriptionAr: 'إدارة القضايا والموكلين والمهام والمستندات',
    descriptionEn: 'Manage cases, clients, tasks, and case documents',
    color: 'cyan',
    isSystem: true,
    permissions: [
      'cases_view', 'cases_create', 'cases_edit', 'cases_delete',
      'clients_view', 'clients_create', 'clients_edit',
      'tasks_view', 'tasks_create', 'tasks_edit',
      'support_portals_view',
      'manual_view',
      'ai_assistant_use'
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'admin_intake',
    nameAr: 'مشرف الاستقبال والبلاغات',
    nameEn: 'Intake & Reception Supervisor',
    descriptionAr: 'استقبال الطلبات الخارجية والنماذج وتحويلها لقضايا ومتابعة الشيت',
    descriptionEn: 'Receive incoming requests, convert to cases, and monitor sheets',
    color: 'emerald',
    isSystem: true,
    permissions: [
      'requests_view', 'requests_process',
      'cases_view', 'cases_create',
      'clients_view', 'clients_create',
      'tasks_view', 'tasks_create',
      'sheets_view',
      'support_portals_view',
      'manual_view',
      'ai_assistant_use'
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'admin_tasks',
    nameAr: 'مشرف المهام والمتابعات',
    nameEn: 'Tasks Supervisor',
    descriptionAr: 'إدارة وتتبع المهام والتذكيرات والجلسات اليومية',
    descriptionEn: 'Manage tasks, daily focus, and court hearings',
    color: 'amber',
    isSystem: true,
    permissions: [
      'tasks_view', 'tasks_create', 'tasks_edit', 'tasks_delete',
      'cases_view',
      'clients_view',
      'manual_view',
      'ai_assistant_use'
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'admin_data',
    nameAr: 'مشرف مصادر البيانات والشيت',
    nameEn: 'Data & Sheets Supervisor',
    descriptionAr: 'إدارة ملفات Google Sheets وتحديث جداول البيانات والمزامنة',
    descriptionEn: 'Manage Google Sheets, discover tabs, and sync data sources',
    color: 'blue',
    isSystem: true,
    permissions: [
      'sheets_view', 'sheets_manage',
      'requests_view',
      'cases_view',
      'manual_view',
      'ai_assistant_use'
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'admin_support',
    nameAr: 'مشرف الدعم والمنصات',
    nameEn: 'Support & Portals Supervisor',
    descriptionAr: 'إدارة بوابات دعم الشركات الرسمية وحل مشاكل المنصات',
    descriptionEn: 'Manage official platform support portals and issue resolutions',
    color: 'purple',
    isSystem: true,
    permissions: [
      'support_portals_view', 'support_portals_manage',
      'cases_view',
      'knowledge_view',
      'manual_view',
      'ai_assistant_use'
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'employee',
    nameAr: 'عضو فريق ومتابع',
    nameEn: 'Team Member',
    descriptionAr: 'متابعة المهام الموكلة والقضايا المخصصة',
    descriptionEn: 'Execute assigned tasks and view assigned cases',
    color: 'slate',
    isSystem: true,
    permissions: [
      'cases_view',
      'clients_view',
      'tasks_view', 'tasks_edit',
      'manual_view',
      'ai_assistant_use'
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export interface CustomSectionConfig {
  id: string;
  titleAr: string;
  titleEn: string;
  sortOrder: number;
  isHidden?: boolean;
  isCustom?: boolean;
  requiredPermissions?: string[];
  allowedRoles?: string[];
}

export interface CustomTabConfig {
  id: string;
  sectionId: string;
  labelAr: string;
  labelEn: string;
  iconName: string;
  targetView: string;
  sortOrder: number;
  isHidden?: boolean;
  isCustom?: boolean;
  showOnHome?: boolean;
  badge?: string;
  requiredPermissions?: string[];
  allowedRoles?: string[];
  customPageContent?: string; // Markdown if custom page
}

export interface SupervisorUiConfig {
  uid: string;
  visibleTabIds?: string[];
  hiddenTabIds?: string[];
  customTabOrder?: string[];
  defaultHomeView?: string;
  allowedSectionIds?: string[];
  isCustomized?: boolean;
  updatedAt?: string;
}
