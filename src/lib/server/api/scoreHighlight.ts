import { MatchHighlight } from '@/types/api/score-match';
import { ApiResponse } from '@/types/api/responses';

export class ScoreBatApi {
    private readonly baseUrl: string;

    constructor() {
        this.baseUrl = '/api/scorebat';
    }

    async getMatchHighlights(
        homeTeam: string,
        awayTeam: string,
        matchDate: string
    ): Promise<ApiResponse<MatchHighlight[]>> {
        try {
            const response = await fetch(this.baseUrl);

            if (!response.ok) {
                return {
                    success: false,
                    error: `Failed to fetch highlights: ${response.statusText}`,
                };
            }

            const data = await response.json();
            const matchDay = matchDate.split('T')[0];
            const matchData = data.find(
                (match: MatchHighlight) =>
                    match.title
                        .toLowerCase()
                        .includes(homeTeam.toLowerCase()) &&
                    match.title
                        .toLowerCase()
                        .includes(awayTeam.toLowerCase()) &&
                    match.date.split('T')[0] === matchDay
            );
            return {
                success: true,
                data: matchData ? [matchData] : [],
            };
        } catch (error) {
            return {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : 'Failed to fetch highlights',
            };
        }
    }
}
