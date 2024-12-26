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
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                body: JSON.stringify(data),
                headers: { 'Content-Type': 'application/json' },
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error);
            }

            router.push('/auth/signin');
        });
    };

    return { signup, error, loading };
}
