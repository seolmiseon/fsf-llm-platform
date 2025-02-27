import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue, Firestore } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';

function checkRequiredEnvVars() {
    const requiredVars = [
        'FIREBASE_PROJECT_ID',
        'FIREBASE_CLIENT_EMAIL',
        'FIREBASE_PRIVATE_KEY',
    ];

    const missingVars = requiredVars.filter((varName) => !process.env[varName]);

    if (missingVars.length > 0) {
        console.error(
            `Firebase Admin 초기화에 필요한 환경 변수가 누락되었습니다: ${missingVars.join(
                ', '
            )}`
        );
        return false;
    }

    return true;
}
// Firebase Admin 초기화 함수
function initializeFirebaseAdmin() {
    if (typeof window !== 'undefined') {
        return undefined; // 클라이언트 사이드에서는 실행하지 않음
    }

    if (!checkRequiredEnvVars()) {
        console.error('Firebase Admin 초기화 실패: 필수 환경 변수 누락');
        return undefined;
    }

    try {
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
    } catch (error) {
        console.error('Firebase Admin 초기화 중 오류 발생:', error);
        return undefined;
    }
}
// 초기화 실행
const app = initializeFirebaseAdmin();

// Firestore와 Storage 인스턴스 생성
const adminDB: Firestore | undefined = app ? getFirestore(app) : undefined;
const adminStorage: Storage | undefined = app ? getStorage(app) : undefined;

function getAdminFirestore(): Firestore {
    if (!adminDB) {
        throw new Error('Firebase Admin Firestore가 초기화되지 않았습니다.');
    }
    return adminDB;
}

function getAdminStorage(): Storage {
    if (!adminStorage) {
        throw new Error('Firebase Admin Storage가 초기화되지 않았습니다.');
    }
    return adminStorage;
}
export {
    adminDB,
    adminStorage,
    FieldValue,
    getAdminFirestore,
    getAdminStorage,
};
