export interface MatchVideo {
    title: string;
    embed: string;
}

export interface MatchHighlight {
    title: string;
    competition: string;
    competitionUrl: string;
    matchviewUrl: string;
    thumbnail: string;
    date: string;
    videos: MatchVideo[];
}

export interface ScoreBatResponse {
    response: MatchHighlight[];
}
