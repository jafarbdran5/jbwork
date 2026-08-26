import React, { useState, useEffect } from 'react';
import { useI18n } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import { db } from '../../lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  getDocs,
  where,
  getDoc
} from 'firebase/firestore';
import { 
  ExternalRequest, 
  ExternalRequestStatus, 
  ExternalRequestSource, 
  GoogleWorkspaceConfig,
  CaseItem
} from '../../types';
import { logAuditAndEvent } from '../../lib/audit';
import { generateNextCaseNumber } from '../../lib/firebase';
import { 
  runFullGoogleSync, 
  createCaseDriveFolder, 
  suggestCaseType, 
  detectPlatform, 
  extractUrls,
  cleanFirestoreData
} from '../../lib/googleWorkspace';
import { DEFAULT_CASE_TYPES, DEFAULT_PLATFORMS } from '../../lib/constants';
import { 
  Inbox, 
  Plus, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Tag, 
  Layers, 
  MessageSquare,
  X,
  RefreshCw,
  Search,
  Filter,
  ExternalLink,
  Phone,
  Mail,
  FileText,
  FolderPlus,
  Link as LinkIcon,
  ShieldCheck,
  AlertTriangle,
  Send,
  Globe,
  Copy,
  Check,
  ChevronRight,
  Database,
  Calendar,
  Sparkles,
  ArrowRight,
  Paperclip,
  ImageIcon,
  Eye,
  Download
} from 'lucide-react';

interface ExternalRequestsModuleProps {
  onSelectCase?: (caseId: string) => void;
  onNavigateToSettings?: () => void;
}

