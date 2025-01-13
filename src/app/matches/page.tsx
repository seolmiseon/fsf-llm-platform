'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/dateRangePicker';
import { FootballDataApi } from '@/lib/server/api/football-data';
import { MatchGrid } from '@/components/client-components/match/gird/MatchGrid';
import { MatchResponse } from '@/types/api/responses';
import { type DateRange } from 'react-day-picker';

export default function MatchesPage() {
    const [activeTab, setActiveTab] = useState('all');
    const [matches, setMatches] = useState<MatchResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState('DATE_DESC');
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    const sortOptions = [
        { value: 'DATE_ASC', label: '날짜 오름차순 (과거 → 미래)' },
        { value: 'DATE_DESC', label: '날짜 내림차순 (미래 → 과거)' },
        { value: 'LEAGUE', label: '리그별' },
    ];

    const handleError = (error: unknown) => {
        const errorMessage =
            error instanceof Error
                ? error.message
                : '예상치 못한 오류가 발생했습니다';
        setError(errorMessage);
        console.error('Error:', error);
    };

    useEffect(() => {
        const fetchLiveMatches = async () => {
            try {
                setLoading(true);
                const api = new FootballDataApi();
                const result = await api.getLiveMatches();

                if (!result.success) {
                    handleError(result.error);
                    return;
                }

                setMatches(result.data);
            } catch (error) {
                handleError(error);
            } finally {
                setLoading(false);
            }
        };

        fetchLiveMatches();

        // 실시간 매치 업데이트를 위한 인터벌 설정
        const intervalId = setInterval(fetchLiveMatches, 60000); // 1분마다 업데이트

        return () => clearInterval(intervalId);
    }, []);

    // 날짜 범위 체크 유틸리티 함수
    const isWithinDateRange = (date: Date, range: DateRange | undefined) => {
        if (!range?.from || !range?.to) return true;
        return date >= range.from && date <= range.to;
    };

    // 매치 필터링 및 정렬 로직
    const getFilteredMatches = useCallback(() => {
        let filtered = [...matches];

        // 탭 기반 필터링 (경기 상태별)
        if (activeTab !== 'all') {
            filtered = filtered.filter((match) => {
                switch (activeTab) {
                    case 'live':
                        return match.status === 'IN_PLAY';
                    case 'upcoming':
                        return match.status === 'SCHEDULED';
                    case 'finished':
                        return match.status === 'FINISHED';
                    default:
                        return true;
                }
            });
        }

        // 날짜 범위 필터링
        if (dateRange?.from && dateRange?.to) {
            filtered = filtered.filter((match) => {
                const matchDate = new Date(match.utcDate);
                return isWithinDateRange(matchDate, dateRange);
            });
        }

        // 정렬
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'DATE_ASC':
                    return (
                        new Date(a.utcDate).getTime() -
                        new Date(b.utcDate).getTime()
                    );
                case 'DATE_DESC':
                    return (
                        new Date(b.utcDate).getTime() -
                        new Date(a.utcDate).getTime()
                    );
                case 'LEAGUE':
                    return a.competition.name.localeCompare(b.competition.name);
                default:
                    return 0;
            }
        });

        return filtered;
    }, [matches, activeTab, dateRange, sortBy]);

    const filteredMatches = useMemo(
        () => getFilteredMatches(),
        [getFilteredMatches]
    );

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div className="container mx-auto px-4 py-8">
            {/* 필터 섹션 */}
            <div className="mb-6 space-y-4">
                <div className="flex flex-wrap gap-4">
                    {/* 정렬 선택 */}
                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-[240px]">
                            <SelectValue placeholder="정렬 방식 선택" />
                        </SelectTrigger>
                        <SelectContent>
                            {sortOptions.map((option) => (
                                <SelectItem
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* 날짜 범위 선택 */}
                    <DateRangePicker
                        from={dateRange?.from}
                        to={dateRange?.to}
                        onSelect={(range) => setDateRange(range)}
                    />
                </div>
            </div>

            <Tabs defaultValue="all" onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="all">전체 경기</TabsTrigger>
                    <TabsTrigger value="live">실시간 경기</TabsTrigger>
                    <TabsTrigger value="upcoming">예정된 경기</TabsTrigger>
                    <TabsTrigger value="finished">종료된 경기</TabsTrigger>
                </TabsList>

                {['all', 'live', 'upcoming', 'finished'].map((tab) => (
                    <TabsContent key={tab} value={tab}>
                        <MatchGrid matches={filteredMatches} />
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}
