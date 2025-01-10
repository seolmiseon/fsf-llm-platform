import { Error, Loading } from '@/components/ui/common';
import { FootballDataApi } from '@/lib/server/api/football-data';
import { MatchResponse } from '@/types/api/responses';
import Image from 'next/image';
import * as Tabs from '@radix-ui/react-tabs';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from './styles.module.css';
import { getPlaceholderImageUrl } from '@/utils/imageUtils';

export default function MatchDetailPage() {
    const params = useParams();
    const [match, setMatch] = useState<MatchResponse>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadMatchDetails = async () => {
            try {
                setLoading(true);
                const api = new FootballDataApi();
                const result = await api.getMatch(params.matchId as string);

                if (!result.success) {
                    setError(result.error);
                    return;
                }
                setMatch(result.data);
            } catch (error) {
            } finally {
                setLoading(false);
            }
        };

        loadMatchDetails();
    }, [params]);

    if (loading) return <Loading />;
    if (error) return <Error message={error} />;
    if (!match) return null;

    return (
        <div className={styles.container}>
            {/* 리그 정보 헤더 */}
            <div className={styles.header}>
                <Image
                    src={
                        match.competition.emblem ||
                        getPlaceholderImageUrl('badge')
                    }
                    alt={match.competition.name || '대회 엠블럼'}
                    width={40}
                    height={40}
                />
                <h1 className={styles.headerTitle}>{match.competition.name}</h1>
                {match.status === 'IN_PLAY' && (
                    <span className={styles.liveBadge}>Live</span>
                )}
            </div>

            <div className={styles.mainContent}>
                {/* 메인 스코어보드 섹션 */}
                <div className={styles.scoreboardSection}>
                    <div className={styles.scoreboardCard}>
                        <div className={styles.matchInfo}>
                            {/* 홈팀 */}
                            {/* <TeamDisplay team={match.homeTeam} align="right" /> */}

                            {/* 스코어 */}
                            {/* <ScoreDisplay match={match} /> */}

                            {/* 원정팀 */}
                            {/* <TeamDisplay team={match.awayTeam} align="left" /> */}
                        </div>

                        {/* 경기장 & 심판 정보 */}
                        <div className={styles.matchInfo}>
                            <p>{match.venue}</p>
                            {match.referee && <p>{match.referee}</p>}
                        </div>
                    </div>
                </div>

                {/* 우측 통계 탭 */}
                <div className={styles.statsSection}>
                    <Tabs.Root
                        defaultValue="details"
                        className={styles.tabsRoot}
                    >
                        <Tabs.TabsList className={styles.tabsList}>
                            <Tabs.TabsTrigger
                                value="details"
                                className={styles.tabsTrigger}
                            >
                                Match Detail
                            </Tabs.TabsTrigger>
                            <Tabs.TabsTrigger
                                value="liveup"
                                className={styles.tabsTrigger}
                            >
                                Live up
                            </Tabs.TabsTrigger>
                            <Tabs.TabsTrigger
                                value="stats"
                                className={styles.tabsTrigger}
                            >
                                Statistics
                            </Tabs.TabsTrigger>
                            <Tabs.TabsTrigger
                                value="position"
                                className={styles.tabsTrigger}
                            >
                                Position table
                            </Tabs.TabsTrigger>
                        </Tabs.TabsList>

                        <Tabs.TabsContent
                            value="details"
                            className={styles.tabsContent}
                        >
                            {/* <MatchStatistics statistics={match.statistics} /> */}
                        </Tabs.TabsContent>

                        <Tabs.TabsContent
                            value="liveup"
                            className={styles.tabsContent}
                        >
                            {/* <LineupDisplay lineup={match.lineup} /> */}
                        </Tabs.TabsContent>

                        <Tabs.Content
                            value="stats"
                            className={styles.tabsContent}
                        >
                            {/* 통계 내용 */}
                        </Tabs.Content>

                        <Tabs.Content
                            value="position"
                            className={styles.tabsContent}
                        >
                            {/* 포지션 테이블 내용 */}
                        </Tabs.Content>
                        {/* 추가 탭 컨텐츠... */}
                    </Tabs.Root>
                </div>
            </div>
        </div>
    );
}
