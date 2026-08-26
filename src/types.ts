export type UserRole = 'super_admin' | 'admin' | 'manager' | 'employee' | 'viewer';

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'revoked';

export type LoginMethod = 'google' | 'email_password' | 'both';

export interface UserPermissions {
  casesView: boolean;
  casesCreate: boolean;
  casesEdit: boolean;
  casesDelete: boolean;
  requestsView: boolean;
  requestsCreate: boolean;
  requestsEdit: boolean;
  financeView: boolean;
  financeManage: boolean;
  employeeEarningsView: boolean;
  employeeEarningsManage: boolean;
  personalFinanceView: boolean;
  personalFinanceManage: boolean;
  teamManage: boolean;
  securityView: boolean;
  settingsManage: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  isActive: boolean;
  phone?: string;
  jobTitle?: string;
  avatarUrl?: string;
  departments?: string[]; // e.g. ['cases', 'requests', 'clients', 'finance', 'knowledge', 'projects', 'forms', 'files']
  loginMethod?: LoginMethod;
  googleAccountId?: string;
  googleEmail?: string;
  googleConnectedAt?: any;
  lastLogin?: any;
  lastDevice?: string;
  lastIp?: string;
  permissions?: Partial<UserPermissions>;
  createdAt: any;
  updatedAt: any;
  createdBy?: string;
}

export type CaseStatus = 'new' | 'in_progress' | 'pending' | 'overdue' | 'completed' | 'cancelled';
export type CasePriority = 'low' | 'medium' | 'high' | 'urgent';
export type CasePaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'refunded';

export interface CaseTypeFieldDefinition {
  key: string;
  labelAr: string;
  labelEn: string;
  type: 'text' | 'url' | 'textarea' | 'select' | 'date' | 'number';
  placeholderAr?: string;
  placeholderEn?: string;
  options?: { value: string; labelAr: string; labelEn: string }[];
  required?: boolean;
}

export interface CaseTypeConfig {
  id: string;
  key: string;
  labelAr: string;
  labelEn: string;
  icon?: string;
  fields?: CaseTypeFieldDefinition[];
  isActive: boolean;
  sortOrder: number;
  isSystem?: boolean;
}

export interface PlatformConfig {
  id: string;
  name: string;
  nameAr: string;
  icon?: string;
  isActive: boolean;
  sortOrder: number;
  isPopular?: boolean;
}

export interface CaseItem {
  id: string;
  caseNumber: string; // e.g. JB-2026-000001
  externalNumber?: string;
  title: string;
  caseType: string; // key matching CaseTypeConfig
  platform?: string;
  status: CaseStatus;
  priority: CasePriority;
  paymentStatus?: CasePaymentStatus;
  assignedTo?: {
    uid: string;
    name: string;
    email: string;
  };
  client?: {
    id?: string;
    clientId?: string; // Unique customer identifier e.g. CLT-2026-0001
    name: string;
    phone?: string;
    whatsapp?: string;
    email?: string;
    company?: string;
  };
  typeSpecificData?: Record<string, any>;
  description?: string;
  notes?: string;
  agreedAmount?: number;
  totalPaid?: number;
  remainingAmount?: number;
  totalAllocatedToEmployees?: number;
  remainingBusinessAmount?: number;
  currency?: string;
  isDeleted: boolean;
  deletedAt?: any;
  nextFollowUp?: string;
  createdAt: any;
  updatedAt: any;
  createdBy: {
    uid: string;
    name: string;
  };
}

export interface CaseEvent {
  id: string;
  caseId: string;
  action: string;
  title: string;
  description?: string;
  performedBy: {
    uid: string;
    name: string;
  };
  timestamp: any;
  metadata?: Record<string, any>;
}

export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled';

export interface CaseTask {
  id: string;
  caseId: string;
  caseNumber?: string;
  title: string;
  description?: string;
  assignedTo?: {
    uid: string;
    name: string;
  };
  priority: CasePriority;
  dueDate?: string;
  status: TaskStatus;
  createdAt: any;
  completedAt?: any;
  createdBy: {
    uid: string;
    name: string;
  };
}

export type ReminderStatus = 'upcoming' | 'completed' | 'overdue';

export interface CaseReminder {
  id: string;
  caseId?: string;
  caseNumber?: string;
  caseTitle?: string;
  title: string;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  note?: string;
  status: ReminderStatus;
  assignedTo?: {
    uid: string;
    name: string;
  };
  createdAt: any;
  createdBy: {
    uid: string;
    name: string;
  };
}

