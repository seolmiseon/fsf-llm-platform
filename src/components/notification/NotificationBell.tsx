'use client';

import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { useCallback } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { requestNotificationPermission } from '@/lib/firebase/messaging';
import { toast } from '@/store/useToastStore';

export default function NotificationBell({ matchId }: { matchId: number }) {
    const { user } = useAuthStore();

    const handleNotificationSetup = useCallback(async () => {
        if (!user) return;
        try {
            const token = await requestNotificationPermission();
            if (token) {
                // API 라우트로 토큰 저장 요청
                const response = await fetch('/api/notification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.uid, token, matchId }),
                });

                if (response.ok) {
                    toast.default({
                        title: '알림 설정 완료',
                        description: '이제 경기 알림을 받을 수 있습니다.',
                    });
                }
            }
        } catch (error) {
            console.error('FCM 토큰 초기화 실패:', error);
            toast.error({
                title: '알림 설정 실패',
                description: '알림 권한을 확인해주세요.',
            });
        }
    }, [user, matchId]);

    return (
        <Button
            variant="ghost"
            size="sm"
            className="relative"
            onClick={handleNotificationSetup}
        >
            <Bell className="w-5 h-5" />
        </Button>
    );
}
