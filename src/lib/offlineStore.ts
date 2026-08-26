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
