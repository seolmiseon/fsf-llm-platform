'use client';
import { Button } from '../ui/button/Button';
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
import { useRouter } from 'next/navigation';
import { Error } from '../ui/common';
import { useState } from 'react';

export default function SocialLoginButtons() {
    const router = useRouter();
    const setUser = useAuthStore((state) => state.setUser);
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
                <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => handleSocialLogin('google')}
                    className="flex items-center justify-center bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                >
                    <FcGoogle className="mr-2 h-5 w-5" />
                    <span>Google로 로그인</span>
                </Button>
                <Button
                    onClick={() => handleSocialLogin('kakao')}
                    variant="secondary"
                    fullWidth
                    className="flex items-center justify-center bg-[#FEE500] text-[#000000] hover:bg-[#FDD835]"
                >
                    <RiKakaoTalkFill className="mr-2 h-5 w-5 text-[#000000]" />
                    <span>Kakao로 로그인</span>
                </Button>
                <Button
                    onClick={() => handleSocialLogin('naver')}
                    variant="secondary"
                    fullWidth
                    className="flex items-center justify-center bg-[#03C75A] text-white hover:bg-[#02b351]"
                >
                    <SiNaver className="mr-2 h-5 w-5 text-white" />
                    <span>Naver로 로그인</span>
                </Button>
            </div>
        </>
    );
}
