import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  collection, 
  doc, 
  runTransaction,
  serverTimestamp,
  type Firestore 
} from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
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
  const counterDocRef = doc(db, 'caseCounters', String(year));

  try {
    const nextNumber = await runTransaction(db, async (transaction) => {
      const counterSnap = await transaction.get(counterDocRef);
      let currentNumber = 0;
      if (counterSnap.exists()) {
        currentNumber = counterSnap.data().lastNumber || 0;
      }
      const newNumber = currentNumber + 1;
      transaction.set(counterDocRef, {
        year,
        lastNumber: newNumber,
        updatedAt: serverTimestamp()
      }, { merge: true });
      return newNumber;
    });

    const formattedIndex = String(nextNumber).padStart(6, '0');
    return `JB-${year}-${formattedIndex}`;
  } catch (error) {
    console.error('Error generating atomic case number:', error);
    // Fallback pseudo-atomic generation
    const fallbackRand = Math.floor(100000 + Math.random() * 900000);
    return `JB-${year}-${fallbackRand}`;
  }
}
