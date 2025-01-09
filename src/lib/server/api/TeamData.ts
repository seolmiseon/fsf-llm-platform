import { FootballDataApi } from './football-data';
import { ScoreBatApi } from './scoreHighlight';
import { SportsDBApi } from './sportsDB';
import {
    MatchResponse,
    SquadByPosition,
    TeamResponse,
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
            const competition = await this.footballDataApi.getCompetition(
                competitionId
            );
            if (!competition) {
                throw new Error(
                    `Competition with ID ${competitionId} not found`
                );
            }

            // 팀목록 가져오기기
            const teams = await this.footballDataApi.getTeamsByCompetition(
                competitionId
            );
            const team = teams.find((t) => t.name === teamName);

            if (!team) {
                throw new Error(
                    `Team ${teamName} not found in competition ${competition.name}`
                );
            }

            // 3. 이미지 정보 가져오기 (SportsDB API는 별도의 제한이 있음)
            let teamImages;

            try {
                teamImages = await this.sportsDBApi.getTeamImages(team.name);
            } catch (imageError) {
                console.warn('Failed to fetch team images:', imageError);
                teamImages = {};
            }
            return {
                ...team,
                images: {
                    ...teamImages,
                    badge:
                        teamImages.teamBadge ||
                        team.crest ||
                        '/assets/default-badge.png',
                    stadium:
                        teamImages.stadium || '/assets/default-stadium.png',
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
                throw error; // 구체적인 에러 메시지 유지
            }
            throw new Error('Failed to fetch team information');
        }
    }

    async getMatchDetails(
        matchId: string
    ): Promise<MatchResponse & { highlights: MatchHighlight[] }> {
        try {
            const match = await this.footballDataApi.getMatch(matchId);

            let highlights: MatchHighlight[] = [];
            try {
                highlights = await this.scoreBatApi.getMatchHighlights(
                    match.homeTeam.name,
                    match.awayTeam.name,
                    match.utcDate
                );
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