export interface CaseLink {
  id: string;
  caseId: string;
  title: string;
  url: string;
  description?: string;
  category?: string;
  createdAt: any;
  createdBy: {
    uid: string;
    name: string;
  };
}

export type AttachmentSyncStatus = 'synced' | 'local' | 'pending' | 'uploading' | 'failed';

export interface CaseAttachment {
  id: string;
  caseId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  downloadUrl?: string;
  dataUrl?: string; // for local cached previews
  syncStatus: AttachmentSyncStatus;
  uploadedBy: {
    uid: string;
    name: string;
  };
  createdAt: any;
  notes?: string;
}

export interface PaymentRecord {
  id: string;
  caseId?: string;
  caseNumber?: string;
  caseTitle?: string;
  clientName?: string;
  agreedAmount?: number;
  paymentAmount?: number;
  amount: number;
  currency: string;
  paymentDate?: string;
  paidAt?: any;
  paymentMethod: string;
  note?: string;
  notes?: string;
  receiptNumber?: string;
  status?: 'paid' | 'pending' | 'refunded';
  recordedBy?: {
    uid: string;
    name: string;
  };
  createdBy?: {
    uid: string;
    name: string;
  };
  createdAt: any;
}

export interface ClientRecord {
  id: string;
  clientId?: string; // Permanent Unique ID e.g. CLT-0001
  name: string;
  company?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  notes?: string;
  caseCount?: number;
  caseIds?: string[];
  createdAt: any;
  updatedAt: any;
}

export type RequestType = 'review' | 'approval' | 'financial_approval' | 'reassignment' | 'price_exception' | 'help' | 'close_case' | 'info' | 'custom' | 'other';
export type RequestStatus = 'new' | 'in_review' | 'approved' | 'rejected' | 'completed';

export interface InternalRequest {
  id: string;
  type: RequestType;
  title: string;
  description?: string;
  details?: string;
  caseId?: string;
  caseNumber?: string;
  priority?: CasePriority;
  status: RequestStatus;
  requestedBy: {
    uid: string;
    name: string;
  };
  assignedTo?: {
    uid: string;
    name: string;
  };
  reviewedBy?: {
    uid: string;
    name: string;
  };
  reviewNotes?: string;
  createdAt: any;
  updatedAt: any;
}

export type ExternalRequestSource = 'google_form' | 'website_sheet' | 'manual' | 'internal';

export type ExternalRequestStatus = 
  | 'new' 
  | 'under_review' 
  | 'assigned' 
  | 'converted_to_case' 
  | 'linked_to_case' 
  | 'waiting_for_info' 
  | 'rejected' 
  | 'duplicate' 
  | 'completed';

export interface DriveAttachmentRef {
  fileId: string;
  fileName: string;
  fileType?: string;
  fileSize?: number;
  url: string;
  thumbnailUrl?: string;
  isImage?: boolean;
  driveFolderId?: string;
}

export interface ExternalRequest {
  id: string;
  requestId: string; // e.g. EXT-2026-00091 or Form Response ID or Sheet row ID
  source: ExternalRequestSource;
  sourceLabel?: string;
  sourceId?: string; // e.g. row index or form response id
  sheetRowIndex?: number;
  createdAt: any;
  receivedAt?: any;
  clientName: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  requestType: string;
  suggestedCaseType?: string;
  platform?: string;
  accountUrl?: string;
  postUrl?: string;
  description?: string;
  notes?: string;
  status: ExternalRequestStatus;
  assignedTo?: {
    uid: string;
    name: string;
  };
  linkedCaseId?: string;
  linkedCaseNumber?: string;
  driveAttachments?: DriveAttachmentRef[];
  rawPayload?: Record<string, any>;
  processedAt?: any;
  processedBy?: {
    uid: string;
    name: string;
  };
  isHistorical?: boolean;
  conflict?: {
    detected: boolean;
    field: string;
    originalValue: any;
    jbValue: any;
    websiteValue: any;
  };
  updatedAt?: any;
}

