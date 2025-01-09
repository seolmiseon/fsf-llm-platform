export interface MatchHighlight {
    title: string;
    competition: string;
    matchviewUrl: string;
    competitionUrl: string;
    thumbnail: string;
    date: string;
    videos: Array<{
        id: string;
        title: string;
        embed: string;
    }>;
}
