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

// Initialize Firestore with robust local offline persistence
let db: Firestore;
const databaseId = (firebaseConfig as any).firestoreDatabaseId || '(default)';
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  }, databaseId);
} catch (e) {
  // If already initialized or unsupported
  db = getFirestore(app, databaseId);
}

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Add Google Workspace requested OAuth scopes
googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
googleProvider.addScope('https://www.googleapis.com/auth/forms.body');
googleProvider.addScope('https://www.googleapis.com/auth/forms.responses.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');

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
