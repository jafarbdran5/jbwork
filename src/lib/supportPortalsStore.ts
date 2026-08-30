import { logAuditAndEvent } from './audit';
import { UserProfile } from '../types';

export type SupportCategory = 
  | 'hacked' 
  | 'impersonation' 
  | 'recovery' 
  | 'content_removal' 
  | 'copyright' 
  | 'verification' 
  | 'ads_business' 
  | 'safety' 
  | 'general';

export interface SupportPortalItem {
  id: string;
  company: string; // e.g. Meta, Google, TikTok, X, Telegram, Microsoft, Apple, Snapchat
  platformName: string; // e.g. Facebook, Instagram, YouTube, Gmail, TikTok, X
  serviceNameAr: string; // e.g. استرداد الحساب المخترق
  serviceNameEn: string; // e.g. Compromised Account Recovery
  descriptionAr: string;
  descriptionEn: string;
  category: SupportCategory;
  officialUrl: string; // Verified official URL ONLY
  isVerifiedOfficial: boolean;
  contactMethodAr: string; // e.g. نموذج أمان رسمي مشفر، بريد إلكتروني، مركز المساعدة
  contactMethodEn: string;
  officialEmail?: string;
  officialPhone?: string;
  notesAr?: string;
  notesEn?: string;
  sortOrder: number;
  isHidden?: boolean;
  isPopular?: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export const INITIAL_SUPPORT_PORTALS: SupportPortalItem[] = [
  // ================= META / FACEBOOK =================
  {
    id: 'sp_meta_fb_hacked',
    company: 'Meta',
    platformName: 'Facebook',
    serviceNameAr: 'استرداد الحساب المخترق',
    serviceNameEn: 'Compromised Account Recovery',
    descriptionAr: 'البوابة الرسمية لتأمين واسترداد حسابات فيسبوك التي تم تغيير معلومات تسجيل الدخول أو اختراقها.',
    descriptionEn: 'Official portal to secure and recover hacked or compromised Facebook accounts.',
    category: 'hacked',
    officialUrl: 'https://www.facebook.com/hacked',
    isVerifiedOfficial: true,
    contactMethodAr: 'معالج الاسترداد الآلي الرسمي من فيسبوك',
    contactMethodEn: 'Official Automated Security Flow',
    notesAr: 'يتطلب الوصول من متصفح أو جهاز تم استخدامه سابقاً للدخول لزيادة نسبة القبول الفوري.',
    notesEn: 'Best performed from a previously recognized device or browser.',
    sortOrder: 1,
    isPopular: true,
    tags: ['facebook', 'meta', 'hacked', 'مخترق', 'استرداد', 'تهكير', 'فيسبوك', 'password'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_meta_fb_impersonation',
    company: 'Meta',
    platformName: 'Facebook',
    serviceNameAr: 'الإبلاغ عن انتحال الشخصية',
    serviceNameEn: 'Report Impersonation Profile',
    descriptionAr: 'النموذج الرسمي لحظر وإغلاق الحسابات والصفحات المزورة التي تنتحل هوية أشخاص أو شركات.',
    descriptionEn: 'Official form to report fake accounts or pages impersonating real individuals or brands.',
    category: 'impersonation',
    officialUrl: 'https://www.facebook.com/help/contact/295309487309948',
    isVerifiedOfficial: true,
    contactMethodAr: 'نموذج الإبلاغ عن انتحال الهوية الرسمي',
    contactMethodEn: 'Official Impersonation Report Form',
    notesAr: 'يستوجب رفع صورة بطاقة هوية رسمية أو سجل تجاري لإثبات الهوية وإغلاق الحساب المنتحل.',
    notesEn: 'Requires uploading official government ID or commercial registration.',
    sortOrder: 2,
    isPopular: true,
    tags: ['facebook', 'meta', 'impersonation', 'انتحال', 'مزور', 'حساب مزيف', 'فيسبوك', 'هوية'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_meta_fb_disabled',
    company: 'Meta',
    platformName: 'Facebook',
    serviceNameAr: 'الطعن في الحسابات المعطلة',
    serviceNameEn: 'Disabled Account Appeal',
    descriptionAr: 'بوابة الالتماس الرسمية لإعادة تفعيل حسابات فيسبوك المعطلة عن طريق الخطأ.',
    descriptionEn: 'Official appeal form to restore wrongfully disabled Facebook accounts.',
    category: 'recovery',
    officialUrl: 'https://www.facebook.com/help/contact/260749603972907',
    isVerifiedOfficial: true,
    contactMethodAr: 'نموذج مراجعة الحسابات المعطلة',
    contactMethodEn: 'Official Account Review Form',
    notesAr: 'يرجى تقديم الاسم المسجل على الحساب تماماً كما هو في الهوية الرسمية.',
    sortOrder: 3,
    isPopular: true,
    tags: ['facebook', 'disabled', 'معطل', 'محظور', 'باند', 'طعن', 'استرجاع'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_meta_fb_copyright',
    company: 'Meta',
    platformName: 'Facebook',
    serviceNameAr: 'الإبلاغ عن انتهاك حقوق الملكية الفكرية',
    serviceNameEn: 'Copyright & Trademark Report',
    descriptionAr: 'بوابة حماية حقوق الملكية والعلامات التجارية لحذف المحتوى المسروق على منصات Meta.',
    descriptionEn: 'Official portal to submit DMCA and trademark infringement claims.',
    category: 'copyright',
    officialUrl: 'https://www.facebook.com/help/contact/1758255661104383',
    isVerifiedOfficial: true,
    contactMethodAr: 'نموذج DMCA وحقوق النشر الرسمي',
    contactMethodEn: 'Official DMCA Notice Form',
    officialEmail: 'ip@fb.com',
    notesAr: 'مخصص للمؤلفين، الشركات، والوكلاء القانونيين لإزالة المحتوى المخالف.',
    sortOrder: 4,
    tags: ['facebook', 'meta', 'copyright', 'حقوق نشر', 'علامة تجارية', 'سرقة محتوى'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // ================= META / INSTAGRAM =================
  {
    id: 'sp_meta_ig_hacked',
    company: 'Meta',
    platformName: 'Instagram',
    serviceNameAr: 'استرداد حساب إنستغرام المخترق',
    serviceNameEn: 'Instagram Hacked Account Recovery',
    descriptionAr: 'مركز الدعم الرسمي لمعالجة اختراق حسابات إنستغرام وتأمينها عبر رابط التحقق الذاتي.',
    descriptionEn: 'Official portal to recover and secure hacked Instagram accounts.',
    category: 'hacked',
    officialUrl: 'https://www.instagram.com/hacked',
    isVerifiedOfficial: true,
    contactMethodAr: 'بوابة Instagram Hacked المباشرة',
    contactMethodEn: 'Official Self-Service Security Hub',
    notesAr: 'يتضمن خيار التقاط فيديو سيلفي لمطابقة الوجه مع صور الحساب لاسترداده.',
    notesEn: 'Includes video selfie identity verification flow.',
    sortOrder: 5,
    isPopular: true,
    tags: ['instagram', 'ig', 'انستغرام', 'انستا', 'مخترق', 'تهكير', 'استرداد'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_meta_ig_impersonation',
    company: 'Meta',
    platformName: 'Instagram',
    serviceNameAr: 'انتحال شخصية على إنستغرام',
    serviceNameEn: 'Instagram Impersonation Report',
    descriptionAr: 'النموذج الرسمي لحذف حسابات إنستغرام المنتحلة لشخصيات عامة أو أفراد أو أنشطة تجارية.',
    descriptionEn: 'Official form to report fake Instagram accounts impersonating real persons.',
    category: 'impersonation',
    officialUrl: 'https://help.instagram.com/contact/636276399721841',
    isVerifiedOfficial: true,
    contactMethodAr: 'نموذج بلاغ انتحال الهوية الرسمي',
    contactMethodEn: 'Official Identity Theft Form',
    notesAr: 'يجب تقديم وثيقة هوية صادرة عن جهة حكومية سارية المفعول.',
    sortOrder: 6,
    isPopular: true,
    tags: ['instagram', 'impersonation', 'انتحال', 'حساب مزور', 'انستا', 'هوية'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_meta_ig_disabled',
    company: 'Meta',
    platformName: 'Instagram',
    serviceNameAr: 'استعادة حساب إنستغرام المعطل',
    serviceNameEn: 'Instagram Disabled Account Appeal',
    descriptionAr: 'طلب إعادة النظر في إغلاق أو تعطيل حساب إنستغرام لأسباب إرشادات المجتمع.',
    descriptionEn: 'Appeal to restore a deactivated or banned Instagram account.',
    category: 'recovery',
    officialUrl: 'https://help.instagram.com/contact/606967319425838',
    isVerifiedOfficial: true,
    contactMethodAr: 'نموذج التماس الحسابات المعطلة',
    contactMethodEn: 'Official Account Reactivation Appeal',
    notesAr: 'عادة ما ترسل المنصة رمزاً عبر البريد لتدوينه بخط اليد بجانب صورة الوجه.',
    sortOrder: 7,
    isPopular: true,
    tags: ['instagram', 'disabled', 'معطل', 'باند', 'انستا', 'حظر'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // ================= GOOGLE / YOUTUBE =================
  {
    id: 'sp_google_account_recovery',
    company: 'Google',
    platformName: 'Google Account',
    serviceNameAr: 'استرداد حساب Google / Gmail',
    serviceNameEn: 'Google Account Recovery',
    descriptionAr: 'البوابة الرسمية الوحيدة لاستعادة الوصول لحسابات Google و Gmail المخترقة أو المفقودة.',
    descriptionEn: 'The single official portal to recover compromised or lost Google accounts.',
    category: 'recovery',
    officialUrl: 'https://accounts.google.com/signin/recovery',
    isVerifiedOfficial: true,
    contactMethodAr: 'معالج استرداد Google الرسمي',
    contactMethodEn: 'Google Account Recovery Wizard',
    notesAr: 'استخدم جهازاً وشبكة Wi-Fi تم الدخول منها مسبقاً، واحتفظ برموز الأمان الاحتياطية (Backup Codes).',
    sortOrder: 8,
    isPopular: true,
    tags: ['google', 'gmail', 'recovery', 'جوجل', 'جيميل', 'استرداد', 'حساب جوجل', 'مخترق'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_google_yt_hijacked',
    company: 'Google',
    platformName: 'YouTube',
    serviceNameAr: 'استرداد قناة YouTube المخترقة',
    serviceNameEn: 'Recover Hijacked YouTube Channel',
    descriptionAr: 'النموذج المخصص لصناع المحتوى لاسترجاع القنوات التي تم الاستيلاء عليها أو تغيير بثها.',
    descriptionEn: 'Official assistance flow for creators with compromised or hijacked YouTube channels.',
    category: 'hacked',
    officialUrl: 'https://support.google.com/youtube/answer/76187',
    isVerifiedOfficial: true,
    contactMethodAr: 'فريق دعم منشئي المحتوى (Creator Support)',
    contactMethodEn: 'YouTube Creator Support Team',
    notesAr: 'يمكن أيضاً مراسلة حساب @TeamYouTube على منصة X للحصول على تذكرة استرداد عاجلة.',
    sortOrder: 9,
    isPopular: true,
    tags: ['youtube', 'google', 'channel', 'يوتيوب', 'قناة', 'اختراق', 'سرقة قناة'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_google_legal_removal',
    company: 'Google',
    platformName: 'Google Search & Products',
    serviceNameAr: 'طلب إزالة محتوى لأسباب قانونية',
    serviceNameEn: 'Remove Content from Google for Legal Reasons',
    descriptionAr: 'البوابة الرسمية لحذف نتائج البحث والمحتوى التشهيري وانتهاك الخصوصية من خوادم Google.',
    descriptionEn: 'Official portal to request legal removal of defamation, doxed data, and sensitive info from Google Search.',
    category: 'content_removal',
    officialUrl: 'https://support.google.com/legal/troubleshooter/1114905',
    isVerifiedOfficial: true,
    contactMethodAr: 'بوابة إزالة المحتوى القانوني الرسمية',
    contactMethodEn: 'Google Legal Removal Portal',
    notesAr: 'تشمل إزالة التشهير، البيانات الشخصية الحساسة، الصور غير المصرح بها، والانتهاكات القضائية.',
    sortOrder: 10,
    isPopular: true,
    tags: ['google', 'legal', 'removal', 'تشهير', 'حذف نتائج', 'خصوصية', 'قانوني'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // ================= TIKTOK =================
  {
    id: 'sp_tiktok_feedback_recovery',
    company: 'TikTok',
    platformName: 'TikTok',
    serviceNameAr: 'استرداد الحساب والبلاغات الرسمية',
    serviceNameEn: 'TikTok Feedback & Account Help',
    descriptionAr: 'النموذج الرسمي المباشر لمراسلة دعم تيك توك لحل مشاكل الحسابات المحظورة والمخترقة.',
    descriptionEn: 'Official feedback and support form for locked, banned, or hacked TikTok accounts.',
    category: 'recovery',
    officialUrl: 'https://www.tiktok.com/legal/report/feedback',
    isVerifiedOfficial: true,
    contactMethodAr: 'نموذج ملاحظات ودعم TikTok الرسمي',
    contactMethodEn: 'Official TikTok Feedback Form',
    officialEmail: 'feedback@tiktok.com',
    notesAr: 'حدد فئة "General Account Inquiry" أو "Hacked Account" مع إرفاق اسم المستخدم الدقيق.',
    sortOrder: 11,
    isPopular: true,
    tags: ['tiktok', 'تيكتوك', 'تيك توك', 'حظر', 'اختراق', 'استرجاع', 'feedback'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_tiktok_impersonation',
    company: 'TikTok',
    platformName: 'TikTok',
    serviceNameAr: 'الإبلاغ عن انتحال شخصية على TikTok',
    serviceNameEn: 'Report Impersonation on TikTok',
    descriptionAr: 'بوابة مخصصة للإبلاغ عن الحسابات الوهمية التي تنتحل هوية أو علامة تجارية على TikTok.',
    descriptionEn: 'Official safety portal to report impersonating accounts on TikTok.',
    category: 'impersonation',
    officialUrl: 'https://www.tiktok.com/legal/report/impersonation',
    isVerifiedOfficial: true,
    contactMethodAr: 'نموذج انتحال الهوية المعتمد',
    contactMethodEn: 'Official Impersonation Form',
    sortOrder: 12,
    tags: ['tiktok', 'impersonation', 'انتحال', 'تيك توك', 'حساب مزيف'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // ================= X (FORMERLY TWITTER) =================
  {
    id: 'sp_x_hacked_compromised',
    company: 'X Corp',
    platformName: 'X (Twitter)',
    serviceNameAr: 'استرداد حساب X المخترق',
    serviceNameEn: 'Recover Hacked X Account',
    descriptionAr: 'البوابة الرسمية لشركة X لتأمين الحسابات المخترقة أو التي لا يمكن تسجيل الدخول إليها.',
    descriptionEn: 'Official portal for compromised and locked accounts on X (Twitter).',
    category: 'hacked',
    officialUrl: 'https://help.twitter.com/forms/signin',
    isVerifiedOfficial: true,
    contactMethodAr: 'نموذج مشاكل الدخول والاختراق',
    contactMethodEn: 'Official Login Support Form',
    notesAr: 'اختر "I need help regaining access to my account" ثم "I believe my account is compromised".',
    sortOrder: 13,
    isPopular: true,
    tags: ['x', 'twitter', 'تويتر', 'إكس', 'مخترق', 'اختراق', 'استرداد'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_x_impersonation',
    company: 'X Corp',
    platformName: 'X (Twitter)',
    serviceNameAr: 'الإبلاغ عن انتحال الهوية على X',
    serviceNameEn: 'Report Impersonation on X',
    descriptionAr: 'النموذج الرسمي للإبلاغ عن الحسابات التي تدعي تمثيل شخصك أو مؤسستك دون إذن.',
    descriptionEn: 'Official form to report impersonation on X (Twitter).',
    category: 'impersonation',
    officialUrl: 'https://help.twitter.com/forms/impersonation',
    isVerifiedOfficial: true,
    contactMethodAr: 'نموذج الانتحال الرسمي',
    contactMethodEn: 'Official Impersonation Form',
    sortOrder: 14,
    tags: ['x', 'twitter', 'impersonation', 'انتحال', 'تويتر', 'تزييف'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // ================= TELEGRAM =================
  {
    id: 'sp_telegram_support',
    company: 'Telegram',
    platformName: 'Telegram',
    serviceNameAr: 'الدعم الرسمي واسترداد حسابات تيليجرام',
    serviceNameEn: 'Telegram Official Support',
    descriptionAr: 'نموذج الاتصال الرسمي بفريق أمان ودعم تيليجرام لمشاكل الحسابات والحظر.',
    descriptionEn: 'Official contact portal for Telegram security and account issues.',
    category: 'recovery',
    officialUrl: 'https://telegram.org/support',
    isVerifiedOfficial: true,
    contactMethodAr: 'نموذج الدعم العام من Telegram',
    contactMethodEn: 'Telegram Web Support Form',
    officialEmail: 'support@telegram.org',
    notesAr: 'للحسابات المحظورة تلقائياً يمكن أيضاً التواصل مع بوت @SpamBot داخل التطبيق.',
    sortOrder: 15,
    isPopular: true,
    tags: ['telegram', 'تيليجرام', 'تليغرام', 'حظر', 'اختراق', 'spambot'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_telegram_impersonation_scam',
    company: 'Telegram',
    platformName: 'Telegram',
    serviceNameAr: 'الإبلاغ عن انتحال الهوية والاحتيال في Telegram',
    serviceNameEn: 'Report Telegram Scam / Impersonation',
    descriptionAr: 'القناة الرسمية لإغلاق القنوات والبوتات والحسابات الاحتيالية التي تنتحل هوية رسمية.',
    descriptionEn: 'Official channel to report scam bots, channels, and impersonators.',
    category: 'impersonation',
    officialUrl: 'https://t.me/notoscam',
    isVerifiedOfficial: true,
    contactMethodAr: 'بوت مكافحة الاحتيال الرسمي @notoscam والبريد',
    contactMethodEn: 'Official @notoscam bot & Abuse Email',
    officialEmail: 'abuse@telegram.org',
    notesAr: 'أرسل روابط القنوات أو معرفات البوتات مع أدلة إثبات الهوية للبريد أو البوت الرسمي.',
    sortOrder: 16,
    tags: ['telegram', 'scam', 'احتيال', 'انتحال', 'تيليجرام', 'بوت'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // ================= WHATSAPP =================
  {
    id: 'sp_whatsapp_support',
    company: 'Meta',
    platformName: 'WhatsApp',
    serviceNameAr: 'دعم واسترداد حسابات واتساب المعطلة والمخترقة',
    serviceNameEn: 'WhatsApp Contact Support',
    descriptionAr: 'البوابة الرسمية للتواصل مع فريق دعم واتساب لفك حظر الأرقام أو استرداد الحسابات المسروقة.',
    descriptionEn: 'Official WhatsApp support portal to appeal banned numbers or hijacked sessions.',
    category: 'recovery',
    officialUrl: 'https://www.whatsapp.com/contact/',
    isVerifiedOfficial: true,
    contactMethodAr: 'نموذج تواصل واتساب الرسمي',
    contactMethodEn: 'WhatsApp Official Contact Form',
    officialEmail: 'support@whatsapp.com',
    notesAr: 'للحسابات العادية support@whatsapp.com وللأعمال smb_web@support.whatsapp.com.',
    sortOrder: 17,
    isPopular: true,
    tags: ['whatsapp', 'واتساب', 'واتس', 'حظر رقم', 'اختراق واتساب', 'فك حظر'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // ================= MICROSOFT =================
  {
    id: 'sp_msft_recovery',
    company: 'Microsoft',
    platformName: 'Microsoft / Outlook / Hotmail',
    serviceNameAr: 'استرداد حساب Microsoft و Outlook',
    serviceNameEn: 'Microsoft Account Recovery',
    descriptionAr: 'نموذج التحقق الرسمي لاسترجاع حسابات مايكروسوفت و Hotmail و Outlook المفقودة.',
    descriptionEn: 'Official automated recovery questionnaire for Microsoft and Outlook accounts.',
    category: 'recovery',
    officialUrl: 'https://account.live.com/acsr',
    isVerifiedOfficial: true,
    contactMethodAr: 'نموذج استرداد Microsoft ACSR المشفر',
    contactMethodEn: 'Microsoft ACSR Recovery Form',
    notesAr: 'قدم أكبر قدر من المعلومات الدقيقة: كلمات المرور السابقة، عناوين الرسائل الأخيرة المرسلة، وأسماء المجلدات.',
    sortOrder: 18,
    isPopular: true,
    tags: ['microsoft', 'outlook', 'hotmail', 'مايكروسوفت', 'اوتميل', 'استرداد'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // ================= APPLE =================
  {
    id: 'sp_apple_id_recovery',
    company: 'Apple',
    platformName: 'Apple ID / iCloud',
    serviceNameAr: 'استرداد Apple ID و iCloud',
    serviceNameEn: 'Apple ID Iforgot Recovery',
    descriptionAr: 'البوابة الرسمية من Apple لإعادة تعيين كلمات مرور Apple ID وفتح الحسابات المقفلة لأسباب أمنية.',
    descriptionEn: 'Official Apple portal to recover Apple ID and unlock iCloud accounts.',
    category: 'recovery',
    officialUrl: 'https://iforgot.apple.com',
    isVerifiedOfficial: true,
    contactMethodAr: 'بوابة iforgot.apple.com الرسمية',
    contactMethodEn: 'Official Apple Iforgot Portal',
    officialPhone: '1-800-275-2273 (Apple US Support)',
    notesAr: 'قد يتطلب معالجة استرداد الحساب فترة انتظار تحددها أنظمة Apple لضمان ملكية صاحب الحساب.',
    sortOrder: 19,
    isPopular: true,
    tags: ['apple', 'icloud', 'apple id', 'ابل', 'ايكلاود', 'قفل الحساب', 'استرداد'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // ================= SNAPCHAT =================
  {
    id: 'sp_snap_support',
    company: 'Snap Inc.',
    platformName: 'Snapchat',
    serviceNameAr: 'دعم سناب شات واسترداد الحسابات',
    serviceNameEn: 'Snapchat Support & Compromised Accounts',
    descriptionAr: 'البوابة الرسمية لسناب شات لحل مشاكل تسجيل الدخول، الحسابات المخترقة، والقفل المؤقت.',
    descriptionEn: 'Official Snapchat support portal for locked and compromised accounts.',
    category: 'recovery',
    officialUrl: 'https://help.snapchat.com',
    isVerifiedOfficial: true,
    contactMethodAr: 'مركز المساعدة وبوابة تقديم التذاكر',
    contactMethodEn: 'Official Snap Ticket Portal',
    sortOrder: 20,
    tags: ['snapchat', 'snap', 'سناب', 'سنابشات', 'حساب مقفل', 'اختراق'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
];

const LOCAL_PORTALS_KEY = 'jb_support_portals_db';

export function getSavedSupportPortals(): SupportPortalItem[] {
  if (typeof window === 'undefined') return INITIAL_SUPPORT_PORTALS;
  try {
    const raw = localStorage.getItem(LOCAL_PORTALS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_PORTALS_KEY, JSON.stringify(INITIAL_SUPPORT_PORTALS));
      return INITIAL_SUPPORT_PORTALS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (e) {
    console.warn('Support portals load error:', e);
  }
  return INITIAL_SUPPORT_PORTALS;
}

export function saveSupportPortalItem(
  item: SupportPortalItem,
  userProfile?: UserProfile | null
): SupportPortalItem[] {
  const current = getSavedSupportPortals();
  const existingIdx = current.findIndex(p => p.id === item.id);
  const now = new Date().toISOString();

  let updatedList: SupportPortalItem[];
  if (existingIdx >= 0) {
    updatedList = [...current];
    updatedList[existingIdx] = { ...item, updatedAt: now };
  } else {
    const newItem: SupportPortalItem = {
      ...item,
      id: item.id || `sp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now,
      updatedAt: now
    };
    updatedList = [newItem, ...current];
  }

  localStorage.setItem(LOCAL_PORTALS_KEY, JSON.stringify(updatedList));

  logAuditAndEvent({
    action: existingIdx >= 0 ? 'UPDATE_SUPPORT_PORTAL' : 'CREATE_SUPPORT_PORTAL',
    details: `${existingIdx >= 0 ? 'تعديل' : 'إضافة'} بوابة دعم: (${item.company} - ${item.serviceNameAr})`,
    entityType: 'support_portal',
    entityId: item.id,
    entityTitle: item.serviceNameAr,
    user: userProfile || undefined
  });

  window.dispatchEvent(new CustomEvent('jb_data_changed', { detail: { type: 'support_portals' } }));
  return updatedList;
}

export function deleteSupportPortalItem(
  portalId: string,
  userProfile?: UserProfile | null
): SupportPortalItem[] {
  const current = getSavedSupportPortals();
  const target = current.find(p => p.id === portalId);
  const updatedList = current.filter(p => p.id !== portalId);

  localStorage.setItem(LOCAL_PORTALS_KEY, JSON.stringify(updatedList));

  if (target) {
    logAuditAndEvent({
      action: 'DELETE_SUPPORT_PORTAL',
      details: `حذف بوابة دعم: (${target.company} - ${target.serviceNameAr})`,
      entityType: 'support_portal',
      entityId: portalId,
      entityTitle: target.serviceNameAr,
      user: userProfile || undefined
    });
  }

  window.dispatchEvent(new CustomEvent('jb_data_changed', { detail: { type: 'support_portals' } }));
  return updatedList;
}

export function resetSupportPortalsToDefault(): SupportPortalItem[] {
  localStorage.setItem(LOCAL_PORTALS_KEY, JSON.stringify(INITIAL_SUPPORT_PORTALS));
  window.dispatchEvent(new CustomEvent('jb_data_changed', { detail: { type: 'support_portals' } }));
  return INITIAL_SUPPORT_PORTALS;
}
