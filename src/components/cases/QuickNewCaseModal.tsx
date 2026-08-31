import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import { db, generateNextCaseNumber } from '../../lib/firebase';
import { collection, addDoc, doc, setDoc, serverTimestamp, getDocs, query, orderBy } from 'firebase/firestore';
import { CaseTypeConfig, PlatformConfig, UserProfile, CasePriority } from '../../types';
import { DEFAULT_CASE_TYPES, DEFAULT_PLATFORMS } from '../../lib/constants';
import { logAuditAndEvent } from '../../lib/audit';
import { saveLocalAttachment, saveLocalCase, getLocalCases } from '../../lib/offlineStore';
import { cleanFirestoreData } from '../../lib/googleWorkspace';
import { detectDuplicateCase, DuplicateMatchResult } from '../../lib/duplicateDetector';
import { DuplicateAlertModal } from './DuplicateAlertModal';
import { mergeDataIntoExistingCase } from '../../lib/caseMergeService';
import { useModalLifecycle } from '../../hooks/useModalLifecycle';
import { 
  X, 
  Zap, 
  ShieldAlert, 
  UserX, 
  Trash2, 
  AlertTriangle, 
  AlertCircle,
  Sparkles,
  Terminal, 
  KeyRound, 
  Lock, 
  Users, 
  Copyright, 
  Flag, 
  ShieldCheck, 
  Wrench, 
  FolderPlus, 
  FileQuestion,
  ChevronRight,
  Globe,
  User, 
  Phone, 
  Mail, 
  DollarSign, 
  Coins, 
  Paperclip, 
  Link as LinkIcon, 
  UploadCloud, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  File, 
  Plus, 
  ClipboardPaste, 
  ExternalLink, 
  CopyCheck, 
  CheckCircle2, 
  Eye, 
  GitMerge 
} from 'lucide-react';

interface QuickNewCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaseCreated: (caseId: string) => void;
  initialType?: string;
  initialData?: {
    title?: string;
    clientName?: string;
    clientPhone?: string;
    clientEmail?: string;
    notes?: string;
    links?: string[];
  };
}

interface PendingFile {
  id: string;
  name: string;
  size: number;
  type: string;
  base64: string;
}

interface PendingLink {
  id: string;
  title: string;
  url: string;
}

