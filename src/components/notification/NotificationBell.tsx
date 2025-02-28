'use client';

import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { requestNotificationPermission } from '@/lib/firebase/messaging';
import { toast } from '@/store/useToastStore';
import { MatchResponse } from '@/types/api/responses';
import { FootballDataApi } from '@/lib/client/api/football-data';

export default function NotificationBell({
    matchId,
    matchDate,
}: {
    matchId: number;
    matchDate: string;
}) {
    const [match, setMatch] = useState<MatchResponse | null>(null);
    const { user } = useAuthStore();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchMatchData() {
            try {
                const api = new FootballDataApi();
                const response = await api.getMatches('SCHEDULED');
                if (response.success) {
                    if (response.data && response.data.length > 0) {
                        setMatch(response.data[0]); // 가장 가까운 경기 선택
                    } else {
                        console.error(
                            '경기 데이터를 가져오지 못했습니다: 데이터가 없습니다.'
                        );
                        setMatch(null);
                    }
                } else {
                    console.error(
                        '경기 데이터를 가져오지 못했습니다:',
                        response.error
                    );
                    setMatch(null);
                }
            } catch (error) {
                console.error('경기 데이터 가져오기 오류:', error);
                setMatch(null);
            } finally {
                setIsLoading(false);
            }
        }

        fetchMatchData();
    }, []);

    const isMatchAvailable = () => {
        if (!match?.utcDate) return false;
        const now = new Date();
        const matchTime = new Date(matchDate);
        return matchTime > now; // 미래 경기만 true 반환
    };

    const handleNotificationSetup = useCallback(async () => {
        if (!user) {
            toast.error({
                title: '로그인 필요',
                description: '알림을 설정하려면 로그인이 필요합니다.',
            });
            return;
        }
        const isMatchAvailable = () => {
            const now = new Date();
            const matchTime = new Date(matchDate);
            return matchTime > now; // 미래 경기만 true 반환
        };

        if (!isMatchAvailable()) {
            toast.error({
                title: '알림 설정 불가',
                description: '지난 경기는 알림을 설정할 수 없습니다.',
            });
            return;
        }

        try {
            console.log('Setting up notification for matchId:', matchId);
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
    }, [user, matchId, matchDate]);

    if (isLoading || !match) return null;

    return (
        <Button
            variant="ghost"
            size="sm"
            className={`relative ${!isMatchAvailable() ? 'opacity-50' : ''}`}
            onClick={handleNotificationSetup}
            disabled={!isMatchAvailable()}
            title={isMatchAvailable() ? '경기 알림 설정' : '지난 경기'}
        >
            <Bell className="w-5 h-5" />
        </Button>
    );
}
