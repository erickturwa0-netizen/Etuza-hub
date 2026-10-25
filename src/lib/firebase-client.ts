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

/** Prefer redirect on mobile (popups often blocked). */
function shouldUseRedirect() {
  if (typeof window === "undefined") return true;
  const ua = navigator.userAgent || "";
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  return isMobile;
}

/** Start Google sign-in (redirect on mobile, popup on desktop). */
export async function startGoogleSignIn(): Promise<
  | { mode: "popup"; idToken: string }
  | { mode: "redirect" }
> {
  const auth = getFirebaseAuth();
  const provider = googleProvider();

  if (shouldUseRedirect()) {
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
    // Popup blocked → fall back to redirect
    if (
      code.includes("popup-blocked") ||
      code.includes("popup-closed") ||
      code.includes("cancelled-popup")
    ) {
      await signInWithRedirect(auth, provider);
      return { mode: "redirect" };
    }
    throw e;
  }
}

/** After redirect back to the page, get the Google result. */
export async function completeGoogleRedirect(): Promise<string | null> {
  const auth = getFirebaseAuth();
  const result = await getRedirectResult(auth);
  if (!result?.user) return null;
  return result.user.getIdToken();
}
