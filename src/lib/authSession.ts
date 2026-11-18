import { auth, db } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, updateDoc, query, where, limit } from 'firebase/firestore';
import { UserProfile } from '../types';

const PHONE_SESSION_KEY = 'wefarm_phone_investor_session';
const FB_ROLE_CACHE_KEY = 'wefarm_fb_role_cache';
const AUTH_CHANGE_EVENT = 'wefarm-auth-session-change';

/**
 * Normalizes a Bangladeshi or international phone number to a consistent canonical format.
 * e.g. "+880 1712-345678" -> "01712345678", "8801712345678" -> "01712345678"
 */
export function normalizePhone(rawPhone: string): string {
  if (!rawPhone) return '';
  let digits = rawPhone.replace(/\D/g, '');
  if (digits.startsWith('88001') && digits.length === 14) {
    digits = digits.slice(3);
  } else if (digits.startsWith('8801') && digits.length === 13) {
    digits = digits.slice(2);
  } else if (digits.startsWith('008801') && digits.length === 15) {
    digits = digits.slice(4);
  } else if (digits.startsWith('1') && digits.length === 10) {
    digits = '0' + digits;
  }
  return digits;
}

/**
 * Returns common representations of a phone number for Firestore queries
 */
export function getPhoneSearchVariants(rawPhone: string): string[] {
  const norm = normalizePhone(rawPhone);
  if (!norm) return [];
  const variants = new Set<string>([
    norm,
    rawPhone.trim(),
    `88${norm}`,
    `+88${norm}`
  ]);
  return Array.from(variants).filter(Boolean);
}

/**
 * Reads the active Phone OTP Investor session from localStorage
 */
export function getPhoneSession(): UserProfile | null {
  try {
    const raw = localStorage.getItem(PHONE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.uid && parsed.phone) {
      return parsed as UserProfile;
    }
    return null;
  } catch (err) {
    console.error('Error reading phone session:', err);
    return null;
  }
}

/**
 * Saves or clears the active Phone OTP Investor session in localStorage
 */
