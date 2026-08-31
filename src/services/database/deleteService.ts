import { db } from '../../lib/firebase';
import { doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile } from '../../types';
import { logAuditAndEvent } from '../../lib/audit';
import { 
  getLocalCases, 
  saveLocalCase, 
  getLocalUsers, 
  saveLocalUser, 
  getLocalAttachments, 
  saveLocalAttachment 
} from '../../lib/offlineStore';

export type DeletableEntityType = 
  | 'case'
  | 'user'
  | 'task'
  | 'reminder'
  | 'document'
  | 'attachment'
  | 'note'
  | 'payment'
  | 'expense'
  | 'invoice'
  | 'calendarEvent'
  | 'client'
  | 'project'
  | 'system_file'
  | 'knowledge'
  | 'personal_idea'
  | 'personal_goal'
  | 'personal_note'
  | 'content'
  | 'form';

export interface DeleteResult {
  success: boolean;
  messageAr: string;
  messageEn: string;
  entityType: DeletableEntityType;
  entityId: string;
}

/**
 * Centralized Global Deletion Engine (Soft Delete / Tombstones)
 * Enforces permissions, Super Admin protection, local storage updates,
 * sync queuing, and audit logging.
 */
export async function deleteEntity(
  entityType: DeletableEntityType,
  entityId: string,
  userProfile: UserProfile | null,
  options?: { reason?: string; customTitle?: string }
): Promise<DeleteResult> {
  if (!entityId) {
    return {
      success: false,
      messageAr: 'معرف العنصر غير صالح للحذف.',
      messageEn: 'Invalid entity ID for deletion.',
      entityType,
      entityId
    };
  }

  // Super Admin / Permission check
  const isSuperAdmin = userProfile?.role === 'super_admin';
  const isAdmin = isSuperAdmin || userProfile?.role === 'admin';

  // 1. Protection for Primary Administrator
  if (entityType === 'user') {
    const localUsers = getLocalUsers();
    const targetUser = localUsers.find(u => u.uid === entityId || u.id === entityId || u.email?.toLowerCase() === 'jfrbdran@gmail.com');
    
    if (
      entityId === 'jaafar-master' ||
      entityId === 'super_admin_jaafar' ||
      targetUser?.email?.toLowerCase() === 'jfrbdran@gmail.com' ||
      targetUser?.role === 'super_admin'
    ) {
      return {
        success: false,
        messageAr: 'لا يمكن حذف حساب المشرف العام والمالك للمنظومة (جعفر بدران) تحت أي ظرف.',
        messageEn: 'The Primary Administrator cannot be deleted.',
        entityType,
        entityId
      };
    }

    if (!isSuperAdmin) {
      return {
        success: false,
        messageAr: 'فقط المشرف العام يملك صلاحية حذف أعضاء الفريق.',
        messageEn: 'Only the Super Admin can delete team members.',
        entityType,
        entityId
      };
    }
  }

  const now = new Date().toISOString();
  const tombstoneFields = {
    _deleted: true,
    isDeleted: true, // backward compatibility
    _deletedAt: now,
    _deletedBy: userProfile?.uid || 'system',
    _deletedByName: userProfile?.displayName || 'مستخدم المنظومة',
    _localVersion: Date.now(),
    _updatedAt: now,
    _syncStatus: 'pending'
  };

  let titleForAudit = options?.customTitle || entityId;

  try {
    switch (entityType) {
      case 'case': {
        const cases = getLocalCases();
        let matched = false;
        const updatedCases = cases.map((c: any) => {
          if (c.id === entityId || (c.caseNumber && c.caseNumber === entityId) || (c.caseNumber && entityId.includes(c.caseNumber))) {
            matched = true;
            titleForAudit = `${c.caseNumber || ''} - ${c.title || ''}`.trim() || titleForAudit;
            return {
              ...c,
              ...tombstoneFields,
              updatedAt: now
            };
          }
          return c;
        });

        if (matched) {
          try {
            localStorage.setItem('jb_cached_cases', JSON.stringify(updatedCases));
          } catch (_) {}
        } else {
          // If not directly matched, save tombstone entry to prevent it from ever reviving locally
          try {
            const existing = getLocalCases();
            existing.unshift({
              id: entityId,
              title: options?.customTitle || entityId,
              caseNumber: options?.customTitle?.split(' - ')[0] || entityId,
              ...tombstoneFields,
              updatedAt: now
            });
            localStorage.setItem('jb_cached_cases', JSON.stringify(existing));
          } catch (_) {}
        }

        // Firestore setDoc with merge for guaranteed creation/update (non-blocking)
        try {
          setDoc(doc(db, 'cases', entityId), tombstoneFields, { merge: true }).catch(() => {
            updateDoc(doc(db, 'cases', entityId), tombstoneFields).catch(() => {});
          });
        } catch (_) {}
        break;
      }

      case 'user': {
        const users = getLocalUsers();
        const target = users.find(u => u.uid === entityId || u.id === entityId);
        if (target) {
          titleForAudit = `${target.displayName} (${target.email})`;
          saveLocalUser({
            ...target,
            ...tombstoneFields,
            status: 'deleted',
            isActive: false,
            updatedAt: now
          });
        }
        try {
          updateDoc(doc(db, 'users', entityId), {
            ...tombstoneFields,
            status: 'deleted',
            isActive: false
          }).catch(() => {});
        } catch (_) {}
        break;
      }

      case 'task': {
        // Update local tasks storage
        const storageKeys = Object.keys(localStorage).filter(k => k.startsWith('jb_tasks_') || k === 'jb_global_tasks');
        for (const key of storageKeys) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const tasks = JSON.parse(raw);
              const idx = tasks.findIndex((t: any) => t.id === entityId);
              if (idx >= 0) {
                titleForAudit = tasks[idx].title || titleForAudit;
                tasks[idx] = { ...tasks[idx], ...tombstoneFields };
                localStorage.setItem(key, JSON.stringify(tasks));
              }
            }
          } catch (_) {}
        }
        try {
          updateDoc(doc(db, 'tasks', entityId), tombstoneFields).catch(() => {});
        } catch (_) {}
        break;
      }

      case 'reminder': {
        const reminderKeys = Object.keys(localStorage).filter(k => k.startsWith('jb_reminders_') || k === 'jb_global_reminders');
        for (const key of reminderKeys) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const items = JSON.parse(raw);
              const idx = items.findIndex((r: any) => r.id === entityId);
              if (idx >= 0) {
                titleForAudit = items[idx].title || titleForAudit;
                items[idx] = { ...items[idx], ...tombstoneFields };
                localStorage.setItem(key, JSON.stringify(items));
              }
            }
          } catch (_) {}
        }
        try {
          updateDoc(doc(db, 'reminders', entityId), tombstoneFields).catch(() => {});
        } catch (_) {}
        break;
      }

      case 'document':
      case 'attachment': {
        const atts = getLocalAttachments();
        const found = atts.find(a => a.id === entityId);
        if (found) {
          titleForAudit = found.fileName || titleForAudit;
          saveLocalAttachment({
            ...found,
            ...tombstoneFields as any
          });
        }
        try {
          updateDoc(doc(db, 'attachments', entityId), tombstoneFields).catch(() => {});
        } catch (_) {}
        break;
      }

      case 'note': {
        const noteKeys = Object.keys(localStorage).filter(k => k.startsWith('jb_notes_') || k === 'jb_personal_notes');
        for (const key of noteKeys) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const notes = JSON.parse(raw);
              const idx = notes.findIndex((n: any) => n.id === entityId);
              if (idx >= 0) {
                titleForAudit = notes[idx].title || titleForAudit;
                notes[idx] = { ...notes[idx], ...tombstoneFields };
                localStorage.setItem(key, JSON.stringify(notes));
              }
            }
          } catch (_) {}
        }
        try {
          updateDoc(doc(db, 'notes', entityId), tombstoneFields).catch(() => {});
        } catch (_) {}
        break;
      }

      case 'payment':
      case 'expense':
      case 'invoice': {
        const finKeys = Object.keys(localStorage).filter(k => k.startsWith('jb_payments_') || k === 'jb_case_expenses' || k === 'jb_invoices');
        for (const key of finKeys) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const finItems = JSON.parse(raw);
              const idx = finItems.findIndex((f: any) => f.id === entityId);
              if (idx >= 0) {
                titleForAudit = finItems[idx].title || finItems[idx].description || titleForAudit;
                finItems[idx] = { ...finItems[idx], ...tombstoneFields };
                localStorage.setItem(key, JSON.stringify(finItems));
              }
            }
          } catch (_) {}
        }
        try {
          updateDoc(doc(db, entityType === 'payment' ? 'payments' : entityType === 'expense' ? 'expenses' : 'invoices', entityId), tombstoneFields).catch(() => {});
        } catch (_) {}
        break;
      }

      case 'project': {
        const projKeys = ['jb_projects', 'jb_local_projects'];
        for (const k of projKeys) {
          try {
            const raw = localStorage.getItem(k);
            if (raw) {
              const projs = JSON.parse(raw);
              const idx = projs.findIndex((p: any) => p.id === entityId);
              if (idx >= 0) {
                titleForAudit = projs[idx].title || titleForAudit;
                projs[idx] = { ...projs[idx], ...tombstoneFields };
                localStorage.setItem(k, JSON.stringify(projs));
              }
            }
          } catch (_) {}
        }
        try {
          updateDoc(doc(db, 'projects', entityId), tombstoneFields).catch(() => {});
        } catch (_) {}
        break;
      }

      default: {
        // Generic handling for any other collection
        const colName = entityType.endsWith('s') ? entityType : `${entityType}s`;
        try {
          updateDoc(doc(db, colName, entityId), tombstoneFields).catch(() => {
            updateDoc(doc(db, entityType, entityId), tombstoneFields).catch(() => {});
          });
        } catch (_) {}
        break;
      }
    }

    // Save deletion record in deletedItems store
    saveToDeletedItemsStore({
      id: entityId,
      entityType,
      title: titleForAudit,
      deletedAt: now,
      deletedBy: userProfile?.displayName || 'مستخدم المنظومة',
      deletedByUid: userProfile?.uid || 'unknown',
      reason: options?.reason || ''
    });

    // Dispatch global events for instant UI synchronization across all open views
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('jb_entity_deleted', {
          detail: { entityType, entityId, title: titleForAudit }
        }));
        window.dispatchEvent(new CustomEvent('jb_data_changed', {
          detail: { type: 'delete', entityType, entityId }
        }));
      } catch (_) {}
    }

    // Audit log (non-blocking)
    if (userProfile) {
      logAuditAndEvent({
        action: `DELETE_${entityType.toUpperCase()}`,
        details: `حذف ${getEntityTypeLabelAr(entityType)}: ${titleForAudit}`,
        entityType: entityType as any,
        entityId,
        entityTitle: titleForAudit,
        user: userProfile
      }).catch(() => {});
    }

    return {
      success: true,
      messageAr: `تم نقل ${getEntityTypeLabelAr(entityType)} إلى سلة المهملات بنجاح.`,
      messageEn: `${entityType} moved to Recycle Bin successfully.`,
      entityType,
      entityId
    };
  } catch (error: any) {
    console.error(`Error deleting entity ${entityType}:`, error);
    return {
      success: false,
      messageAr: `فشلت عملية الحذف: ${error.message || 'خطأ غير متوقع'}`,
      messageEn: `Deletion failed: ${error.message || 'Unexpected error'}`,
      entityType,
      entityId
    };
  }
}