export interface GoogleWorkspaceConfig {
  id: string;
  isConnected: boolean;
  userEmail?: string;
  userName?: string;
  lastSyncTime?: string;
  syncMode: 'read_only' | 'one_way_in' | 'one_way_out' | 'two_way';
  syncFrequencyMinutes: number; // e.g. 5, 15, 30, 0 (manual)
  autoSyncEnabled: boolean;
  
  // Existing Production Website Sheet
  websiteSpreadsheetId?: string;
  websiteSpreadsheetUrl?: string;
  websiteSpreadsheetName?: string;
  websiteSheetName?: string;
  websiteDiscoveredHeaders?: string[];
  websiteDiscoveredSheets?: string[];
  websiteDiscoveredRowCount?: number;
  websiteFieldMapping: Record<string, string>; // jbFieldKey -> websiteColumnHeader
  websiteStatusMapping?: Record<string, string>; // websiteStatus -> jbStatus
  
  // Dedicated JB Work External Requests Spreadsheet
  externalSpreadsheetId?: string;
  externalSpreadsheetUrl?: string;
  externalSpreadsheetName?: string;
  externalSheetsList?: string[];
  
  // Dedicated JB Work External Google Form
  externalFormId?: string;
  externalFormTitle?: string;
  externalFormUrl?: string;
  externalFormEditUrl?: string;
  
  // Google Drive Folders
  driveRootFolderId?: string;
  driveRootFolderName?: string;
  driveExternalRequestsFolderId?: string;
  driveCasesFolderId?: string;
  driveCasesCurrentYearFolderId?: string;
  driveReportsFolderId?: string;
  driveArchiveFolderId?: string;

  // Custom Department Forms (Outside core cases scope)
  departmentForms?: Array<{
    id: string;
    title: string;
    department: string;
    formUrl: string;
    editUrl: string;
    createdAt: string;
    fieldsCount?: number;
    description?: string;
  }>;

  // Snapshot before write
  lastSnapshot?: {
    timestamp: string;
    spreadsheetId: string;
    sheetName: string;
    headers: string[];
    mapping: Record<string, string>;
  };
  updatedAt?: any;
  updatedBy?: {
    uid: string;
    name: string;
  };
}

export interface SyncLogEntry {
  id: string;
  syncId: string;
  source: 'website_sheet' | 'google_form' | 'all' | 'manual';
  startedAt: any;
  completedAt: any;
  durationMs: number;
  recordsFound: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  errors: string[];
  status: 'success' | 'warning' | 'error';
  triggeredBy: {
    uid: string;
    name: string;
  };
}

export type SecurityActionType = 
  | 'successful_login' 
  | 'login_success'
  | 'failed_login' 
  | 'login_failed'
  | 'unauthorized_access' 
  | 'password_changed' 
  | 'google_linked' 
  | 'google_unlinked' 
  | 'session_revoked' 
  | 'permission_changed' 
  | 'user_created' 
  | 'user_suspended' 
  | 'user_reactivated'
  | 'user_deleted'
  | 'super_admin_setup'
  | 'security_alert';

export interface SecurityLogEntry {
  id: string;
  attemptId?: string;
  action: SecurityActionType;
  timestamp: any;
  email?: string;
  userId?: string;
  userName?: string;
  loginMethod?: 'google' | 'email_password' | 'offline_token' | 'unknown';
  device?: string;
  browser?: string;
  ip?: string;
  location?: string;
  result: 'success' | 'denied' | 'blocked' | 'warning';
  details?: string;
  metadata?: Record<string, any>;
}

export interface UserSession {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: UserRole;
  device: string;
  browser: string;
  ip?: string;
  location?: string;
  lastActive: any;
  createdAt: any;
  isCurrent?: boolean;
  status: 'active' | 'revoked';
}

export interface EmployeeAllocation {
  id: string;
  caseId: string;
  caseNumber: string;
  caseTitle: string;
  clientName?: string;
  employeeUid: string;
  employeeName: string;
  employeeEmail?: string;
  amount: number;
  currency: string;
  allocatedDate: string; // YYYY-MM-DD
  status: 'pending' | 'paid' | 'cancelled';
  paidAt?: any;
  paymentMethod?: string;
  note?: string;
  allocatedBy: {
    uid: string;
    name: string;
  };
  createdAt: any;
  updatedAt?: any;
  isImmutable?: boolean;
  adjustmentReason?: string;
}

