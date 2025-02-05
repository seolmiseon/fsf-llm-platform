export interface MatchHighlight {
    title: string;
    competition: string;
    competitionUrl: string;
    matchviewUrl: string;
    thumbnail: string;
    date: string;
    embed: string;
}

export interface ScoreBatResponse {
    response: MatchHighlight[];
}
