//@ts-nocheck
'use client';

import { FcGoogle } from 'react-icons/fc';
import { RiKakaoTalkFill } from 'react-icons/ri';
import { SiNaver } from 'react-icons/si';
import { auth } from '@/lib/firebase/config';
import {
    GoogleAuthProvider,
    signInWithPopup,
    OAuthProvider,
} from 'firebase/auth';
import { useAuthStore } from '@/store/useAuthStore';
import { useModalStore } from '@/store/useModalStore';
import { useRouter } from 'next/navigation';
import { Error } from '../ui/common';
import { useState } from 'react';

export default function SocialLoginButtons() {
    const router = useRouter();
    const setUser = useAuthStore((state) => state.setUser);
    const close = useModalStore((state) => state.close);
    const [errorMessage, setErrorMessage] = useState<string | undefined>('');

    const handleSocialLogin = async (provider: string) => {
        if (!auth) return;

        try {
            let authProvider;
            switch (provider) {
                case 'google':
                    authProvider = new GoogleAuthProvider();
                    break;
                case 'kakao':
                    authProvider = new OAuthProvider('oidc.kakao.com');
                    break;
                case 'naver':
                    authProvider = new OAuthProvider('oidc.naver.com');
                    break;
                default:
                    setErrorMessage('지원하지 않는 로그인 방식입니다');
                    return;
            }

            const result = await signInWithPopup(auth, authProvider);
            setUser(result.user);
            close();
            router.push('/');
        } catch (error) {
            console.error(`${provider} login error:`, error);
            setErrorMessage('로그인에 실패했습니다. 다시 시도해주세요.');
        }
    };

    return (
        <>
            {errorMessage && (
                <Error
                    message={errorMessage}
                    retry={() => setErrorMessage('')}
                />
            )}

            <div className="space-y-3">
                <button
                    onClick={() => handleSocialLogin('google')}
                    className="w-full flex items-center justify-center px-4 py-3 bg-white text-gray-700 border border-gray-300 rounded-md font-medium hover:bg-gray-50 transition-colors"
                >
                    <FcGoogle className="mr-2 h-5 w-5" />
                    <span>Google로 로그인</span>
                </button>
                <button
                    onClick={() => handleSocialLogin('kakao')}
                    className="w-full flex items-center justify-center px-4 py-3 bg-[#FEE500] text-[#000000] rounded-md font-medium hover:bg-[#FDD835] transition-colors"
                >
                    <RiKakaoTalkFill className="mr-2 h-5 w-5 text-[#000000]" />
                    <span>Kakao로 로그인</span>
                </button>
                <button
                    onClick={() => handleSocialLogin('naver')}
                    className="w-full flex items-center justify-center px-4 py-3 bg-[#03C75A] text-white rounded-md font-medium hover:bg-[#02b351] transition-colors"
                >
                    <SiNaver className="mr-2 h-5 w-5 text-white" />
                    <span>Naver로 로그인</span>
                </button>
            </div>
        </>
    );
}
