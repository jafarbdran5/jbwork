import React, { useState, useEffect } from 'react';
import { useI18n } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import { db } from '../../lib/firebase';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  deleteDoc,
} from 'firebase/firestore';
import { 
  CaseItem, 
  CaseEvent, 
  CaseTask, 
  CaseReminder, 
  CaseLink, 
  CaseAttachment, 
  PaymentRecord, 
  UserProfile, 
  CaseStatus, 
  CasePriority,
  CaseTypeConfig
} from '../../types';
import { deleteEntity } from '../../services/database/deleteService';
import { DEFAULT_CASE_TYPES, DEFAULT_PLATFORMS } from '../../lib/constants';
import { logAuditAndEvent } from '../../lib/audit';
import { 
  saveLocalAttachment, 
  getLocalAttachments, 
  removeLocalAttachment,
  useNetworkStatus,
  getLocalCases,
  saveLocalCase,
  removeLocalCase,
  getLocalCaseTasks,
  saveLocalCaseTask,
  getLocalCaseReminders,
  saveLocalCaseReminder,
  getLocalCaseLinks,
  saveLocalCaseLink,
  removeLocalCaseLink,
  getLocalCaseNotes,
  saveLocalCaseNote,
  getLocalCasePayments,
  saveLocalCasePayment
} from '../../lib/offlineStore';
import { 
  ArrowLeft, 
  ArrowRight,
  Shield, 
  Clock, 
  Calendar, 
  User, 
  CheckCircle2, 
  Circle, 
  AlertCircle, 
  Link as LinkIcon, 
  Paperclip, 
  DollarSign, 
  FileText, 
  History, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Copy, 
  Check, 
  Save, 
  Tag, 
  Send,
  Video,
  Image as ImageIcon,
  File,
  Eye,
  Download,
  Lock,
  Edit3,
  Phone,
  PhoneCall,
  MessageSquare,
  Coins,
  UploadCloud,
  ClipboardPaste,
  ArrowUpRight
} from 'lucide-react';

interface CaseWorkspaceProps {
  caseId: string;
  onBack: () => void;
}

