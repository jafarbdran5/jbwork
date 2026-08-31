import React, { useState, useEffect } from 'react';
import { useI18n } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import { db } from '../../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, updateDoc, deleteDoc, doc, getDocs, serverTimestamp } from 'firebase/firestore';
import { CaseItem, CaseTypeConfig, PlatformConfig, UserProfile, CaseStatus, CasePriority } from '../../types';
import { DEFAULT_CASE_TYPES, DEFAULT_PLATFORMS } from '../../lib/constants';
import { getLocalCases, saveLocalCase, removeLocalCase, getLocalUsers } from '../../lib/offlineStore';
import { deleteEntity } from '../../services/database/deleteService';
import { logAuditAndEvent } from '../../lib/audit';
import { 
  Search, 
  Filter, 
  FolderPlus, 
  Layers, 
  Tag, 
  Clock, 
  User, 
  Calendar, 
  ChevronRight, 
  ArrowUpDown,
  CheckCircle2,
  AlertTriangle,
  X,
  ExternalLink,
  Phone,
  Coins,
  Trash2,
  Sparkles,
  Edit3,
  Save,
  Check,
  FileText,
  DollarSign,
  AlertCircle
} from 'lucide-react';

interface CaseListProps {
  onSelectCase: (caseId: string) => void;
  onOpenQuickCase: (type?: string) => void;
  myCasesOnly?: boolean;
}

// 🌟 Safe Deduplication Helper for Cases 🌟
function deduplicateCases(rawList: CaseItem[]): CaseItem[] {
  const seenIds = new Set<string>();
  const seenNumbers = new Set<string>();
  const result: CaseItem[] = [];

  for (const item of rawList) {
    if (!item) continue;
    if (item.isDeleted || (item as any)._deleted) continue;

    // Unique ID check
    if (item.id) {
      if (seenIds.has(item.id)) continue;
      seenIds.add(item.id);
    }

    // Unique Case Number check
    if (item.caseNumber && item.caseNumber.trim()) {
      const cleanNum = item.caseNumber.trim().toUpperCase();
      if (seenNumbers.has(cleanNum)) continue;
      seenNumbers.add(cleanNum);
    }

    result.push(item);
  }

  return result;
}

