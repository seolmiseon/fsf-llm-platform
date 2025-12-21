'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { BackendApi } from '@/lib/client/api/backend';
import { Trophy, Target, Users } from 'lucide-react';

interface PlayerStat {
    rank: number;
    name: string;
    team: string;
    goals: number;
    assists: number;
    espn_id: number;
}

export default function StatsPage() {
    const [league, setLeague] = useState('프리미어리그');
    const [topScorers, setTopScorers] = useState<PlayerStat[]>([]);
    const [topAssists, setTopAssists] = useState<PlayerStat[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'scorers' | 'assists'>('scorers');

    const backendApi = useMemo(() => new BackendApi(), []);

    const leagues = [
        '프리미어리그',
        '라리가',
        '분데스리가',
        '세리에A',
        '리그1',
        'MLS',
        '챔피언스리그'
    ];

    const normalize = (list: Array<Partial<PlayerStat>>): PlayerStat[] =>
        list.map((item, idx) => ({
            rank: item.rank ?? idx + 1,
            name: item.name ?? 'Unknown',
            team: item.team ?? 'Unknown',
            goals: item.goals ?? 0,
            assists: item.assists ?? 0,
            espn_id: item.espn_id ?? idx,
        }));

    const fetchStats = useCallback(async () => {
        setIsLoading(true);
        try {
            const [scorersRes, assistsRes] = await Promise.all([
                backendApi.getTopScorers(league, 20),
                backendApi.getTopAssists(league, 20)
            ]);

            if (scorersRes.success && scorersRes.data?.data) {
                setTopScorers(normalize(scorersRes.data.data));
            } else {
                setTopScorers([]);
                console.error('득점 순위 로드 실패:', scorersRes.error || '알 수 없는 오류');
            }

            if (assistsRes.success && assistsRes.data?.data) {
                setTopAssists(normalize(assistsRes.data.data));
            } else {
                setTopAssists([]);
                console.error('어시스트 순위 로드 실패:', assistsRes.error || '알 수 없는 오류');
            }
        } catch (error) {
            console.error('통계 로드 실패:', error);
            setTopScorers([]);
            setTopAssists([]);
        } finally {
            setIsLoading(false);
        }
    }, [backendApi, league]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            {/* 헤더 */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                    <Trophy className="w-10 h-10 text-yellow-500" />
                    축구 통계
                </h1>
                <p className="text-gray-600">리그별 득점왕, 어시스트왕 순위</p>
            </div>

            {/* 리그 선택 */}
            <div className="mb-6">
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {leagues.map((l) => (
                        <button
                            key={l}
                            onClick={() => setLeague(l)}
                            className={`
                                px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all
                                ${league === l
                                    ? 'bg-purple-600 text-white shadow-lg'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }
                            `}
                        >
                            {l}
                        </button>
                    ))}
                </div>
            </div>

            {/* 탭 선택 */}
            <div className="mb-6 border-b border-gray-200">
                <div className="flex gap-1">
                    <button
                        onClick={() => setActiveTab('scorers')}
                        className={`
                            px-6 py-3 font-medium transition-all relative
                            ${activeTab === 'scorers'
                                ? 'text-purple-600 border-b-2 border-purple-600'
                                : 'text-gray-600 hover:text-gray-900'
                            }
                        `}
                    >
                        <div className="flex items-center gap-2">
                            <Target className="w-5 h-5" />
                            득점 순위
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('assists')}
                        className={`
                            px-6 py-3 font-medium transition-all relative
                            ${activeTab === 'assists'
                                ? 'text-purple-600 border-b-2 border-purple-600'
                                : 'text-gray-600 hover:text-gray-900'
                            }
                        `}
                    >
                        <div className="flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            어시스트 순위
                        </div>
                    </button>
                </div>
            </div>

            {/* 로딩 */}
            {isLoading && (
                <div className="text-center py-12">
                    <div className="inline-block w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-gray-600">통계 로딩 중...</p>
                </div>
            )}

            {/* 통계 테이블 */}
            {!isLoading && (
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-semibold">순위</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold">선수</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold">팀</th>
                                {activeTab === 'scorers' ? (
                                    <>
                                        <th className="px-6 py-4 text-center text-sm font-semibold">득점</th>
                                        <th className="px-6 py-4 text-center text-sm font-semibold">도움</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="px-6 py-4 text-center text-sm font-semibold">도움</th>
                                        <th className="px-6 py-4 text-center text-sm font-semibold">득점</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {(activeTab === 'scorers' ? topScorers : topAssists).map((player, index) => (
                                <tr
                                    key={player.espn_id}
                                    className={`
                                        hover:bg-gray-50 transition-colors
                                        ${index < 3 ? 'bg-yellow-50' : ''}
                                    `}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {index === 0 && <span className="text-2xl">🥇</span>}
                                            {index === 1 && <span className="text-2xl">🥈</span>}
                                            {index === 2 && <span className="text-2xl">🥉</span>}
                                            <span className="font-semibold text-gray-700">
                                                {player.rank}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">
                                            {player.name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {player.team}
                                    </td>
                                    {activeTab === 'scorers' ? (
                                        <>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                                                    {player.goals} ⚽
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center text-gray-600">
                                                {player.assists}
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                                                    {player.assists} 🅰️
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center text-gray-600">
                                                {player.goals}
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* 데이터 없음 */}
                    {(activeTab === 'scorers' ? topScorers : topAssists).length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            해당 리그의 통계가 없습니다.
                        </div>
                    )}
                </div>
            )}

            {/* 푸터 정보 */}
            <div className="mt-8 text-center text-sm text-gray-500">
                <p>데이터 출처: ESPN 스크래핑 (580명 선수 데이터)</p>
               
            </div>
        </div>
    );
}
