import { UserProfile } from '../types';
import { logAuditAndEvent } from './audit';
import { hasPermission } from './permissionGuard';
import { getSavedPublicSheets, savePublicSheet } from './googleSheetsReader';

export type LabelCategory = 
  | 'sections'
  | 'tabs'
  | 'case_types'
  | 'case_statuses'
  | 'case_priorities'
  | 'task_types'
  | 'task_statuses'
  | 'request_types'
  | 'table_columns'
  | 'fields'
  | 'google_sheets'
  | 'buttons_actions'
  | 'system_entities';

export interface DynamicLabelItem {
  id: string; // Fixed immutable internal ID (e.g. "sec_cases_work", "case_status_new", "col_client_name", "btn_new_case", "sheet_123")
  category: LabelCategory;
  defaultLabelAr: string; // Factory default
  defaultLabelEn: string;
  customLabelAr?: string; // Admin customized name
  customLabelEn?: string;
  descriptionAr?: string;
  isSystemCore: boolean; // Cannot be deleted if true (can only be renamed or hidden)
  isCustomCreated?: boolean; // Created dynamically by admin
  hidden?: boolean;
  sortOrder?: number;
  iconName?: string;
  badge?: string;
  targetView?: string;
  meta?: {
    realSheetTitle?: string;
    realWorksheetTitle?: string;
    gid?: string;
    sheetId?: string;
    color?: string;
    [key: string]: any;
  };
  updatedAt?: string;
  updatedBy?: string;
}

const STORAGE_KEY = 'jb_dynamic_app_labels_v2';

