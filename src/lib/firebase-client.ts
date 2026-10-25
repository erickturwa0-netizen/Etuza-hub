import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  browserLocalPersistence,
  setPersistence,
} from "firebase/auth";

const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    "AIzaSyCZBWGkbLcMvpstxUfWVeW2TE7z0cn4cZU",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "etuza-737d6.firebaseapp.com",
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "etuza-737d6",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "etuza-737d6.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "611497432345",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    "1:611497432345:web:534e0535e45fa7117da188",
  measurementId:
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-X0JHHBXYC8",
};

function getFirebaseApp() {
  if (getApps().length) return getApp();
  return initializeApp(firebaseConfig);
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

function googleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  provider.addScope("email");
  provider.addScope("profile");
  return provider;
}

/** Start Google via full-page redirect (works on mobile + desktop). */
export async function startGoogleSignIn() {
  const auth = getFirebaseAuth();
  await setPersistence(auth, browserLocalPersistence);
  try {
    sessionStorage.setItem("etuza_google_pending", "1");
  } catch {
    /* ignore */
  }
  await signInWithRedirect(auth, googleProvider());
}

/** Resolve ID token after returning from Google. */
export async function resolveGoogleIdToken(): Promise<string | null> {
  const auth = getFirebaseAuth();
  await setPersistence(auth, browserLocalPersistence);
  await auth.authStateReady();

  try {
    const redirected = await getRedirectResult(auth);
    if (redirected?.user) {
      return redirected.user.getIdToken(true);
    }
  } catch (e) {
    console.error("getRedirectResult", e);
  }

  if (auth.currentUser) {
    return auth.currentUser.getIdToken(true);
  }

  return null;
}

export function isGooglePending(): boolean {
  try {
    return sessionStorage.getItem("etuza_google_pending") === "1";
  } catch {
    return false;
  }
}

export function clearGooglePending() {
  try {
    sessionStorage.removeItem("etuza_google_pending");
  } catch {
    /* ignore */
  }
}