export const ExternalRequestsModule: React.FC<ExternalRequestsModuleProps> = ({ 
  onSelectCase, 
  onNavigateToSettings 
}) => {
  const { t, isRTL } = useI18n();
  const { userProfile, isSuperAdmin, isManager, googleAccessToken, authorizeGoogleWorkspace } = useAuth();

  const [requests, setRequests] = useState<ExternalRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Google config from Firestore
  const [googleConfig, setGoogleConfig] = useState<GoogleWorkspaceConfig | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Request Detail Drawer
  const [selectedReq, setSelectedReq] = useState<ExternalRequest | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  // Modals
  const [showConvertModal, setShowConvertModal] = useState<boolean>(false);
  const [showLinkModal, setShowLinkModal] = useState<boolean>(false);
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Convert to Case Modal state
  const [convertCaseType, setConvertCaseType] = useState<string>('impersonation');
  const [convertPlatform, setConvertPlatform] = useState<string>('Instagram');
  const [convertPriority, setConvertPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [convertCreateDriveFolder, setConvertCreateDriveFolder] = useState<boolean>(true);
  const [isConverting, setIsConverting] = useState<boolean>(false);

  // Link to Existing Case state
  const [existingCases, setExistingCases] = useState<CaseItem[]>([]);
  const [linkCaseSearch, setLinkCaseSearch] = useState<string>('');
  const [selectedExistingCaseId, setSelectedExistingCaseId] = useState<string>('');
  const [isLinking, setIsLinking] = useState<boolean>(false);

  // Manual Request Modal state
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualType, setManualType] = useState('طلب عام');
  const [manualPlatform, setManualPlatform] = useState('Instagram');
  const [manualAccountUrl, setManualAccountUrl] = useState('');
  const [manualPostUrl, setManualPostUrl] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [manualNotes, setManualNotes] = useState('');

  // Load Real-time External Requests from Firestore
  useEffect(() => {
    const q = query(collection(db, 'externalRequests'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list: ExternalRequest[] = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as ExternalRequest));
      setRequests(list);
      setLoading(false);
    }, (err) => {
      console.warn('External requests snapshot fallback:', err);
      setLoading(false);
    });

    // Load Google Workspace Config
    const unsubConfig = onSnapshot(doc(db, 'googleIntegrations', 'config'), (docSnap) => {
      if (docSnap.exists()) {
        setGoogleConfig(docSnap.data() as GoogleWorkspaceConfig);
      }
    });

    return () => {
      unsubscribe();
      unsubConfig();
    };
  }, []);

  // Fetch Existing Cases for Linking Modal
  const loadExistingCases = async () => {
    try {
      const q = query(collection(db, 'cases'), where('isDeleted', '==', false), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as CaseItem));
      setExistingCases(items);
    } catch (e) {
      console.warn('Failed to load existing cases:', e);
    }
  };

  // Trigger Manual Sync
  const handleSyncNow = async () => {
    let token = googleAccessToken;
    if (!token) {
      try {
        token = await authorizeGoogleWorkspace();
      } catch (err: any) {
        if (err?.code === 'auth/popup-closed-by-user' || err?.message?.includes('popup-closed-by-user')) {
          return;
        }
        setSyncFeedback('يرجى تفويض حساب Google لبدء المزامنة.');
        return;
      }
    }

    if (!token) {
      return;
    }

    if (!googleConfig) {
      setSyncFeedback('يرجى تهيئة إعدادات Google Workspace أولاً من صفحة الإعدادات.');
      return;
    }

    setIsSyncing(true);
    setSyncFeedback(null);

    try {
      const log = await runFullGoogleSync(googleConfig, token, {
        uid: userProfile?.uid || 'system',
        name: userProfile?.displayName || 'المسؤول'
      });

      setSyncFeedback(`✓ اكتملت المزامنة: وجد ${log.recordsFound} طلب، تمت إضافة ${log.recordsCreated} جديد، وتخطي ${log.recordsSkipped} مكرر.`);
    } catch (err: any) {
      console.error('Manual sync error:', err);
      setSyncFeedback(`✕ فشلت المزامنة: ${err.message || err}`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => {
        setSyncFeedback(null);
      }, 7000);
    }
  };

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ⚡ CONVERT TO CASE HANDLER
  const handleOpenConvertModal = (req: ExternalRequest) => {
    setSelectedReq(req);
    // Auto populate suggestion
    const suggested = req.suggestedCaseType || suggestCaseType(`${req.requestType} ${req.description}`);
    setConvertCaseType(suggested || 'impersonation');
    setConvertPlatform(req.platform || 'Instagram');
    setShowConvertModal(true);
  };

  const handleExecuteConvert = async () => {
    if (!selectedReq || !userProfile) return;
    setIsConverting(true);

    try {
      // 1. Generate atomic sequential case number e.g. JB-2026-000142
      const caseNumber = await generateNextCaseNumber();
      
      // 2. Create Drive Folder if option selected and token available
      let driveFolderInfo: { caseFolderId?: string; folderUrl?: string } = {};
      if (convertCreateDriveFolder && googleAccessToken && googleConfig?.driveCasesFolderId) {
        try {
          const driveRes = await createCaseDriveFolder(
            caseNumber, 
            googleConfig.driveCasesFolderId, 
            googleAccessToken
          );
          driveFolderInfo = {
            caseFolderId: driveRes.caseFolderId,
            folderUrl: driveRes.folderUrl
          };
        } catch (driveErr) {
          console.warn('Drive folder creation skipped/failed:', driveErr);
        }
      }

      // 3. Create Case in Firestore
      const newCaseData: Omit<CaseItem, 'id'> = {
        caseNumber,
        externalNumber: selectedReq.requestId,
        title: `${selectedReq.requestType} — ${selectedReq.clientName}`,
        caseType: convertCaseType,
        platform: convertPlatform,
        status: 'new',
        priority: convertPriority,
        client: {
          name: selectedReq.clientName,
          phone: selectedReq.phone || '',
          whatsapp: selectedReq.whatsapp || selectedReq.phone || '',
          email: selectedReq.email || '',
        },
        description: selectedReq.description || '',
        notes: selectedReq.notes ? `[ملاحظات الطلب الخارجي]: ${selectedReq.notes}` : '',
        typeSpecificData: {
          accountUrl: selectedReq.accountUrl || '',
          postUrl: selectedReq.postUrl || '',
          extractedLinks: extractUrls(`${selectedReq.description} ${selectedReq.notes}`),
          source: selectedReq.source,
          sourceLabel: selectedReq.sourceLabel,
          externalRequestId: selectedReq.requestId,
          driveFolderUrl: driveFolderInfo.folderUrl || ''
        },
        isDeleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: {
          uid: userProfile.uid,
          name: userProfile.displayName
        }
      };

      const caseDocRef = await addDoc(collection(db, 'cases'), cleanFirestoreData(newCaseData));
      const newCaseId = caseDocRef.id;

      // 3.1. Save Drive Attachments directly into caseAttachments collection for instant access
      if (selectedReq.driveAttachments && selectedReq.driveAttachments.length > 0) {
        for (const att of selectedReq.driveAttachments) {
          try {
            await addDoc(collection(db, 'caseAttachments'), cleanFirestoreData({
              caseId: newCaseId,
              caseNumber: caseNumber,
              fileName: att.fileName || 'مستند مرفق من الطلب الخارجي',
              fileType: att.fileType || 'application/pdf',
              fileSize: att.fileSize || 0,
              downloadUrl: att.url,
              dataUrl: att.url,
              syncStatus: 'synced',
              driveFileId: att.fileId || '',
              uploadedBy: {
                uid: userProfile.uid,
                name: selectedReq.clientName || 'العميل (عبر النموذج/الموقع)'
              },
              notes: `تم استيراده تلقائياً من الطلب الخارجي ${selectedReq.requestId}`,
              createdAt: serverTimestamp()
            }));
          } catch (attErr) {
            console.warn('Failed to save attachment to caseAttachments:', attErr);
          }
        }
      }

      // 4. Update External Request Doc (Permanent 2-way Link)
      await updateDoc(doc(db, 'externalRequests', selectedReq.id), cleanFirestoreData({
        status: 'converted_to_case',
        linkedCaseId: newCaseId,
        linkedCaseNumber: caseNumber,
        processedAt: serverTimestamp(),
        processedBy: {
          uid: userProfile.uid,
          name: userProfile.displayName || 'المسؤول'
        },
        updatedAt: serverTimestamp()
      }));

      // 5. Add Case Event / Timeline item
      await addDoc(collection(db, 'caseEvents'), cleanFirestoreData({
        caseId: newCaseId,
        action: 'CONVERTED_FROM_EXTERNAL_REQUEST',
        title: `تحويل الطلب الخارجي إلى قضية رسمية`,
        description: `تم إنشاء القضية ${caseNumber} بناءً على الطلب الخارجي ${selectedReq.requestId} (${selectedReq.sourceLabel || selectedReq.source})`,
        performedBy: {
          uid: userProfile.uid,
          name: userProfile.displayName || 'المسؤول'
        },
        timestamp: serverTimestamp(),
        metadata: {
          externalRequestId: selectedReq.requestId,
          source: selectedReq.source
        }
      }));

      // 6. Log Audit
      await logAuditAndEvent({
        action: 'CONVERT_EXTERNAL_REQUEST',
        details: `تحويل الطلب الخارجي ${selectedReq.requestId} إلى القضية ${caseNumber}`,
        entityType: 'case',
        entityId: newCaseId,
        entityTitle: caseNumber,
        caseId: newCaseId,
        user: userProfile
      });

      setShowConvertModal(false);
      setSelectedReq(null);

      // Open newly created case directly if callback provided
      if (onSelectCase) {
        onSelectCase(newCaseId);
      }
    } catch (e: any) {
      console.error('Error converting request to case:', e);
      alert(`حدث خطأ أثناء تحويل الطلب: ${e.message || e}`);
    } finally {
      setIsConverting(false);
    }
  };

  // 🔗 LINK TO EXISTING CASE HANDLER
  const handleOpenLinkModal = (req: ExternalRequest) => {
    setSelectedReq(req);
    loadExistingCases();
    setShowLinkModal(true);
  };

  const handleExecuteLink = async () => {
    if (!selectedReq || !selectedExistingCaseId || !userProfile) return;
    setIsLinking(true);

    try {
      const caseToLink = existingCases.find(c => c.id === selectedExistingCaseId);
      if (!caseToLink) throw new Error('القضية غير موجودة');

      // 1. Update Request
      await updateDoc(doc(db, 'externalRequests', selectedReq.id), cleanFirestoreData({
        status: 'linked_to_case',
        linkedCaseId: caseToLink.id,
        linkedCaseNumber: caseToLink.caseNumber,
        processedAt: serverTimestamp(),
        processedBy: {
          uid: userProfile.uid,
          name: userProfile.displayName || 'المسؤول'
        },
        updatedAt: serverTimestamp()
      }));

      // 2. Add Timeline event in linked case
      await addDoc(collection(db, 'caseEvents'), cleanFirestoreData({
        caseId: caseToLink.id,
        action: 'EXTERNAL_REQUEST_LINKED',
        title: `ربط طلب خارجي بالقضية`,
        description: `تم ربط الطلب الخارجي ${selectedReq.requestId} (${selectedReq.clientName}) بهذه القضية.`,
        performedBy: {
          uid: userProfile.uid,
          name: userProfile.displayName || 'المسؤول'
        },
        timestamp: serverTimestamp(),
        metadata: {
          externalRequestId: selectedReq.requestId,
          source: selectedReq.source
        }
      }));

      // 3. Log Audit
      await logAuditAndEvent({
        action: 'LINK_EXTERNAL_REQUEST',
        details: `ربط الطلب الخارجي ${selectedReq.requestId} بالقضية ${caseToLink.caseNumber}`,
        entityType: 'case',
        entityId: caseToLink.id,
        entityTitle: caseToLink.caseNumber,
        caseId: caseToLink.id,
        user: userProfile
      });

      setShowLinkModal(false);
      setSelectedReq(null);
    } catch (e: any) {
      console.error('Error linking request:', e);
      alert(`حدث خطأ أثناء الربط: ${e.message || e}`);
    } finally {
      setIsLinking(false);
    }
  };

  // Status Change Handler
  const handleUpdateStatus = async (reqId: string, newStatus: ExternalRequestStatus) => {
    if (!userProfile) return;
    try {
      await updateDoc(doc(db, 'externalRequests', reqId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      await logAuditAndEvent({
        action: 'UPDATE_REQUEST_STATUS',
        details: `تعديل حالة الطلب الخارجي ${reqId} إلى: ${newStatus}`,
        entityType: 'external_request',
        entityId: reqId,
        user: userProfile
      });

      if (selectedReq && selectedReq.id === reqId) {
        setSelectedReq(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (e) {
      console.error('Error updating status:', e);
    }
  };

  // Manual Request Creation
  const handleCreateManualRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !userProfile) return;

    try {
      const countSnap = await getDocs(collection(db, 'externalRequests'));
      const reqIndexStr = String(countSnap.size + 1).padStart(5, '0');
      const requestId = `EXT-${new Date().getFullYear()}-${reqIndexStr}`;

      const suggestedType = suggestCaseType(`${manualType} ${manualDescription}`);
      const detectedPlat = manualPlatform || detectPlatform(manualDescription, manualAccountUrl || manualPostUrl);

      const newExtReq: Partial<ExternalRequest> = {
        requestId,
        source: 'manual',
        sourceLabel: 'إدخال يدوي داخلي',
        clientName: manualName.trim(),
        phone: manualPhone.trim(),
        email: manualEmail.trim(),
        requestType: manualType.trim(),
        suggestedCaseType: suggestedType,
        platform: detectedPlat,
        accountUrl: manualAccountUrl.trim(),
        postUrl: manualPostUrl.trim(),
        description: manualDescription.trim(),
        notes: manualNotes.trim(),
        status: 'new',
        createdAt: serverTimestamp(),
        receivedAt: new Date(),
        updatedAt: serverTimestamp(),
        processedBy: {
          uid: userProfile.uid,
          name: userProfile.displayName || 'المسؤول'
        }
      };

      await addDoc(collection(db, 'externalRequests'), cleanFirestoreData(newExtReq));

      await logAuditAndEvent({
        action: 'CREATE_MANUAL_REQUEST',
        details: `إضافة طلب خارجي يدوياً: ${requestId} (${manualName})`,
        entityType: 'external_request',
        entityTitle: requestId,
        user: userProfile
      });

      setManualName('');
      setManualPhone('');
      setManualEmail('');
      setManualDescription('');
      setManualNotes('');
      setManualAccountUrl('');
      setManualPostUrl('');
      setShowManualModal(false);
    } catch (e) {
      console.error('Error creating manual request:', e);
    }
  };

  // Filter requests
  const filteredRequests = requests.filter(req => {
    // Source filter
    if (sourceFilter !== 'all' && req.source !== sourceFilter) return false;

    // Status filter
    if (activeTab === 'new' && req.status !== 'new') return false;
    if (activeTab === 'under_review' && req.status !== 'under_review') return false;
    if (activeTab === 'converted' && req.status !== 'converted_to_case') return false;
    if (activeTab === 'linked' && req.status !== 'linked_to_case') return false;
    if (activeTab === 'waiting' && req.status !== 'waiting_for_info') return false;
    if (activeTab === 'rejected' && req.status !== 'rejected') return false;
    if (activeTab === 'completed' && req.status !== 'completed') return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchId = req.requestId.toLowerCase().includes(q);
      const matchName = req.clientName.toLowerCase().includes(q);
      const matchPhone = (req.phone || '').includes(q);
      const matchType = req.requestType.toLowerCase().includes(q);
      const matchDesc = (req.description || '').toLowerCase().includes(q);
      const matchCase = (req.linkedCaseNumber || '').toLowerCase().includes(q);
      if (!matchId && !matchName && !matchPhone && !matchType && !matchDesc && !matchCase) {
        return false;
      }
    }

    return true;
  });

  // Counters
  const countAll = requests.length;
  const countNew = requests.filter(r => r.status === 'new').length;
  const countReview = requests.filter(r => r.status === 'under_review').length;
  const countConverted = requests.filter(r => r.status === 'converted_to_case').length;
  const countLinked = requests.filter(r => r.status === 'linked_to_case').length;
  const countSite = requests.filter(r => r.source === 'website_sheet').length;
  const countForm = requests.filter(r => r.source === 'google_form').length;

  const getSourceBadge = (source: ExternalRequestSource, label?: string) => {
    switch (source) {
      case 'website_sheet':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Globe className="w-3.5 h-3.5" />
            <span>طلبات الموقع</span>
          </span>
        );
      case 'google_form':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <FileText className="w-3.5 h-3.5" />
            <span>Google Form</span>
          </span>
        );
      case 'manual':
      case 'internal':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <User className="w-3.5 h-3.5" />
            <span>إدخال يدوي</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300">
            <span>{label || source}</span>
          </span>
        );
    }
  };

  const getStatusBadge = (status: ExternalRequestStatus) => {
    switch (status) {
      case 'new':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            <span>جديد</span>
          </span>
        );
      case 'under_review':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" />
            <span>قيد المراجعة</span>
          </span>
        );
      case 'converted_to_case':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle className="w-3 h-3" />
            <span>تم تحويلها لقضية</span>
          </span>
        );
      case 'linked_to_case':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <LinkIcon className="w-3 h-3" />
            <span>مرتبطة بقضية</span>
          </span>
        );
      case 'waiting_for_info':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <span>بحاجة لمعلومات</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" />
            <span>مرفوض</span>
          </span>
        );
      case 'duplicate':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
            <span>مكرر</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <Check className="w-3 h-3" />
            <span>مكتمل</span>
          </span>
        );
      default:
        return <span className="text-xs text-zinc-400">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-[#121214] border border-[#27272A] rounded-xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold">
                <Inbox className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span>الطلبات الخارجية</span>
                  <span className="text-xs font-mono text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-full">
                    External Requests
                  </span>
                </h1>
                <p className="text-xs text-zinc-400">
                  تجميع ومزامنة طلبات واستمارات الموقع وGoogle Forms وGoogle Sheets وتحويلها لقضايا رسمية في JB Work
                </p>
              </div>
            </div>
          </div>

          {/* Sync & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Sync Now Button */}
            <button
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="px-4 py-2.5 rounded-lg bg-[#18181B] hover:bg-zinc-800 border border-[#27272A] hover:border-zinc-700 text-xs font-semibold text-white flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'جارٍ المزامنة الآن...' : 'مزامنة الآن (Sync Now)'}</span>
            </button>

            {/* Manual Request Button */}
            <button
              onClick={() => setShowManualModal(true)}
              className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ إضافة طلب يدوي</span>
            </button>
          </div>

        </div>

        {/* Sync Feedback Toast / Banner */}
        {syncFeedback && (
          <div className={`mt-4 p-3 rounded-lg text-xs font-medium border flex items-center justify-between ${
            syncFeedback.startsWith('✓') 
              ? 'bg-emerald-950/30 text-emerald-300 border-emerald-800/40' 
              : 'bg-rose-950/30 text-rose-300 border-rose-800/40'
          }`}>
            <span>{syncFeedback}</span>
            <button onClick={() => setSyncFeedback(null)} className="text-zinc-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Integration Status Bar */}
        <div className="mt-6 pt-4 border-t border-[#27272A] flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-400">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${googleAccessToken ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
              <span>حساب Google:</span>
              <span className="text-white font-medium">
                {googleAccessToken ? 'متصل ومفوض ✓' : 'يحتاج تفويض (اضغط مزامنة)'}
              </span>
            </div>

            {googleConfig?.websiteSpreadsheetId && (
              <div className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sheet الموقع:</span>
                <span className="text-white font-mono">{googleConfig.websiteSheetName || 'متصل'}</span>
              </div>
            )}

            {googleConfig?.externalFormId && (
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span>Google Form:</span>
                <span className="text-white font-medium">مفعل</span>
              </div>
            )}

            {googleConfig?.lastSyncTime && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <span>آخر مزامنة:</span>
                <span className="text-zinc-300">{new Date(googleConfig.lastSyncTime).toLocaleTimeString('ar-LB')}</span>
              </div>
            )}
          </div>

          {onNavigateToSettings && (
            <button
              onClick={onNavigateToSettings}
              className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>إدارة تكامل Google Workspace</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#121214] border border-[#27272A] rounded-xl p-4">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>كل الطلبات</span>
            <Inbox className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white font-mono">{countAll}</div>
        </div>

        <div className="bg-[#121214] border border-[#27272A] rounded-xl p-4">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>طلبات جديدة</span>
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
          </div>
          <div className="mt-2 text-2xl font-bold text-sky-400 font-mono">{countNew}</div>
        </div>

        <div className="bg-[#121214] border border-[#27272A] rounded-xl p-4">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>طلبات الموقع</span>
            <Globe className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-400 font-mono">{countSite}</div>
        </div>

        <div className="bg-[#121214] border border-[#27272A] rounded-xl p-4">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>تم تحويلها لقضايا</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-400 font-mono">{countConverted}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#121214] border border-[#27272A] rounded-xl p-4 space-y-4">
        
        {/* Source Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#27272A] pb-3">
          <div className="flex items-center gap-1 bg-[#18181B] p-1 rounded-lg border border-[#27272A]">
            <button
              onClick={() => setSourceFilter('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                sourceFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              جميع المصادر ({countAll})
            </button>
            <button
              onClick={() => setSourceFilter('website_sheet')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                sourceFilter === 'website_sheet' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Globe className="w-3 h-3" />
              <span>الموقع ({countSite})</span>
            </button>
            <button
              onClick={() => setSourceFilter('google_form')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                sourceFilter === 'google_form' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <FileText className="w-3 h-3" />
              <span>Google Form ({countForm})</span>
            </button>
            <button
              onClick={() => setSourceFilter('manual')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                sourceFilter === 'manual' ? 'bg-amber-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <User className="w-3 h-3" />
              <span>إدخال يدوي</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-zinc-400 absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في الطلبات، الأسماء، الأرقام..."
              className="w-full bg-[#18181B] border border-[#27272A] rounded-lg ps-9 pe-4 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: 'كل الحالات' },
            { id: 'new', label: `جديدة (${countNew})` },
            { id: 'under_review', label: `قيد المراجعة (${countReview})` },
            { id: 'converted', label: `تم تحويلها لقضية (${countConverted})` },
            { id: 'linked', label: `مرتبطة بقضية (${countLinked})` },
            { id: 'waiting', label: 'بحاجة لمعلومات' },
            { id: 'completed', label: 'مكتملة' },
            { id: 'rejected', label: 'مرفوضة' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-zinc-200 text-zinc-900 font-semibold'
                  : 'bg-[#18181B] text-zinc-400 hover:text-white border border-[#27272A]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

      </div>

      {/* Requests List */}
      {loading ? (
        <div className="p-12 text-center text-zinc-400 text-xs">جارٍ تحميل الطلبات الخارجية...</div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-[#121214] border border-[#27272A] rounded-xl p-12 text-center space-y-3">
          <Inbox className="w-12 h-12 text-zinc-600 mx-auto" />
          <h3 className="text-base font-bold text-white">لا توجد طلبات خارجية مطابقة</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            لم يتم العثور على طلبات جديدة. يمكنك النقر على &quot;مزامنة الآن&quot; لجلب الطلبات من Google Sheets وGoogle Forms أو إضافة طلب يدوياً.
          </p>
          <button
            onClick={handleSyncNow}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-2 cursor-pointer mt-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>مزامنة الطلبات الآن</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredRequests.map((req) => {
            const hasLinks = extractUrls(`${req.description} ${req.notes}`).length > 0;

            return (
              <div
                key={req.id}
                onClick={() => setSelectedReq(req)}
                className="bg-[#121214] hover:bg-[#18181B] border border-[#27272A] hover:border-zinc-700 rounded-xl p-4 transition-all cursor-pointer group space-y-3"
              >
                {/* Card Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-indigo-400 bg-indigo-950/40 border border-indigo-800/40 px-2 py-0.5 rounded">
                      {req.requestId}
                    </span>
                    {getSourceBadge(req.source, req.sourceLabel)}
                    {getStatusBadge(req.status)}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-zinc-400">
                    {req.receivedAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-zinc-500" />
                        <span>{new Date(req.receivedAt?.seconds ? req.receivedAt.seconds * 1000 : req.receivedAt).toLocaleDateString('ar-LB')}</span>
                      </span>
                    )}

                    {/* Linked Case Indicator */}
                    {req.linkedCaseNumber && (
                      <span 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (req.linkedCaseId && onSelectCase) onSelectCase(req.linkedCaseId);
                        }}
                        className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-700/50 px-2 py-0.5 rounded hover:bg-emerald-900/60 cursor-pointer flex items-center gap-1"
                      >
                        <ShieldCheck className="w-3 h-3" />
                        <span>{req.linkedCaseNumber}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Main Info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{req.clientName}</span>
                      {req.platform && (
                        <span className="text-[11px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">
                          {req.platform}
                        </span>
                      )}
                      <span className="text-xs text-zinc-400 font-medium">
                        • {req.requestType}
                      </span>
                    </div>

                    {req.description && (
                      <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                        {req.description}
                      </p>
                    )}
                  </div>

                  {/* Client Contact Quick Actions */}
                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {req.phone && (
                      <a
                        href={`https://wa.me/${req.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 rounded-md bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 text-xs font-medium flex items-center gap-1.5 transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>واتساب</span>
                      </a>
                    )}

                    {req.status !== 'converted_to_case' && req.status !== 'linked_to_case' && (
                      <button
                        onClick={() => handleOpenConvertModal(req)}
                        className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                        <span>تحويل لقضية</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Footer Badges */}
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#27272A]/60 text-[11px] text-zinc-500">
                  {req.suggestedCaseType && (
                    <span className="flex items-center gap-1 text-indigo-400 font-medium">
                      <Sparkles className="w-3 h-3" />
                      <span>نوع مقترح: {req.suggestedCaseType}</span>
                    </span>
                  )}

                  {req.driveAttachments && req.driveAttachments.length > 0 && (
                    <span className="flex items-center gap-1 text-amber-400 font-medium bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/30">
                      <Paperclip className="w-3 h-3" />
                      <span>{req.driveAttachments.length} ملفات / مرفقات</span>
                    </span>
                  )}

                  {req.accountUrl && (
                    <span className="flex items-center gap-1 text-zinc-400 truncate max-w-xs">
                      <ExternalLink className="w-3 h-3" />
                      <span className="truncate">{req.accountUrl}</span>
                    </span>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* DETAIL MODAL / DRAWER */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#121214] border border-[#27272A] rounded-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#27272A]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-indigo-400 bg-indigo-950/40 px-2.5 py-0.5 rounded">
                    {selectedReq.requestId}
                  </span>
                  {getSourceBadge(selectedReq.source, selectedReq.sourceLabel)}
                  {getStatusBadge(selectedReq.status)}
                </div>
                <h2 className="text-lg font-bold text-white">{selectedReq.clientName}</h2>
              </div>

              <button
                onClick={() => setSelectedReq(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Linked Case Notice */}
            {selectedReq.linkedCaseNumber && (
              <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-emerald-300 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>مرتبط بالقضية الرسمية: <strong className="font-mono text-white">{selectedReq.linkedCaseNumber}</strong></span>
                </div>
                {selectedReq.linkedCaseId && onSelectCase && (
                  <button
                    onClick={() => onSelectCase(selectedReq.linkedCaseId!)}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold cursor-pointer"
                  >
                    فتح ملف القضية
                  </button>
                )}
              </div>
            )}

            {/* Client Info & Contacts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#18181B] border border-[#27272A] rounded-xl p-4 text-xs">
              <div className="space-y-2">
                <div className="text-zinc-400 font-semibold">بيانات صاحب الطلب:</div>
                <div className="text-white font-medium text-sm">{selectedReq.clientName}</div>
                {selectedReq.phone && (
                  <div className="flex items-center gap-2 text-zinc-300 font-mono">
                    <Phone className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{selectedReq.phone}</span>
                    <button 
                      onClick={() => handleCopy(selectedReq.phone!, 'phone')}
                      className="text-zinc-500 hover:text-white"
                    >
                      {copiedId === 'phone' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                )}
                {selectedReq.email && (
                  <div className="flex items-center gap-2 text-zinc-300">
                    <Mail className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{selectedReq.email}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="text-zinc-400 font-semibold">تفاصيل التصنيف:</div>
                <div className="text-white">نوع الطلب: <strong className="text-indigo-300">{selectedReq.requestType}</strong></div>
                {selectedReq.platform && (
                  <div className="text-white">المنصة: <strong className="text-emerald-300">{selectedReq.platform}</strong></div>
                )}
                {selectedReq.suggestedCaseType && (
                  <div className="text-indigo-400 font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>التصنيف المقترح: {selectedReq.suggestedCaseType}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Description & URLs */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-zinc-400">تفاصيل المشكلة والطلب:</div>
              <div className="p-4 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">
                {selectedReq.description || 'لا يوجد وصف مفصل'}
              </div>
            </div>

            {/* Links and Account URLs */}
            {(selectedReq.accountUrl || selectedReq.postUrl || extractUrls(`${selectedReq.description} ${selectedReq.notes}`).length > 0) && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-zinc-400">الروابط المرفقة:</div>
                <div className="space-y-1.5">
                  {selectedReq.accountUrl && (
                    <div className="flex items-center justify-between p-2.5 bg-[#18181B] border border-[#27272A] rounded-lg text-xs">
                      <span className="text-zinc-400">رابط الحساب:</span>
                      <a 
                        href={selectedReq.accountUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-indigo-400 hover:text-indigo-300 underline font-mono truncate max-w-sm"
                      >
                        {selectedReq.accountUrl}
                      </a>
                    </div>
                  )}
                  {selectedReq.postUrl && (
                    <div className="flex items-center justify-between p-2.5 bg-[#18181B] border border-[#27272A] rounded-lg text-xs">
                      <span className="text-zinc-400">رابط المنشور:</span>
                      <a 
                        href={selectedReq.postUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-indigo-400 hover:text-indigo-300 underline font-mono truncate max-w-sm"
                      >
                        {selectedReq.postUrl}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Drive Attachments, Photos & Uploaded Files */}
            {selectedReq.driveAttachments && selectedReq.driveAttachments.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>المستندات والصور المرفوعة ({selectedReq.driveAttachments.length}):</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono">Google Drive & Form Uploads</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedReq.driveAttachments.map((att, idx) => {
                    const isImg = att.isImage || att.thumbnailUrl || att.fileType?.startsWith('image/') || (att.fileName || '').match(/\.(jpg|jpeg|png|webp|gif)$/i);
                    const displayUrl = att.thumbnailUrl || att.url;

                    return (
                      <div 
                        key={idx}
                        className="p-3 bg-zinc-900/90 border border-zinc-800 rounded-xl space-y-2 flex flex-col justify-between hover:border-amber-700/50 transition-all shadow-sm"
                      >
                        {/* If image, show photo thumbnail */}
                        {isImg && displayUrl && (
                          <div 
                            onClick={() => setPreviewImage({ url: att.url || displayUrl, name: att.fileName || 'صورة مرفقة' })}
                            className="relative group w-full h-32 bg-black/40 rounded-lg overflow-hidden flex items-center justify-center cursor-pointer border border-zinc-800"
                          >
                            <img 
                              src={displayUrl} 
                              alt={att.fileName || 'Attachment preview'} 
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                              <Eye className="w-5 h-5 text-white" />
                              <span className="text-xs font-bold text-white">تكبير الصورة</span>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2.5 truncate">
                          <div className="p-2 rounded-lg bg-zinc-800/80 text-amber-400 shrink-0">
                            {isImg ? <ImageIcon className="w-4 h-4 text-emerald-400" /> : <FileText className="w-4 h-4 text-amber-400" />}
                          </div>
                          <div className="truncate flex-1">
                            <div className="text-xs font-bold text-white truncate" title={att.fileName}>{att.fileName || 'ملف مرفق'}</div>
                            <div className="text-[10px] text-zinc-400 font-mono">{isImg ? 'صورة مرفقة' : (att.fileType || 'Google Drive File')}</div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-xs">
                          {isImg && (
                            <button
                              type="button"
                              onClick={() => setPreviewImage({ url: att.url || displayUrl, name: att.fileName || 'صورة مرفقة' })}
                              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5 text-cyan-400" />
                              <span>معاينة</span>
                            </button>
                          )}
                          <a 
                            href={att.url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 ms-auto cursor-pointer transition-colors shadow-sm"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>فتح الملف</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* All Synchronized Sheet Columns (If imported from Website Sheet) */}
            {selectedReq.rawPayload?.allColumns && Object.keys(selectedReq.rawPayload.allColumns).length > 0 && (
              <div className="space-y-2 p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl">
                <div className="flex items-center justify-between text-xs font-bold text-indigo-300">
                  <div className="flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-indigo-400" />
                    <span>جميع أعمدة ورقة العمل المزامنة:</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">{Object.keys(selectedReq.rawPayload.allColumns).length} عمود</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                  {Object.entries(selectedReq.rawPayload.allColumns as Record<string, string>).map(([colName, colVal], cIdx) => (
                    <div key={cIdx} className="p-2 bg-zinc-950/80 rounded-lg border border-zinc-800/50 text-[11px]">
                      <span className="text-zinc-400 font-medium block truncate">{colName}:</span>
                      <span className="text-white font-mono block break-words mt-0.5">{colVal || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {selectedReq.notes && (
              <div className="space-y-1 text-xs">
                <span className="font-semibold text-zinc-400">ملاحظات إضافية:</span>
                <p className="text-zinc-300 bg-[#18181B] p-3 rounded-lg border border-[#27272A] whitespace-pre-wrap">
                  {selectedReq.notes}
                </p>
              </div>
            )}

            {/* Action Bar */}
            <div className="pt-4 border-t border-[#27272A] flex flex-wrap items-center justify-between gap-3">
              
              {/* Status Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">تغيير الحالة:</span>
                <select
                  value={selectedReq.status}
                  onChange={(e) => handleUpdateStatus(selectedReq.id, e.target.value as ExternalRequestStatus)}
                  className="bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="new">جديد</option>
                  <option value="under_review">قيد المراجعة</option>
                  <option value="waiting_for_info">بحاجة لمعلومات</option>
                  <option value="completed">مكتمل</option>
                  <option value="rejected">مرفوض</option>
                  <option value="duplicate">مكرر</option>
                </select>
              </div>

              {/* Major Conversion Actions */}
              <div className="flex items-center gap-2">
                {selectedReq.status !== 'converted_to_case' && (
                  <>
                    <button
                      onClick={() => handleOpenLinkModal(selectedReq)}
                      className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
                    >
                      <LinkIcon className="w-3.5 h-3.5 text-indigo-400" />
                      <span>ربط بقضية موجودة</span>
                    </button>

                    <button
                      onClick={() => handleOpenConvertModal(selectedReq)}
                      className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white flex items-center gap-1.5 shadow-md cursor-pointer"
                    >
                      <FolderPlus className="w-4 h-4" />
                      <span>⚡ تحويل إلى قضية رسمية</span>
                    </button>
                  </>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ⚡ CONVERT TO CASE MODAL */}
      {showConvertModal && selectedReq && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#121214] border border-[#27272A] rounded-2xl p-6 space-y-5 shadow-2xl">
            
            <div className="flex items-center justify-between pb-3 border-b border-[#27272A]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">تحويل الطلب الخارجي إلى قضية رسمية</h3>
                  <p className="text-xs text-zinc-400 font-mono">{selectedReq.requestId} ➔ JB-2026-XXXXXX</p>
                </div>
              </div>
              <button onClick={() => setShowConvertModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              
              <div className="p-3 bg-indigo-950/30 border border-indigo-800/40 rounded-xl space-y-1">
                <div className="font-semibold text-indigo-300">العميل وصاحب الطلب:</div>
                <div className="text-white font-medium">{selectedReq.clientName} ({selectedReq.phone || 'بدون هاتف'})</div>
              </div>

              {/* Case Type */}
              <div className="space-y-1.5">
                <label className="text-zinc-300 font-medium">نوع القضية الرسمي:</label>
                <select
                  value={convertCaseType}
                  onChange={(e) => setConvertCaseType(e.target.value)}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {DEFAULT_CASE_TYPES.map(ct => (
                    <option key={ct.id} value={ct.key}>{ct.labelAr} ({ct.labelEn})</option>
                  ))}
                </select>
              </div>

              {/* Platform */}
              <div className="space-y-1.5">
                <label className="text-zinc-300 font-medium">المنصة المستهدفة:</label>
                <select
                  value={convertPlatform}
                  onChange={(e) => setConvertPlatform(e.target.value)}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {DEFAULT_PLATFORMS.map(p => (
                    <option key={p.id} value={p.name}>{p.nameAr} ({p.name})</option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <label className="text-zinc-300 font-medium">مستوى الأولوية:</label>
                <select
                  value={convertPriority}
                  onChange={(e) => setConvertPriority(e.target.value as any)}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="low">منخفضة</option>
                  <option value="medium">متوسطة</option>
                  <option value="high">عالية</option>
                  <option value="urgent">عاجلة جداً</option>
                </select>
              </div>

              {/* Drive Folder Option */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="chkDriveFolder"
                  checked={convertCreateDriveFolder}
                  onChange={(e) => setConvertCreateDriveFolder(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 bg-zinc-800 border-zinc-700"
                />
                <label htmlFor="chkDriveFolder" className="text-zinc-300 cursor-pointer">
                  إنشاء مجلد مخصص للقضية تلقائياً في Google Drive (JB Work/Cases/2026/JB-...)
                </label>
              </div>

            </div>

            {/* Modal Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#27272A]">
              <button
                type="button"
                onClick={() => setShowConvertModal(false)}
                className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleExecuteConvert}
                disabled={isConverting}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isConverting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>{isConverting ? 'جارٍ إنشاء القضية...' : 'تأكيد وإنشاء القضية'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 🔗 LINK TO EXISTING CASE MODAL */}
      {showLinkModal && selectedReq && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#121214] border border-[#27272A] rounded-2xl p-6 space-y-5 shadow-2xl">
            
            <div className="flex items-center justify-between pb-3 border-b border-[#27272A]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-indigo-400">
                  <LinkIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">ربط الطلب بقضية قائمة</h3>
                  <p className="text-xs text-zinc-400">اختر القضية التي ترغب بربط هذا الطلب بها</p>
                </div>
              </div>
              <button onClick={() => setShowLinkModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <input
                type="text"
                value={linkCaseSearch}
                onChange={(e) => setLinkCaseSearch(e.target.value)}
                placeholder="بحث برقم القضية أو اسم العميل..."
                className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />

              <div className="max-h-60 overflow-y-auto space-y-2 border border-[#27272A] rounded-xl p-2 bg-[#18181B]">
                {existingCases
                  .filter(c => {
                    if (!linkCaseSearch) return true;
                    const q = linkCaseSearch.toLowerCase();
                    return c.caseNumber.toLowerCase().includes(q) || 
                           c.title.toLowerCase().includes(q) || 
                           (c.client?.name || '').toLowerCase().includes(q);
                  })
                  .slice(0, 10)
                  .map(c => (
                    <div
                      key={c.id}
                      onClick={() => setSelectedExistingCaseId(c.id)}
                      className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                        selectedExistingCaseId === c.id 
                          ? 'bg-indigo-600/20 border-indigo-500 text-white' 
                          : 'bg-[#121214] border-[#27272A] text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="font-mono font-bold text-xs text-indigo-400">{c.caseNumber}</div>
                        <div className="text-xs text-white font-medium">{c.title}</div>
                        <div className="text-[11px] text-zinc-500">{c.client?.name} • {c.caseType}</div>
                      </div>
                      {selectedExistingCaseId === c.id && <Check className="w-4 h-4 text-indigo-400" />}
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#27272A]">
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-semibold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleExecuteLink}
                disabled={!selectedExistingCaseId || isLinking}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLinking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <LinkIcon className="w-3.5 h-3.5" />}
                <span>تأكيد الربط</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ➕ MANUAL REQUEST MODAL */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#121214] border border-[#27272A] rounded-2xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-[#27272A]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">إضافة طلب خارجي يدوياً</h3>
                  <p className="text-xs text-zinc-400">لتسجيل الطلبات الواردة عبر الاتصال، الواتساب المباشر، أو الحضور</p>
                </div>
              </div>
              <button onClick={() => setShowManualModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManualRequest} className="space-y-4 text-xs">
              
              <div className="space-y-1.5">
                <label className="text-zinc-300 font-medium">اسم العميل / صاحب الطلب *</label>
                <input
                  type="text"
                  required
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="مثال: أحمد السعيد"
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-zinc-300 font-medium">رقم الهاتف / الواتساب</label>
                  <input
                    type="text"
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    placeholder="+961..."
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-zinc-300 font-medium">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    placeholder="client@example.com"
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-zinc-300 font-medium">نوع الطلب</label>
                  <select
                    value={manualType}
                    onChange={(e) => setManualType(e.target.value)}
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {DEFAULT_CASE_TYPES.map(ct => (
                      <option key={ct.id} value={ct.labelAr}>{ct.labelAr}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-zinc-300 font-medium">المنصة</label>
                  <select
                    value={manualPlatform}
                    onChange={(e) => setManualPlatform(e.target.value)}
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {DEFAULT_PLATFORMS.map(p => (
                      <option key={p.id} value={p.name}>{p.nameAr}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-zinc-300 font-medium">رابط الحساب المتأثر</label>
                <input
                  type="url"
                  value={manualAccountUrl}
                  onChange={(e) => setManualAccountUrl(e.target.value)}
                  placeholder="https://instagram.com/..."
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-zinc-300 font-medium">تفاصيل المشكلة والطلب</label>
                <textarea
                  rows={3}
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  placeholder="اكتب ما ذكره العميل بالتفصيل..."
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-lg p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
                >
                  حفظ الطلب الخارجي
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Image Preview Lightbox Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white truncate max-w-md">{previewImage.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewImage.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>فتح في نافذة جديدة</span>
                </a>
                <button
                  onClick={() => setPreviewImage(null)}
                  className="text-xs px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg cursor-pointer"
                >
                  إغلاق (✕)
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center bg-black/60 rounded-xl p-2 min-h-[300px]">
              <img
                src={previewImage.url}
                alt={previewImage.name}
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-md"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