export interface BusinessExpense {
  id: string;
  title: string;
  category: 'tools_software' | 'servers_hosting' | 'equipment' | 'marketing' | 'salaries' | 'office' | 'transport' | 'legal_fees' | 'other';
  amount: number;
  currency: string;
  expenseDate: string; // YYYY-MM-DD
  paymentMethod: string;
  caseId?: string;
  caseNumber?: string;
  recipient?: string;
  notes?: string;
  receiptUrl?: string;
  status: 'confirmed' | 'reversal' | 'adjusted';
  recordedBy: {
    uid: string;
    name: string;
  };
  createdAt: any;
  updatedAt?: any;
}

export interface PersonalIncome {
  id: string;
  title: string;
  source: 'consulting' | 'advertising' | 'content' | 'investments' | 'freelance' | 'bonus' | 'other';
  amount: number;
  currency: string;
  incomeDate: string; // YYYY-MM-DD
  paymentMethod?: string;
  note?: string;
  category?: 'personal' | 'business_dividend' | 'other';
  recordedBy: {
    uid: string;
    name: string;
  };
  createdAt: any;
  updatedAt?: any;
}

export interface PersonalExpense {
  id: string;
  title: string;
  category: 'transport' | 'equipment' | 'tech_gadgets' | 'housing' | 'family' | 'travel' | 'food' | 'health' | 'education' | 'savings' | 'other';
  amount: number;
  currency: string;
  expenseDate: string; // YYYY-MM-DD
  paymentMethod: string;
  description?: string;
  note?: string;
  recordedBy: {
    uid: string;
    name: string;
  };
  createdAt: any;
  updatedAt?: any;
}

export interface InventoryItem {
  id: string;
  name: string;
  category?: string;
  quantity: number;
  purchasePrice: number;
  currentValue: number;
  currency: string;
  purchaseDate: string; // YYYY-MM-DD
  location?: string;
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'needs_repair';
  serialNumber?: string;
  notes?: string;
  imageUrl?: string;
  createdAt: any;
  updatedAt: any;
}

export interface PersonalAsset {
  id: string;
  name: string;
  category: 'laptop' | 'phone' | 'camera' | 'server' | 'equipment' | 'office_equipment' | 'vehicle' | 'real_estate' | 'other';
  value: number;
  currency: string;
  purchaseDate: string; // YYYY-MM-DD
  serialNumber?: string;
  status: 'active' | 'in_storage' | 'disposed';
  notes?: string;
  createdAt: any;
  updatedAt: any;
}

export interface ExchangeRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  rateDate: string; // YYYY-MM-DD
  updatedBy?: string;
  updatedAt: any;
}

export interface AuditLogItem {
  id: string;
  action: string;
  details?: string;
  entityType: 'case' | 'task' | 'reminder' | 'payment' | 'user' | 'attachment' | 'link' | 'auth' | 'settings' | 'request' | 'external_request' | 'google_sync' | 'finance' | 'employee_allocation' | 'personal_finance' | 'security';
  entityId?: string;
  entityTitle?: string;
  caseId?: string;
  performedBy: {
    uid: string;
    name: string;
    email?: string;
    role?: string;
  };
  timestamp: any;
}

export type AuditLogEntry = AuditLogItem;

export interface SystemSetting {
  id: string;
  initialized: boolean;
  initialSetupCompleted?: boolean;
  firstSuperAdminUid?: string;
  primaryAdminEmail?: string;
  secondaryAdminEmail?: string;
  systemNameAr: string;
  systemNameEn: string;
  defaultCurrency: string;
  allowOfflineTrust: boolean;
  contactEmail?: string;
  exchangeRates?: Record<string, number>; // e.g. "USD_SYP": 15000
  updatedAt?: any;
}

// ==========================================
// FORM CENTER & AUTOMATIONS
// ==========================================

export type FormFieldType = 
  | 'short_text'
  | 'long_text'
  | 'email'
  | 'phone'
  | 'number'
  | 'date'
  | 'time'
  | 'dropdown'
  | 'multiple_choice'
  | 'checkboxes'
  | 'file_upload'
  | 'url'
  | 'rating'
  | 'scale'
  | 'yes_no';

export interface FormField {
  id: string;
  label: string;
  labelAr?: string;
  type: FormFieldType;
  placeholder?: string;
  placeholderAr?: string;
  helpText?: string;
  required: boolean;
  options?: string[]; // For dropdown, multiple_choice, checkboxes
  min?: number;
  max?: number;
  step?: number;
  validationRegex?: string;
}

