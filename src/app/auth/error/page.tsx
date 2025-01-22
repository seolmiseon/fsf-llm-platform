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
            case 'auth/user-not-found':
                return '등록되지 않은 사용자입니다.';
            case 'auth/wrong-password':
                return '잘못된 비밀번호입니다.';
            case 'auth/invalid-email':
                return '유효하지 않은 이메일 주소입니다.';
            case 'auth/email-already-in-use':
                return '이미 사용 중인 이메일 주소입니다.';
            case 'auth/weak-password':
                return '비밀번호가 너무 약합니다.';
            case 'auth/popup-closed-by-user':
                return '로그인 창이 닫혔습니다. 다시 시도해주세요.';
            case 'auth/operation-not-allowed':
                return '이 로그인 방식은 현재 사용할 수 없습니다.';
            case 'auth/network-request-failed':
                return '네트워크 연결에 실패했습니다.';
            // 일반 에러
            case 'user-cancelled':
                return '사용자가 로그인을 취소했습니다.';
            case 'network-error':
                return '네트워크 연결을 확인해주세요.';
            default:
                return '인증 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
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