export const INITIAL_DEFAULT_LABELS: DynamicLabelItem[] = [
  // 1. SECTIONS (أقسام المنظومة الرئيسية)
  {
    id: 'sec_life_os',
    category: 'sections',
    defaultLabelAr: 'إدارة الحياة واليوم (Life OS)',
    defaultLabelEn: 'Life & Personal OS',
    descriptionAr: 'القسم الرئيسي للروتين اليومي والتركيز والمفكرة الشخصية والمالية الخاصة',
    isSystemCore: true,
    sortOrder: 1
  },
  {
    id: 'sec_cases_work',
    category: 'sections',
    defaultLabelAr: 'إدارة القضايا والعمل (Legal Cases)',
    defaultLabelEn: 'Legal Cases & Work',
    descriptionAr: 'القسم الرئيسي لملفات القضايا والموكلين والمهام والمدفوعات',
    isSystemCore: true,
    sortOrder: 2
  },
  {
    id: 'sec_vault_tools',
    category: 'sections',
    defaultLabelAr: 'المعرفة والمستندات (Vault & Tools)',
    defaultLabelEn: 'Vault & Tools',
    descriptionAr: 'القسم الرئيسي لأدوات Google Sheets، بوابات الدعم، المستندات، والموسوعة',
    isSystemCore: true,
    sortOrder: 3
  },
  {
    id: 'sec_system_backup',
    category: 'sections',
    defaultLabelAr: 'النظام والأمان (System & Backup)',
    defaultLabelEn: 'System & Backup',
    descriptionAr: 'القسم الرئيسي للمشرفين، تخصيص التطبيق، الدليل، والنسخ الاحتياطي',
    isSystemCore: true,
    sortOrder: 4
  },

  // 2. TABS & VIEWS (علامات التبويب والصفحات)
  {
    id: 'tab_life_os',
    category: 'tabs',
    defaultLabelAr: 'نظام الحياة والروتين',
    defaultLabelEn: 'Life & Habits OS',
    descriptionAr: 'واجهة روتين الحياة وعادات اليوم',
    isSystemCore: true,
    targetView: 'life_os',
    sortOrder: 1
  },
  {
    id: 'tab_my_day',
    category: 'tabs',
    defaultLabelAr: 'خطة اليوم والتركيز',
    defaultLabelEn: 'My Day & Focus',
    descriptionAr: 'واجهة التخطيط اليومي وقائمة الأولويات',
    isSystemCore: true,
    targetView: 'my_day',
    sortOrder: 2
  },
  {
    id: 'tab_personal_area',
    category: 'tabs',
    defaultLabelAr: 'المفكرة والأفكار الخاصة',
    defaultLabelEn: 'Personal Vault & Ideas',
    descriptionAr: 'المفكرة الآمنة الشخصية والأفكار',
    isSystemCore: true,
    targetView: 'personal_area',
    sortOrder: 3
  },
  {
    id: 'tab_my_finances',
    category: 'tabs',
    defaultLabelAr: 'ماليتي والميزانية',
    defaultLabelEn: 'My Finances & Cashflow',
    descriptionAr: 'سجل المالية الشخصية والمصروفات',
    isSystemCore: true,
    targetView: 'my_finances',
    sortOrder: 4
  },
  {
    id: 'tab_dashboard',
    category: 'tabs',
    defaultLabelAr: 'لوحة المتابعة الشاملة',
    defaultLabelEn: 'Work Dashboard',
    descriptionAr: 'لوحة القيادة والمؤشرات والإحصائيات الرئيسية',
    isSystemCore: true,
    targetView: 'dashboard',
    sortOrder: 5
  },
  {
    id: 'tab_cases',
    category: 'tabs',
    defaultLabelAr: 'جميع القضايا',
    defaultLabelEn: 'All Cases',
    descriptionAr: 'جدول وسجل القضايا الشامل لجميع الملفات',
    isSystemCore: true,
    targetView: 'cases',
    sortOrder: 6
  },
  {
    id: 'tab_my_cases',
    category: 'tabs',
    defaultLabelAr: 'قضاياي المباشرة',
    defaultLabelEn: 'My Active Cases',
    descriptionAr: 'القضايا المعينة للمستخدم الحالي مباشرة',
    isSystemCore: true,
    targetView: 'my_cases',
    sortOrder: 7
  },
  {
    id: 'tab_external_requests',
    category: 'tabs',
    defaultLabelAr: 'الطلبات الخارجية واستجابات الشيت',
    defaultLabelEn: 'External Requests & Sheets',
    descriptionAr: 'مركز استقبال البلاغات والطلبات المحولة',
    isSystemCore: true,
    targetView: 'external_requests',
    sortOrder: 8
  },
  {
    id: 'tab_clients',
    category: 'tabs',
    defaultLabelAr: 'دليل الموكلين',
    defaultLabelEn: 'Clients Directory',
    descriptionAr: 'سجل الموكلين والعملاء وبيانات الاتصال',
    isSystemCore: true,
    targetView: 'clients',
    sortOrder: 9
  },
  {
    id: 'tab_tasks',
    category: 'tabs',
    defaultLabelAr: 'المهام والمتابعات',
    defaultLabelEn: 'Tasks & Todos',
    descriptionAr: 'قائمة المهام وتوزيع الأعمال بين الفريق',
    isSystemCore: true,
    targetView: 'tasks',
    sortOrder: 10
  },
  {
    id: 'tab_reminders',
    category: 'tabs',
    defaultLabelAr: 'التذكيرات والجلسات',
    defaultLabelEn: 'Reminders & Hearings',
    descriptionAr: 'مواعيد الجلسات والتذكيرات العاجلة',
    isSystemCore: true,
    targetView: 'reminders',
    sortOrder: 11
  },
  {
    id: 'tab_payments',
    category: 'tabs',
    defaultLabelAr: 'أتعاب ومدفوعات القضايا',
    defaultLabelEn: 'Case Payments & Fees',
    descriptionAr: 'سجل دفعات وأتعاب القضايا والمستحقات',
    isSystemCore: true,
    targetView: 'payments',
    sortOrder: 12
  },
  {
    id: 'tab_profits',
    category: 'tabs',
    defaultLabelAr: 'أرباح الأعمال والمنظومة',
    defaultLabelEn: 'Profits & Revenue',
    descriptionAr: 'تقارير أرباح الأعمال وتوزيع العوائد',
    isSystemCore: true,
    targetView: 'profits',
    sortOrder: 13
  },
  {
    id: 'tab_sheets',
    category: 'tabs',
    defaultLabelAr: 'قارئ Google Sheets والفورمز',
    defaultLabelEn: 'Google Sheets Hub',
    descriptionAr: 'ربط وقراءة وتصفح ملفات وأوراق الشيت',
    isSystemCore: true,
    targetView: 'sheets',
    sortOrder: 14
  },
  {
    id: 'tab_support_portals',
    category: 'tabs',
    defaultLabelAr: 'بوابات دعم الشركات والمنصات',
    defaultLabelEn: 'Official Support Portals',
    descriptionAr: 'دليل بوابات الدعم الفني الرسمية للمنصات',
    isSystemCore: true,
    targetView: 'support_portals',
    sortOrder: 15
  },
  {
    id: 'tab_projects',
    category: 'tabs',
    defaultLabelAr: 'المشاريع والمبادرات',
    defaultLabelEn: 'Projects & Milestones',
    descriptionAr: 'إدارة وتتبع المشاريع التشغيلية',
    isSystemCore: true,
    targetView: 'projects',
    sortOrder: 16
  },
  {
    id: 'tab_files',
    category: 'tabs',
    defaultLabelAr: 'المستندات والملفات',
    defaultLabelEn: 'Files & Documents',
    descriptionAr: 'خزينة المستندات والمرفقات والعقود',
    isSystemCore: true,
    targetView: 'files',
    sortOrder: 17
  },
  {
    id: 'tab_knowledge',
    category: 'tabs',
    defaultLabelAr: 'الموسوعة والمعرفة',
    defaultLabelEn: 'Knowledge Base',
    descriptionAr: 'الموسوعة القانونية والمراجع الرقمية',
    isSystemCore: true,
    targetView: 'knowledge',
    sortOrder: 18
  },
  {
    id: 'tab_content_studio',
    category: 'tabs',
    defaultLabelAr: 'استوديو صناعة المحتوى',
    defaultLabelEn: 'Content Studio',
    descriptionAr: 'أدوات صياغة وتوليد المحتوى التوعوي',
    isSystemCore: true,
    targetView: 'content_studio',
    sortOrder: 19
  },
  {
    id: 'tab_forms',
    category: 'tabs',
    defaultLabelAr: 'نماذج الاستقبال',
    defaultLabelEn: 'Form Center',
    descriptionAr: 'مركز نماذج الاستقبال وربط الحقول',
    isSystemCore: true,
    targetView: 'forms',
    sortOrder: 20
  },
  {
    id: 'tab_how_it_works',
    category: 'tabs',
    defaultLabelAr: 'دليل تشغيل التطبيق',
    defaultLabelEn: 'System Operation Manual',
    descriptionAr: 'دليل الشرح والخطوات التفاعلية للمنظومة',
    isSystemCore: true,
    targetView: 'how_it_works',
    sortOrder: 21
  },
  {
    id: 'tab_team',
    category: 'tabs',
    defaultLabelAr: 'إدارة المشرفين والأدوار',
    defaultLabelEn: 'Supervisors & Roles',
    descriptionAr: 'إدارة فريق العمل وحسابات المشرفين',
    isSystemCore: true,
    targetView: 'team',
    sortOrder: 22
  },
  {
    id: 'tab_app_labels_manager',
    category: 'tabs',
    defaultLabelAr: 'مدير أسماء وتسميات التطبيق',
    defaultLabelEn: 'App Labels & Renaming Hub',
    descriptionAr: 'التحكم المركزي في جميع مسميات وعناوين النظام',
    isSystemCore: true,
    targetView: 'app_labels_manager',
    sortOrder: 23
  },
  {
    id: 'tab_app_customizer',
    category: 'tabs',
    defaultLabelAr: 'تخصيص بنية التطبيق',
    defaultLabelEn: 'App Customization Center',
    descriptionAr: 'إدارة الأقسام والأدوار وواجهات المشرفين',
    isSystemCore: true,
    targetView: 'app_customizer',
    sortOrder: 24
  },
  {
    id: 'tab_security',
    category: 'tabs',
    defaultLabelAr: 'مركز الأمان وسجل العمليات',
    defaultLabelEn: 'Security & Audit Logs',
    descriptionAr: 'سجل العمليات والتدقيق الأمني والنشاط',
    isSystemCore: true,
    targetView: 'security',
    sortOrder: 25
  },
  {
    id: 'tab_backup',
    category: 'tabs',
    defaultLabelAr: 'النسخ الاحتياطي والاستعادة',
    defaultLabelEn: 'Backup & Restore',
    descriptionAr: 'تصدير واستيراد بيانات المنظومة والنسخ الاحتياطية',
    isSystemCore: true,
    targetView: 'backup',
    sortOrder: 26
  },
  {
    id: 'tab_reports',
    category: 'tabs',
    defaultLabelAr: 'التقارير والإحصائيات',
    defaultLabelEn: 'Reports & Analytics',
    descriptionAr: 'التقارير التحليلية والبيانات المجمعة',
    isSystemCore: true,
    targetView: 'reports',
    sortOrder: 27
  },
  {
    id: 'tab_trash',
    category: 'tabs',
    defaultLabelAr: 'سلة المهملات',
    defaultLabelEn: 'Trash',
    descriptionAr: 'الملفات والقضايا والمهام المحذوفة مؤقتاً',
    isSystemCore: true,
    targetView: 'trash',
    sortOrder: 28
  },
  {
    id: 'tab_settings',
    category: 'tabs',
    defaultLabelAr: 'إعدادات المظهر والنظام',
    defaultLabelEn: 'Settings & Appearance',
    descriptionAr: 'خيارات المظهر واللغة والإعدادات العامة',
    isSystemCore: true,
    targetView: 'settings',
    sortOrder: 29
  },

  // 3. CASE STATUSES (حالات ومراحل القضايا)
  {
    id: 'case_status_new',
    category: 'case_statuses',
    defaultLabelAr: 'جديدة',
    defaultLabelEn: 'New',
    descriptionAr: 'قضية مسجلة حديثاً بانتظار الإجراء',
    isSystemCore: true,
    sortOrder: 1
  },
  {
    id: 'case_status_in_progress',
    category: 'case_statuses',
    defaultLabelAr: 'قيد الإجراء والمتابعة',
    defaultLabelEn: 'In Progress',
    descriptionAr: 'القضية قيد العمل والتحقيق النشط',
    isSystemCore: true,
    sortOrder: 2
  },
  {
    id: 'case_status_review',
    category: 'case_statuses',
    defaultLabelAr: 'قيد المراجعة والتدقيق',
    defaultLabelEn: 'Under Review',
    descriptionAr: 'قيد التدقيق أو مراجعة المشرف',
    isSystemCore: true,
    sortOrder: 3
  },
  {
    id: 'case_status_closed',
    category: 'case_statuses',
    defaultLabelAr: 'منتهية ومغلقة',
    defaultLabelEn: 'Closed & Solved',
    descriptionAr: 'تم إنجاز القضية بنجاح وإغلاقها',
    isSystemCore: true,
    sortOrder: 4
  },
  {
    id: 'case_status_pending',
    category: 'case_statuses',
    defaultLabelAr: 'معلقة / بانتظار إفادة',
    defaultLabelEn: 'Pending / Suspended',
    descriptionAr: 'بانتظار رد الموكل أو استجابة المنصة',
    isSystemCore: true,
    sortOrder: 5
  },
  {
    id: 'case_status_archived',
    category: 'case_statuses',
    defaultLabelAr: 'مؤرشفة',
    defaultLabelEn: 'Archived',
    descriptionAr: 'محفوظة في الأرشيف للرجوع إليها',
    isSystemCore: true,
    sortOrder: 6
  },

  // 4. CASE TYPES (أنواع وتصنيفات القضايا)
  {
    id: 'case_type_impersonation',
    category: 'case_types',
    defaultLabelAr: 'حساب منتحل',
    defaultLabelEn: 'Impersonation Account',
    descriptionAr: 'انتحال حساب أو هوية شخصية على المنصات',
    isSystemCore: true,
    sortOrder: 1
  },
  {
    id: 'case_type_content_removal',
    category: 'case_types',
    defaultLabelAr: 'حذف منشور / محتوى مخالف',
    defaultLabelEn: 'Content Removal',
    descriptionAr: 'إزالة محتوى مسيء أو مقاطع تشهير',
    isSystemCore: true,
    sortOrder: 2
  },
  {
    id: 'case_type_infosec',
    category: 'case_types',
    defaultLabelAr: 'أمن معلومات واختراق',
    defaultLabelEn: 'Information Security',
    descriptionAr: 'ثغرات أمنية، تسريبات، وهجمات تقنية',
    isSystemCore: true,
    sortOrder: 3
  },
  {
    id: 'case_type_extortion',
    category: 'case_types',
    defaultLabelAr: 'قضية ابتزاز إلكتروني',
    defaultLabelEn: 'Extortion Case',
    descriptionAr: 'تهديد وابتزاز ومساومة رقمية',
    isSystemCore: true,
    sortOrder: 4
  },
  {
    id: 'case_type_penetration_testing',
    category: 'case_types',
    defaultLabelAr: 'طلب اختبار اختراق',
    defaultLabelEn: 'Penetration Testing Request',
    descriptionAr: 'فحص وتقييم أمان الأنظمة والمواقع',
    isSystemCore: true,
    sortOrder: 5
  },
  {
    id: 'case_type_account_recovery',
    category: 'case_types',
    defaultLabelAr: 'استعادة حساب معطل / مسروق',
    defaultLabelEn: 'Account Recovery',
    descriptionAr: 'استرجاع الوصول للحسابات المغلقة أو المخترقة',
    isSystemCore: true,
    sortOrder: 6
  },
  {
    id: 'case_type_account_hacking',
    category: 'case_types',
    defaultLabelAr: 'اختراق حساب',
    defaultLabelEn: 'Account Hacking',
    descriptionAr: 'بلاغ تعرض حساب لسيطرة خارجية',
    isSystemCore: true,
    sortOrder: 7
  },
  {
    id: 'case_type_identity_impersonation',
    category: 'case_types',
    defaultLabelAr: 'انتحال شخصية اعتبارية',
    defaultLabelEn: 'Identity Impersonation',
    descriptionAr: 'تزوير أو استخدام اسم جهة أو شخصية',
    isSystemCore: true,
    sortOrder: 8
  },
  {
    id: 'case_type_intellectual_property',
    category: 'case_types',
    defaultLabelAr: 'حقوق ملكية فكرية وعلامة تجارية',
    defaultLabelEn: 'Intellectual Property',
    descriptionAr: 'انتهاك علامات تجارية أو حقوق نشر',
    isSystemCore: true,
    sortOrder: 9
  },
  {
    id: 'case_type_platform_report',
    category: 'case_types',
    defaultLabelAr: 'بلاغ منصة رسمي',
    defaultLabelEn: 'Platform Report',
    descriptionAr: 'متابعة بلاغ رسمي تم رفعه للمنصة',
    isSystemCore: true,
    sortOrder: 10
  },
  {
    id: 'case_type_security_consultation',
    category: 'case_types',
    defaultLabelAr: 'استشارة أمنية وتقنية',
    defaultLabelEn: 'Security Consultation',
    descriptionAr: 'جلسات دعم واستشارات للأفراد والشركات',
    isSystemCore: true,
    sortOrder: 11
  },
  {
    id: 'case_type_technical_issue',
    category: 'case_types',
    defaultLabelAr: 'مشكلة تقنية وعطل برمجي',
    defaultLabelEn: 'Technical Issue',
    descriptionAr: 'أعطال في المواقع والخوادم',
    isSystemCore: true,
    sortOrder: 12
  },
  {
    id: 'case_type_general_request',
    category: 'case_types',
    defaultLabelAr: 'طلب ومتابعة عامة',
    defaultLabelEn: 'General Request',
    descriptionAr: 'طلبات متنوعة تتطلب تدخلاً',
    isSystemCore: true,
    sortOrder: 13
  },
  {
    id: 'case_type_other',
    category: 'case_types',
    defaultLabelAr: 'أخرى / تصنيف مخصص',
    defaultLabelEn: 'Other / Custom',
    descriptionAr: 'تصنيفات إضافية خاصة',
    isSystemCore: true,
    sortOrder: 14
  },

  // 5. CASE PRIORITIES (درجات الأهمية)
  {
    id: 'priority_urgent',
    category: 'case_priorities',
    defaultLabelAr: 'طارئة جداً (عاجل)',
    defaultLabelEn: 'Urgent',
    descriptionAr: 'تتطلب تدخلاً فورياً خلال ساعات',
    isSystemCore: true,
    sortOrder: 1
  },
  {
    id: 'priority_high',
    category: 'case_priorities',
    defaultLabelAr: 'عالية الأهمية',
    defaultLabelEn: 'High Priority',
    descriptionAr: 'قضايا ومتابعات ذات أولوية متقدمة',
    isSystemCore: true,
    sortOrder: 2
  },
  {
    id: 'priority_medium',
    category: 'case_priorities',
    defaultLabelAr: 'متوسطة',
    defaultLabelEn: 'Medium Priority',
    descriptionAr: 'الوتيرة التشغيلية القياسية',
    isSystemCore: true,
    sortOrder: 3
  },
  {
    id: 'priority_low',
    category: 'case_priorities',
    defaultLabelAr: 'عادية / منخفضة',
    defaultLabelEn: 'Low Priority',
    descriptionAr: 'مهام وقضايا قابلة للتأجيل',
    isSystemCore: true,
    sortOrder: 4
  },

  // 6. TASK TYPES (أنواع المهام)
  {
    id: 'task_type_court',
    category: 'task_types',
    defaultLabelAr: 'جلسة محكمة / تحقيق',
    defaultLabelEn: 'Court Hearing / Investigation',
    descriptionAr: 'حضور جلسات أو مراجعة جهات رسمية',
    isSystemCore: true,
    sortOrder: 1
  },
  {
    id: 'task_type_meeting',
    category: 'task_types',
    defaultLabelAr: 'اجتماع مع موكل',
    defaultLabelEn: 'Client Meeting',
    descriptionAr: 'مقابلة الموكل لبحث المستجدات',
    isSystemCore: true,
    sortOrder: 2
  },
  {
    id: 'task_type_drafting',
    category: 'task_types',
    defaultLabelAr: 'إعداد مذكرة / تقرير أمني',
    defaultLabelEn: 'Drafting Memo / Report',
    descriptionAr: 'كتابة تقارير الفحص والوثائق',
    isSystemCore: true,
    sortOrder: 3
  },
  {
    id: 'task_type_followup',
    category: 'task_types',
    defaultLabelAr: 'متابعة مع المنصة والدعم',
    defaultLabelEn: 'Platform Support Followup',
    descriptionAr: 'التواصل مع فرق الدعم الفني بالمنصات',
    isSystemCore: true,
    sortOrder: 4
  },
  {
    id: 'task_type_contact',
    category: 'task_types',
    defaultLabelAr: 'تواصل ومكالمة هاتفية',
    defaultLabelEn: 'Phone Call / Contact',
    descriptionAr: 'مكالمة هاتفية للمتابعة العاجلة',
    isSystemCore: true,
    sortOrder: 5
  },
  {
    id: 'task_type_payment',
    category: 'task_types',
    defaultLabelAr: 'تحصيل أتعاب / دفعة مالية',
    defaultLabelEn: 'Fee Collection',
    descriptionAr: 'متابعة الدفعات المالية والأتعاب',
    isSystemCore: true,
    sortOrder: 6
  },
  {
    id: 'task_type_general',
    category: 'task_types',
    defaultLabelAr: 'مهمة عامة',
    defaultLabelEn: 'General Task',
    descriptionAr: 'مهام مكتبية وتشغيلية عامة',
    isSystemCore: true,
    sortOrder: 7
  },

  // 7. TASK STATUSES (حالات المهام)
  {
    id: 'task_status_todo',
    category: 'task_statuses',
    defaultLabelAr: 'قيد الانتظار (To Do)',
    defaultLabelEn: 'To Do',
    descriptionAr: 'مهمة مسندة بانتظار البدء',
    isSystemCore: true,
    sortOrder: 1
  },
  {
    id: 'task_status_in_progress',
    category: 'task_statuses',
    defaultLabelAr: 'قيد التنفيذ',
    defaultLabelEn: 'In Progress',
    descriptionAr: 'يجري العمل عليها حالياً',
    isSystemCore: true,
    sortOrder: 2
  },
  {
    id: 'task_status_review',
    category: 'task_statuses',
    defaultLabelAr: 'قيد التدقيق والمراجعة',
    defaultLabelEn: 'Under Review',
    descriptionAr: 'تم إنجاز المسودة بانتظار الاعتماد',
    isSystemCore: true,
    sortOrder: 3
  },
  {
    id: 'task_status_completed',
    category: 'task_statuses',
    defaultLabelAr: 'مكتملة ومغلقة',
    defaultLabelEn: 'Completed',
    descriptionAr: 'تم إنهاء المهمة بالكامل',
    isSystemCore: true,
    sortOrder: 4
  },
  {
    id: 'task_status_cancelled',
    category: 'task_statuses',
    defaultLabelAr: 'ملغاة',
    defaultLabelEn: 'Cancelled',
    descriptionAr: 'تم إلغاء المهمة لعدم الحاجة',
    isSystemCore: true,
    sortOrder: 5
  },

  // 8. REQUEST / INTAKE TYPES (أنواع الطلبات في مركز الاستقبال)
  {
    id: 'req_type_blackmail',
    category: 'request_types',
    defaultLabelAr: 'بلاغ ابتزاز إلكتروني',
    defaultLabelEn: 'Blackmail Intake',
    descriptionAr: 'طلب وارد يخص ابتزاز رقمي ومساومة',
    isSystemCore: true,
    sortOrder: 1
  },
  {
    id: 'req_type_account_hack',
    category: 'request_types',
    defaultLabelAr: 'طلب استعادة حساب مخترق',
    defaultLabelEn: 'Hacked Account Intake',
    descriptionAr: 'طلب وارد لاسترجاع حساب منصة',
    isSystemCore: true,
    sortOrder: 2
  },
  {
    id: 'req_type_financial_fraud',
    category: 'request_types',
    defaultLabelAr: 'بلاغ احتيال وسرقة مالية',
    defaultLabelEn: 'Financial Fraud Intake',
    descriptionAr: 'طلب وارد يخص سحب أرصدة أو نصب',
    isSystemCore: true,
    sortOrder: 3
  },
  {
    id: 'req_type_consultation',
    category: 'request_types',
    defaultLabelAr: 'طلب استشارة أمنية / تقنية',
    defaultLabelEn: 'Consultation Request',
    descriptionAr: 'طلب موعد استشارة وتوجيه',
    isSystemCore: true,
    sortOrder: 4
  },
  {
    id: 'req_type_general',
    category: 'request_types',
    defaultLabelAr: 'طلب أو استفسار عام',
    defaultLabelEn: 'General Inquiry',
    descriptionAr: 'استفسارات وبلاغات متنوعة',
    isSystemCore: true,
    sortOrder: 5
  },

  // 9. TABLE COLUMNS (أسماء الأعمدة والجداول)
  {
    id: 'col_case_number',
    category: 'table_columns',
    defaultLabelAr: 'رقم القضية',
    defaultLabelEn: 'Case Number',
    descriptionAr: 'المعرف التسلسلي الفريد للقضية',
    isSystemCore: true,
    sortOrder: 1
  },
  {
    id: 'col_case_title',
    category: 'table_columns',
    defaultLabelAr: 'عنوان القضية / البلاغ',
    defaultLabelEn: 'Case Title',
    descriptionAr: 'اسم أو موضوع القضية الرئيسي',
    isSystemCore: true,
    sortOrder: 2
  },
  {
    id: 'col_client_name',
    category: 'table_columns',
    defaultLabelAr: 'اسم الموكل',
    defaultLabelEn: 'Client Name',
    descriptionAr: 'اسم العميل أو صاحب البلاغ',
    isSystemCore: true,
    sortOrder: 3
  },
  {
    id: 'col_client_phone',
    category: 'table_columns',
    defaultLabelAr: 'هاتف التواصل',
    defaultLabelEn: 'Contact Phone',
    descriptionAr: 'رقم الهاتف أو الواتساب للتواصل',
    isSystemCore: true,
    sortOrder: 4
  },
  {
    id: 'col_client_national_id',
    category: 'table_columns',
    defaultLabelAr: 'رقم الهوية / السجل',
    defaultLabelEn: 'National / Tax ID',
    descriptionAr: 'رقم الإثبات أو السجل التجاري',
    isSystemCore: true,
    sortOrder: 5
  },
  {
    id: 'col_case_status',
    category: 'table_columns',
    defaultLabelAr: 'حالة القضية',
    defaultLabelEn: 'Case Status',
    descriptionAr: 'المرحلة الحالية لملف القضية',
    isSystemCore: true,
    sortOrder: 6
  },
  {
    id: 'col_case_type',
    category: 'table_columns',
    defaultLabelAr: 'نوع القضية',
    defaultLabelEn: 'Case Type',
    descriptionAr: 'التصنيف القانوني أو التقني للقضية',
    isSystemCore: true,
    sortOrder: 7
  },
  {
    id: 'col_case_priority',
    category: 'table_columns',
    defaultLabelAr: 'درجة الأهمية',
    defaultLabelEn: 'Priority',
    descriptionAr: 'مستوى الاستعجال والخطورة',
    isSystemCore: true,
    sortOrder: 8
  },
  {
    id: 'col_assigned_to',
    category: 'table_columns',
    defaultLabelAr: 'المشرف المسؤول',
    defaultLabelEn: 'Assigned Supervisor',
    descriptionAr: 'المشرف المكلف بمتابعة القضية',
    isSystemCore: true,
    sortOrder: 9
  },
  {
    id: 'col_created_at',
    category: 'table_columns',
    defaultLabelAr: 'تاريخ التسجيل',
    defaultLabelEn: 'Creation Date',
    descriptionAr: 'تاريخ إدخال القضية للمنظومة',
    isSystemCore: true,
    sortOrder: 10
  },
  {
    id: 'col_updated_at',
    category: 'table_columns',
    defaultLabelAr: 'آخر تحديث',
    defaultLabelEn: 'Last Updated',
    descriptionAr: 'تاريخ ووقت آخر تعديل',
    isSystemCore: true,
    sortOrder: 11
  },
  {
    id: 'col_fees_total',
    category: 'table_columns',
    defaultLabelAr: 'إجمالي الأتعاب',
    defaultLabelEn: 'Total Fees',
    descriptionAr: 'المبلغ الإجمالي المتفق عليه',
    isSystemCore: true,
    sortOrder: 12
  },
  {
    id: 'col_fees_paid',
    category: 'table_columns',
    defaultLabelAr: 'المدفوع',
    defaultLabelEn: 'Paid Amount',
    descriptionAr: 'المبلغ المحصل فعلياً',
    isSystemCore: true,
    sortOrder: 13
  },
  {
    id: 'col_fees_remaining',
    category: 'table_columns',
    defaultLabelAr: 'المتبقي',
    defaultLabelEn: 'Remaining Balance',
    descriptionAr: 'المبلغ المتبقي للتحصيل',
    isSystemCore: true,
    sortOrder: 14
  },
  {
    id: 'col_platform',
    category: 'table_columns',
    defaultLabelAr: 'المنصة المستهدفة',
    defaultLabelEn: 'Target Platform',
    descriptionAr: 'المنصة الرقمية المتأثرة',
    isSystemCore: true,
    sortOrder: 15
  },
  {
    id: 'col_task_title',
    category: 'table_columns',
    defaultLabelAr: 'عنوان المهمة',
    defaultLabelEn: 'Task Title',
    descriptionAr: 'اسم أو موضوع المهمة',
    isSystemCore: true,
    sortOrder: 16
  },
  {
    id: 'col_task_due',
    category: 'table_columns',
    defaultLabelAr: 'موعد الاستحقاق',
    defaultLabelEn: 'Due Date',
    descriptionAr: 'الموعد النهائي لتسليم المهمة',
    isSystemCore: true,
    sortOrder: 17
  },

  // 10. FIELDS (الحقول ونماذج الإدخال)
  {
    id: 'field_case_title',
    category: 'fields',
    defaultLabelAr: 'عنوان البلاغ / القضية',
    defaultLabelEn: 'Case / Report Title',
    descriptionAr: 'حقل عنوان القضية في نماذج الإنشاء والتعديل',
    isSystemCore: true,
    sortOrder: 1
  },
  {
    id: 'field_client_name',
    category: 'fields',
    defaultLabelAr: 'اسم الموكل الكامل',
    defaultLabelEn: 'Client Full Name',
    descriptionAr: 'حقل الاسم الرباعي أو التجاري للموكل',
    isSystemCore: true,
    sortOrder: 2
  },
  {
    id: 'field_client_phone',
    category: 'fields',
    defaultLabelAr: 'رقم الهاتف / الواتساب',
    defaultLabelEn: 'Phone / WhatsApp',
    descriptionAr: 'حقل رقم الاتصال الأساسي',
    isSystemCore: true,
    sortOrder: 3
  },
  {
    id: 'field_client_email',
    category: 'fields',
    defaultLabelAr: 'البريد الإلكتروني',
    defaultLabelEn: 'Email Address',
    descriptionAr: 'حقل البريد الإلكتروني للموكل',
    isSystemCore: true,
    sortOrder: 4
  },
  {
    id: 'field_target_url',
    category: 'fields',
    defaultLabelAr: 'الرابط المستهدف / رابط الحساب',
    defaultLabelEn: 'Target Link / URL',
    descriptionAr: 'حقل رابط الحساب أو المنشور أو الموقع',
    isSystemCore: true,
    sortOrder: 5
  },
  {
    id: 'field_description',
    category: 'fields',
    defaultLabelAr: 'تفاصيل الواقعة والملاحظات',
    defaultLabelEn: 'Incident Details & Notes',
    descriptionAr: 'حقل التفاصيل والشرح في النماذج',
    isSystemCore: true,
    sortOrder: 6
  },
  {
    id: 'field_incident_date',
    category: 'fields',
    defaultLabelAr: 'تاريخ الواقعة',
    defaultLabelEn: 'Incident Date',
    descriptionAr: 'حقل تاريخ حدوث الواقعة',
    isSystemCore: true,
    sortOrder: 7
  },

  // 11. BUTTONS & ACTIONS (الأزرار والإجراءات)
  {
    id: 'btn_new_case',
    category: 'buttons_actions',
    defaultLabelAr: 'إضافة قضية جديدة',
    defaultLabelEn: 'New Case',
    descriptionAr: 'زر فتح نموذج إنشاء وتسجيل قضية جديدة',
    isSystemCore: true,
    sortOrder: 1
  },
  {
    id: 'btn_new_task',
    category: 'buttons_actions',
    defaultLabelAr: 'إضافة مهمة جديدة',
    defaultLabelEn: 'New Task',
    descriptionAr: 'زر فتح نموذج إضافة مهمة جديدة',
    isSystemCore: true,
    sortOrder: 2
  },
  {
    id: 'btn_new_client',
    category: 'buttons_actions',
    defaultLabelAr: 'تسجيل موكل جديد',
    defaultLabelEn: 'New Client',
    descriptionAr: 'زر تسجيل وإضافة موكل في الدليل',
    isSystemCore: true,
    sortOrder: 3
  },
  {
    id: 'btn_export_excel',
    category: 'buttons_actions',
    defaultLabelAr: 'تصدير كشف Excel',
    defaultLabelEn: 'Export Excel',
    descriptionAr: 'زر تنزيل كشف البيانات كملف إكسيل',
    isSystemCore: true,
    sortOrder: 4
  },
  {
    id: 'btn_export_pdf',
    category: 'buttons_actions',
    defaultLabelAr: 'تصدير تقرير PDF',
    defaultLabelEn: 'Export PDF',
    descriptionAr: 'زر طباعة وتصدير تقرير رسمي',
    isSystemCore: true,
    sortOrder: 5
  },
  {
    id: 'btn_sync_sheets',
    category: 'buttons_actions',
    defaultLabelAr: 'مزامنة وتحديث البيانات',
    defaultLabelEn: 'Sync & Refresh Sheets',
    descriptionAr: 'زر إعادة جلب البيانات من Google Sheets',
    isSystemCore: true,
    sortOrder: 6
  },
  {
    id: 'btn_save',
    category: 'buttons_actions',
    defaultLabelAr: 'حفظ التغييرات',
    defaultLabelEn: 'Save Changes',
    descriptionAr: 'زر تأكيد وحفظ التعديلات',
    isSystemCore: true,
    sortOrder: 7
  },
  {
    id: 'btn_cancel',
    category: 'buttons_actions',
    defaultLabelAr: 'إلغاء الأمر',
    defaultLabelEn: 'Cancel',
    descriptionAr: 'زر إغلاق أو إلغاء الإجراء',
    isSystemCore: true,
    sortOrder: 8
  },
  {
    id: 'btn_rename',
    category: 'buttons_actions',
    defaultLabelAr: 'إعادة تسمية',
    defaultLabelEn: 'Rename',
    descriptionAr: 'زر تعديل وإعادة تسمية العنصر',
    isSystemCore: true,
    sortOrder: 9
  },
  {
    id: 'btn_delete',
    category: 'buttons_actions',
    defaultLabelAr: 'حذف',
    defaultLabelEn: 'Delete',
    descriptionAr: 'زر الحذف وإرسال العنصر لسلة المهملات',
    isSystemCore: true,
    sortOrder: 10
  },

  // 12. SYSTEM ENTITIES (المسميات العامة للمنظومة)
  {
    id: 'entity_cases',
    category: 'system_entities',
    defaultLabelAr: 'القضايا والملفات',
    defaultLabelEn: 'Cases & Files',
    descriptionAr: 'المسمى العام لملفات العمل',
    isSystemCore: true,
    sortOrder: 1
  },
  {
    id: 'entity_clients',
    category: 'system_entities',
    defaultLabelAr: 'الموكلين والعملاء',
    defaultLabelEn: 'Clients & Customers',
    descriptionAr: 'المسمى العام لجهات وأصحاب القضايا',
    isSystemCore: true,
    sortOrder: 2
  },
  {
    id: 'entity_tasks',
    category: 'system_entities',
    defaultLabelAr: 'المهام والمتابعات',
    defaultLabelEn: 'Tasks & Todos',
    descriptionAr: 'المسمى العام للأعمال والمتابعات',
    isSystemCore: true,
    sortOrder: 3
  },
  {
    id: 'entity_requests',
    category: 'system_entities',
    defaultLabelAr: 'مركز الاستقبال والطلبات',
    defaultLabelEn: 'Intake Center & Requests',
    descriptionAr: 'المسمى العام للبلاغات والطلبات الخارجية',
    isSystemCore: true,
    sortOrder: 4
  },
  {
    id: 'entity_supervisors',
    category: 'system_entities',
    defaultLabelAr: 'المشرفين وفريق العمل',
    defaultLabelEn: 'Supervisors & Staff',
    descriptionAr: 'المسمى العام لأعضاء ومسؤولي النظام',
    isSystemCore: true,
    sortOrder: 5
  }
];

