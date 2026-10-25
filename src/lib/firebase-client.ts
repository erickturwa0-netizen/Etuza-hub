import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

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

export async function signInWithGooglePopup() {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(auth, provider);
  const idToken = await result.user.getIdToken();
  return {
    idToken,
    email: result.user.email,
    displayName: result.user.displayName,
    photoURL: result.user.photoURL,
  };
}
