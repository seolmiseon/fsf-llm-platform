import { initializeApp } from 'firebase/app';
import { Database, getDatabase } from 'firebase/database';
import { getAuth, Auth } from 'firebase/auth';
import { FirebaseStorage, getStorage } from 'firebase/storage';
import { Firestore, getFirestore } from 'firebase/firestore';
import { getMessaging, Messaging } from 'firebase/messaging';

export const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
};

let app;
let realtimeDB: Database | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;
let storage: FirebaseStorage | undefined;
let messaging: Messaging | undefined;

if (typeof window !== 'undefined') {
    // 클라이언트 사이드인 경우에만
    app = initializeApp(firebaseConfig);
    realtimeDB = getDatabase(app);
    db = getFirestore(app);
    auth = getAuth(app);
    storage = getStorage(app);

    // messaging은 serviceWorker 지원 여부도 확인
    if ('serviceWorker' in navigator) {
        try {
            messaging = getMessaging(app);
        } catch (error) {
            console.error('Messaging initialization failed:', error);
        }
    }
}

export { realtimeDB, db, auth, storage, messaging };
