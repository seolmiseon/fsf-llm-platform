import { useSession } from 'next-auth/react';

export function useAuth() {
    const { data: session, status } = useSession();

    return {
        isAuthenticated: status === 'authenticated',
        isLoading: status === 'loading',
        user: session?.user,
        canEdit: (resourceUserId?: string) => {
            if (!session?.user) return false;
            // 관리자이거나 리소스 소유자인 경우
            return (
                session.user.role === 'admin' ||
                session.user.id === resourceUserId
            );
        },
    };
}
