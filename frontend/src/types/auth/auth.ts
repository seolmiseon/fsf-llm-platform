export interface UserCredentials {
    email: string;
    password: string;
}

export interface AuthUser {
    id: string;
    email: string | null;
    name: string | null;
}

// Firebase User 타입 (useAuthStore에서 사용)
// 앱에서 사용하는 별칭 속성도 포함 (name, image)
export interface FirebaseUser {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    emailVerified: boolean;
    // 앱에서 사용하는 별칭 (Firebase User 확장)
    name?: string | null;
    image?: string | null;
    // Firebase Auth 메서드
    getIdToken: (forceRefresh?: boolean) => Promise<string>;
    getIdTokenResult: (forceRefresh?: boolean) => Promise<{
        token: string;
        expirationTime: string;
        authTime: string;
        issuedAtTime: string;
        signInProvider: string | null;
        signInSecondFactor: string | null;
        claims: Record<string, unknown>;
    }>;
}

// 앱에서 사용하는 간소화된 User 타입
export interface AppUser {
    uid: string;
    email: string | null;
    name: string | null;
    image: string | null;
}
