import { getDate } from '@/utils/date';
import { MatchHighlight } from '@/types/api/score-match';

export class ScoreBatApi {
    private readonly baseUrl: string;

    constructor() {
        this.baseUrl = '@/app/api/scorebat';
    }

    async getMatchHighlights(
        homeTeam: string,
        awayTeam: string,
        date: string
    ): Promise<MatchHighlight[]> {
        const response = await fetch(this.baseUrl);

        if (!response.ok) {
            throw new Error(
                `Failed to fetch highlights: ${response.statusText}`
            );
        }

        const data = await response.json();
        const matchDateStr = getDate(date);

        return data.response.filter((highlight: MatchHighlight) => {
            const highlightDateStr = getDate(highlight.date);
            const title = highlight.title.toLowerCase();
            return (
                matchDateStr === highlightDateStr &&
                title.includes(homeTeam.toLowerCase()) &&
                title.includes(awayTeam.toLowerCase())
            );
        });
    }
}
