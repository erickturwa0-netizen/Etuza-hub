import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
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
  return provider;
}

function shouldUseRedirect() {
  if (typeof window === "undefined") return true;
  const ua = navigator.userAgent || "";
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
}

export async function startGoogleSignIn(): Promise<
  | { mode: "popup"; idToken: string }
  | { mode: "redirect" }
> {
  const auth = getFirebaseAuth();
  const provider = googleProvider();

  // Always redirect on mobile; popup often blocked
  if (shouldUseRedirect()) {
    sessionStorage.setItem("etuza_google_pending", "1");
    await signInWithRedirect(auth, provider);
    return { mode: "redirect" };
  }

  try {
    const result = await signInWithPopup(auth, provider);
    const idToken = await result.user.getIdToken();
    return { mode: "popup", idToken };
  } catch (e: unknown) {
    const code =
      e && typeof e === "object" && "code" in e
        ? String((e as { code: string }).code)
        : "";
    if (
      code.includes("popup-blocked") ||
      code.includes("popup-closed") ||
      code.includes("cancelled-popup")
    ) {
      sessionStorage.setItem("etuza_google_pending", "1");
      await signInWithRedirect(auth, provider);
      return { mode: "redirect" };
    }
    throw e;
  }
}

/**
 * After Google redirect returns to the app, resolve an ID token.
 * Tries getRedirectResult first, then currentUser (authStateReady).
 */
export async function resolveGoogleIdToken(): Promise<string | null> {
  const auth = getFirebaseAuth();

  // Wait until Firebase restores any persisted auth
  await auth.authStateReady();

  try {
    const redirected = await getRedirectResult(auth);
    if (redirected?.user) {
      return redirected.user.getIdToken(true);
    }
  } catch (e) {
    console.error("getRedirectResult", e);
  }

  // Fallback: user already signed in after redirect
  if (auth.currentUser) {
    return auth.currentUser.getIdToken(true);
  }

  return null;
}
