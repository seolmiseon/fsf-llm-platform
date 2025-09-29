import { PlayerInfo } from './responses';

export interface VotePlayer extends PlayerInfo {
    voteCount: number;
    league: 'premier' | 'bundesliga' | 'kleague';
}

export interface EventVote {
    id: string;
    monthYear: string; // "2024-02" 형식
    status: 'active' | 'ended';
    players: {
        [playerId: string]: VotePlayer;
    };
}