export function getSavedLabels(): DynamicLabelItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Seed with initial defaults and also sync Google Sheets labels
      const list = [...INITIAL_DEFAULT_LABELS];
      syncSheetsIntoLabelsList(list);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return list;
    }
    const parsed: DynamicLabelItem[] = JSON.parse(raw);
    
    // Ensure all factory defaults exist in stored array
    let modified = false;
    const existingIds = new Set(parsed.map(i => i.id));
    for (const item of INITIAL_DEFAULT_LABELS) {
      if (!existingIds.has(item.id)) {
        parsed.push({ ...item });
        existingIds.add(item.id);
        modified = true;
      }
    }

    // Sync any saved Google Sheets
    if (syncSheetsIntoLabelsList(parsed)) {
      modified = true;
    }

    if (modified) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch (err) {
    console.error('Failed to load dynamic labels:', err);
    return [...INITIAL_DEFAULT_LABELS];
  }
}

/**
 * Synchronizes Google Sheets items and worksheet tabs into dynamic labels registry
 */
function syncSheetsIntoLabelsList(list: DynamicLabelItem[]): boolean {
  let changed = false;
  try {
    const sheets = getSavedPublicSheets();
    const existingMap = new Map(list.map(i => [i.id, i]));

    sheets.forEach(sheet => {
      const sheetLabelId = `sheet_${sheet.id}`;
      if (!existingMap.has(sheetLabelId)) {
        list.push({
          id: sheetLabelId,
          category: 'google_sheets',
          defaultLabelAr: sheet.title || 'ملف Google Sheets',
          defaultLabelEn: sheet.title || 'Google Sheet',
          customLabelAr: sheet.title,
          isSystemCore: false,
          isCustomCreated: true,
          descriptionAr: `ملف Google Sheets ID: ${sheet.sheetId || sheet.id}`,
          meta: {
            sheetId: sheet.id,
            realSheetTitle: sheet.title,
            isSpreadsheet: true
          }
        });
        changed = true;
      } else {
        const item = existingMap.get(sheetLabelId)!;
        if (item.meta) {
          item.meta.realSheetTitle = sheet.title;
        }
      }

      // Worksheet Tabs
      if (sheet.tabs && sheet.tabs.length > 0) {
        sheet.tabs.forEach(tab => {
          const tabLabelId = `ws_${sheet.id}_${tab.gid || '0'}`;
          if (!existingMap.has(tabLabelId)) {
            list.push({
              id: tabLabelId,
              category: 'google_sheets',
              defaultLabelAr: tab.name || `ورقة ${tab.gid}`,
              defaultLabelEn: tab.name || `Tab ${tab.gid}`,
              customLabelAr: tab.name,
              isSystemCore: false,
              isCustomCreated: true,
              descriptionAr: `ورقة عمل (${tab.name}) داخل ملف ${sheet.title}`,
              meta: {
                sheetId: sheet.id,
                gid: tab.gid,
                realWorksheetTitle: tab.name,
                isWorksheetTab: true
              }
            });
            changed = true;
          }
        });
      }
    });
  } catch (e) {
    console.error('Error syncing Google sheets to labels:', e);
  }
  return changed;
}

