import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'ar' | 'en';

interface Translations {
  [key: string]: {
    ar: string;
    en: string;
  };
}

const translations: Translations = {
  // Brand & Header
  appName: { ar: 'JB Work', en: 'JB Work' },
  appSubtitle: { ar: 'نظام عمل جعفر بدران الداخلي', en: 'Jaafar Bdran Internal Work System' },
  appDesc: { ar: 'منظومة داخلية لإدارة القضايا والعمل والمهام والمتابعة', en: 'Private Internal Case & Work Management System' },
  privateWorkspaceBadge: { ar: 'نظام عمل خاص وداخلي', en: 'Private Internal Workspace' },
  footerCopyright: { ar: '© جعفر بدران — JB Work', en: '© Jaafar Bdran — JB Work' },
  footerNote: { ar: 'نظام خاص للاستخدام الداخلي والمصرح به فقط', en: 'Private internal system for authorized use only' },

  // Navigation
  navDashboard: { ar: 'لوحة التحكم', en: 'Dashboard' },
  navCases: { ar: 'القضايا', en: 'Cases' },
  navMyCases: { ar: 'قضاياي', en: 'My Cases' },
  navJaafarWorkspace: { ar: 'مساحة جعفر', en: 'Jaafar Workspace' },
  navExternalRequests: { ar: 'الطلبات الخارجية', en: 'External Requests' },
  navClients: { ar: 'العملاء', en: 'Clients' },
  navTasks: { ar: 'المهام', en: 'Tasks' },
  navReminders: { ar: 'التذكيرات', en: 'Reminders' },
  navRequests: { ar: 'الطلبات الداخلية', en: 'Internal Requests' },
  navPayments: { ar: 'المدفوعات', en: 'Payments' },
  navTeam: { ar: 'الفريق', en: 'Team' },
  navReports: { ar: 'التقارير والإحصائيات', en: 'Reports & Analytics' },
  navActivityLog: { ar: 'سجل النشاط والتدقيق', en: 'Activity Log' },
  navTrash: { ar: 'سلة المحذوفات', en: 'Trash' },
  navSettings: { ar: 'الإعدادات', en: 'Settings' },

  // Quick Action
  newCase: { ar: 'قضية جديدة', en: 'New Case' },
  quickCase: { ar: 'إنشاء سريع', en: 'Quick Create' },
  searchPlaceholder: { ar: 'بحث سريع في القضايا، الأرقام، العملاء، الروابط... (اضغط /)', en: 'Search cases, JB numbers, clients, URLs... (Press /)' },
  commandPaletteHint: { ar: 'أوامر سريعة', en: 'Command Palette' },

  // Greetings & Dashboard
  goodMorning: { ar: 'صباح الخير،', en: 'Good morning,' },
  goodAfternoon: { ar: 'مساء الخير،', en: 'Good afternoon,' },
  goodEvening: { ar: 'مساء الخير،', en: 'Good evening,' },
  myWorkToday: { ar: 'عملي اليوم', en: 'My Work Today' },
  commandCenter: { ar: 'مركز العمليات والمتابعة الخاصة', en: 'Private Operations & Command Center' },

  // Statuses
  status_new: { ar: 'جديدة', en: 'New' },
  status_in_progress: { ar: 'قيد العمل', en: 'In Progress' },
  status_pending: { ar: 'معلقة / بانتظار رد', en: 'Pending' },
  status_overdue: { ar: 'متأخرة', en: 'Overdue' },
  status_completed: { ar: 'منتهية', en: 'Completed' },
  status_cancelled: { ar: 'ملغاة', en: 'Cancelled' },

  // Priorities
  priority_low: { ar: 'منخفضة', en: 'Low' },
  priority_medium: { ar: 'متوسطة', en: 'Medium' },
  priority_high: { ar: 'عالية', en: 'High' },
  priority_urgent: { ar: 'عاجلة جداً', en: 'Urgent' },

  // Stats
  totalCases: { ar: 'إجمالي القضايا', en: 'Total Cases' },
  activeCases: { ar: 'القضايا النشطة', en: 'Active Cases' },
  urgentCases: { ar: 'القضايا العاجلة', en: 'Urgent Cases' },
  pendingCases: { ar: 'القضايا المعلقة', en: 'Pending Cases' },
  completedCases: { ar: 'القضايا المنتهية', en: 'Completed Cases' },
  todayReminders: { ar: 'تذكيرات اليوم', en: 'Today\'s Reminders' },
  overdueTasks: { ar: 'المهام المتأخرة', en: 'Overdue Tasks' },
  newRequests: { ar: 'الطلبات الجديدة', en: 'New Requests' },

  // Filters & Tabs
  filterAll: { ar: 'الكل', en: 'All' },
  filterNew: { ar: 'الجديدة', en: 'New' },
  filterInProgress: { ar: 'قيد العمل', en: 'In Progress' },
  filterPending: { ar: 'المعلقة', en: 'Pending' },
  filterOverdue: { ar: 'المتأخرة', en: 'Overdue' },
  filterCompleted: { ar: 'المنتهية', en: 'Completed' },

  // Case Workspace Tabs
  tabInfo: { ar: 'المعلومات', en: 'Information' },
  tabTimeline: { ar: 'سير الأحداث (Timeline)', en: 'Timeline' },
  tabTasks: { ar: 'المهام', en: 'Tasks' },
  tabReminders: { ar: 'التذكيرات', en: 'Reminders' },
  tabAttachments: { ar: 'المرفقات والملفات', en: 'Attachments' },
  tabLinks: { ar: 'الروابط والأدلة', en: 'Links & URLs' },
  tabPayments: { ar: 'المدفوعات والمالية', en: 'Payments' },
  tabNotes: { ar: 'الملاحظات الداخلية', en: 'Internal Notes' },
  tabAudit: { ar: 'سجل تدقيق القضية', en: 'Audit Log' },

  // Common UI
  save: { ar: 'حفظ', en: 'Save' },
  saving: { ar: 'جارٍ الحفظ...', en: 'Saving...' },
  cancel: { ar: 'إلغاء', en: 'Cancel' },
  delete: { ar: 'حذف', en: 'Delete' },
  restore: { ar: 'استعادة', en: 'Restore' },
  edit: { ar: 'تعديل', en: 'Edit' },
  add: { ar: 'إضافة', en: 'Add' },
  search: { ar: 'بحث', en: 'Search' },
  filter: { ar: 'تصفية', en: 'Filter' },
  export: { ar: 'تصدير', en: 'Export' },
  view: { ar: 'عرض', en: 'View' },
  close: { ar: 'إغلاق', en: 'Close' },
  open: { ar: 'فتح', en: 'Open' },
  assign: { ar: 'تعيين موظف', en: 'Assign User' },
  unassigned: { ar: 'غير معيّن', en: 'Unassigned' },
  back: { ar: 'رجوع', en: 'Back' },
  confirm: { ar: 'تأكيد', en: 'Confirm' },
  
  // Case Details
  caseNumber: { ar: 'رقم القضية (JB)', en: 'JB Case Number' },
  externalNumber: { ar: 'الرقم الخارجي / مرجع المنصة', en: 'External / Ref Number' },
  caseType: { ar: 'نوع القضية', en: 'Case Type' },
  platform: { ar: 'المنصة', en: 'Platform' },
  caseTitle: { ar: 'عنوان / ملخص القضية', en: 'Case Title / Summary' },
  caseTitlePlaceholder: { ar: 'مثال: انتحال صفحة شركة على إنستغرام', en: 'e.g. Impersonation of official page on Instagram' },
  client: { ar: 'العميل', en: 'Client' },
  assignedEmployee: { ar: 'الموظف المسؤول', en: 'Assigned User' },
  priority: { ar: 'الأولوية', en: 'Priority' },
  status: { ar: 'الحالة', en: 'Status' },
  createdDate: { ar: 'تاريخ الإنشاء', en: 'Created Date' },
  lastUpdated: { ar: 'آخر تحديث', en: 'Last Updated' },
  nextFollowUp: { ar: 'موعد المتابعة القادم', en: 'Next Follow-up' },
  
  // Offline & Sync
  statusOnline: { ar: 'متصل بالسحابة', en: 'Cloud Online' },
  statusOffline: { ar: 'وضع العمل بدون إنترنت', en: 'Offline Mode' },
  statusSyncing: { ar: 'جارٍ مزامنة البيانات...', en: 'Syncing Data...' },
  statusSynced: { ar: 'تمت المزامنة بنجاح', en: 'Synced' },
  offlineSavedNotice: { ar: 'تعذر حفظ التغييرات حالياً، وسيتم الاحتفاظ بها محلياً ومحاولة المزامنة لاحقاً عند توفر الاتصال.', en: 'Unable to save changes right now. They are stored locally and will be synchronized when connection is restored.' },
  trustDeviceNotice: { ar: 'توثيق هذا الجهاز للعمل السريع والاحتفاظ بالبيانات محلياً', en: 'Trust this device for faster offline work and local caching' },
  clearLocalData: { ar: 'تسجيل الخروج ومسح التخزين المؤقت المحلي', en: 'Sign Out & Clear Local Cache' },

  // Empty states
  noCasesFound: { ar: 'لا توجد قضايا بعد', en: 'No cases found' },
  noCasesSub: { ar: 'ابدأ بإضافة أول قضية إلى نظام عمل جعفر بدران بنقرة واحدة.', en: 'Start by creating the first case in the JB Work system with a single click.' },
  noTasksFound: { ar: 'لا توجد مهام حالياً', en: 'No tasks currently' },
  noRemindersToday: { ar: 'لا توجد تذكيرات مستحقة اليوم', en: 'No reminders due today' },
  noClientsFound: { ar: 'لا يوجد عملاء مسجلين', en: 'No clients registered' },
  noRequestsFound: { ar: 'لا توجد طلبات داخلية', en: 'No internal requests' },
  noAttachmentsFound: { ar: 'لا توجد مرفقات في هذه القضية', en: 'No attachments in this case' },
  noLinksFound: { ar: 'لا توجد روابط مسجلة في هذه القضية', en: 'No links recorded in this case' },

  // Roles
  role_super_admin: { ar: 'المالك والمشرف العام (Super Admin)', en: 'Super Admin (Owner)' },
  role_admin: { ar: 'مدير عمليات (Admin)', en: 'Operations Admin' },
  role_manager: { ar: 'مدير فريق (Manager)', en: 'Team Manager' },
  role_employee: { ar: 'أخصائي قضايا (Employee)', en: 'Case Specialist' },
  role_viewer: { ar: 'مراقب قراءة فقط (Viewer)', en: 'Viewer (Read Only)' },

  // Client & Financial details
  clientName: { ar: 'اسم العميل', en: 'Client Name' },
  clientPhone: { ar: 'رقم هاتف العميل', en: 'Client Phone Number' },
  clientPhonePlaceholder: { ar: 'مثال: 09XXXXXXXX أو +963...', en: 'e.g. +963 9XX XXX XXX' },
  clientNamePlaceholder: { ar: 'الاسم الكامل للعميل أو جهة الاتصال', en: 'Full client name or organization' },
  caseCost: { ar: 'تكلفة القضية', en: 'Case Cost' },
  caseCostPlaceholder: { ar: 'أدخل المبلغ المتفق عليه...', en: 'Enter agreed amount...' },
  currency: { ar: 'العملة', en: 'Currency' },
  currencySYP: { ar: 'ليرة سورية (SYP)', en: 'Syrian Pound (SYP)' },
  currencyUSD: { ar: 'دولار أمريكي (USD)', en: 'US Dollar (USD)' },
  currencySYPShort: { ar: 'ل.س', en: 'SYP' },
  currencyUSDShort: { ar: '$', en: '$' },
  clientAndFinancials: { ar: 'بيانات العميل والتكلفة المالية', en: 'Client & Financial Details' },
  callClient: { ar: 'اتصال', en: 'Call' },
  whatsappClient: { ar: 'واتساب', en: 'WhatsApp' },

  // Multiple Files & Links additions
  addMultipleFiles: { ar: 'رفع مستندات / صور / فيديو (متعدد)', en: 'Upload Documents / Images / Videos' },
  dragOrSelectFiles: { ar: 'اسحب الملفات هنا أو انقر للاختيار (يمكنك تحديد عدة مستندات، صور وفيديوهات دفعة واحدة)', en: 'Drag files here or click to select (Multiple documents, photos & videos supported)' },
  attachedFilesCount: { ar: 'المستندات والمرفقات المحددة', en: 'Selected Documents & Attachments' },
  caseLinksSection: { ar: 'روابط القضية والحسابات المستهدفة', en: 'Case URLs & Target Links' },
  addAnotherLink: { ar: '+ إضافة رابط آخر', en: '+ Add another link' },
  bulkPasteLinks: { ar: 'لصق روابط متعددة دفعة واحدة', en: 'Paste multiple URLs at once' },
  bulkPastePlaceholder: { ar: 'الصق هنا حتى 20 رابطاً أو أكثر (كل رابط في سطر منفصل)...', en: 'Paste up to 20+ URLs here (one link per line)...' },
  applyBulkLinks: { ar: 'إدراج الروابط الملصقة', en: 'Insert Pasted Links' },
  linkTitlePlaceholder: { ar: 'وصف أو نوع الرابط (مثال: الحساب الأصلي، الحساب المزيف، المنشور، البلاغ...)', en: 'Link title/type (e.g. Original account, Impersonator, Post, Report...)' },
  linkUrlPlaceholder: { ar: 'https://...', en: 'https://...' },
  removeLink: { ar: 'حذف', en: 'Remove' },
  removeFile: { ar: 'إزالة الملف', en: 'Remove file' },
  totalLinks: { ar: 'الروابط', en: 'Links' },
  totalAttachments: { ar: 'المرفقات', en: 'Attachments' },
  deleteLinkConfirm: { ar: 'هل أنت متأكد من حذف هذا الرابط؟', en: 'Are you sure you want to delete this link?' },
  deleteAttachmentConfirm: { ar: 'هل أنت متأكد من حذف هذا المرفق؟', en: 'Are you sure you want to delete this attachment?' },

  // Internal User / Admin Management
  addTeamMember: { ar: 'إضافة عضو / مسؤول جديد', en: 'Add Member / Admin' },
  createAccountForEmployee: { ar: 'إنشاء حساب وتعيين الصلاحيات من داخل النظام', en: 'Create Internal Account & Set Permissions' },
  loginCredentials: { ar: 'بيانات تسجيل الدخول للموظف', en: 'Employee Login Credentials' },
  copyCredentials: { ar: 'نسخ بيانات الدخول للموظف', en: 'Copy Login Info' },
  credentialsCopied: { ar: 'تم نسخ بيانات الدخول إلى الحافظة بنجاح!', en: 'Login credentials copied to clipboard!' },
  sendViaWhatsApp: { ar: 'إرسال عبر واتساب', en: 'Send via WhatsApp' },
  generatePassword: { ar: 'توليد كلمة مرور قوية', en: 'Generate Strong Password' },
  passwordLabel: { ar: 'كلمة المرور', en: 'Password' },
  fullName: { ar: 'الاسم الكامل', en: 'Full Name' },
  jobTitle: { ar: 'المسمى الوظيفي / التخصص', en: 'Job Title / Specialization' },
  roleAndPermissions: { ar: 'الدور والصلاحيات الأمنية', en: 'Role & Security Permissions' },
  accountStatus: { ar: 'حالة الحساب', en: 'Account Status' },
  activeStatus: { ar: 'نشط ومصرح له بالدخول', en: 'Active & Authorized' },
  inactiveStatus: { ar: 'معطل / موقوف مؤقتاً', en: 'Inactive / Suspended' },
  sendResetEmail: { ar: 'إرسال رابط استعادة كلمة المرور', en: 'Send Password Reset Link' },
  resetEmailSent: { ar: 'تم إرسال رابط استعادة كلمة المرور إلى البريد بنجاح!', en: 'Password reset link sent to email!' },
  deleteMemberConfirm: { ar: 'هل أنت متأكد من حذف هذا العضو نهائياً؟', en: 'Are you sure you want to delete this member?' },
  cannotDeleteSuperAdmin: { ar: 'لا يمكن حذف حساب المشرف العام الرئيسي (جعفر بدران).', en: 'Cannot delete the Super Admin account (Jaafar Bdran).' },
  userCreatedSuccess: { ar: 'تم إنشاء حساب العضو بنجاح وتعيين الصلاحيات!', en: 'Member account created & permissions assigned!' },
  provideCredentialsToUser: { ar: 'يمكنك الآن تزويد الموظف بهذه البيانات ليتمكن من تسجيل الدخول مباشرة إلى المنظومة.', en: 'You can now provide these credentials to the employee to log in directly.' },
  unauthorizedAccountMsg: { ar: 'هذا الحساب غير مصرح له بالدخول. يجب أن يقوم المشرف العام (جعفر بدران) بإنشاء حسابك وتحديد صلاحياتك من داخل النظام أولاً.', en: 'This account is not authorized. The Super Admin must create your account from inside the system first.' },
  accountDeactivatedMsg: { ar: 'تم إيقاف هذا الحساب من قبل الإدارة. يرجى مراجعة المشرف العام.', en: 'This account has been deactivated by the administration.' },
  credentialsCardTitle: { ar: 'تم إنشاء الحساب — بيانات الدخول للموظف', en: 'Account Created — Employee Login Details' },
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('jb_language');
    return (saved === 'en' || saved === 'ar') ? saved : 'ar';
  });

  const isRTL = language === 'ar';

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('jb_language', lang);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  }, [language, isRTL]);

  const t = (key: string): string => {
    if (translations[key]) {
      return translations[key][language] || translations[key].ar;
    }
    return key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, toggleLanguage, t, isRTL }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
