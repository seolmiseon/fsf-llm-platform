'use client';

import { ScoreBatApi } from '@/lib/server/api/scoreHighlight';
import { MatchHighlight } from '@/types/api/score-match';
import { useEffect, useState } from 'react';

interface MatchVideoProps {
    homeTeam: string;
    awayTeam: string;
    utcDate: string;
    matchingUrl: string;
}

export function MatchVideo({ homeTeam, awayTeam, utcDate }: MatchVideoProps) {
    const [videoData, setVideoData] = useState<MatchHighlight | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchVideo = async () => {
            try {
                const api = new ScoreBatApi();
                const result = await api.getMatchHighlights(
                    homeTeam,
                    awayTeam,
                    utcDate
                );

                if (result.success && result.data.length > 0) {
                    setVideoData(result.data[0]);
                }
            } catch (error) {
                console.error('Failed to fetch video:', error);
                setError('Failed to load video');
            } finally {
                setLoading(false);
            }
        };

        fetchVideo();
    }, [homeTeam, awayTeam, utcDate]);

    if (loading) {
        return (
            <div className="w-full aspect-video bg-gray-200 animate-pulse rounded-lg" />
        );
    }

    if (error) {
        return (
            <div className="w-full aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">{error}</p>
            </div>
        );
    }

    if (!videoData || !videoData.videos?.[0]) {
        return (
            <div className="w-full aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Match video not available yet</p>
            </div>
        );
    }

    return (
        <div className="w-full aspect-video rounded-lg overflow-hidden">
            <div className="relative w-full h-0 pb-[56.25%] bg-black">
                <iframe
                    src={videoData.videos[0].matchingUrl}
                    className="absolute top-0 left-0 w-full h-full"
                    frameBorder="0"
                    allowFullScreen
                    allow="autoplay; fullscreen"
                />
            </div>
        </div>
    );
}

{
    /* <div className="w-full aspect-video rounded-lg overflow-hidden">
<div
    dangerouslySetInnerHTML={{ __html: videoData.videos[0].embed }}
    className="w-full h-full"
/>
</div> */
}
