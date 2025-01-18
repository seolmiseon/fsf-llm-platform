'use client';

import { useState, useEffect } from 'react';
import { FootballDataApi } from '@/lib/server/api/football-data';
import { Competition } from '@/types/api/responses';
import { Loading } from '@/components/ui/common/loading';
import { Error } from '@/components/ui/common/error';
import Link from 'next/link';
import Image from 'next/image';
import { getPlaceholderImageUrl } from '@/utils/imageUtils';

export default function LeaguePage() {
    const [competitions, setCompetitions] = useState<Competition[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCompetitions = async () => {
            try {
                setLoading(true);
                const api = new FootballDataApi();

                const result = await api.getCompetitions();

                if (!result.success) {
                    setError(
                        result.error || '리그 정보를 불러오는데 실패했습니다'
                    );
                    return;
                }

                setCompetitions(result.data);
            } catch (err) {
                console.error('리그 데이터 로딩 중 오류:', err);
                setError('알 수 없는 오류가 발생했습니다');
            } finally {
                setLoading(false);
            }
        };

        fetchCompetitions();
    }, []);

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold mb-6">축구 리그</h1>
                <Loading type="cards" count={5} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold mb-6">축구 리그</h1>
                <Error
                    message={error}
                    // [추가] 재시도 기능 추가
                    retry={() => window.location.reload()}
                />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">축구 리그</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {competitions.length > 0 ? (
                    competitions.map((competition) => (
                        <Link
                            key={competition.id}
                            href={`/league/${competition.code}`}
                            className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
                        >
                            <div className="flex items-center space-x-4">
                                <div className="relative w-12 h-12">
                                    <Image
                                        src={
                                            competition.emblem ||
                                            getPlaceholderImageUrl('league')
                                        }
                                        alt={`${competition.name} 엠블럼`}
                                        fill
                                        className="object-contain"
                                        sizes="(max-width: 768px) 48px, 48px"
                                        onError={(e) => {
                                            const img =
                                                e.target as HTMLImageElement;
                                            img.src =
                                                getPlaceholderImageUrl(
                                                    'league'
                                                );
                                        }}
                                    />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold">
                                        {competition.name}
                                    </h2>
                                    <p className="text-gray-600">
                                        {competition.area.name}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="col-span-full text-center py-8">
                        <p className="text-gray-600">표시할 리그가 없습니다.</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                            새로고침
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
