import { getApps, initializeApp, FirebaseApp } from 'firebase/app';
import { Database, getDatabase } from 'firebase/database';
import { getAuth, Auth } from 'firebase/auth';
import { FirebaseStorage, getStorage } from 'firebase/storage';
import { Firestore, getFirestore } from 'firebase/firestore';
import { getMessaging, Messaging } from 'firebase/messaging';

// 환경 변수 누락 확인
const requiredEnvVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
];

const missingEnvVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
);

if (missingEnvVars.length > 0) {
    console.error(
        `Missing required environment variables: ${missingEnvVars.join(', ')}`
    );
}

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

let app: FirebaseApp | undefined;
let realtimeDB: Database | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;
let storage: FirebaseStorage | undefined;
let messaging: Messaging | undefined;

function initializeFirebase() {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        if (!getApps().length) {
            app = initializeApp(firebaseConfig);
        } else {
            app = getApps()[0];
        }

        if (app) {
            db = getFirestore(app);
            auth = getAuth(app);

            // 선택적 서비스 초기화 (databaseURL이 있는 경우에만)
            if (process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL) {
                realtimeDB = getDatabase(app);
            }

            // 스토리지 초기화
            if (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) {
                storage = getStorage(app);
            }

            // 메시징 초기화 (브라우저 환경 && Notification API 지원 여부 확인)
            if (
                'Notification' in window &&
                'serviceWorker' in navigator &&
                process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
            ) {
                try {
                    messaging = getMessaging(app); // 여기서 messaging 초기화

                    navigator.serviceWorker
                        .register('/firebase-messaging-sw.js')
                        .then((registration) => {
                            console.log(
                                'Service Worker registered with scope:',
                                registration.scope
                            );
                        })
                        .catch((err) => {
                            console.error(
                                'Service Worker registration failed:',
                                err
                            );
                        });
                } catch (error) {
                    console.error('Messaging initialization failed:', error);
                }
            }
        }
    } catch (error) {
        console.error('Firebase initialization error:', error);
    }
}

if (typeof window !== 'undefined') {
    initializeFirebase();
}

export { realtimeDB, db, auth, storage, messaging };
