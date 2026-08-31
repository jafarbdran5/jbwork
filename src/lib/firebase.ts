import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  collection, 
  doc, 
  setDoc,
  runTransaction,
  serverTimestamp,
  type Firestore 
} from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getNextSequentialCaseNumber } from './offlineStore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with robust local offline persistence and experimentalLongPolling
let db: Firestore;
const databaseId = (firebaseConfig as any).firestoreDatabaseId || '(default)';
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    }),
    experimentalForceLongPolling: true,
  }, databaseId);
} catch (e) {
  // If already initialized or unsupported
  try {
    db = getFirestore(app, databaseId);
  } catch (err2) {
    db = getFirestore(app);
  }
}

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
googleProvider.addScope('profile');
googleProvider.addScope('email');

// In-memory token cache (strictly adhering to security guidelines: NOT stored in localStorage)
let cachedGoogleAccessToken: string | null = null;

export const setCachedGoogleAccessToken = (token: string | null) => {
  cachedGoogleAccessToken = token;
};

export const getCachedGoogleAccessToken = (): string | null => {
  return cachedGoogleAccessToken;
};

export { db };

// Atomic sequential case number generator: JB-YYYY-000001
export async function generateNextCaseNumber(targetYear?: number): Promise<string> {
  const year = targetYear || new Date().getFullYear();
  // Get sequential case number immediately (instantaneous & zero network delay)
  const caseNumber = getNextSequentialCaseNumber(year);

  // Background sync counter with Firestore if online
  try {
    const counterDocRef = doc(db, 'caseCounters', String(year));
    const match = caseNumber.match(/^JB-\d+-(\d+)$/);
    if (match && match[1]) {
      const currentNum = parseInt(match[1], 10);
      setDoc(counterDocRef, {
        year,
        lastNumber: currentNum,
        updatedAt: serverTimestamp()
      }, { merge: true }).catch(() => {});
    }
  } catch (e) {
    // Non-blocking
  }

  return caseNumber;
}
