import { initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

const isFirebaseConfigured = (): boolean => {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
};

export const initFirebase = (): { app: FirebaseApp | null; db: Firestore | null } => {
  if (isFirebaseConfigured() && !app) {
    try {
      app = initializeApp(firebaseConfig);
      db = getFirestore(app);
    } catch (error) {
      console.warn('Firebase initialization failed, using local storage fallback:', error);
      app = null;
      db = null;
    }
  }
  return { app, db };
};

export const getDb = (): Firestore | null => db;
export const getApp = (): FirebaseApp | null => app;
export { isFirebaseConfigured };