const DELETED_ITEMS_KEY = 'jb_global_deleted_items';

export interface DeletedItemRecord {
  id: string;
  entityType: DeletableEntityType;
  title: string;
  deletedAt: string;
  deletedBy: string;
  deletedByUid: string;
  reason?: string;
}

export function getDeletedItemsStore(): DeletedItemRecord[] {
  try {
    const raw = localStorage.getItem(DELETED_ITEMS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

export function saveToDeletedItemsStore(item: DeletedItemRecord) {
  try {
    const current = getDeletedItemsStore();
    const existingIdx = current.findIndex(i => i.id === item.id && i.entityType === item.entityType);
    if (existingIdx >= 0) {
      current[existingIdx] = item;
    } else {
      current.unshift(item);
    }
    localStorage.setItem(DELETED_ITEMS_KEY, JSON.stringify(current));
  } catch (_) {}
}

export function removeFromDeletedItemsStore(entityId: string, entityType?: DeletableEntityType) {
  try {
    const current = getDeletedItemsStore().filter(i => {
      if (entityType) {
        return !(i.id === entityId && i.entityType === entityType);
      }
      return i.id !== entityId;
    });
    localStorage.setItem(DELETED_ITEMS_KEY, JSON.stringify(current));
  } catch (_) {}
}

export function getEntityTypeLabelAr(entityType: DeletableEntityType): string {
  switch (entityType) {
    case 'case': return 'القضية';
    case 'user': return 'عضو الفريق';
    case 'task': return 'المهمة';
    case 'reminder': return 'التذكير';
    case 'document':
    case 'attachment': return 'المستند / المرفق';
    case 'note': return 'الملاحظة';
    case 'payment': return 'الدفعة المالية';
    case 'expense': return 'المصروف';
    case 'invoice': return 'الفاتورة';
    case 'calendarEvent': return 'الموعد / الجلسة';
    case 'client': return 'سجل الموكل';
    case 'project': return 'المشروع';
    case 'system_file': return 'ملف النظام';
    case 'knowledge': return 'دليل المعرفة';
    case 'personal_idea': return 'الفكرة الشخصية';
    case 'personal_goal': return 'الهدف الشخصي';
    case 'personal_note': return 'الملاحظة الشخصية';
    case 'content': return 'مسودة المحتوى';
    case 'form': return 'النموذج';
    default: return 'العنصر';
  }
}