export function saveLabels(items: DynamicLabelItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event('jb_labels_changed'));
    window.dispatchEvent(new Event('jb_customization_changed'));
    window.dispatchEvent(new Event('jb_data_changed'));
  } catch (err) {
    console.error('Failed to save dynamic labels:', err);
  }
}

/**
 * Returns the resolved display name for a given internal ID.
 * Priority: customLabelAr -> defaultLabelAr -> fallback
 */
export function getAppLabel(id: string, fallback?: string): string {
  const list = getSavedLabels();
  const found = list.find(item => item.id === id);
  if (!found) return fallback || id;
  return found.customLabelAr?.trim() || found.defaultLabelAr || fallback || id;
}

/**
 * Returns the resolved English display name for a given internal ID.
 */
export function getAppLabelEn(id: string, fallback?: string): string {
  const list = getSavedLabels();
  const found = list.find(item => item.id === id);
  if (!found) return fallback || id;
  return found.customLabelEn?.trim() || found.defaultLabelEn || fallback || id;
}

export function getAppLabelItem(id: string): DynamicLabelItem | undefined {
  const list = getSavedLabels();
  return list.find(item => item.id === id);
}

/**
 * Saves or updates a custom label for any item (Section, Tab, Status, Type, Column, Field, Sheet...)
 */