export function setPhoneSession(profile: UserProfile | null): void {
  try {
    if (profile) {
      localStorage.setItem(PHONE_SESSION_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(PHONE_SESSION_KEY);
    }
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  } catch (err) {
    console.error('Error setting phone session:', err);
  }
}

/**
 * Signs out from both Firebase Auth and Phone OTP Session
 */
export async function logoutAllSessions(): Promise<void> {
  // 1. Clear phone session and cached role directly without premature events
  try {
    localStorage.removeItem(PHONE_SESSION_KEY);
    localStorage.removeItem(FB_ROLE_CACHE_KEY);
  } catch (err) {
    console.error('Error clearing local session keys:', err);
  }

  // 2. Sign out of Firebase Auth if signed in
  try {
    if (auth.currentUser) {
      await signOut(auth);
    }
  } catch (err) {
    console.error('Error signing out of Firebase:', err);
  }

  // 3. Dispatch the auth change event AFTER both localStorage and Firebase are completely cleared
  try {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  } catch (err) {
    console.error('Error dispatching auth change event:', err);
  }
}

/**
 * Looks up an existing investor profile in Firestore by phone number.
 * STRICT: Returns null if not pre-registered by the admin.
 */
export async function findInvestorByPhone(rawPhone: string): Promise<UserProfile | null> {
  const normPhone = normalizePhone(rawPhone);
  if (!normPhone || normPhone.length < 10) {
    return null;
  }

  const deterministicId = `phone_${normPhone}`;

  // 1. Check deterministic doc ID first
  const directDocRef = doc(db, 'users', deterministicId);
  const directSnap = await getDoc(directDocRef);
  if (directSnap.exists()) {
    const data = directSnap.data();
    return {
      ...(data as UserProfile),
      uid: directSnap.id,
      phone: normPhone,
      role: data.role || 'investor'
    };
  }

  // 2. Query by phone variants in 'users' collection (strictly scoped to role == 'investor' for Firestore rules)
  const variants = getPhoneSearchVariants(rawPhone);
  const usersRef = collection(db, 'users');
  for (const variant of variants) {
    try {
      const q = query(usersRef, where('role', '==', 'investor'), where('phone', '==', variant), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const existingDoc = snap.docs[0];
        const data = existingDoc.data();
        if (data.phone !== normPhone) {
          try {
            await updateDoc(doc(db, 'users', existingDoc.id), { phone: normPhone });
          } catch (e) {
            console.warn('Could not update normalized phone on existing doc:', e);
          }
        }
        return {
          ...(data as UserProfile),
          uid: existingDoc.id,
          phone: normPhone,
          role: data.role || 'investor'
        };
      }
    } catch (e) {
      console.warn('Variant investor lookup skipped:', variant, e);
    }
  }

  // 3. Fallback scan strictly scoped to role == 'investor' in case phone was stored with dashes/spaces
  try {
    const allSnap = await getDocs(query(usersRef, where('role', '==', 'investor'), limit(300)));
    const matchedDoc = allSnap.docs.find(d => {
      const p = d.data().phone;
      return p && normalizePhone(String(p)) === normPhone;
    });
    if (matchedDoc) {
      const data = matchedDoc.data();
      try {
        await updateDoc(doc(db, 'users', matchedDoc.id), { phone: normPhone });
      } catch (e) {
        console.warn('Could not update normalized phone on matched doc:', e);
      }
      return {
        ...(data as UserProfile),
        uid: matchedDoc.id,
        phone: normPhone,
        role: data.role || 'investor'
      };
    }
  } catch (e) {
    console.warn('Fallback user scan skipped:', e);
  }

  return null;
}

export interface ActiveAuthState {
  uid: string | null;
  name: string;
  email: string;
  phone: string;
  role: 'super_admin' | 'admin' | 'investor' | null;
  isPhoneAuth: boolean;
  profile: UserProfile | null;
}

/**
 * Subscribes to both Firebase Auth state and Phone OTP Investor session changes.
 */
function getCachedFbRole(uid: string): 'super_admin' | 'admin' | 'investor' | null {
  try {
    const raw = localStorage.getItem(FB_ROLE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.uid === uid && parsed?.role) {
      return parsed.role;
    }
  } catch {
    // ignore
  }
  return null;
}

function setCachedFbRole(uid: string, role: 'super_admin' | 'admin' | 'investor'): void {
  try {
    localStorage.setItem(FB_ROLE_CACHE_KEY, JSON.stringify({ uid, role }));
  } catch {
    // ignore
  }
}

export function subscribeToAuthSession(callback: (state: ActiveAuthState) => void): () => void {
  let isMounted = true;
  let currentRequestId = 0;

  const evaluateState = async (explicitFbUser?: typeof auth.currentUser) => {
    const requestId = ++currentRequestId;
    const fbUser = explicitFbUser !== undefined ? explicitFbUser : auth.currentUser;

    if (fbUser) {
      const isPrimarySuperAdmin = fbUser.email === 'alvymahamudulhasan@gmail.com';
      try {
        await fbUser.getIdToken().catch(() => {});
        const userDocRef = doc(db, 'users', fbUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (!isMounted || requestId !== currentRequestId) return;

        if (userDoc.exists()) {
          const data = userDoc.data() as UserProfile;
          const role = isPrimarySuperAdmin ? 'super_admin' : (data.role || 'investor');
          setCachedFbRole(fbUser.uid, role);
          callback({
            uid: fbUser.uid,
            name: data.name || fbUser.displayName || '',
            email: data.email || fbUser.email || '',
            phone: data.phone || '',
            role,
            isPhoneAuth: false,
            profile: { ...data, uid: fbUser.uid, role }
          });
          return;
        } else {
          const role = isPrimarySuperAdmin ? 'super_admin' : 'investor';
          setCachedFbRole(fbUser.uid, role);
          const defaultProfile: UserProfile = {
            uid: fbUser.uid,
            name: fbUser.displayName || '',
            email: fbUser.email || '',
            role,
            createdAt: new Date().toISOString()
          };
          callback({
            uid: fbUser.uid,
            name: fbUser.displayName || '',
            email: fbUser.email || '',
            phone: '',
            role,
            isPhoneAuth: false,
            profile: defaultProfile
          });
          return;
        }
      } catch {
        if (!isMounted || requestId !== currentRequestId) return;
        const fallbackRole = isPrimarySuperAdmin
          ? 'super_admin'
          : (getCachedFbRole(fbUser.uid) || 'investor');
        callback({
          uid: fbUser.uid,
          name: fbUser.displayName || '',
          email: fbUser.email || '',
          phone: '',
          role: fallbackRole,
          isPhoneAuth: false,
          profile: {
            uid: fbUser.uid,
            name: fbUser.displayName || '',
            email: fbUser.email || '',
            role: fallbackRole,
            createdAt: new Date().toISOString()
          }
        });
        return;
      }
    }

    // Check Phone OTP Session
    const phoneSession = getPhoneSession();
    if (phoneSession && phoneSession.uid) {
      try {
        const userDoc = await getDoc(doc(db, 'users', phoneSession.uid));
        if (!isMounted || requestId !== currentRequestId) return;

        if (userDoc.exists()) {
          const freshProfile: UserProfile = {
            ...(userDoc.data() as UserProfile),
            uid: userDoc.id
          };
          localStorage.setItem(PHONE_SESSION_KEY, JSON.stringify(freshProfile));
          callback({
            uid: freshProfile.uid,
            name: freshProfile.name || '',
            email: freshProfile.email || '',
            phone: freshProfile.phone || '',
            role: freshProfile.role || 'investor',
            isPhoneAuth: true,
            profile: freshProfile
          });
          return;
        }
      } catch {
        // Use cached phone session fallback when Firestore read is unavailable
      }

      if (!isMounted || requestId !== currentRequestId) return;
      callback({
        uid: phoneSession.uid,
        name: phoneSession.name || '',
        email: phoneSession.email || '',
        phone: phoneSession.phone || '',
        role: phoneSession.role || 'investor',
        isPhoneAuth: true,
        profile: phoneSession
      });
      return;
    }

    if (!isMounted || requestId !== currentRequestId) return;
    callback({
      uid: null,
      name: '',
      email: '',
      phone: '',
      role: null,
      isPhoneAuth: false,
      profile: null
    });
  };

  const unsubFirebase = onAuthStateChanged(auth, (fbUser) => {
    evaluateState(fbUser);
  });

  const handleCustomChange = () => {
    evaluateState();
  };

  window.addEventListener(AUTH_CHANGE_EVENT, handleCustomChange);
  window.addEventListener('storage', handleCustomChange);

  return () => {
    isMounted = false;
    unsubFirebase();
    window.removeEventListener(AUTH_CHANGE_EVENT, handleCustomChange);
    window.removeEventListener('storage', handleCustomChange);
  };
}
