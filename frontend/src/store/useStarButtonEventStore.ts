import { create } from 'zustand';

interface StarButtonEventStore {
    /**
     * 현재 클릭된 StarButton의 타임스탬프
     * 버튼 클릭 시 설정되고, Card에서 확인하여 이벤트를 차단
     */
    lastButtonClickTime: number | null;
    
    /**
     * StarButton 클릭 이벤트 발생 시 호출
     * Card 컴포넌트가 이를 확인하여 onClick을 차단
     */
    registerButtonClick: () => void;
    
    /**
     * 특정 시간 이후의 클릭인지 확인
     * Card의 onClick에서 호출하여 버튼 클릭인지 판단
     */
    isRecentButtonClick: (thresholdMs?: number) => boolean;
    
    /**
     * 클릭 상태 초기화
     */
    clearButtonClick: () => void;
}

export const useStarButtonEventStore = create<StarButtonEventStore>((set, get) => ({
    lastButtonClickTime: null,
    
    registerButtonClick: () => {
        const now = Date.now();
        console.log('⭐ [Store] StarButton 클릭 등록:', now);
        set({ lastButtonClickTime: now });
        
        // 100ms 후 자동으로 초기화 (메모리 누수 방지)
        setTimeout(() => {
            const current = get().lastButtonClickTime;
            if (current === now) {
                set({ lastButtonClickTime: null });
            }
        }, 100);
    },
    
    isRecentButtonClick: (thresholdMs = 50) => {
        const { lastButtonClickTime } = get();
        if (!lastButtonClickTime) return false;
        
        const elapsed = Date.now() - lastButtonClickTime;
        const isRecent = elapsed <= thresholdMs;
        
        if (isRecent) {
            console.log('🛑 [Store] 최근 StarButton 클릭 감지됨:', elapsed, 'ms 전');
        }
        
        return isRecent;
    },
    
    clearButtonClick: () => {
        set({ lastButtonClickTime: null });
    },
}));
