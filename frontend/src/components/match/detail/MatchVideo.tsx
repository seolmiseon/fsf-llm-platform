'use client';

import { YouTubeHighlightApi } from '@/lib/client/api/scoreHighlight';
import { YouTubeHighlight } from '@/types/api/score-match';
import { useEffect, useState } from 'react';

interface MatchVideoProps {
    homeTeam: string;
    awayTeam: string;
    utcDate: string;
}

export function MatchVideo({ homeTeam, awayTeam, utcDate }: MatchVideoProps) {
    const [videoData, setVideoData] = useState<YouTubeHighlight | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchVideo = async () => {
            try {
                const api = new YouTubeHighlightApi();
                const result = await api.getMatchHighlights(homeTeam, awayTeam);

                if (result.success && result.data.length > 0) {
                    setVideoData(result.data[0]);
                }
            } catch (err) {
                console.error('Failed to fetch video:', err);
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

    if (!videoData) {
        return (
            <div className="w-full aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Match video not available yet</p>
            </div>
        );
    }

    return (
        <div className="w-full aspect-video rounded-lg overflow-hidden bg-black">
            <iframe
                src={`https://www.youtube.com/embed/${videoData.videoId}`}
                className="w-full h-full"
                frameBorder="0"
                allowFullScreen
                allow="autoplay; fullscreen"
                title={videoData.title}
            />
        </div>
    );
}