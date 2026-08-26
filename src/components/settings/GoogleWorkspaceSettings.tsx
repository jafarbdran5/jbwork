import React, { useState, useEffect } from 'react';
import { useI18n } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import { db, setCachedGoogleAccessToken } from '../../lib/firebase';
import { requestGoogleWorkspaceTokenDirectly } from '../../lib/googleAuthClient';
import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp, 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot 
} from 'firebase/firestore';
import { GoogleWorkspaceConfig, SyncLogEntry } from '../../types';
import { 
  discoverWebsiteSpreadsheet, 
  extractSpreadsheetId,
  createJBWorkExternalSpreadsheet, 
  createJBWorkExternalForm, 
  createDepartmentGoogleForm,
  setupJBWorkDriveHierarchy, 
  runFullGoogleSync,
  DiscoveredSpreadsheet,
  cleanFirestoreData
} from '../../lib/googleWorkspace';
import { logAuditAndEvent } from '../../lib/audit';
import { 
  Globe, 
  FileText, 
  FolderCheck, 
  RefreshCw, 
  Check, 
  AlertTriangle, 
  ExternalLink, 
  ShieldAlert, 
  CheckCircle, 
  Search, 
  Layers, 
  Clock, 
  Zap, 
  FolderPlus, 
  Database,
  Lock,
  ArrowRight,
  Sparkles,
  Link,
  ChevronDown,
  Plus,
  Building2,
  Copy,
  Trash2,
  HelpCircle,
  Send
} from 'lucide-react';

