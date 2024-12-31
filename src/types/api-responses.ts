export interface Competition {
    id: number;
    name: string;
    area: {
        name: string;
        code: string;
    };
    code: string;
    type: string;
    emblem?: string;
}

export interface MatchResponse {
    id: number;
    competition: {
        id: number;
        name: string;
        area: {
            name: string;
            code: string;
        };
    };
    homeTeam: {
        id: number;
        name: string;
        shortName: string;
        tla: string;
    };
    awayTeam: {
        id: number;
        name: string;
        shortName: string;
        tla: string;
    };
    score: {
        winner: string | null;
        fullTime: {
            home: number | null;
            away: number | null;
        };
        halfTime: {
            home: number | null;
            away: number | null;
        };
    };
    status: string;
    utcDate: string;
    venue: string;
}
