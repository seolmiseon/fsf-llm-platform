export * from './football-data';
export * from './score-match';
export * from './sports-db';

// 2. 이미지 관련 타입을 이 파일에서 직접 정의
export interface TeamImages {
    teamBadge?: string;
    teamJersey?: string;
    teamLogo?: string;
    teamBanner?: string;
    stadium?: string;
    badge?: string; // 통합된 이미지 필드 추가
}

// 3. 기본 엔티티 타입 (공통 필드)
export interface BaseEntity {
    id: number;
    name: string;
}

// 4. 팀 관련 타입들의 계층 구조 개선
export interface TeamBase extends BaseEntity {
    shortName: string;
    tla: string;
    crest?: string;
}

export interface Coach extends BaseEntity {
    dateOfBirth: string;
    nationality: string;
    image?: string;
}

// 5. 선수 관련 타입들을 더 명확하게 정의
export interface PlayerInfo {
    id: number;
    name: string;
    position: string; // Football-Data API 제공
    dateOfBirth: string; // Football-Data API 제공
    nationality: string; // Football-Data API 제공
    shirtNumber?: number; // Football-Data API 제공
    image?: string; // TheSportsDB API 제공
    description?: string; // TheSportsDB API 제공
    height?: string; // TheSportsDB API 제공
    weight?: string; // TheSportsDB API 제공
}

// 선수 상세 정보 (모든 정보를 통합)
export interface PlayerDetailedInfo extends PlayerInfo {
    currentTeam: {
        id: number;
        name: string;
        joined: string; // 입단일
        contractUntil?: string; // 계약 만료일
    };
    physicalStats?: {
        height: number; // 키 (cm)
        weight: number; // 몸무게 (kg)
        preferredFoot?: 'left' | 'right' | 'both'; // 주발
    };
    marketValue?: {
        value: number;
        currency: string;
        lastUpdated: string;
    };

    // 선수의 상세 특성/능력치 (선택적)
    attributes?: {
        pace?: number;
        shooting?: number;
        passing?: number;
        dribbling?: number;
        defending?: number;
        physical?: number;
    };
}

export interface SquadMember extends PlayerInfo {
    // 추가적인 스쿼드 멤버 특정 필드들
    currentTeamId: number;
}

// 6. TeamResponse 타입
export interface TeamResponse extends TeamBase {
    address: string;
    website: string;
    founded: number;
    clubColors: string;
    venue: string;
    coach?: Coach; // Coach 인터페이스 사용
    squad: Array<{
        image: string;
        id: number;
        name: string;
        position: string;
        dateOfBirth: string;
        nationality: string;
        shirtNumber?: number;
    }>;
    images?: TeamImages;
    competition?: {
        id: number;
        name: string;
        area: {
            id: number;
            name: string;
            code: string;
            flag?: string;
        };
    };
    competitionId: string;
    organizedSquad?: SquadByPosition; // 포지션별 정리된 스쿼드
}

// 경기 관련 타입들
export interface MatchResponse {
    id: number;
    competition: Competition;
    homeTeam: TeamBase;
    awayTeam: TeamBase;
    score: Score;
    status: string;
    utcDate: string;
    venue: string;
    referee?: string;
}

// 7. 경기 관련 타입들의 명확한 정의
export interface Competition extends BaseEntity {
    filter(arg0: (comp: any) => boolean): unknown;
    // BaseEntity 상속
    area: {
        id: number;
        name: string;
        code: string;
        flag?: string;
    };
    code: string;
    type: string;
    emblem?: string;
    currentSeason?: {
        id: number;
        startDate: string;
        endDate: string;
        currentMatchday: number;
    };
}

export interface Score {
    winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null; // 리터럴 타입으로 제한
    fullTime: {
        home: number | null;
        away: number | null;
    };
    halfTime: {
        home: number | null;
        away: number | null;
    };
}

// 8. 포지션별 스쿼드 타입 정의
export interface SquadByPosition {
    forwards: PlayerInfo[];
    midfielders: PlayerInfo[];
    defenders: PlayerInfo[];
    goalkeepers: PlayerInfo[];
}

// 9. API 응답에 대한 유니온 타입 추가
export type ApiResponse<T> =
    | {
          success: true;
          data: T;
      }
    | {
          success: false;
          error: string;
      };

// 위치 관련 인터페이스
export interface Position {
    x: number;
    y: number;
}

// 모달 차원 인터페이스
export interface ModalDimensions {
    width: number;
    height: number;
}
