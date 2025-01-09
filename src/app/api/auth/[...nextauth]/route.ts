import NextAuth, { AuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import NaverProvider from 'next-auth/providers/naver';
import KakaoProvider from 'next-auth/providers/kakao';
import { FirestoreAdapter } from '@auth/firebase-adapter';
import Credentials from 'next-auth/providers/credentials';
import { cert } from 'firebase-admin/app';
import { auth } from '@/lib/firebase/config';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { User } from 'next-auth';

const authOptions: AuthOptions = {
    adapter: FirestoreAdapter({
        credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY,
        }),
    }),
    providers: [
        Credentials({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            // credentials -> credentials로 수정 필요
            async authorize(
                credentials: Record<'email' | 'password', string> | undefined
            ): Promise<User | null> {
                try {
                    if (!credentials?.email || !credentials?.password) {
                        return null;
                    }

                    const userCredential = await signInWithEmailAndPassword(
                        auth,
                        credentials.email,
                        credentials.password
                    );

                    if (userCredential.user) {
                        return {
                            id: userCredential.user.uid,
                            email: userCredential.user.email || undefined,
                            name: userCredential.user.displayName || undefined,
                        };
                    }
                    return null;
                } catch (error) {
                    console.error('Authentication error', error);
                    return null;
                }
            },
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        NaverProvider({
            clientId: process.env.NAVER_CLIENT_ID!,
            clientSecret: process.env.NAVER_CLIENT_SECRET!,
        }),
        KakaoProvider({
            clientId: process.env.KAKAO_CLIENT_ID!,
            clientSecret: process.env.KAKAO_CLIENT_SECRET!,
        }),
    ],
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60,
    },
    jwt: {
        secret: process.env.JWT_SECRET,
    },
    pages: {
        signIn: '/auth/signin',
        error: '/auth/error',
    },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST, authOptions };
