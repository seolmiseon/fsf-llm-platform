import { YouTubeHighlight, YouTubeHighlightResponse } from '@/types/api/score-match';
import { ApiResponse } from '@/types/api/responses';

export class YouTubeHighlightApi {
    private readonly baseUrl = '/api/youtube-highlights';

    async getMatchHighlights(
        homeTeam: string,
        awayTeam: string,
        matchDate: string
    ): Promise<ApiResponse<YouTubeHighlight[]>> {
        try {
            const query = `${homeTeam} vs ${awayTeam} highlights`;
            const response = await fetch(
                `${this.baseUrl}?q=${encodeURIComponent(query)}`
            );

            if (!response.ok) {
                return {
                    success: false,
                    error: `Failed to fetch highlights: ${response.statusText}`,
                };
            }

            const data: YouTubeHighlightResponse = await response.json();
            
            const highlights: YouTubeHighlight[] = data.items.map(item => ({
                videoId: item.id.videoId,
                title: item.snippet.title,
                thumbnail: item.snippet.thumbnails.medium.url,
                publishedAt: item.snippet.publishedAt,
            }));

            return {
                success: true,
                data: highlights,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch highlights',
            };
        }
    }
}