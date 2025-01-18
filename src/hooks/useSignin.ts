import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export const useSignin = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleSignIn = async (email: string, password: string) => {
        try {
            setLoading(true);
            setError(null);

            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
                callbackUrl: '/',
            });
            if (result?.error) {
                setError('이메일 또는 비밀번호가 올바르지 않습니다.');
                return;
            }

            if (result?.ok) {
                router.push('/');
                router.refresh();
            }
        } catch (error) {
            setError('로그인 중 오류가 발생했습니다.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return {
        handleSignIn,
        loading,
        error,
    };
};
