import { getPlaceholderImageUrl } from '@/utils/imageUtils';
import { FootballDataApi } from './football-data';
import { ScoreBatApi } from './scoreHighlight';
import { SportsDBApi } from './sportsDB';
import {
    MatchResponse,
    SquadByPosition,
    TeamResponse,
    TeamImages,
} from '@/types/api/responses';
import { MatchHighlight } from '@/types/api/score-match';

export class TeamData {
    private footballDataApi: FootballDataApi;
    private scoreBatApi: ScoreBatApi;
    private sportsDBApi: SportsDBApi;

    constructor() {
        this.footballDataApi = new FootballDataApi();
        this.scoreBatApi = new ScoreBatApi();
        this.sportsDBApi = new SportsDBApi();
    }

    async getTeamDetailedInfo(
        competitionId: string,
        teamName: string
    ): Promise<TeamResponse> {
        try {
            // 리그존재 여부 확인하기
            const competitionResponse =
                await this.footballDataApi.getCompetition(competitionId);
            const competition = competitionResponse.success
                ? competitionResponse.data
                : null;
            if (!competition) {
                throw new Error(
                    `Competition with ID ${competitionId} not found`
                );
            }

            // 팀목록 가져오기
            const teamsResponse =
                await this.footballDataApi.getTeamsByCompetition(competitionId);
            const teams = teamsResponse.success ? teamsResponse.data : [];
            const team = teams.find((t) => t.name === teamName);

            if (!team) {
                throw new Error(
                    `Team ${teamName} not found in competition ${competition.name}`
                );
            }

            // 이미지 정보 가져오기
            let teamImages: TeamImages = {};
            try {
                const imagesResponse = await this.sportsDBApi.getTeamImages(
                    team.name
                );
                if (imagesResponse.success) {
                    teamImages = imagesResponse.data;
                }
            } catch (imageError) {
                console.warn('Failed to fetch team images:', imageError);
            }

            return {
                ...team,
                images: {
                    badge:
                        teamImages.teamBadge ||
                        team.crest ||
                        getPlaceholderImageUrl('badge'),
                    stadium:
                        teamImages.stadium || '/images/default-stadium.png',
                },
                squad: team.squad,
                organizedSquad: this.organizeSquadByPosition(team.squad),
                competition: {
                    id: competition.id,
                    name: competition.name,
                    area: competition.area,
                },
            };
        } catch (error) {
            console.error('Error in getTeamDetailedInfo:', error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Failed to fetch team information');
        }
    }

    async getMatchDetails(
        matchId: string
    ): Promise<MatchResponse & { highlights: MatchHighlight[] }> {
        try {
            const matchResponse = await this.footballDataApi.getMatch(matchId);
            const match = matchResponse.success ? matchResponse.data : null;
            if (!match) {
                throw new Error('Failed to fetch match details');
            }

            let highlights: MatchHighlight[] = [];
            try {
                const highlightsResponse =
                    await this.scoreBatApi.getMatchHighlights(
                        match.homeTeam.name,
                        match.awayTeam.name,
                        match.utcDate
                    );
                highlights = highlightsResponse.success
                    ? highlightsResponse.data
                    : [];
            } catch (highlightError) {
                console.warn('Failed to fetch highlights:', highlightError);
            }

            return {
                ...match,
                highlights,
            };
        } catch (error) {
            console.error('Error in getMatchDetails:', error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Failed to fetch match details');
        }
    }

    private organizeSquadByPosition(
        squad: TeamResponse['squad']
    ): SquadByPosition {
        const positionMap = new Map([
            ['forward', 'forwards'],
            ['striker', 'forwards'],
            ['midfielder', 'midfielders'],
            ['defender', 'defenders'],
            ['goalkeeper', 'goalkeepers'],
        ]);

        return {
            forwards: squad.filter(
                (p) => positionMap.get(p.position.toLowerCase()) === 'forwards'
            ),
            midfielders: squad.filter(
                (p) =>
                    positionMap.get(p.position.toLowerCase()) === 'midfielders'
            ),
            defenders: squad.filter(
                (p) => positionMap.get(p.position.toLowerCase()) === 'defenders'
            ),
            goalkeepers: squad.filter(
                (p) =>
                    positionMap.get(p.position.toLowerCase()) === 'goalkeepers'
            ),
        };
    }
}
