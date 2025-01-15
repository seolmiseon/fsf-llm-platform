'use client';

import { useState, useEffect } from 'react';
import { FootballDataApi } from '@/lib/server/api/football-data';
import { Competition } from '@/types/api/responses';
import { Loading } from '@/components/ui/common/loading';
import { Error } from '@/components/ui/common/error';
import Link from 'next/link';
import Image from 'next/image';
import { getPlaceholderImageUrl } from '@/utils/imageUtils';

export default function LeaguesPage() {
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
                        result.error || '데이터를 불러오는데 실패했습니다'
                    );
                    return;
                }

                setCompetitions(result.data);
            } catch (error) {
                setError(
                    error instanceof Error ? error.message : 'Unknown error'
                );
            } finally {
                setLoading(false);
            }
        };

        fetchCompetitions();
    }, []);

    if (loading) return <Loading type="cards" count={5} />;
    if (error) return <Error message={error} />;

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">축구 리그</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {competitions.map((competition) => (
                    <Link
                        key={competition.id}
                        href={`/leagues/${competition.code}`}
                        className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
                    >
                        <div className="flex items-center space-x-4">
                            <div className="relative w-12 h-12">
                                <Image
                                    src={
                                        competition.emblem ||
                                        getPlaceholderImageUrl('league')
                                    }
                                    alt={`${competition.name} emblem`}
                                    fill
                                    className="object-contain"
                                    sizes="(max-width: 768px) 48px, 48px"
                                    onError={(e) => {
                                        const img =
                                            e.target as HTMLImageElement;
                                        img.src =
                                            getPlaceholderImageUrl('league');
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
                ))}
            </div>
        </div>
    );
}
