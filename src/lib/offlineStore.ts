import { useState, useEffect } from 'react';

export interface LocalAttachmentItem {
  id: string;
  caseId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  dataUrl: string; // base64 preview/storage
  syncStatus: 'local' | 'pending' | 'synced' | 'failed';
  uploadedAt: string;
  uploaderName: string;
  uploaderUid: string;
}

const LOCAL_ATTACHMENT_KEY = 'jb_local_case_attachments';
const DEVICE_TRUST_KEY = 'jb_device_trusted';
const LOCAL_USERS_KEY = 'jb_local_team_members';
const LOCAL_CASES_KEY = 'jb_cached_cases';
const LOCAL_CASE_COUNTER_PREFIX = 'jb_case_counter_';

export function getLocalCases(): any[] {
  try {
    const raw = localStorage.getItem(LOCAL_CASES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function saveLocalCase(caseItem: any) {
  try {
    const current = getLocalCases();
    const existingIndex = current.findIndex((c: any) => c.id === caseItem.id || (c.caseNumber && c.caseNumber === caseItem.caseNumber));
    if (existingIndex >= 0) {
      current[existingIndex] = { ...current[existingIndex], ...caseItem };
    } else {
      current.unshift(caseItem);
    }
    localStorage.setItem(LOCAL_CASES_KEY, JSON.stringify(current));
  } catch (e) {
    console.warn('Failed to save case locally:', e);
  }
}

export function removeLocalCase(id: string) {
  try {
    const current = getLocalCases().filter((c: any) => c.id !== id && c.caseNumber !== id);
    localStorage.setItem(LOCAL_CASES_KEY, JSON.stringify(current));
  } catch (e) {
    console.warn(e);
  }
}

export function getNextSequentialCaseNumber(targetYear?: number): string {
  const year = targetYear || new Date().getFullYear();
  const counterKey = `${LOCAL_CASE_COUNTER_PREFIX}${year}`;
  
  let currentVal = 0;
  try {
    const saved = localStorage.getItem(counterKey);
    if (saved) {
      currentVal = parseInt(saved, 10) || 0;
    }
    
    // Also check existing cached cases to avoid duplicate numbers
    const localCases = getLocalCases();
    const pattern = new RegExp(`^JB-${year}-(\\d+)$`);
    for (const c of localCases) {
      if (c.caseNumber) {
        const match = c.caseNumber.match(pattern);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > currentVal) {
            currentVal = num;
          }
        }
      }
    }

    const nextVal = currentVal + 1;
    localStorage.setItem(counterKey, String(nextVal));
    const formatted = String(nextVal).padStart(6, '0');
    return `JB-${year}-${formatted}`;
  } catch (e) {
    const fallbackRand = Math.floor(100000 + Math.random() * 900000);
    return `JB-${year}-${fallbackRand}`;
  }
}

export function getLocalCaseTasks(caseId: string): any[] {
  try {
    const raw = localStorage.getItem(`jb_tasks_${caseId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveLocalCaseTask(task: any) {
  try {
    const list = getLocalCaseTasks(task.caseId);
    const idx = list.findIndex((t: any) => t.id === task.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...task };
    } else {
      list.unshift(task);
    }
    localStorage.setItem(`jb_tasks_${task.caseId}`, JSON.stringify(list));
  } catch (e) {
    console.warn(e);
  }
}

export function getLocalCaseReminders(caseId: string): any[] {
  try {
    const raw = localStorage.getItem(`jb_reminders_${caseId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveLocalCaseReminder(reminder: any) {
  try {
    const list = getLocalCaseReminders(reminder.caseId);
    const idx = list.findIndex((r: any) => r.id === reminder.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...reminder };
    } else {
      list.unshift(reminder);
    }
    localStorage.setItem(`jb_reminders_${reminder.caseId}`, JSON.stringify(list));
  } catch (e) {
    console.warn(e);
  }
}

export function getLocalCaseLinks(caseId: string): any[] {
  try {
    const raw = localStorage.getItem(`jb_links_${caseId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveLocalCaseLink(link: any) {
  try {
    const list = getLocalCaseLinks(link.caseId);
    const idx = list.findIndex((l: any) => l.id === link.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...link };
    } else {
      list.unshift(link);
    }
    localStorage.setItem(`jb_links_${link.caseId}`, JSON.stringify(list));
  } catch (e) {
    console.warn(e);
  }
}

export function removeLocalCaseLink(caseId: string, linkId: string) {
  try {
    const list = getLocalCaseLinks(caseId).filter((l: any) => l.id !== linkId);
    localStorage.setItem(`jb_links_${caseId}`, JSON.stringify(list));
  } catch (e) {
    console.warn(e);
  }
}

export function getLocalCaseNotes(caseId: string): any[] {
  try {
    const raw = localStorage.getItem(`jb_notes_${caseId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveLocalCaseNote(note: any) {
  try {
    const list = getLocalCaseNotes(note.caseId);
    list.unshift(note);
    localStorage.setItem(`jb_notes_${note.caseId}`, JSON.stringify(list));
  } catch (e) {
    console.warn(e);
  }
}

export function getLocalCasePayments(caseId: string): any[] {
  try {
    const raw = localStorage.getItem(`jb_payments_${caseId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveLocalCasePayment(payment: any) {
  try {
    const list = getLocalCasePayments(payment.caseId);
    list.unshift(payment);
    localStorage.setItem(`jb_payments_${payment.caseId}`, JSON.stringify(list));
  } catch (e) {
    console.warn(e);
  }
}

export function getLocalUsers(): any[] {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function saveLocalUser(user: any) {
  try {
    const current = getLocalUsers();
    const existingIndex = current.findIndex((u: any) => u.uid === user.uid || (u.email && u.email === user.email));
    if (existingIndex >= 0) {
      current[existingIndex] = { ...current[existingIndex], ...user };
    } else {
      current.unshift(user);
    }
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(current));
  } catch (e) {
    console.error('Failed to save user locally:', e);
  }
}

export function removeLocalUser(uid: string) {
  try {
    const current = getLocalUsers().filter((u: any) => u.uid !== uid);
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(current));
  } catch (e) {
    console.error(e);
  }
}

export function getLocalAttachments(caseId?: string): LocalAttachmentItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_ATTACHMENT_KEY);
    if (!raw) return [];
    const list: LocalAttachmentItem[] = JSON.parse(raw);
    if (caseId) {
      return list.filter(item => item.caseId === caseId);
    }
    return list;
  } catch (e) {
    return [];
  }
}

export function saveLocalAttachment(item: LocalAttachmentItem) {
  try {
    const current = getLocalAttachments();
    const existingIndex = current.findIndex(i => i.id === item.id);
    if (existingIndex >= 0) {
      current[existingIndex] = item;
    } else {
      current.unshift(item);
    }
    localStorage.setItem(LOCAL_ATTACHMENT_KEY, JSON.stringify(current));
  } catch (e) {
    console.error('Failed to save attachment locally:', e);
  }
}

export function removeLocalAttachment(id: string) {
  try {
    const current = getLocalAttachments().filter(i => i.id !== id);
    localStorage.setItem(LOCAL_ATTACHMENT_KEY, JSON.stringify(current));
  } catch (e) {
    console.error(e);
  }
}

export function isDeviceTrusted(): boolean {
  return localStorage.getItem(DEVICE_TRUST_KEY) === 'true';
}

export function setDeviceTrusted(trusted: boolean) {
  localStorage.setItem(DEVICE_TRUST_KEY, trusted ? 'true' : 'false');
}

export function clearAllLocalData() {
  localStorage.removeItem(LOCAL_ATTACHMENT_KEY);
  localStorage.removeItem(DEVICE_TRUST_KEY);
  localStorage.removeItem('jb_cached_cases');
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsSyncing(true);
      setTimeout(() => {
        setIsSyncing(false);
        setLastSyncTime(new Date());
      }, 1500);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsSyncing(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerManualSync = () => {
    if (!isOnline) return;
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSyncTime(new Date());
    }, 1200);
  };

  return { isOnline, isSyncing, lastSyncTime, triggerManualSync };
}
