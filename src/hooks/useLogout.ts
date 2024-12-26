import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export const useLogout = () => {
    const router = useRouter();

    const handleLogout = async () => {
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
            });

            if (!response.ok) {
                throw new Error('Logout failed');
            }

            await signOut({ redirect: false });

            router.push('/');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return { handleLogout };
};
