import { logAuditAndEvent } from './audit';
import { UserProfile } from '../types';

export type SupportCategory = 
  | 'hacked' 
  | 'impersonation' 
  | 'recovery' 
  | 'content_removal' 
  | 'copyright' 
  | 'privacy_protection'
  | 'infosec_tools'
  | 'phone_hardware'
  | 'social_media'
  | 'ads_business' 
  | 'safety' 
  | 'hosting_dns'
  | 'email_cloud'
  | 'finance_crypto'
  | 'ai_tools'
  | 'general';

export interface SupportPortalItem {
  id: string;
  company: string; // e.g. YouTube, Google, Meta, TikTok, X Corp, Telegram, Snapchat, LinkedIn, Discord, Apple, Samsung, Xiaomi, Huawei, Microsoft, Cloudflare, StopNCII, etc.
  platformName: string; // e.g. YouTube, Google Search, Gmail, Facebook, Instagram, WhatsApp, TikTok, etc.
  serviceNameAr: string;
  serviceNameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  category: SupportCategory;
  officialUrl: string;
  isVerifiedOfficial: boolean;
  contactMethodAr: string;
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
  // =========================================================================
  // 🎥 YOUTUBE (بوابات دعم يوتيوب المعتمدة وقنوات صناع المحتوى)
  // =========================================================================
  {
    id: 'sp_yt_channel_hijacked',
    company: 'YouTube',
    platformName: 'YouTube',
    serviceNameAr: 'استرداد قناة YouTube المخترقة والمسروقة (Hijacked Channel Recovery)',
    serviceNameEn: 'YouTube Compromised / Hijacked Channel Recovery',
    descriptionAr: 'البوابة الرسمية المعتمدة لصناع المحتوى ومنشئي الفيديوهات لاستعادة القنوات المسروقة التي تم تغيير بريدها أو بث محتوى عملات رقمية (Crypto Scam) عليها بعد اختراق جهاز المالك.',
    descriptionEn: 'Official flow for creators whose YouTube channels were compromised, hijacked, or had unauthorized videos uploaded.',
    category: 'hacked',
    officialUrl: 'https://support.google.com/youtube/answer/76187',
    isVerifiedOfficial: true,
    contactMethodAr: 'فريق دعم منشئي المحتوى وبوابة الاسترداد الذاتي',
    contactMethodEn: 'Creator Support Team & Hijacked Account Intake',
    notesAr: 'يمكن أيضاً طلب المساعدة العاجلة عبر التغريد للحساب الرسمي @TeamYouTube على منصة X لفتح تذكرة استرداد خاصة في دقائق.',
    sortOrder: 1,
    isPopular: true,
    tags: ['youtube', 'يوتيوب', 'قناة يوتيوب', 'سرقة قناة', 'تهكير يوتيوب', 'crypto live', 'hijacked channel', 'google'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_yt_copyright_dmca',
    company: 'YouTube',
    platformName: 'YouTube',
    serviceNameAr: 'إشعار إزالة حقوق الطبع والنشر الرسمي (YouTube DMCA Takedown)',
    serviceNameEn: 'YouTube Copyright & DMCA Infringement Notification Form',
    descriptionAr: 'النموذج القانوني الرسمي لإرسال إخطار انتهاك حقوق الملكية الفكرية وحذف مقاطع الفيديو والبث المباشر التي تستخدم محتواك أو صوتك أو علامتك بدون إذن.',
    descriptionEn: 'Official webform to submit a copyright takedown request for infringing videos on YouTube.',
    category: 'copyright',
    officialUrl: 'https://www.youtube.com/copyright_complaint_form',
    isVerifiedOfficial: true,
    contactMethodAr: 'نموذج إشعار إزالة حقوق الطبع والنشر المباشر',
    contactMethodEn: 'Official Web DMCA Notice Submission Form',
    officialEmail: 'copyright@youtube.com',
    notesAr: 'يؤدي تقديم البلاغ إلى فرض مخالفة حقوق طبع ونشر (Strike) على القناة المنتهكة وإزالة الفيديو فوراً بموجب القانون الفيدرالي.',
    sortOrder: 2,
    isPopular: true,
    tags: ['youtube', 'dmca', 'حقوق نشر', 'سرقة فيديو', 'يوتيوب', 'copyright strike', 'ملكية فكرية'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_yt_privacy_complaint',
    company: 'YouTube',
    platformName: 'YouTube',
    serviceNameAr: 'شكوى انتهاك الخصوصية وحذف الصور/الفيديوهات بدون موافقة',
    serviceNameEn: 'YouTube Privacy Complaint Process & Video Takedown',
    descriptionAr: 'النموذج الرسمي لحذف أي مقطع فيديو أو صورة مصغرة تظهر وجهك أو اسمك أو معلوماتك الشخصية أو تم تصويرك فيها دون موافقتك الصريحة.',
    descriptionEn: 'Official process to request the removal of videos violating personal privacy or uploaded without consent.',
    category: 'privacy_protection',
    officialUrl: 'https://support.google.com/youtube/answer/142443',
    isVerifiedOfficial: true,
    contactMethodAr: 'معالج شكاوى الخصوصية من YouTube',
    contactMethodEn: 'YouTube Privacy Complaint Wizard',
    notesAr: 'تمنح YouTube الناشر مهلة 48 ساعة لتعديل الفيديو أو حذفه، وفي حال عدم الاستجابة يتم مراجعته وحذفه قسرياً من قبل فريق السلامة.',
    sortOrder: 3,
    isPopular: true,
    tags: ['youtube', 'خصوصية', 'حذف فيديو', 'تصوير بدون إذن', 'privacy', 'تشهير', 'يوتيوب'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_yt_impersonation_report',
    company: 'YouTube',
    platformName: 'YouTube',
    serviceNameAr: 'الإبلاغ عن انتحال صفة أو قناة مزيفة في YouTube',
    serviceNameEn: 'Report Impersonation Channel on YouTube',
    descriptionAr: 'البوابة المخصصة لإغلاق القنوات التي تسرق اسم وشعار وصور قناة أخرى أو تدعي تمثيل شخصية مشهورة أو جهة رسمية لخداع المتابعين.',
    descriptionEn: 'Official form to report channels copying your channel name, avatar, or impersonating your identity.',
    category: 'impersonation',
    officialUrl: 'https://support.google.com/youtube/answer/2801947',
    isVerifiedOfficial: true,
    contactMethodAr: 'نموذج الإبلاغ عن انتحال الهوية في يوتيوب',
    contactMethodEn: 'YouTube Impersonation Report Form',
    sortOrder: 4,
    tags: ['youtube', 'انتحال', 'قناة مزيفة', 'يوتيوب', 'impersonation', 'تزييف'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_yt_harassment_cyberbullying',
    company: 'YouTube',
    platformName: 'YouTube',
    serviceNameAr: 'الإبلاغ عن التشهير والتنمر الإلكتروني والابتزاز في YouTube',
    serviceNameEn: 'Report Harassment, Defamation, & Cyberbullying on YouTube',
    descriptionAr: 'بوابة إزالة المقاطع والتعليقات التي تتضمن حملات تشهير ممنهجة، تهديدات، تنمراً إلكترونياً، أو محاولات ابتزاز.',
    descriptionEn: 'Submit reports against malicious cyberbullying, harassment campaigns, or extortion videos on YouTube.',
    category: 'content_removal',
    officialUrl: 'https://support.google.com/youtube/answer/2802268',
    isVerifiedOfficial: true,
    contactMethodAr: 'بوابة أمان يوتيوب ومكافحة التنمر',
    contactMethodEn: 'YouTube Trust & Safety Report Portal',
    sortOrder: 5,
    tags: ['youtube', 'تشهير', 'تنمر', 'ابتزاز', 'إساءة', 'harassment', 'bullying'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_yt_community_strike_appeal',
    company: 'YouTube',
    platformName: 'YouTube',
    serviceNameAr: 'الطعن في إنذارات إرشادات المنتدى وإعادة الفيديوهات المحذوفة',
    serviceNameEn: 'Appeal YouTube Community Guidelines Strikes',
    descriptionAr: 'النموذج الرسمي لطلب مراجعة بشرية للإنذارات الخاطئة المفروضة على القناة أو المقاطع المحذوفة بسبب بلاغات كيدية أو تقييمات خوارزمية خاطئة.',
    descriptionEn: 'Submit an appeal to reverse a wrongful Community Guidelines strike on your YouTube channel.',
    category: 'recovery',
    officialUrl: 'https://support.google.com/youtube/answer/185111',
    isVerifiedOfficial: true,
    contactMethodAr: 'لوحة استوديو يوتيوب ونموذج الطعن المباشر',
    contactMethodEn: 'YouTube Studio Appeal Form',
    notesAr: 'يمكن تقديم الطعن مباشرة من لوحة تحكم YouTube Studio عبر قسم "مخالفات القناة" وتقديم توضيح دقيق لسبب رفع الإنذار.',
    sortOrder: 6,
    tags: ['youtube', 'طعن', 'إنذار يوتيوب', 'فك حظر', 'community strike', 'appeal'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // =========================================================================
  // 🌐 GOOGLE (حسابات جوجل، البحث، جيميل، وخدمات Google)
  // =========================================================================
  {
    id: 'sp_google_account_recovery',
    company: 'Google',
    platformName: 'Google Account / Gmail',
    serviceNameAr: 'استرداد حساب Google و Gmail المخترق والمنسي',
    serviceNameEn: 'Google Account Recovery Wizard',
    descriptionAr: 'البوابة الرسمية الوحيدة لاستعادة الوصول لحسابات Google و Gmail المخترقة أو المفقودة وتخطي التغييرات غير المصرح بها في كلمات المرور وأرقام الاسترداد.',
    descriptionEn: 'The single official portal to recover compromised, hacked, or lost Google accounts.',
    category: 'recovery',
    officialUrl: 'https://accounts.google.com/signin/recovery',
    isVerifiedOfficial: true,
    contactMethodAr: 'معالج استرداد Google الرسمي المشفر',
    contactMethodEn: 'Google Account Recovery Wizard',
    notesAr: 'استخدم دائماً جهازاً وشبكة Wi-Fi تم الدخول منها سابقاً، واحتفظ برموز الأمان الاحتياطية المكونة من 8 أرقام.',
    sortOrder: 7,
    isPopular: true,
    tags: ['google', 'gmail', 'recovery', 'جوجل', 'جيميل', 'استرداد', 'حساب جوجل', 'مخترق', 'كلمة سر'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_google_legal_search_removal',
    company: 'Google',
    platformName: 'Google Search',
    serviceNameAr: 'طلب إزالة المحتوى والتشهير من نتائج بحث Google',
    serviceNameEn: 'Remove Content from Google Search for Legal & Privacy Reasons',
    descriptionAr: 'البوابة الرسمية لحذف نتائج البحث التشهيرية، الصور غير المصرح بها، البيانات الشخصية الحساسة المسربة (Doxxing)، والمعلومات المالية من خوادم محرك بحث Google.',
    descriptionEn: 'Official portal to request legal removal of defamation, doxed personal data, and sensitive info from Google Search.',
    category: 'content_removal',
    officialUrl: 'https://support.google.com/legal/troubleshooter/1114905',
    isVerifiedOfficial: true,
    contactMethodAr: 'بوابة إزالة المحتوى القانوني الرسمية من Google',
    contactMethodEn: 'Google Legal Removal Portal',
    notesAr: 'تشمل إزالة التشهير، البيانات الشخصية الحساسة (أرقام الهواتف، العناوين المنزلية)، الصور الفاضحة بدون إذن، والمستندات القضائية.',
    sortOrder: 8,
    isPopular: true,
    tags: ['google', 'legal', 'removal', 'تشهير', 'حذف نتائج', 'خصوصية', 'قانوني', 'حذف من جوجل'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_google_play_abuse_takedown',
    company: 'Google',
    platformName: 'Google Play Store',
    serviceNameAr: 'الإبلاغ عن التطبيقات الاحتيالية وبرمجيات التجسس في Google Play',
    serviceNameEn: 'Report Inappropriate / Malicious Apps on Google Play',
    descriptionAr: 'النموذج الرسمي للإبلاغ عن التطبيقات الخبيثة، تطبيقات القروض الاحتيالية، تطبيقات التجسس، والتطبيقات التي تنتحل علامات تجارية في متجر Google Play لحذفها فوراً.',
    descriptionEn: 'Official Google Play form to report scam apps, stalkerware, impersonation, or copyright-violating Android apps.',
    category: 'safety',
    officialUrl: 'https://support.google.com/googleplay/android-developer/contact/takedown',
    isVerifiedOfficial: true,
    contactMethodAr: 'بوابة إزالة تطبيقات Google Play المخالفة',
    contactMethodEn: 'Google Play Takedown & Abuse Form',
    sortOrder: 9,
    tags: ['google play', 'تطبيقات احتيالية', 'تجسس', 'تطبيق مزيف', 'اندرويد', 'حذف تطبيق'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_google_workspace_admin',
    company: 'Google',
    platformName: 'Google Workspace',
    serviceNameAr: 'دعم واسترداد حسابات Google Workspace للشركات والمؤسسات',
    serviceNameEn: 'Google Workspace Admin Account Recovery & Support',
    descriptionAr: 'البوابة المخصصة لمسؤولي الشركات لاستعادة حسابات المشرفين (Super Admin) المقفلة أو المخترقة عبر إثبات ملكية سجلات DNS للنطاق.',
    descriptionEn: 'Recovery assistance for compromised Google Workspace business administrator accounts via DNS TXT verification.',
    category: 'recovery',
    officialUrl: 'https://toolbox.googleapps.com/apps/recovery/form',
    isVerifiedOfficial: true,
    contactMethodAr: 'أداة التحقق من ملكية النطاق Google Admin Toolbox',
    contactMethodEn: 'Google Admin Recovery via DNS Verification',
    sortOrder: 10,
    tags: ['google workspace', 'gsuite', 'بريد شركات', 'مشرف جوجل', 'استرداد دومين', 'admin recovery'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_google_safebrowsing_report',
    company: 'Google',
    platformName: 'Google Safe Browsing',
    serviceNameAr: 'الإبلاغ عن مواقع التصيد والبرمجيات الخبيثة لـ Google Safe Browsing',
    serviceNameEn: 'Report Phishing & Malicious URLs to Google Safe Browsing',
    descriptionAr: 'المنصة الرسمية لإدراج الروابط والمواقع الاحتيالية في القائمة الحمراء لمتصفحات Chrome و Firefox و Safari لتحذير ملايين المستخدمين.',
    descriptionEn: 'Submit malicious phishing sites to Google to show red warning screens across all major browsers.',
    category: 'safety',
    officialUrl: 'https://safebrowsing.google.com/safebrowsing/report_phish/',
    isVerifiedOfficial: true,
    contactMethodAr: 'بوابة فحص وتصنيف التهديدات الآلية من Google',
    contactMethodEn: 'Google Safe Browsing Threat Submission',
    sortOrder: 11,
    isPopular: true,
    tags: ['google', 'safe browsing', 'تصيد', 'رابط احتيالي', 'إسقاط موقع', 'تحذير احمر', 'phishing'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_google_maps_fake_reviews',
    company: 'Google',
    platformName: 'Google Maps / Business Profile',
    serviceNameAr: 'حذف التقييمات المزيفة واسترداد ملفات Google Maps التجارية',
    serviceNameEn: 'Report Fake Reviews & Recover Google Business Profile',
    descriptionAr: 'بوابة إزالة التقييمات التشهيرية والانتقامية وحملات التقييم الوهمية (1-Star Attack)، واسترجاع إدارة الأنشطة التجارية المسروقة على خرائط Google.',
    descriptionEn: 'Official form to remove defamatory fake reviews or recover hijacked Google Business Profiles.',
    category: 'content_removal',
    officialUrl: 'https://support.google.com/business/answer/4596773',
    isVerifiedOfficial: true,
    contactMethodAr: 'لوحة دعم Google Business Profile الرسمية',
    contactMethodEn: 'Google Business Profile Support Flow',
    sortOrder: 12,
    tags: ['google maps', 'خرائط جوجل', 'تقييمات مزيفة', 'نشاط تجاري', 'تشهير تجاري', 'google business'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // =========================================================================
  // 👥 META (فيسبوك، إنستغرام، واتساب، ثريدز، مدراء الأعمال)
  // =========================================================================
  {
    id: 'sp_meta_fb_hacked',
    company: 'Meta',
    platformName: 'Facebook',
    serviceNameAr: 'استرداد وتأمين حساب فيسبوك المخترق (Facebook Hacked)',
    serviceNameEn: 'Facebook Compromised Account Recovery (facebook.com/hacked)',
    descriptionAr: 'البوابة الرسمية الأساسية لتأمين واسترداد حسابات فيسبوك التي تم تغيير معلومات تسجيل الدخول الخاصة بها أو سرقتها أو اختراقها.',
    descriptionEn: 'Official portal to secure and recover hacked or compromised Facebook accounts.',
    category: 'hacked',
    officialUrl: 'https://www.facebook.com/hacked',
    isVerifiedOfficial: true,
    contactMethodAr: 'معالج الاسترداد الآلي الرسمي من فيسبوك',
    contactMethodEn: 'Official Automated Security Flow',
    notesAr: 'يتطلب الدخول من متصفح أو هاتف تم استخدامه سابقاً لتخطي أقفال الأمان والتعرف على الجهاز الموثوق.',
    sortOrder: 13,
    isPopular: true,
    tags: ['facebook', 'meta', 'hacked', 'مخترق', 'استرداد', 'تهكير', 'فيسبوك', 'password'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_meta_fb_impersonation',
    company: 'Meta',
    platformName: 'Facebook',
    serviceNameAr: 'الإبلاغ عن انتحال الشخصية والصفحات المزيفة في فيسبوك',
    serviceNameEn: 'Report Impersonation Profile or Page on Facebook',
    descriptionAr: 'النموذج الرسمي المباشر لحظر وإغلاق الحسابات والصفحات المزورة التي تنتحل هوية أشخاص حقيقيين أو شركات أو شخصيات عامة.',
    descriptionEn: 'Official form to report fake accounts or pages impersonating real individuals or brands.',
    category: 'impersonation',
    officialUrl: 'https://www.facebook.com/help/contact/295309487309948',
    isVerifiedOfficial: true,
    contactMethodAr: 'نموذج الإبلاغ عن انتحال الهوية الرسمي',
    contactMethodEn: 'Official Impersonation Report Form',
    notesAr: 'يستوجب رفع صورة بطاقة هوية رسمية أو سجل تجاري لإثبات الهوية وإغلاق الحساب المنتحل فوراً.',
    sortOrder: 14,
    isPopular: true,
    tags: ['facebook', 'meta', 'impersonation', 'انتحال', 'مزور', 'حساب مزيف', 'فيسبوك', 'هوية'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_meta_fb_disabled_appeal',
    company: 'Meta',
    platformName: 'Facebook',
    serviceNameAr: 'الطعن في حسابات فيسبوك المعطلة والمحظورة (ID Appeal)',
    serviceNameEn: 'Disabled Facebook Account Appeal Form (ID Verification)',
    descriptionAr: 'بوابة الالتماس الرسمية لإعادة تفعيل ومراجعة حسابات فيسبوك الشخصية المعطلة عن طريق الخطأ أو بسبب مخالفة إرشادات المجتمع.',
    descriptionEn: 'Official appeal form to restore wrongfully disabled Facebook accounts by uploading government ID.',
    category: 'recovery',
    officialUrl: 'https://www.facebook.com/help/contact/260749603972907',
    isVerifiedOfficial: true,
    contactMethodAr: 'نموذج مراجعة الحسابات المعطلة الرسمي',
    contactMethodEn: 'Official Account Review Form',
    sortOrder: 15,
    isPopular: true,
    tags: ['facebook', 'disabled', 'معطل', 'محظور', 'باند', 'طعن', 'استرجاع', 'فك حظر'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_meta_business_support',
    company: 'Meta',
    platformName: 'Meta Business Suite',
    serviceNameAr: 'دعم مدراء الأعمال والحملات الإعلانية المخترقة (Meta Business)',
    serviceNameEn: 'Meta Business Suite & Ad Account Restricted Support',
    descriptionAr: 'بوابة الدعم المباشر لمدراء الأعمال (Business Manager) لاسترداد الحسابات الإعلانية المقيدة والصفحات المسروقة ومراجعة عمليات الدفع غير المصرح بها.',
    descriptionEn: 'Official Meta Business support portal for restricted ad accounts, hacked pages, and payment disputes.',
    category: 'ads_business',
    officialUrl: 'https://business.facebook.com/business/help',
    isVerifiedOfficial: true,
    contactMethodAr: 'دردشة الدعم الفني للمعلنين (Meta Live Chat)',
    contactMethodEn: 'Meta Business Live Chat & Ticket Center',
    sortOrder: 16,
    isPopular: true,
    tags: ['meta', 'business manager', 'إعلانات فيسبوك', 'حساب إعلاني معطل', 'مدير الأعمال', 'فيسبوك اعمال'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_meta_ig_hacked',
    company: 'Meta',
    platformName: 'Instagram',
    serviceNameAr: 'استرداد حساب إنستغرام المخترق والتأكيد بالفيديو السيلفي',
    serviceNameEn: 'Instagram Hacked Recovery Hub & Video Selfie Verification',
    descriptionAr: 'مركز الدعم الرسمي الفوري لمعالجة اختراق حسابات إنستغرام وتأمينها وتخطي تغيير البريد الإلكتروني ورقم الهاتف عبر رابط التحقق الذاتي والفيديو السيلفي.',
    descriptionEn: 'Official self-service portal to recover and secure hacked Instagram accounts with selfie video matching.',
    category: 'hacked',
    officialUrl: 'https://www.instagram.com/hacked',
    isVerifiedOfficial: true,
    contactMethodAr: 'بوابة Instagram Hacked المباشرة',
    contactMethodEn: 'Official Self-Service Security Hub',
    notesAr: 'يتضمن خيار التقاط فيديو سيلفي (Video Selfie Verification) لمطابقة الوجه آلياً مع صور الحساب لاسترداده.',
    sortOrder: 17,
    isPopular: true,
    tags: ['instagram', 'ig', 'انستغرام', 'انستا', 'مخترق', 'تهكير', 'استرداد', 'فيديو سيلفي'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_meta_ig_impersonation',
    company: 'Meta',
    platformName: 'Instagram',
    serviceNameAr: 'الإبلاغ عن انتحال شخصية في إنستغرام (Instagram Impersonation)',
    serviceNameEn: 'Instagram Impersonation Report Form',
    descriptionAr: 'النموذج الرسمي لحذف حسابات إنستغرام المنتحلة لشخصيات عامة أو أفراد أو أنشطة تجارية مسجلة.',
    descriptionEn: 'Official form to report fake Instagram accounts impersonating real persons.',
    category: 'impersonation',
    officialUrl: 'https://help.instagram.com/contact/636276399721841',
    isVerifiedOfficial: true,
    contactMethodAr: 'نموذج بلاغ انتحال الهوية الرسمي',
    contactMethodEn: 'Official Identity Theft Form',
    sortOrder: 18,
    isPopular: true,
    tags: ['instagram', 'impersonation', 'انتحال', 'حساب مزور', 'انستا', 'هوية'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_meta_ig_disabled',
    company: 'Meta',
    platformName: 'Instagram',
    serviceNameAr: 'استعادة حساب إنستغرام المعطل والمحظور (Instagram Appeal)',
    serviceNameEn: 'Instagram Disabled Account Reactivation Appeal',
    descriptionAr: 'طلب إعادة النظر الرسمي في إغلاق أو تعطيل حساب إنستغرام لأسباب انتهاك إرشادات المجتمع أو الحظر الخاطئ.',
    descriptionEn: 'Appeal to restore a deactivated or banned Instagram account.',
    category: 'recovery',
    officialUrl: 'https://help.instagram.com/contact/606967319425838',
    isVerifiedOfficial: true,
    contactMethodAr: 'نموذج التماس الحسابات المعطلة',
    contactMethodEn: 'Official Account Reactivation Appeal',
    sortOrder: 19,
    isPopular: true,
    tags: ['instagram', 'disabled', 'معطل', 'باند', 'انستا', 'حظر', 'فك باند'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_meta_whatsapp_support',
    company: 'Meta',
    platformName: 'WhatsApp',
    serviceNameAr: 'دعم وفك حظر أرقام واتساب واسترداد الحسابات المخترقة',
    serviceNameEn: 'WhatsApp Official Contact & Banned Number Appeal',
    descriptionAr: 'البوابة الرسمية للتواصل مع فريق أمان ودعم واتساب لفك الحظر عن الأرقام (Spam Ban) واسترداد جلسات واتساب المسروقة.',
    descriptionEn: 'Official WhatsApp support portal to appeal banned numbers or hijacked sessions.',
    category: 'recovery',
    officialUrl: 'https://www.whatsapp.com/contact/',
    isVerifiedOfficial: true,
    contactMethodAr: 'نموذج تواصل واتساب الرسمي والبريد',
    contactMethodEn: 'WhatsApp Official Contact Form',
    officialEmail: 'support@whatsapp.com',
    notesAr: 'للحسابات العادية: support@whatsapp.com ولحسابات الأعمال WhatsApp Business: smb_web@support.whatsapp.com.',
    sortOrder: 20,
    isPopular: true,
    tags: ['whatsapp', 'واتساب', 'واتس', 'حظر رقم', 'اختراق واتساب', 'فك حظر', 'واتساب اعمال'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_meta_threads_support',
    company: 'Meta',
    platformName: 'Threads',
    serviceNameAr: 'مركز الدعم والإبلاغ عن المحتوى والحسابات في Threads',
    serviceNameEn: 'Threads Safety & Account Support Center',
    descriptionAr: 'البوابة الرسمية للإبلاغ عن الحسابات المنتحلة، المضايقات، والمنشورات المخالفة على شبكة Threads التابعة لـ Instagram.',
    descriptionEn: 'Official help center for reporting impersonation, harassment, and profile issues on Threads.',
    category: 'impersonation',
    officialUrl: 'https://help.instagram.com/710188047525287',
    isVerifiedOfficial: true,
    contactMethodAr: 'مركز مساعدة ودعم Threads و Instagram',
    contactMethodEn: 'Threads / Instagram Integrated Help Desk',
    sortOrder: 21,
    tags: ['threads', 'ثريدز', 'انتحال ثريدز', 'حساب ثريدز', 'meta'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // =========================================================================
  // 🎵 TIKTOK (تيك توك)
  // =========================================================================
  {
    id: 'sp_tiktok_feedback_recovery',
    company: 'TikTok',
    platformName: 'TikTok',
    serviceNameAr: 'استرداد حساب TikTok والطعن في الحظر (Feedback Portal)',
    serviceNameEn: 'TikTok Feedback & Account Recovery Portal',
    descriptionAr: 'النموذج الرسمي المباشر لمراسلة دعم تيك توك لحل مشاكل الحسابات المحظورة والمخترقة والتحقق من العمر.',
    descriptionEn: 'Official feedback and support form for locked, banned, or hacked TikTok accounts.',
    category: 'recovery',
    officialUrl: 'https://www.tiktok.com/legal/report/feedback',
    isVerifiedOfficial: true,
    contactMethodAr: 'نموذج ملاحظات ودعم TikTok الرسمي',
    contactMethodEn: 'Official TikTok Feedback Form',
    officialEmail: 'feedback@tiktok.com',
    sortOrder: 22,
    isPopular: true,
    tags: ['tiktok', 'تيكتوك', 'تيك توك', 'حظر', 'اختراق', 'استرجاع', 'feedback', 'فك حظر'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_tiktok_impersonation',
    company: 'TikTok',
    platformName: 'TikTok',
    serviceNameAr: 'الإبلاغ عن انتحال شخصية وحسابات وهمية على TikTok',
    serviceNameEn: 'Report Impersonation on TikTok',
    descriptionAr: 'بوابة مخصصة للإبلاغ عن الحسابات الوهمية التي تنتحل هوية شخص حقيقي أو علامة تجارية على TikTok.',
    descriptionEn: 'Official safety portal to report impersonating accounts on TikTok.',
    category: 'impersonation',
    officialUrl: 'https://www.tiktok.com/legal/report/impersonation',
    isVerifiedOfficial: true,
    contactMethodAr: 'نموذج انتحال الهوية المعتمد من TikTok',
    contactMethodEn: 'Official Impersonation Form',
    sortOrder: 23,
    tags: ['tiktok', 'impersonation', 'انتحال', 'تيك توك', 'حساب مزيف', 'تزييف'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_tiktok_copyright_dmca',
    company: 'TikTok',
    platformName: 'TikTok',
    serviceNameAr: 'إشعار إزالة حقوق الملكية الفكرية و DMCA في TikTok',
    serviceNameEn: 'TikTok Copyright Infringement Takedown Form',
    descriptionAr: 'النموذج الرسمي لحذف الفيديوهات المسروقة والصوتيات التي تنتهك حقوق النشر الخاصة بك على تيك توك.',
    descriptionEn: 'Official form to report copyright and intellectual property infringement on TikTok.',
    category: 'copyright',
    officialUrl: 'https://www.tiktok.com/legal/report/Copyright',
    isVerifiedOfficial: true,
    contactMethodAr: 'نموذج بلاغات حقوق الملكية الفكرية',
    contactMethodEn: 'Official TikTok Copyright Form',
    sortOrder: 24,
    tags: ['tiktok', 'copyright', 'dmca', 'تيك توك', 'سرقة محتوى', 'حقوق نشر'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // =========================================================================
  // 🐦 X / TWITTER (منصة إكس / تويتر)
  // =========================================================================
  {
    id: 'sp_x_hacked_compromised',
    company: 'X Corp',
    platformName: 'X (Twitter)',
    serviceNameAr: 'استرداد وتأمين حساب X (تويتر) المخترق والمعلق',
    serviceNameEn: 'Recover Compromised / Suspended X Account',
    descriptionAr: 'البوابة الرسمية لشركة X لتأمين الحسابات المخترقة أو التي لا يمكن تسجيل الدخول إليها أو المعلقة بسبب نشاط مشبوه.',
    descriptionEn: 'Official portal for compromised and locked accounts on X (Twitter).',
    category: 'hacked',
    officialUrl: 'https://help.twitter.com/forms/signin',
    isVerifiedOfficial: true,
    contactMethodAr: 'نموذج مشاكل الدخول والاختراق الرسمي',
    contactMethodEn: 'Official Login Support Form',
    sortOrder: 25,
    isPopular: true,
    tags: ['x', 'twitter', 'تويتر', 'إكس', 'مخترق', 'اختراق', 'استرداد', 'حساب معلق'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_x_impersonation',
    company: 'X Corp',
    platformName: 'X (Twitter)',
    serviceNameAr: 'الإبلاغ عن انتحال الهوية على منصة X',
    serviceNameEn: 'Report Impersonation on X (Twitter)',
    descriptionAr: 'النموذج الرسمي المباشر لحظر وإزالة الحسابات التي تدعي تمثيل شخصك أو علامتك التجارية دون إذن على منصة X.',
    descriptionEn: 'Official form to report impersonation on X (Twitter).',
    category: 'impersonation',
    officialUrl: 'https://help.twitter.com/forms/impersonation',
    isVerifiedOfficial: true,
    contactMethodAr: 'نموذج الانتحال الرسمي المعتمد',
    contactMethodEn: 'Official Impersonation Form',
    sortOrder: 26,
    tags: ['x', 'twitter', 'impersonation', 'انتحال', 'تويتر', 'تزييف'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_x_doxxing_privacy',
    company: 'X Corp',
    platformName: 'X (Twitter)',
    serviceNameAr: 'إزالة المعلومات الشخصية والتشهير Doxxing على منصة X',
    serviceNameEn: 'Report Private Information Sharing & Doxxing on X',
    descriptionAr: 'البوابة المخصصة لحذف التغريدات والصور التي تنشر أرقام هواتف أو عناوين سكن أو وثائق هوية أو صوراً حساسة دون إذن.',
    descriptionEn: 'Official form to remove non-consensual sharing of private personal details and doxed data on X.',
    category: 'privacy_protection',
    officialUrl: 'https://help.twitter.com/forms/safety-and-sensitive-content/private-information',
    isVerifiedOfficial: true,
    contactMethodAr: 'نموذج بلاغات الخصوصية والبيانات الخاصة',
    contactMethodEn: 'Official Privacy Policy Intake Form',
    sortOrder: 27,
    tags: ['x', 'twitter', 'doxxing', 'خصوصية', 'تسريب بيانات', 'تشهير', 'تويتر'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // =========================================================================
  // ✈️ TELEGRAM (تيليجرام)
  // =========================================================================
  {
    id: 'sp_telegram_support',
    company: 'Telegram',
    platformName: 'Telegram',
    serviceNameAr: 'الدعم الفني واسترداد حسابات تيليجرام وفك الحظر',
    serviceNameEn: 'Telegram Official Web Support & Account Recovery',
    descriptionAr: 'نموذج الاتصال الرسمي بفريق أمان ودعم تيليجرام لحل مشاكل الحسابات والحظر واسترداد الأرقام.',
    descriptionEn: 'Official contact portal for Telegram security and account issues.',
    category: 'recovery',
    officialUrl: 'https://telegram.org/support',
    isVerifiedOfficial: true,
    contactMethodAr: 'نموذج الدعم العام من Telegram والبوت @SpamBot',
    contactMethodEn: 'Telegram Web Support Form & @SpamBot',
    officialEmail: 'support@telegram.org',
    sortOrder: 28,
    isPopular: true,
    tags: ['telegram', 'تيليجرام', 'تليغرام', 'حظر', 'اختراق', 'spambot', 'فك حظر'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_telegram_impersonation_scam',
    company: 'Telegram',
    platformName: 'Telegram',
    serviceNameAr: 'الإبلاغ عن قنوات وبوتات الاحتيال والانتحال في Telegram',
    serviceNameEn: 'Report Telegram Scam / Impersonation Bot & Channel',
    descriptionAr: 'القناة الرسمية لإغلاق القنوات والبوتات والحسابات الاحتيالية ومجموعات الابتزاز التي تنتحل صفة رسمية على تيليجرام.',
    descriptionEn: 'Official channel to report scam bots, channels, and impersonators.',
    category: 'impersonation',
    officialUrl: 'https://t.me/notoscam',
    isVerifiedOfficial: true,
    contactMethodAr: 'بوت مكافحة الاحتيال الرسمي @notoscam والبريد abuse@telegram.org',
    contactMethodEn: 'Official @notoscam bot & Abuse Email',
    officialEmail: 'abuse@telegram.org',
    sortOrder: 29,
    tags: ['telegram', 'scam', 'احتيال', 'انتحال', 'تيليجرام', 'بوت', 'قنوات مشبوهة'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_telegram_extortion_takedown',
    company: 'Telegram',
    platformName: 'Telegram',
    serviceNameAr: 'إزالة قنوات الابتزاز والصور غير المصرح بها في Telegram',
    serviceNameEn: 'Telegram Child Safety & Non-Consensual Media Takedown',
    descriptionAr: 'البريد الرسمي المخصص لفرق مكافحة الجرائم الإلكترونية لإزالة قنوات الابتزاز وتسريب الصور الحساسة وحظر المجموعات فوراً.',
    descriptionEn: 'Dedicated abuse contact for non-consensual media, extortion groups, and illegal content removal.',
    category: 'privacy_protection',
    officialUrl: 'mailto:stopca@telegram.org',
    isVerifiedOfficial: true,
    contactMethodAr: 'بريد الأمان العاجل stopca@telegram.org و abuse@telegram.org',
    contactMethodEn: 'Emergency Abuse Email',
    officialEmail: 'stopca@telegram.org',
    sortOrder: 30,
    tags: ['telegram', 'ابتزاز', 'صور خاصة', 'حذف قنوات', 'تيليجرام', 'extortion'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // =========================================================================
  // 👻 SNAPCHAT (سناب شات)
  // =========================================================================
  {
    id: 'sp_snap_support',
    company: 'Snap Inc.',
    platformName: 'Snapchat',
    serviceNameAr: 'دعم سناب شات واسترداد الحسابات المقفلة والمخترقة',
    serviceNameEn: 'Snapchat Support & Locked Account Recovery',
    descriptionAr: 'البوابة الرسمية لسناب شات لحل مشاكل تسجيل الدخول، الحسابات المخترقة، فك القفل المؤقت، والإبلاغ عن الابتزاز.',
    descriptionEn: 'Official Snapchat support portal for locked and compromised accounts.',
    category: 'recovery',
    officialUrl: 'https://help.snapchat.com',
    isVerifiedOfficial: true,
    contactMethodAr: 'مركز المساعدة وبوابة تقديم التذاكر',
    contactMethodEn: 'Official Snap Ticket Portal',
    notesAr: 'لإلغاء قفل الحساب المقفل مؤقتاً افتح الرابط accounts.snapchat.com/accounts/unlock.',
    sortOrder: 31,
    isPopular: true,
    tags: ['snapchat', 'snap', 'سناب', 'سنابشات', 'حساب مقفل', 'اختراق', 'قفل سناب'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_snap_unlock',
    company: 'Snap Inc.',
    platformName: 'Snapchat',
    serviceNameAr: 'بوابة فك قفل حساب سناب شات المقفل (Snapchat Unlock)',
    serviceNameEn: 'Snapchat Direct Account Unlock Hub',
    descriptionAr: 'الرابط المباشر من Snapchat لفك القفل التلقائي المفروض بسبب استخدام تطبيقات الطرف الثالث أو محاولات الدخول الخاطئة.',
    descriptionEn: 'Direct unlock portal to remove temporary lockouts on Snapchat accounts.',
    category: 'recovery',
    officialUrl: 'https://accounts.snapchat.com/accounts/unlock',
    isVerifiedOfficial: true,
    contactMethodAr: 'بوابة فك القفل الذاتي الفوري',
    contactMethodEn: 'Direct Automated Account Unlock Form',
    sortOrder: 32,
    tags: ['snapchat', 'unlock', 'فك قفل', 'سناب', 'حساب مقفل سناب'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // =========================================================================
  // 💼 LINKEDIN & DISCORD & REDDIT & PINTEREST
  // =========================================================================
  {
    id: 'sp_linkedin_hacked',
    company: 'LinkedIn',
    platformName: 'LinkedIn',
    serviceNameAr: 'استرداد حساب LinkedIn المهني المخترق (TS-RHA)',
    serviceNameEn: 'LinkedIn Compromised Account Recovery Form',
    descriptionAr: 'البوابة الرسمية لشبكة LinkedIn لاسترجاع الحسابات المهنية المخترقة وتأكيد الهوية بوثيقة حكومية.',
    descriptionEn: 'Official LinkedIn portal to report compromised accounts and submit identity verification.',
    category: 'hacked',
    officialUrl: 'https://www.linkedin.com/help/linkedin/ask/TS-RHA',
    isVerifiedOfficial: true,
    contactMethodAr: 'نموذج التحقق من الهوية والأمان من LinkedIn',
    contactMethodEn: 'Official LinkedIn Security Ticket',
    sortOrder: 33,
    tags: ['linkedin', 'لينكد ان', 'حساب مهني', 'اختراق لينكد ان', 'انتحال شخصية'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_discord_support',
    company: 'Discord',
    platformName: 'Discord',
    serviceNameAr: 'دعم ديسكورد وبلاغات الأمان والقرصنة (Discord Trust & Safety)',
    serviceNameEn: 'Discord Trust & Safety Support Center (dis.gd/request)',
    descriptionAr: 'البوابة الرسمية للتواصل مع فريق Trust & Safety في Discord للإبلاغ عن السيرفرات الاحتيالية، اختراق الحسابات، وسرقة التوكن Token.',
    descriptionEn: 'Official Discord support for account hijacking, harassment, and policy violations.',
    category: 'safety',
    officialUrl: 'https://dis.gd/request',
    isVerifiedOfficial: true,
    contactMethodAr: 'بوابة تذاكر الأمان والدعم الرسمية (dis.gd)',
    contactMethodEn: 'Official Discord Support Ticket System',
    sortOrder: 34,
    tags: ['discord', 'ديسكورد', 'اختراق ديسكورد', 'سيرفر', 'trust and safety'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_reddit_report_safety',
    company: 'Reddit',
    platformName: 'Reddit',
    serviceNameAr: 'بوابة الإبلاغ عن الابتزاز والتشهير واسترداد الحسابات في Reddit',
    serviceNameEn: 'Reddit Security, Harassment & Account Recovery Portal',
    descriptionAr: 'البوابة الرسمية لمراسلة مشرفي Reddit لحذف المنشورات التشهيرية، إزالة الصور غير المصرح بها، واسترجاع الحسابات المقفلة.',
    descriptionEn: 'Official Reddit report center for harassment, non-consensual media, and compromised accounts.',
    category: 'safety',
    officialUrl: 'https://www.reddit.com/report',
    isVerifiedOfficial: true,
    contactMethodAr: 'بوابة reddit.com/report الرسمية',
    contactMethodEn: 'Official Reddit Abuse & Takedown Form',
    sortOrder: 35,
    tags: ['reddit', 'ريديت', 'تشهير', 'ابتزاز', 'حذف بوست'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_pinterest_copyright_support',
    company: 'Pinterest',
    platformName: 'Pinterest',
    serviceNameAr: 'إزالة حقوق النشر ودعم أمان حسابات Pinterest',
    serviceNameEn: 'Pinterest Copyright Infringement & Security Center',
    descriptionAr: 'النموذج الرسمي لحذف الصور والتصاميم المسروقة من لوحات Pinterest واستعادة الحسابات المخترقة.',
    descriptionEn: 'Official Pinterest portal for DMCA notices and account security.',
    category: 'copyright',
    officialUrl: 'https://www.pinterest.com/about/copyright/dmca-pin/',
    isVerifiedOfficial: true,
    contactMethodAr: 'نموذج DMCA الإلكتروني المباشر',
    contactMethodEn: 'Pinterest DMCA Form',
    sortOrder: 36,
    tags: ['pinterest', 'بينترست', 'حقوق نشر', 'سرقة صور'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // =========================================================================
  // 📱 SMARTPHONE & HARDWARE OEM SUPPORT (شركات الهواتف والأجهزة الذكية)
  // =========================================================================
  {
    id: 'sp_phone_apple_iforgot',
    company: 'Apple',
    platformName: 'Apple ID & iCloud',
    serviceNameAr: 'استرداد Apple ID وفتح حسابات iCloud (iforgot)',
    serviceNameEn: 'Apple ID & iCloud Recovery Portal (iforgot.apple.com)',
    descriptionAr: 'البوابة الرسمية الوحيدة من شركة Apple لإعادة تعيين كلمات مرور Apple ID واسترجاع الحسابات المقفلة لأسباب أمنية وفك قفل التنشيط.',
    descriptionEn: 'Official Apple portal to reset Apple ID passwords, recover iCloud, and remove activation locks.',
    category: 'phone_hardware',
    officialUrl: 'https://iforgot.apple.com',
    isVerifiedOfficial: true,
    contactMethodAr: 'بوابة iforgot.apple.com الرسمية',
    contactMethodEn: 'Official Apple Iforgot Portal',
    officialPhone: '1-800-275-2273 (Apple US) / +966 800 844 9724 (KSA) / +971 800 04440407 (UAE)',
    sortOrder: 37,
    isPopular: true,
    tags: ['apple', 'icloud', 'apple id', 'ايفون', 'ايكلاود', 'ابل', 'قفل تنشيط', 'iphone', 'ipad'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_phone_apple_find_my',
    company: 'Apple',
    platformName: 'iCloud Find Devices',
    serviceNameAr: 'تتبع وقفل ومسح أجهزة Apple المسروقة (Find Devices)',
    serviceNameEn: 'iCloud Find My - Lock & Erase Lost Apple Device',
    descriptionAr: 'لوحة التحكم الفورية من Apple لقفل الأجهزة المسروقة بنمط الفقدان (Lost Mode)، وتشغيل الإنذار، ومسح البيانات عن بعد لحماية الخصوصية.',
    descriptionEn: 'Control center to track, mark as lost, lock, or remote-wipe stolen Apple devices.',
    category: 'phone_hardware',
    officialUrl: 'https://www.icloud.com/find',
    isVerifiedOfficial: true,
    contactMethodAr: 'منصة سحابة iCloud Find المباشرة',
    contactMethodEn: 'Official iCloud Web Device Hub',
    sortOrder: 38,
    isPopular: true,
    tags: ['apple', 'find my', 'سرقة ايفون', 'قفل ايفون', 'مسح بيانات', 'تتبع جهاز', 'icloud'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_phone_apple_activation_lock',
    company: 'Apple',
    platformName: 'Apple Activation Lock Support',
    serviceNameAr: 'طلب فك قفل التنشيط الرسمي لأجهزة Apple (Activation Lock Support)',
    serviceNameEn: 'Apple Official Activation Lock Removal Support',
    descriptionAr: 'بوابة Apple المخصصة لتقديم طلب رسمي لفك قفل iCloud Activation Lock عن طريق تقديم فاتورة الشراء الأصلية للجهاز.',
    descriptionEn: 'Official Apple portal to request activation lock removal with proof of purchase.',
    category: 'phone_hardware',
    officialUrl: 'https://al-support.apple.com',
    isVerifiedOfficial: true,
    contactMethodAr: 'بوابة فك قفل التنشيط al-support.apple.com',
    contactMethodEn: 'Official Apple Activation Lock Removal Request',
    sortOrder: 39,
    isPopular: true,
    tags: ['apple', 'activation lock', 'فك ايكلاود', 'فاتورة شراء', 'قفل ابل', 'iphone'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_phone_samsung_account',
    company: 'Samsung',
    platformName: 'Samsung Account & Knox',
    serviceNameAr: 'دعم حسابات سامسونج وأمان Knox وفك القفل',
    serviceNameEn: 'Samsung Account Recovery & Knox Security Hub',
    descriptionAr: 'البوابة الرسمية لشركة سامسونج لاستعادة حساب Samsung Account، وحل مشاكل مجلد Knox الآمن، وفك قفل الهواتف وإدارتها.',
    descriptionEn: 'Official Samsung portal for Samsung Account recovery, Knox security, and device troubleshooting.',
    category: 'phone_hardware',
    officialUrl: 'https://account.samsung.com',
    isVerifiedOfficial: true,
    contactMethodAr: 'بوابة عضوية ودعم حسابات Samsung الرسمية',
    contactMethodEn: 'Samsung Membership & Account Center',
    officialPhone: '+966 800 2474357 (Samsung KSA) / +971 800 7267864 (UAE)',
    sortOrder: 40,
    isPopular: true,
    tags: ['samsung', 'سامسونج', 'جالكسي', 'knox', 'نوكس', 'حساب سامسونج', 'galaxy'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_phone_samsung_smartthings_find',
    company: 'Samsung',
    platformName: 'SmartThings Find (Samsung)',
    serviceNameAr: 'العثور على هواتف سامسونج وقفلها عن بعد (SmartThings Find)',
    serviceNameEn: 'Samsung SmartThings Find - Remote Lock & Wipe',
    descriptionAr: 'البوابة الرسمية لتتبع هواتف وأجهزة سامسونج المفقودة وقفل الشاشة وتمديد البطارية ومسح البيانات وفتح القفل عن بعد.',
    descriptionEn: 'Track, ring, lock, and back up data from lost Samsung Galaxy phones remotely.',
    category: 'phone_hardware',
    officialUrl: 'https://smartthingsfind.samsung.com',
    isVerifiedOfficial: true,
    contactMethodAr: 'لوحة تحكم SmartThings Find السحابية',
    contactMethodEn: 'SmartThings Cloud Tracking Dashboard',
    sortOrder: 41,
    isPopular: true,
    tags: ['samsung', 'find', 'تتبع سامسونج', 'قفل الشاشة', 'smartthings', 'فتح قفل'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_phone_xiaomi_cloud',
    company: 'Xiaomi',
    platformName: 'Xiaomi / Redmi / POCO',
    serviceNameAr: 'استرداد حساب Mi وقفل وتتبع هواتف شاومي (Xiaomi Cloud)',
    serviceNameEn: 'Xiaomi Mi Account Recovery & Find Device (i.mi.com)',
    descriptionAr: 'بوابة شاومي الرسمية لفك قفل أجهزة Mi و Redmi و POCO، واسترداد حساب Mi Account وتتبع الأجهزة المفقودة سحابياً.',
    descriptionEn: 'Official Xiaomi portal for Mi Account recovery, device unlocking, and cloud tracking.',
    category: 'phone_hardware',
    officialUrl: 'https://i.mi.com',
    isVerifiedOfficial: true,
    contactMethodAr: 'بوابة Xiaomi Cloud و Mi Account الرسمية',
    contactMethodEn: 'Official Xiaomi Cloud Web Hub',
    officialEmail: 'service.global@xiaomi.com',
    sortOrder: 42,
    isPopular: true,
    tags: ['xiaomi', 'redmi', 'poco', 'شاومي', 'ريدمي', 'حساب شاومي', 'mi cloud', 'فتح قفل'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_phone_huawei_support',
    company: 'Huawei',
    platformName: 'Huawei & Honor Support',
    serviceNameAr: 'دعم هواوي واسترداد حساب Huawei ID وإدارة الأجهزة',
    serviceNameEn: 'Huawei Support & Huawei ID Security Portal',
    descriptionAr: 'البوابة الرسمية لشركة هواوي لإدارة حسابات Huawei ID، وتتبع أجهزة هواوي، وتقديم طلبات الدعم والصيانة وفك قيود الحسابات.',
    descriptionEn: 'Official Huawei customer service, Huawei ID recovery, and Cloud Find Device.',
    category: 'phone_hardware',
    officialUrl: 'https://consumer.huawei.com/en/support',
    isVerifiedOfficial: true,
    contactMethodAr: 'مركز الدعم الفني لهواوي والمحادثة المباشرة',
    contactMethodEn: 'Huawei Support Center & Live Chat',
    officialPhone: '+966 800 1220888 (Huawei KSA) / +971 800 66600 (UAE)',
    sortOrder: 43,
    tags: ['huawei', 'هواوي', 'حساب هواوي', 'huawei id', 'صيانة هواوي', 'honor'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_phone_oppo_realme_support',
    company: 'Oppo / Realme',
    platformName: 'Oppo, Realme & HeyTap',
    serviceNameAr: 'دعم واسترداد حسابات أوبو وريلمي (HeyTap Cloud)',
    serviceNameEn: 'Oppo & Realme Customer Support & HeyTap Portal',
    descriptionAr: 'البوابة الرسمية لدعم هواتف Oppo و Realme وإدارة حسابات HeyTap السحابية وطلبات فك قفل الهواتف وخدمات الصيانة المعتمدة.',
    descriptionEn: 'Official support portal for Oppo, Realme, and HeyTap cloud services.',
    category: 'phone_hardware',
    officialUrl: 'https://support.oppo.com',
    isVerifiedOfficial: true,
    contactMethodAr: 'مركز دعم Oppo الرسمي وخدمة العملاء',
    contactMethodEn: 'Oppo Official Support & Service Centers',
    sortOrder: 44,
    tags: ['oppo', 'realme', 'اوبو', 'ريلمي', 'heytap', 'صيانة هواتف'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_phone_google_android_find',
    company: 'Google',
    platformName: 'Google Android Find My Device',
    serviceNameAr: 'تتبع وقفل ومسح هواتف أندرويد و Google Pixel (Find My Device)',
    serviceNameEn: 'Google Find My Device - Android Security Hub',
    descriptionAr: 'البوابة المركزية من Google لتحديد موقع أي هاتف أو تابلت أندرويد، وقفل الهاتف، أو مسح البيانات بالكامل لحماية الخصوصية.',
    descriptionEn: 'Locate, secure, and erase data on lost or stolen Android devices via Google.',
    category: 'phone_hardware',
    officialUrl: 'https://www.google.com/android/find',
    isVerifiedOfficial: true,
    contactMethodAr: 'لوحة تحكم أجهزة Google Android الرسمية',
    contactMethodEn: 'Google Android Device Security Center',
    sortOrder: 45,
    tags: ['google', 'android', 'pixel', 'اندرويد', 'تتبع هاتف', 'قفل اندرويد', 'مسح هاتف'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // =========================================================================
  // 💻 MICROSOFT & OUTLOOK (مايكروسوفت، أوتلوك، وهوتميل)
  // =========================================================================
  {
    id: 'sp_msft_acsr_recovery',
    company: 'Microsoft',
    platformName: 'Microsoft / Outlook / Hotmail',
    serviceNameAr: 'استرداد حساب Microsoft و Outlook (نموذج ACSR الآلي)',
    serviceNameEn: 'Microsoft Account Automated Recovery Wizard (ACSR)',
    descriptionAr: 'نموذج التحقق الرسمي والآلي لاسترجاع حسابات مايكروسوفت و Hotmail و Outlook المفقودة أو المخترقة دون الحاجة لرقم الهاتف القديم.',
    descriptionEn: 'Official automated recovery questionnaire for Microsoft and Outlook accounts.',
    category: 'recovery',
    officialUrl: 'https://account.live.com/acsr',
    isVerifiedOfficial: true,
    contactMethodAr: 'نموذج استرداد Microsoft ACSR المشفر',
    contactMethodEn: 'Microsoft ACSR Recovery Form',
    notesAr: 'قدم أكبر قدر من المعلومات الدقيقة: كلمات المرور السابقة، عناوين الرسائل الأخيرة المرسلة، وعناوين جهات الاتصال.',
    sortOrder: 46,
    isPopular: true,
    tags: ['microsoft', 'outlook', 'hotmail', 'مايكروسوفت', 'اوتميل', 'استرداد', 'حساب مايكروسوفت'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_msft_outlook_abuse',
    company: 'Microsoft',
    platformName: 'Microsoft Outlook',
    serviceNameAr: 'الإبلاغ عن رسائل التصيد والاحتيال في Outlook / Hotmail',
    serviceNameEn: 'Report Phishing & Spam to Microsoft Abuse Center',
    descriptionAr: 'البوابة المخصصة لإرسال بلاغات عن رسائل البريد الإلكتروني الاحتيالية التي تنتحل صفة بنوك أو شركات عبر خوادم مايكروسوفت.',
    descriptionEn: 'Submit malicious phishing emails to Microsoft security teams for blocklist addition.',
    category: 'safety',
    officialUrl: 'https://msrc.microsoft.com/report/',
    isVerifiedOfficial: true,
    contactMethodAr: 'مركز استجابة الأمان من مايكروسوفت MSRC',
    contactMethodEn: 'Microsoft Security Response Center (MSRC)',
    officialEmail: 'abuse@outlook.com',
    sortOrder: 47,
    tags: ['microsoft', 'outlook', 'تصيد', 'بريد احتيالي', 'abuse'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // =========================================================================
  // ☁️ HOSTING, CLOUD, DOMAIN REGISTRARS & DNS ABUSE (شركات الاستضافة والنطاقات)
  // =========================================================================
  {
    id: 'sp_abuse_cloudflare',
    company: 'Cloudflare',
    platformName: 'Cloudflare Abuse Portal',
    serviceNameAr: 'الإبلاغ عن المواقع الاحتيالية والتصيد المستضافة على Cloudflare',
    serviceNameEn: 'Cloudflare Abuse & DMCA Takedown Reporting System',
    descriptionAr: 'البوابة الرسمية لإرسال بلاغات إسقاط المواقع الاحتيالية، هجمات التصيد، انتهاكات الخصوصية، والمواقع الخبيثة المحمية بواسطة Cloudflare.',
    descriptionEn: 'Official form to report phishing, malware, and abuse hosted or proxied via Cloudflare.',
    category: 'hosting_dns',
    officialUrl: 'https://abuse.cloudflare.com',
    isVerifiedOfficial: true,
    contactMethodAr: 'بوابة Cloudflare Abuse الآلية المباشرة',
    contactMethodEn: 'Automated Cloudflare Abuse Triage',
    sortOrder: 48,
    isPopular: true,
    tags: ['cloudflare', 'كلاودفلير', 'إسقاط موقع', 'احتيال', 'تصيد', 'abuse', 'phishing'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_abuse_namecheap',
    company: 'Namecheap',
    platformName: 'Namecheap Legal & Abuse',
    serviceNameAr: 'إسقاط النطاقات والمواقع الاحتيالية المسجلة على Namecheap',
    serviceNameEn: 'Namecheap Legal & Abuse Takedown Portal',
    descriptionAr: 'بوابة تقديم الشكاوى القانونية وإسقاط الدومينات والمواقع المخالفة ومواقع التصيد المسجلة لدى مسجل النطاقات العالمي Namecheap.',
    descriptionEn: 'Official abuse reporting portal for fraud, copyright infringement, and spam on Namecheap.',
    category: 'hosting_dns',
    officialUrl: 'https://support.namecheap.com/index.php?/Tickets/Submit/RenderForm/14',
    isVerifiedOfficial: true,
    contactMethodAr: 'تذكرة البلاغات القانونية وسوء الاستخدام',
    contactMethodEn: 'Namecheap Abuse Ticket System',
    officialEmail: 'abuse@namecheap.com',
    sortOrder: 49,
    tags: ['namecheap', 'نيم شيب', 'إسقاط دومين', 'حظر نطاق', 'abuse'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_abuse_godaddy',
    company: 'GoDaddy',
    platformName: 'GoDaddy Abuse Department',
    serviceNameAr: 'الإبلاغ عن المواقع المزيفة والدومينات الاحتيالية في GoDaddy',
    serviceNameEn: 'GoDaddy Abuse & Phishing Reporting Form',
    descriptionAr: 'البوابة الرسمية لمراسلة قسم الأمان في GoDaddy لإغلاق المواقع التي تسرق بيانات البطاقات البنكية أو تنتحل علامات تجارية.',
    descriptionEn: 'Submit abuse, phishing, and copyright complaints for websites registered with GoDaddy.',
    category: 'hosting_dns',
    officialUrl: 'https://support.godaddy.com/abuse',
    isVerifiedOfficial: true,
    contactMethodAr: 'نموذج GoDaddy Abuse المباشر',
    contactMethodEn: 'Official GoDaddy Abuse Form',
    officialEmail: 'abuse@godaddy.com',
    sortOrder: 50,
    tags: ['godaddy', 'جودادي', 'إسقاط موقع', 'دومين مزيف', 'phishing'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_abuse_hostinger',
    company: 'Hostinger',
    platformName: 'Hostinger Abuse Center',
    serviceNameAr: 'الإبلاغ عن استضافات ومواقع الاحتيال في Hostinger',
    serviceNameEn: 'Hostinger Abuse & Fraud Takedown Portal',
    descriptionAr: 'البوابة الرسمية لحذف مواقع التصيد والصفحات المزورة المستضافة على خوادم Hostinger.',
    descriptionEn: 'Official Hostinger portal to report copyright, phishing, or malware hosting.',
    category: 'hosting_dns',
    officialUrl: 'https://www.hostinger.com/report-abuse',
    isVerifiedOfficial: true,
    contactMethodAr: 'بوابة الإبلاغ عن سوء الاستخدام من Hostinger',
    contactMethodEn: 'Hostinger Abuse Submission Form',
    officialEmail: 'abuse@hostinger.com',
    sortOrder: 51,
    tags: ['hostinger', 'هوستنجر', 'استضافة', 'إسقاط موقع'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_abuse_aws_amazon',
    company: 'Amazon AWS',
    platformName: 'Amazon Web Services (AWS)',
    serviceNameAr: 'الإبلاغ عن التهديدات والمواقع الخبيثة على سحابة Amazon AWS',
    serviceNameEn: 'Report AWS Abuse & Malicious Infrastructure',
    descriptionAr: 'بوابة إرسال البلاغات لشركة أمازون لإسقاط الخوادم والسيرفرات المستخدمة في هجمات DDoS أو التصيد الإلكتروني.',
    descriptionEn: 'Official AWS form to report spam, malware, phishing, or attacks originating from AWS IPs.',
    category: 'hosting_dns',
    officialUrl: 'https://aws.amazon.com/forms/report-abuse',
    isVerifiedOfficial: true,
    contactMethodAr: 'نموذج بلاغات سوء استخدام Amazon AWS',
    contactMethodEn: 'AWS Trust & Safety Intake Form',
    officialEmail: 'abuse@amazonaws.com',
    sortOrder: 52,
    tags: ['aws', 'amazon', 'أمازون', 'سحابة', 'سيرفرات خبيثة', 'ddos', 'abuse'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // =========================================================================
  // 🛡️ CONTENT PROTECTION & ANTI-EXTORTION (حماية المحتوى ومكافحة الابتزاز)
  // =========================================================================
  {
    id: 'sp_stopncii_hash_protection',
    company: 'StopNCII.org',
    platformName: 'StopNCII Global Platform',
    serviceNameAr: 'حماية المحتوى الخاص ومنع الابتزاز بالبصمات الرقمية (StopNCII)',
    serviceNameEn: 'StopNCII - Stop Non-Consensual Intimate Image Abuse',
    descriptionAr: 'المنصة العالمية الأولى المعتمدة لمنع وتجفيف نشر الصور ومقاطع الفيديو الحساسة على شبكات التواصل دون رفع الصور الحقيقية (عبر إنشاء بصمات رقمية مشفرة Hashes على جهاز الضحية مباشرة بمشاركة Meta و TikTok و Reddit و OnlyFans وغيرها).',
    descriptionEn: 'Official global platform to prevent non-consensual intimate image sharing via on-device cryptographic hashing.',
    category: 'privacy_protection',
    officialUrl: 'https://stopncii.org',
    isVerifiedOfficial: true,
    contactMethodAr: 'أداة إنشاء البصمات الرقمية المشفرة الذاتية على المتصفح',
    contactMethodEn: 'On-Device Cryptographic Hash Creator',
    notesAr: 'تعمل الأداة محلياً 100% داخل المتصفح، ولا يتم رفع الصورة الأصلية لأي خادم إطلاقاً، بل تُرسل فقط البصمة الرقمية لحظرها استباقياً على جميع المنصات الشريكة.',
    sortOrder: 53,
    isPopular: true,
    tags: ['stopncii', 'ابتزاز', 'صور خاصة', 'حماية محتوى', 'extortion', 'blackmail', 'privacy', 'meta', 'tiktok'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_takeitdown_ncmec',
    company: 'NCMEC',
    platformName: 'Take It Down (حماية القاصرين)',
    serviceNameAr: 'أداة إزالة ومنع المحتوى الحساس للقاصرين (Take It Down)',
    serviceNameEn: 'Take It Down - NCMEC Youth Protection',
    descriptionAr: 'خدمة مجانية رسمية تابعة للمركز الوطني للأطفال المفقودين والمستغلين (NCMEC) لحذف ومنع تداول الصور ومقاطع الفيديو الخاصة بالقاصرين أو من التُقطت لهم صور قبل بلوغ 18 عاماً.',
    descriptionEn: 'Free official service by NCMEC to find and remove explicit images of youth under 18 from online platforms.',
    category: 'privacy_protection',
    officialUrl: 'https://takeitdown.ncmec.org',
    isVerifiedOfficial: true,
    contactMethodAr: 'معالج البصمات الرقمية المعتمد من NCMEC',
    contactMethodEn: 'Official NCMEC Hash Generation Tool',
    sortOrder: 54,
    isPopular: true,
    tags: ['takeitdown', 'ncmec', 'ابتزاز قاصرين', 'حماية أطفال', 'حذف صور', 'قاصرين'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_iwf_report',
    company: 'IWF',
    platformName: 'Internet Watch Foundation',
    serviceNameAr: 'البوابة الدولية للإبلاغ السري وحظر المحتوى غير القانوني (IWF)',
    serviceNameEn: 'IWF Confidential Reporting Portal',
    descriptionAr: 'البوابة الدولية المعتمدة لمكافحة وإزالة المواد الإباحية غير القانونية واستغلال الأطفال والجرائم الجسيمة من شبكة الإنترنت عالمياً.',
    descriptionEn: 'International hotline to report and take down illegal sexual material and abuse globally.',
    category: 'privacy_protection',
    officialUrl: 'https://report.iwf.org.uk',
    isVerifiedOfficial: true,
    contactMethodAr: 'بوابة الإبلاغ السري الدولية المشفرة',
    contactMethodEn: 'Confidential Encrypted Report Portal',
    sortOrder: 55,
    isPopular: true,
    tags: ['iwf', 'حماية', 'إبلاغ سري', 'جرائم رقمية', 'قائمة سوداء', 'حظر روابط'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_dmca_takedown',
    company: 'DMCA.com',
    platformName: 'DMCA Protection & Takedown',
    serviceNameAr: 'بوابة إرسال إخطارات إزالة المحتوى الرقمي والقرصنة (DMCA.com)',
    serviceNameEn: 'DMCA Takedown Notice Generator',
    descriptionAr: 'الأداة القياسية العالمية لإنشاء وإرسال إخطارات الحذف القانونية للمواقع ومزودي الاستضافة لحذف المحتوى المسروق أو التشهيري أو المنشور دون إذن.',
    descriptionEn: 'Global standard portal for sending copyright and content removal takedown notices.',
    category: 'copyright',
    officialUrl: 'https://www.dmca.com/takedowns',
    isVerifiedOfficial: true,
    contactMethodAr: 'معالج إخطارات الحذف القانونية DMCA',
    contactMethodEn: 'Official DMCA Takedown System',
    sortOrder: 56,
    tags: ['dmca', 'حقوق نشر', 'سرقة محتوى', 'إزالة محتوى', 'استضافة', 'takedown'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_cybercrime_fbi_ic3',
    company: 'FBI / IC3',
    platformName: 'Internet Crime Complaint Center (IC3)',
    serviceNameAr: 'المركز الدولي للإبلاغ عن الجرائم المالية والابتزاز الإلكتروني (IC3)',
    serviceNameEn: 'FBI Internet Crime Complaint Center (IC3)',
    descriptionAr: 'الجهة الرسمية لتسجيل الشكاوى والبلاغات الدولية الخاصة بالاحتيال المالي الإلكتروني، برمجيات الفدية (Ransomware)، وعمليات النصب العابرة للحدود.',
    descriptionEn: 'Official US hub for reporting cybercrime, wire fraud, ransomware, and online extortion.',
    category: 'safety',
    officialUrl: 'https://www.ic3.gov',
    isVerifiedOfficial: true,
    contactMethodAr: 'بوابة تقديم الشكاوى الجنائية المشفرة',
    contactMethodEn: 'Official Cyber Crime Intake Form',
    sortOrder: 57,
    isPopular: true,
    tags: ['ic3', 'fbi', 'جرائم مالية', 'ابتزاز دولي', 'احتيال بنكي', 'ransomware', 'cybercrime'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // =========================================================================
  // 🔍 INFOSEC & OSINT TOOLS (أدوات أمن المعلومات والتحقيق الجنائي الرقمي)
  // =========================================================================
  {
    id: 'sp_infosec_virustotal',
    company: 'Google Cloud / Chronicle',
    platformName: 'VirusTotal',
    serviceNameAr: 'فحص الروابط والملفات المشبوهة بـ 70+ محرك عالمي (VirusTotal)',
    serviceNameEn: 'VirusTotal Malware & URL Scanner',
    descriptionAr: 'المنصة العالمية الرائدة لتحليل وفحص الملفات والروابط والـ IP والنطاقات عبر أكثر من 70 محرك مكافحة فيروسات وقواعد بيانات تهديدات سيبرانية.',
    descriptionEn: 'Analyze suspicious files, domains, IPs, and URLs to detect malware and breaches.',
    category: 'infosec_tools',
    officialUrl: 'https://www.virustotal.com/gui/home/url',
    isVerifiedOfficial: true,
    contactMethodAr: 'فحص فوري متعدد المحركات (Multi-Engine Sandbox)',
    contactMethodEn: 'Real-time Multi-Engine Cloud Scanner',
    sortOrder: 58,
    isPopular: true,
    tags: ['virustotal', 'فايروس توتال', 'فحص روابط', 'كشف التهديدات', 'malware', 'antivirus', 'أمن معلومات'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_infosec_haveibeenpwned',
    company: 'Have I Been Pwned',
    platformName: 'HIBP Breach Database',
    serviceNameAr: 'فحص تسريب الحسابات والبيانات الشخصية (Have I Been Pwned)',
    serviceNameEn: 'Have I Been Pwned Data Breach Check',
    descriptionAr: 'قاعدة البيانات المرجعية الأوثق عالمياً للتحقق مما إذا كان البريد الإلكتروني أو رقم الهاتف أو كلمة المرور قد تسربت في عمليات الاختراق العالمية.',
    descriptionEn: 'Check if your email, phone, or password has been compromised in data breaches.',
    category: 'infosec_tools',
    officialUrl: 'https://haveibeenpwned.com',
    isVerifiedOfficial: true,
    contactMethodAr: 'محرك بحث التسريبات الآمن المشفر بالـ SHA-1/k-Anonymity',
    contactMethodEn: 'k-Anonymity Breach Verification Engine',
    sortOrder: 59,
    isPopular: true,
    tags: ['hibp', 'haveibeenpwned', 'تسريب بيانات', 'اختراق بريد', 'فحص كلمات المرور', 'breach', 'pwned'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_infosec_urlscan',
    company: 'URLScan.io',
    platformName: 'URLScan Sandbox & Analyzer',
    serviceNameAr: 'تحليل المتصفح والرسم البياني لصفحات التصيد الآمن (urlscan.io)',
    serviceNameEn: 'URLScan.io - Automated Website Sandbox Scanner',
    descriptionAr: 'بيئة افتراضية (Sandbox) لفحص وتصوير صفحات الويب والروابط المشبوهة والتحقق من شهادات SSL وخوادم التوجيه وأكواد الجافاسكريبت دون فتحها على جهازك.',
    descriptionEn: 'Sandbox environment that navigates to URLs, records activity, DOM, and takes full screenshots safely.',
    category: 'infosec_tools',
    officialUrl: 'https://urlscan.io',
    isVerifiedOfficial: true,
    contactMethodAr: 'ماسح الويب الافتراضي الآمن (Headless Browser Sandbox)',
    contactMethodEn: 'Automated Headless Sandbox Scanner',
    sortOrder: 60,
    isPopular: true,
    tags: ['urlscan', 'فحص تصيد', 'أدلة جنائية', 'sandbox', 'phishing', 'ssl', 'ip'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_infosec_shodan',
    company: 'Shodan',
    platformName: 'Shodan Search Engine',
    serviceNameAr: 'محرك بحث الأجهزة وخوادم الإنترنت المكشوفة (Shodan)',
    serviceNameEn: 'Shodan Search Engine for Internet-Connected Devices',
    descriptionAr: 'محرك البحث الاستخباراتي السيبراني لفحص المنافذ المفتوحة والخوادم والكاميرات والبنية التحتية للمواقع والشبكات المخترقة.',
    descriptionEn: 'Search engine for finding vulnerable internet-connected devices, servers, and open ports.',
    category: 'infosec_tools',
    officialUrl: 'https://www.shodan.io',
    isVerifiedOfficial: true,
    contactMethodAr: 'محرك الاستخبارات السيبرانية (OSINT)',
    contactMethodEn: 'Cyber Threat Intelligence Engine',
    sortOrder: 61,
    tags: ['shodan', 'شودان', 'فحص سيرفرات', 'منافذ مفتوحة', 'osint', 'cybersecurity'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_infosec_icann_whois',
    company: 'ICANN',
    platformName: 'ICANN Lookup / WHOIS',
    serviceNameAr: 'الاستعلام الرسمي عن مالكي النطاقات والمواقع (WHOIS Lookup)',
    serviceNameEn: 'ICANN WHOIS Domain Registration Data Lookup',
    descriptionAr: 'البوابة الرسمية لمنظمة ICANN لمعرفة مزود الخدمة وشركة الاستضافة وبيانات الاتصال الخاصة بالنطاقات ومواقع الاحتيال لتقديم بلاغات الإسقاط.',
    descriptionEn: 'Official ICANN registry tool to find domain registrars, name servers, and abuse contacts.',
    category: 'infosec_tools',
    officialUrl: 'https://lookup.icann.org',
    isVerifiedOfficial: true,
    contactMethodAr: 'سجل ICANN الرسمي للنطاقات',
    contactMethodEn: 'Official ICANN Registry Query',
    sortOrder: 62,
    isPopular: true,
    tags: ['whois', 'icann', 'نطاق', 'دومين', 'معلومات موقع', 'إسقاط موقع', 'domain'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_infosec_phishtank',
    company: 'Cisco / PhishTank',
    platformName: 'PhishTank',
    serviceNameAr: 'قاعدة بيانات الإبلاغ عن روابط التصيد والاحتيال (PhishTank)',
    serviceNameEn: 'PhishTank Anti-Phishing Clearinghouse',
    descriptionAr: 'المنصة العالمية المجانية للتحقق من مواقع الاصطياد المالي وسرقة الحسابات، والإبلاغ عنها لإدراجها في قائمة الحظر لمتصفحات كروم وفايرفوكس.',
    descriptionEn: 'Global anti-phishing database to submit and verify malicious phishing websites.',
    category: 'infosec_tools',
    officialUrl: 'https://phishtank.org',
    isVerifiedOfficial: true,
    contactMethodAr: 'بوابة فحص وتصنيف روابط التصيد المباشرة',
    contactMethodEn: 'Community Verified Phishing Submission',
    sortOrder: 63,
    tags: ['phishtank', 'تصيد', 'روابط احتيال', 'سرقة بطاقات', 'phishing', 'كشف روابط'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_infosec_2fa_directory',
    company: '2FA Directory',
    platformName: 'Two Factor Auth Guide',
    serviceNameAr: 'دليل تفعيل التحقق بخطوتين لجميع المنصات (2FA Directory)',
    serviceNameEn: '2FA Directory - Two-Factor Authentication Portal',
    descriptionAr: 'الدليل التقني الشامل والمحدث لتفعيل المصادقة الثنائية (2FA) ومفاتيح الأمان الفيزيائية (Hardware Keys) على أكثر من 3000 موقع وتطبيق عالمي.',
    descriptionEn: 'Comprehensive directory of sites that support two-factor authentication and security keys.',
    category: 'infosec_tools',
    officialUrl: 'https://2fa.directory',
    isVerifiedOfficial: true,
    contactMethodAr: 'دليل الأمان والمصادقة المباشر',
    contactMethodEn: 'Direct 2FA Security Catalog',
    sortOrder: 64,
    tags: ['2fa', 'تحقق بخطوتين', 'أمان الحسابات', 'authenticator', 'passkey', 'حماية'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_infosec_mxtoolbox',
    company: 'MXToolbox',
    platformName: 'MXToolbox Email Security',
    serviceNameAr: 'فحص سجلات البريد الإلكتروني وانتحال الهوية (SPF, DKIM, DMARC)',
    serviceNameEn: 'MXToolbox Email Deliverability & DNS Analyzer',
    descriptionAr: 'أداة فحص سجلات البريد الإلكتروني للمؤسسات والشركات لكشف ما إذا كان البريد عرضة للتزوير والانتحال (Spoofing) وضبط حماية DMARC.',
    descriptionEn: 'Diagnostics tool for email headers, DNS records, blacklist status, and anti-spoofing checks.',
    category: 'infosec_tools',
    officialUrl: 'https://mxtoolbox.com',
    isVerifiedOfficial: true,
    contactMethodAr: 'أداة فحص سجلات DNS والبريد المباشرة',
    contactMethodEn: 'Online DNS & Mail Diagnostics Tool',
    sortOrder: 65,
    tags: ['mxtoolbox', 'بريد', 'spf', 'dkim', 'dmarc', 'انتحال بريد', 'فحص دومين'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_infosec_ipqualityscore',
    company: 'IPQualityScore',
    platformName: 'IPQS Fraud Detection',
    serviceNameAr: 'فحص جودة الآي بي وكشف VPN والبروكسي ومؤشرات الاحتيال (IPQS)',
    serviceNameEn: 'IPQualityScore IP Reputation & Fraud Score',
    descriptionAr: 'فحص عناوين IP المشبوهة، التحقق من استخدام شبكات Tor أو VPN أو خوادم البروكسي من قبل المخترقين وتقدير مستوى الخطورة.',
    descriptionEn: 'Real-time IP address lookup for proxy detection, bot detection, and fraudulent transaction risks.',
    category: 'infosec_tools',
    officialUrl: 'https://www.ipqualityscore.com/free-ip-lookup-proxy-vpn-test',
    isVerifiedOfficial: true,
    contactMethodAr: 'محرك تقييم سمعة الآي بي السحابي',
    contactMethodEn: 'IP Reputation & Proxy Detection Engine',
    sortOrder: 66,
    tags: ['ip', 'vpn', 'proxy', 'فحص اي بي', 'كشف موقع', 'احتيال'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // =========================================================================
  // 💳 FINANCIAL & CRYPTO PLATFORMS (المنصات المالية والعملات الرقمية)
  // =========================================================================
  {
    id: 'sp_fin_paypal_security',
    company: 'PayPal',
    platformName: 'PayPal Security & Dispute',
    serviceNameAr: 'مركز حل النزاعات والمعاملات غير المصرح بها في PayPal',
    serviceNameEn: 'PayPal Resolution Center & Unauthorized Transaction Portal',
    descriptionAr: 'البوابة الرسمية لاسترداد الأموال المسروقة في المعاملات غير المصرح بها، فتح نزاعات الاحتيال، وتأمين حسابات PayPal المقيدة.',
    descriptionEn: 'Official portal to dispute unauthorized payments and secure locked PayPal accounts.',
    category: 'finance_crypto',
    officialUrl: 'https://www.paypal.com/disputes/',
    isVerifiedOfficial: true,
    contactMethodAr: 'مركز حل النزاعات الرسمي من PayPal والبريد spoof@paypal.com',
    contactMethodEn: 'PayPal Resolution Center & Spoof Desk',
    officialEmail: 'spoof@paypal.com',
    sortOrder: 67,
    isPopular: true,
    tags: ['paypal', 'بايبال', 'احتيال مالي', 'استرداد أموال', 'نزاع مالي', 'سرقة بطاقة'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_fin_binance_security',
    company: 'Binance',
    platformName: 'Binance Security Center',
    serviceNameAr: 'تجميد الحسابات المسروقة واسترداد الأمان في Binance',
    serviceNameEn: 'Binance Account Security & Emergency Self-Freeze',
    descriptionAr: 'البوابة الرسمية لتجميد وسحب صلاحيات الحساب فوراً عند الاشتباه بالاختراق، والطعن في قفل السحب وإعادة تعيين التحقق الثنائي (2FA Reset).',
    descriptionEn: 'Emergency portal to disable account, reset compromised 2FA, and report cryptocurrency theft.',
    category: 'finance_crypto',
    officialUrl: 'https://www.binance.com/en/support',
    isVerifiedOfficial: true,
    contactMethodAr: 'دردشة الدعم الفني المباشرة من Binance (Live Chat 24/7)',
    contactMethodEn: 'Binance 24/7 Priority Security Support',
    sortOrder: 68,
    isPopular: true,
    tags: ['binance', 'بينانس', 'كريبتو', 'عملات رقمية', 'تجميد حساب', 'سرقة محفظة', 'crypto'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // =========================================================================
  // 🤖 AI PLATFORMS (منصات الذكاء الاصطناعي)
  // =========================================================================
  {
    id: 'sp_ai_openai_chatgpt',
    company: 'OpenAI',
    platformName: 'OpenAI / ChatGPT',
    serviceNameAr: 'دعم وأمان حسابات OpenAI و ChatGPT واسترداد الوصول',
    serviceNameEn: 'OpenAI & ChatGPT Account Security & Support Hub',
    descriptionAr: 'البوابة الرسمية لشركة OpenAI لاستعادة حسابات ChatGPT المخترقة، إلغاء الاشتراكات غير المصرح بها، والإبلاغ عن إساءة استخدام النماذج.',
    descriptionEn: 'Official OpenAI support for compromised ChatGPT accounts and unauthorized API token usage.',
    category: 'ai_tools',
    officialUrl: 'https://help.openai.com',
    isVerifiedOfficial: true,
    contactMethodAr: 'مركز مساعدة OpenAI وبوت المحادثة المباشر',
    contactMethodEn: 'OpenAI Help Center & Live Security Bot',
    sortOrder: 69,
    tags: ['openai', 'chatgpt', 'ذكاء اصطناعي', 'شات جي بي تي', 'اختراق حساب'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // =========================================================================
  // ✉️ SECURE EMAIL PROVIDERS (مزودو البريد المشفر والآمن)
  // =========================================================================
  {
    id: 'sp_email_proton',
    company: 'Proton',
    platformName: 'ProtonMail & ProtonVPN',
    serviceNameAr: 'الإبلاغ عن إساءة الاستخدام والتصيد في ProtonMail',
    serviceNameEn: 'Proton Abuse & Phishing Reporting Portal',
    descriptionAr: 'البوابة الرسمية لمراسلة فريق الأمان في Proton لإغلاق حسابات البريد المشفر المستخدمة في الابتزاز أو طلب الفدية أو التصيد.',
    descriptionEn: 'Official abuse contact to suspend Proton accounts used for extortion, fraud, or phishing.',
    category: 'email_cloud',
    officialUrl: 'https://proton.me/abuse',
    isVerifiedOfficial: true,
    contactMethodAr: 'بوابة الإبلاغ عن سوء الاستخدام abuse@proton.me',
    contactMethodEn: 'Official Proton Abuse Submission',
    officialEmail: 'abuse@proton.me',
    sortOrder: 70,
    tags: ['proton', 'protonmail', 'بروتون ميل', 'بريد مشفر', 'ابتزاز', 'abuse'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sp_email_yahoo',
    company: 'Yahoo',
    platformName: 'Yahoo Mail',
    serviceNameAr: 'استرداد حساب Yahoo Mail ودعم مشاكل تسجيل الدخول',
    serviceNameEn: 'Yahoo Sign-in Helper & Compromised Account Recovery',
    descriptionAr: 'البوابة الرسمية لشركة Yahoo لاستعادة حسابات البريد الإلكتروني المخترقة وتأكيد الهوية عبر خيارات الأمان البديلة.',
    descriptionEn: 'Official Yahoo portal to recover locked, hijacked, or inactive Yahoo accounts.',
    category: 'recovery',
    officialUrl: 'https://login.yahoo.com/forgot',
    isVerifiedOfficial: true,
    contactMethodAr: 'مساعد تسجيل الدخول الرسمي من Yahoo',
    contactMethodEn: 'Yahoo Sign-In Helper',
    sortOrder: 71,
    tags: ['yahoo', 'ياهو', 'استرداد ياهو', 'بريد ياهو', 'recovery'],
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
      // Merge initial portals so any newly added default portals are immediately visible
      const existingIds = new Set(parsed.map((p: any) => p.id));
      const missingInitial = INITIAL_SUPPORT_PORTALS.filter(ip => !existingIds.has(ip.id));
      if (missingInitial.length > 0) {
        const merged = [...parsed, ...missingInitial];
        localStorage.setItem(LOCAL_PORTALS_KEY, JSON.stringify(merged));
        return merged;
      }
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
