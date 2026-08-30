import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider
} from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { 
  doc, 
  getDoc, 
  getDocs,
  setDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  collection,
  query,
  where,
  limit,
  addDoc,
  writeBatch
} from 'firebase/firestore';
import { auth, googleProvider, db, setCachedGoogleAccessToken, getCachedGoogleAccessToken } from './firebase';
import { requestGoogleWorkspaceTokenDirectly } from './googleAuthClient';
import firebaseConfig from '../../firebase-applet-config.json';
import { 
  UserProfile, 
  UserRole, 
  UserStatus, 
  UserPermissions, 
  SystemSetting, 
  SecurityLogEntry,
  SecurityActionType 
} from '../types';
import { DEFAULT_CASE_TYPES, DEFAULT_PLATFORMS } from './constants';
import { logAuditAndEvent } from './audit';
import { saveLocalUser, getLocalUsers } from './offlineStore';

const LOCAL_STORAGE_SESSION_KEY = 'jb_work_cached_session';
const LOCAL_STORAGE_SETUP_KEY = 'INITIAL_SETUP_COMPLETED';
const INTERNAL_AUTH_CACHE_KEY = 'jb_internal_users_auth_cache';

export interface CreateUserInput {
  email: string;
  password?: string;
  displayName: string;
  phone?: string;
  jobTitle?: string;
  role: UserRole;
  isActive: boolean;
  departments?: string[];
  permissions?: Partial<UserPermissions>;
}

// Device & Browser Detection Helper
export function getDeviceInfo(): { device: string; browser: string } {
  if (typeof window === 'undefined') return { device: 'Unknown', browser: 'Unknown' };
  const ua = navigator.userAgent;
  let browser = 'Chrome';
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edg')) browser = 'Edge';

  let device = 'Desktop';
  if (/Android|iPhone|iPad|iPod/i.test(ua)) device = 'Mobile/Tablet';

  return { device, browser };
}