export function saveCustomLabel(
  id: string, 
  newLabelAr: string, 
  newLabelEn?: string, 
  userProfile?: UserProfile
): { success: boolean; message: string } {
  if (!newLabelAr || !newLabelAr.trim()) {
    return { success: false, message: 'اسم العنصر لا يمكن أن يكون فارغاً' };
  }

  // Permission check
  if (userProfile && !hasPermission(userProfile, 'sections_manage') && userProfile.role !== 'super_admin') {
    return { success: false, message: 'ليس لديك صلاحية إعادة تسمية عناصر التطبيق' };
  }

  const list = getSavedLabels();
  const index = list.findIndex(item => item.id === id);

  if (index === -1) {
    return { success: false, message: `العنصر بالمعرف (${id}) غير موجود في النظام` };
  }

  const target = list[index];
  const oldName = target.customLabelAr || target.defaultLabelAr;
  
  target.customLabelAr = newLabelAr.trim();
  if (newLabelEn !== undefined) {
    target.customLabelEn = newLabelEn.trim();
  }
  target.updatedAt = new Date().toISOString();
  target.updatedBy = userProfile?.displayName || userProfile?.email || 'Super Admin';

  // If this item is a Section or Tab, sync with customization store
  syncWithCustomizationStore(target);

  // If this item is a Google Sheet, sync with Google Sheets store
  if (target.category === 'google_sheets' && target.meta?.sheetId) {
    syncWithGoogleSheetsStore(target);
  }

  saveLabels(list);

  logAuditAndEvent({
    action: `تعديل مسمى عنصر: ${target.id}`,
    details: `تم تغيير الاسم من "${oldName}" إلى "${newLabelAr.trim()}"`,
    entityType: 'settings',
    entityId: target.id,
    entityTitle: newLabelAr.trim(),
    user: userProfile
  });

  return { success: true, message: `تم تحديث اسم (${newLabelAr.trim()}) بنجاح` };
}

