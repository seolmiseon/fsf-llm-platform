'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { DateRangePicker } from '@/components/ui/dateRangePicker';
import { FootballDataApi } from '@/lib/server/api/football-data';
import { MatchGrid } from '@/components/match/gird/MatchGrid';
import { MatchResponse } from '@/types/api/responses';
import { type DateRange } from 'react-day-picker';
import styles from './styles.module.css';

export default function MatchesPage() {
    const [matches, setMatches] = useState<MatchResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    const handleError = (error: unknown) => {
        const errorMessage =
            error instanceof Error
                ? error.message
                : '예상치 못한 오류가 발생했습니다';
        setError(errorMessage);
        console.error('Error:', error);
    };

    useEffect(() => {
        const fetchMatches = async () => {
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

        fetchMatches();
        const intervalId = setInterval(fetchMatches, 60000);

        return () => clearInterval(intervalId);
    }, []);

    const isWithinDateRange = (date: Date, range: DateRange | undefined) => {
        if (!range?.from || !range?.to) return true;
        return date >= range.from && date <= range.to;
    };

    const getFilteredMatches = useCallback(() => {
        let filtered = [...matches];

        if (dateRange?.from && dateRange?.to) {
            filtered = filtered.filter((match) => {
                const matchDate = new Date(match.utcDate);
                return isWithinDateRange(matchDate, dateRange);
            });
        }

        // 날짜 기준 정렬 (최신순)
        filtered.sort(
            (a, b) =>
                new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime()
        );

        return filtered;
    }, [matches, dateRange]);

    const filteredMatches = useMemo(
        () => getFilteredMatches(),
        [getFilteredMatches]
    );

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-6 space-y-4">
                <div className="flex flex-wrap gap-4 justify-center">
                    <DateRangePicker
                        from={dateRange?.from}
                        to={dateRange?.to}
                        onSelect={(range) => setDateRange(range)}
                        className={styles.calendar}
                    />
                </div>
            </div>
            <MatchGrid matches={filteredMatches} />
        </div>
    );
}
