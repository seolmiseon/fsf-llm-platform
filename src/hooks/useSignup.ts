import { useAsync } from './useAsync';
import { useRouter } from 'next/navigation';

interface SignupData {
    email: string;
    password: string;
    name?: string;
}

export default function useSignup() {
    const router = useRouter();
    const { loading, error, runAsync } = useAsync();

    const signup = async (data: SignupData) => {
        await runAsync(async () => {
            try {
                const res = await fetch('/api/auth/signup', {
                    method: 'POST',
                    body: JSON.stringify(data),
                    headers: { 'Content-Type': 'application/json' },
                });

                const errorData = await res.json();

                if (!res.ok) {
                    // Firebase 에러 메시지를 한글로 변환
                    switch (true) {
                        case errorData.error.includes(
                            'auth/email-already-in-use'
                        ):
                            throw new Error(
                                '이미 사용 중인 이메일입니다. 다른 이메일을 사용하거나 로그인해주세요.'
                            );
                        case errorData.error.includes('auth/weak-password'):
                            throw new Error(
                                '비밀번호는 최소 6자 이상이어야 합니다.'
                            );
                        case errorData.error.includes('auth/invalid-email'):
                            throw new Error('유효하지 않은 이메일 형식입니다.');
                        default:
                            throw new Error(errorData.error);
                    }
                }

                router.push('/auth/signin');
            } catch (error) {
                if (error instanceof Error) {
                    throw error;
                }
                throw new Error('회원가입 중 오류가 발생했습니다.');
            }
        });
    };

    return { signup, error, loading };
}
