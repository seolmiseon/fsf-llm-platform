import { TeamImages } from '@/types/teams';

export class SportsDBApi {
    private readonly baseUrl: string;
    private readonly apiKey: string;

    constructor() {
        const baseUrl = process.env.NEXT_PUBLIC_SPORTS_DB_BASE_URL;
        const apiKey = process.env.NEXT_PUBLIC_SPORTS_DB_API_KEY;

        if (!baseUrl || !apiKey) {
            throw new Error('Missing SportsDB API configuration');
        }

        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
    }

    async getTeamImages(teamName: string): Promise<TeamImages> {
        const response = await fetch(
            `${this.baseUrl}/searchteams.php?t=${teamName}&api_key=${this.apiKey}}`
        );
        if (!response.ok) {
            throw new Error(
                `Failed to fetch team images: ${response.status} ${response.statusText}`
            );
        }

        const data = await response.json();
        return {
            teamBadge: data.teams?.[0]?.strTeamBadge ?? undefined,
            teamJersey: data.teams?.[0]?.strTeamJersey ?? undefined,
            teamLogo: data.teams?.[0]?.strTeamLogo ?? undefined,
            teamBanner: data.teams?.[0]?.strTeamBanner ?? undefined,
            stadium: data.teams?.[0]?.strStadiumThumb ?? undefined,
        };
    }
}