export type FormCategory = 
  | 'recruitment'
  | 'survey'
  | 'initiative'
  | 'client_intake'
  | 'service_request'
  | 'security_report'
  | 'bug_report'
  | 'feedback'
  | 'event'
  | 'general'
  | 'custom';

export type FormDestination = 
  | 'recruitment'
  | 'survey'
  | 'initiative'
  | 'request'
  | 'case'
  | 'task'
  | 'client'
  | 'feedback'
  | 'custom_record';

export interface FormAutomationConfig {
  destination: FormDestination;
  autoCreateClient?: boolean;
  autoCreateTask?: boolean;
  autoAssignUid?: string;
  autoAssignName?: string;
  defaultCaseType?: string;
  defaultPriority?: CasePriority;
  notifyEmails?: string[];
  notifyInApp?: boolean;
  tags?: string[];
  googleDriveFolderId?: string;
  responseSheetId?: string;
}

export interface FormDefinition {
  id: string;
  title: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  category: FormCategory;
  isPublic: boolean;
  status: 'active' | 'draft' | 'paused' | 'closed';
  fields: FormField[];
  automation: FormAutomationConfig;
  googleFormId?: string;
  googleFormUrl?: string;
  responseSheetUrl?: string;
  responseSheetId?: string;
  googleDriveFolderId?: string;
  responsesCount: number;
  lastResponseAt?: any;
  createdBy: {
    uid: string;
    name: string;
  };
  createdAt: any;
  updatedAt: any;
}

export interface FormResponseItem {
  id: string;
  formId: string;
  formTitle: string;
  category: FormCategory;
  destination: FormDestination;
  data: Record<string, any>;
  files?: { name: string; url: string; driveFileId?: string }[];
  processed: boolean;
  processedAt?: any;
  convertedTo?: {
    type: string; // 'case' | 'request' | 'applicant' | 'initiative' | 'client' | 'task'
    id: string;
    title?: string;
  };
  submittedBy?: {
    name?: string;
    email?: string;
    phone?: string;
    ip?: string;
  };
  createdAt: any;
}

export interface RecruitmentApplicant {
  id: string;
  formId?: string;
  responseId?: string;
  fullName: string;
  phone: string;
  email: string;
  experienceYears?: number;
  specialization: string;
  portfolioUrl?: string;
  cvFileUrl?: string;
  salaryExpectation?: string;
  availability?: string;
  status: 'new' | 'screening' | 'interview' | 'accepted' | 'rejected' | 'on_hold';
  notes?: string;
  interviewDate?: string;
  interviewNotes?: string;
  rating?: number;
  evaluatedBy?: string;
  convertedToEmployeeUid?: string;
  createdAt: any;
  updatedAt: any;
}

export interface InitiativeItem {
  id: string;
  formId?: string;
  responseId?: string;
  title: string;
  description: string;
  submittedBy: {
    name: string;
    email?: string;
    phone?: string;
  };
  category: string;
  priority: CasePriority;
  status: 'proposed' | 'under_review' | 'approved' | 'in_progress' | 'completed' | 'rejected';
  votesCount: number;
  votedUserIds?: string[];
  teamUids?: string[];
  budget?: number;
  currency?: string;
  tasksCount?: number;
  attachments?: { name: string; url: string }[];
  createdAt: any;
  updatedAt: any;
}

// ==========================================
// PROJECTS MODULE
// ==========================================

export interface ProjectMilestone {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
  completedAt?: any;
}

export interface ProjectItem {
  id: string;
  title: string;
  description?: string;
  category?: 'security' | 'development' | 'marketing' | 'consulting' | 'internal' | 'client_project';
  clientId?: string;
  clientName?: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  priority: CasePriority;
  startDate?: string;
  deadline?: string;
  budget?: number;
  currency?: string;
  spentAmount?: number;
  team: {
    uid: string;
    name: string;
    role?: string;
  }[];
  milestones: ProjectMilestone[];
  driveFolderUrl?: string;
  driveFolderId?: string;
  notes?: string;
  createdAt: any;
  updatedAt: any;
  createdBy: {
    uid: string;
    name: string;
  };
}

// ==========================================
// CONTENT STUDIO
// ==========================================

export type ContentStatus = 'idea' | 'draft' | 'scheduled' | 'published' | 'archived';

