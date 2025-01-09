// 모달 관련 타입들
export type ModalType = 'teamDetail' | 'personDetail' | 'search' | 'logout';

// 팀 모달 데이터 인터페이스
export interface TeamModalData {
    kind: 'team';
    teamId: string;
    competitionId: string;
    position?: {
        x: number;
        y: number;
    };
}

// 선수/감독 모달 데이터 인터페이스
export interface PersonModalData {
    kind: 'person';
    id: number;
    name: string;
    position: string;
    image?: string;
    nationality: string;
    shirtNumber?: number;
    teamId: string; // 소속팀 ID
    description?: string; // 추가 설명 (있는 경우)
    dateOfBirth: string;
    currentTeam: {
        id: number;
        name: string;
        joined: string;
        contractUntil?: string;
    };
    height?: string;
    weight?: string;
}

export interface SearchModalData {
    kind: 'search';
    query?: string;
    page?: number;
}

export type ModalData = TeamModalData | PersonModalData | SearchModalData;

// 모달 상태 인터페이스
export interface ModalState {
    isOpen: boolean;
    type: ModalType | null;
    data: ModalData | null;
    position?: {
        x: number;
        y: number;
    };
    previousModal?: {
        type: ModalType;
        data: ModalData;
    };
}
