import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getFirestore, FieldValue, Firestore } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';

// Firebase Admin 초기화 함수
function initializeFirebaseAdmin() {
    if (typeof window !== 'undefined') {
        return undefined; // 클라이언트 사이드에서는 실행하지 않음
    }

    if (!getApps().length) {
        return initializeApp({
            credential: cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(
                    /\\n/g,
                    '\n'
                ),
            }),
            databaseURL: process.env.FIREBASE_DATABASE_URL,
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        });
    }

    return getApps()[0];
}

// 초기화 실행
const app = initializeFirebaseAdmin();

// Firestore와 Storage 인스턴스 생성
const adminDB: Firestore | undefined = app ? getFirestore(app) : undefined;
const adminStorage: Storage | undefined = app ? getStorage(app) : undefined;

export { adminDB, adminStorage, FieldValue };
