export function formatMatchTime(
    utcDate: string,
    status: string,
    minute?: number
): string {
    // 경기가 진행 중인 경우
    if (status === 'IN_PLAY' && minute) {
        // 추가시간이 있는 경우 (예: 90+3)
        if (minute > 90) {
            return `90+${minute - 90}'`;
        }
        return `${minute}'`;
    }

    // 경기 상태별 특수 표시
    switch (status) {
        case 'PAUSED':
            return 'HT'; // Half Time
        case 'FINISHED':
            return 'FT'; // Full Time
        case 'SCHEDULED':
            // UTC 시간을 현지 시간으로 변환
            const date = new Date(utcDate);
            return date.toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            });
        default:
            return status;
    }
}