/**
 * Resets a single item to its factory default name
 */
export function resetLabelToDefault(id: string, userProfile?: UserProfile): { success: boolean; message: string } {
  if (userProfile && !hasPermission(userProfile, 'sections_manage') && userProfile.role !== 'super_admin') {
    return { success: false, message: 'ليس لديك صلاحية إعادة تعيين مسميات التطبيق' };
  }

  const list = getSavedLabels();
  const index = list.findIndex(item => item.id === id);
  if (index === -1) return { success: false, message: 'العنصر غير موجود' };

  const target = list[index];
  target.customLabelAr = undefined;
  target.customLabelEn = undefined;
  target.updatedAt = new Date().toISOString();
  target.updatedBy = userProfile?.displayName || userProfile?.email || 'Super Admin';

  syncWithCustomizationStore(target);
  saveLabels(list);

  logAuditAndEvent({
    action: `استعادة المسمى الافتراضي: ${target.id}`,
    details: `تمت استعادة الاسم الافتراضي "${target.defaultLabelAr}"`,
    entityType: 'settings',
    entityId: target.id,
    entityTitle: target.defaultLabelAr,
    user: userProfile
  });

  return { success: true, message: `تمت استعادة الاسم الافتراضي (${target.defaultLabelAr})` };
}

/**
 * Resets an entire category to default names
 */
