import { MatchHighlight } from '@/types/highlights';

export class ScoreBatApi {
    private readonly baseUrl = 'https://www.scorebat.com/video-api/v3';
    private readonly apiKey: string;

    constructor() {
        const apiKey = process.env.NEXT_PUBLIC_SCOREBAT_API_KEY;

        if (!apiKey) {
            throw new Error('Missing ScoreBat API configuration');
        }

        this.apiKey = apiKey;
    }

    async getMatchHighlights(
        homeTeam: string,
        awayTeam: string,
        date: string
    ): Promise<MatchHighlight[]> {
        const response = await fetch(`${this.baseUrl}?token=${this.apiKey}`);

        if (!response.ok) {
            throw new Error(
                `Failed to fetch highlights: ${response.status} ${response.statusText}`
            );
        }

        const data = await response.json();
        const matchDate = new Date(date);

        return data.response.filter((highlight: MatchHighlight) => {
            const highlightDate = new Date(highlight.date);
            const isSameDay =
                highlightDate.getFullYear() === matchDate.getFullYear() &&
                highlightDate.getMonth() === matchDate.getMonth() &&
                highlightDate.getDate() === matchDate.getDate();

            const title = highlight.title.toLowerCase();
            const homeTeamLower = homeTeam.toLowerCase();
            const awayTeamLower = awayTeam.toLowerCase();

            return (
                isSameDay &&
                title.includes(homeTeamLower) &&
                title.includes(awayTeamLower)
            );
        });
    }
}