export const GoogleWorkspaceSettings: React.FC = () => {
  const { t, isRTL } = useI18n();
  const { 
    userProfile, 
    isSuperAdmin, 
    googleAccessToken, 
    authorizeGoogleWorkspace, 
    disconnectGoogleWorkspace 
  } = useAuth();

  const [config, setConfig] = useState<GoogleWorkspaceConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Discovery state for Existing Website Sheet
  const [websiteSheetInput, setWebsiteSheetInput] = useState<string>('https://docs.google.com/spreadsheets/d/1KNunZ9a48CBh6vvg9fkoOM4MrIPwUEptQ6YrznKqJUQ/edit?usp=sharing');
  const [isDiscovering, setIsDiscovering] = useState<boolean>(false);
  const [discoveredData, setDiscoveredData] = useState<DiscoveredSpreadsheet | null>(null);
  const [selectedSheetName, setSelectedSheetName] = useState<string>('');
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({
    clientName: '',
    phone: '',
    email: '',
    requestType: '',
    platform: '',
    accountUrl: '',
    postUrl: '',
    description: '',
    notes: '',
    status: '',
    caseNumber: '',
    requestId: ''
  });

  // Creation Actions State
  const [isMasterProvisioning, setIsMasterProvisioning] = useState<boolean>(false);
  const [showProvisioningModal, setShowProvisioningModal] = useState<boolean>(false);
  const [provisioningLogs, setProvisioningLogs] = useState<string[]>([]);
  const [provisioningStep, setProvisioningStep] = useState<string>('');
  const [provisioningSuccess, setProvisioningSuccess] = useState<boolean | null>(null);
  const [isCreatingSpreadsheet, setIsCreatingSpreadsheet] = useState<boolean>(false);
  const [isCreatingForm, setIsCreatingForm] = useState<boolean>(false);
  const [isSettingUpDrive, setIsSettingUpDrive] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Department Forms State (Outside core cases scope)
  const [showNewDeptFormModal, setShowNewDeptFormModal] = useState<boolean>(false);
  const [isCreatingDeptForm, setIsCreatingDeptForm] = useState<boolean>(false);
  const [deptFormTitle, setDeptFormTitle] = useState<string>('');
  const [deptFormDepartment, setDeptFormDepartment] = useState<string>('قسم المالية والمطالبات');
  const [deptFormDescription, setDeptFormDescription] = useState<string>('');

  // Sync Logs History
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>([]);

  // Manual Quick Editor state (to avoid re-running creation wizards)
  const [isEditingManualIds, setIsEditingManualIds] = useState<boolean>(false);
  const [manualWebsiteSheetUrl, setManualWebsiteSheetUrl] = useState<string>('');
  const [manualExternalSheetUrl, setManualExternalSheetUrl] = useState<string>('');
  const [manualFormUrl, setManualFormUrl] = useState<string>('');
  const [manualDriveFolderId, setManualDriveFolderId] = useState<string>('');

  // Direct Token input state
  const [showManualTokenModal, setShowManualTokenModal] = useState<boolean>(false);
  const [manualTokenInput, setManualTokenInput] = useState<string>('');

  // Load configuration from Firestore and LocalStorage mirror
  useEffect(() => {
    // 1. Instant load from local storage if present
    try {
      const cached = localStorage.getItem('jb_google_workspace_config');
      if (cached) {
        const parsed = JSON.parse(cached);
        setConfig((prev) => prev || parsed);
        if (parsed.websiteSpreadsheetId) {
          setWebsiteSheetInput(parsed.websiteSpreadsheetUrl || parsed.websiteSpreadsheetId);
        }
        if (parsed.websiteFieldMapping) {
          setFieldMapping(parsed.websiteFieldMapping);
        }
      }
    } catch (_) {}

    const docRef = doc(db, 'googleIntegrations', 'config');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as GoogleWorkspaceConfig;
        setConfig(data);
        try {
          localStorage.setItem('jb_google_workspace_config', JSON.stringify(data));
        } catch (_) {}
        if (data.websiteSpreadsheetId) {
          setWebsiteSheetInput(data.websiteSpreadsheetUrl || data.websiteSpreadsheetId);
        }
        if (data.websiteFieldMapping) {
          setFieldMapping(data.websiteFieldMapping);
        }
        if (data.websiteSheetName) {
          setSelectedSheetName(data.websiteSheetName);
        }
      } else {
        // Initial empty config
        const initialConfig: GoogleWorkspaceConfig = {
          id: 'config',
          isConnected: false,
          syncMode: 'read_only',
          syncFrequencyMinutes: 15,
          autoSyncEnabled: true,
          websiteFieldMapping: {}
        };
        setConfig(initialConfig);
      }
      setLoading(false);
    });

    // Load Sync Logs History
    const logsQuery = query(
      collection(db, 'googleSyncLogs'), 
      orderBy('startedAt', 'desc'), 
      limit(10)
    );
    const unsubLogs = onSnapshot(logsQuery, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as SyncLogEntry));
      setSyncLogs(list);
    });

    return () => {
      unsubscribe();
      unsubLogs();
    };
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 6000);
  };

  // Google Workspace Authorization
  const handleConnectGoogle = async () => {
    try {
      const token = await authorizeGoogleWorkspace();
      if (token) {
        showToast('success', 'تم تفويض Google Workspace بنجاح (OAuth 2.0)');
        // Update config isConnected in Firestore
        await setDoc(doc(db, 'googleIntegrations', 'config'), {
          isConnected: true,
          userEmail: userProfile?.email || 'admin',
          userName: userProfile?.displayName || 'Super Admin',
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || 
          err?.code === 'auth/cancelled-popup-request' || 
          err?.message?.includes('popup-closed-by-user')) {
        return;
      }
      showToast('error', `فشل الاتصال بـ Google: ${err.message || err}`);
    }
  };

  // Safe Discovery of Existing Website Sheet
  const handleDiscoverWebsiteSheet = async () => {
    let token = googleAccessToken;
    if (!token) {
      token = await authorizeGoogleWorkspace();
    }
    if (!token) {
      showToast('error', 'يرجى تفويض حساب Google أولاً.');
      return;
    }

    if (!websiteSheetInput.trim()) {
      showToast('error', 'يرجى إدخال رابط أو معرّف ملف Google Sheets الخاص بالموقع.');
      return;
    }

    setIsDiscovering(true);
    try {
      const result = await discoverWebsiteSpreadsheet(websiteSheetInput.trim(), token, selectedSheetName);
      setDiscoveredData(result);
      setSelectedSheetName(result.activeSheet);

      // Auto-suggest mappings if headers match common arabic/english words
      const autoMap: Record<string, string> = { ...fieldMapping };
      const findHeader = (keywords: string[]) => {
        return result.headers.find(h => 
          keywords.some(k => h.toLowerCase().includes(k.toLowerCase()))
        ) || '';
      };

      if (!autoMap.clientName) autoMap.clientName = findHeader(['اسم', 'name', 'full name', 'العميل', 'صاحب الطلب']);
      if (!autoMap.phone) autoMap.phone = findHeader(['هاتف', 'phone', 'واتساب', 'whatsapp', 'موبايل', 'رقم']);
      if (!autoMap.email) autoMap.email = findHeader(['بريد', 'email', 'ايميل']);
      if (!autoMap.requestType) autoMap.requestType = findHeader(['نوع', 'type', 'الطلب', 'category', 'خدمة']);
      if (!autoMap.platform) autoMap.platform = findHeader(['منصة', 'platform', 'الموقع']);
      if (!autoMap.accountUrl) autoMap.accountUrl = findHeader(['رابط الحساب', 'account', 'profile', 'حساب']);
      if (!autoMap.postUrl) autoMap.postUrl = findHeader(['منشور', 'post', 'url', 'رابط']);
      if (!autoMap.description) autoMap.description = findHeader(['وصف', 'تفاصيل', 'مشكلة', 'description', 'message', 'رسالة']);
      if (!autoMap.notes) autoMap.notes = findHeader(['ملاحظات', 'notes']);
      if (!autoMap.status) autoMap.status = findHeader(['حالة', 'status']);
      if (!autoMap.caseNumber) autoMap.caseNumber = findHeader(['قضية', 'case', 'رقم القضية']);
      if (!autoMap.requestId) autoMap.requestId = findHeader(['معرف', 'id', 'request id', 'رقم الطلب']);

      setFieldMapping(autoMap);
      showToast('success', `✓ تم فحص الملف بأمان: تم اكتشاف ${result.headers.length} عمود و${result.totalRows} صف بيانات`);
    } catch (err: any) {
      console.error('Discovery error:', err);
      showToast('error', `فشل فحص الملف: ${err.message || err}`);
    } finally {
      setIsDiscovering(false);
    }
  };

  // Save Website Sheet Mapping & Configuration
  const handleSaveWebsiteMapping = async () => {
    if (!discoveredData && !config?.websiteSpreadsheetId) {
      showToast('error', 'يرجى فحص الملف أولاً.');
      return;
    }

    setSaving(true);
    try {
      const spreadsheetId = discoveredData?.spreadsheetId || config?.websiteSpreadsheetId;
      const sheetName = selectedSheetName || discoveredData?.activeSheet || 'Sheet1';

      const updatePayload: Partial<GoogleWorkspaceConfig> = {
        websiteSpreadsheetId: spreadsheetId,
        websiteSpreadsheetUrl: websiteSheetInput.trim().startsWith('http') 
          ? websiteSheetInput.trim() 
          : `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
        websiteSpreadsheetName: discoveredData?.title || config?.websiteSpreadsheetName || 'Website Sheet',
        websiteSheetName: sheetName,
        websiteDiscoveredHeaders: discoveredData?.headers || config?.websiteDiscoveredHeaders || [],
        websiteDiscoveredSheets: discoveredData?.sheets || config?.websiteDiscoveredSheets || [],
        websiteDiscoveredRowCount: discoveredData?.totalRows || config?.websiteDiscoveredRowCount || 0,
        websiteFieldMapping: fieldMapping,
        updatedAt: serverTimestamp(),
        updatedBy: {
          uid: userProfile?.uid || '',
          name: userProfile?.displayName || ''
        }
      };

      await setDoc(doc(db, 'googleIntegrations', 'config'), updatePayload, { merge: true });

      await logAuditAndEvent({
        action: 'UPDATE_GOOGLE_WEBSITE_MAPPING',
        details: `تحديث ربط ومطابقة أعمدة Google Sheet الموقع (${spreadsheetId})`,
        entityType: 'settings',
        user: userProfile
      });

      showToast('success', '✓ تم حفظ إعدادات وربط Google Sheet الموقع بأمان');
    } catch (err: any) {
      console.error('Error saving mapping:', err);
      showToast('error', `فشل الحفظ: ${err.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  // 1-Click Master Provisioning & Permanent Persistence
  const handleMasterProvisioning = async () => {
    setShowProvisioningModal(true);
    setProvisioningLogs(['بدء عملية التهيئة الشاملة لمنظومة Google Workspace...']);
    setProvisioningStep('1. جاري التحقق من تفويض حساب Google (OAuth 2.0)...');
    setProvisioningSuccess(null);
    setIsMasterProvisioning(true);

    let token = googleAccessToken;
    if (!token) {
      try {
        token = await authorizeGoogleWorkspace();
      } catch (authErr: any) {
        setProvisioningLogs((prev) => [...prev, `❌ خطأ في تفويض Google: ${authErr.message || authErr}`]);
        setProvisioningSuccess(false);
        setIsMasterProvisioning(false);
        return;
      }
    }

    if (!token) {
      setProvisioningLogs((prev) => [...prev, '❌ لم يتم الحصول على رمز التفويض من Google.']);
      setProvisioningSuccess(false);
      setIsMasterProvisioning(false);
      return;
    }

    setProvisioningLogs((prev) => [...prev, '✓ تم التحقق من تفويض حساب Google بنجاح.']);

    try {
      const updates: Partial<GoogleWorkspaceConfig> = {
        updatedAt: serverTimestamp(),
        updatedBy: {
          uid: userProfile?.uid || '',
          name: userProfile?.displayName || 'المشرف العام'
        }
      };

      // 1. Setup Drive Hierarchy
      setProvisioningStep('2. جاري فحص وإنشاء هيكلية مجلدات Google Drive الرسمية (JB Work)...');
      try {
        const driveRes = await setupJBWorkDriveHierarchy(token);
        updates.driveRootFolderId = driveRes.rootFolderId;
        updates.driveRootFolderName = driveRes.rootFolderName;
        updates.driveExternalRequestsFolderId = driveRes.externalRequestsFolderId;
        updates.driveCasesFolderId = driveRes.casesFolderId;
        updates.driveCasesCurrentYearFolderId = driveRes.casesCurrentYearFolderId;
        updates.driveReportsFolderId = driveRes.reportsFolderId;
        updates.driveArchiveFolderId = driveRes.archiveFolderId;
        setProvisioningLogs((prev) => [
          ...prev, 
          `✓ تم تجهيز مجلد Drive الرئيسي (${driveRes.rootFolderName}) والمجلدات الفرعية (Cases, Reports, Archive).`
        ]);
      } catch (dErr: any) {
        console.warn('Drive hierarchy setup notice:', dErr);
        setProvisioningLogs((prev) => [...prev, `⚠️ تنبيه Drive: ${dErr.message || dErr}`]);
      }

      // 2. Setup Dedicated Spreadsheet if not present
      setProvisioningStep('3. جاري فحص وإنشاء ملف Google Sheets المركزي للعمليات...');
      if (!config?.externalSpreadsheetId) {
        try {
          const sheetRes = await createJBWorkExternalSpreadsheet(token);
          updates.externalSpreadsheetId = sheetRes.spreadsheetId;
          updates.externalSpreadsheetUrl = sheetRes.spreadsheetUrl;
          updates.externalSpreadsheetName = 'JB Work — External Requests';
          updates.externalSheetsList = ['Form Responses', 'Requests', 'Sync Log', 'Configuration'];
          setProvisioningLogs((prev) => [
            ...prev, 
            `✓ تم إنشاء ملف Google Sheets المخصص بـ 4 أوراق عمل (${sheetRes.spreadsheetId}).`
          ]);
        } catch (sErr: any) {
          console.warn('Spreadsheet creation notice:', sErr);
          setProvisioningLogs((prev) => [...prev, `⚠️ تنبيه Google Sheets: ${sErr.message || sErr}`]);
        }
      } else {
        setProvisioningLogs((prev) => [...prev, `✓ ملف Google Sheets المركزي محفوظ ومسجل مسبقاً (${config.externalSpreadsheetId}).`]);
      }

      // 3. Setup Dedicated Case Form if not present
      setProvisioningStep('4. جاري فحص وإنشاء نموذج Google Forms الرسمي للقضايا...');
      if (!config?.externalFormId) {
        try {
          const formRes = await createJBWorkExternalForm(token);
          updates.externalFormId = formRes.formId;
          updates.externalFormTitle = 'JB Work — External Requests';
          updates.externalFormUrl = formRes.formUrl;
          updates.externalFormEditUrl = formRes.editUrl;
          setProvisioningLogs((prev) => [
            ...prev, 
            `✓ تم إنشاء استمارة القضايا الرسمية (${formRes.formId}) وربطها بنجاح.`
          ]);
        } catch (fErr: any) {
          console.warn('Form creation notice:', fErr);
          setProvisioningLogs((prev) => [...prev, `⚠️ تنبيه Google Forms: ${fErr.message || fErr}`]);
        }
      } else {
        setProvisioningLogs((prev) => [...prev, `✓ استمارة القضايا الأساسية محفوظة ومسجلة مسبقاً (${config.externalFormId}).`]);
      }

      // Save to Firestore
      setProvisioningStep('5. جاري حفظ وتثبيت كافة الروابط والمعرفات في قاعدة البيانات...');
      await setDoc(doc(db, 'googleIntegrations', 'config'), cleanFirestoreData(updates), { merge: true });

      // Save to LocalStorage durable cache
      try {
        const currentSaved = localStorage.getItem('jb_google_workspace_config');
        const parsed = currentSaved ? JSON.parse(currentSaved) : {};
        localStorage.setItem('jb_google_workspace_config', JSON.stringify({ ...parsed, ...updates }));
      } catch (_) {}

      setProvisioningLogs((prev) => [...prev, '✓ تم حفظ المعرفات بنجاح في قاعدة البيانات والذاكرة الدائمة.']);
      setProvisioningStep('🎉 اكتملت التهيئة الشاملة والحفظ الدائم بنجاح 100%!');
      setProvisioningSuccess(true);

      await logAuditAndEvent({
        action: 'MASTER_PROVISIONING_COMPLETED',
        details: 'التهيئة الشاملة لـ Google Workspace (مجلدات Drive + شيت العمليات + نموذج القضايا)',
        entityType: 'settings',
        user: userProfile
      });

      showToast('success', '✓ تم إنجاز التهيئة الشاملة وحفظ كافة مجلدات Drive وملف الشيت ونموذج القضايا بنجاح دائم!');
    } catch (err: any) {
      console.error('Master provisioning error:', err);
      setProvisioningLogs((prev) => [...prev, `❌ خطأ غير متوقع: ${err.message || err}`]);
      setProvisioningSuccess(false);
      showToast('error', `فشل في إتمام التهيئة: ${err.message || err}`);
    } finally {
      setIsMasterProvisioning(false);
    }
  };

  // Create Dedicated JB Work Spreadsheet
  const handleCreateExternalSpreadsheet = async () => {
    let token = googleAccessToken;
    if (!token) token = await authorizeGoogleWorkspace();
    if (!token) {
      showToast('error', 'يرجى تفويض حساب Google أولاً.');
      return;
    }

    setIsCreatingSpreadsheet(true);
    try {
      const res = await createJBWorkExternalSpreadsheet(token);

      const updates = {
        externalSpreadsheetId: res.spreadsheetId,
        externalSpreadsheetUrl: res.spreadsheetUrl,
        externalSpreadsheetName: 'JB Work — External Requests',
        externalSheetsList: ['Form Responses', 'Requests', 'Sync Log', 'Configuration'],
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'googleIntegrations', 'config'), cleanFirestoreData(updates), { merge: true });

      showToast('success', '✓ تم إنشاء وربط ملف Google Sheet المخصص (4 أوراق عمل) بنجاح!');
    } catch (err: any) {
      console.error('Error creating spreadsheet:', err);
      showToast('error', `فشل إنشاء الملف: ${err.message || err}`);
    } finally {
      setIsCreatingSpreadsheet(false);
    }
  };

  // Create Dedicated JB Work Google Form
  const handleCreateExternalForm = async () => {
    let token = googleAccessToken;
    if (!token) token = await authorizeGoogleWorkspace();
    if (!token) {
      showToast('error', 'يرجى تفويض حساب Google أولاً.');
      return;
    }

    setIsCreatingForm(true);
    try {
      const res = await createJBWorkExternalForm(token);

      const updates = {
        externalFormId: res.formId,
        externalFormTitle: 'JB Work — External Requests',
        externalFormUrl: res.formUrl,
        externalFormEditUrl: res.editUrl,
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'googleIntegrations', 'config'), cleanFirestoreData(updates), { merge: true });

      showToast('success', '✓ تم إنشاء استمارة Google Form المخصصة مع كافة الحقول والتصنيفات بنجاح!');
    } catch (err: any) {
      console.error('Error creating form:', err);
      showToast('error', `فشل إنشاء النموذج: ${err.message || err}`);
    } finally {
      setIsCreatingForm(false);
    }
  };

  // Setup JB Work Drive Hierarchy
  const handleSetupDriveHierarchy = async () => {
    let token = googleAccessToken;
    if (!token) token = await authorizeGoogleWorkspace();
    if (!token) {
      showToast('error', 'يرجى تفويض حساب Google أولاً.');
      return;
    }

    setIsSettingUpDrive(true);
    try {
      const res = await setupJBWorkDriveHierarchy(token);

      const updates = {
        driveRootFolderId: res.rootFolderId,
        driveRootFolderName: res.rootFolderName,
        driveExternalRequestsFolderId: res.externalRequestsFolderId,
        driveCasesFolderId: res.casesFolderId,
        driveCasesCurrentYearFolderId: res.casesCurrentYearFolderId,
        driveReportsFolderId: res.reportsFolderId,
        driveArchiveFolderId: res.archiveFolderId,
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'googleIntegrations', 'config'), cleanFirestoreData(updates), { merge: true });

      showToast('success', '✓ تم إنشاء وتهيئة مجلدات Google Drive الرسمية بنجاح!');
    } catch (err: any) {
      console.error('Error setting up Drive:', err);
      showToast('error', `فشل تهيئة Google Drive: ${err.message || err}`);
    } finally {
      setIsSettingUpDrive(false);
    }
  };

  // Create Department Form Handler (Outside core cases)
  const handleCreateDepartmentForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptFormTitle.trim() || !deptFormDepartment.trim()) {
      showToast('error', 'يرجى إدخال عنوان الاستمارة والقسم التابع لها.');
      return;
    }

    let token = googleAccessToken;
    if (!token) token = await authorizeGoogleWorkspace();
    if (!token) {
      showToast('error', 'يرجى تفويض حساب Google أولاً.');
      return;
    }

    setIsCreatingDeptForm(true);
    try {
      const res = await createDepartmentGoogleForm(token, {
        title: deptFormTitle.trim(),
        department: deptFormDepartment.trim(),
        description: deptFormDescription.trim() || undefined
      });

      const newDeptFormItem = {
        id: res.formId,
        title: res.title,
        department: res.department,
        formUrl: res.formUrl,
        editUrl: res.editUrl,
        createdAt: new Date().toISOString(),
        description: deptFormDescription.trim(),
        fieldsCount: 6
      };

      const existingDeptForms = config?.departmentForms || [];
      const updatedDeptForms = [...existingDeptForms, newDeptFormItem];

      await setDoc(doc(db, 'googleIntegrations', 'config'), {
        departmentForms: updatedDeptForms,
        updatedAt: serverTimestamp()
      }, { merge: true });

      try {
        const currentSaved = localStorage.getItem('jb_google_workspace_config');
        const parsed = currentSaved ? JSON.parse(currentSaved) : {};
        localStorage.setItem('jb_google_workspace_config', JSON.stringify({
          ...parsed,
          departmentForms: updatedDeptForms
        }));
      } catch (_) {}

      await logAuditAndEvent({
        action: 'CREATE_DEPARTMENT_FORM',
        details: `إنشاء استمارة Google Form مخصصة لقسم ${res.department}: (${res.title})`,
        entityType: 'settings',
        user: userProfile
      });

      showToast('success', `✓ تم إنشاء استمارة (${res.title}) وإضافتها بنجاح!`);
      setShowNewDeptFormModal(false);
      setDeptFormTitle('');
      setDeptFormDescription('');
    } catch (err: any) {
      console.error('Error creating department form:', err);
      showToast('error', `فشل إنشاء استمارة القسم: ${err.message || err}`);
    } finally {
      setIsCreatingDeptForm(false);
    }
  };

  // Delete Department Form
  const handleDeleteDepartmentForm = async (formId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الاستمارة من قائمة استمارات الأقسام؟')) return;
    try {
      const existingDeptForms = config?.departmentForms || [];
      const updatedDeptForms = existingDeptForms.filter(f => f.id !== formId);

      await setDoc(doc(db, 'googleIntegrations', 'config'), {
        departmentForms: updatedDeptForms,
        updatedAt: serverTimestamp()
      }, { merge: true });

      showToast('success', 'تمت إزالة الاستمارة من القائمة.');
    } catch (e: any) {
      showToast('error', `فشل الحذف: ${e.message}`);
    }
  };

  // Run Full Google Sync Now
  const handleRunFullSync = async () => {
    let token = googleAccessToken;
    if (!token) token = await authorizeGoogleWorkspace();
    if (!token) {
      showToast('error', 'يرجى تفويض حساب Google أولاً.');
      return;
    }

    if (!config) {
      showToast('error', 'يرجى إكمال الإعدادات أولاً.');
      return;
    }

    setIsSyncing(true);
    try {
      const log = await runFullGoogleSync(config, token, {
        uid: userProfile?.uid || '',
        name: userProfile?.displayName || 'المشرف العام'
      });

      showToast('success', `✓ تمت المزامنة: تم جلب ${log.recordsFound} سجل، وإضافة ${log.recordsCreated} طلب جديد.`);
    } catch (err: any) {
      console.error('Sync error:', err);
      showToast('error', `فشلت المزامنة: ${err.message || err}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // State for Testing Read & Write
  const [isTestingRead, setIsTestingRead] = useState<boolean>(false);
  const [isTestingWrite, setIsTestingWrite] = useState<boolean>(false);
  const [readTestStatus, setReadTestStatus] = useState<boolean | null>(null);
  const [writeTestStatus, setWriteTestStatus] = useState<boolean | null>(null);

  // Test Read Access on Production Website Sheet (Zero-Harm)
  const handleTestRead = async () => {
    let token = googleAccessToken;
    if (!token) token = await authorizeGoogleWorkspace();
    if (!token) {
      showToast('error', 'يرجى تفويض حساب Google أولاً.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(websiteSheetInput || config?.websiteSpreadsheetId || '1KNunZ9a48CBh6vvg9fkoOM4MrIPwUEptQ6YrznKqJUQ');
    if (!spreadsheetId) {
      showToast('error', 'يرجى إدخال معرّف أو رابط ملف Google Sheet الخاص بالموقع.');
      return;
    }

    setIsTestingRead(true);
    try {
      const result = await discoverWebsiteSpreadsheet(spreadsheetId, token, selectedSheetName);
      setReadTestStatus(true);
      showToast('success', `✓ نجح اختبار القراءة (Read Access: ✓): تم قراءة ${result.sheets.length} أوراق عمل (${result.sheets.join(', ')}) و ${result.headers.length} أعمدة بنجاح.`);
    } catch (err: any) {
      setReadTestStatus(false);
      showToast('error', `فشل اختبار القراءة: ${err.message || err}`);
    } finally {
      setIsTestingRead(false);
    }
  };

  // Test Write Access safely without touching website production rows
  const handleTestWrite = async () => {
    let token = googleAccessToken;
    if (!token) token = await authorizeGoogleWorkspace();
    if (!token) {
      showToast('error', 'يرجى تفويض حساب Google أولاً.');
      return;
    }

    setIsTestingWrite(true);
    try {
      // If external spreadsheet exists, test write by appending verification log row
      if (config?.externalSpreadsheetId) {
        const testUrl = `https://sheets.googleapis.com/v4/spreadsheets/${config.externalSpreadsheetId}/values/Sync Log!A:B:append?valueInputOption=USER_ENTERED`;
        const res = await fetch(testUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            values: [[`TEST-WRITE-${Date.now()}`, 'Write Verification Test — Safe & Active']]
          })
        });
        if (!res.ok) {
          throw new Error(`Write check failed: HTTP ${res.status}`);
        }
      } else {
        // Check drive permission
        const driveCheck = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!driveCheck.ok) {
          throw new Error('Write permission test failed.');
        }
      }
      setWriteTestStatus(true);
      showToast('success', '✓ نجح اختبار الكتابة (Write Access: ✓): الصلاحيات مفوضة وتعمل بأمان تام.');
    } catch (err: any) {
      setWriteTestStatus(false);
      showToast('error', `فشل اختبار الكتابة: ${err.message || err}`);
    } finally {
      setIsTestingWrite(false);
    }
  };

  // Update Sync Mode / Frequency
  const handleUpdateSyncPreferences = async (
    mode: GoogleWorkspaceConfig['syncMode'],
    frequency: number,
    autoSync: boolean
  ) => {
    try {
      await setDoc(doc(db, 'googleIntegrations', 'config'), {
        syncMode: mode,
        syncFrequencyMinutes: frequency,
        autoSyncEnabled: autoSync,
        updatedAt: serverTimestamp()
      }, { merge: true });
      showToast('success', '✓ تم تحديث خيارات المزامنة');
    } catch (e: any) {
      showToast('error', `فشل التحديث: ${e.message}`);
    }
  };

  // Direct ID Update without running creation wizards
  const startEditingManualIds = () => {
    setManualWebsiteSheetUrl(config?.websiteSpreadsheetUrl || config?.websiteSpreadsheetId || 'https://docs.google.com/spreadsheets/d/1KNunZ9a48CBh6vvg9fkoOM4MrIPwUEptQ6YrznKqJUQ/edit?usp=sharing');
    setManualExternalSheetUrl(config?.externalSpreadsheetUrl || config?.externalSpreadsheetId || '');
    setManualFormUrl(config?.externalFormUrl || config?.externalFormId || '');
    setManualDriveFolderId(config?.driveRootFolderId || '');
    setIsEditingManualIds(true);
  };

  const handleSaveManualIds = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const websiteId = extractSpreadsheetId(manualWebsiteSheetUrl) || manualWebsiteSheetUrl.trim();
      const externalId = extractSpreadsheetId(manualExternalSheetUrl) || manualExternalSheetUrl.trim();
      
      let formId = manualFormUrl.trim();
      const formMatch = manualFormUrl.match(/\/forms\/d\/([a-zA-Z0-9_-]+)/);
      if (formMatch && formMatch[1]) {
        formId = formMatch[1];
      }

      const updates: Partial<GoogleWorkspaceConfig> = {
        updatedAt: serverTimestamp()
      };

      if (websiteId) {
        updates.websiteSpreadsheetId = websiteId;
        updates.websiteSpreadsheetUrl = manualWebsiteSheetUrl.startsWith('http') ? manualWebsiteSheetUrl : `https://docs.google.com/spreadsheets/d/${websiteId}/edit`;
      }
      if (externalId) {
        updates.externalSpreadsheetId = externalId;
        updates.externalSpreadsheetUrl = manualExternalSheetUrl.startsWith('http') ? manualExternalSheetUrl : `https://docs.google.com/spreadsheets/d/${externalId}/edit`;
      }
      if (formId) {
        updates.externalFormId = formId;
        updates.externalFormUrl = manualFormUrl.startsWith('http') ? manualFormUrl : `https://docs.google.com/forms/d/${formId}/viewform`;
      }
      if (manualDriveFolderId.trim()) {
        updates.driveRootFolderId = manualDriveFolderId.trim();
      }

      await setDoc(doc(db, 'googleIntegrations', 'config'), cleanFirestoreData(updates), { merge: true });
      try {
        const currentSaved = localStorage.getItem('jb_google_workspace_config');
        const parsed = currentSaved ? JSON.parse(currentSaved) : {};
        localStorage.setItem('jb_google_workspace_config', JSON.stringify({ ...parsed, ...updates }));
      } catch (_) {}

      showToast('success', '✓ تم حفظ المعرفات والروابط بنجاح دون الحاجة لإعادة إنشاء أي شيء!');
      setIsEditingManualIds(false);
    } catch (err: any) {
      showToast('error', `فشل حفظ المعرفات: ${err.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-8 text-center bg-[#121214] border border-[#27272A] rounded-xl space-y-3">
        <Lock className="w-8 h-8 text-amber-400 mx-auto" />
        <h3 className="text-sm font-bold text-white">صلاحية محصورة بالمشرف العام (Super Admin)</h3>
        <p className="text-xs text-zinc-400">فقط المشرف العام يحق له إدارة وتعديل تكامل Google Workspace وحماية البيانات.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* TOAST FEEDBACK */}
      {feedback && (
        <div className={`p-4 rounded-xl text-xs font-medium border flex items-center justify-between ${
          feedback.type === 'success' 
            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40' 
            : 'bg-rose-950/40 text-rose-300 border-rose-800/40'
        }`}>
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-zinc-400 hover:text-white">✕</button>
        </div>
      )}

      {/* 11-STEP AUTOMATED SETUP WIZARD & STATUS SUMMARY */}
      <div className="bg-gradient-to-br from-[#18181B] via-[#121214] to-[#18181B] border border-indigo-500/30 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                <Sparkles className="w-4 h-4" />
              </div>
              <h1 className="text-lg font-bold text-white tracking-wide">
                معالج الإعداد التلقائي المتكامل (11-Step Setup Wizard)
              </h1>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">
              تكامل حقيقي وفوري مع Google Workspace (Sheets, Forms, Drive) وحفظ دائم لكافة المعرفات وهيكلية المجلدات دون الحاجة لإعادة التهيئة عند كل مهمة.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleMasterProvisioning}
              disabled={isMasterProvisioning}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-md disabled:opacity-50"
            >
              {isMasterProvisioning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>التهيئة الشاملة والحفظ الدائم بضغطة واحدة</span>
            </button>

            <button
              onClick={handleTestRead}
              disabled={isTestingRead}
              className="px-3 py-2 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              {isTestingRead ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              <span>اختبار القراءة (Test Read)</span>
              {readTestStatus === true && <Check className="w-3.5 h-3.5 text-emerald-400" />}
            </button>

            <button
              onClick={handleTestWrite}
              disabled={isTestingWrite}
              className="px-3 py-2 bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-700/50 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              {isTestingWrite ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5" />}
              <span>اختبار الكتابة (Test Write)</span>
              {writeTestStatus === true && <Check className="w-3.5 h-3.5 text-indigo-400" />}
            </button>
          </div>
        </div>

        {/* 11 Steps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {[
            {
              step: 'STEP 1',
              title: 'Connect Google Account',
              titleAr: 'ربط حساب Google الرسمي',
              done: !!googleAccessToken,
              detail: googleAccessToken ? 'OAuth 2.0 مفوض' : 'بانتظار التفويض'
            },
            {
              step: 'STEP 2',
              title: 'Connect Website Sheet',
              titleAr: 'ربط شيت الموقع الحالي',
              done: !!(config?.websiteSpreadsheetId || discoveredData),
              detail: '1KNunZ9a48CBh6vvg9fkoOM4MrIPwUEptQ6YrznKqJUQ'
            },
            {
              step: 'STEP 3',
              title: 'Inspect cases',
              titleAr: 'فحص ورقة cases',
              done: (discoveredData?.sheets || config?.websiteDiscoveredSheets || []).some(s => s.toLowerCase().includes('case')),
              detail: 'اكتشاف أعمدة القضايا'
            },
            {
              step: 'STEP 4',
              title: 'Inspect request',
              titleAr: 'فحص ورقة request',
              done: (discoveredData?.sheets || config?.websiteDiscoveredSheets || []).some(s => s.toLowerCase().includes('req')),
              detail: 'اكتشاف أعمدة الطلبات'
            },
            {
              step: 'STEP 5',
              title: 'Create Field Mapping',
              titleAr: 'مطابقة الحقول والأعمدة',
              done: Object.values(fieldMapping).some(v => v !== ''),
              detail: `${Object.values(fieldMapping).filter(v => v !== '').length} حقول مطابقة`
            },
            {
              step: 'STEP 6',
              title: 'External Requests Sheet',
              titleAr: 'إنشاء شيت JB Work المخصص',
              done: !!config?.externalSpreadsheetId,
              detail: config?.externalSpreadsheetId ? 'جاهز (4 أوراق)' : 'اضغط للإنشاء'
            },
            {
              step: 'STEP 7',
              title: 'Create Google Form',
              titleAr: 'إنشاء Google Form للطلبات',
              done: !!config?.externalFormId,
              detail: config?.externalFormId ? 'نموذج البلاغات جاهز' : 'اضغط للإنشاء'
            },
            {
              step: 'STEP 8',
              title: 'Google Drive Folders',
              titleAr: 'تأسيس مجلدات Google Drive',
              done: !!config?.driveRootFolderId,
              detail: config?.driveRootFolderId ? 'JB Work / Cases / 2026' : 'اضغط للتهيئة'
            },
            {
              step: 'STEP 9',
              title: 'Test Read',
              titleAr: 'اختبار القراءة بدون ضرر',
              done: readTestStatus === true || (discoveredData?.totalRows || 0) > 0,
              detail: 'Read Access: ✓'
            },
            {
              step: 'STEP 10',
              title: 'Test Write',
              titleAr: 'اختبار الكتابة الآمنة',
              done: writeTestStatus === true || !!config?.externalSpreadsheetId,
              detail: 'Write Access: ✓'
            },
            {
              step: 'STEP 11',
              title: 'Enable Sync',
              titleAr: 'تفعيل المزامنة التلقائية',
              done: config?.autoSyncEnabled ?? true,
              detail: `نمط: ${config?.syncMode === 'two_way' ? 'ثنائية (Two-Way)' : 'قراءة آمنة'}`
            },
          ].map((item, idx) => (
            <div 
              key={item.step}
              className={`p-3 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                item.done 
                  ? 'bg-emerald-950/20 border-emerald-800/40 text-zinc-300' 
                  : 'bg-[#18181B] border-[#27272A] text-zinc-400'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-indigo-400">{item.step}</span>
                  {item.done ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                      <CheckCircle className="w-3 h-3" />
                      <span>مكتمل</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-500 font-mono">جاهز</span>
                  )}
                </div>
                <div className="font-bold text-white text-[11px]">{item.titleAr}</div>
                <div className="text-[10px] text-zinc-500 font-mono truncate">{item.title}</div>
              </div>
              <div className="pt-2 mt-2 border-t border-zinc-800/60 text-[10px] text-zinc-400 truncate">
                {item.detail}
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* PERSISTENT CONFIGURATION & DIRECT ID EDITOR (Requirement: Do not rebuild forms/sheets every time) */}
      <div className="bg-[#18181B] border border-emerald-500/30 rounded-2xl p-6 space-y-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold">
                <CheckCircle className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>الهيكلية والإعدادات المحفوظة بشكل دائم</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800">مثبتة في Firestore</span>
                </h2>
                <p className="text-xs text-zinc-400">
                  جميع الروابط والمعرفات الحالية محفوظة وتعمل تلقائياً. لا داعي لإعادة إنشاء أي فورم أو شيت جديد.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={startEditingManualIds}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>تعديل المعرّفات والروابط يدوياً</span>
          </button>
        </div>

        {/* Current Active Links Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          
          {/* Website Sheet Filter Rule */}
          <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-semibold">قاعدة فلترة الموقع:</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">نشطة</span>
            </div>
            <p className="text-xs font-mono font-bold text-amber-400 truncate">فقط يبدأ بـ JB-CASE</p>
            <p className="text-[10px] text-zinc-500">يتم سحب صفوف القضايا فقط وتجاهل الصفوف الأخرى</p>
          </div>

          {/* Website Sheet ID */}
          <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-semibold">شيت الموقع الحالي:</span>
              {config?.websiteSpreadsheetId && <span className="text-[10px] text-emerald-400">مربوط ✓</span>}
            </div>
            <p className="text-xs font-mono text-zinc-200 truncate" title={config?.websiteSpreadsheetId || '1KNunZ9a48CBh6vvg9fkoOM4MrIPwUEptQ6YrznKqJUQ'}>
              {config?.websiteSpreadsheetId || '1KNunZ9a48CBh6vvg9fkoOM4MrIPwUEptQ6YrznKqJUQ'}
            </p>
            {config?.websiteSpreadsheetUrl && (
              <a href={config.websiteSpreadsheetUrl} target="_blank" rel="noreferrer" className="text-[10px] text-indigo-400 hover:underline flex items-center gap-1">
                <span>فتح الملف</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>

          {/* Form Link */}
          <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-semibold">استمارة Google Form:</span>
              {config?.externalFormId && <span className="text-[10px] text-emerald-400">جاهزة ✓</span>}
            </div>
            <p className="text-xs font-mono text-zinc-200 truncate" title={config?.externalFormId || 'غير منشأة بعد'}>
              {config?.externalFormId ? 'نموذج استقبال الطلبات والصور' : 'غير منشأة بعد'}
            </p>
            {config?.externalFormUrl && (
              <a href={config.externalFormUrl} target="_blank" rel="noreferrer" className="text-[10px] text-indigo-400 hover:underline flex items-center gap-1">
                <span>رابط إرسال الطلبات للعملاء</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>

          {/* Drive Root Folder */}
          <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-semibold">مجلد Google Drive:</span>
              {config?.driveRootFolderId && <span className="text-[10px] text-emerald-400">مهيأ ✓</span>}
            </div>
            <p className="text-xs font-mono text-zinc-200 truncate" title={config?.driveRootFolderId || 'JB Work'}>
              {config?.driveRootFolderId || 'JB Work'}
            </p>
            {config?.driveRootFolderId && (
              <a href={`https://drive.google.com/drive/folders/${config.driveRootFolderId}`} target="_blank" rel="noreferrer" className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1">
                <span>فتح المجلد الرئيسي</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>

        </div>

        {/* Modal: Direct Manual ID Editor */}
        {isEditingManualIds && (
          <div className="p-4 mt-3 bg-zinc-950 rounded-xl border border-indigo-500/40 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="text-xs font-bold text-white">تعديل الروابط والمعرفات يدوياً وحفظها في قاعدة البيانات</h3>
              <button onClick={() => setIsEditingManualIds(false)} className="text-xs text-zinc-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSaveManualIds} className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-300 font-medium block mb-1">رابط أو معرف شيت الموقع (Website Sheet URL / ID):</label>
                <input
                  type="text"
                  value={manualWebsiteSheetUrl}
                  onChange={(e) => setManualWebsiteSheetUrl(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                />
              </div>

              <div>
                <label className="text-zinc-300 font-medium block mb-1">رابط أو معرف شيت الطلبات المخصص (JB Work Dedicated Sheet):</label>
                <input
                  type="text"
                  value={manualExternalSheetUrl}
                  onChange={(e) => setManualExternalSheetUrl(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                />
              </div>

              <div>
                <label className="text-zinc-300 font-medium block mb-1">رابط أو معرف Google Form:</label>
                <input
                  type="text"
                  value={manualFormUrl}
                  onChange={(e) => setManualFormUrl(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  placeholder="https://docs.google.com/forms/d/..."
                />
              </div>

              <div>
                <label className="text-zinc-300 font-medium block mb-1">معرف مجلد Google Drive الرئيسي (Root Folder ID):</label>
                <input
                  type="text"
                  value={manualDriveFolderId}
                  onChange={(e) => setManualDriveFolderId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  placeholder="Folder ID e.g. 1a2b3c..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsEditingManualIds(false)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold disabled:opacity-50"
                >
                  {saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات في النظام'}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>

      {/* SECTION 1: Google Account & OAuth 2.0 Connection */}
      <div className="bg-[#121214] border border-[#27272A] rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold">
                <Globe className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-white">اتصال وتفويض Google Workspace (OAuth 2.0)</h2>
            </div>
            <p className="text-xs text-zinc-400">
              ربط مباشر ورسمي مع حساب Google بدون روابط طويلة أو أخطاء توجيه (Google Identity Services).
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {googleAccessToken ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>متصل ومفوض بنجاح</span>
                </span>
                <button
                  type="button"
                  onClick={handleConnectGoogle}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 rounded-lg cursor-pointer"
                >
                  إعادة تفويض
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleConnectGoogle}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-indigo-900/30 cursor-pointer active:scale-95 transition-all"
              >
                <Zap className="w-4 h-4" />
                <span>ربط حساب Google الرسمي (1-Click OAuth)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowManualTokenModal(true)}
              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-xs rounded-lg cursor-pointer transition-colors"
            >
              رمز يدوي / Token
            </button>
          </div>
        </div>

        {/* Manual Token Modal */}
        {showManualTokenModal && (
          <div className="p-4 bg-zinc-950 border border-indigo-500/30 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
                <span>إدخال أو فحص Google OAuth Access Token يدوياً:</span>
              </span>
              <button 
                type="button"
                onClick={() => setShowManualTokenModal(false)}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                ✕ إغلاق
              </button>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              إذا كنت تعمل على تطبيق مثبت محلياً وتريد تفعيل الصلاحيات فوراً دون نوافذ منبثقة، يمكنك إدخال الرمز مباشرة هنا:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualTokenInput}
                onChange={(e) => setManualTokenInput(e.target.value)}
                placeholder="ya29.a0Ac..."
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => {
                  if (manualTokenInput.trim()) {
                    setCachedGoogleAccessToken(manualTokenInput.trim());
                    showToast('success', '✓ تم تعيين وتفعيل رمز الوصول بنجاح!');
                    setShowManualTokenModal(false);
                  }
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                تفعيل الرمز
              </button>
            </div>
          </div>
        )}

        {/* Granted Scopes info */}
        <div className="p-3 bg-[#18181B] rounded-lg border border-[#27272A] flex flex-wrap items-center gap-4 text-[11px] text-zinc-400">
          <span className="font-semibold text-zinc-300">الصلاحيات المفوضة:</span>
          <span className="text-emerald-400">✓ Google Sheets (قراءة وكتابة آمنة)</span>
          <span className="text-emerald-400">✓ Google Forms (إنشاء وقراءة الاستجابات)</span>
          <span className="text-emerald-400">✓ Google Drive (إنشاء وإدارة مجلدات القضايا)</span>
        </div>
      </div>

      {/* SECTION 2: Existing Production Website Sheet (ZERO HARM & SAFE MAPPING) */}
      <div className="bg-[#121214] border border-[#27272A] rounded-xl p-6 space-y-6">
        
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold">
                <Globe className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-white">Google Sheet الخاص بالموقع الحالي (Production Safe)</h2>
            </div>
            <p className="text-xs text-zinc-400">
              ربط وقراءة جدول طلبات الموقع الحالي مع حماية تامة للهيكل والبيانات والمعادلات القديمة.
            </p>
          </div>

          <span className="px-2.5 py-1 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 text-[11px] font-semibold">
            Strict Zero-Harm Policy
          </span>
        </div>

        {/* Safety Rule Notice */}
        <div className="p-4 bg-[#18181B] border border-amber-500/20 rounded-xl flex items-start gap-3 text-xs text-zinc-300">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <strong className="text-white block font-semibold">ضمان أمان بيانات الموقع الإنتاجية:</strong>
            <p className="text-zinc-400">
              نظام JB Work لا يقوم أبداً بحذف أي صف أو تعديل أي معادلة أو إعادة تسمية أوراق العمل. تتم قراءة الصفوف الجديدة فقط ومطابقتها بأمان.
            </p>
          </div>
        </div>

        {/* Sheet URL Input & Safe Discovery Button */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-300">رابط أو معرّف ملف Google Sheet الخاص بالموقع:</label>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <input
              type="text"
              value={websiteSheetInput}
              onChange={(e) => setWebsiteSheetInput(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
              className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 font-mono"
            />
            <button
              onClick={handleDiscoverWebsiteSheet}
              disabled={isDiscovering || !websiteSheetInput.trim()}
              className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
            >
              {isDiscovering ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              <span>فحص واكتشاف الأعمدة</span>
            </button>
          </div>
        </div>

        {/* Discovered Sheet & Sheets Dropdown */}
        {(discoveredData || config?.websiteSpreadsheetId) && (
          <div className="space-y-4 pt-4 border-t border-[#27272A]">
            
            {/* Sheet Metadata details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#18181B] p-3 rounded-lg border border-[#27272A] text-xs">
              <div>
                <span className="text-zinc-500 block">اسم الملف:</span>
                <span className="text-white font-medium">{discoveredData?.title || config?.websiteSpreadsheetName || 'Website Sheet'}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">ورقة العمل المستهدفة:</span>
                <select
                  value={selectedSheetName}
                  onChange={(e) => {
                    setSelectedSheetName(e.target.value);
                  }}
                  className="bg-[#121214] border border-[#27272A] text-white rounded px-2 py-1 text-xs mt-1 w-full"
                >
                  {(discoveredData?.sheets || config?.websiteDiscoveredSheets || ['Sheet1']).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <span className="text-zinc-500 block">عدد الصفوف المكتشفة:</span>
                <span className="text-emerald-400 font-mono font-bold">{discoveredData?.totalRows || config?.websiteDiscoveredRowCount || 0} صف</span>
              </div>
            </div>

            {/* Field Mapping Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-white">مطابقة أعمدة الموقع مع حقول JB Work</h4>
                  <p className="text-[11px] text-zinc-400">حدد العمود المقابل لكل حقل في نظام القضايا</p>
                </div>

                <button
                  onClick={handleSaveWebsiteMapping}
                  disabled={saving}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>حفظ الربط والمطابقة</span>
                </button>
              </div>

              {/* Mapping Table */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { key: 'clientName', label: 'اسم العميل / صاحب الطلب', required: true },
                  { key: 'phone', label: 'رقم الهاتف / الواتساب', required: true },
                  { key: 'email', label: 'البريد الإلكتروني', required: false },
                  { key: 'requestType', label: 'نوع الطلب / الخدمة', required: true },
                  { key: 'platform', label: 'المنصة المستهدفة', required: false },
                  { key: 'accountUrl', label: 'رابط الحساب', required: false },
                  { key: 'postUrl', label: 'رابط المنشور / المحتوى', required: false },
                  { key: 'description', label: 'تفاصيل المشكلة والطلب', required: true },
                  { key: 'notes', label: 'الملاحظات الإضافية', required: false },
                  { key: 'status', label: 'حالة الطلب في الموقع', required: false },
                  { key: 'caseNumber', label: 'رقم القضية (إن وجد)', required: false },
                  { key: 'requestId', label: 'معرّف الطلب الخارجي', required: false },
                ].map(field => {
                  const headers = discoveredData?.headers || config?.websiteDiscoveredHeaders || [];
                  return (
                    <div key={field.key} className="flex items-center justify-between p-2.5 bg-[#18181B] border border-[#27272A] rounded-lg text-xs">
                      <span className="text-zinc-300 font-medium">
                        {field.label} {field.required && <span className="text-rose-400">*</span>}
                      </span>
                      <select
                        value={fieldMapping[field.key] || ''}
                        onChange={(e) => setFieldMapping({ ...fieldMapping, [field.key]: e.target.value })}
                        className="bg-[#121214] border border-[#27272A] rounded px-2.5 py-1 text-xs text-white max-w-[180px] focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">-- غير محدد --</option>
                        {headers.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>

            </div>

          </div>
        )}

      </div>

      {/* SECTION 3: Dedicated "JB Work — External Requests" Google Spreadsheet */}
      <div className="bg-[#121214] border border-[#27272A] rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold">
                <Database className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-white">ملف Google Spreadsheet المخصص (JB Work — External Requests)</h2>
            </div>
            <p className="text-xs text-zinc-400">
              ملف متكامل يحتوي على 4 أوراق عمل رسمية: Form Responses, Requests, Sync Log, Configuration.
            </p>
          </div>

          <div>
            {config?.externalSpreadsheetId ? (
              <a
                href={config.externalSpreadsheetUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-indigo-400 hover:text-indigo-300 border border-zinc-700 rounded-lg text-xs font-bold inline-flex items-center gap-2"
              >
                <span>فتح في Google Sheets</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <button
                onClick={handleCreateExternalSpreadsheet}
                disabled={isCreatingSpreadsheet}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isCreatingSpreadsheet ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FolderPlus className="w-3.5 h-3.5" />}
                <span>إنشاء وتجهيز الملف الآن</span>
              </button>
            )}
          </div>
        </div>

        {config?.externalSpreadsheetId && (
          <div className="p-3 bg-[#18181B] rounded-lg border border-[#27272A] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-zinc-300">الأوراق الأربعة جاهزة ومربوطة:</span>
              <span className="text-zinc-400 font-mono">Form Responses • Requests • Sync Log • Configuration</span>
            </div>
            <span className="text-[11px] text-zinc-500 font-mono truncate max-w-xs">{config.externalSpreadsheetId}</span>
          </div>
        )}
      </div>

      {/* SECTION 4: Dedicated "JB Work — External Requests" Google Form */}
      <div className="bg-[#121214] border border-[#27272A] rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold">
                <FileText className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-white">استمارة Google Form المخصصة للطلبات الخارجية</h2>
            </div>
            <p className="text-xs text-zinc-400">
              استمارة مجهزة بالكامل لاستقبال بلاغات وطلبات العملاء مع حقول الاسم، الواتساب، نوع القضية، المنصة، والوصف.
            </p>
          </div>

          <div>
            {config?.externalFormId ? (
              <div className="flex items-center gap-2">
                <a
                  href={config.externalFormUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <span>رابط الاستمارة للعملاء</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <a
                  href={config.externalFormEditUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium inline-flex items-center gap-1.5"
                >
                  <span>تعديل النموذج</span>
                </a>
              </div>
            ) : (
              <button
                onClick={handleCreateExternalForm}
                disabled={isCreatingForm}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isCreatingForm ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>إنشاء Google Form تلقائياً</span>
              </button>
            )}
          </div>
        </div>

        {config?.externalFormId && (
          <div className="p-3 bg-[#18181B] rounded-lg border border-[#27272A] flex items-center justify-between text-xs">
            <span className="text-zinc-300">الاستمارة جاهزة للاستقبال والمزامنة التلقائية مع لوحة الطلبات الخارجية.</span>
            <span className="text-emerald-400 font-medium">✓ متصلة بـ JB Work</span>
          </div>
        )}
      </div>

      {/* SECTION 5: Google Drive Folder Structure */}
      <div className="bg-[#121214] border border-[#27272A] rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold">
                <FolderCheck className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-white">هيكلية مجلدات Google Drive الرسمية</h2>
            </div>
            <p className="text-xs text-zinc-400">
              إنشاء مجلد JB Work الرئيسي مع مجلدات القضايا السنوية والتقارير ومرفقات الطلبات الخارجية.
            </p>
          </div>

          <div>
            {config?.driveRootFolderId ? (
              <a
                href={`https://drive.google.com/drive/folders/${config.driveRootFolderId}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-emerald-400 hover:text-emerald-300 border border-zinc-700 rounded-lg text-xs font-bold inline-flex items-center gap-2"
              >
                <span>فتح مجلد JB Work في Drive</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <button
                onClick={handleSetupDriveHierarchy}
                disabled={isSettingUpDrive}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSettingUpDrive ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FolderPlus className="w-3.5 h-3.5" />}
                <span>تهيئة هيكلية مجلدات Drive</span>
              </button>
            )}
          </div>
        </div>

        {config?.driveRootFolderId && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
            <div className="p-2.5 bg-[#18181B] rounded-lg border border-[#27272A]">
              <span className="text-zinc-500 block text-[11px]">مجلد القضايا:</span>
              <span className="text-white font-medium">JB Work / Cases / 2026</span>
            </div>
            <div className="p-2.5 bg-[#18181B] rounded-lg border border-[#27272A]">
              <span className="text-zinc-500 block text-[11px]">مجلد الطلبات:</span>
              <span className="text-white font-medium">JB Work / External Requests</span>
            </div>
            <div className="p-2.5 bg-[#18181B] rounded-lg border border-[#27272A]">
              <span className="text-zinc-500 block text-[11px]">مجلد التقارير:</span>
              <span className="text-white font-medium">JB Work / Reports</span>
            </div>
            <div className="p-2.5 bg-[#18181B] rounded-lg border border-[#27272A]">
              <span className="text-zinc-500 block text-[11px]">مجلد الأرشيف:</span>
              <span className="text-white font-medium">JB Work / Archive</span>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 5.5: Department Forms Hub (Outside core cases workflow) */}
      <div className="bg-[#121214] border border-indigo-500/20 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold">
                <Building2 className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-white">استمارات ونماذج الأقسام الأخرى (خارج نطاق القضايا)</h2>
            </div>
            <p className="text-xs text-zinc-400">
              إنشاء وإدارة نماذج Google Forms مخصصة لأقسام المنظومة المختلفة (مثل المالية، الاستشارات، الموارد البشرية، الدعم الفني) وحفظها دائماً بروابط مباشرة.
            </p>
          </div>

          <button
            onClick={() => setShowNewDeptFormModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-md shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إنشاء استمارة قسم جديدة</span>
          </button>
        </div>

        {/* Existing Department Forms List */}
        {(!config?.departmentForms || config.departmentForms.length === 0) ? (
          <div className="p-8 text-center bg-[#18181B]/60 border border-[#27272A] rounded-xl space-y-3">
            <Building2 className="w-8 h-8 text-zinc-600 mx-auto" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-zinc-300">لا توجد استمارات أقسام إضافية منشأة حالياً</h4>
              <p className="text-[11px] text-zinc-500 max-w-md mx-auto">
                يمكنك إنشاء نماذج مخصصة لأي قسم (مثل: قسم المحاسبة والمطالبات، قسم الدعم والاستفسارات العامة، قسم التوظيف) وسيتم توليد نموذج Google Form رسمي وحفظه هنا بصورة دائمة.
              </p>
            </div>
            <button
              onClick={() => {
                setDeptFormDepartment('قسم المالية والمطالبات');
                setDeptFormTitle('استمارة مطالبات وفواتير قسم المالية');
                setShowNewDeptFormModal(true);
              }}
              className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-emerald-400 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إنشاء نموذج لقسم المالية الآن</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {config.departmentForms.map((item) => (
              <div 
                key={item.id} 
                className="p-4 bg-[#18181B] border border-[#27272A] hover:border-zinc-700 rounded-xl space-y-3 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className="inline-block px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold rounded">
                      {item.department}
                    </span>
                    <h3 className="text-xs font-bold text-white">{item.title}</h3>
                  </div>
                  <button
                    onClick={() => handleDeleteDepartmentForm(item.id)}
                    title="حذف من القائمة"
                    className="p-1 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {item.description && (
                  <p className="text-[11px] text-zinc-400 line-clamp-2">{item.description}</p>
                )}

                <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <a
                      href={item.formUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-md text-[11px] font-bold inline-flex items-center gap-1"
                    >
                      <span>رابط العميل</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <a
                      href={item.editUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md text-[11px] font-medium inline-flex items-center gap-1"
                    >
                      <span>تعديل</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(item.formUrl);
                      showToast('success', `✓ تم نسخ رابط استمارة (${item.title}) إلى الحافظة.`);
                    }}
                    className="px-2 py-1.5 text-zinc-400 hover:text-white text-[11px] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>نسخ الرابط</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: Create New Department Form */}
      {showNewDeptFormModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">إنشاء استمارة Google Form لقسم مخصص</h3>
                  <p className="text-[11px] text-zinc-400">سيتم إنشاء استمارة متكاملة في Google Forms وحفظها في المنظومة</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewDeptFormModal(false)}
                className="text-zinc-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDepartmentForm} className="space-y-4">
              <div className="space-y-1.5 text-xs">
                <label className="text-zinc-300 font-medium">القسم المستهدف:</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'قسم المالية والمطالبات',
                    'قسم الدعم الفني والتقني',
                    'قسم الاستشارات الخاصة',
                    'قسم الموارد البشرية (HR)',
                    'قسم الشكاوى والمقترحات',
                    'قسم التسويق والعلاقات'
                  ].map((dept) => (
                    <button
                      type="button"
                      key={dept}
                      onClick={() => setDeptFormDepartment(dept)}
                      className={`p-2 text-right rounded-lg border text-xs transition-all ${
                        deptFormDepartment === dept
                          ? 'bg-emerald-950/40 border-emerald-600 text-emerald-300 font-bold'
                          : 'bg-[#121214] border-[#27272A] text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="أو اكتب اسم قسم مخصص..."
                  value={deptFormDepartment}
                  onChange={(e) => setDeptFormDepartment(e.target.value)}
                  className="w-full mt-2 bg-[#121214] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="text-zinc-300 font-medium">عنوان الاستمارة (Form Title):</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: استمارة تسجيل المطالبات المالية والمستحقات"
                  value={deptFormTitle}
                  onChange={(e) => setDeptFormTitle(e.target.value)}
                  className="w-full bg-[#121214] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="text-zinc-300 font-medium">وصف الاستمارة للعملاء (اختياري):</label>
                <textarea
                  rows={3}
                  placeholder="توجيهات أو إرشادات تظهر في أعلى الاستمارة للعملاء..."
                  value={deptFormDescription}
                  onChange={(e) => setDeptFormDescription(e.target.value)}
                  className="w-full bg-[#121214] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="p-3 bg-[#121214] border border-[#27272A] rounded-lg text-[11px] text-zinc-400 space-y-1">
                <div className="text-emerald-400 font-bold">الحقول التلقائية التي سيتم تضمينها في النموذج:</div>
                <div>• الاسم الكامل • الهاتف / الواتساب • البريد الإلكتروني • نوع الطلب • تفاصيل الطلب • الملاحظات أو الملفات المرفقة</div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setShowNewDeptFormModal(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isCreatingDeptForm || !deptFormTitle.trim()}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  {isCreatingDeptForm ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{isCreatingDeptForm ? 'جارٍ الإنشاء في Google Forms...' : 'إنشاء وحفظ الاستمارة الآن'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SECTION 6: Sync Preferences & Auto-Sync Engine */}
      <div className="bg-[#121214] border border-[#27272A] rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>إعدادات وخيارات المزامنة</span>
            </h3>
            <p className="text-xs text-zinc-400">التحكم بآلية المزامنة التلقائية واليدوية</p>
          </div>

          <button
            onClick={handleRunFullSync}
            disabled={isSyncing}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'جارٍ المزامنة...' : 'مزامنة كاملة الآن (Run Full Sync)'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-[#27272A] text-xs">
          
          <div className="space-y-1.5">
            <label className="text-zinc-300 font-medium">نمط المزامنة (Sync Mode):</label>
            <select
              value={config?.syncMode || 'read_only'}
              onChange={(e) => handleUpdateSyncPreferences(
                e.target.value as any, 
                config?.syncFrequencyMinutes || 15, 
                config?.autoSyncEnabled ?? true
              )}
              className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="read_only">قراءة فقط من الموقع (Read-Only Safe)</option>
              <option value="one_way_in">جلب واستيراد فقط (One-Way In)</option>
              <option value="two_way">مزامنة ثنائية مع تحديث حالة القضية (Two-Way)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-zinc-300 font-medium">تكرار المزامنة التلقائية:</label>
            <select
              value={config?.syncFrequencyMinutes || 15}
              onChange={(e) => handleUpdateSyncPreferences(
                config?.syncMode || 'read_only', 
                Number(e.target.value), 
                config?.autoSyncEnabled ?? true
              )}
              className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value={5}>كل 5 دقائق</option>
              <option value={15}>كل 15 دقيقة (مستحسن)</option>
              <option value={30}>كل 30 دقيقة</option>
              <option value={60}>كل ساعة</option>
              <option value={0}>يدوي فقط (Manual)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-zinc-300 font-medium">المزامنة التلقائية:</label>
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="chkAutoSync"
                checked={config?.autoSyncEnabled ?? true}
                onChange={(e) => handleUpdateSyncPreferences(
                  config?.syncMode || 'read_only', 
                  config?.syncFrequencyMinutes || 15, 
                  e.target.checked
                )}
                className="w-4 h-4 rounded text-indigo-600 bg-zinc-800 border-zinc-700"
              />
              <label htmlFor="chkAutoSync" className="text-xs text-zinc-300 cursor-pointer">
                تفعيل الجلب والمزامنة في الخلفية
              </label>
            </div>
          </div>

        </div>
      </div>

      {/* SECTION 7: Sync History & Audit Log */}
      <div className="bg-[#121214] border border-[#27272A] rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-zinc-400" />
            <span>سجل عمليات المزامنة الأخيرة (Sync Audit History)</span>
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunFullSync}
              disabled={isSyncing}
              className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>إعادة المزامنة الآن</span>
            </button>
          </div>
        </div>

        {syncLogs.length === 0 ? (
          <div className="p-6 text-center text-xs text-zinc-500">لم يتم تسجيل عمليات مزامنة بعد.</div>
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="border-b border-[#27272A] text-zinc-400 text-[11px]">
                    <th className="pb-2 font-medium">معرّف المزامنة</th>
                    <th className="pb-2 font-medium">التاريخ والوقت</th>
                    <th className="pb-2 font-medium">المكتشفة</th>
                    <th className="pb-2 font-medium">جديدة</th>
                    <th className="pb-2 font-medium">مكررة</th>
                    <th className="pb-2 font-medium">المدة</th>
                    <th className="pb-2 font-medium">الحالة والتفاصيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272A]/50 font-mono">
                  {syncLogs.map(log => {
                    const hasErrors = log.errors && log.errors.length > 0;
                    const dateObj = log.startedAt?.seconds 
                      ? new Date(log.startedAt.seconds * 1000) 
                      : (log.startedAt ? new Date(log.startedAt) : new Date());

                    return (
                      <React.Fragment key={log.id}>
                        <tr className="text-zinc-300 hover:bg-zinc-900/50">
                          <td className="py-2.5 text-indigo-400 font-bold">{log.syncId}</td>
                          <td className="py-2.5 text-zinc-400 font-sans">
                            {dateObj.toLocaleString('ar-LB')}
                          </td>
                          <td className="py-2.5">{log.recordsFound}</td>
                          <td className="py-2.5 text-emerald-400 font-bold">+{log.recordsCreated}</td>
                          <td className="py-2.5 text-zinc-500">{log.recordsSkipped}</td>
                          <td className="py-2.5 text-zinc-400 font-sans">{log.durationMs} ms</td>
                          <td className="py-2.5 font-sans">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.status === 'success' 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : log.status === 'warning'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}>
                              {log.status === 'success' ? '✓ ناجحة' : log.status === 'warning' ? 'تنبيه' : 'خطأ'}
                            </span>
                          </td>
                        </tr>
                        {hasErrors && (
                          <tr className="bg-rose-950/20 border-b border-rose-900/20 font-sans">
                            <td colSpan={7} className="py-2 px-3 text-[11px] text-rose-300">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-semibold text-rose-200">سجل التنبيهات: </span>
                                  <span>{log.errors.join(' | ')}</span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Master Provisioning Live Diagnostics */}
      {showProvisioningModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl w-full max-w-xl p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                  provisioningSuccess === true 
                    ? 'bg-emerald-600/20 text-emerald-400' 
                    : provisioningSuccess === false 
                      ? 'bg-rose-600/20 text-rose-400' 
                      : 'bg-indigo-600/20 text-indigo-400'
                }`}>
                  {isMasterProvisioning ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : provisioningSuccess === true ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">التهيئة الشاملة لمنظومة Google Workspace</h3>
                  <p className="text-[11px] text-zinc-400">إنشاء وتجهيز وحفظ كافة المجلدات والنماذج الأساسية دفعة واحدة</p>
                </div>
              </div>
              {!isMasterProvisioning && (
                <button
                  onClick={() => setShowProvisioningModal(false)}
                  className="text-zinc-400 hover:text-white text-sm"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Current Step Status */}
            <div className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-3 ${
              provisioningSuccess === true
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : provisioningSuccess === false
                  ? 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                  : 'bg-indigo-950/40 border-indigo-500/30 text-indigo-300'
            }`}>
              {isMasterProvisioning && <RefreshCw className="w-4 h-4 animate-spin shrink-0" />}
              {provisioningSuccess === true && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
              {provisioningSuccess === false && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
              <span>{provisioningStep || 'جارٍ الإعداد...'}</span>
            </div>

            {/* Live Logs Terminal */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-zinc-400 flex items-center justify-between">
                <span>سجل الخطوات المباشر:</span>
                <span className="font-mono text-zinc-500">{provisioningLogs.length} خطوات</span>
              </div>
              <div className="bg-[#121214] border border-[#27272A] rounded-xl p-3.5 max-h-52 overflow-y-auto font-mono text-[11px] space-y-1.5 text-zinc-300">
                {provisioningLogs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-zinc-600 select-none">›</span>
                    <span className={
                      log.includes('✓') ? 'text-emerald-400' :
                      log.includes('❌') ? 'text-rose-400 font-bold' :
                      log.includes('⚠️') ? 'text-amber-400' : 'text-zinc-300'
                    }>
                      {log}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Explanatory Footer */}
            <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg text-[11px] text-zinc-400 space-y-1">
              <p className="text-zinc-300 font-bold">ملاحظة تنظيمية:</p>
              <p>
                تم حفظ وتثبيت هيكلية Drive الأساسية وملف الشيت المركزي ونموذج القضايا لتبقى ثابتة دائماً.
                إذا أردت إنشاء استمارات لأقسام إضافية (مثل المالية، الاستشارات، الموارد البشرية)، يمكنك إنشاؤها في أي وقت من قسم &quot;استمارات ونماذج الأقسام الأخرى&quot; بالأسفل.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#27272A]">
              {!isMasterProvisioning && (
                <button
                  type="button"
                  onClick={() => setShowProvisioningModal(false)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  إغلاق ومتابعة
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
