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
    return (
        <div className="space-y-3">
            <Button
                variant="secondary"
                fullWidth
                onClick={() => signIn('google')}
                className="bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            >
                <FcGoogle className="mr-2 h-5 w-5" />
            </Button>
            <Button
                onClick={() => signIn('kakao')}
                variant="secondary"
                fullWidth
                className="bg-[#FEE500] text-[#000000] hover:bg-[#FDD835]"
            >
                <RiKakaoTalkFill className="mr-2 h-5 w-5" />
            </Button>
            <Button
                onClick={() => signIn('naver')}
                variant="secondary"
                fullWidth
                className="bg-[#03C75A] text-white hover:bg-[#02b351]"
            >
                <SiNaver className="mr-2 h-5 w-5" />
            </Button>
        </div>
    );
}
