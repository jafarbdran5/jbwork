import { db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
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
import { 
  DeletableEntityType, 
  getEntityTypeLabelAr, 
  removeFromDeletedItemsStore 
} from './deleteService';

export interface RestoreResult {
  success: boolean;
  messageAr: string;
  messageEn: string;
  entityType: DeletableEntityType;
  entityId: string;
}

/**
 * Centralized Global Restore Service
 * Restores a soft-deleted entity, marks it active, updates local store,
 * updates Firestore, removes from deletedItems store, and logs audit.
 */
export async function restoreEntity(
  entityType: DeletableEntityType,
  entityId: string,
  userProfile: UserProfile | null
): Promise<RestoreResult> {
  if (!entityId) {
    return {
      success: false,
      messageAr: 'معرف العنصر غير صالح للاستعادة.',
      messageEn: 'Invalid entity ID for restoration.',
      entityType,
      entityId
    };
  }

  const now = new Date().toISOString();
  const restoreFields = {
    _deleted: false,
    isDeleted: false,
    _restoredAt: now,
    _restoredBy: userProfile?.uid || 'system',
    _restoredByName: userProfile?.displayName || 'مستخدم المنظومة',
    _updatedAt: now,
    _syncStatus: 'pending'
  };

  let titleForAudit = entityId;

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
              ...restoreFields,
              updatedAt: now
            };
          }
          return c;
        });

        if (matched) {
          try {
            localStorage.setItem('jb_cached_cases', JSON.stringify(updatedCases));
          } catch (_) {}
        }

        try {
          await setDoc(doc(db, 'cases', entityId), restoreFields, { merge: true });
        } catch (_) {
          try {
            await updateDoc(doc(db, 'cases', entityId), restoreFields);
          } catch (_) {}
        }
        break;
      }

      case 'user': {
        const users = getLocalUsers();
        const target = users.find(u => u.uid === entityId || u.id === entityId);
        if (target) {
          titleForAudit = `${target.displayName} (${target.email})`;
          saveLocalUser({
            ...target,
            ...restoreFields,
            status: 'active',
            isActive: true,
            updatedAt: now
          });
        }
        try {
          await updateDoc(doc(db, 'users', entityId), {
            ...restoreFields,
            status: 'active',
            isActive: true
          });
        } catch (_) {}
        break;
      }

      case 'task': {
        const storageKeys = Object.keys(localStorage).filter(k => k.startsWith('jb_tasks_') || k === 'jb_global_tasks');
        for (const key of storageKeys) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const tasks = JSON.parse(raw);
              const idx = tasks.findIndex((t: any) => t.id === entityId);
              if (idx >= 0) {
                titleForAudit = tasks[idx].title || titleForAudit;
                tasks[idx] = { ...tasks[idx], ...restoreFields };
                localStorage.setItem(key, JSON.stringify(tasks));
              }
            }
          } catch (_) {}
        }
        try {
          await updateDoc(doc(db, 'tasks', entityId), restoreFields);
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
                items[idx] = { ...items[idx], ...restoreFields };
                localStorage.setItem(key, JSON.stringify(items));
              }
            }
          } catch (_) {}
        }
        try {
          await updateDoc(doc(db, 'reminders', entityId), restoreFields);
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
            ...restoreFields as any
          });
        }
        try {
          await updateDoc(doc(db, 'attachments', entityId), restoreFields);
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
                notes[idx] = { ...notes[idx], ...restoreFields };
                localStorage.setItem(key, JSON.stringify(notes));
              }
            }
          } catch (_) {}
        }
        try {
          await updateDoc(doc(db, 'notes', entityId), restoreFields);
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
                finItems[idx] = { ...finItems[idx], ...restoreFields };
                localStorage.setItem(key, JSON.stringify(finItems));
              }
            }
          } catch (_) {}
        }
        try {
          await updateDoc(doc(db, entityType === 'payment' ? 'payments' : entityType === 'expense' ? 'expenses' : 'invoices', entityId), restoreFields);
        } catch (_) {}
        break;
      }

      default: {
        try {
          await updateDoc(doc(db, `${entityType}s`, entityId), restoreFields);
        } catch (_) {}
      }
    }

    // Remove from deletedItems store
    removeFromDeletedItemsStore(entityId, entityType);

    // Dispatch global event for instant UI updates
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('jb_entity_restored', {
          detail: { entityType, entityId, title: titleForAudit }
        }));
        window.dispatchEvent(new CustomEvent('jb_data_changed', {
          detail: { type: 'restore', entityType, entityId }
        }));
      } catch (_) {}
    }

    // Audit log
    if (userProfile) {
      await logAuditAndEvent({
        action: `RESTORE_${entityType.toUpperCase()}`,
        details: `استعادة ${getEntityTypeLabelAr(entityType)} من سلة المهملات: ${titleForAudit}`,
        entityType: entityType as any,
        entityId,
        entityTitle: titleForAudit,
        user: userProfile
      });
    }

    return {
      success: true,
      messageAr: `تمت استعادة ${getEntityTypeLabelAr(entityType)} وإعادته للعمل بنجاح.`,
      messageEn: `${entityType} restored successfully.`,
      entityType,
      entityId
    };
  } catch (error: any) {
    console.error(`Error restoring entity ${entityType}:`, error);
    return {
      success: false,
      messageAr: `فشلت عملية الاستعادة: ${error.message || 'خطأ غير متوقع'}`,
      messageEn: `Restoration failed: ${error.message || 'Unexpected error'}`,
      entityType,
      entityId
    };
  }
}