export const QuickNewCaseModal: React.FC<QuickNewCaseModalProps> = ({
  isOpen,
  onClose,
  onCaseCreated,
  initialType,
  initialData
}) => {
  const { t, isRTL } = useI18n();
  const { userProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [caseTypes, setCaseTypes] = useState<CaseTypeConfig[]>(DEFAULT_CASE_TYPES);
  const [platforms, setPlatforms] = useState<PlatformConfig[]>(DEFAULT_PLATFORMS);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);

  // Form State
  const [selectedType, setSelectedType] = useState<string>(initialType || 'impersonation');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('Instagram');
  const [title, setTitle] = useState<string>(initialData?.title || '');
  const [externalNumber, setExternalNumber] = useState<string>('');
  const [priority, setPriority] = useState<CasePriority>('medium');
  const [assignedUid, setAssignedUid] = useState<string>(userProfile?.uid || '');
  const [clientName, setClientName] = useState<string>(initialData?.clientName || '');
  const [clientPhone, setClientPhone] = useState<string>(initialData?.clientPhone || '');
  const [clientEmail, setClientEmail] = useState<string>(initialData?.clientEmail || '');
  const [agreedAmount, setAgreedAmount] = useState<number | string>('');
  const [currency, setCurrency] = useState<'SYP' | 'USD'>('SYP');
  
  // Dynamic fields state
  const [dynamicValues, setDynamicValues] = useState<Record<string, any>>(
    initialData?.notes ? { notes: initialData.notes, description: initialData.notes } : {}
  );

  // Multiple Files State
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Multiple Links State (up to 20+ links)
  const [pendingLinks, setPendingLinks] = useState<PendingLink[]>(
    initialData?.links && initialData.links.length > 0
      ? initialData.links.map((lnk, idx) => ({ id: `link_${Date.now()}_${idx}`, title: `رابط مستند ${idx + 1}`, url: lnk }))
      : [{ id: `link_${Date.now()}_1`, title: '', url: '' }]
  );
  const [showBulkPasteModal, setShowBulkPasteModal] = useState(false);
  const [bulkPasteText, setBulkPasteText] = useState('');

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  // Intelligent Duplicate Detection State
  const [duplicateResult, setDuplicateResult] = useState<DuplicateMatchResult | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState<boolean>(false);
  const [overrideDuplicate, setOverrideDuplicate] = useState<boolean>(false);

  // Form Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (clientEmail && clientEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(clientEmail.trim())) {
        errors.clientEmail = isRTL 
          ? 'صيغة البريد الإلكتروني غير صحيحة (مثال: client@example.com)' 
          : 'Invalid email format (e.g. client@example.com)';
      }
    }

    if (agreedAmount !== '' && (isNaN(Number(agreedAmount)) || Number(agreedAmount) < 0)) {
      errors.agreedAmount = isRTL 
        ? 'يرجى إدخال مبلغ مالي صحيح وموجب' 
        : 'Please enter a valid positive number';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Real-time Duplicate Check (Phone, Email, Client Name, Identifiers - NOT Case Number)
  useEffect(() => {
    if (!isOpen) {
      setDuplicateResult(null);
      setShowDuplicateModal(false);
      setOverrideDuplicate(false);
      return;
    }

    // Only run if user has typed something in phone, email, client name, external number, or urls
    const urlsToCheck = pendingLinks.map(l => l.url.trim()).filter(Boolean);
    const hasInput = (clientPhone && clientPhone.trim().length >= 5) ||
      (clientEmail && clientEmail.trim().includes('@')) ||
      (clientName && clientName.trim().length >= 3) ||
      (externalNumber && externalNumber.trim().length >= 3) ||
      urlsToCheck.length > 0;

    if (!hasInput) {
      setDuplicateResult(null);
      return;
    }

    const timer = setTimeout(() => {
      const result = detectDuplicateCase({
        externalNumber,
        title,
        clientName,
        clientPhone,
        clientEmail,
        platform: selectedPlatform,
        caseType: selectedType,
        urls: urlsToCheck
      });

      if (result.isDuplicate) {
        setDuplicateResult(result);
      } else {
        setDuplicateResult(null);
        setOverrideDuplicate(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [isOpen, externalNumber, title, clientName, clientPhone, clientEmail, selectedPlatform, selectedType, pendingLinks]);

  useEffect(() => {
    if (initialType) {
      setSelectedType(initialType);
    }
    if (initialData) {
      if (initialData.title) setTitle(initialData.title);
      if (initialData.clientName) setClientName(initialData.clientName);
      if (initialData.clientPhone) setClientPhone(initialData.clientPhone);
      if (initialData.clientEmail) setClientEmail(initialData.clientEmail);
      if (initialData.notes) {
        setDynamicValues(prev => ({ ...prev, notes: initialData.notes, description: initialData.notes }));
      }
      if (initialData.links && initialData.links.length > 0) {
        setPendingLinks(initialData.links.map((lnk, idx) => ({
          id: `link_${Date.now()}_${idx}`,
          title: `رابط مستند ${idx + 1}`,
          url: lnk
        })));
      }
    }
  }, [initialType, initialData]);

  // Load types, platforms and team members from Firestore if available
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      try {
        const typesSnap = await getDocs(query(collection(db, 'caseTypes'), orderBy('sortOrder', 'asc')));
        if (!typesSnap.empty) {
          setCaseTypes(typesSnap.docs.map(d => ({ id: d.id, ...d.data() } as CaseTypeConfig)));
        }

        const platformsSnap = await getDocs(query(collection(db, 'platforms'), orderBy('sortOrder', 'asc')));
        if (!platformsSnap.empty) {
          setPlatforms(platformsSnap.docs.map(d => ({ id: d.id, ...d.data() } as PlatformConfig)));
        }

        const usersSnap = await getDocs(collection(db, 'users'));
        if (!usersSnap.empty) {
          setTeamMembers(usersSnap.docs.map(d => d.data() as UserProfile).filter(u => u.status === 'active'));
        }
      } catch (err) {
        console.warn('Using default types/platforms due to offline/loading state');
      }
    };

    loadData();
  }, [isOpen]);

  if (!isOpen) return null;

  const currentTypeConfig = caseTypes.find(ct => ct.key === selectedType) || caseTypes[0];

  const handleDynamicChange = (key: string, value: any) => {
    setDynamicValues(prev => ({ ...prev, [key]: value }));
  };

  // Multiple Files Handlers
  const handleFilesSelected = (filesList: FileList | null) => {
    if (!filesList || filesList.length === 0) return;
    Array.from(filesList).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        const newFile: PendingFile = {
          id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          base64
        };
        setPendingFiles(prev => [...prev, newFile]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePendingFile = (id: string) => {
    setPendingFiles(prev => prev.filter(f => f.id !== id));
  };

  // Multiple Links Handlers
  const addLinkRow = () => {
    if (pendingLinks.length >= 35) return;
    setPendingLinks(prev => [
      ...prev,
      { id: `link_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, title: '', url: '' }
    ]);
  };

  const updateLinkRow = (id: string, field: 'title' | 'url', value: string) => {
    setPendingLinks(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const removeLinkRow = (id: string) => {
    if (pendingLinks.length === 1) {
      setPendingLinks([{ id: `link_${Date.now()}_1`, title: '', url: '' }]);
      return;
    }
    setPendingLinks(prev => prev.filter(l => l.id !== id));
  };

  const handleApplyBulkPaste = () => {
    if (!bulkPasteText.trim()) return;
    const lines = bulkPasteText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const newLinks: PendingLink[] = lines.map((line, idx) => {
      let resolvedUrl = line;
      if (!resolvedUrl.startsWith('http://') && !resolvedUrl.startsWith('https://')) {
        resolvedUrl = `https://${resolvedUrl}`;
      }
      return {
        id: `link_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        title: `${isRTL ? 'رابط' : 'Link'} ${pendingLinks.filter(l => l.url.trim()).length + idx + 1}`,
        url: resolvedUrl
      };
    });

    const existingNonEmpty = pendingLinks.filter(l => l.url.trim() || l.title.trim());
    setPendingLinks([...existingNonEmpty, ...newLinks]);
    setBulkPasteText('');
    setShowBulkPasteModal(false);
  };

  const handleCreateCase = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    // Validate inputs
    if (!validateForm()) {
      setErrorMessage(
        isRTL 
          ? 'يرجى مراجعة الأخطاء المحددة باللون الأحمر وتصحيحها قبل المتابعة' 
          : 'Please review and fix the highlighted field errors before proceeding'
      );
      return;
    }

    // Check if duplicate detected and not overridden
    if (duplicateResult && duplicateResult.isDuplicate && !overrideDuplicate) {
      setShowDuplicateModal(true);
      return;
    }

    setLoading(true);
    let createdCaseId = '';
    try {
      // Safe active user fallback
      const activeUser = userProfile || {
        uid: 'user_active',
        displayName: 'أخصائي القضايا',
        email: ''
      };

      // 1. Generate atomic sequential case number: JB-YYYY-000001 (instantaneous)
      const caseNumber = await generateNextCaseNumber();

      // 2. Generate valid Firestore Doc Reference & ID synchronously (0ms, zero network delay)
      const caseDocRef = doc(collection(db, 'cases'));
      const caseId = caseDocRef.id;
      createdCaseId = caseId;

      // 3. Resolve default title if empty (Empty Case Support)
      const defaultTypeName = currentTypeConfig 
        ? (isRTL ? currentTypeConfig.labelAr : currentTypeConfig.labelEn) 
        : (isRTL ? 'قضية' : 'Case');
      const defaultPlatformName = selectedPlatform ? ` - ${selectedPlatform}` : '';
      const resolvedTitle = title.trim() || `${defaultTypeName}${defaultPlatformName}`;

      // 4. Resolve assigned employee
      const assignedUser = teamMembers.find(u => u.uid === assignedUid) || {
        uid: activeUser.uid,
        displayName: activeUser.displayName,
        email: activeUser.email
      };

      // 5. Create base case payload
      const baseCasePayload = {
        caseNumber,
        externalNumber: externalNumber.trim() || '',
        title: resolvedTitle,
        caseType: selectedType || 'general',
        platform: selectedPlatform || '',
        status: 'new',
        priority: priority || 'medium',
        assignedTo: {
          uid: assignedUser.uid || activeUser.uid,
          name: assignedUser.displayName || 'أخصائي القضايا',
          email: assignedUser.email || ''
        },
        client: clientName.trim() ? {
          name: clientName.trim(),
          phone: clientPhone.trim() || '',
          email: clientEmail.trim() || '',
          whatsapp: clientPhone.trim() || ''
        } : null,
        typeSpecificData: {
          platform: selectedPlatform || '',
          ...dynamicValues
        },
        agreedAmount: Number(agreedAmount) || 0,
        totalPaid: 0,
        currency: currency || 'SYP',
        isDeleted: false,
        createdBy: {
          uid: activeUser.uid,
          name: activeUser.displayName || 'أخصائي'
        }
      };

      // 6. Save locally immediately to guarantee persistence and instant UI response
      saveLocalCase({
        id: caseId,
        ...baseCasePayload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 7. Non-blocking Firestore synchronization
      setDoc(caseDocRef, cleanFirestoreData({
        ...baseCasePayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })).catch((dbErr) => {
        console.warn('Firestore cloud sync notice (case safely persisted locally):', dbErr);
      });

      // 8. Save all attached files (local cache + non-blocking cloud sync)
      if (pendingFiles.length > 0) {
        for (const pFile of pendingFiles) {
          saveLocalAttachment({
            id: pFile.id,
            caseId,
            fileName: pFile.name,
            fileType: pFile.type,
            fileSize: pFile.size,
            dataUrl: pFile.base64,
            syncStatus: 'synced',
            uploadedAt: new Date().toISOString(),
            uploaderName: activeUser.displayName,
            uploaderUid: activeUser.uid,
          });

          addDoc(collection(db, 'caseAttachments'), cleanFirestoreData({
            id: pFile.id,
            caseId,
            fileName: pFile.name,
            fileType: pFile.type,
            fileSize: pFile.size,
            dataUrl: pFile.base64,
            syncStatus: 'synced',
            uploadedBy: { uid: activeUser.uid, name: activeUser.displayName },
            createdAt: serverTimestamp(),
          })).catch(() => {});
        }
      }

      // 9. Save all valid links (non-blocking cloud sync)
      const validLinks = pendingLinks.filter(l => l.url.trim().length > 0);
      if (validLinks.length > 0) {
        for (const pLink of validLinks) {
          const resolvedLinkTitle = pLink.title.trim() || pLink.url.trim();
          let linkUrl = pLink.url.trim();
          if (!linkUrl.startsWith('http://') && !linkUrl.startsWith('https://')) {
            linkUrl = `https://${linkUrl}`;
          }
          addDoc(collection(db, 'caseLinks'), cleanFirestoreData({
            caseId,
            title: resolvedLinkTitle,
            url: linkUrl,
            createdAt: serverTimestamp(),
            createdBy: { uid: activeUser.uid, name: activeUser.displayName }
          })).catch(() => {});
        }
      }

      // 10. Log audit & timeline event (non-blocking)
      logAuditAndEvent({
        action: 'CREATE_CASE',
        details: `تم إنشاء القضية ${caseNumber} بنجاح: ${resolvedTitle}${clientName.trim() ? ` (العميل: ${clientName.trim()})` : ''}${Number(agreedAmount) > 0 ? ` [التكلفة: ${agreedAmount} ${currency}]` : ''}${pendingFiles.length > 0 ? ` [مرفقات: ${pendingFiles.length}]` : ''}${validLinks.length > 0 ? ` [روابط: ${validLinks.length}]` : ''}`,
        entityType: 'case',
        caseId,
        entityTitle: resolvedTitle,
        user: activeUser
      }).catch(() => {});

      // 11. Instantly open Case Workspace and close modal
      onCaseCreated(caseId);
      onClose();
    } catch (error: any) {
      console.error('Case creation error:', error);
      if (createdCaseId) {
        onCaseCreated(createdCaseId);
        onClose();
      } else {
        setErrorMessage(
          isRTL 
            ? `تعذر إتمام إنشاء القضية: ${error?.message || 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.'}` 
            : `Failed to create case: ${error?.message || 'Unexpected error occurred.'}`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const getIconForType = (key: string) => {
    switch (key) {
      case 'impersonation': return <UserX className="w-4 h-4 text-rose-400" />;
      case 'content_removal': return <Trash2 className="w-4 h-4 text-amber-400" />;
      case 'infosec': return <ShieldAlert className="w-4 h-4 text-red-400" />;
      case 'extortion': return <AlertTriangle className="w-4 h-4 text-orange-400" />;
      case 'penetration_testing': return <Terminal className="w-4 h-4 text-emerald-400" />;
      case 'account_recovery': return <KeyRound className="w-4 h-4 text-cyan-400" />;
      case 'account_hacking': return <Lock className="w-4 h-4 text-purple-400" />;
      case 'identity_impersonation': return <Users className="w-4 h-4 text-sky-400" />;
      case 'intellectual_property': return <Copyright className="w-4 h-4 text-blue-400" />;
      case 'platform_report': return <Flag className="w-4 h-4 text-yellow-400" />;
      case 'security_consultation': return <ShieldCheck className="w-4 h-4 text-teal-400" />;
      case 'technical_issue': return <Wrench className="w-4 h-4 text-slate-400" />;
      default: return <FolderPlus className="w-4 h-4 text-cyan-400" />;
    }
  };

  const { handleSafeClose, handleBackdropClick } = useModalLifecycle({
    isOpen,
    onClose,
    id: 'quick-new-case-modal',
    isSubmitting: loading,
  });

  return (
    <div 
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl shadow-black ring-1 ring-cyan-500/20 my-auto animate-in fade-in zoom-in-95 duration-150"
      >
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950/70 border border-cyan-800/50 text-cyan-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>{t('newCase')}</span>
                <span className="text-[11px] font-mono font-normal text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/50">
                  {isRTL ? 'إنشاء فوري' : 'INSTANT CREATE'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {isRTL ? 'اختر نوع القضية والمنصة لإنشاء مساحة عمل فورية.' : 'Select case type & platform to immediately generate a workspace.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSafeClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleCreateCase} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          
          {/* Explicit Error Banner if an issue occurred */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-600/80 text-rose-200 text-xs flex items-start justify-between gap-2.5 animate-in fade-in slide-in-from-top-1">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-rose-100">{isRTL ? 'تنبيه - تعذر استكمال العملية:' : 'Notice - Action Failed:'}</p>
                  <p className="leading-relaxed">{errorMessage}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-rose-400 hover:text-rose-200 p-1 rounded-md transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Friendly Guidance Hint */}
          <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-800/40 text-[11px] text-cyan-300/90 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>
              {isRTL 
                ? 'ملاحظة: يمكنك إنشاء القضية مباشرة حتى لو كانت فارغة أو بدون تفاصيل، وسيتم توليد رقم القضية الذري وتجهيز مساحة العمل لإكمالها لاحقاً.' 
                : 'Note: You can create a case with empty fields; a sequential ID is automatically generated.'}
            </span>
          </div>

          {/* Step 1: Case Type Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              {t('caseType')} <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {caseTypes.map((ct) => {
                const isSelected = selectedType === ct.key;
                return (
                  <button
                    type="button"
                    key={ct.id}
                    onClick={() => {
                      setSelectedType(ct.key);
                    }}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium border text-start transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 shadow-md shadow-cyan-950'
                        : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="shrink-0">{getIconForType(ct.key)}</span>
                    <span className="truncate">{isRTL ? ct.labelAr : ct.labelEn}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Target Platform Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              {t('platform')}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {platforms.map((p) => {
                const isSelected = selectedPlatform === p.name;
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => setSelectedPlatform(p.name)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-900/70 border-blue-500 text-white font-semibold shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    {isRTL ? p.nameAr : p.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {t('caseTitle')} <span className="text-slate-500 text-[10px]">({isRTL ? 'اختياري' : 'optional'})</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('caseTitlePlaceholder')}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {t('externalNumber')} <span className="text-slate-500 text-[10px]">(META-1234, CASE-99)</span>
              </label>
              <input
                type="text"
                value={externalNumber}
                onChange={(e) => setExternalNumber(e.target.value)}
                placeholder="e.g. META-2026-99182"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {t('priority')}
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as CasePriority)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="low">{t('priority_low')}</option>
                <option value="medium">{t('priority_medium')}</option>
                <option value="high">{t('priority_high')}</option>
                <option value="urgent">{t('priority_urgent')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {t('assignedEmployee')}
              </label>
              <select
                value={assignedUid}
                onChange={(e) => setAssignedUid(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                {teamMembers.map(u => (
                  <option key={u.uid} value={u.uid}>
                    {u.displayName} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Step 3: Client Details & Case Cost Section */}
          <div className="pt-3 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>{t('clientAndFinancials')}</span>
              </span>
              <span className="text-[10px] text-slate-500">
                {isRTL ? 'بيانات العميل والتكلفة' : 'Client & Cost Info'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Client Name */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                  <User className="w-3 h-3 text-cyan-400" />
                  <span>{t('clientName')}</span>
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder={t('clientNamePlaceholder')}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              {/* Client Phone */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-emerald-400" />
                  <span>{t('clientPhone')}</span>
                </label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder={t('clientPhonePlaceholder')}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
                  dir="ltr"
                />
              </div>

              {/* Client Email */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3 h-3 text-blue-400" />
                  <span>البريد الإلكتروني للعميل</span>
                </label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => {
                    setClientEmail(e.target.value);
                    if (fieldErrors.clientEmail) {
                      setFieldErrors(prev => {
                        const copy = { ...prev };
                        delete copy.clientEmail;
                        return copy;
                      });
                    }
                  }}
                  placeholder="client@example.com"
                  className={`w-full bg-slate-950/80 border rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none font-mono transition-colors ${
                    fieldErrors.clientEmail ? 'border-rose-500 focus:border-rose-400' : 'border-slate-800 focus:border-cyan-500'
                  }`}
                  dir="ltr"
                />
                {fieldErrors.clientEmail && (
                  <p className="text-[10px] text-rose-400 mt-1 font-medium">{fieldErrors.clientEmail}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* Case Cost (Agreed Amount) */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                  <Coins className="w-3 h-3 text-amber-400" />
                  <span>{t('caseCost')}</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={agreedAmount}
                    onChange={(e) => {
                      setAgreedAmount(e.target.value);
                      if (fieldErrors.agreedAmount) {
                        setFieldErrors(prev => {
                          const copy = { ...prev };
                          delete copy.agreedAmount;
                          return copy;
                        });
                      }
                    }}
                    placeholder={t('caseCostPlaceholder')}
                    className={`w-full bg-slate-950/80 border rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none font-mono transition-colors ${
                      fieldErrors.agreedAmount ? 'border-rose-500 focus:border-rose-400' : 'border-slate-800 focus:border-cyan-500'
                    }`}
                  />
                  <div className="absolute top-1/2 -translate-y-1/2 end-3 text-[11px] font-bold text-amber-400 pointer-events-none">
                    {currency === 'SYP' ? (isRTL ? 'ل.س' : 'SYP') : '$'}
                  </div>
                </div>
                {fieldErrors.agreedAmount && (
                  <p className="text-[10px] text-rose-400 mt-1 font-medium">{fieldErrors.agreedAmount}</p>
                )}
              </div>

              {/* Currency Selector (SYP / USD) */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                  <DollarSign className="w-3 h-3 text-emerald-400" />
                  <span>{t('currency')}</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrency('SYP')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      currency === 'SYP'
                        ? 'bg-amber-950/70 border-amber-500 text-amber-300 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <span>{isRTL ? 'ليرة سورية (ل.س)' : 'Syrian Pound (SYP)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrency('USD')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      currency === 'USD'
                        ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <span>{isRTL ? 'دولار أمريكي ($)' : 'US Dollar ($)'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4: MULTIPLE LINKS & TARGET URLS (Up to 20+ links) */}
          <div className="pt-3 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5" />
                <span>{t('caseLinksSection')}</span>
                {pendingLinks.filter(l => l.url.trim()).length > 0 && (
                  <span className="bg-blue-950 border border-blue-800/60 text-blue-300 text-[10px] px-2 py-0.2 rounded-full font-mono">
                    {pendingLinks.filter(l => l.url.trim()).length}
                  </span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkPasteModal(!showBulkPasteModal)}
                  className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-950/60 border border-blue-900/60 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  <ClipboardPaste className="w-3 h-3" />
                  <span>{isRTL ? 'لصق روابط سريعة' : 'Bulk Paste URLs'}</span>
                </button>
                <button
                  type="button"
                  onClick={addLinkRow}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 bg-cyan-950/60 border border-cyan-900/60 px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>{t('addAnotherLink')}</span>
                </button>
              </div>
            </div>

            {/* Bulk Paste Box if open */}
            {showBulkPasteModal && (
              <div className="p-3 bg-slate-950 border border-blue-900/60 rounded-xl space-y-2 animate-in fade-in duration-100">
                <div className="flex items-center justify-between text-xs text-blue-300 font-semibold">
                  <span>{t('bulkPasteLinks')}</span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    {isRTL ? 'يدعم حتى 20+ رابط في سطر منفصل' : 'Supports up to 20+ links (one per line)'}
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={bulkPasteText}
                  onChange={(e) => setBulkPasteText(e.target.value)}
                  placeholder={t('bulkPastePlaceholder')}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-blue-500"
                  dir="ltr"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBulkPasteModal(false)}
                    className="px-2.5 py-1 text-xs text-slate-400 hover:text-white rounded"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyBulkPaste}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{t('applyBulkLinks')}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Dynamic Link Rows */}
            <div className="space-y-2 max-h-48 overflow-y-auto pe-1">
              {pendingLinks.map((link, idx) => (
                <div key={link.id} className="flex items-center gap-2 p-2 bg-slate-950/90 border border-slate-800/90 rounded-xl group">
                  <span className="text-[10px] font-mono text-slate-500 w-5 shrink-0 text-center font-bold">
                    #{idx + 1}
                  </span>
                  <input
                    type="text"
                    value={link.title}
                    onChange={(e) => updateLinkRow(link.id, 'title', e.target.value)}
                    placeholder={t('linkTitlePlaceholder')}
                    className="w-1/3 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    value={link.url}
                    onChange={(e) => updateLinkRow(link.id, 'url', e.target.value)}
                    placeholder="https://..."
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-blue-500"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => removeLinkRow(link.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer shrink-0"
                    title={t('removeLink')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Step 5: MULTIPLE FILES UPLOAD (Images, Videos, PDFs, Documents) */}
          <div className="pt-3 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5" />
                <span>{t('addMultipleFiles')}</span>
                {pendingFiles.length > 0 && (
                  <span className="bg-emerald-950 border border-emerald-800/60 text-emerald-300 text-[10px] px-2 py-0.2 rounded-full font-mono">
                    {pendingFiles.length}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-950/60 border border-emerald-900/60 px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>{isRTL ? 'اختيار مستندات أو صور' : 'Select Files'}</span>
              </button>
            </div>

            {/* Hidden Multi-file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
              onChange={(e) => handleFilesSelected(e.target.files)}
              className="hidden"
            />

            {/* Drag & Drop Area */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDraggingOver(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingOver(false);
                handleFilesSelected(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`p-4 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDraggingOver
                  ? 'border-emerald-500 bg-emerald-950/30'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-950/50 hover:bg-slate-950/80'
              }`}
            >
              <div className="p-2 rounded-full bg-slate-900 border border-slate-800 text-emerald-400 mb-1.5">
                <UploadCloud className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-slate-300">
                {t('dragOrSelectFiles')}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {isRTL ? 'يدعم الصور، مقاطع الفيديو، المستندات، ملفات PDF والمضغوطة' : 'Images, MP4/MOV videos, PDF & Office files supported'}
              </p>
            </div>

            {/* Attached Files Badges */}
            {pendingFiles.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pe-1">
                {pendingFiles.map((file) => {
                  const isImage = file.type.startsWith('image/') || file.name.match(/\.(jpg|jpeg|png|webp|gif)$/i);
                  const isVideo = file.type.startsWith('video/') || file.name.match(/\.(mp4|mov|webm)$/i);
                  const isPdf = file.type.includes('pdf') || file.name.endsWith('.pdf');

                  return (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="p-1.5 rounded-lg bg-slate-900 text-emerald-400 shrink-0">
                          {isImage ? <ImageIcon className="w-3.5 h-3.5" /> : isVideo ? <Video className="w-3.5 h-3.5 text-cyan-400" /> : <File className="w-3.5 h-3.5 text-amber-400" />}
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-semibold text-white truncate text-[11px]" title={file.name}>
                            {file.name}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removePendingFile(file.id);
                        }}
                        className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded transition-colors cursor-pointer shrink-0 ms-2"
                        title={t('removeFile')}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dynamic Top Fields if available */}
          {currentTypeConfig?.fields && currentTypeConfig.fields.length > 0 && (
            <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400">
                {isRTL ? 'حقول مخصصة لنوع القضية' : 'Type Specific Information'}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {currentTypeConfig.fields.filter(f => f.key !== 'platform' && f.type !== 'textarea').slice(0, 4).map(f => (
                  <div key={f.key}>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      {isRTL ? f.labelAr : f.labelEn}
                    </label>
                    <input
                      type={f.type === 'url' ? 'url' : 'text'}
                      placeholder={isRTL ? f.placeholderAr : f.placeholderEn}
                      value={dynamicValues[f.key] || ''}
                      onChange={(e) => handleDynamicChange(f.key, e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Intelligent Duplicate Case Warning Banner */}
          {duplicateResult && duplicateResult.matchedCase && (
            <div className={`p-4 rounded-2xl border transition-all animate-in fade-in slide-in-from-top-2 ${
              duplicateResult.level === 'EXACT' || duplicateResult.score >= 90
                ? 'bg-rose-950/40 border-rose-600/60 text-rose-200'
                : 'bg-amber-950/40 border-amber-500/60 text-amber-200'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 w-full">
                  <div className={`p-2 rounded-xl shrink-0 ${
                    duplicateResult.level === 'EXACT' || duplicateResult.score >= 90
                      ? 'bg-rose-900/60 text-rose-300'
                      : 'bg-amber-900/60 text-amber-300'
                  }`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-bold text-xs">
                        ⚠️ تم العثور على قضية سابقة مرتبطة بهذه المعلومات!
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowDuplicateModal(true)}
                        className="text-[11px] font-bold px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors cursor-pointer"
                      >
                        عرض خيارات المعالجة (فتح / دمج / إنشاء)
                      </button>
                    </div>

                    <p className="text-[11px] opacity-90 leading-relaxed">
                      {isRTL ? duplicateResult.matchReasonAr : duplicateResult.matchReasonEn}
                    </p>

                    <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-cyan-400">
                              {duplicateResult.matchedCase.caseNumber}
                            </span>
                            <span className="text-xs text-white font-medium">
                              {duplicateResult.matchedCase.title}
                            </span>
                          </div>
                          {duplicateResult.matchedCase.client?.name && (
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              العميل: {duplicateResult.matchedCase.client.name} {duplicateResult.matchedCase.client.phone ? `(${duplicateResult.matchedCase.client.phone})` : ''}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* 3 Action Buttons on the card */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800">
                        {/* 1. Open Existing */}
                        <button
                          type="button"
                          onClick={() => {
                            if (duplicateResult.matchedCase) {
                              onCaseCreated(duplicateResult.matchedCase.id);
                              onClose();
                            }
                          }}
                          className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 text-xs font-bold transition-all cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>1. فتح القضية الحالية</span>
                        </button>

                        {/* 2. Merge */}
                        <button
                          type="button"
                          onClick={() => setShowDuplicateModal(true)}
                          className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-xs font-bold transition-all cursor-pointer"
                        >
                          <GitMerge className="w-3.5 h-3.5" />
                          <span>2. دمج المعلومات</span>
                        </button>

                        {/* 3. Create Separate */}
                        <button
                          type="button"
                          onClick={() => {
                            setOverrideDuplicate(true);
                            setDuplicateResult(null);
                          }}
                          className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>3. إنشاء قضية جديدة</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit footer */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <div className="text-[11px] text-slate-500 font-mono">
              {isRTL ? 'سيتم توليد رقم القضية آلياً' : 'Atomic JB Number will be generated'}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Zap className="w-4 h-4" />
                <span>{loading ? t('saving') : isRTL ? 'إنشاء وفتح مساحة القضية' : 'Create & Open Workspace'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Dedicated Duplicate Action Modal */}
        {duplicateResult && duplicateResult.matchedCase && (
          <DuplicateAlertModal
            isOpen={showDuplicateModal}
            onClose={() => setShowDuplicateModal(false)}
            duplicateResult={duplicateResult}
            currentInputData={{
              clientName,
              clientPhone,
              clientEmail,
              notes: dynamicValues.notes || dynamicValues.description || title,
              links: pendingLinks.map(l => l.url.trim()).filter(Boolean),
              typeSpecificData: {
                platform: selectedPlatform,
                ...dynamicValues
              }
            }}
            userProfile={userProfile}
            onOpenExistingCase={(caseId) => {
              setShowDuplicateModal(false);
              onCaseCreated(caseId);
              onClose();
            }}
            onMergeSuccess={(mergedCaseId) => {
              setShowDuplicateModal(false);
              onCaseCreated(mergedCaseId);
              onClose();
            }}
            onProceedAnyway={() => {
              setShowDuplicateModal(false);
              setOverrideDuplicate(true);
              // continue with submission
              setTimeout(() => {
                handleCreateCase();
              }, 100);
            }}
          />
        )}
      </div>
    </div>
  );
};
