export interface YouTubeHighlight {
    videoId: string;
    title: string;
    thumbnail: string;
    publishedAt: string;
}

export interface YouTubeHighlightResponse {
    items: Array<{
        id: { videoId: string };
        snippet: {
            title: string;
            thumbnails: { 
                medium: { url: string };
            };
            publishedAt: string;
        };
    }>;
}

export interface MatchHighlight {
    videos?: Array<{
        embed: string;
        matchingUrl?: string;
    }>;
}