export interface MatchHighlight {
    title: string;
    embed: string;
    url: string;
    thumbnail: string;
    date: string;
    competition: string;
}

export interface ScoreBatResponse {
    response: MatchHighlight[];
}