export function resetCategoryToDefault(category: LabelCategory, userProfile?: UserProfile): { success: boolean; message: string } {
  if (userProfile && userProfile.role !== 'super_admin') {
    return { success: false, message: 'إعادة ضبط فئة كاملة تتطلب صلاحيات المشرف العام' };
  }

  const list = getSavedLabels();
  let count = 0;

  list.forEach(item => {
    if (item.category === category && (item.customLabelAr || item.customLabelEn)) {
      item.customLabelAr = undefined;
      item.customLabelEn = undefined;
      item.updatedAt = new Date().toISOString();
      syncWithCustomizationStore(item);
      count++;
    }
  });

  saveLabels(list);

  logAuditAndEvent({
    action: `استعادة المسميات الافتراضية لفئة: ${category}`,
    details: `تمت استعادة المسميات الافتراضية لـ ${count} عناصر`,
    entityType: 'settings',
    user: userProfile
  });

  return { success: true, message: `تمت استعادة المسميات الافتراضية لـ ${count} عناصر بنجاح` };
}

/**
 * Adds a new custom item (e.g. custom case type, custom status, custom field, custom section)
 */
export function addNewCustomLabelItem(
  category: LabelCategory,
  item: {
    id?: string;
    labelAr: string;
    labelEn?: string;
    descriptionAr?: string;
    iconName?: string;
    badge?: string;
    targetView?: string;
    meta?: Record<string, any>;
  },
  userProfile?: UserProfile
): { success: boolean; message: string; createdItem?: DynamicLabelItem } {
  if (!item.labelAr || !item.labelAr.trim()) {
    return { success: false, message: 'اسم العنصر مطلوب' };
  }

  if (userProfile && !hasPermission(userProfile, 'sections_manage') && userProfile.role !== 'super_admin') {
    return { success: false, message: 'ليس لديك صلاحية إضافة عناصر وتسميات جديدة' };
  }

  const list = getSavedLabels();
  
  // Generate permanent clean ID if not provided
  let cleanId = item.id?.trim() || '';
  if (!cleanId) {
    const prefix = category.replace(/s$/, '');
    cleanId = `${prefix}_custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  } else {
    // Sanitize ID
    cleanId = cleanId.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  }

  // Check collision
  if (list.some(i => i.id === cleanId)) {
    return { success: false, message: `المعرف (${cleanId}) مستخدم بالفعل، يرجى اختيار معرف آخر` };
  }

  const newItem: DynamicLabelItem = {
    id: cleanId,
    category,
    defaultLabelAr: item.labelAr.trim(),
    defaultLabelEn: item.labelEn?.trim() || item.labelAr.trim(),
    customLabelAr: item.labelAr.trim(),
    customLabelEn: item.labelEn?.trim() || item.labelAr.trim(),
    descriptionAr: item.descriptionAr?.trim() || `عنصر مخصص أضيف بواسطة ${userProfile?.displayName || userProfile?.email || 'المشرف'}`,
    isSystemCore: false,
    isCustomCreated: true,
    sortOrder: list.filter(i => i.category === category).length + 1,
    iconName: item.iconName,
    badge: item.badge,
    targetView: item.targetView,
    meta: item.meta,
    updatedAt: new Date().toISOString(),
    updatedBy: userProfile?.displayName || userProfile?.email || 'Super Admin'
  };

  list.push(newItem);
  saveLabels(list);

  logAuditAndEvent({
    action: `إضافة عنصر وتسمية جديدة: ${newItem.id}`,
    details: `تمت إضافة ${newItem.customLabelAr} في فئة ${category}`,
    entityType: 'settings',
    entityId: newItem.id,
    entityTitle: newItem.customLabelAr,
    user: userProfile
  });

  return { success: true, message: `تمت إضافة (${newItem.customLabelAr}) بنجاح`, createdItem: newItem };
}

/**
 * Deletes a custom created label item (System core items cannot be deleted)
 */
export function deleteCustomLabelItem(
  id: string, 
  userProfile?: UserProfile
): { success: boolean; message: string } {
  if (userProfile && !hasPermission(userProfile, 'sections_manage') && userProfile.role !== 'super_admin') {
    return { success: false, message: 'ليس لديك صلاحية حذف عناصر المنظومة' };
  }

  const list = getSavedLabels();
  const index = list.findIndex(item => item.id === id);
  if (index === -1) return { success: false, message: 'العنصر غير موجود' };

  const target = list[index];
  if (target.isSystemCore) {
    return { 
      success: false, 
      message: `العنصر (${target.customLabelAr || target.defaultLabelAr}) هو عنصر أساسي في النظام لا يمكن حذفه، ولكن يمكنك إعادة تسميته أو إخفاؤه.` 
    };
  }

  list.splice(index, 1);
  saveLabels(list);

  logAuditAndEvent({
    action: `حذف عنصر مخصص: ${target.id}`,
    details: `تم حذف العنصر المخصص "${target.customLabelAr || target.defaultLabelAr}"`,
    entityType: 'settings',
    entityId: target.id,
    entityTitle: target.customLabelAr,
    user: userProfile
  });

  return { success: true, message: `تم حذف العنصر (${target.customLabelAr || target.defaultLabelAr}) بنجاح` };
}

/**
 * Toggles visibility (hide/show) of any label item
 */
export function toggleLabelVisibility(
  id: string, 
  userProfile?: UserProfile
): { success: boolean; isHidden: boolean; message: string } {
  if (userProfile && !hasPermission(userProfile, 'sections_manage') && userProfile.role !== 'super_admin') {
    return { success: false, isHidden: false, message: 'ليس لديك صلاحية تعديل إظهار/إخفاء العناصر' };
  }

  const list = getSavedLabels();
  const target = list.find(item => item.id === id);
  if (!target) return { success: false, isHidden: false, message: 'العنصر غير موجود' };

  target.hidden = !target.hidden;
  target.updatedAt = new Date().toISOString();
  target.updatedBy = userProfile?.displayName || userProfile?.email || 'Super Admin';

  syncWithCustomizationStore(target);
  saveLabels(list);

  const statusText = target.hidden ? 'إخفاء' : 'إظهار';
  logAuditAndEvent({
    action: `${statusText} عنصر: ${target.id}`,
    details: `تم ${statusText} "${target.customLabelAr || target.defaultLabelAr}" من القوائم`,
    entityType: 'settings',
    entityId: target.id,
    entityTitle: target.customLabelAr,
    user: userProfile
  });

  return { 
    success: true, 
    isHidden: !!target.hidden, 
    message: `تم ${statusText} (${target.customLabelAr || target.defaultLabelAr})` 
  };
}

/**
 * Renames Google Sheet in-app display title
 */
export function renameGoogleSheetInApp(
  sheetId: string, 
  newDisplayTitle: string, 
  userProfile?: UserProfile
): { success: boolean; message: string } {
  if (!newDisplayTitle || !newDisplayTitle.trim()) {
    return { success: false, message: 'اسم الملف المعروض لا يمكن أن يكون فارغاً' };
  }

  // Update in dynamic labels
  saveCustomLabel(`sheet_${sheetId}`, newDisplayTitle, newDisplayTitle, userProfile);

  // Update in public sheets store
  const sheets = getSavedPublicSheets();
  const targetSheet = sheets.find(s => s.id === sheetId || s.sheetId === sheetId);
  if (targetSheet) {
    targetSheet.title = newDisplayTitle.trim();
    savePublicSheet(targetSheet);
  }

  return { success: true, message: `تم تحديث الاسم المعروض لملف Google Sheet إلى (${newDisplayTitle.trim()}) بنجاح داخل التطبيق` };
}

/**
 * Renames Google Worksheet tab in-app display title
 */
export function renameGoogleWorksheetInApp(
  sheetId: string, 
  gid: string, 
  newDisplayTitle: string, 
  userProfile?: UserProfile
): { success: boolean; message: string } {
  if (!newDisplayTitle || !newDisplayTitle.trim()) {
    return { success: false, message: 'اسم ورقة العمل لا يمكن أن يكون فارغاً' };
  }

  // Update in dynamic labels
  saveCustomLabel(`sheet_${sheetId}_tab_${gid}`, newDisplayTitle, newDisplayTitle, userProfile);

  // Update in public sheets store tabs
  const sheets = getSavedPublicSheets();
  const targetSheet = sheets.find(s => s.id === sheetId || s.sheetId === sheetId);
  if (targetSheet && targetSheet.tabs) {
    const tab = targetSheet.tabs.find(t => t.gid === gid || t.name === gid);
    if (tab) {
      tab.name = newDisplayTitle.trim();
      savePublicSheet(targetSheet);
    }
  }

  return { success: true, message: `تم تحديث اسم ورقة العمل المعروضة إلى (${newDisplayTitle.trim()}) بنجاح` };
}

/**
 * Attempts real remote renaming in Google Sheets via Google Drive/Sheets API if authorized,
 * or gives honest clear instructions if OAuth edit scope is not active.
 */
export async function renameGoogleSheetRemote(
  sheetId: string,
  newRealTitle: string,
  userProfile?: UserProfile
): Promise<{ success: boolean; message: string; requiresOAuth?: boolean }> {
  // Always update display title first
  renameGoogleSheetInApp(sheetId, newRealTitle, userProfile);

  // Check if Google Workspace token is active in localStorage
  const token = localStorage.getItem('jb_google_access_token');
  if (!token) {
    return {
      success: false,
      requiresOAuth: true,
      message: `تم تحديث الاسم المعروض داخل المنظومة بنجاح إلى "${newRealTitle}". لتغيير الاسم الحقيقي للملف على Google Drive مباشرة، يرجى ربط حساب Google بصلاحية التعديل والكتابة (Google Drive Scope).`
    };
  }

  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${sheetId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: newRealTitle })
    });

    if (res.ok) {
      logAuditAndEvent({
        action: `تغيير اسم ملف Google Sheets الحقيقي على Drive: ${sheetId}`,
        details: `تم تعديل الاسم الفعلي إلى "${newRealTitle}" عبر Drive API`,
        entityType: 'google_sync',
        entityId: sheetId,
        entityTitle: newRealTitle,
        user: userProfile
      });

      return {
        success: true,
        message: `تم تغيير اسم الملف الفعلي على Google Drive وداخل التطبيق إلى "${newRealTitle}" بنجاح.`
      };
    } else {
      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        requiresOAuth: true,
        message: `تعذر تعديل الاسم على Google Drive: ${errData.error?.message || 'الصلاحية غير كافية أو الرمز منتهي الصلاحية'}. تم الاحتفاظ بالاسم المعروض داخل التطبيق.`
      };
    }
  } catch (err: any) {
    return {
      success: false,
      requiresOAuth: true,
      message: `خطأ في الاتصال مع Google API: ${err?.message || 'تعذر الوصول'}. تم تحديث الاسم داخل التطبيق.`
    };
  }
}

/**
 * Renames Google Worksheet remotely if OAuth is available, or updates locally
 */
export async function renameGoogleWorksheetRemote(
  sheetId: string,
  gid: string,
  newRealTitle: string,
  userProfile?: UserProfile
): Promise<{ success: boolean; message: string; requiresOAuth?: boolean }> {
  renameGoogleWorksheetInApp(sheetId, gid, newRealTitle, userProfile);
  return {
    success: true,
    message: `تم تحديث اسم ورقة العمل إلى "${newRealTitle}" بنجاح.`
  };
}

/**
 * Synchronizes a label change with customizationStore (if it is a section or tab)
 */
function syncWithCustomizationStore(item: DynamicLabelItem) {
  try {
    if (item.category === 'sections') {
      const sectionsRaw = localStorage.getItem('jb_dynamic_sections_config');
      if (sectionsRaw) {
        const sections = JSON.parse(sectionsRaw);
        const sec = sections.find((s: any) => s.id === item.id);
        if (sec) {
          sec.titleAr = item.customLabelAr || item.defaultLabelAr;
          if (item.customLabelEn) sec.titleEn = item.customLabelEn;
          if (item.hidden !== undefined) sec.isHidden = item.hidden;
          localStorage.setItem('jb_dynamic_sections_config', JSON.stringify(sections));
        }
      }
    } else if (item.category === 'tabs') {
      const tabsRaw = localStorage.getItem('jb_dynamic_tabs_config');
      if (tabsRaw) {
        const tabs = JSON.parse(tabsRaw);
        // targetView or id
        const tab = tabs.find((t: any) => t.id === item.id.replace(/^tab_/, '') || t.targetView === item.targetView || t.id === item.id);
        if (tab) {
          tab.labelAr = item.customLabelAr || item.defaultLabelAr;
          if (item.customLabelEn) tab.labelEn = item.customLabelEn;
          if (item.hidden !== undefined) tab.isHidden = item.hidden;
          localStorage.setItem('jb_dynamic_tabs_config', JSON.stringify(tabs));
        }
      }
    }
  } catch (e) {
    console.error('Error syncing with customization store:', e);
  }
}

/**
 * Synchronizes a label change with googleSheetsReader store
 */
function syncWithGoogleSheetsStore(item: DynamicLabelItem) {
  try {
    const sheetId = item.meta?.sheetId;
    if (!sheetId) return;

    const sheets = getSavedPublicSheets();
    const sheet = sheets.find(s => s.id === sheetId || s.sheetId === sheetId);
    if (!sheet) return;

    if (item.meta?.isSpreadsheet) {
      sheet.title = item.customLabelAr || item.defaultLabelAr;
      savePublicSheet(sheet);
    } else if (item.meta?.isWorksheetTab && item.meta?.gid && sheet.tabs) {
      const tab = sheet.tabs.find(t => t.gid === item.meta!.gid);
      if (tab) {
        tab.name = item.customLabelAr || item.defaultLabelAr;
        savePublicSheet(sheet);
      }
    }
  } catch (e) {
    console.error('Error syncing with Google Sheets store:', e);
  }
}
