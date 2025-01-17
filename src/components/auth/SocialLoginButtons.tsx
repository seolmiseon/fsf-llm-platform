'use client';
import { Button } from '../ui/button/Button';
import { signIn } from 'next-auth/react';
import { FcGoogle } from 'react-icons/fc';
import { RiKakaoTalkFill } from 'react-icons/ri';
import { SiNaver } from 'react-icons/si';

interface SocialLoginProps {
    onLogin?: (provider: string) => Promise<void>;
}

export default function SocialLoginButtons({ onLogin }: SocialLoginProps) {
    const handleSocialLogin = async (provider: string) => {
        try {
            if (onLogin) {
                await onLogin(provider);
            } else {
                await signIn(provider, { callbackUrl: '/' });
            }
        } catch (error) {
            console.error(`${provider} login error:`, error);
        }
    };
    return (
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
    );
}
