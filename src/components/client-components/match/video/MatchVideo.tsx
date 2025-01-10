'use client';

import { useEffect, useState } from 'react';

interface VideoData {
    title: string;
    embed: string; // ScoreBat에서 제공하는 embed 코드
    thumbnail?: string;
    competition: string;
    matchviewUrl?: string;
}

interface MatchVideoProps {
    matchId: string;
    homeTeam: string;
    awayTeam: string;
}

export function MatchVideo({ matchId, homeTeam, awayTeam }: MatchVideoProps) {
    const [videoData, setVideoData] = useState<VideoData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchVideo = async () => {
            try {
                const response = await fetch('/api/scorebat');
                const data = await response.json();

                // ScoreBat의 피드에서 해당 매치의 영상 찾기
                const matchVideo = data.response.find(
                    (video: any) =>
                        video.title.includes(homeTeam) &&
                        video.title.includes(awayTeam)
                );

                if (matchVideo) {
                    setVideoData(matchVideo);
                }
            } catch (error) {
                console.error('Failed to fetch video:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchVideo();
    }, [homeTeam, awayTeam]);

    if (loading) {
        return (
            <div className="w-full aspect-video bg-gray-200 animate-pulse rounded-lg" />
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
        <div className="w-full aspect-video rounded-lg overflow-hidden">
            <div
                dangerouslySetInnerHTML={{ __html: videoData.embed }}
                className="w-full h-full"
            />
        </div>
    );
}
