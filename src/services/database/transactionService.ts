import { db } from '../../lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { UserProfile, CaseItem } from '../../types';
import { logAuditAndEvent } from '../../lib/audit';
import { 
  getLocalCases, 
  removeLocalCase, 
  getLocalUsers, 
  removeLocalUser, 
  getLocalAttachments, 
  removeLocalAttachment 
} from '../../lib/offlineStore';
import { 
  DeletableEntityType, 
  getEntityTypeLabelAr, 
  getDeletedItemsStore, 
  removeFromDeletedItemsStore,
  DeletedItemRecord
} from './deleteService';
import { restoreEntity } from './restoreService';

export interface UnifiedTrashItem {
  id: string;
  type: DeletableEntityType;
  title: string;
  subtitle: string;
  deletedAt: string;
  deletedBy: string;
  rawItem?: any;
}

/**
 * Loads all soft-deleted items across the entire local and cloud database.
 */
export function getAllRecycleBinItems(): UnifiedTrashItem[] {
  const list: UnifiedTrashItem[] = [];
  const trackedIds = new Set<string>();

  // 1. Check Cases
  const cases = getLocalCases();
  cases.forEach((c: CaseItem) => {
    if (c.isDeleted || (c as any)._deleted) {
      trackedIds.add(c.id);
      list.push({
        id: c.id,
        type: 'case',
        title: `${c.caseNumber || ''} - ${c.title || ''}`,
        subtitle: `${c.caseType || ''} • ${c.platform || 'عام'} • ${c.client?.name || 'بدون موكل'}`,
        deletedAt: (c as any)._deletedAt || (c as any).updatedAt || new Date().toISOString(),
        deletedBy: (c as any)._deletedByName || 'مستخدم المنظومة',
        rawItem: c
      });
    }
  });

  // 2. Check Users
  const users = getLocalUsers();
  users.forEach((u: any) => {
    if (u.status === 'deleted' || u.isDeleted || u._deleted) {
      trackedIds.add(u.uid || u.id);
      list.push({
        id: u.uid || u.id,
        type: 'user',
        title: `${u.displayName || 'عضو'} (${u.email || ''})`,
        subtitle: `الدور: ${u.role || 'موظف'} • الوظيفة: ${u.jobTitle || 'عضو فريق'}`,
        deletedAt: u._deletedAt || u.updatedAt || new Date().toISOString(),
        deletedBy: u._deletedByName || 'المشرف العام',
        rawItem: u
      });
    }
  });

  // 3. Check Attachments
  const atts = getLocalAttachments();
  atts.forEach((a: any) => {
    if (a.isDeleted || a._deleted) {
      trackedIds.add(a.id);
      list.push({
        id: a.id,
        type: 'attachment',
        title: a.fileName || 'مرفق',
        subtitle: `الحجم: ${(a.fileSize ? (a.fileSize / 1024).toFixed(1) + ' KB' : '')} • النوع: ${a.fileType || ''}`,
        deletedAt: a._deletedAt || a.uploadedAt || new Date().toISOString(),
        deletedBy: a._deletedByName || 'مستخدم المنظومة',
        rawItem: a
      });
    }
  });

  // 4. Check Tasks from localStorage
  const taskKeys = Object.keys(localStorage).filter(k => k.startsWith('jb_tasks_') || k === 'jb_global_tasks');
  taskKeys.forEach(k => {
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        const tasks = JSON.parse(raw);
        tasks.forEach((t: any) => {
          if (t.isDeleted || t._deleted) {
            trackedIds.add(t.id);
            list.push({
              id: t.id,
              type: 'task',
              title: t.title || 'مهمة بدون عنوان',
              subtitle: `الأولوية: ${t.priority || 'عادية'} • الحالة: ${t.status || 'معلقة'}`,
              deletedAt: t._deletedAt || t.createdAt || new Date().toISOString(),
              deletedBy: t._deletedByName || 'مستخدم المنظومة',
              rawItem: t
            });
          }
        });
      }
    } catch (_) {}
  });

  // 5. Check from Deleted Items Registry for any remaining records
  const registeredDeleted = getDeletedItemsStore();
  registeredDeleted.forEach((r: DeletedItemRecord) => {
    if (!trackedIds.has(r.id)) {
      list.push({
        id: r.id,
        type: r.entityType,
        title: r.title || `عنصر (${getEntityTypeLabelAr(r.entityType)})`,
        subtitle: r.reason || `حُذف من قسم ${getEntityTypeLabelAr(r.entityType)}`,
        deletedAt: r.deletedAt,
        deletedBy: r.deletedBy
      });
    }
  });

  // Sort descending by deletion time
  list.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());

  return list;
}

