import { getDate } from '@/utils/date';
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
        date: string
    ): Promise<ApiResponse<MatchHighlight[]>> {
        const response = await fetch(this.baseUrl);

        if (!response.ok) {
            return {
                success: false,
                error: `Failed to fetch highlights: ${response.statusText}`,
            };
        }

        const data = await response.json();
        const matchDateStr = getDate(date);

        const filteredHighlights = data.response.filter(
            (highlight: MatchHighlight) => {
                const highlightDateStr = getDate(highlight.date);
                const title = highlight.title.toLowerCase();
                return (
                    matchDateStr === highlightDateStr &&
                    title.includes(homeTeam.toLowerCase()) &&
                    title.includes(awayTeam.toLowerCase())
                );
            }
        );

        return {
            success: true,
            data: filteredHighlights,
        };
    }
    catch(error: unknown) {
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : 'Failed to fetch highlights',
        };
    }
}
