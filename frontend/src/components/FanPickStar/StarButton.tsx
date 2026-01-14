'use client';

import React from 'react';

interface StarButtonProps {
    /**
     * 즐겨찾기 상태 (true: 즐겨찾기 추가됨, false: 즐겨찾기 없음)
     */
    isFavorite: boolean;
    /**
     * 버튼 클릭 핸들러
     */
    onClick: () => void;
    /**
     * 버튼 비활성화 여부
     */
    disabled?: boolean;
    /**
     * 추가 클래스명
     */
    className?: string;
}

/**
 * FanPickStar 디렉토리의 재사용 가능한 즐겨찾기(Star) 버튼 컴포넌트
 * 이벤트 전파 중단 로직이 포함되어 있어 부모 요소의 클릭 이벤트와 충돌하지 않음
 */
export function StarButton({
    isFavorite,
    onClick,
    disabled = false,
    className = '',
}: StarButtonProps) {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        console.log('⭐ StarButton clicked!', { isFavorite });
        
        // 이벤트 전파 완전 차단
        e.stopPropagation();
        e.preventDefault();
        
        // 이벤트 버블링 방지를 위한 추가 처리
        if (e.nativeEvent) {
            e.nativeEvent.stopImmediatePropagation();
        }
        
        onClick();
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
        // 마우스 다운 이벤트도 전파 차단
        e.stopPropagation();
    };

    return (
        <button
            data-star-button="true" // Card에서 버튼을 확실히 식별하기 위한 속성
            onClick={handleClick}
            onMouseDown={handleMouseDown}
            onClickCapture={(e) => {
                // 캡처 단계에서도 이벤트 전파 차단
                e.stopPropagation();
            }}
            disabled={disabled}
            className={`mt-2 px-4 py-2 rounded-lg transition-colors ${
                isFavorite
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
            style={{
                zIndex: 100,
                position: 'relative',
                pointerEvents: 'auto', // 포인터 이벤트 명시적 설정
            }}
        >
            {isFavorite ? '❤️ Remove from Favorites' : '⭐ Add to Favorites'}
        </button>
    );
}