/**
 * Permanently deletes an entity from local database and Firestore.
 */
export async function permanentlyDeleteEntity(
  entityType: DeletableEntityType,
  entityId: string,
  userProfile: UserProfile | null
): Promise<{ success: boolean; messageAr: string }> {
  const isSuperAdmin = userProfile?.role === 'super_admin';
  if (!isSuperAdmin) {
    return {
      success: false,
      messageAr: 'فقط المشرف العام (جعفر بدران) يملك صلاحية الحذف النهائي للملفات والسجلات.'
    };
  }

  // Primary administrator protection
  if (entityType === 'user' && (entityId === 'jaafar-master' || entityId === 'super_admin_jaafar')) {
    return {
      success: false,
      messageAr: 'لا يمكن حذف حساب المشرف العام والمالك للمنظومة نهائياً.'
    };
  }

  try {
    switch (entityType) {
      case 'case': {
        removeLocalCase(entityId);
        try {
          await deleteDoc(doc(db, 'cases', entityId));
        } catch (_) {}
        break;
      }

      case 'user': {
        removeLocalUser(entityId);
        try {
          await deleteDoc(doc(db, 'users', entityId));
        } catch (_) {}
        break;
      }

      case 'document':
      case 'attachment': {
        removeLocalAttachment(entityId);
        try {
          await deleteDoc(doc(db, 'attachments', entityId));
        } catch (_) {}
        break;
      }

      case 'task': {
        const taskKeys = Object.keys(localStorage).filter(k => k.startsWith('jb_tasks_') || k === 'jb_global_tasks');
        taskKeys.forEach(k => {
          try {
            const raw = localStorage.getItem(k);
            if (raw) {
              const tasks = JSON.parse(raw).filter((t: any) => t.id !== entityId);
              localStorage.setItem(k, JSON.stringify(tasks));
            }
          } catch (_) {}
        });
        try {
          await deleteDoc(doc(db, 'tasks', entityId));
        } catch (_) {}
        break;
      }

      case 'project': {
        const projKeys = ['jb_projects', 'jb_local_projects'];
        projKeys.forEach(k => {
          try {
            const raw = localStorage.getItem(k);
            if (raw) {
              const projs = JSON.parse(raw).filter((p: any) => p.id !== entityId);
              localStorage.setItem(k, JSON.stringify(projs));
            }
          } catch (_) {}
        });
        try {
          await deleteDoc(doc(db, 'projects', entityId));
        } catch (_) {}
        break;
      }

      default: {
        try {
          await deleteDoc(doc(db, `${entityType}s`, entityId));
        } catch (_) {
          try {
            await deleteDoc(doc(db, entityType, entityId));
          } catch (_) {}
        }
      }
    }

    removeFromDeletedItemsStore(entityId, entityType);

    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('jb_entity_purged', {
          detail: { entityType, entityId }
        }));
        window.dispatchEvent(new CustomEvent('jb_data_changed', {
          detail: { type: 'purge', entityType, entityId }
        }));
      } catch (_) {}
    }

    if (userProfile) {
      await logAuditAndEvent({
        action: `PERMANENT_PURGE_${entityType.toUpperCase()}`,
        details: `حذف نهائي لا رجعة فيه لـ ${getEntityTypeLabelAr(entityType)} (ID: ${entityId})`,
        entityType: entityType as any,
        entityId,
        user: userProfile
      });
    }

    return {
      success: true,
      messageAr: `تم حذف ${getEntityTypeLabelAr(entityType)} نهائياً من قاعدة البيانات.`
    };
  } catch (error: any) {
    return {
      success: false,
      messageAr: `فشل الحذف النهائي: ${error.message || 'خطأ غير متوقع'}`
    };
  }
}

/**
 * Bulk restore multiple items
 */
export async function bulkRestoreEntities(
  items: Array<{ type: DeletableEntityType; id: string }>,
  userProfile: UserProfile | null
): Promise<{ successCount: number; failCount: number }> {
  let successCount = 0;
  let failCount = 0;

  for (const item of items) {
    const res = await restoreEntity(item.type, item.id, userProfile);
    if (res.success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  return { successCount, failCount };
}

/**
 * Bulk permanent delete
 */
export async function bulkPermanentlyDeleteEntities(
  items: Array<{ type: DeletableEntityType; id: string }>,
  userProfile: UserProfile | null
): Promise<{ successCount: number; failCount: number }> {
  let successCount = 0;
  let failCount = 0;

  for (const item of items) {
    const res = await permanentlyDeleteEntity(item.type, item.id, userProfile);
    if (res.success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  return { successCount, failCount };
}
