import { SquadMember } from './responses';

export interface Area {
    name: string;
    code: string;
    id?: number;
    flag?: string;
}

export interface StandingTeam {
    position: number;
    team: {
        id: number;
        name: string;
        crest: string;
    };
    playedGames: number;
    won: number;
    draw: number;
    lost: number;
    points: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    form?: string;
    lastUpdated?: string;
    streak?: {
        wins: number;
        draws: number;
        losses: number;
    };
}

export interface Standing {
    stage: 'REGULAR_SEASON' | 'GROUP_STAGE' | 'FINAL';
    type: 'TOTAL' | 'HOME' | 'AWAY';
    table: StandingTeam[];
}

export interface StandingsResponse {
    filters: Record<string, unknown>;
    competition: {
        id: number;
        name: string;
        code: string;
        type: string;
    };
    season: {
        id: number;
        startDate: string;
        endDate: string;
        currentMatchday: number;
    };
    standings: Standing[];
}

export interface MatchStatistic {
    type:
        | 'BALL_POSSESSION'
        | 'SHOTS'
        | 'SHOTS_ON_GOAL'
        | 'PASSES'
        | 'FOULS'
        | 'CORNER_KICKS'; // API 응답 형식에 맞춤
    home: string; // API가 문자열로 반환할 수 있음 (예: "60%")
    away: string;
}

export interface MatchStatistics {
    matchId: number;
    statistics: MatchStatistic[];
    teams: {
        home: {
            id: number;
            name: string;
        };
        away: {
            id: number;
            name: string;
        };
    };
}

export interface TeamLineup {
    name: string;
    formation: string;
    startingXI: SquadMember[];
    substitutes: SquadMember[];
    coach: {
        name: string;
        nationality: string;
    };
}

export interface MatchLineup {
    matchId: number;
    status: string;
    kickoff?: string;
    homeTeam: TeamLineup;
    awayTeam: TeamLineup;
}
