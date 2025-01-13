'use client';

import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button/Button';
import Link from 'next/link';
import { Suspense } from 'react';

function ErrorContent() {
    const searchParams = useSearchParams();
    const error = searchParams.get('error');

    const getErrorMessage = (error: string | null) => {
        switch (error) {
            case 'Configuration':
                return '서버 설정에 문제가 있습니다. 잠시 후 다시 시도해주세요.';
            case 'AccessDenied':
                return '접근 권한이 없습니다.';
            case 'Verification':
                return '인증 링크가 만료되었거나 이미 사용되었습니다.';
            case 'OAuthSignin':
                return '소셜 로그인 연동 중 문제가 발생했습니다.';
            case 'OAuthCallback':
                return '소셜 로그인 인증 중 문제가 발생했습니다.';
            case 'OAuthCreateAccount':
                return '소셜 계정으로 회원가입 중 문제가 발생했습니다.';
            case 'EmailCreateAccount':
                return '이메일 계정 생성 중 문제가 발생했습니다.';
            case 'Callback':
                return '인증 처리 중 문제가 발생했습니다.';
            case 'OAuthAccountNotLinked':
                return '이미 다른 방식으로 가입된 이메일입니다.';
            default:
                return '로그인 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-red-600">인증 오류</h1>
                <p className="text-gray-600">{getErrorMessage(error)}</p>
            </div>

            <div className="flex gap-2">
                <Link href="/auth/signin">
                    <Button>로그인으로 돌아가기</Button>
                </Link>
                <Link href="/">
                    <Button variant="outline">홈으로 가기</Button>
                </Link>
            </div>
        </div>
    );
}

export default function AuthError() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ErrorContent />
        </Suspense>
    );
}