export const CaseWorkspace: React.FC<CaseWorkspaceProps> = ({ caseId, onBack }) => {
  const { t, isRTL } = useI18n();
  const { userProfile, canEdit, canViewFinancials, isAdmin } = useAuth();
  const { isOnline } = useNetworkStatus();

  const initialLocalCase = getLocalCases().find((c: any) => c.id === caseId || c.caseNumber === caseId) || null;
  const [caseData, setCaseData] = useState<CaseItem | null>(initialLocalCase);
  const [caseTypes, setCaseTypes] = useState<CaseTypeConfig[]>(DEFAULT_CASE_TYPES);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'timeline' | 'tasks' | 'reminders' | 'attachments' | 'links' | 'payments' | 'notes' | 'audit'>('info');
  const [loading, setLoading] = useState<boolean>(!initialLocalCase);

  // Subcollections data initialized with local caches
  const [events, setEvents] = useState<CaseEvent[]>([]);
  const [tasks, setTasks] = useState<CaseTask[]>(() => getLocalCaseTasks(caseId));
  const [reminders, setReminders] = useState<CaseReminder[]>(() => getLocalCaseReminders(caseId));
  const [links, setLinks] = useState<CaseLink[]>(() => getLocalCaseLinks(caseId));
  const [attachments, setAttachments] = useState<CaseAttachment[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>(() => getLocalCasePayments(caseId));
  const [notes, setNotes] = useState<any[]>(() => getLocalCaseNotes(caseId));

  // Editing state for Info tab
  const [isEditingInfo, setIsEditingInfo] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>(initialLocalCase?.title || '');
  const [editExternalNumber, setEditExternalNumber] = useState<string>(initialLocalCase?.externalNumber || '');
  const [editStatus, setEditStatus] = useState<CaseStatus>(initialLocalCase?.status || 'new');
  const [editPriority, setEditPriority] = useState<CasePriority>(initialLocalCase?.priority || 'medium');
  const [editPlatform, setEditPlatform] = useState<string>(initialLocalCase?.platform || '');
  const [editDescription, setEditDescription] = useState<string>(initialLocalCase?.description || '');
  const [editNextFollowUp, setEditNextFollowUp] = useState<string>(initialLocalCase?.nextFollowUp || '');
  const [editClientName, setEditClientName] = useState<string>(initialLocalCase?.client?.name || '');
  const [editClientPhone, setEditClientPhone] = useState<string>(initialLocalCase?.client?.phone || '');
  const [editDynamicData, setEditDynamicData] = useState<Record<string, any>>(initialLocalCase?.typeSpecificData || {});
  const [editAgreedAmount, setEditAgreedAmount] = useState<number>(initialLocalCase?.agreedAmount || 0);
  const [editCurrency, setEditCurrency] = useState<string>(initialLocalCase?.currency || 'SYP');

  // Quick modals state inside workspace
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<CasePriority>('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderDate, setNewReminderDate] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('10:00');
  const [newReminderNote, setNewReminderNote] = useState('');

  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkDesc, setNewLinkDesc] = useState('');

  const [newNoteContent, setNewNoteContent] = useState('');

  const [newPaymentAmount, setNewPaymentAmount] = useState<number>(0);
  const [newPaymentCurrency, setNewPaymentCurrency] = useState('SYP');
  const [newPaymentMethod, setNewPaymentMethod] = useState('cash');
  const [newPaymentDate, setNewPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [newPaymentNote, setNewPaymentNote] = useState('');

  // Bulk Links and Drag & Drop states
  const [showBulkLinksModal, setShowBulkLinksModal] = useState(false);
  const [bulkLinksText, setBulkLinksText] = useState('');
  const [isDraggingInWorkspace, setIsDraggingInWorkspace] = useState(false);

  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [previewMedia, setPreviewMedia] = useState<{ url: string; type: 'image' | 'video' | 'pdf'; name: string } | null>(null);

  // Load Main Case Item
  useEffect(() => {
    const local = getLocalCases().find((c: any) => c.id === caseId || c.caseNumber === caseId);
    if (local) {
      setCaseData(local);
      setEditTitle(local.title || '');
      setEditExternalNumber(local.externalNumber || '');
      setEditStatus(local.status || 'new');
      setEditPriority(local.priority || 'medium');
      setEditPlatform(local.platform || '');
      setEditDescription(local.description || '');
      setEditNextFollowUp(local.nextFollowUp || '');
      setEditClientName(local.client?.name || '');
      setEditClientPhone(local.client?.phone || '');
      setEditDynamicData(local.typeSpecificData || {});
      setEditAgreedAmount(local.agreedAmount || 0);
      setEditCurrency(local.currency || 'SYP');
      setLoading(false);
    }

    try {
      const caseDocRef = doc(db, 'cases', caseId);
      const unsubscribe = onSnapshot(caseDocRef, (snap) => {
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() } as CaseItem;
          setCaseData(data);
          saveLocalCase(data);
          setEditTitle(data.title || '');
          setEditExternalNumber(data.externalNumber || '');
          setEditStatus(data.status || 'new');
          setEditPriority(data.priority || 'medium');
          setEditPlatform(data.platform || '');
          setEditDescription(data.description || '');
          setEditNextFollowUp(data.nextFollowUp || '');
          setEditClientName(data.client?.name || '');
          setEditClientPhone(data.client?.phone || '');
          setEditDynamicData(data.typeSpecificData || {});
          setEditAgreedAmount(data.agreedAmount || 0);
          setEditCurrency(data.currency || 'SYP');
        } else {
          const localItem = getLocalCases().find((c: any) => c.id === caseId || c.caseNumber === caseId);
          if (localItem) setCaseData(localItem);
        }
        setLoading(false);
      }, (err) => {
        console.warn('Case workspace onSnapshot fallback:', err);
        const localItem = getLocalCases().find((c: any) => c.id === caseId || c.caseNumber === caseId);
        if (localItem) setCaseData(localItem);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn('Firestore doc error:', e);
      const localItem = getLocalCases().find((c: any) => c.id === caseId || c.caseNumber === caseId);
      if (localItem) setCaseData(localItem);
      setLoading(false);
    }
  }, [caseId]);

  // Load Timeline Events
  useEffect(() => {
    try {
      const q = query(collection(db, 'caseEvents'), where('caseId', '==', caseId), orderBy('timestamp', 'desc'));
      const unsubscribe = onSnapshot(q, (snap) => {
        setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() } as CaseEvent)));
      }, (err) => console.warn('Events snapshot fallback:', err));
      return () => unsubscribe();
    } catch (e) {}
  }, [caseId]);

  // Load Tasks
  useEffect(() => {
    try {
      const q = query(collection(db, 'caseTasks'), where('caseId', '==', caseId));
      const unsubscribe = onSnapshot(q, (snap) => {
        const cloudTasks = snap.docs.map(d => ({ id: d.id, ...d.data() } as CaseTask));
        if (cloudTasks.length > 0) {
          setTasks(cloudTasks);
          cloudTasks.forEach(t => saveLocalCaseTask(t));
        } else {
          setTasks(getLocalCaseTasks(caseId));
        }
      }, (err) => {
        setTasks(getLocalCaseTasks(caseId));
      });
      return () => unsubscribe();
    } catch (e) {
      setTasks(getLocalCaseTasks(caseId));
    }
  }, [caseId]);

  // Load Reminders
  useEffect(() => {
    try {
      const q = query(collection(db, 'caseReminders'), where('caseId', '==', caseId));
      const unsubscribe = onSnapshot(q, (snap) => {
        const cloudReminders = snap.docs.map(d => ({ id: d.id, ...d.data() } as CaseReminder));
        if (cloudReminders.length > 0) {
          setReminders(cloudReminders);
          cloudReminders.forEach(r => saveLocalCaseReminder(r));
        } else {
          setReminders(getLocalCaseReminders(caseId));
        }
      }, (err) => {
        setReminders(getLocalCaseReminders(caseId));
      });
      return () => unsubscribe();
    } catch (e) {
      setReminders(getLocalCaseReminders(caseId));
    }
  }, [caseId]);

  // Load Links
  useEffect(() => {
    try {
      const q = query(collection(db, 'caseLinks'), where('caseId', '==', caseId));
      const unsubscribe = onSnapshot(q, (snap) => {
        const cloudLinks = snap.docs.map(d => ({ id: d.id, ...d.data() } as CaseLink));
        if (cloudLinks.length > 0) {
          setLinks(cloudLinks);
          cloudLinks.forEach(l => saveLocalCaseLink(l));
        } else {
          setLinks(getLocalCaseLinks(caseId));
        }
      }, (err) => {
        setLinks(getLocalCaseLinks(caseId));
      });
      return () => unsubscribe();
    } catch (e) {
      setLinks(getLocalCaseLinks(caseId));
    }
  }, [caseId]);

  // Load Attachments (both Cloud + Local cached)
  useEffect(() => {
    try {
      const q = query(collection(db, 'caseAttachments'), where('caseId', '==', caseId));
      const unsubscribe = onSnapshot(q, (snap) => {
        const cloudList = snap.docs.map(d => ({ id: d.id, ...d.data() } as CaseAttachment));
        const localList = getLocalAttachments(caseId).map(l => ({
          id: l.id,
          caseId: l.caseId,
          fileName: l.fileName,
          fileType: l.fileType,
          fileSize: l.fileSize,
          dataUrl: l.dataUrl,
          syncStatus: l.syncStatus,
          uploadedBy: { uid: l.uploaderUid, name: l.uploaderName },
          createdAt: l.uploadedAt
        } as CaseAttachment));

        // Merge avoiding duplicates
        const mergedMap = new Map<string, CaseAttachment>();
        cloudList.forEach(item => mergedMap.set(item.id, item));
        localList.forEach(item => {
          if (!mergedMap.has(item.id)) mergedMap.set(item.id, item);
        });
        setAttachments(Array.from(mergedMap.values()));
      }, (err) => {
        const localList = getLocalAttachments(caseId).map(l => ({
          id: l.id,
          caseId: l.caseId,
          fileName: l.fileName,
          fileType: l.fileType,
          fileSize: l.fileSize,
          dataUrl: l.dataUrl,
          syncStatus: l.syncStatus,
          uploadedBy: { uid: l.uploaderUid, name: l.uploaderName },
          createdAt: l.uploadedAt
        } as CaseAttachment));
        setAttachments(localList);
      });
      return () => unsubscribe();
    } catch (e) {
      const localList = getLocalAttachments(caseId).map(l => ({
        id: l.id,
        caseId: l.caseId,
        fileName: l.fileName,
        fileType: l.fileType,
        fileSize: l.fileSize,
        dataUrl: l.dataUrl,
        syncStatus: l.syncStatus,
        uploadedBy: { uid: l.uploaderUid, name: l.uploaderName },
        createdAt: l.uploadedAt
      } as CaseAttachment));
      setAttachments(localList);
    }
  }, [caseId]);

  // Load Payments
  useEffect(() => {
    try {
      const q = query(collection(db, 'payments'), where('caseId', '==', caseId));
      const unsubscribe = onSnapshot(q, (snap) => {
        const cloudPayments = snap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentRecord));
        if (cloudPayments.length > 0) {
          setPayments(cloudPayments);
          cloudPayments.forEach(p => saveLocalCasePayment(p));
        } else {
          setPayments(getLocalCasePayments(caseId));
        }
      }, (err) => {
        setPayments(getLocalCasePayments(caseId));
      });
      return () => unsubscribe();
    } catch (e) {
      setPayments(getLocalCasePayments(caseId));
    }
  }, [caseId]);

  // Load Notes
  useEffect(() => {
    try {
      const q = query(collection(db, 'caseNotes'), where('caseId', '==', caseId), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snap) => {
        const cloudNotes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (cloudNotes.length > 0) {
          setNotes(cloudNotes);
          cloudNotes.forEach(n => saveLocalCaseNote(n));
        } else {
          setNotes(getLocalCaseNotes(caseId));
        }
      }, (err) => {
        setNotes(getLocalCaseNotes(caseId));
      });
      return () => unsubscribe();
    } catch (e) {
      setNotes(getLocalCaseNotes(caseId));
    }
  }, [caseId]);

  // Load Team Members
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'general'));
        onSnapshot(collection(db, 'users'), (users) => {
          setTeamMembers(users.docs.map(d => d.data() as UserProfile));
        });
      } catch (e) {}
    };
    loadUsers();
  }, []);

  if (loading && !caseData) {
    return (
      <div className="p-12 text-center">
        <div className="inline-block w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-slate-400 font-mono">{isRTL ? 'جارٍ فتح مساحة عمل القضية...' : 'Loading case workspace...'}</p>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="p-12 text-center max-w-md mx-auto bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
          {isRTL ? 'القضية غير موجودة أو تم حذفها' : 'Case not found or deleted'}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
          {isRTL ? 'تعذر العثور على ملف القضية المطلوب. يرجى التحقق من الرقم أو الرجوع لقائمة القضايا.' : 'The requested case file could not be found. Please check or return.'}
        </p>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
        >
          {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          <span>{isRTL ? 'الرجوع للقضايا' : 'Back to cases'}</span>
        </button>
      </div>
    );
  }

  const currentTypeConfig = caseTypes.find(ct => ct.key === caseData.caseType) || caseTypes[0];

  // Save Info changes
  const handleSaveInfo = async () => {
    if (!userProfile || !caseData) return;
    const updatedCase: CaseItem = {
      ...caseData,
      title: editTitle,
      externalNumber: editExternalNumber,
      status: editStatus,
      priority: editPriority,
      platform: editPlatform,
      description: editDescription,
      nextFollowUp: editNextFollowUp,
      client: editClientName.trim() ? { name: editClientName.trim(), phone: editClientPhone.trim() } : undefined,
      typeSpecificData: editDynamicData,
      agreedAmount: Number(editAgreedAmount) || 0,
      currency: editCurrency || 'SYP',
      updatedAt: new Date().toISOString()
    };

    // Update local immediately
    setCaseData(updatedCase);
    saveLocalCase(updatedCase);
    setIsEditingInfo(false);

    try {
      const caseDocRef = doc(db, 'cases', caseId);
      await updateDoc(caseDocRef, {
        title: editTitle,
        externalNumber: editExternalNumber,
        status: editStatus,
        priority: editPriority,
        platform: editPlatform,
        description: editDescription,
        nextFollowUp: editNextFollowUp,
        client: editClientName.trim() ? { name: editClientName.trim(), phone: editClientPhone.trim() } : null,
        typeSpecificData: editDynamicData,
        agreedAmount: Number(editAgreedAmount) || 0,
        currency: editCurrency || 'SYP',
        updatedAt: serverTimestamp(),
      });

      await logAuditAndEvent({
        action: 'UPDATE_CASE',
        details: `تم تحديث تفاصيل القضية ${caseData.caseNumber}${editClientName.trim() ? ` (العميل: ${editClientName.trim()})` : ''} [التكلفة: ${editAgreedAmount} ${editCurrency}]`,
        entityType: 'case',
        caseId,
        entityTitle: editTitle,
        user: userProfile
      });
    } catch (e) {
      console.warn('Firestore update fallback to local store:', e);
    }
  };

  // Quick Status change from header
  const handleQuickStatusChange = async (newStatus: CaseStatus) => {
    if (!userProfile || !caseData) return;
    const updatedCase = { ...caseData, status: newStatus, updatedAt: new Date().toISOString() };
    setCaseData(updatedCase);
    saveLocalCase(updatedCase);

    try {
      await updateDoc(doc(db, 'cases', caseId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      await logAuditAndEvent({
        action: 'CHANGE_STATUS',
        details: `تغيير حالة القضية إلى: ${t(`status_${newStatus}`)}`,
        entityType: 'case',
        caseId,
        entityTitle: caseData.title,
        user: userProfile
      });
    } catch (e) {
      console.warn('Quick status fallback:', e);
    }
  };

  // Quick Assign Employee from header
  const handleQuickAssign = async (targetUid: string) => {
    if (!userProfile || !caseData) return;
    const targetUser = teamMembers.find(u => u.uid === targetUid);
    if (!targetUser) return;

    const assigned = {
      uid: targetUser.uid,
      name: targetUser.displayName,
      email: targetUser.email
    };
    const updatedCase = { ...caseData, assignedTo: assigned, updatedAt: new Date().toISOString() };
    setCaseData(updatedCase);
    saveLocalCase(updatedCase);

    try {
      await updateDoc(doc(db, 'cases', caseId), {
        assignedTo: assigned,
        updatedAt: serverTimestamp()
      });
      await logAuditAndEvent({
        action: 'ASSIGN_EMPLOYEE',
        details: `تعيين القضية للموظف: ${targetUser.displayName}`,
        entityType: 'case',
        caseId,
        entityTitle: caseData.title,
        user: userProfile
      });
    } catch (e) {
      console.warn('Quick assign fallback:', e);
    }
  };

  // Add Task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !userProfile || !caseData) return;
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newTaskItem: CaseTask = {
      id: taskId,
      caseId,
      caseNumber: caseData.caseNumber,
      title: newTaskTitle.trim(),
      priority: newTaskPriority,
      dueDate: newTaskDueDate || '',
      status: 'todo',
      createdAt: new Date().toISOString(),
      createdBy: { uid: userProfile.uid, name: userProfile.displayName }
    };

    // Save local
    saveLocalCaseTask(newTaskItem);
    setTasks(prev => [newTaskItem, ...prev]);
    const addedTitle = newTaskTitle.trim();
    setNewTaskTitle('');
    setNewTaskDueDate('');

    try {
      await addDoc(collection(db, 'caseTasks'), {
        caseId,
        caseNumber: caseData.caseNumber,
        title: addedTitle,
        priority: newTaskPriority,
        dueDate: newTaskDueDate || '',
        status: 'todo',
        createdAt: serverTimestamp(),
        createdBy: { uid: userProfile.uid, name: userProfile.displayName }
      });
      await logAuditAndEvent({
        action: 'CREATE_TASK',
        details: `إضافة مهمة جديدة: ${addedTitle}`,
        entityType: 'task',
        caseId,
        entityTitle: addedTitle,
        user: userProfile
      });
    } catch (e) {
      console.warn('Add task fallback:', e);
    }
  };

  // Toggle Task Status
  const handleToggleTask = async (task: CaseTask) => {
    if (!userProfile) return;
    const nextStatus = task.status === 'completed' ? 'todo' : 'completed';
    const updatedTask = { ...task, status: nextStatus, completedAt: nextStatus === 'completed' ? new Date().toISOString() : null };
    saveLocalCaseTask(updatedTask);
    setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));

    try {
      await updateDoc(doc(db, 'caseTasks', task.id), {
        status: nextStatus,
        completedAt: nextStatus === 'completed' ? serverTimestamp() : null
      });
      await logAuditAndEvent({
        action: nextStatus === 'completed' ? 'COMPLETE_TASK' : 'UPDATE_TASK',
        details: `تحديث حالة المهمة: ${task.title} إلى ${nextStatus}`,
        entityType: 'task',
        caseId,
        entityTitle: task.title,
        user: userProfile
      });
    } catch (e) {
      console.warn('Toggle task fallback:', e);
    }
  };

  // Add Reminder
  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminderTitle.trim() || !newReminderDate || !userProfile || !caseData) return;
    const remId = `rem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newRemItem: CaseReminder = {
      id: remId,
      caseId,
      caseNumber: caseData.caseNumber,
      caseTitle: caseData.title,
      title: newReminderTitle.trim(),
      dueDate: newReminderDate,
      dueTime: newReminderTime,
      note: newReminderNote.trim(),
      status: 'upcoming',
      createdAt: new Date().toISOString(),
      createdBy: { uid: userProfile.uid, name: userProfile.displayName }
    };

    saveLocalCaseReminder(newRemItem);
    setReminders(prev => [newRemItem, ...prev]);
    const remTitle = newReminderTitle.trim();
    const remDate = newReminderDate;
    setNewReminderTitle('');
    setNewReminderDate('');
    setNewReminderNote('');

    try {
      await addDoc(collection(db, 'caseReminders'), {
        caseId,
        caseNumber: caseData.caseNumber,
        caseTitle: caseData.title,
        title: remTitle,
        dueDate: remDate,
        dueTime: newReminderTime,
        note: newReminderNote.trim(),
        status: 'upcoming',
        createdAt: serverTimestamp(),
        createdBy: { uid: userProfile.uid, name: userProfile.displayName }
      });
      await logAuditAndEvent({
        action: 'CREATE_REMINDER',
        details: `إنشاء تذكير: ${remTitle} بتاريخ ${remDate}`,
        entityType: 'reminder',
        caseId,
        entityTitle: remTitle,
        user: userProfile
      });
    } catch (e) {
      console.warn('Add reminder fallback:', e);
    }
  };

  // Add Link
  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLinkUrl.trim() || !userProfile) return;
    let resolvedUrl = newLinkUrl.trim();
    if (!resolvedUrl.startsWith('http://') && !resolvedUrl.startsWith('https://')) {
      resolvedUrl = `https://${resolvedUrl}`;
    }
    const resolvedTitle = newLinkTitle.trim() || resolvedUrl;
    const linkId = `link_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newLinkItem: CaseLink = {
      id: linkId,
      caseId,
      title: resolvedTitle,
      url: resolvedUrl,
      description: newLinkDesc.trim(),
      createdAt: new Date().toISOString(),
      createdBy: { uid: userProfile.uid, name: userProfile.displayName }
    };

    saveLocalCaseLink(newLinkItem);
    setLinks(prev => [newLinkItem, ...prev]);
    setNewLinkTitle('');
    setNewLinkUrl('');
    setNewLinkDesc('');

    try {
      await addDoc(collection(db, 'caseLinks'), {
        caseId,
        title: resolvedTitle,
        url: resolvedUrl,
        description: newLinkDesc.trim(),
        createdAt: serverTimestamp(),
        createdBy: { uid: userProfile.uid, name: userProfile.displayName }
      });
      await logAuditAndEvent({
        action: 'ADD_LINK',
        details: `إضافة رابط لقضية: ${resolvedTitle}`,
        entityType: 'link',
        caseId,
        entityTitle: resolvedTitle,
        user: userProfile
      });
    } catch (e) {
      console.warn('Add link fallback:', e);
    }
  };

  // Bulk Add Links (Supports up to 20+ URLs at once)
  const handleBulkAddLinks = async () => {
    if (!bulkLinksText.trim() || !userProfile) return;
    const lines = bulkLinksText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length === 0) return;

    const newItems: CaseLink[] = [];
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      if (!line.startsWith('http://') && !line.startsWith('https://')) {
        line = `https://${line}`;
      }
      const resolvedTitle = `${isRTL ? 'رابط' : 'Link'} ${links.length + i + 1}`;
      const item: CaseLink = {
        id: `link_bulk_${Date.now()}_${i}`,
        caseId,
        title: resolvedTitle,
        url: line,
        description: '',
        createdAt: new Date().toISOString(),
        createdBy: { uid: userProfile.uid, name: userProfile.displayName }
      };
      saveLocalCaseLink(item);
      newItems.push(item);
    }

    setLinks(prev => [...newItems, ...prev]);
    setBulkLinksText('');
    setShowBulkLinksModal(false);

    try {
      for (const item of newItems) {
        await addDoc(collection(db, 'caseLinks'), {
          caseId,
          title: item.title,
          url: item.url,
          description: '',
          createdAt: serverTimestamp(),
          createdBy: { uid: userProfile.uid, name: userProfile.displayName }
        });
      }

      await logAuditAndEvent({
        action: 'ADD_LINK',
        details: `إضافة ${lines.length} روابط دفعة واحدة للقضية`,
        entityType: 'link',
        caseId,
        entityTitle: `${lines.length} روابط`,
        user: userProfile
      });
    } catch (e) {
      console.warn('Bulk add links fallback:', e);
    }
  };

  // Delete Link
  const handleDeleteLink = async (linkId: string, linkTitle: string) => {
    if (!canEdit || !userProfile || !caseData) return;

    removeLocalCaseLink(caseId, linkId);
    setLinks(prev => prev.filter(l => l.id !== linkId));

    try {
      await deleteDoc(doc(db, 'caseLinks', linkId));
      await logAuditAndEvent({
        action: 'DELETE_LINK',
        details: `حذف الرابط: ${linkTitle}`,
        entityType: 'link',
        caseId,
        entityTitle: linkTitle,
        user: userProfile
      });
    } catch (err) {
      console.warn('Delete link fallback:', err);
    }
  };

  // Process Files Upload (Local Workspace + Cloud)
  const processFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0 || !userProfile) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target?.result as string;
        const fileId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        const newAttItem = {
          id: fileId,
          caseId,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          dataUrl: base64Data,
          syncStatus: isOnline ? ('synced' as const) : ('local' as const),
          uploadedAt: new Date().toISOString(),
          uploaderName: userProfile.displayName,
          uploaderUid: userProfile.uid,
        };

        // 1. Save in local offline store & React state immediately
        saveLocalAttachment(newAttItem);
        setAttachments(prev => [newAttItem, ...prev]);

        // 2. If online, save metadata in Firestore
        try {
          await addDoc(collection(db, 'caseAttachments'), {
            id: fileId,
            caseId,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            dataUrl: base64Data,
            syncStatus: 'synced',
            uploadedBy: { uid: userProfile.uid, name: userProfile.displayName },
            createdAt: serverTimestamp(),
          });

          await logAuditAndEvent({
            action: 'UPLOAD_FILE',
            details: `رفع مرفق: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
            entityType: 'attachment',
            caseId,
            entityTitle: file.name,
            user: userProfile
          });
        } catch (err) {
          console.warn('File uploaded to local workspace, awaiting cloud sync');
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Handle File Upload from input
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  // Delete Attachment
  const handleDeleteAttachment = async (attId: string, fileName: string) => {
    if (!canEdit || !userProfile || !caseData) return;

    // Remove from local storage and update React state immediately
    removeLocalAttachment(attId);
    setAttachments(prev => prev.filter(a => a.id !== attId));

    try {
      await deleteEntity('attachment', attId, userProfile, {
        customTitle: fileName,
        reason: `حذف مرفق من القضية ${caseData.caseNumber}`
      });
      await deleteDoc(doc(db, 'caseAttachments', attId));
    } catch (err) {
      console.warn('Delete attachment fallback:', err);
    }
  };

  // Add Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim() || !userProfile || !caseData) return;
    const noteId = `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newNoteItem = {
      id: noteId,
      caseId,
      content: newNoteContent.trim(),
      author: { uid: userProfile.uid, name: userProfile.displayName },
      createdAt: new Date().toISOString()
    };
    saveLocalCaseNote(newNoteItem);
    setNotes(prev => [newNoteItem, ...prev]);
    const noteText = newNoteContent.trim();
    setNewNoteContent('');

    try {
      await addDoc(collection(db, 'caseNotes'), {
        caseId,
        content: noteText,
        author: { uid: userProfile.uid, name: userProfile.displayName },
        createdAt: serverTimestamp(),
      });
      await logAuditAndEvent({
        action: 'ADD_NOTE',
        details: `إضافة ملاحظة داخلية للقضية`,
        entityType: 'case',
        caseId,
        entityTitle: caseData.title,
        user: userProfile
      });
    } catch (e) {
      console.warn('Add note fallback:', e);
    }
  };

  // Add Payment
  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPaymentAmount || !userProfile || !caseData) return;
    const payId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newPayItem: PaymentRecord = {
      id: payId,
      caseId,
      caseNumber: caseData.caseNumber,
      caseTitle: caseData.title,
      clientName: caseData.client?.name || '',
      amount: Number(newPaymentAmount),
      paymentAmount: Number(newPaymentAmount),
      currency: newPaymentCurrency,
      paymentDate: newPaymentDate,
      paymentMethod: newPaymentMethod as any,
      note: newPaymentNote.trim(),
      recordedBy: { uid: userProfile.uid, name: userProfile.displayName },
      createdAt: new Date().toISOString()
    };

    saveLocalCasePayment(newPayItem);
    setPayments(prev => [newPayItem, ...prev]);

    // Update case totalPaid locally
    const currentPaid = caseData.totalPaid || 0;
    const updatedTotalPaid = currentPaid + Number(newPaymentAmount);
    const updatedCase = { ...caseData, totalPaid: updatedTotalPaid, updatedAt: new Date().toISOString() };
    setCaseData(updatedCase);
    saveLocalCase(updatedCase);

    const payAmt = newPaymentAmount;
    const payCur = newPaymentCurrency;
    const payDate = newPaymentDate;
    const payMethod = newPaymentMethod;
    const payNote = newPaymentNote.trim();
    setNewPaymentAmount(0);
    setNewPaymentNote('');

    try {
      await addDoc(collection(db, 'payments'), {
        caseId,
        caseNumber: caseData.caseNumber,
        caseTitle: caseData.title,
        clientName: caseData.client?.name || '',
        paymentAmount: Number(payAmt),
        currency: payCur,
        paymentDate: payDate,
        paymentMethod: payMethod,
        note: payNote,
        recordedBy: { uid: userProfile.uid, name: userProfile.displayName },
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'cases', caseId), {
        totalPaid: updatedTotalPaid,
        updatedAt: serverTimestamp()
      });

      await logAuditAndEvent({
        action: 'CREATE_PAYMENT',
        details: `تسجيل دفعة بقيمة: ${payAmt} ${payCur}`,
        entityType: 'payment',
        caseId,
        entityTitle: `${payAmt} ${payCur}`,
        user: userProfile
      });
    } catch (e) {
      console.warn('Add payment fallback:', e);
    }
  };

  // Soft Delete Case
  const handleSoftDelete = async () => {
    if (!caseData) return;
    const confirm = window.confirm(isRTL ? `هل أنت متأكد من حذف/نقل القضية (${caseData.caseNumber || ''} - ${caseData.title || ''}) إلى سلة المهملات؟` : 'Move this case to Recycle Bin?');
    if (!confirm) return;

    // 1. Clean from local caches
    removeLocalCase(caseId);
    if (caseData.caseNumber) {
      removeLocalCase(caseData.caseNumber);
    }
    try {
      const all = getLocalCases().filter(c => 
        c.id !== caseId && 
        (!caseData.caseNumber || c.caseNumber !== caseData.caseNumber)
      );
      localStorage.setItem('jb_cached_cases', JSON.stringify(all));
    } catch (_) {}

    // 2. Unified deletion service
    await deleteEntity('case', caseId, userProfile, {
      customTitle: `${caseData.caseNumber || ''} - ${caseData.title || ''}`,
      reason: 'نقل القضية من مساحة العمل إلى سلة المهملات'
    });

    // 3. Direct Firestore delete
    try {
      await deleteDoc(doc(db, 'cases', caseId));
    } catch (_) {}

    // 4. Global events
    window.dispatchEvent(new CustomEvent('jb_entity_deleted', { detail: { entityType: 'case', id: caseId } }));
    window.dispatchEvent(new CustomEvent('jb_data_changed', { detail: { type: 'cases', entityType: 'case' } }));

    onBack();
  };

  // Helper copy link
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(text);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  // Calculations for financials
  const totalAgreed = caseData.agreedAmount || 0;
  const totalPaid = payments.reduce((acc, p) => acc + (p.paymentAmount || 0), 0);
  const remaining = Math.max(0, totalAgreed - totalPaid);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          <span>{isRTL ? 'العودة للقضايا' : 'Back to Cases'}</span>
        </button>

        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={handleSoftDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/40 border border-red-900/60 text-red-300 hover:bg-red-900/60 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t('delete')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Case Header Card (Requirement 20) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl ring-1 ring-cyan-500/10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Left / Start Info */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-base sm:text-lg font-black text-cyan-400 bg-cyan-950/90 px-3 py-1 rounded-xl border border-cyan-800/80 shadow-sm">
                {caseData.caseNumber}
              </span>

              {caseData.externalNumber && (
                <span className="font-mono text-xs text-slate-300 bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-700">
                  {caseData.externalNumber}
                </span>
              )}

              <span className="text-xs font-bold text-slate-200 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700 flex items-center gap-1.5">
                <Tag className="w-3 h-3 text-cyan-400" />
                {currentTypeConfig ? (isRTL ? currentTypeConfig.labelAr : currentTypeConfig.labelEn) : caseData.caseType}
              </span>

              {caseData.platform && (
                <span className="text-xs font-semibold text-blue-300 bg-blue-950/80 px-2.5 py-1 rounded-lg border border-blue-800/60">
                  {caseData.platform}
                </span>
              )}

              {/* Client Badge */}
              {caseData.client?.name && (
                <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700/80 px-2.5 py-1 rounded-lg text-xs">
                  <User className="w-3 h-3 text-cyan-400" />
                  <span className="text-slate-200 font-semibold">{caseData.client.name}</span>
                  {caseData.client.phone && (
                    <div className="flex items-center gap-1 ms-1 ps-1.5 border-s border-slate-700">
                      <span className="text-slate-400 font-mono text-[11px]" dir="ltr">{caseData.client.phone}</span>
                      <a
                        href={`tel:${caseData.client.phone}`}
                        title={t('callClient')}
                        className="p-0.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/50 rounded transition-colors"
                      >
                        <PhoneCall className="w-3 h-3" />
                      </a>
                      <a
                        href={`https://wa.me/${caseData.client.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        title={t('whatsappClient')}
                        className="p-0.5 text-green-400 hover:text-green-300 hover:bg-green-950/50 rounded transition-colors"
                      >
                        <MessageSquare className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Case Cost Badge */}
              {canViewFinancials && (caseData.agreedAmount !== undefined && caseData.agreedAmount > 0) && (
                <span className="text-xs font-bold text-amber-300 bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-800/80 flex items-center gap-1 font-mono shadow-sm">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span>{caseData.agreedAmount.toLocaleString()}</span>
                  <span className="text-[10px] text-amber-400/80">
                    {caseData.currency === 'SYP' ? (isRTL ? 'ل.س' : 'SYP') : '$'}
                  </span>
                </span>
              )}
            </div>

            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {caseData.title}
            </h1>
          </div>

          {/* Quick Controls in Header */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
            {/* Status Selector */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-400 text-[11px]">{t('status')}:</span>
              <select
                value={caseData.status}
                disabled={!canEdit}
                onChange={(e) => handleQuickStatusChange(e.target.value as CaseStatus)}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
              >
                <option value="new">{t('status_new')}</option>
                <option value="in_progress">{t('status_in_progress')}</option>
                <option value="pending">{t('status_pending')}</option>
                <option value="overdue">{t('status_overdue')}</option>
                <option value="completed">{t('status_completed')}</option>
                <option value="cancelled">{t('status_cancelled')}</option>
              </select>
            </div>

            {/* Assignee Selector */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 text-xs">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <select
                value={caseData.assignedTo?.uid || ''}
                disabled={!canEdit}
                onChange={(e) => handleQuickAssign(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer max-w-[120px] truncate"
              >
                {teamMembers.map(u => (
                  <option key={u.uid} value={u.uid}>{u.displayName}</option>
                ))}
              </select>
            </div>

            {/* Priority Badge */}
            <span className={`px-2.5 py-1.5 rounded-xl text-xs font-bold uppercase border ${
              caseData.priority === 'urgent' ? 'bg-red-950 border-red-700 text-red-300' :
              caseData.priority === 'high' ? 'bg-orange-950 border-orange-700 text-orange-300' :
              caseData.priority === 'medium' ? 'bg-amber-950 border-amber-700 text-amber-300' :
              'bg-slate-800 border-slate-700 text-slate-300'
            }`}>
              {t(`priority_${caseData.priority}`)}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-800 text-xs">
        <button
          onClick={() => setActiveTab('info')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'info'
              ? 'bg-slate-900 border-t-2 border-cyan-400 text-cyan-400'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{t('tabInfo')}</span>
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'timeline'
              ? 'bg-slate-900 border-t-2 border-cyan-400 text-cyan-400'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <History className="w-4 h-4" />
          <span>{t('tabTimeline')} ({events.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'tasks'
              ? 'bg-slate-900 border-t-2 border-cyan-400 text-cyan-400'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{t('tabTasks')} ({tasks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('reminders')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'reminders'
              ? 'bg-slate-900 border-t-2 border-cyan-400 text-cyan-400'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{t('tabReminders')} ({reminders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('attachments')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'attachments'
              ? 'bg-slate-900 border-t-2 border-cyan-400 text-cyan-400'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <Paperclip className="w-4 h-4" />
          <span>{t('tabAttachments')} ({attachments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('links')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'links'
              ? 'bg-slate-900 border-t-2 border-cyan-400 text-cyan-400'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <LinkIcon className="w-4 h-4" />
          <span>{t('tabLinks')} ({links.length})</span>
        </button>

        {canViewFinancials && (
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'payments'
                ? 'bg-slate-900 border-t-2 border-cyan-400 text-cyan-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>{t('tabPayments')} ({payments.length})</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('notes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'notes'
              ? 'bg-slate-900 border-t-2 border-cyan-400 text-cyan-400'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          <span>{t('tabNotes')} ({notes.length})</span>
        </button>
      </div>

      {/* Tab 1: INFORMATION */}
      {activeTab === 'info' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>{isRTL ? 'تفاصيل القضية والحقول المخصصة' : 'Case Details & Dynamic Fields'}</span>
            </h3>

            {canEdit && (
              <button
                onClick={() => {
                  if (isEditingInfo) handleSaveInfo();
                  else setIsEditingInfo(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-600/20 transition-all cursor-pointer"
              >
                {isEditingInfo ? <Save className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                <span>{isEditingInfo ? t('save') : t('edit')}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">{t('caseTitle')}</label>
              {isEditingInfo ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              ) : (
                <p className="text-xs font-medium text-slate-200">{caseData.title}</p>
              )}
            </div>

            {/* External Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">{t('externalNumber')}</label>
              {isEditingInfo ? (
                <input
                  type="text"
                  value={editExternalNumber}
                  onChange={(e) => setEditExternalNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              ) : (
                <p className="text-xs font-mono text-slate-200">{caseData.externalNumber || '—'}</p>
              )}
            </div>

            {/* Platform */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">{t('platform')}</label>
              {isEditingInfo ? (
                <input
                  type="text"
                  value={editPlatform}
                  onChange={(e) => setEditPlatform(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              ) : (
                <p className="text-xs font-medium text-slate-200">{caseData.platform || '—'}</p>
              )}
            </div>

            {/* Client Info */}
            <div className="sm:col-span-2 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
              <label className="block text-xs font-bold text-cyan-400 mb-2 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>{t('clientAndFinancials')}</span>
              </label>
              {isEditingInfo ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">{t('clientName')}</label>
                    <input
                      type="text"
                      placeholder={t('clientNamePlaceholder')}
                      value={editClientName}
                      onChange={(e) => setEditClientName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">{t('clientPhone')}</label>
                    <input
                      type="tel"
                      placeholder={t('clientPhonePlaceholder')}
                      value={editClientPhone}
                      onChange={(e) => setEditClientPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                      dir="ltr"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-0.5">{t('clientName')}</span>
                    <span className="font-semibold text-white">{caseData.client?.name || (isRTL ? 'غير محدد' : 'Not specified')}</span>
                  </div>
                  {caseData.client?.phone ? (
                    <div className="flex items-center gap-2">
                      <div className="text-right sm:text-left">
                        <span className="text-[11px] text-slate-400 block mb-0.5">{t('clientPhone')}</span>
                        <span className="font-mono text-emerald-400 font-medium" dir="ltr">{caseData.client.phone}</span>
                      </div>
                      <div className="flex items-center gap-1.5 ms-2">
                        <a
                          href={`tel:${caseData.client.phone}`}
                          title={t('callClient')}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 hover:bg-emerald-900/80 text-[11px] font-bold transition-colors"
                        >
                          <PhoneCall className="w-3 h-3" />
                          <span>{t('callClient')}</span>
                        </a>
                        <a
                          href={`https://wa.me/${caseData.client.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          title={t('whatsappClient')}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-950/80 border border-green-700/80 text-green-300 hover:bg-green-900/80 text-[11px] font-bold transition-colors"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>{t('whatsappClient')}</span>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-0.5">{t('clientPhone')}</span>
                      <span className="text-slate-500">{isRTL ? 'لا يوجد رقم هاتف' : 'No phone number'}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Agreed Amount & Currency */}
            {canViewFinancials && (
              <div className="sm:col-span-2 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                <label className="block text-xs font-bold text-amber-400 mb-2 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5" />
                  <span>{t('caseCost')}</span>
                </label>
                {isEditingInfo ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">{t('caseCost')}</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={editAgreedAmount}
                        onChange={(e) => setEditAgreedAmount(Number(e.target.value))}
                        placeholder={t('caseCostPlaceholder')}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">{t('currency')}</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setEditCurrency('SYP')}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            editCurrency === 'SYP'
                              ? 'bg-amber-950/70 border-amber-500 text-amber-300 shadow-sm'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {isRTL ? 'ليرة سورية (ل.س)' : 'SYP'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditCurrency('USD')}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            editCurrency === 'USD'
                              ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300 shadow-sm'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {isRTL ? 'دولار أمريكي ($)' : 'USD ($)'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold font-mono text-amber-300">
                      {(caseData.agreedAmount || 0).toLocaleString()}
                    </span>
                    <span className="text-xs font-bold text-amber-400/90">
                      {caseData.currency === 'SYP' ? (isRTL ? 'ليرة سورية (ل.س)' : 'SYP') : (isRTL ? 'دولار أمريكي ($)' : 'USD ($)')}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Next Follow-up */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">{t('nextFollowUp')}</label>
              {isEditingInfo ? (
                <input
                  type="date"
                  value={editNextFollowUp}
                  onChange={(e) => setEditNextFollowUp(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              ) : (
                <p className="text-xs font-medium text-slate-200">{caseData.nextFollowUp || '—'}</p>
              )}
            </div>
          </div>

          {/* Dynamic Type-Specific Fields Section (Requirement 17) */}
          {currentTypeConfig?.fields && currentTypeConfig.fields.length > 0 && (
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                {isRTL ? `حقول ${currentTypeConfig.labelAr}` : `${currentTypeConfig.labelEn} Fields`}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentTypeConfig.fields.filter(f => f.key !== 'platform').map((field) => {
                  const val = isEditingInfo 
                    ? (editDynamicData[field.key] || '') 
                    : (caseData.typeSpecificData?.[field.key] || '');

                  return (
                    <div key={field.key} className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        {isRTL ? field.labelAr : field.labelEn}
                      </label>
                      {isEditingInfo ? (
                        field.type === 'textarea' ? (
                          <textarea
                            rows={2}
                            value={val}
                            onChange={(e) => setEditDynamicData(prev => ({ ...prev, [field.key]: e.target.value }))}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
                          />
                        ) : (
                          <input
                            type={field.type === 'url' ? 'url' : 'text'}
                            value={val}
                            onChange={(e) => setEditDynamicData(prev => ({ ...prev, [field.key]: e.target.value }))}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
                          />
                        )
                      ) : (
                        field.type === 'url' && val ? (
                          <a
                            href={val}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-cyan-400 hover:underline flex items-center gap-1.5 break-all"
                          >
                            <span>{val}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        ) : (
                          <p className="text-xs text-slate-200 whitespace-pre-wrap">{val || '—'}</p>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Images & Attachments Gallery (if attachments exist) */}
          {attachments.length > 0 && (
            <div className="pt-4 border-t border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>{isRTL ? 'معرض صور ومستندات القضية المرفقة' : 'Attached Case Photos & Documents'}</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setActiveTab('attachments')}
                  className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <span>{isRTL ? 'عرض جميع المرفقات' : 'View all attachments'} ({attachments.length})</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {attachments.map((att) => {
                  const isImg = att.fileType?.startsWith('image/') || att.fileName.match(/\.(jpg|jpeg|png|webp|gif)$/i);
                  const previewUrl = att.dataUrl || att.downloadUrl;

                  return (
                    <div
                      key={att.id}
                      onClick={() => {
                        if (previewUrl) {
                          setPreviewMedia({
                            url: previewUrl,
                            type: isImg ? 'image' : 'pdf',
                            name: att.fileName
                          });
                        }
                      }}
                      className="p-2 bg-slate-950/80 border border-slate-800 rounded-xl hover:border-slate-700 cursor-pointer space-y-1.5 group transition-all"
                    >
                      {isImg && previewUrl ? (
                        <div className="w-full h-20 bg-black/40 rounded-lg overflow-hidden flex items-center justify-center">
                          <img
                            src={previewUrl}
                            alt={att.fileName}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-20 bg-slate-900 rounded-lg flex items-center justify-center text-amber-400">
                          <File className="w-6 h-6" />
                        </div>
                      )}
                      <p className="text-[10px] font-bold text-white truncate" title={att.fileName}>{att.fileName}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: TIMELINE (Requirement 33) */}
      {activeTab === 'timeline' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
            <History className="w-4 h-4 text-cyan-400" />
            <span>{isRTL ? 'سير أحداث القضية الزمني (Timeline)' : 'Chronological Case Timeline'}</span>
          </h3>

          {events.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">{isRTL ? 'لا توجد أحداث مسجلة بعد' : 'No timeline events recorded yet'}</p>
          ) : (
            <div className="relative border-r-2 border-slate-800 pr-5 space-y-6">
              {events.map((ev) => (
                <div key={ev.id} className="relative">
                  <div className="absolute -right-[27px] top-1.5 w-3 h-3 rounded-full bg-cyan-500 ring-4 ring-slate-900" />
                  <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-cyan-300">{ev.performedBy?.name || 'مستخدم'}</span>
                      <span className="text-slate-500 font-mono">
                        {ev.timestamp?.toDate ? ev.timestamp.toDate().toLocaleString('ar-EG') : new Date().toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-white">{ev.title}</p>
                    {ev.description && <p className="text-xs text-slate-400">{ev.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: TASKS (Requirement 32) */}
      {activeTab === 'tasks' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5">
          {/* Add Task Form */}
          {canEdit && (
            <form onSubmit={handleAddTask} className="flex flex-wrap gap-2.5 p-3.5 bg-slate-950 rounded-xl border border-slate-800">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder={isRTL ? 'أضف مهمة جديدة للقضية...' : 'Add a new task for this case...'}
                className="flex-1 min-w-[200px] bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <input
                type="date"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('add')}</span>
              </button>
            </form>
          )}

          {/* Task list */}
          <div className="space-y-2">
            {tasks.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">{t('noTasksFound')}</p>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    task.status === 'completed'
                      ? 'bg-slate-950/40 border-slate-800/50 opacity-60'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleTask(task)}
                      className="text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
                    >
                      {task.status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-600" />
                      )}
                    </button>
                    <div>
                      <span className={`text-xs font-medium ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-white'}`}>
                        {task.title}
                      </span>
                      {task.dueDate && (
                        <p className="text-[10px] text-slate-500 font-mono">
                          {isRTL ? 'الاستحقاق:' : 'Due:'} {task.dueDate}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    task.priority === 'urgent' ? 'bg-red-950 text-red-300' :
                    task.priority === 'high' ? 'bg-orange-950 text-orange-300' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {t(`priority_${task.priority}`)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 4: REMINDERS (Requirement 31) */}
      {activeTab === 'reminders' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5">
          {/* Add Reminder Form */}
          {canEdit && (
            <form onSubmit={handleAddReminder} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  value={newReminderTitle}
                  onChange={(e) => setNewReminderTitle(e.target.value)}
                  placeholder={isRTL ? 'عنوان التذكير (متابعة البلاغ، مراجعة الحساب...)' : 'Reminder Title'}
                  className="sm:col-span-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
                <input
                  type="date"
                  value={newReminderDate}
                  onChange={(e) => setNewReminderDate(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
                <input
                  type="time"
                  value={newReminderTime}
                  onChange={(e) => setNewReminderTime(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newReminderNote}
                  onChange={(e) => setNewReminderNote(e.target.value)}
                  placeholder={isRTL ? 'ملاحظة إضافية (اختياري)' : 'Optional note'}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{isRTL ? 'ضبط تذكير' : 'Set Reminder'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Reminders List */}
          <div className="space-y-2">
            {reminders.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">{isRTL ? 'لا توجد تذكيرات مسجلة لهذه القضية' : 'No reminders for this case'}</p>
            ) : (
              reminders.map((rem) => (
                <div key={rem.id} className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-950/70 border border-orange-800/50 text-orange-400">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{rem.title}</h4>
                      {rem.note && <p className="text-[11px] text-slate-400">{rem.note}</p>}
                    </div>
                  </div>
                  <div className="text-end font-mono text-xs text-orange-300 font-medium">
                    <p>{rem.dueDate}</p>
                    <p className="text-[10px] text-slate-500">{rem.dueTime || ''}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 5: ATTACHMENTS (Requirements 23, 24, 25) */}
      {activeTab === 'attachments' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5">
          {/* Header & Upload Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-800/60 text-emerald-400">
                <Paperclip className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">
                    {t('tabAttachments')}
                  </h3>
                  <span className="bg-emerald-950 border border-emerald-800/60 text-emerald-400 text-xs px-2 py-0.5 rounded-full font-mono font-bold">
                    {attachments.length}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {isRTL ? 'مساحة المرفقات الآمنة — تدعم رفع مستندات وصور وفيديو متعددة مع الحفظ المحلي والسحابي' : 'Secure attachment workspace — upload multiple docs, images & videos with local & cloud sync'}
                </p>
              </div>
            </div>

            {canEdit && (
              <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-emerald-900/30 transition-all">
                <UploadCloud className="w-4 h-4" />
                <span>{isRTL ? 'رفع ملفات / صور / فيديو' : 'Upload Files'}</span>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Drag & Drop Upload Box */}
          {canEdit && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingInWorkspace(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDraggingInWorkspace(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingInWorkspace(false);
                if (e.dataTransfer.files) {
                  processFiles(e.dataTransfer.files);
                }
              }}
              className={`p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center transition-all ${
                isDraggingInWorkspace
                  ? 'border-emerald-500 bg-emerald-950/30 scale-[1.01]'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-950/70'
              }`}
            >
              <div className="p-3 rounded-full bg-slate-900 border border-slate-800 text-emerald-400 mb-2">
                <UploadCloud className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-200">
                {t('dragOrSelectFiles')}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {isRTL ? 'يمكنك إفلات عدة صور أو مقاطع فيديو أو مستندات دفعة واحدة هنا' : 'Drop multiple images, videos, or documents at once here'}
              </p>
            </div>
          )}

          {/* Media Preview Modal if active */}
          {previewMedia && (
            <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
              <div className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                  <span className="text-xs font-bold text-white truncate">{previewMedia.name}</span>
                  <button onClick={() => setPreviewMedia(null)} className="text-slate-400 hover:text-white text-xs px-2 py-1 bg-slate-800 rounded">
                    {t('close')}
                  </button>
                </div>
                <div className="flex-1 overflow-auto flex items-center justify-center bg-black/40 rounded-xl p-2">
                  {previewMedia.type === 'image' && (
                    <img src={previewMedia.url} alt={previewMedia.name} className="max-w-full max-h-[70vh] object-contain rounded-lg" />
                  )}
                  {previewMedia.type === 'video' && (
                    <video controls src={previewMedia.url} className="max-w-full max-h-[70vh] rounded-lg" />
                  )}
                  {previewMedia.type === 'pdf' && (
                    <iframe src={previewMedia.url} className="w-full h-[70vh] rounded-lg" title="PDF Preview" />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Attachment Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {attachments.length === 0 ? (
              <div className="col-span-full py-10 text-center text-xs text-slate-500 bg-slate-950/50 rounded-2xl border border-slate-800/60">
                <Paperclip className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                <p>{t('noAttachmentsFound')}</p>
              </div>
            ) : (
              attachments.map((att) => {
                const isImage = att.fileType?.startsWith('image/') || att.fileName.match(/\.(jpg|jpeg|png|webp|gif)$/i);
                const isVideo = att.fileType?.startsWith('video/') || att.fileName.match(/\.(mp4|mov|webm)$/i);
                const isPdf = att.fileType?.includes('pdf') || att.fileName.endsWith('.pdf');

                return (
                  <div key={att.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2 flex flex-col justify-between hover:border-slate-700 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-cyan-400 shrink-0">
                        {isImage ? <ImageIcon className="w-5 h-5 text-emerald-400" /> : isVideo ? <Video className="w-5 h-5 text-cyan-400" /> : <File className="w-5 h-5 text-amber-400" />}
                      </div>
                      <div className="overflow-hidden flex-1">
                        <p className="text-xs font-bold text-white truncate" title={att.fileName}>{att.fileName}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{(att.fileSize / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>

                    {/* Image thumbnail preview if available */}
                    {isImage && (att.dataUrl || att.downloadUrl) && (
                      <div 
                        onClick={() => setPreviewMedia({
                          url: att.dataUrl || att.downloadUrl || '',
                          type: 'image',
                          name: att.fileName
                        })}
                        className="w-full h-28 rounded-lg overflow-hidden bg-black/50 border border-slate-800 cursor-pointer relative group flex items-center justify-center"
                      >
                        <img 
                          src={att.dataUrl || att.downloadUrl} 
                          alt={att.fileName}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-opacity">
                          <Eye className="w-4 h-4 text-white" />
                          <span className="text-[10px] font-bold text-white">معاينة</span>
                        </div>
                      </div>
                    )}

                    {/* Sync status badge & Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-[10px]">
                      <span className={`px-2 py-0.5 rounded font-mono ${
                        att.syncStatus === 'synced' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' :
                        att.syncStatus === 'local' ? 'bg-amber-950 text-amber-400 border border-amber-800/60' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {att.syncStatus === 'synced' ? (isRTL ? 'تمت المزامنة' : 'Synced') : (isRTL ? 'محفوظ محلياً' : 'Saved Locally')}
                      </span>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1">
                        {(att.dataUrl || att.downloadUrl) && (
                          <button
                            onClick={() => setPreviewMedia({
                              url: att.dataUrl || att.downloadUrl || '',
                              type: isImage ? 'image' : isVideo ? 'video' : 'pdf',
                              name: att.fileName
                            })}
                            className="p-1 text-cyan-400 hover:text-cyan-300 hover:bg-slate-900 rounded cursor-pointer"
                            title={t('view')}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {(att.dataUrl || att.downloadUrl) && (
                          <a
                            href={att.dataUrl || att.downloadUrl}
                            download={att.fileName}
                            className="p-1 text-slate-400 hover:text-white hover:bg-slate-900 rounded cursor-pointer"
                            title={isRTL ? 'تحميل' : 'Download'}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => handleDeleteAttachment(att.id, att.fileName)}
                            className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded cursor-pointer transition-colors"
                            title={t('delete')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 6: LINKS (Requirement 22) */}
      {activeTab === 'links' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5">
          {/* Header & Multi-Link Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-950/70 border border-blue-800/60 text-blue-400">
                <LinkIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">
                    {t('caseLinksSection')}
                  </h3>
                  <span className="bg-blue-950 border border-blue-800/60 text-blue-400 text-xs px-2 py-0.5 rounded-full font-mono font-bold">
                    {links.length}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {isRTL ? 'روابط القضية والحسابات والبلاغات — يدعم إضافة حتى 20+ رابط دفعة واحدة' : 'Case links, social targets & evidence URLs — supports bulk adding 20+ links at once'}
                </p>
              </div>
            </div>

            {canEdit && (
              <button
                type="button"
                onClick={() => setShowBulkLinksModal(!showBulkLinksModal)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-950 border border-blue-800 hover:bg-blue-900 text-blue-300 text-xs font-bold transition-colors cursor-pointer"
              >
                <ClipboardPaste className="w-4 h-4" />
                <span>{isRTL ? 'لصق روابط متعددة (حتى 20+)' : 'Bulk Add Multiple Links'}</span>
              </button>
            )}
          </div>

          {/* Bulk Links Box if active */}
          {showBulkLinksModal && canEdit && (
            <div className="p-4 bg-slate-950 border border-blue-900/80 rounded-2xl space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                  <ClipboardPaste className="w-4 h-4" />
                  <span>{t('bulkPasteLinks')}</span>
                </span>
                <span className="text-[10px] text-slate-500">
                  {isRTL ? 'ألصق الروابط هنا (كل رابط في سطر منفصل)' : 'Paste URLs here (one URL per line)'}
                </span>
              </div>
              <textarea
                rows={4}
                value={bulkLinksText}
                onChange={(e) => setBulkLinksText(e.target.value)}
                placeholder={t('bulkPastePlaceholder')}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-blue-500"
                dir="ltr"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkLinksModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleBulkAddLinks}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('applyBulkLinks')}</span>
                </button>
              </div>
            </div>
          )}

          {/* Add Single Link Form */}
          {canEdit && (
            <form onSubmit={handleAddLink} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  value={newLinkTitle}
                  onChange={(e) => setNewLinkTitle(e.target.value)}
                  placeholder={isRTL ? 'عنوان الرابط (الحساب الأصلي، المنشور، البلاغ...)' : 'Link Title (Original, Fake, Report...)'}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
                <input
                  type="text"
                  required
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  dir="ltr"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newLinkDesc}
                  onChange={(e) => setNewLinkDesc(e.target.value)}
                  placeholder={isRTL ? 'وصف إضافي أو ملاحظة على الرابط' : 'Description / Notes on this URL'}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>{isRTL ? 'حفظ الرابط' : 'Add Link'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Links list */}
          <div className="space-y-2">
            {links.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500 bg-slate-950/50 rounded-2xl border border-slate-800/60">
                <LinkIcon className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                <p>{t('noLinksFound')}</p>
              </div>
            ) : (
              links.map((link, idx) => (
                <div key={link.id} className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="text-[11px] font-mono text-slate-500 w-5 shrink-0 text-center font-bold">
                      #{idx + 1}
                    </span>
                    <div className="p-2 rounded-lg bg-blue-950/70 border border-blue-800/50 text-blue-400 shrink-0">
                      <LinkIcon className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="text-xs font-bold text-white">{link.title}</h4>
                      <p className="text-[11px] font-mono text-cyan-400 truncate max-w-md" dir="ltr">{link.url}</p>
                      {link.description && <p className="text-[10px] text-slate-400 mt-0.5">{link.description}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => copyToClipboard(link.url)}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs flex items-center gap-1 cursor-pointer"
                      title={isRTL ? 'نسخ الرابط' : 'Copy URL'}
                    >
                      {copiedLink === link.url ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs flex items-center gap-1 cursor-pointer"
                      title={isRTL ? 'فتح بأمان في نافذة جديدة' : 'Open in New Tab'}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    {canEdit && (
                      <button
                        onClick={() => handleDeleteLink(link.id, link.title)}
                        className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-500 hover:text-rose-400 text-xs cursor-pointer transition-colors"
                        title={t('delete')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 7: PAYMENTS (Requirement 36) */}
      {activeTab === 'payments' && canViewFinancials && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6">
          {/* Financial summary banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400">{isRTL ? 'المبلغ المتفق عليه' : 'Total Agreed'}</span>
              <p className="text-xl font-bold text-white font-mono mt-1">
                {totalAgreed.toLocaleString()} <span className="text-xs text-amber-400">{caseData.currency === 'USD' ? '$' : (isRTL ? 'ل.س' : 'SYP')}</span>
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400">{isRTL ? 'إجمالي المحصل' : 'Total Paid'}</span>
              <p className="text-xl font-bold text-emerald-400 font-mono mt-1">
                {totalPaid.toLocaleString()} <span className="text-xs text-emerald-400/80">{caseData.currency === 'USD' ? '$' : (isRTL ? 'ل.س' : 'SYP')}</span>
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400">{isRTL ? 'المبلغ المتبقي' : 'Remaining Balance'}</span>
              <p className={`text-xl font-bold font-mono mt-1 ${remaining > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                {remaining.toLocaleString()} <span className="text-xs text-amber-400/80">{caseData.currency === 'USD' ? '$' : (isRTL ? 'ل.س' : 'SYP')}</span>
              </p>
            </div>
          </div>

          {/* Add Payment Form */}
          <form onSubmit={handleAddPayment} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              {isRTL ? 'تسجيل دفعة جديدة' : 'Record New Payment'}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <input
                type="number"
                required
                value={newPaymentAmount || ''}
                onChange={(e) => setNewPaymentAmount(Number(e.target.value))}
                placeholder={isRTL ? 'المبلغ (مثال: 500000)' : 'Amount (e.g. 500)'}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
              <select
                value={newPaymentCurrency}
                onChange={(e) => setNewPaymentCurrency(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              >
                <option value="SYP">{isRTL ? 'ليرة سورية (SYP - ل.س)' : 'Syrian Pound (SYP)'}</option>
                <option value="USD">{isRTL ? 'دولار أمريكي (USD - $)' : 'US Dollar (USD)'}</option>
                <option value="IQD">IQD (د.ع)</option>
                <option value="AED">AED (د.إ)</option>
                <option value="SAR">SAR (ر.س)</option>
                <option value="EUR">EUR (€)</option>
              </select>
              <select
                value={newPaymentMethod}
                onChange={(e) => setNewPaymentMethod(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              >
                <option value="cash">{isRTL ? 'نقداً (Cash)' : 'Cash'}</option>
                <option value="bank_transfer">{isRTL ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                <option value="western_union">{isRTL ? 'ويسترن يونيون' : 'Western Union'}</option>
                <option value="zain_cash">{isRTL ? 'زين كاش' : 'Zain Cash'}</option>
                <option value="crypto">{isRTL ? 'عملات رقمية (USDT)' : 'Crypto (USDT)'}</option>
                <option value="other">{isRTL ? 'أخرى' : 'Other'}</option>
              </select>
              <input
                type="date"
                value={newPaymentDate}
                onChange={(e) => setNewPaymentDate(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newPaymentNote}
                onChange={(e) => setNewPaymentNote(e.target.value)}
                placeholder={isRTL ? 'ملاحظة أو رقم إيصال الدفعة' : 'Receipt number or payment note'}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>{isRTL ? 'تأكيد تسجيل الدفعة' : 'Confirm Payment'}</span>
              </button>
            </div>
          </form>

          {/* Payments list */}
          <div className="space-y-2">
            {payments.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">{isRTL ? 'لا توجد دفعات مسجلة لهذه القضية' : 'No payments recorded yet'}</p>
            ) : (
              payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
                  <div>
                    <span className="text-xs font-bold text-emerald-400 font-mono">
                      +{p.paymentAmount.toLocaleString()} {p.currency}
                    </span>
                    <p className="text-[11px] text-slate-400">{p.paymentMethod} • {p.paymentDate}</p>
                    {p.note && <p className="text-[10px] text-slate-500">{p.note}</p>}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {p.recordedBy?.name}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 8: NOTES */}
      {activeTab === 'notes' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5">
          {/* Add Note Form */}
          {canEdit && (
            <form onSubmit={handleAddNote} className="space-y-2.5">
              <textarea
                rows={3}
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder={isRTL ? 'اكتب ملاحظة سرية أو تفاصيل داخلية للفريق...' : 'Write private internal notes for the team...'}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isRTL ? 'إضافة الملاحظة' : 'Add Note'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Notes list */}
          <div className="space-y-3">
            {notes.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">{isRTL ? 'لا توجد ملاحظات داخلية بعد' : 'No notes yet'}</p>
            ) : (
              notes.map((note) => (
                <div key={note.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-cyan-300">{note.author?.name || 'فريق العمل'}</span>
                    <span className="text-slate-500 font-mono">
                      {note.createdAt?.toDate ? note.createdAt.toDate().toLocaleString('ar-EG') : ''}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 whitespace-pre-wrap">{note.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
};
