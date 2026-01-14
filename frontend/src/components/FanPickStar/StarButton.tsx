'use client';

import React, { useEffect, useRef } from 'react';
import { useStarButtonEventStore } from '@/store/useStarButtonEventStore';

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
    const buttonRef = useRef<HTMLButtonElement>(null);
    const registerButtonClick = useStarButtonEventStore((state) => state.registerButtonClick);

    // 직접 DOM 이벤트 리스너 추가 (React 이벤트 시스템을 우회)
    useEffect(() => {
        const button = buttonRef.current;
        if (!button) return;

        const handleNativeClick = (e: MouseEvent) => {
            console.log('⭐ [StarButton] Native click 이벤트 발생!', { isFavorite });
            
            // 전역 store에 버튼 클릭 등록 (Card가 이를 확인하여 onClick 차단)
            registerButtonClick();
            
            e.stopPropagation();
            e.stopImmediatePropagation();
            e.preventDefault();
            
            console.log('⭐ [StarButton] onClick 콜백 호출');
            onClick();
        };

        button.addEventListener('click', handleNativeClick, true); // 캡처 단계에서 실행

        return () => {
            button.removeEventListener('click', handleNativeClick, true);
        };
    }, [onClick, isFavorite]);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        console.log('⭐ [StarButton] React handleClick 실행됨!', { isFavorite, timestamp: new Date().toISOString() });
        
        // 전역 store에 버튼 클릭 등록 (Card가 이를 확인하여 onClick 차단)
        registerButtonClick();
        
        // 이벤트 전파 완전 차단 (가장 먼저 실행)
        e.stopPropagation();
        e.preventDefault();
        
        // 이벤트 버블링 방지를 위한 추가 처리
        if (e.nativeEvent) {
            e.nativeEvent.stopImmediatePropagation();
        }
        
        console.log('⭐ [StarButton] onClick 콜백 호출 전', { isFavorite });
        try {
            onClick();
            console.log('⭐ [StarButton] onClick 콜백 호출 완료');
        } catch (error) {
            console.error('⭐ [StarButton] onClick 콜백 실행 중 오류:', error);
        }
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
        console.log('⭐ [StarButton] handleMouseDown 실행됨');
        // 마우스 다운 이벤트도 전파 차단
        e.stopPropagation();
        e.preventDefault();
    };

    return (
        <button
            ref={buttonRef}
            data-star-button="true" // Card에서 버튼을 확실히 식별하기 위한 속성
            onClick={handleClick}
            onMouseDown={handleMouseDown}
            disabled={disabled}
            type="button" // 기본 submit 동작 방지
            className={`mt-2 px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                isFavorite
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
            style={{
                position: 'relative',
                zIndex: 9999, // 매우 높은 z-index
                pointerEvents: 'auto',
                cursor: 'pointer',
            }}
        >
            {isFavorite ? '❤️ Remove from Favorites' : '⭐ Add to Favorites'}
        </button>
    );
}
