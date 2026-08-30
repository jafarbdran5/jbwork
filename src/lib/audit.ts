import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile } from '../types';

export interface AuditParams {
  action: string;
  details?: string;
  entityType: 'case' | 'task' | 'reminder' | 'payment' | 'user' | 'attachment' | 'link' | 'auth' | 'settings' | 'request' | 'external_request' | 'google_sync' | 'finance' | 'employee_allocation' | 'security' | 'inventory' | 'asset' | 'system' | 'section' | 'tab' | 'role' | 'supervisor_ui' | 'support_portal' | 'manual_article';
  entityId?: string;
  entityTitle?: string;
  caseId?: string;
  user?: UserProfile | { uid: string; displayName: string; email?: string; role?: string };
}

export async function logAuditAndEvent(params: AuditParams) {
  try {
    const performedBy = {
      uid: params.user?.uid || 'system',
      name: (params.user as any)?.displayName || (params.user as any)?.name || 'مستخدم النظام',
      email: params.user?.email || '',
      role: params.user?.role || 'employee'
    };

    // 1. Write immutable audit log
    await addDoc(collection(db, 'auditLogs'), {
      action: params.action,
      details: params.details || '',
      entityType: params.entityType,
      entityId: params.entityId || params.caseId || '',
      entityTitle: params.entityTitle || '',
      performedBy,
      timestamp: serverTimestamp(),
    });

    // 2. If tied to a case, write to caseEvents timeline
    if (params.caseId) {
      await addDoc(collection(db, 'caseEvents'), {
        caseId: params.caseId,
        action: params.action,
        title: params.entityTitle || params.action,
        description: params.details || '',
        performedBy: {
          uid: performedBy.uid,
          name: performedBy.name,
        },
        timestamp: serverTimestamp(),
      });
    }
  } catch (error) {
    console.warn('Audit logging failed (may be offline):', error);
  }
}
