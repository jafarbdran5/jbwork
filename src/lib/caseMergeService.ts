import { CaseItem, UserProfile } from '../types';
import { db } from './firebase';
import { doc, updateDoc, serverTimestamp, arrayUnion, addDoc, collection } from 'firebase/firestore';
import { saveLocalCase, getLocalCases } from './offlineStore';
import { logAuditAndEvent } from './audit';

export interface MergeInputData {
  title?: string;
  notes?: string;
  description?: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  platform?: string;
  caseType?: string;
  externalNumber?: string;
  urls?: string[];
  files?: Array<{ name: string; url?: string; base64?: string; size?: number; type?: string }>;
  typeSpecificData?: Record<string, any>;
}

export interface MergeResult {
  success: boolean;
  messageAr: string;
  messageEn: string;
  mergedCase: CaseItem | null;
}

/**
 * Intelligent Case Merge Service
 * Merges newly provided data into an existing case without creating duplicates.
 */
export async function mergeDataIntoExistingCase(
  targetCaseId: string,
  newData: MergeInputData,
  userProfile?: UserProfile | null
): Promise<MergeResult> {
  try {
    const existingCases = getLocalCases();
    const targetCase = existingCases.find(c => c.id === targetCaseId || c.caseNumber === targetCaseId);

    if (!targetCase) {
      return {
        success: false,
        messageAr: 'لم يتم العثور على القضية المستهدفة للدمج',
        messageEn: 'Target case for merge not found',
        mergedCase: null
      };
    }

    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const performerName = userProfile?.displayName || 'المشرف';

    // 1. Build Notes Merge
    const newNotesSection: string[] = [];
    if (newData.title && newData.title.trim() !== targetCase.title) {
      newNotesSection.push(`[عنوان إضافي تم دمجه]: ${newData.title.trim()}`);
    }
    if (newData.notes && newData.notes.trim()) {
      newNotesSection.push(`[ملاحظات جديدة]:\n${newData.notes.trim()}`);
    }
    if (newData.description && newData.description.trim() && newData.description.trim() !== targetCase.description) {
      newNotesSection.push(`[وصف إضافي]:\n${newData.description.trim()}`);
    }
    if (newData.urls && newData.urls.length > 0) {
      newNotesSection.push(`[روابط تم دمجها]:\n${newData.urls.join('\n')}`);
    }

    let updatedNotes = targetCase.notes || '';
    if (newNotesSection.length > 0) {
      const mergeHeader = `\n\n══════════ 🔄 تم دمج بيانات بتاريخ ${formattedDate} بواسطة (${performerName}) ══════════\n`;
      updatedNotes = `${updatedNotes}${mergeHeader}${newNotesSection.join('\n\n')}`.trim();
    }

    // 2. Build Client Updates (Update only missing fields or supplement)
    const updatedClient = {
      ...targetCase.client,
      name: targetCase.client?.name || newData.clientName || '',
      phone: targetCase.client?.phone || newData.clientPhone || '',
      email: targetCase.client?.email || newData.clientEmail || '',
      whatsapp: targetCase.client?.whatsapp || (newData.clientPhone ? newData.clientPhone : '')
    };

    // 3. Build Type Specific Data Updates
    const updatedTypeSpecificData = {
      ...(targetCase.typeSpecificData || {}),
      ...(newData.typeSpecificData || {})
    };

    if (newData.urls && newData.urls.length > 0) {
      const existingUrls = (updatedTypeSpecificData.attachedUrls as string[]) || [];
      const combinedUrls = Array.from(new Set([...existingUrls, ...newData.urls]));
      updatedTypeSpecificData.attachedUrls = combinedUrls;
    }

    // 4. Construct updated case object
    const updatedCase: CaseItem = {
      ...targetCase,
      client: updatedClient,
      notes: updatedNotes,
      typeSpecificData: updatedTypeSpecificData,
      externalNumber: targetCase.externalNumber || newData.externalNumber,
      updatedAt: new Date().toISOString()
    };

    // 5. Update Firestore
    try {
      const caseRef = doc(db, 'cases', targetCase.id);
      await updateDoc(caseRef, {
        client: updatedClient,
        notes: updatedNotes,
        typeSpecificData: updatedTypeSpecificData,
        externalNumber: updatedCase.externalNumber || '',
        updatedAt: serverTimestamp()
      });

      // Register timeline event in Firestore
      await addDoc(collection(db, 'cases', targetCase.id, 'events'), {
        action: 'case_merged',
        title: 'دمج معلومات مع القضية',
        description: `تم دمج معلومات وملاحظات جديدة واردة بواسطة ${performerName}`,
        performedBy: {
          uid: userProfile?.uid || 'system',
          name: performerName
        },
        timestamp: serverTimestamp()
      });
    } catch (fsErr) {
      console.warn('Firestore update during merge failed, updated local cache only:', fsErr);
    }

    // 6. Save in local offline store
    saveLocalCase(updatedCase);

    // 7. Audit log
    await logAuditAndEvent({
      action: 'MERGE_CASE_DATA',
      details: `دمج بيانات وتحديثات في القضية (${targetCase.caseNumber} - ${targetCase.title}) بواسطة ${performerName}`,
      entityType: 'case',
      caseId: targetCase.id,
      entityTitle: targetCase.title,
      user: userProfile || undefined
    });

    // 8. Global Broadcast
    window.dispatchEvent(new CustomEvent('jb_data_changed', { detail: { type: 'cases', caseId: targetCase.id } }));

    return {
      success: true,
      messageAr: `تم دمج المعلومات بنجاح مع القضية (${targetCase.caseNumber})`,
      messageEn: `Information successfully merged with case (${targetCase.caseNumber})`,
      mergedCase: updatedCase
    };
  } catch (error: any) {
    console.error('Error merging case data:', error);
    return {
      success: false,
      messageAr: `حدث خطأ أثناء الدمج: ${error.message || error}`,
      messageEn: `Error during merge: ${error.message || error}`,
      mergedCase: null
    };
  }
}
