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
 * 재사용 가능한 즐겨찾기(Star) 버튼 컴포넌트
 */
export function StarButton({
    isFavorite,
    onClick,
    disabled = false,
    className = '',
}: StarButtonProps) {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        console.log('⭐ [StarButton] 클릭됨', { isFavorite });
        onClick();
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={disabled}
            className={`mt-2 px-4 py-2 rounded-lg transition-colors ${
                isFavorite
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        >
            {isFavorite ? '❤️ Remove from Favorites' : '⭐ Add to Favorites'}
        </button>
    );
}