export const CaseList: React.FC<CaseListProps> = ({
  onSelectCase,
  onOpenQuickCase,
  myCasesOnly = false
}) => {
  const { t, isRTL } = useI18n();
  const { userProfile, canEdit } = useAuth();

  const [cases, setCases] = useState<CaseItem[]>(() => {
    const raw = getLocalCases().filter(c => !c.isDeleted && !(c as any)._deleted);
    return deduplicateCases(raw);
  });
  const [loading, setLoading] = useState<boolean>(() => {
    const raw = getLocalCases().filter(c => !c.isDeleted && !(c as any)._deleted);
    return raw.length === 0;
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Quick Filter
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeQuickFilter, setTypeQuickFilter] = useState<string>('all');

  // Advanced Filters
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');

  const [caseTypes, setCaseTypes] = useState<CaseTypeConfig[]>(DEFAULT_CASE_TYPES);
  const [platforms, setPlatforms] = useState<PlatformConfig[]>(DEFAULT_PLATFORMS);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>(() => getLocalUsers());

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingCase, setEditingCase] = useState<CaseItem | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    caseNumber: '',
    externalNumber: '',
    caseType: 'impersonation',
    status: 'in_progress' as CaseStatus,
    priority: 'medium' as CasePriority,
    platform: '',
    clientName: '',
    clientPhone: '',
    agreedAmount: 0,
    currency: 'SYP',
    description: '',
    notes: '',
    nextFollowUp: '',
    assignedToUid: ''
  });
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  // Dedicated Delete Confirmation Modal State (No window.confirm)
  const [caseToDelete, setCaseToDelete] = useState<CaseItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load team members
  useEffect(() => {
    try {
      const q = query(collection(db, 'users'));
      const unsub = onSnapshot(q, (snap) => {
        const users = snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
        if (users.length > 0) setTeamMembers(users);
      }, (err) => {
        console.warn('Team snapshot fallback:', err);
      });
      return () => unsub();
    } catch (_) {}
  }, []);

  // Subscribe to Cases & Live Deletion Events
  useEffect(() => {
    const syncLocal = () => {
      const raw = getLocalCases().filter(c => !c.isDeleted && !(c as any)._deleted);
      const clean = deduplicateCases(raw);
      setCases(clean);
      try {
        localStorage.setItem('jb_cached_cases', JSON.stringify(clean));
      } catch (_) {}
    };

    const handleDataChanged = (e: any) => {
      if (
        e.detail?.entityType === 'case' || 
        e.detail?.type === 'cases' || 
        e.detail?.type === 'bulk_purge' || 
        e.detail?.type === 'delete'
      ) {
        syncLocal();
      }
    };

    window.addEventListener('jb_data_changed', handleDataChanged);
    window.addEventListener('jb_entity_deleted', handleDataChanged);
    window.addEventListener('jb_entity_restored', handleDataChanged);

    const q = query(collection(db, 'cases'));

    const unsubscribe = onSnapshot(q, (snap) => {
      const remoteList = snap.docs
        .map(d => {
          const data = d.data();
          let createdAt = data.createdAt;
          if (createdAt && typeof (createdAt as any).toDate === 'function') {
            createdAt = (createdAt as any).toDate().toISOString();
          }
          let updatedAt = data.updatedAt;
          if (updatedAt && typeof (updatedAt as any).toDate === 'function') {
            updatedAt = (updatedAt as any).toDate().toISOString();
          }
          return { id: d.id, ...data, createdAt, updatedAt } as CaseItem;
        })
        .filter(c => !c.isDeleted && !(c as any)._deleted);

      const localList = getLocalCases().filter(c => !c.isDeleted && !(c as any)._deleted);

      // Merge local and remote list to guarantee instant display of newly created items
      const mergedMap = new Map<string, CaseItem>();
      for (const item of localList) {
        if (item.id) mergedMap.set(item.id, item);
      }
      for (const item of remoteList) {
        if (item.id) mergedMap.set(item.id, { ...(mergedMap.get(item.id) || {}), ...item });
      }

      const mergedList = Array.from(mergedMap.values()).sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });

      const cleanList = deduplicateCases(mergedList);
      setCases(cleanList);
      try {
        localStorage.setItem('jb_cached_cases', JSON.stringify(cleanList));
      } catch (_) {}
      setLoading(false);
    }, (err) => {
      console.warn('CaseList query fallback:', err);
      syncLocal();
      setLoading(false);
    });

    return () => {
      unsubscribe();
      window.removeEventListener('jb_data_changed', handleDataChanged);
      window.removeEventListener('jb_entity_deleted', handleDataChanged);
      window.removeEventListener('jb_entity_restored', handleDataChanged);
    };
  }, []);

  // Open Edit Modal
  const handleOpenEditModal = (e: React.MouseEvent, caseItem: CaseItem) => {
    e.stopPropagation();
    setEditingCase(caseItem);
    setEditForm({
      title: caseItem.title || '',
      caseNumber: caseItem.caseNumber || '',
      externalNumber: caseItem.externalNumber || '',
      caseType: caseItem.caseType || 'impersonation',
      status: caseItem.status || 'in_progress',
      priority: caseItem.priority || 'medium',
      platform: caseItem.platform || '',
      clientName: caseItem.client?.name || '',
      clientPhone: caseItem.client?.phone || '',
      agreedAmount: caseItem.agreedAmount || 0,
      currency: caseItem.currency || 'SYP',
      description: caseItem.description || '',
      notes: caseItem.notes || '',
      nextFollowUp: caseItem.nextFollowUp || '',
      assignedToUid: caseItem.assignedTo?.uid || ''
    });
    setIsEditModalOpen(true);
  };

  // Save Edit Modal
  const handleSaveEditModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCase) return;

    if (!editForm.title.trim()) {
      showToast(isRTL ? 'يرجى إدخال عنوان القضية' : 'Case title is required', 'error');
      return;
    }

    setSavingEdit(true);

    try {
      const assignedUser = teamMembers.find(u => u.uid === editForm.assignedToUid);
      const assignedToObj = assignedUser ? {
        uid: assignedUser.uid,
        name: assignedUser.displayName,
        email: assignedUser.email
      } : (editingCase.assignedTo || undefined);

      const clientObj = editForm.clientName.trim() ? {
        name: editForm.clientName.trim(),
        phone: editForm.clientPhone.trim()
      } : undefined;

      const updatedCase: CaseItem = {
        ...editingCase,
        title: editForm.title.trim(),
        caseType: editForm.caseType,
        externalNumber: editForm.externalNumber.trim() || undefined,
        status: editForm.status,
        priority: editForm.priority,
        platform: editForm.platform.trim() || undefined,
        client: clientObj,
        agreedAmount: Number(editForm.agreedAmount) || 0,
        currency: editForm.currency,
        description: editForm.description.trim() || undefined,
        notes: editForm.notes.trim() || undefined,
        nextFollowUp: editForm.nextFollowUp || undefined,
        assignedTo: assignedToObj,
        updatedAt: new Date().toISOString()
      };

      // 1. Immediately update React state
      setCases(prev => prev.map(c => c.id === editingCase.id ? updatedCase : c));

      // 2. Save directly to local storage cache
      saveLocalCase(updatedCase);

      // 3. Update Firestore Document (non-blocking background sync)
      try {
        const caseDocRef = doc(db, 'cases', editingCase.id);
        updateDoc(caseDocRef, {
          title: updatedCase.title,
          caseType: updatedCase.caseType,
          externalNumber: updatedCase.externalNumber || null,
          status: updatedCase.status,
          priority: updatedCase.priority,
          platform: updatedCase.platform || null,
          client: updatedCase.client || null,
          agreedAmount: updatedCase.agreedAmount || 0,
          currency: updatedCase.currency,
          description: updatedCase.description || null,
          notes: updatedCase.notes || null,
          nextFollowUp: updatedCase.nextFollowUp || null,
          assignedTo: updatedCase.assignedTo || null,
          updatedAt: serverTimestamp()
        }).catch((dbErr) => {
          console.warn('Firestore update background notice, saved locally:', dbErr);
        });

        // If duplicate docs with same caseNumber exist, update them too
        if (editingCase.caseNumber) {
          const qDup = query(collection(db, 'cases'), where('caseNumber', '==', editingCase.caseNumber));
          getDocs(qDup).then((dupSnap) => {
            dupSnap.forEach((d) => {
              if (d.id !== editingCase.id) {
                updateDoc(doc(db, 'cases', d.id), {
                  title: updatedCase.title,
                  status: updatedCase.status,
                  priority: updatedCase.priority,
                  updatedAt: serverTimestamp()
                }).catch(() => {});
              }
            });
          }).catch(() => {});
        }
      } catch (dbErr) {
        console.warn('Firestore update error, saved locally:', dbErr);
      }

      // 4. Log Audit Event (non-blocking)
      logAuditAndEvent({
        action: 'UPDATE_CASE',
        details: `تعديل تفاصيل القضية ${updatedCase.caseNumber} - ${updatedCase.title}`,
        entityType: 'case',
        caseId: editingCase.id,
        entityTitle: updatedCase.title,
        user: userProfile || { uid: 'user', displayName: 'المستخدم' }
      }).catch(() => {});

      // 5. Broadcast global data changed
      window.dispatchEvent(new CustomEvent('jb_data_changed', { detail: { type: 'cases', entityType: 'case', caseId: editingCase.id } }));

      setIsEditModalOpen(false);
      setEditingCase(null);
      showToast(isRTL ? `تم تحديث بيانات القضية (${updatedCase.caseNumber}) بنجاح` : 'Case updated successfully', 'success');
    } catch (err: any) {
      console.error('Failed to save case edit:', err);
      showToast(isRTL ? 'فشل حفظ التعديلات' : 'Failed to save changes', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  // Trigger Delete Confirmation Modal
  const handleDeleteCase = (e: React.MouseEvent, caseItem: CaseItem) => {
    e.stopPropagation();
    setCaseToDelete(caseItem);
  };

  // Perform Actual Case Deletion
  const handleConfirmDeleteCase = async () => {
    if (!caseToDelete) return;
    const target = caseToDelete;
    setIsDeleting(true);

    try {
      // 1. Immediately remove from React state for zero-latency UI
      setCases(prev => prev.filter(c => 
        c.id !== target.id && 
        (!target.caseNumber || c.caseNumber !== target.caseNumber)
      ));

      // 2. Remove directly from localStorage caches
      removeLocalCase(target.id);
      if (target.caseNumber) {
        removeLocalCase(target.caseNumber);
      }
      try {
        const all = getLocalCases().filter(c => 
          c.id !== target.id && 
          (!target.caseNumber || c.caseNumber !== target.caseNumber)
        );
        localStorage.setItem('jb_cached_cases', JSON.stringify(all));
      } catch (_) {}

      // 3. Call unified deletion service (moves to Recycle Bin) (non-blocking)
      deleteEntity('case', target.id, userProfile, {
        customTitle: `${target.caseNumber || ''} - ${target.title || ''}`,
        reason: 'حذف مباشر من قائمة القضايا'
      }).catch((delErr) => {
        console.warn('deleteEntity notice:', delErr);
      });

      // 4. Delete Firestore Document and any identical duplicates (non-blocking)
      try {
        deleteDoc(doc(db, 'cases', target.id)).catch(() => {});
        if (target.caseNumber) {
          const qDup = query(collection(db, 'cases'), where('caseNumber', '==', target.caseNumber));
          getDocs(qDup).then(dupSnap => {
            dupSnap.forEach((d) => {
              deleteDoc(doc(db, 'cases', d.id)).catch(() => {});
            });
          }).catch(() => {});
        }
      } catch (_) {}

      // 5. Dispatch global UI updates
      window.dispatchEvent(new CustomEvent('jb_entity_deleted', { detail: { entityType: 'case', id: target.id } }));
      window.dispatchEvent(new CustomEvent('jb_data_changed', { detail: { type: 'cases', entityType: 'case', caseId: target.id } }));

      showToast(isRTL ? `تم حذف القضية (${target.caseNumber || ''}) ونقلها لسلة المهملات` : 'Case deleted successfully', 'success');
      setCaseToDelete(null);
    } catch (err) {
      console.error('Delete case error:', err);
      showToast(isRTL ? 'حدث خطأ أثناء الحذف' : 'Error deleting case', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Clean all duplicate cases manually
  const handleCleanDuplicates = () => {
    const raw = getLocalCases().filter(c => !c.isDeleted && !(c as any)._deleted);
    const clean = deduplicateCases(raw);
    setCases(clean);
    localStorage.setItem('jb_cached_cases', JSON.stringify(clean));
    window.dispatchEvent(new CustomEvent('jb_data_changed', { detail: { type: 'cases' } }));
    showToast(isRTL ? 'تم تنظيف القضايا المكررة' : 'Duplicates cleaned');
  };

  // Filter cases
  const filteredCases = cases.filter(item => {
    if (item.isDeleted || (item as any)._deleted) return false;
    // 1. My cases check
    if (myCasesOnly && userProfile && item.assignedTo?.uid !== userProfile.uid) {
      return false;
    }

    // 2. Status Quick Filter
    if (statusFilter !== 'all' && item.status !== statusFilter) {
      return false;
    }

    // 3. Type Quick Filter
    if (typeQuickFilter !== 'all' && item.caseType !== typeQuickFilter) {
      return false;
    }

    // 4. Advanced: Platform
    if (selectedPlatform !== 'all' && item.platform !== selectedPlatform) {
      return false;
    }

    // 5. Advanced: Priority
    if (selectedPriority !== 'all' && item.priority !== selectedPriority) {
      return false;
    }

    // 6. Advanced: Assignee
    if (selectedAssignee !== 'all' && item.assignedTo?.uid !== selectedAssignee) {
      return false;
    }

    // 7. Text Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const numMatch = item.caseNumber?.toLowerCase().includes(q);
      const extMatch = item.externalNumber?.toLowerCase().includes(q);
      const titleMatch = item.title?.toLowerCase().includes(q);
      const clientMatch = item.client?.name?.toLowerCase().includes(q) || item.client?.phone?.includes(q);
      const platformMatch = item.platform?.toLowerCase().includes(q);
      const notesMatch = item.notes?.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q);
      
      return numMatch || extMatch || titleMatch || clientMatch || platformMatch || notesMatch;
    }

    return true;
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-200 relative">
      
      {/* Toast feedback */}
      {toastMessage && (
        <div className={`fixed top-5 end-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-bold animate-in slide-in-from-top-2 duration-200 border ${
          toastMessage.type === 'error' 
            ? 'bg-rose-950 text-rose-200 border-rose-800' 
            : 'bg-emerald-950 text-emerald-200 border-emerald-800'
        }`}>
          {toastMessage.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <span>{myCasesOnly ? t('navMyCases') : t('navCases')}</span>
            <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2.5 py-0.5 rounded-full border border-slate-800">
              {filteredCases.length}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {isRTL ? 'إدارة وتعديل وحذف ومتابعة قضايا الأمن الرقمي وحذف المحتوى واستعادة الحسابات' : 'Manage, edit, delete and track cybersecurity and takedown cases'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleCleanDuplicates}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors cursor-pointer"
            title={isRTL ? 'تنظيف التكرار' : 'Clean Duplicates'}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isRTL ? 'تنظيف التكرار' : 'Clean Dups'}</span>
          </button>

          <button
            onClick={() => onOpenQuickCase()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/20 transition-all cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
            <span>{t('newCase')}</span>
          </button>
        </div>
      </div>

      {/* Search & Quick Filters Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-lg">
        
        {/* Search Input and Filter toggle */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl ps-10 pe-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute top-1/2 -translate-y-1/2 end-3 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
              showAdvanced || selectedPlatform !== 'all' || selectedPriority !== 'all'
                ? 'bg-cyan-950/80 border-cyan-700 text-cyan-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{t('filter')}</span>
          </button>
        </div>

        {/* Status Quick Filters Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'all', label: t('filterAll') },
            { id: 'new', label: t('filterNew') },
            { id: 'in_progress', label: t('filterInProgress') },
            { id: 'pending', label: t('filterPending') },
            { id: 'overdue', label: t('filterOverdue') },
            { id: 'completed', label: t('filterCompleted') },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setStatusFilter(item.id)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === item.id
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-slate-950 border border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Top Case Types Quick Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] pt-1 border-t border-slate-800/60">
          <button
            onClick={() => setTypeQuickFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer ${
              typeQuickFilter === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {isRTL ? 'جميع الأنواع' : 'All Types'}
          </button>
          {[
            { id: 'impersonation', label: isRTL ? 'الانتحال' : 'Impersonation' },
            { id: 'content_removal', label: isRTL ? 'حذف المحتوى' : 'Takedowns' },
            { id: 'infosec', label: isRTL ? 'أمن المعلومات' : 'InfoSec' },
            { id: 'extortion', label: isRTL ? 'الابتزاز' : 'Extortion' },
            { id: 'penetration_testing', label: isRTL ? 'اختبار الاختراق' : 'Pentest' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTypeQuickFilter(item.id)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer ${
                typeQuickFilter === item.id
                  ? 'bg-blue-900/80 text-blue-200 border border-blue-700'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800/50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Advanced Filters Expandable Drawer */}
        {showAdvanced && (
          <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">{t('platform')}</label>
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
              >
                <option value="all">{isRTL ? 'جميع المنصات' : 'All Platforms'}</option>
                {platforms.map(p => (
                  <option key={p.id} value={p.name}>{isRTL ? p.nameAr : p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">{t('priority')}</label>
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
              >
                <option value="all">{isRTL ? 'جميع الأولويات' : 'All Priorities'}</option>
                <option value="urgent">{t('priority_urgent')}</option>
                <option value="high">{t('priority_high')}</option>
                <option value="medium">{t('priority_medium')}</option>
                <option value="low">{t('priority_low')}</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSelectedPlatform('all');
                  setSelectedPriority('all');
                  setSelectedAssignee('all');
                  setStatusFilter('all');
                  setTypeQuickFilter('all');
                  setSearchQuery('');
                }}
                className="w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                {isRTL ? 'إعادة ضبط الفلاتر' : 'Reset Filters'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Case List Display */}
      {loading ? (
        <div className="p-12 text-center">
          <div className="inline-block w-7 h-7 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-slate-400 font-mono">{isRTL ? 'جارٍ تحميل القضايا...' : 'Loading cases...'}</p>
        </div>
      ) : filteredCases.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center space-y-4 max-w-xl mx-auto my-8">
          <div className="w-12 h-12 rounded-2xl bg-cyan-950/70 border border-cyan-800/60 flex items-center justify-center mx-auto text-cyan-400">
            <FolderPlus className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white mb-1">{t('noCasesFound')}</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              {t('noCasesSub')}
            </p>
          </div>
          <button
            onClick={() => onOpenQuickCase()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/20 transition-all cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
            <span>{t('newCase')}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredCases.map((c) => {
            const typeConfig = caseTypes.find(ct => ct.key === c.caseType);

            return (
              <div
                key={c.id}
                onClick={() => onSelectCase(c.id)}
                className="bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 sm:p-4.5 transition-all shadow-md hover:shadow-cyan-950/20 cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-3 group ring-1 ring-transparent hover:ring-cyan-500/10"
              >
                {/* Left Side Info */}
                <div className="flex items-start gap-3.5 overflow-hidden flex-1">
                  {/* Monogram JB Number Block */}
                  <div className="shrink-0">
                    <span className="font-mono text-xs sm:text-sm font-bold text-cyan-400 bg-cyan-950/90 border border-cyan-800/60 px-2.5 py-1.5 rounded-xl inline-block shadow-inner">
                      {c.caseNumber}
                    </span>
                  </div>

                  <div className="space-y-1.5 overflow-hidden flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors truncate max-w-md">
                        {c.title}
                      </h3>
                      {c.externalNumber && (
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {c.externalNumber}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 text-slate-300 font-medium">
                        <Tag className="w-3 h-3 text-cyan-400" />
                        {typeConfig ? (isRTL ? typeConfig.labelAr : typeConfig.labelEn) : c.caseType}
                      </span>

                      {c.platform && (
                        <span className="bg-blue-950/60 text-blue-300 px-2 py-0.5 rounded border border-blue-900/50 font-medium text-[10px]">
                          {c.platform}
                        </span>
                      )}

                      {c.client?.name && (
                        <span className="flex items-center gap-1 text-slate-300 font-medium bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[10px]">
                          <User className="w-2.5 h-2.5 text-cyan-400" />
                          <span>{c.client.name}</span>
                          {c.client.phone && (
                            <span className="text-emerald-400/90 font-mono ms-1" dir="ltr">{c.client.phone}</span>
                          )}
                        </span>
                      )}

                      {c.assignedTo?.name && (
                        <span className="flex items-center gap-1 text-slate-400 text-[10px]">
                          <User className="w-2.5 h-2.5 text-slate-500" />
                          {c.assignedTo.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Side Actions, Status, Cost & Priority */}
                <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2 pt-2.5 lg:pt-0 border-t lg:border-t-0 border-slate-800/60 shrink-0">
                  {/* Cost Badge if set */}
                  {c.agreedAmount !== undefined && c.agreedAmount > 0 && (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-amber-300 bg-amber-950/70 border border-amber-800/60 font-mono shadow-sm">
                      <Coins className="w-3 h-3 text-amber-400" />
                      <span>{c.agreedAmount.toLocaleString()}</span>
                      <span className="text-[10px] text-amber-400/80">
                        {c.currency === 'SYP' ? (isRTL ? 'ل.س' : 'SYP') : '$'}
                      </span>
                    </span>
                  )}

                  {/* Status Pill */}
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    c.status === 'completed' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60' :
                    c.status === 'in_progress' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/60' :
                    c.status === 'pending' ? 'bg-amber-950 text-amber-300 border border-amber-800/60' :
                    c.status === 'overdue' ? 'bg-rose-950 text-rose-300 border border-rose-800/60' :
                    'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}>
                    {t(`status_${c.status}`)}
                  </span>

                  {/* Priority Pill */}
                  <span className={`px-2 py-1 rounded-lg text-[11px] font-bold uppercase ${
                    c.priority === 'urgent' ? 'text-red-400 bg-red-950/80 border border-red-800' :
                    c.priority === 'high' ? 'text-orange-400 bg-orange-950/80 border border-orange-800' :
                    c.priority === 'medium' ? 'text-amber-400 bg-amber-950/80 border border-amber-800' :
                    'text-slate-400 bg-slate-800/80 border border-slate-700'
                  }`}>
                    {t(`priority_${c.priority}`)}
                  </span>

                  {/* Direct Edit Button */}
                  <button
                    type="button"
                    onClick={(e) => handleOpenEditModal(e, c)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-cyan-950/80 border border-slate-700 hover:border-cyan-700 text-slate-300 hover:text-cyan-300 text-xs font-semibold transition-all cursor-pointer shadow-xs"
                    title={isRTL ? 'تعديل بيانات القضية' : 'Edit Case'}
                  >
                    <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{isRTL ? 'تعديل' : 'Edit'}</span>
                  </button>

                  {/* Direct Delete Button */}
                  <button
                    type="button"
                    onClick={(e) => handleDeleteCase(e, c)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-800 text-slate-400 hover:text-rose-300 text-xs font-semibold transition-all cursor-pointer shadow-xs"
                    title={isRTL ? 'حذف القضية ونقلها لسلة المهملات' : 'Delete / Move to Recycle Bin'}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>{isRTL ? 'حذف' : 'Delete'}</span>
                  </button>

                  <div className="text-slate-500 group-hover:text-cyan-400 transition-colors ps-0.5">
                    <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* 🌟 Comprehensive Edit Case Modal 🌟 */}
      {isEditModalOpen && editingCase && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
          onClick={() => setIsEditModalOpen(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span>{isRTL ? 'تعديل بيانات القضية' : 'Edit Case Details'}</span>
                    <span className="font-mono text-xs text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                      {editingCase.caseNumber}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isRTL ? 'قم بتحديث أي تفاصيل أو حقول خاصة بالقضية مع الحفظ المباشر' : 'Update case information, client details and status'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveEditModal} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
              
              {/* Title & External Number */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">
                    {isRTL ? 'عنوان القضية' : 'Case Title'} <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.title}
                    onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-white font-medium focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {isRTL ? 'الرقم المرجعي / الخارجي' : 'External Number'}
                  </label>
                  <input
                    type="text"
                    value={editForm.externalNumber}
                    onChange={(e) => setEditForm(prev => ({ ...prev, externalNumber: e.target.value }))}
                    placeholder="مثال: REF-109"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-white font-mono focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Case Type, Status & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {isRTL ? 'نوع القضية' : 'Case Type'}
                  </label>
                  <select
                    value={editForm.caseType}
                    onChange={(e) => setEditForm(prev => ({ ...prev, caseType: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-white focus:outline-none transition-colors"
                  >
                    {caseTypes.map(ct => (
                      <option key={ct.key} value={ct.key}>
                        {isRTL ? ct.labelAr : ct.labelEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {isRTL ? 'حالة القضية' : 'Status'}
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value as CaseStatus }))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-white focus:outline-none transition-colors"
                  >
                    <option value="new">{t('status_new')}</option>
                    <option value="in_progress">{t('status_in_progress')}</option>
                    <option value="pending">{t('status_pending')}</option>
                    <option value="overdue">{t('status_overdue')}</option>
                    <option value="completed">{t('status_completed')}</option>
                    <option value="cancelled">{t('status_cancelled') || 'ملغاة'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {isRTL ? 'الأولوية' : 'Priority'}
                  </label>
                  <select
                    value={editForm.priority}
                    onChange={(e) => setEditForm(prev => ({ ...prev, priority: e.target.value as CasePriority }))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-white focus:outline-none transition-colors"
                  >
                    <option value="low">{t('priority_low')}</option>
                    <option value="medium">{t('priority_medium')}</option>
                    <option value="high">{t('priority_high')}</option>
                    <option value="urgent">{t('priority_urgent')}</option>
                  </select>
                </div>
              </div>

              {/* Platform & Next Follow-up */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {isRTL ? 'المنصة المستهدفة' : 'Platform'}
                  </label>
                  <input
                    type="text"
                    value={editForm.platform}
                    onChange={(e) => setEditForm(prev => ({ ...prev, platform: e.target.value }))}
                    placeholder={isRTL ? 'فيسبوك، تيك توك، واتساب...' : 'Facebook, TikTok, WhatsApp...'}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-white focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {isRTL ? 'موعد المتابعة القادم' : 'Next Follow-up Date'}
                  </label>
                  <input
                    type="date"
                    value={editForm.nextFollowUp}
                    onChange={(e) => setEditForm(prev => ({ ...prev, nextFollowUp: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-white focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Client Name & Phone Card */}
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-3">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                  <User className="w-3.5 h-3.5" />
                  <span>{isRTL ? 'بيانات العميل' : 'Client Information'}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">{isRTL ? 'اسم العميل' : 'Client Name'}</label>
                    <input
                      type="text"
                      value={editForm.clientName}
                      onChange={(e) => setEditForm(prev => ({ ...prev, clientName: e.target.value }))}
                      placeholder={isRTL ? 'اسم صاحب القضية' : 'Client full name'}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-white focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">{isRTL ? 'رقم الهاتف' : 'Client Phone'}</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={editForm.clientPhone}
                      onChange={(e) => setEditForm(prev => ({ ...prev, clientPhone: e.target.value }))}
                      placeholder="+963 9xx xxx xxx"
                      className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-white font-mono focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Financials: Agreed Cost & Currency */}
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <Coins className="w-3.5 h-3.5" />
                  <span>{isRTL ? 'التكلفة المتفق عليها والمالية' : 'Agreed Amount & Currency'}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">{isRTL ? 'المبلغ المتفق عليه' : 'Agreed Amount'}</label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.agreedAmount}
                      onChange={(e) => setEditForm(prev => ({ ...prev, agreedAmount: Number(e.target.value) || 0 }))}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-white font-mono focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">{isRTL ? 'العملة' : 'Currency'}</label>
                    <select
                      value={editForm.currency}
                      onChange={(e) => setEditForm(prev => ({ ...prev, currency: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-white font-medium focus:outline-none transition-colors"
                    >
                      <option value="SYP">{isRTL ? 'ليرة سورية (SYP)' : 'Syrian Pound (SYP)'}</option>
                      <option value="USD">{isRTL ? 'دولار أمريكي (USD)' : 'US Dollar (USD)'}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Assignee */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {isRTL ? 'الموظف المسؤول' : 'Assigned Employee'}
                </label>
                <select
                  value={editForm.assignedToUid}
                  onChange={(e) => setEditForm(prev => ({ ...prev, assignedToUid: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-white focus:outline-none transition-colors"
                >
                  <option value="">{isRTL ? '— غير معين —' : '— Unassigned —'}</option>
                  {teamMembers.map(u => (
                    <option key={u.uid} value={u.uid}>
                      {u.displayName} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Description / Notes */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {isRTL ? 'الوصف والتفاصيل' : 'Description'}
                </label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={isRTL ? 'وصف القضية والملاحظات التقنية...' : 'Case description and details...'}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl p-3 text-white focus:outline-none transition-colors"
                />
              </div>

              {/* Actions Button in Modal */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors cursor-pointer"
                >
                  {t('cancel') || 'إلغاء'}
                </button>

                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold shadow-lg shadow-cyan-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingEdit ? (isRTL ? 'جارٍ الحفظ...' : 'Saving...') : (t('save') || 'حفظ التعديلات')}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 🗑️ Dedicated Delete Confirmation Modal 🗑️ */}
      {caseToDelete && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => !isDeleting && setCaseToDelete(null)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-950/80 border border-rose-800/80 flex items-center justify-center text-rose-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isRTL ? 'تأكيد نقل القضية لسلة المهملات' : 'Confirm Move to Recycle Bin'}
                  </h3>
                  <span className="font-mono text-xs text-rose-400 font-bold">
                    {caseToDelete.caseNumber}
                  </span>
                </div>
              </div>

              {!isDeleting && (
                <button
                  type="button"
                  onClick={() => setCaseToDelete(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-3.5 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="font-bold text-white text-sm">
                  {caseToDelete.title}
                </div>
                {caseToDelete.client?.name && (
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <User className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{isRTL ? 'العميل:' : 'Client:'}</span>
                    <span className="text-slate-200 font-medium">{caseToDelete.client.name}</span>
                  </div>
                )}
                {caseToDelete.agreedAmount !== undefined && caseToDelete.agreedAmount > 0 && (
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isRTL ? 'المبلغ:' : 'Amount:'}</span>
                    <span className="text-amber-300 font-mono font-bold">
                      {caseToDelete.agreedAmount.toLocaleString()} {caseToDelete.currency}
                    </span>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/30 text-rose-300/90 leading-relaxed space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-rose-300">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{isRTL ? 'معلومات الحذف الآمن:' : 'Safe Deletion Notice:'}</span>
                </div>
                <p>
                  {isRTL 
                    ? 'سيتم نقل القضية وجميع سجلاتها المرتبطة إلى سلة المهملات، مع إمكانية استعادتها لاحقاً أو حذفها نهائياً من قسم سلة المهملات.'
                    : 'The case will be moved to the Recycle Bin. You can restore it or permanently delete it later.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setCaseToDelete(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>

                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDeleteCase}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeleting ? (isRTL ? 'جارٍ الحذف...' : 'Deleting...') : (isRTL ? 'تأكيد الحذف' : 'Confirm Delete')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