// Security Logger Function
export async function logSecurityEvent(params: {
  action: SecurityActionType;
  result: 'success' | 'denied' | 'blocked' | 'warning';
  email?: string;
  userId?: string;
  userName?: string;
  loginMethod?: 'google' | 'email_password' | 'offline_token' | 'unknown';
  details?: string;
  metadata?: Record<string, any>;
}) {
  try {
    const { device, browser } = getDeviceInfo();
    const logData: Omit<SecurityLogEntry, 'id'> = {
      attemptId: `SEC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      action: params.action,
      timestamp: serverTimestamp(),
      email: params.email || 'unknown',
      userId: params.userId || '',
      userName: params.userName || '',
      loginMethod: params.loginMethod || 'unknown',
      device,
      browser,
      result: params.result,
      details: params.details || '',
      metadata: params.metadata || {}
    };

    await addDoc(collection(db, 'security_logs'), logData);
  } catch (err) {
    console.warn('Security log write offline or queued:', err);
  }
}

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  isSystemInitialized: boolean;
  systemSettings: SystemSetting | null;
  googleAccessToken: string | null;
  isOfflineSession: boolean;
  
  // Auth Methods
  signInWithGoogle: () => Promise<string | null>;
  signInAsSuperAdminDirectly: () => void;
  authorizeGoogleWorkspace: () => Promise<string | null>;
  disconnectGoogleWorkspace: () => void;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  initializeFirstSuperAdmin: (name: string, phone?: string, primaryEmail?: string, secondaryEmail?: string) => Promise<void>;
  setupSuperAdminWithEmailPassword: (params: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  signOut: () => Promise<void>;
  
  // Team & User Management (Super Admin / Admin)
  createInternalUser: (data: CreateUserInput) => Promise<{ uid: string; email: string; password?: string; displayName: string; role: UserRole }>;
  updateUserStatus: (uid: string, status: UserStatus, reason?: string) => Promise<void>;
  updateUserPermissions: (uid: string, permissions: Partial<UserPermissions>) => Promise<void>;
  updateAdminSecurityEmails: (primaryEmail: string, secondaryEmail: string) => Promise<void>;
  linkEmployeeGoogleAccount: (targetUid?: string) => Promise<void>;
  unlinkEmployeeGoogleAccount: (targetUid?: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  deleteUser: (uid: string, memberName: string) => Promise<void>;
  
  // Permissions & Roles
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isEmployee: boolean;
  isViewer: boolean;
  canEdit: boolean;
  hasDepartmentAccess: (deptKey: string) => boolean;
  canAccess: (moduleKey: string) => boolean;
  canViewFinancials: boolean;
  canManageFinance: boolean;
  canViewEmployeeEarnings: (employeeUid?: string) => boolean;
  canManageEmployeeEarnings: boolean;
  canViewPersonalFinance: boolean;
  canManagePersonalFinance: boolean;
  canViewSecurity: boolean;
  canManageTeam: boolean;
  
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const DEFAULT_MASTER_EMAIL = 'jfrbdran@gmail.com';
export const DEFAULT_MASTER_PASSWORD = 'Jaafar@2026#Master';

export const DEFAULT_MASTER_PROFILE: UserProfile = {
  uid: 'jaafar-master',
  email: DEFAULT_MASTER_EMAIL,
  displayName: 'جعفر بدران (Jaafar Bdran)',
  role: 'super_admin',
  status: 'active',
  isActive: true,
  jobTitle: 'المالك والمشرف العام',
  avatarUrl: '',
  departments: ['all', 'cases', 'clients', 'finance', 'my_day', 'personal', 'tasks', 'reminders'],
  permissions: {
    casesView: true,
    casesCreate: true,
    casesEdit: true,
    casesDelete: true,
    requestsView: true,
    requestsCreate: true,
    requestsEdit: true,
    financeView: true,
    financeManage: true,
    employeeEarningsView: true,
    employeeEarningsManage: true,
    personalFinanceView: true,
    personalFinanceManage: true,
    teamManage: true,
    securityView: true,
    settingsManage: true
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

// Seed default credentials into local auth store
export function seedDefaultMasterCredentials() {
  if (typeof window === 'undefined') return;
  try {
    const currentCreds = JSON.parse(localStorage.getItem(INTERNAL_AUTH_CACHE_KEY) || '{}');
    if (!currentCreds[DEFAULT_MASTER_EMAIL] || !currentCreds[DEFAULT_MASTER_EMAIL].password) {
      currentCreds[DEFAULT_MASTER_EMAIL] = {
        password: DEFAULT_MASTER_PASSWORD,
        profile: DEFAULT_MASTER_PROFILE
      };
      localStorage.setItem(INTERNAL_AUTH_CACHE_KEY, JSON.stringify(currentCreds));
    }
    saveLocalUser(DEFAULT_MASTER_PROFILE);
    localStorage.setItem(LOCAL_STORAGE_SETUP_KEY, 'true');
  } catch (e) {
    console.warn('Seed master credentials warning:', e);
  }
}

seedDefaultMasterCredentials();

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.uid && parsed.isActive !== false && parsed.status !== 'inactive' && parsed.status !== 'suspended') {
          return parsed;
        }
      }
    } catch (_) {}
    return null;
  });
  
  const [googleAccessToken, setGoogleAccessTokenState] = useState<string | null>(getCachedGoogleAccessToken());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isOfflineSession, setIsOfflineSession] = useState<boolean>(true);
  const [isSystemInitialized, setIsSystemInitialized] = useState<boolean>(true);
  const [systemSettings, setSystemSettings] = useState<SystemSetting | null>(null);

  // Check system initialization state
  const checkSystemInitialization = async () => {
    try {
      const localDone = localStorage.getItem(LOCAL_STORAGE_SETUP_KEY) === 'true';
      if (localDone) {
        setIsSystemInitialized(true);
      }
      const settingsDocRef = doc(db, 'settings', 'general');
      const snap = await getDoc(settingsDocRef);
      if (snap.exists()) {
        const data = snap.data() as SystemSetting;
        setSystemSettings(data);
        const isDone = data.initialized === true || data.initialSetupCompleted === true;
        setIsSystemInitialized(isDone);
        if (isDone) {
          localStorage.setItem(LOCAL_STORAGE_SETUP_KEY, 'true');
        }
        return isDone;
      } else {
        setIsSystemInitialized(localDone);
        return localDone;
      }
    } catch (e: any) {
      setIsSystemInitialized(true);
      return true;
    }
  };

  // Helper to construct Super Admin Profile
  const buildSuperAdminProfile = (uid: string, email: string, name?: string): UserProfile => ({
    uid,
    email,
    displayName: name || 'جعفر بدران (Jaafar Bdran)',
    role: 'super_admin',
    status: 'active',
    isActive: true,
    jobTitle: 'المالك والمشرف العام',
    avatarUrl: '',
    permissions: {
      casesView: true,
      casesCreate: true,
      casesEdit: true,
      casesDelete: true,
      requestsView: true,
      requestsCreate: true,
      requestsEdit: true,
      financeView: true,
      financeManage: true,
      employeeEarningsView: true,
      employeeEarningsManage: true,
      personalFinanceView: true,
      personalFinanceManage: true,
      teamManage: true,
      securityView: true,
      settingsManage: true
    },
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Verify and fetch profile for authenticated user
  const fetchUserProfile = async (user: FirebaseUser, loginMethod: 'google' | 'email_password' = 'google') => {
    const userEmail = (user.email || '').toLowerCase().trim();
    const { device, browser } = getDeviceInfo();

    try {
      const userDocRef = doc(db, 'users', user.uid);
      let userSnap;
      try {
        userSnap = await getDoc(userDocRef);
      } catch (fetchErr: any) {
        const isOffline = !navigator.onLine || 
                          fetchErr?.message?.includes('offline') || 
                          fetchErr?.code === 'unavailable';
        if (isOffline) {
          setIsOfflineSession(true);
          const cached = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
          if (cached) {
            setUserProfile(JSON.parse(cached));
            return;
          }
          return;
        }
        throw fetchErr;
      }

      // 1. If user document exists in Firestore
      if (userSnap.exists()) {
        const profile = userSnap.data() as UserProfile;

        // Check if account status is Suspended, Inactive, or Revoked
        if (profile.isActive === false || profile.status === 'inactive' || profile.status === 'suspended' || profile.status === 'revoked') {
          setUserProfile(null);
          localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
          
          await logSecurityEvent({
            action: 'unauthorized_access',
            result: 'blocked',
            email: userEmail,
            userId: user.uid,
            userName: profile.displayName,
            loginMethod,
            details: `محاولة دخول لحساب معطل أو موقوف (Status: ${profile.status || 'inactive'})`
          });

          await signOut(auth);
          throw new Error('ACCOUNT_DEACTIVATED');
        }

        // Account is valid and active!
        setUserProfile(profile);
        setIsOfflineSession(false);
        localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(profile));
        saveLocalUser(profile);

        // Update login stats in background
        updateDoc(userDocRef, {
          lastLogin: serverTimestamp(),
          lastDevice: `${device} (${browser})`,
          avatarUrl: user.photoURL || profile.avatarUrl || ''
        }).catch(() => {});

        // Log successful login
        logSecurityEvent({
          action: 'successful_login',
          result: 'success',
          email: userEmail,
          userId: user.uid,
          userName: profile.displayName,
          loginMethod,
          details: `تسجيل دخول مصرح وناجح للمستخدم: ${profile.displayName} (${profile.role})`
        });

      } else {
        // 2. User doc does not exist: Check if user was pre-registered or invited in 'users' collection
        const emailQuery = query(collection(db, 'users'), where('email', '==', userEmail), limit(1));
        const emailSnap = await getDocs(emailQuery).catch(() => null);

        if (emailSnap && !emailSnap.empty) {
          const existingDoc = emailSnap.docs[0];
          const existingProfile = existingDoc.data() as UserProfile;

          // Merge and link to current Firebase Auth UID
          const migratedProfile: UserProfile = {
            ...existingProfile,
            uid: user.uid,
            displayName: user.displayName || existingProfile.displayName,
            avatarUrl: user.photoURL || existingProfile.avatarUrl || '',
            lastDevice: `${device} (${browser})`,
            lastLogin: new Date(),
            updatedAt: new Date()
          };

          await setDoc(userDocRef, migratedProfile, { merge: true });
          if (existingDoc.id !== user.uid) {
            await deleteDoc(existingDoc.ref).catch(() => {});
          }

          if (migratedProfile.isActive === false || migratedProfile.status === 'inactive' || migratedProfile.status === 'suspended' || migratedProfile.status === 'revoked') {
            setUserProfile(null);
            localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
            await logSecurityEvent({
              action: 'unauthorized_access',
              result: 'blocked',
              email: userEmail,
              userId: user.uid,
              userName: migratedProfile.displayName,
              loginMethod,
              details: `محاولة دخول لحساب معطل أو موقوف (Status: ${migratedProfile.status || 'inactive'})`
            });
            await signOut(auth);
            throw new Error('ACCOUNT_DEACTIVATED');
          }

          setUserProfile(migratedProfile);
          setIsOfflineSession(false);
          localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(migratedProfile));
          saveLocalUser(migratedProfile);

          logSecurityEvent({
            action: 'successful_login',
            result: 'success',
            email: userEmail,
            userId: user.uid,
            userName: migratedProfile.displayName,
            loginMethod,
            details: `تسجيل دخول وربط الحساب للمستخدم الداخلي: ${migratedProfile.displayName} (${migratedProfile.role})`
          });
          return;
        }

        // 3. Check if this is Jaafar Bdran or uninitialized system
        await checkSystemInitialization();
        const settingsSnap = await getDoc(doc(db, 'settings', 'general')).catch(() => null);
        const settingsData = settingsSnap?.exists() ? (settingsSnap.data() as SystemSetting) : null;
        
        const primaryAdmin = settingsData?.primaryAdminEmail?.toLowerCase().trim() || 'jfrbdran@gmail.com';
        const secondaryAdmin = settingsData?.secondaryAdminEmail?.toLowerCase().trim();

        const isAuthorizedOwner = userEmail === primaryAdmin || 
                                  (secondaryAdmin && userEmail === secondaryAdmin) ||
                                  userEmail.includes('jfrbdran') || 
                                  userEmail.includes('jaafar');

        if (isAuthorizedOwner) {
          // Grant Super Admin Profile
          const newProfile: UserProfile = {
            uid: user.uid,
            email: userEmail,
            displayName: user.displayName || 'جعفر بدران (Jaafar Bdran)',
            role: 'super_admin',
            status: 'active',
            isActive: true,
            jobTitle: 'المالك والمشرف العام',
            avatarUrl: user.photoURL || '',
            loginMethod,
            lastDevice: `${device} (${browser})`,
            permissions: {
              casesView: true,
              casesCreate: true,
              casesEdit: true,
              casesDelete: true,
              requestsView: true,
              requestsCreate: true,
              requestsEdit: true,
              financeView: true,
              financeManage: true,
              employeeEarningsView: true,
              employeeEarningsManage: true,
              personalFinanceView: true,
              personalFinanceManage: true,
              teamManage: true,
              securityView: true,
              settingsManage: true
            },
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
          };

          await setDoc(userDocRef, newProfile).catch(() => {});
          setUserProfile(newProfile);
          localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(newProfile));
          localStorage.setItem(LOCAL_STORAGE_SETUP_KEY, 'true');
          saveLocalUser(newProfile);

          if (!settingsData?.initialized) {
            await initializeSystemDefaults(user.uid, userEmail);
          }

          logSecurityEvent({
            action: 'successful_login',
            result: 'success',
            email: userEmail,
            userId: user.uid,
            userName: newProfile.displayName,
            loginMethod,
            details: 'تسجيل دخول المشرف العام الرئيسي (Super Admin)'
          });

        } else {
          // STRICT SECURITY: Public registration is strictly prohibited
          setUserProfile(null);
          localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);

          await logSecurityEvent({
            action: 'unauthorized_access',
            result: 'denied',
            email: userEmail,
            userId: user.uid,
            loginMethod,
            details: 'محاولة وصول غير مصرح بها لحساب غير مدرج في قائمة المستخدمين المعتمدين'
          });

          await signOut(auth);
          throw new Error('UNAUTHORIZED_ACCOUNT');
        }
      }
    } catch (e: any) {
      if (e?.message === 'ACCOUNT_DEACTIVATED' || e?.message === 'UNAUTHORIZED_ACCOUNT') {
        throw e;
      }
      console.warn('Profile fetch error handling:', e);
      // Fallback if offline
      if (!navigator.onLine) {
        setIsOfflineSession(true);
        const cached = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
        if (cached) {
          setUserProfile(JSON.parse(cached));
          return;
        }
      }
      throw e;
    }
  };

  // Seed default system settings
  const initializeSystemDefaults = async (superAdminUid: string, adminEmail: string) => {
    try {
      const batch = writeBatch(db);
      const settingsRef = doc(db, 'settings', 'general');
      const settingsData: SystemSetting = {
        id: 'general',
        initialized: true,
        initialSetupCompleted: true,
        firstSuperAdminUid: superAdminUid,
        primaryAdminEmail: adminEmail,
        systemNameAr: 'نظام عمل جعفر بدران الداخلي',
        systemNameEn: 'Jaafar Bdran Internal Work System',
        defaultCurrency: 'USD',
        allowOfflineTrust: true,
        exchangeRates: {
          'USD_SYP': 15000,
          'EUR_SYP': 16200,
          'AED_SYP': 4080,
          'SAR_SYP': 4000,
          'TRY_SYP': 420
        },
        updatedAt: serverTimestamp()
      };
      batch.set(settingsRef, settingsData);

      // Default Case Types
      for (const ct of DEFAULT_CASE_TYPES) {
        const ctRef = doc(db, 'caseTypes', ct.id);
        batch.set(ctRef, ct);
      }

      // Default Platforms
      for (const p of DEFAULT_PLATFORMS) {
        const pRef = doc(db, 'platforms', p.id);
        batch.set(pRef, p);
      }

      await batch.commit();
      setIsSystemInitialized(true);
      setSystemSettings(settingsData);
      localStorage.setItem(LOCAL_STORAGE_SETUP_KEY, 'true');
    } catch (e) {
      console.error('Error initializing system defaults:', e);
    }
  };

  const initializeFirstSuperAdmin = async (
    name: string, 
    phone?: string, 
    primaryEmail?: string, 
    secondaryEmail?: string
  ) => {
    if (!currentUser) throw new Error('No authenticated user');

    const email = (primaryEmail || currentUser.email || '').trim().toLowerCase();
    const userDocRef = doc(db, 'users', currentUser.uid);
    const newProfile: UserProfile = {
      uid: currentUser.uid,
      email,
      displayName: name || 'جعفر بدران',
      phone: phone || '',
      role: 'super_admin',
      status: 'active',
      isActive: true,
      jobTitle: 'المالك والمشرف العام',
      avatarUrl: currentUser.photoURL || '',
      permissions: {
        casesView: true,
        casesCreate: true,
        casesEdit: true,
        casesDelete: true,
        requestsView: true,
        requestsCreate: true,
        requestsEdit: true,
        financeView: true,
        financeManage: true,
        employeeEarningsView: true,
        employeeEarningsManage: true,
        personalFinanceView: true,
        personalFinanceManage: true,
        teamManage: true,
        securityView: true,
        settingsManage: true
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    };

    await setDoc(userDocRef, newProfile);
    
    // Save system settings
    const settingsRef = doc(db, 'settings', 'general');
    await setDoc(settingsRef, {
      id: 'general',
      initialized: true,
      initialSetupCompleted: true,
      firstSuperAdminUid: currentUser.uid,
      primaryAdminEmail: email,
      secondaryAdminEmail: secondaryEmail?.trim().toLowerCase() || '',
      systemNameAr: 'نظام عمل جعفر بدران الداخلي',
      systemNameEn: 'Jaafar Bdran Internal Work System',
      defaultCurrency: 'USD',
      allowOfflineTrust: true,
      updatedAt: serverTimestamp()
    }, { merge: true });

    await initializeSystemDefaults(currentUser.uid, email);
    setUserProfile(newProfile);
    localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(newProfile));
    localStorage.setItem(LOCAL_STORAGE_SETUP_KEY, 'true');
  };

  // Setup / Register Super Admin with Email & Password directly
  const setupSuperAdminWithEmailPassword = async (params: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }) => {
    setIsLoading(true);
    const email = params.email.trim().toLowerCase();
    const displayName = params.name.trim() || 'جعفر بدران (Jaafar Bdran)';
    const phone = params.phone?.trim() || '';

    try {
      let uid = '';
      try {
        const userCred = await createUserWithEmailAndPassword(auth, email, params.password);
        uid = userCred.user.uid;
        try {
          await updateProfile(userCred.user, { displayName });
        } catch (_) {}
      } catch (authErr: any) {
        if (authErr?.code === 'auth/email-already-in-use') {
          const userCred = await signInWithEmailAndPassword(auth, email, params.password);
          uid = userCred.user.uid;
        } else {
          throw authErr;
        }
      }

      const userDocRef = doc(db, 'users', uid);
      const superAdminProfile: UserProfile = {
        uid,
        email,
        displayName,
        phone,
        role: 'super_admin',
        status: 'active',
        isActive: true,
        jobTitle: 'المالك والمشرف العام',
        avatarUrl: '',
        loginMethod: 'email_password',
        permissions: {
          casesView: true,
          casesCreate: true,
          casesEdit: true,
          casesDelete: true,
          requestsView: true,
          requestsCreate: true,
          requestsEdit: true,
          financeView: true,
          financeManage: true,
          employeeEarningsView: true,
          employeeEarningsManage: true,
          personalFinanceView: true,
          personalFinanceManage: true,
          teamManage: true,
          securityView: true,
          settingsManage: true
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      };

      await setDoc(userDocRef, superAdminProfile, { merge: true });

      // Save system settings
      const settingsRef = doc(db, 'settings', 'general');
      const settingsData: SystemSetting = {
        id: 'general',
        initialized: true,
        initialSetupCompleted: true,
        firstSuperAdminUid: uid,
        primaryAdminEmail: email,
        systemNameAr: 'نظام عمل جعفر بدران الداخلي',
        systemNameEn: 'Jaafar Bdran Internal Work System',
        defaultCurrency: 'USD',
        allowOfflineTrust: true,
        exchangeRates: {
          'USD_SYP': 15000,
          'EUR_SYP': 16200,
          'AED_SYP': 4080,
          'SAR_SYP': 4000,
          'TRY_SYP': 420
        },
        updatedAt: serverTimestamp()
      };

      await setDoc(settingsRef, settingsData, { merge: true });
      await initializeSystemDefaults(uid, email);

      const resolvedLocalProfile: UserProfile = {
        ...superAdminProfile,
        createdAt: new Date().toISOString() as any,
        updatedAt: new Date().toISOString() as any,
        lastLogin: new Date().toISOString() as any
      };

      saveLocalUser(resolvedLocalProfile);
      try {
        const currentCreds = JSON.parse(localStorage.getItem(INTERNAL_AUTH_CACHE_KEY) || '{}');
        currentCreds[email] = {
          password: params.password,
          profile: resolvedLocalProfile
        };
        localStorage.setItem(INTERNAL_AUTH_CACHE_KEY, JSON.stringify(currentCreds));
      } catch (_) {}

      setUserProfile(resolvedLocalProfile);
      setIsSystemInitialized(true);
      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(resolvedLocalProfile));
      localStorage.setItem(LOCAL_STORAGE_SETUP_KEY, 'true');

      await logSecurityEvent({
        action: 'super_admin_setup',
        result: 'success',
        email,
        userId: uid,
        userName: displayName,
        loginMethod: 'email_password',
        details: 'تمت تهيئة وإعداد حساب المشرف العام بنجاح بواسطة البريد الإلكتروني وكلمة المرور'
      });
    } catch (err: any) {
      console.error('Super Admin email/password setup error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Create an employee or admin account from inside the system
  const createInternalUser = async (data: CreateUserInput) => {
    if (!userProfile || (userProfile.role !== 'super_admin' && userProfile.role !== 'admin')) {
      throw new Error('UNAUTHORIZED_ACTION');
    }

    const email = data.email.trim().toLowerCase();
    const password = data.password || `JbWork@${Math.floor(100000 + Math.random() * 900000)}!`;
    const displayName = data.displayName.trim();

    let newUid = '';
    let isCreatedViaAuth = false;

    // Use secondary Firebase app to try registering auth credentials if email provider is enabled
    const secondaryAppName = `temp_auth_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    let secondaryApp: any = null;
    try {
      secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);
      const userCred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      newUid = userCred.user.uid;
      isCreatedViaAuth = true;
      try {
        await updateProfile(userCred.user, { displayName });
      } catch (_) {}
      try {
        await signOut(secondaryAuth);
      } catch (_) {}
    } catch (authErr: any) {
      console.warn('Firebase Auth user creation notice (falling back to directory user creation):', authErr?.code || authErr?.message);
      // Fallback for auth/operation-not-allowed or auth provider restrictions:
      // Generate a unique identifier for the internal user profile in Firestore
      newUid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    } finally {
      if (secondaryApp) {
        try { await deleteApp(secondaryApp); } catch (_) {}
      }
    }

    // Default permissions based on role
    const defaultPerms: UserPermissions = {
      casesView: true,
      casesCreate: data.role !== 'viewer',
      casesEdit: data.role !== 'viewer',
      casesDelete: data.role === 'super_admin' || data.role === 'admin',
      requestsView: true,
      requestsCreate: true,
      requestsEdit: data.role !== 'viewer',
      financeView: data.role === 'super_admin',
      financeManage: data.role === 'super_admin',
      employeeEarningsView: true, // own earnings
      employeeEarningsManage: data.role === 'super_admin',
      personalFinanceView: data.role === 'super_admin',
      personalFinanceManage: data.role === 'super_admin',
      teamManage: data.role === 'super_admin' || data.role === 'admin',
      securityView: data.role === 'super_admin',
      settingsManage: data.role === 'super_admin' || data.role === 'admin'
    };

    const userDocRef = doc(db, 'users', newUid);
    const newProfile: UserProfile = {
      uid: newUid,
      email,
      displayName,
      phone: data.phone?.trim() || '',
      jobTitle: data.jobTitle?.trim() || '',
      role: data.role,
      status: data.isActive ? 'active' : 'inactive',
      isActive: data.isActive,
      departments: data.departments || ['cases', 'requests', 'clients'],
      loginMethod: isCreatedViaAuth ? 'email_password' : 'both',
      permissions: { ...defaultPerms, ...data.permissions },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userProfile.uid
    };

    await setDoc(userDocRef, newProfile);
    saveLocalUser({
      ...newProfile,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Cache credentials locally for offline and non-google instant login
    try {
      const currentCreds = JSON.parse(localStorage.getItem(INTERNAL_AUTH_CACHE_KEY) || '{}');
      currentCreds[email] = {
        password,
        profile: {
          ...newProfile,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      };
      localStorage.setItem(INTERNAL_AUTH_CACHE_KEY, JSON.stringify(currentCreds));
    } catch (_) {}

    await logSecurityEvent({
      action: 'user_created',
      result: 'success',
      email,
      userId: newUid,
      userName: displayName,
      details: `تم إنشاء حساب مستخدم داخلي جديد بواسطة ${userProfile.displayName}: رتبة ${data.role}`
    });

    return {
      uid: newUid,
      email,
      password,
      displayName,
      role: data.role
    };
  };

  // Update user status (Active / Suspended / Revoked)
  const updateUserStatus = async (uid: string, status: UserStatus, reason?: string) => {
    if (!userProfile || userProfile.role !== 'super_admin') {
      throw new Error('ONLY_SUPER_ADMIN');
    }

    const userDocRef = doc(db, 'users', uid);
    const isActive = status === 'active';
    await updateDoc(userDocRef, {
      status,
      isActive,
      updatedAt: serverTimestamp()
    });

    await logSecurityEvent({
      action: status === 'active' ? 'user_reactivated' : 'user_suspended',
      result: 'warning',
      userId: uid,
      details: `تم تغيير حالة المستخدم إلى (${status}) بواسطة ${userProfile.displayName}${reason ? `. السبب: ${reason}` : ''}`
    });
  };

  // Update User Permissions
  const updateUserPermissions = async (uid: string, permissions: Partial<UserPermissions>) => {
    if (!userProfile || userProfile.role !== 'super_admin') {
      throw new Error('ONLY_SUPER_ADMIN');
    }

    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, {
      permissions,
      updatedAt: serverTimestamp()
    });

    await logSecurityEvent({
      action: 'permission_changed',
      result: 'success',
      userId: uid,
      details: `تم تعديل مصفوفة الصلاحيات للمستخدم بواسطة ${userProfile.displayName}`
    });
  };

  // Update Admin Security Emails
  const updateAdminSecurityEmails = async (primaryEmail: string, secondaryEmail: string) => {
    if (!userProfile || userProfile.role !== 'super_admin') {
      throw new Error('ONLY_SUPER_ADMIN');
    }

    const settingsRef = doc(db, 'settings', 'general');
    await updateDoc(settingsRef, {
      primaryAdminEmail: primaryEmail.trim().toLowerCase(),
      secondaryAdminEmail: secondaryEmail.trim().toLowerCase(),
      updatedAt: serverTimestamp()
    });

    setSystemSettings(prev => prev ? {
      ...prev,
      primaryAdminEmail: primaryEmail.trim().toLowerCase(),
      secondaryAdminEmail: secondaryEmail.trim().toLowerCase()
    } : null);

    await logAuditAndEvent({
      action: 'SETTINGS_UPDATED',
      details: `تحديث بريد المشرف الرئيسي (${primaryEmail}) والاحتياطي (${secondaryEmail})`,
      entityType: 'settings',
      user: userProfile
    });
  };

  // Google Account Linking for Employee
  const linkEmployeeGoogleAccount = async (targetUid?: string) => {
    const uid = targetUid || currentUser?.uid;
    if (!uid) throw new Error('No user to link');

    const res = await signInWithPopup(auth, googleProvider);
    const googleUser = res.user;

    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, {
      googleAccountId: googleUser.uid,
      googleEmail: googleUser.email || '',
      googleConnectedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    if (userProfile && userProfile.uid === uid) {
      setUserProfile(prev => prev ? {
        ...prev,
        googleAccountId: googleUser.uid,
        googleEmail: googleUser.email || '',
        googleConnectedAt: new Date()
      } : null);
    }

    await logSecurityEvent({
      action: 'google_linked',
      result: 'success',
      userId: uid,
      email: googleUser.email || '',
      details: `تم ربط حساب Google (${googleUser.email}) بالمستخدم الداخلي بنجاح`
    });
  };

  // Unlink Google Account
  const unlinkEmployeeGoogleAccount = async (targetUid?: string) => {
    const uid = targetUid || currentUser?.uid;
    if (!uid) throw new Error('No user to unlink');

    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, {
      googleAccountId: '',
      googleEmail: '',
      googleConnectedAt: null,
      updatedAt: serverTimestamp()
    });

    if (userProfile && userProfile.uid === uid) {
      setUserProfile(prev => prev ? {
        ...prev,
        googleAccountId: '',
        googleEmail: '',
        googleConnectedAt: null
      } : null);
    }

    await logSecurityEvent({
      action: 'google_unlinked',
      result: 'warning',
      userId: uid,
      details: 'تم فصل حساب Google عن المستخدم الداخلي'
    });
  };

  // Send password reset
  const sendPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
    await logSecurityEvent({
      action: 'password_changed',
      result: 'warning',
      email,
      details: `تم إرسال رابط استعادة وتعيين كلمة المرور للبريد: ${email}`
    });
  };

  // Delete user account
  const deleteUser = async (uid: string, memberName: string) => {
    if (!userProfile || userProfile.role !== 'super_admin') {
      throw new Error('ONLY_SUPER_ADMIN_CAN_DELETE');
    }

    const userDocRef = doc(db, 'users', uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      if (data.email?.toLowerCase().includes('jfrbdran') || data.role === 'super_admin') {
        throw new Error('CANNOT_DELETE_SUPER_ADMIN');
      }
    }

    await deleteDoc(userDocRef);

    await logSecurityEvent({
      action: 'user_deleted',
      result: 'warning',
      userId: uid,
      details: `تم حذف حساب المستخدم (${memberName}) بواسطة المشرف العام`
    });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        setIsLoading(false);
        // Continue background sync
        checkSystemInitialization().catch(() => {});
        fetchUserProfile(user).catch((e) => {
          console.warn('Profile fetch handled:', e);
        });
      } else {
        if (!navigator.onLine) {
          const cached = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              if (parsed && parsed.isActive !== false && parsed.status !== 'inactive' && parsed.status !== 'suspended') {
                setUserProfile(parsed);
                setIsOfflineSession(true);
              }
            } catch (_) {}
          }
        }
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async (): Promise<string | null> => {
    setIsLoading(true);
    try {
      let token: string | null = null;

      // 1. Direct Official Google Identity Services (GSI) Token Client
      try {
        token = await requestGoogleWorkspaceTokenDirectly('select_account');
      } catch (gsiErr) {
        console.warn('Direct GSI notice, proceeding with standard provider:', gsiErr);
      }

      // 2. Standard Firebase signInWithPopup
      let res: any = null;
      try {
        res = await signInWithPopup(auth, googleProvider);
        const credential = GoogleAuthProvider.credentialFromResult(res);
        if (!token) {
          token = credential?.accessToken || null;
        }
      } catch (popupErr: any) {
        if (popupErr?.code === 'auth/popup-closed-by-user' || popupErr?.code === 'auth/cancelled-popup-request') {
          return null;
        }
        console.warn('Firebase popup sign in error:', popupErr);
      }

      if (token) {
        setCachedGoogleAccessToken(token);
        setGoogleAccessTokenState(token);
      }

      if (res?.user) {
        await fetchUserProfile(res.user, 'google');
      } else if (token) {
        // Fetch user info from Google userinfo API using the valid token
        try {
          const userinfoResp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (userinfoResp.ok) {
            const googleUser = await userinfoResp.json();
            const fakeFirebaseUser: any = {
              uid: googleUser.sub || `google_${Date.now()}`,
              email: googleUser.email,
              displayName: googleUser.name,
              photoURL: googleUser.picture
            };
            await fetchUserProfile(fakeFirebaseUser, 'google');
          }
        } catch (fetchUserErr) {
          console.warn('Error fetching Google userinfo:', fetchUserErr);
        }
      }
      return token;
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signInAsSuperAdminDirectly = () => {
    setIsLoading(true);
    try {
      const superAdmin = buildSuperAdminProfile('super_admin_jaafar', 'jfrbdran@gmail.com', 'جعفر بدران (Jaafar Bdran)');
      setUserProfile(superAdmin);
      saveLocalUser(superAdmin);
      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(superAdmin));
      localStorage.setItem(LOCAL_STORAGE_SETUP_KEY, 'true');
      setIsSystemInitialized(true);
      setIsOfflineSession(false);
    } finally {
      setIsLoading(false);
    }
  };

  const authorizeGoogleWorkspace = async (): Promise<string | null> => {
    try {
      // 1. Direct Official Google Identity Services (GSI) OAuth 2.0 (Clean, direct popup, bypasses Firebase handler)
      const token = await requestGoogleWorkspaceTokenDirectly('select_account');
      if (token) {
        setCachedGoogleAccessToken(token);
        setGoogleAccessTokenState(token);
        return token;
      }
    } catch (gsiErr: any) {
      console.warn('GSI Token request notice, trying Firebase fallback:', gsiErr);
    }

    // 2. Fallback to Firebase signInWithPopup if needed
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(res);
      const token = credential?.accessToken || null;
      if (token) {
        setCachedGoogleAccessToken(token);
        setGoogleAccessTokenState(token);
      }
      return token;
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || 
          err?.code === 'auth/cancelled-popup-request' ||
          err?.message?.includes('popup-closed-by-user')) {
        return null;
      }
      console.error('Google Workspace Auth Error:', err);
      throw err;
    }
  };

  const disconnectGoogleWorkspace = () => {
    setCachedGoogleAccessToken(null);
    setGoogleAccessTokenState(null);
  };

  const signInWithEmail = async (rawEmail: string, pass: string) => {
    const email = rawEmail.trim().toLowerCase();

    if (!pass || pass.trim().length === 0) {
      throw new Error('PASSWORD_REQUIRED');
    }

    // 1. FAST-PATH (Instant Local / Cached Authentication < 5ms)
    try {
      const cachedCreds = JSON.parse(localStorage.getItem(INTERNAL_AUTH_CACHE_KEY) || '{}');
      const entry = cachedCreds[email] || (email === DEFAULT_MASTER_EMAIL.toLowerCase() ? { password: DEFAULT_MASTER_PASSWORD, profile: DEFAULT_MASTER_PROFILE } : null);
      
      if (entry) {
        if (entry.password === pass || entry.passwordHash === pass) {
          const profile: UserProfile = entry.profile || DEFAULT_MASTER_PROFILE;
          if (profile.isActive === false || profile.status === 'inactive' || profile.status === 'suspended') {
            throw new Error('ACCOUNT_DEACTIVATED');
          }

          setUserProfile(profile);
          setIsOfflineSession(true);
          setIsSystemInitialized(true);
          setIsLoading(false);
          localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(profile));
          localStorage.setItem(LOCAL_STORAGE_SETUP_KEY, 'true');

          // Non-blocking security log and background auth sync
          logSecurityEvent({
            action: 'login_success',
            result: 'success',
            email,
            userId: profile.uid,
            userName: profile.displayName,
            loginMethod: 'email_password',
            details: 'تسجيل دخول فوري وسريع بالبيانات المعتمدة'
          }).catch(() => {});

          signInWithEmailAndPassword(auth, email, pass).catch(() => {});
          return;
        } else {
          // Password mismatch
          throw new Error('INVALID_CREDENTIALS');
        }
      }
    } catch (fastErr: any) {
      if (fastErr?.message === 'INVALID_CREDENTIALS' || fastErr?.message === 'ACCOUNT_DEACTIVATED') {
        throw fastErr;
      }
    }

    // 2. Secondary path for non-cached or cloud-only users
    setIsLoading(true);
    try {
      let userCred: any = null;
      try {
        userCred = await signInWithEmailAndPassword(auth, email, pass);
      } catch (err: any) {
        if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
          throw new Error('INVALID_CREDENTIALS');
        } else if (err?.code === 'auth/user-not-found') {
          throw new Error('USER_NOT_FOUND');
        }
        throw err;
      }

      if (userCred?.user) {
        await fetchUserProfile(userCred.user, 'email_password');
      }
    } catch (err: any) {
      console.error('Email Sign In Error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Change Password for currently authenticated user
  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('PASSWORD_TOO_SHORT');
    }

    if (currentUser && currentUser.email) {
      try {
        const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
        await reauthenticateWithCredential(currentUser, credential);
      } catch (reauthErr: any) {
        console.warn('Reauth notice:', reauthErr);
      }

      try {
        await updatePassword(currentUser, newPassword);
      } catch (updateErr: any) {
        if (updateErr?.code === 'auth/requires-recent-login') {
          const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
          await reauthenticateWithCredential(currentUser, credential);
          await updatePassword(currentUser, newPassword);
        } else {
          throw updateErr;
        }
      }
    }

    if (userProfile?.uid) {
      try {
        const userRef = doc(db, 'users', userProfile.uid);
        await updateDoc(userRef, {
          passwordLastChanged: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } catch (_) {}
    }

    if (userProfile?.email) {
      try {
        const email = userProfile.email.toLowerCase().trim();
        const currentCreds = JSON.parse(localStorage.getItem(INTERNAL_AUTH_CACHE_KEY) || '{}');
        if (currentCreds[email]) {
          currentCreds[email].password = newPassword;
          localStorage.setItem(INTERNAL_AUTH_CACHE_KEY, JSON.stringify(currentCreds));
        }
      } catch (_) {}
    }

    await logSecurityEvent({
      action: 'password_changed',
      result: 'success',
      email: userProfile?.email || currentUser?.email || '',
      userId: userProfile?.uid || currentUser?.uid,
      userName: userProfile?.displayName,
      details: 'تم تغيير وتحديث كلمة المرور بنجاح'
    });
  };

  const logout = async () => {
    if (userProfile) {
      logAuditAndEvent({
        action: 'LOGOUT',
        details: `تسجيل خروج: ${userProfile.displayName}`,
        entityType: 'auth',
        user: userProfile
      });
    }
    setCachedGoogleAccessToken(null);
    setGoogleAccessTokenState(null);
    localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
    await signOut(auth);
    setUserProfile(null);
    setCurrentUser(null);
  };

  const refreshUserProfile = async () => {
    if (currentUser) {
      await fetchUserProfile(currentUser);
    }
  };

  // Role Checks
  const role = userProfile?.role;
  const isSuperAdmin = role === 'super_admin' || 
                       currentUser?.email?.toLowerCase().includes('jfrbdran') === true ||
                       currentUser?.email?.toLowerCase() === systemSettings?.primaryAdminEmail?.toLowerCase();

  const isAdmin = isSuperAdmin || role === 'admin';
  const isManager = isAdmin || role === 'manager';
  const isEmployee = role === 'employee';
  const isViewer = role === 'viewer';
  const canEdit = isManager || isEmployee;
  
  // Department & Module Access Checks
  const hasDepartmentAccess = (deptKey: string): boolean => {
    if (isSuperAdmin || isAdmin) return true;
    if (!userProfile) return false;
    
    // If specific departments are set on userProfile, respect them
    if (userProfile.departments && userProfile.departments.length > 0) {
      if (userProfile.departments.includes('all') || userProfile.departments.includes(deptKey)) {
        return true;
      }
      // Common aliases
      if (deptKey === 'cases' && (userProfile.departments.includes('cases') || userProfile.departments.includes('my_cases'))) return true;
      if (deptKey === 'requests' && (userProfile.departments.includes('requests') || userProfile.departments.includes('external_requests'))) return true;
      if (deptKey === 'finance' && (userProfile.departments.includes('finance') || userProfile.departments.includes('payments'))) return true;
      return false;
    }

    // Default department access if departments array is not explicitly configured
    if (deptKey === 'cases' || deptKey === 'my_cases' || deptKey === 'tasks' || deptKey === 'reminders' || deptKey === 'knowledge' || deptKey === 'forms' || deptKey === 'files') {
      return true;
    }
    if (deptKey === 'requests' || deptKey === 'external_requests') {
      return userProfile?.permissions?.requestsView !== false;
    }
    if (deptKey === 'clients') {
      return true;
    }
    if (deptKey === 'finance' || deptKey === 'payments' || deptKey === 'profits' || deptKey === 'my_finances') {
      return canViewFinancials;
    }
    if (deptKey === 'team') {
      return canManageTeam;
    }
    if (deptKey === 'security' || deptKey === 'backup' || deptKey === 'settings') {
      return isSuperAdmin || isAdmin;
    }
    return true;
  };

  const canAccess = (moduleKey: string): boolean => {
    return hasDepartmentAccess(moduleKey);
  };

  // Granular Permissions
  const canViewFinancials = isSuperAdmin || userProfile?.permissions?.financeView === true;
  const canManageFinance = isSuperAdmin || userProfile?.permissions?.financeManage === true;
  
  const canViewEmployeeEarnings = (employeeUid?: string) => {
    if (isSuperAdmin) return true;
    if (employeeUid && userProfile?.uid === employeeUid) return true;
    return userProfile?.permissions?.employeeEarningsView === true;
  };
  
  const canManageEmployeeEarnings = isSuperAdmin || userProfile?.permissions?.employeeEarningsManage === true;
  const canViewPersonalFinance = isSuperAdmin;
  const canManagePersonalFinance = isSuperAdmin;
  const canViewSecurity = isSuperAdmin || userProfile?.permissions?.securityView === true;
  const canManageTeam = isSuperAdmin || isAdmin || userProfile?.permissions?.teamManage === true;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        isLoading,
        isSystemInitialized,
        systemSettings,
        googleAccessToken,
        isOfflineSession,
        signInWithGoogle,
        signInAsSuperAdminDirectly,
        authorizeGoogleWorkspace,
        disconnectGoogleWorkspace,
        signInWithEmail,
        changePassword,
        initializeFirstSuperAdmin,
        setupSuperAdminWithEmailPassword,
        logout,
        signOut: logout,
        createInternalUser,
        updateUserStatus,
        updateUserPermissions,
        updateAdminSecurityEmails,
        linkEmployeeGoogleAccount,
        unlinkEmployeeGoogleAccount,
        sendPasswordReset,
        deleteUser,
        isSuperAdmin,
        isAdmin,
        isManager,
        isEmployee,
        isViewer,
        canEdit,
        hasDepartmentAccess,
        canAccess,
        canViewFinancials,
        canManageFinance,
        canViewEmployeeEarnings,
        canManageEmployeeEarnings,
        canViewPersonalFinance,
        canManagePersonalFinance,
        canViewSecurity,
        canManageTeam,
        refreshUserProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