export interface ContentItem {
  id: string;
  title: string;
  bodyText: string;
  platform: 'facebook' | 'instagram' | 'x' | 'youtube' | 'tiktok' | 'telegram' | 'linkedin' | 'snapchat' | 'website' | 'other';
  status: ContentStatus;
  scheduledDate?: string;
  scheduledTime?: string;
  publishedAt?: any;
  mediaUrls?: string[];
  clientId?: string;
  clientName?: string;
  projectId?: string;
  tags?: string[];
  notes?: string;
  createdAt: any;
  updatedAt: any;
  createdBy: {
    uid: string;
    name: string;
  };
}

// ==========================================
// KNOWLEDGE BASE (JB KNOWLEDGE)
// ==========================================

export type KnowledgeCategory = 
  | 'procedure'
  | 'platform_policy'
  | 'security_sop'
  | 'template'
  | 'case_solution'
  | 'guide'
  | 'technical_note'
  | 'useful_tool';

export interface KnowledgeItem {
  id: string;
  title: string;
  category: KnowledgeCategory;
  platform?: string; // e.g. Facebook, Instagram, Telegram, Google, etc.
  content: string; // Markdown / Rich Text
  tags: string[];
  relatedCaseTypes?: string[];
  attachments?: { name: string; url: string }[];
  isVerified: boolean;
  viewsCount?: number;
  createdAt: any;
  updatedAt: any;
  createdBy: {
    uid: string;
    name: string;
  };
}

// ==========================================
// FILES & GOOGLE DRIVE
// ==========================================

export interface FileItemRecord {
  id: string;
  name: string;
  size?: number;
  mimeType?: string;
  url: string;
  driveFileId?: string;
  driveWebViewLink?: string;
  entityType?: 'case' | 'client' | 'request' | 'project' | 'employee' | 'form_response' | 'general';
  entityId?: string;
  entityTitle?: string;
  category?: 'document' | 'image' | 'video' | 'contract' | 'report' | 'evidence' | 'other';
  tags?: string[];
  uploadedBy: {
    uid: string;
    name: string;
  };
  createdAt: any;
}

// ==========================================
// PERSONAL AREA (SUPER ADMIN ONLY)
// ==========================================

export interface PersonalIdea {
  id: string;
  title: string;
  description?: string;
  category: 'business' | 'technology' | 'content' | 'security' | 'personal' | 'project';
  priority: CasePriority;
  status: 'new' | 'exploring' | 'in_progress' | 'implemented' | 'discarded';
  convertedTo?: {
    type: 'task' | 'project' | 'initiative';
    id: string;
  };
  createdAt: any;
  updatedAt: any;
}

export interface PersonalGoal {
  id: string;
  title: string;
  description?: string;
  timeframe: 'daily' | 'monthly' | 'yearly' | 'lifetime';
  type: 'business' | 'personal' | 'learning' | 'financial' | 'health';
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  targetDate?: string;
  status: 'active' | 'achieved' | 'paused' | 'cancelled';
  tasks?: { id: string; title: string; completed: boolean }[];
  createdAt: any;
  updatedAt: any;
}

export interface PersonalNote {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  category?: string;
  tags?: string[];
  color?: string;
  createdAt: any;
  updatedAt: any;
}

// ==========================================
// APPROVAL CENTER
// ==========================================

export type ApprovalType = 
  | 'refund'
  | 'discount'
  | 'case_closure'
  | 'large_expense'
  | 'employee_allocation'
  | 'sensitive_file_access'
  | 'permission_change'
  | 'custom';

export interface ApprovalRequest {
  id: string;
  type: ApprovalType;
  title: string;
  description?: string;
  caseId?: string;
  caseNumber?: string;
  requestedBy: {
    uid: string;
    name: string;
    email?: string;
  };
  amount?: number;
  currency?: string;
  status: 'pending' | 'approved' | 'rejected';
  resolvedAt?: any;
  resolvedBy?: {
    uid: string;
    name: string;
  };
  resolutionNote?: string;
  metadata?: Record<string, any>;
  createdAt: any;
}

// ==========================================
// BACKUP & RECOVERY
// ==========================================

export interface BackupSnapshot {
  id: string;
  name: string;
  timestamp: any;
  itemCounts: Record<string, number>;
  sizeBytes?: number;
  createdBy: {
    uid: string;
    name: string;
  };
}

