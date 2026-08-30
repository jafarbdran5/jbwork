import { logAuditAndEvent } from './audit';
import { UserProfile } from '../types';

export interface ManualArticleStep {
  stepNumber: number;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  tipAr?: string;
  tipEn?: string;
  badge?: string;
}

export interface ManualArticle {
  id: string;
  chapterId: string;
  titleAr: string;
  titleEn: string;
  summaryAr: string;
  summaryEn: string;
  contentMarkdownAr: string;
  contentMarkdownEn: string;
  steps?: ManualArticleStep[];
  targetModuleId?: string; // e.g. 'cases', 'sheets', 'team', 'life_os'
  requiredPermission?: string; // Permission needed to read or execute this manual article
  allowedRoles?: string[]; // If restricted to specific roles
  tags: string[];
  sortOrder: number;
  isImportant?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ManualChapter {
  id: string;
  titleAr: string;
  titleEn: string;
  iconName: string;
  sortOrder: number;
  descriptionAr: string;
  descriptionEn: string;
}

export const INITIAL_MANUAL_CHAPTERS: ManualChapter[] = [
  {
    id: 'intro',
    titleAr: '1. المقدمة ومعمارية المنظومة',
    titleEn: '1. Introduction & Architecture',
    iconName: 'Sparkles',
    sortOrder: 1,
    descriptionAr: 'الرؤية العامة، استقلالية النظام، العمل أوفلاين فاست دون خوادم إجبارية.',
    descriptionEn: 'System vision, offline-first autonomy, zero mandatory cloud friction.'
  },
  {
    id: 'auth_security',
    titleAr: '2. تسجيل الدخول وحماية الحسابات',
    titleEn: '2. Login & Account Security',
    iconName: 'KeyRound',
    sortOrder: 2,
    descriptionAr: 'الدخول المحلي، الحساب الرئيسي، تبديل المشرفين، إدارة الجلسات.',
    descriptionEn: 'Local login, master owner credentials, session security.'
  },
  {
    id: 'dashboard_home',
    titleAr: '3. الصفحة الرئيسية ولوحة العمل',
    titleEn: '3. Home Dashboard & Focus',
    iconName: 'LayoutDashboard',
    sortOrder: 3,
    descriptionAr: 'المؤشرات الحية، الإجراءات السريعة، خطة اليوم وإدارة الحياة.',
    descriptionEn: 'Live metrics, quick actions, daily plan, and Life OS.'
  },
  {
    id: 'cases_system',
    titleAr: '4. إدارة القضايا والملفات الشاملة',
    titleEn: '4. Cases & Anti-Duplicate System',
    iconName: 'Layers',
    sortOrder: 4,
    descriptionAr: 'إنشاء القضايا، اكتشاف التكرار، دمج البيانات، إدارة المراحل، إغلاق القضية.',
    descriptionEn: 'Case lifecycle, duplicate detection, case merging, workflow closure.'
  },
  {
    id: 'intake_requests',
    titleAr: '5. مركز الاستقبال والطلبات الخارجية',
    titleEn: '5. Intake & External Requests',
    iconName: 'Inbox',
    sortOrder: 5,
    descriptionAr: 'استقبال النماذج، استجابات النماذج، التحويل الذكي لقضايا ومهام.',
    descriptionEn: 'Processing forms, external sheet rows, and converting to active cases.'
  },
  {
    id: 'clients_directory',
    titleAr: '6. دليل الموكلين والمعرف الفريد',
    titleEn: '6. Clients Directory & IDs',
    iconName: 'Users',
    sortOrder: 6,
    descriptionAr: 'إضافة الموكلين، المعرف الدائم (CLT-ID)، ربط الموكل بكافة قضاياه.',
    descriptionEn: 'Client profiles, unique client identifiers, unified case history.'
  },
  {
    id: 'tasks_tracking',
    titleAr: '7. إدارة المهام والمتابعات اليومية',
    titleEn: '7. Tasks & Todos Tracking',
    iconName: 'CheckSquare',
    sortOrder: 7,
    descriptionAr: 'إنشاء المهام، ربطها بالقضايا أو الشيت، الأولويات، والمواعيد.',
    descriptionEn: 'Task creation, linking to cases or sheets, priorities and deadlines.'
  },
  {
    id: 'google_sheets_hub',
    titleAr: '8. ربط Google Sheets واكتشاف الأوراق',
    titleEn: '8. Google Sheets & Auto-Tabs Hub',
    iconName: 'FileSpreadsheet',
    sortOrder: 8,
    descriptionAr: 'الربط السريع، اكتشاف جميع أوراق العمل (Auto-Tabs)، توجيه الشيت للأقسام.',
    descriptionEn: 'Zero-auth sheets integration, multi-tab auto discovery, functional mapping.'
  },
  {
    id: 'support_portals_guide',
    titleAr: '9. بوابات دعم الشركات والمنصات',
    titleEn: '9. Official Support Portals',
    iconName: 'Globe',
    sortOrder: 9,
    descriptionAr: 'الروابط الرسمية المعتمدة لـ Meta، Google، TikTok، X، Telegram وغيرها.',
    descriptionEn: 'Verified official support channels for Meta, Google, TikTok, Telegram, etc.'
  },
  {
    id: 'team_supervisors_rbac',
    titleAr: '10. إدارة المشرفين والأدوار والصلاحيات',
    titleEn: '10. Team, Roles & RBAC',
    iconName: 'ShieldCheck',
    sortOrder: 10,
    descriptionAr: 'إنشاء الأدوار المخصصة، ضبط الصلاحيات الدقيقة، تخصيص واجهة كل مشرف.',
    descriptionEn: 'Custom roles, permission matrix, per-supervisor UI personalization.'
  },
  {
    id: 'ai_assistant_guide',
    titleAr: '11. المساعد الذكي وأوامر التشغيل',
    titleEn: '11. AI Operations Assistant',
    iconName: 'Sparkles',
    sortOrder: 11,
    descriptionAr: 'الاستعلامات الذكية، استخراج الإحصائيات، إنشاء المهام، حماية الصلاحيات.',
    descriptionEn: 'Natural language queries, instant stats, action triggers, strict safety.'
  },
  {
    id: 'trash_safe_delete',
    titleAr: '12. الحذف الآمن وفحص التبعيات وسلة المهملات',
    titleEn: '12. Safe Deletion & Dependency Check',
    iconName: 'Trash2',
    sortOrder: 12,
    descriptionAr: 'التحذير عند حذف العناصر المرتبطة، الحذف العادي، الحذف الشامل، والاسترجاع.',
    descriptionEn: 'Dependency checks before delete, standalone vs cascade delete, trash recovery.'
  },
  {
    id: 'system_customization',
    titleAr: '13. تخصيص التطبيق والأقسام والإعدادات',
    titleEn: '13. App Customization & Settings',
    iconName: 'Settings',
    sortOrder: 13,
    descriptionAr: 'إضافة الأقسام، إنشاء التبويبات، تعديل الأسماء، والنسخ الاحتياطي JSON.',
    descriptionEn: 'Dynamic sections, custom tabs builder, renaming, JSON backup & restore.'
  }
];

export const INITIAL_MANUAL_ARTICLES: ManualArticle[] = [
  // Intro Chapter
  {
    id: 'art_intro_overview',
    chapterId: 'intro',
    titleAr: 'ما هي منظومة جعفر بدران وما الهدف منها؟',
    titleEn: 'Overview & Mission of Jaafar Bdran System',
    summaryAr: 'نظام إداري وشخصي فائق السرعة صمم لتمكين إدارة الأعمال القانونية والتقنية وإدارة الحياة الشخصية باستقلالية تامة.',
    summaryEn: 'High-speed administrative and personal OS engineered for legal & digital operations with total local autonomy.',
    contentMarkdownAr: `### منظومة جعفر بدران (Jaafar Bdran System)

تعتبر هذه المنظومة بيئة تشغيلية وإدارية متطورة تدمج بين:
1. **إدارة القضايا والملفات الرقمية:** استقبال البلاغات، منع التكرار، متابعة المهام، وإدارة الأتعاب.
2. **الاستقلالية التامة (Local-First):** المنظومة تعمل محلياً بنسبة 100% دون أي توقف في حال انقطاع الإنترنت أو عدم توفر خوادم خارجية.
3. **التخصيص الشامل:** يستطيع المشرف العام تشكيل الأقسام، علامات التبويب، الأدوار، والصلاحيات بحرية تامة من داخل لوحة الإدارة.`,
    contentMarkdownEn: 'Complete local-first management ecosystem designed for speed, security, and full autonomy.',
    steps: [
      {
        stepNumber: 1,
        titleAr: 'الاستقلالية الفورية',
        titleEn: 'Instant Autonomy',
        descriptionAr: 'جميع البيانات والعمليات تنفذ وتحفظ محلياً فور إدخالها.',
        descriptionEn: 'All data is stored and executed immediately locally.'
      },
      {
        stepNumber: 2,
        titleAr: 'التزامن المرن',
        titleEn: 'Flexible Sync',
        descriptionAr: 'تزامن اختياري مع Google Sheets والسحابة بنقرة زر واحدة دون إجبار.',
        descriptionEn: 'Optional one-click sync with Google Sheets and cloud backup.'
      }
    ],
    tags: ['مقدمة', 'overview', 'نظام', 'استقلالية'],
    sortOrder: 1,
    isImportant: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // Auth & Security Chapter
  {
    id: 'art_auth_login',
    chapterId: 'auth_security',
    titleAr: 'تسجيل الدخول، إدارة الحسابات، والجلسات النشطة',
    titleEn: 'Login, Account Management & Active Sessions',
    summaryAr: 'شرح آلية تسجيل الدخول بالحساب الرئيسي، تبديل المستخدمين، وتأمين الجلسات.',
    summaryEn: 'Guide on logging in with master credentials, switching accounts, and session security.',
    contentMarkdownAr: `### تسجيل الدخول وحماية الحسابات

- **الدخول المحلي السريع:** يتم تفعيل الجلسة فوراً عبر البريد والرمز السري دون الحاجة لطلب تصاريح سحابية خارجية معقدة.
- **الحساب الرئيسي للمشرف العام:** يملك كامل الصلاحيات لضبط النظام وإدارة المشرفين الآخرين.
- **سجل الأنشطة والأمان:** يتم توثيق أي محاولة دخول أو تغيير صلاحيات في سجل الأمان وسجل العمليات الإدارية.`,
    contentMarkdownEn: 'Fast offline login with security logging for all administrative events.',
    steps: [
      {
        stepNumber: 1,
        titleAr: 'إدخال بيانات المشرف',
        titleEn: 'Enter Credentials',
        descriptionAr: 'أدخل البريد الإلكتروني وكلمة المرور المعتمدة.',
        descriptionEn: 'Enter registered email and secure password.'
      },
      {
        stepNumber: 2,
        titleAr: 'التحقق وتطبيق الواجهة',
        titleEn: 'Apply Customized UI',
        descriptionAr: 'يقوم النظام فوراً بتحميل الصلاحيات والأقسام المخصصة لهذا المشرف بدقة.',
        descriptionEn: 'System immediately loads user-specific permissions and customized tabs.'
      }
    ],
    tags: ['دخول', 'حساب', 'login', 'أمان', 'جلسات'],
    sortOrder: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // Dashboard & Home Chapter
  {
    id: 'art_dashboard_home_guide',
    chapterId: 'dashboard_home',
    titleAr: 'اللوحة الرئيسية ومركز العمل اليومي (My Day & Life OS)',
    titleEn: 'Home Dashboard, My Day, & Life OS Focus Engine',
    summaryAr: 'شرح اللوحة الرئيسية، متابعة الإحصائيات الفورية، إدارة خطة اليوم، ونظام إدارة الحياة الرقمية.',
    summaryEn: 'Comprehensive guide to daily operations, quick stats, today plan, and personal Life OS workflow.',
    contentMarkdownAr: `### اللوحة الرئيسية ومركز العمل اليومي
1. **المؤشرات الحية:**
   - تعرض اللوحة عداد القضايا النشطة، الطلبات المعلقة، المهام العاجلة، والأرباح المحققة.
2. **خطة اليوم (My Day):**
   - تنظيم المهام والتذكيرات ذات الأولوية لليوم الحالي للتركيز دون تشتت.
3. **نظام إدارة الحياة الشخصية (Life OS):**
   - تتبع الأهداف، العادات اليومية، والمشاريع الاستراتيجية جنباً إلى جنب مع العمل القانوني والإداري.`,
    contentMarkdownEn: 'Unified home dashboard combining live case metrics, focused daily agenda, and personal life management.',
    steps: [
      {
        stepNumber: 1,
        titleAr: 'بدء اليوم',
        titleEn: 'Start My Day',
        descriptionAr: 'استعرض المهام ذات الموعد النهائي اليوم والقضايا المجدولة للمتابعة.',
        descriptionEn: 'Review prioritized today tasks and scheduled case follow-ups.'
      },
      {
        stepNumber: 2,
        titleAr: 'الإجراءات السريعة',
        titleEn: 'Quick Actions',
        descriptionAr: 'استخدم الزر العائم أو أزرار الوصول السريع لإنشاء قضية أو مهمة فوراً.',
        descriptionEn: 'Use FAB or quick action buttons to instantly register cases or tasks.'
      }
    ],
    targetModuleId: 'dashboard',
    tags: ['لوحة_التحكم', 'الرئيسية', 'يومي', 'dashboard', 'life_os', 'my_day'],
    sortOrder: 1,
    isImportant: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // Clients Directory Chapter
  {
    id: 'art_clients_directory_guide',
    chapterId: 'clients_directory',
    titleAr: 'دليل الموكلين والمعرف الفريد وملف الموكل الشامل',
    titleEn: 'Clients Directory, Unique Client IDs & Case History',
    summaryAr: 'كيفية إنشاء ملف الموكل، توليد المعرف الدائم (CLT-ID)، واستعراض كافة قضايا ومستندات الموكل.',
    summaryEn: 'Managing clients directory, permanent unique client identifiers (CLT-ID), and aggregated case histories.',
    contentMarkdownAr: `### دليل الموكلين والمعرف الفريد
1. **المعرف الدائم للموكل (CLT-ID):**
   - يولد النظام معرفاً فريداً غير متكرر لكل موكل يربط جميع القضايا والبلاغات والمدفوعات الخاصة به في سجل واحد.
2. **ملف الموكل الموحد:**
   - بنقرة واحدة على اسم الموكل، تشاهد كافة القضايا السابقة والحالية، المبالغ المالية المدفوعة، والملاحظات التاريخية.
3. **الاتصال السريع:**
   - دعم الاتصال الهاتفي المباشر والمحادثة عبر واتساب بنقرة زر واحدة.`,
    contentMarkdownEn: 'Unified client profiles with permanent CLT-IDs aggregating all historical cases, payments, and direct WhatsApp/Phone actions.',
    steps: [
      {
        stepNumber: 1,
        titleAr: 'إضافة أو ربط موكل',
        titleEn: 'Add/Link Client',
        descriptionAr: 'أدخل اسم الموكل ورقم هاتفه، وسيقوم النظام بربطه تلقائياً أو إنشاء سجل جديد.',
        descriptionEn: 'Enter client name and phone; system automatically links or generates a profile.'
      },
      {
        stepNumber: 2,
        titleAr: 'استعراض السجل الشامل',
        titleEn: 'View Full History',
        descriptionAr: 'افتح قسم العملاء لمشاهدة كافة قضايا ومستندات كل عميل.',
        descriptionEn: 'Open Clients module to review all aggregated cases, invoices, and documents.'
      }
    ],
    targetModuleId: 'clients',
    tags: ['عملاء', 'موكلين', 'سجل', 'clients', 'clt-id'],
    sortOrder: 1,
    isImportant: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // Tasks Chapter
  {
    id: 'art_tasks_tracking_guide',
    chapterId: 'tasks_tracking',
    titleAr: 'إدارة المهام والمتابعات وربطها بالقضايا والجداول',
    titleEn: 'Tasks Management, Priorities & Linked Workflows',
    summaryAr: 'إنشاء المهام، تعيين المشرف المسؤول، تحديد الأولويات والمواعيد، وربط المهمة بالقضية.',
    summaryEn: 'Creating actionable tasks, assigning supervisors, configuring priority matrices, and linking to cases.',
    contentMarkdownAr: `### إدارة المهام والمتابعات
1. **إنشاء المهمة وربطها:**
   - يمكن إنشاء مهام مستقلة أو مهام متفرعة من قضية معينة.
2. **الأولويات والحالات:**
   - تصنيف المهمة (عاجلة / عالية / متوسطة / منخفضة) مع تنبيهات تلقائية باقتراب موعد الاستحقاق.
3. **توزيع المهام بين المشرفين:**
   - يستطيع المشرف العام إسناد أي مهمة لعضو فريق محدد ومتابعة نسبة الإنجاز فورياً.`,
    contentMarkdownEn: 'Task assignment and tracking with tight case integration and deadline notifications.',
    targetModuleId: 'tasks',
    tags: ['مهام', 'متابعات', 'tasks', 'todo'],
    sortOrder: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // AI Assistant Chapter
  {
    id: 'art_ai_assistant_operations_guide',
    chapterId: 'ai_assistant_guide',
    titleAr: 'المساعد الذكي: الاستعلامات السريعة وتنفيذ الأوامر بحسب الصلاحيات',
    titleEn: 'AI Operations Assistant: Natural Language & Security Rules',
    summaryAr: 'كيفية استخدام المساعد الذكي لاستخراج الإحصائيات، البحث عن القضايا، وتنفيذ الإجراءات مع الالتزام الصارم بالصلاحيات.',
    summaryEn: 'Guide to AI-powered querying, case summaries, data retrieval, and role-based execution boundaries.',
    contentMarkdownAr: `### المساعد الذكي وأوامر التشغيل
- **الاستعلامات الطبيعية:** يمكنك سؤال المساعد: *"كم قضية مفتوحة لدينا لإنستغرام؟"* أو *"ما هي القضايا العاجلة لليوم؟"*
- **إنشاء المهام والقضايا:** يدعم المساعد تحويل مدخلاتك النصية السريعة إلى مهام وقضايا مسجلة.
- **الحماية الصارمة للصلاحيات:** لا يمكن للمساعد تنفيذ أو كشف أي معلومة لا يملك المستخدم صلاحية الوصول إليها.`,
    contentMarkdownEn: 'Instant AI assistant with strict role-based data security and natural language productivity commands.',
    tags: ['ذكاء_اصطناعي', 'مساعد', 'ai', 'assistant', 'gemini'],
    sortOrder: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // Cases Chapter
  {
    id: 'art_cases_lifecycle',
    chapterId: 'cases_system',
    titleAr: 'دورة حياة القضية: الإنشاء، البحث، منع التكرار، والدمج',
    titleEn: 'Case Lifecycle: Creation, Anti-Duplicate & Merging',
    summaryAr: 'دليل عملي لكيفية إنشاء القضايا، فحص التكرار التلقائي، دمج السجلات، وإغلاق الملفات.',
    summaryEn: 'Complete guide to case registration, automatic duplicate detection, merging, and closure.',
    contentMarkdownAr: `### إدارة القضايا والملفات

1. **إنشاء القضية:**
   - الضغط على زر **"+ إضافة قضية"** أو استخدام اختصار الكيبورد **(Ctrl+N / Cmd+N)**.
   - إدخال عنوان القضية، نوع البلاغ، المنصة المستهدفة، وبيانات الموكل.

2. **نظام كشف التكرار الذكي (Anti-Duplicate Engine):**
   - يقوم النظام أثناء الكتابة بفحص قاعدة البيانات بناءً على **(رقم الهاتف، البريد الإلكتروني، اسم العميل، والروابط)**.
   - *ملاحظة:* رقم القضية لا يُعد معيار تكرار بل معرفاً للملف.
   - عند اكتشاف تطابق، تظهر نافذة تمنحك خيارات: **[فتح القضية السابقة]** أو **[دمج المعلومات]** أو **[إنشاء قضية جديدة]**.

3. **دمج المعلومات:**
   - دمج الملاحظات والروابط وتحديث سجل المتابعات آلياً دون فقدان أي بيانات تاريخية.

4. **إغلاق ومتابعة القضية:**
   - تحديث الحالة إلى (قيد المتابعة / مكتملة / مغلقة) مع توثيق الأتعاب والمهام المرتبطة.`,
    contentMarkdownEn: 'Register cases, leverage instant multi-factor duplicate detection, and seamlessly merge records.',
    steps: [
      {
        stepNumber: 1,
        titleAr: 'بدء التسجيل',
        titleEn: 'Open Quick Case',
        descriptionAr: 'افتح نافذة تسجيل قضية جديدة من الزر العائم أو القائمة.',
        descriptionEn: 'Click New Case or press Ctrl+N.'
      },
      {
        stepNumber: 2,
        titleAr: 'الفحص التلقائي للتكرار',
        titleEn: 'Instant Duplicate Scan',
        descriptionAr: 'يراقب النظام الحقول للتحقق من وجود أي قضية سابقة لنفس العميل أو الهاتف.',
        descriptionEn: 'System monitors phone/email/links to catch existing matching cases.'
      },
      {
        stepNumber: 3,
        titleAr: 'المتابعة والإغلاق',
        titleEn: 'Execution & Closure',
        descriptionAr: 'إضافة المهام وربط المستندات وتغيير الحالة عند الإنجاز.',
        descriptionEn: 'Add linked tasks, attach evidence, and resolve the case.'
      }
    ],
    targetModuleId: 'cases',
    tags: ['قضايا', 'تكرار', 'دمج', 'cases', 'duplicate', 'merge'],
    sortOrder: 1,
    isImportant: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // Intake Requests Chapter
  {
    id: 'art_intake_workflow',
    chapterId: 'intake_requests',
    titleAr: 'مركز الاستقبال: معالجة الطلبات وتحويلها لقضايا',
    titleEn: 'Intake Center: Processing Requests & Conversions',
    summaryAr: 'كيفية استقبال الردود من استمارات Google Forms والشيت وتحويلها لقضايا نشطة.',
    summaryEn: 'Handling incoming requests from forms and sheets, and converting them to active cases with one click.',
    contentMarkdownAr: `### مركز الاستقبال والطلبات الخارجية

- يتيح لك استعراض كافة الصفوف والطلبات الواردة من نماذج الاستقبال الخارجية أو ملفات Google Sheets العامة.
- **التحويل السريع:** بنقرة واحدة على زر "تحويل لقضية"، يتم تعبئة كافة بيانات مقدم الطلب، الروابط، والملاحظات داخل ملف قضية جديد مع إجراء فحص التكرار التلقائي.`,
    contentMarkdownEn: 'Process external form submissions and convert them to internal cases or tasks.',
    targetModuleId: 'external_requests',
    tags: ['استقبال', 'طلبات', 'نماذج', 'forms', 'requests'],
    sortOrder: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // Google Sheets Chapter
  {
    id: 'art_sheets_guide',
    chapterId: 'google_sheets_hub',
    titleAr: 'Google Sheets: إضافة الشيت، اكتشاف الأوراق، وربط الوظائف',
    titleEn: 'Google Sheets: Linking, Auto-Tabs & Function Mapping',
    summaryAr: 'شرح ربط ملفات الشيت العامة واكتشاف جميع التبويبات آلياً (Auto-Tabs) وتوجيه البيانات للأقسام.',
    summaryEn: 'Zero-auth sheet linking, automatic multi-tab discovery, and routing sheets to cases/clients/finance.',
    contentMarkdownAr: `### قارئ Google Sheets المتقدم (Zero-Auth Sheets)

1. **إضافة ملف الشيت:**
   - نسخ رابط المشاركة العام لملف Google Sheet ولصقه في النظام.
   - لا يتطلب إدخال مفاتيح API أو أذونات تسجيل دخول معقدة.

2. **اكتشاف الأوراق التلقائي (Auto-Tabs):**
   - بنقرة زر **"اكتشاف الأوراق"**، يستخرج النظام كافة التبويبات وأوراق العمل داخل الملف تلقائياً.
   - يمكنك التبديل بين أوراق الشيت بسهولة تامة.

3. **ربط الشيت بالوظائف (Function Mapping):**
   - يمكنك تحديد وظيفة الشيت (قسم القضايا، قسم العملاء، قسم المالية، قسم الاستشارات، أو جدول عام).`,
    contentMarkdownEn: 'Connect sheets without API friction, auto-detect tabs, and bind to target system modules.',
    steps: [
      {
        stepNumber: 1,
        titleAr: 'لصق رابط الشيت',
        titleEn: 'Paste Sheet URL',
        descriptionAr: 'ضع رابط Google Sheet المشترك بنظام القراءة العامة.',
        descriptionEn: 'Paste the public Google Sheet sharing URL.'
      },
      {
        stepNumber: 2,
        titleAr: 'اكتشاف الأوراق',
        titleEn: 'Discover Tabs',
        descriptionAr: 'اضغط على "اكتشاف الأوراق" للتعرف على جميع صفحات الملف فوراً.',
        descriptionEn: 'Click Discover Tabs to fetch all internal worksheet names.'
      },
      {
        stepNumber: 3,
        titleAr: 'تحديد الوظيفة',
        titleEn: 'Map Function',
        descriptionAr: 'اختر القسم المستهدف للبيانات (قضايا / عملاء / مالية).',
        descriptionEn: 'Select target module mapping from the header selector.'
      }
    ],
    targetModuleId: 'sheets',
    tags: ['شيت', 'sheets', 'auto-tabs', 'جداول', 'مزامنة'],
    sortOrder: 1,
    isImportant: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // Support Portals Chapter
  {
    id: 'art_support_portals_guide',
    chapterId: 'support_portals_guide',
    titleAr: 'دليل بوابات دعم الشركات والمنصات الرسمية',
    titleEn: 'Guide to Official Platform Support Portals',
    summaryAr: 'كيفية استخدام والبحث في دليل بوابات الدعم الرسمية لحل مشاكل الحسابات المخترقة وانتحال الشخصية.',
    summaryEn: 'How to utilize and search verified platform support portals for recovery and security cases.',
    contentMarkdownAr: `### بوابات الدعم الرسمية

يحتوي هذا القسم على الروابط والوسائل الرسمية المعتمدة بنسبة 100% من قبل كبرى المنصات (Meta، Google، TikTok، X، Telegram، Microsoft، Apple):
- **البحث الذكي:** يمكنك كتابة "انتحال شخصية إنستغرام" أو "حساب فيسبوك مخترق" للوصول المباشر للبوابة الرسمية المعتمدة.
- **معلومات الاتصال الموثقة:** يتضمن كل مدخل طريقة التواصل، البريد الإلكتروني الرسمي، وأرقام الهواتف المعتمدة.
- **التعديل والإدارة:** يستطيع المشرف العام إضافة شركات جديدة وتحديث الروابط حسب التغيرات الرسمية للمنصات.`,
    contentMarkdownEn: 'Verified official corporate support directory for high-priority recovery and security procedures.',
    targetModuleId: 'support_portals',
    tags: ['دعم', 'منصات', 'meta', 'google', 'instagram', 'support'],
    sortOrder: 1,
    isImportant: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // Team & RBAC Chapter
  {
    id: 'art_team_rbac_guide',
    chapterId: 'team_supervisors_rbac',
    titleAr: 'إدارة المشرفين، الأدوار المخصصة، وتخصيص واجهة كل مشرف',
    titleEn: 'Supervisors, Custom Roles & Personalizing Supervisor UI',
    summaryAr: 'شرح إنشاء أدوار جديدة، ضبط مصفوفة الصلاحيات، وتحديد التبويبات المتاحة لكل مشرف.',
    summaryEn: 'Create custom roles, configure granular permissions, and tailor visible tabs per supervisor.',
    contentMarkdownAr: `### الصلاحيات وتخصيص واجهات المشرفين

1. **الأدوار الديناميكية:**
   - لا تقتصر المنظومة على (مشرف / مستخدم)، بل يمكنك إنشاء أدوار مخصصة مثل: **(مشرف قضايا، مشرف استقبال، مشرف مهام، مشرف بيانات، مشرف دعم)** أو أي دور مستقبلي.

2. **الصلاحيات الحبيبية (Granular Permissions):**
   - أكثر من 25 صلاحية دقيقة تشمل مشاهدة وتعديل وحذف كل عنصر على حدة.

3. **تخصيص واجهة كل مشرف:**
   - تحديد علامات التبويب الظاهرة للمشرف.
   - تحديد الصفحة الرئيسية الافتراضية له.
   - حجب الأقسام الإدارية أو غير المصرح بها تلقائياً.`,
    contentMarkdownEn: 'Dynamic role definitions, granular permissions, and individual supervisor UI customization.',
    requiredPermission: 'team_manage',
    targetModuleId: 'team',
    tags: ['مشرفين', 'صلاحيات', 'ادوار', 'تخصيص واجهة', 'rbac'],
    sortOrder: 1,
    isImportant: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // Safe Deletion Chapter
  {
    id: 'art_trash_safe_delete_guide',
    chapterId: 'trash_safe_delete',
    titleAr: 'الحذف الآمن، فحص التبعيات، واسترجاع سلة المهملات',
    titleEn: 'Safe Deletion, Dependency Warnings & Trash Recovery',
    summaryAr: 'شرح نظام التحذير من التبعيات وخياري الحذف (حذف العنصر فقط أم حذف العنصر والبيانات المرتبطة).',
    summaryEn: 'Learn how dependency checks protect linked records with explicit choice between item-only and cascade delete.',
    contentMarkdownAr: `### الحذف الآمن وحماية البيانات

عند حذف أي قسم، علامة تبويب، موكل، أو قضية مرتبطة ببيانات أخرى:
- **تحذير التبعيات التلقائي:** يعرض النظام رسالة:
  *"هذا العنصر مرتبط بـ (X) من البيانات/المهام/القضايا. ماذا تريد أن تفعل؟"*
- **خيارات الحذف:**
  1. **حذف العنصر فقط:** إزالة العنصر المستهدف مع الإبقاء على البيانات المرتبطة مفصولة وسليمة.
  2. **حذف العنصر والبيانات المرتبطة:** حذف شامل يتطلب تأكيداً كتابياً صريحاً لمنع الحذف العرضي.
- **سلة المهملات:** إمكانية استعادة أي عنصر محذوف فوراً بنقرة زر واحدة.`,
    contentMarkdownEn: 'Smart dependency analysis prevents accidental orphan data loss with safe trash recovery.',
    tags: ['حذف', 'سلة المهملات', 'تبعيات', 'امان', 'trash', 'delete'],
    sortOrder: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // Customization & Settings Chapter
  {
    id: 'art_customization_system_guide',
    chapterId: 'system_customization',
    titleAr: 'تخصيص بنية التطبيق: إضافة أقسام، علامات تبويب، وصفحات جديدة',
    titleEn: 'App Customization: Adding Sections, Tabs, and Pages',
    summaryAr: 'دليل المشرف العام لإعادة تشكيل هيكل التطبيق وقوائمه وأزراره دون تعديل الكود البرمجي.',
    summaryEn: 'How the Super Admin can dynamically restructure tabs, sections, and views without writing code.',
    contentMarkdownAr: `### تخصيص التطبيق بالكامل من لوحة الإدارة

يستطيع المشرف العام:
- إضافة أقسام جديدة وتعديل أسمائها أو ترتيبها أو إخفاؤها مؤقتاً.
- إنشاء علامات تبويب جديدة (تحديد الاسم، الأيقونة، القسم المرتبط، الصفحة المفتوحة، والصلاحية المطلوبة).
- تظهر التبويبات تلقائياً للمشرفين المسموح لهم فور حفظ التعديلات دون الحاجة لتحديث البرنامج.`,
    contentMarkdownEn: 'Dynamic navigation and layout customization managed entirely within the administrative dashboard.',
    requiredPermission: 'sections_manage',
    targetModuleId: 'settings',
    tags: ['تخصيص', 'اقسام', 'تبويبات', 'customization', 'tabs', 'sections'],
    sortOrder: 1,
    isImportant: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
];

const LOCAL_MANUAL_CHAPTERS_KEY = 'jb_manual_chapters_db';
const LOCAL_MANUAL_ARTICLES_KEY = 'jb_manual_articles_db';

export function getSavedManualChapters(): ManualChapter[] {
  if (typeof window === 'undefined') return INITIAL_MANUAL_CHAPTERS;
  try {
    const raw = localStorage.getItem(LOCAL_MANUAL_CHAPTERS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_MANUAL_CHAPTERS_KEY, JSON.stringify(INITIAL_MANUAL_CHAPTERS));
      return INITIAL_MANUAL_CHAPTERS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Merge any new initial chapters that don't exist in saved
      const existingIds = new Set(parsed.map((c: any) => c.id));
      const missing = INITIAL_MANUAL_CHAPTERS.filter(c => !existingIds.has(c.id));
      if (missing.length > 0) {
        const merged = [...parsed, ...missing];
        localStorage.setItem(LOCAL_MANUAL_CHAPTERS_KEY, JSON.stringify(merged));
        return merged;
      }
      return parsed;
    }
  } catch (e) {
    console.warn('Manual chapters load error:', e);
  }
  return INITIAL_MANUAL_CHAPTERS;
}

export function getSavedManualArticles(): ManualArticle[] {
  if (typeof window === 'undefined') return INITIAL_MANUAL_ARTICLES;
  try {
    const raw = localStorage.getItem(LOCAL_MANUAL_ARTICLES_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_MANUAL_ARTICLES_KEY, JSON.stringify(INITIAL_MANUAL_ARTICLES));
      return INITIAL_MANUAL_ARTICLES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Merge any initial articles that might be missing in older stored data
      const existingIds = new Set(parsed.map((a: any) => a.id));
      const missing = INITIAL_MANUAL_ARTICLES.filter(a => !existingIds.has(a.id));
      if (missing.length > 0) {
        const merged = [...parsed, ...missing];
        localStorage.setItem(LOCAL_MANUAL_ARTICLES_KEY, JSON.stringify(merged));
        return merged;
      }
      return parsed;
    }
  } catch (e) {
    console.warn('Manual articles load error:', e);
  }
  return INITIAL_MANUAL_ARTICLES;
}

export function saveManualArticle(
  article: ManualArticle,
  userProfile?: UserProfile | null
): ManualArticle[] {
  const current = getSavedManualArticles();
  const existingIdx = current.findIndex(a => a.id === article.id);
  const now = new Date().toISOString();

  let updatedList: ManualArticle[];
  if (existingIdx >= 0) {
    updatedList = [...current];
    updatedList[existingIdx] = { ...article, updatedAt: now };
  } else {
    const newArticle: ManualArticle = {
      ...article,
      id: article.id || `art_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now,
      updatedAt: now
    };
    updatedList = [newArticle, ...current];
  }

  localStorage.setItem(LOCAL_MANUAL_ARTICLES_KEY, JSON.stringify(updatedList));

  logAuditAndEvent({
    action: existingIdx >= 0 ? 'UPDATE_MANUAL_ARTICLE' : 'CREATE_MANUAL_ARTICLE',
    details: `${existingIdx >= 0 ? 'تعديل' : 'إضافة'} مقال في دليل التشغيل: (${article.titleAr})`,
    entityType: 'manual_article',
    entityId: article.id,
    entityTitle: article.titleAr,
    user: userProfile || undefined
  });

  window.dispatchEvent(new CustomEvent('jb_data_changed', { detail: { type: 'manual_articles' } }));
  return updatedList;
}

export function deleteManualArticle(
  articleId: string,
  userProfile?: UserProfile | null
): ManualArticle[] {
  const current = getSavedManualArticles();
  const target = current.find(a => a.id === articleId);
  const updatedList = current.filter(a => a.id !== articleId);

  localStorage.setItem(LOCAL_MANUAL_ARTICLES_KEY, JSON.stringify(updatedList));

  if (target) {
    logAuditAndEvent({
      action: 'DELETE_MANUAL_ARTICLE',
      details: `حذف مقال من دليل التشغيل: (${target.titleAr})`,
      entityType: 'manual_article',
      entityId: articleId,
      entityTitle: target.titleAr,
      user: userProfile || undefined
    });
  }

  window.dispatchEvent(new CustomEvent('jb_data_changed', { detail: { type: 'manual_articles' } }));
  return updatedList;
}

export function resetManualToDefault(): { chapters: ManualChapter[]; articles: ManualArticle[] } {
  localStorage.setItem(LOCAL_MANUAL_CHAPTERS_KEY, JSON.stringify(INITIAL_MANUAL_CHAPTERS));
  localStorage.setItem(LOCAL_MANUAL_ARTICLES_KEY, JSON.stringify(INITIAL_MANUAL_ARTICLES));
  window.dispatchEvent(new CustomEvent('jb_data_changed', { detail: { type: 'manual_articles' } }));
  return { chapters: INITIAL_MANUAL_CHAPTERS, articles: INITIAL_MANUAL_ARTICLES };
}
