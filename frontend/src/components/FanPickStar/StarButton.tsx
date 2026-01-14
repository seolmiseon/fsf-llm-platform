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

    // 컴포넌트 마운트 시 로그
    useEffect(() => {
        console.log('⭐ [StarButton] 컴포넌트 마운트됨', { isFavorite, hasOnClick: !!onClick, disabled });
        if (buttonRef.current) {
            console.log('⭐ [StarButton] 버튼 DOM 요소 확인됨:', buttonRef.current);
            console.log('⭐ [StarButton] 버튼 스타일:', window.getComputedStyle(buttonRef.current));
            console.log('⭐ [StarButton] 버튼 pointer-events:', window.getComputedStyle(buttonRef.current).pointerEvents);
        } else {
            console.error('⭐ [StarButton] ❌ 버튼 ref가 null입니다!');
        }
    }, [isFavorite, onClick, disabled]);

    // 직접 DOM 이벤트 리스너 추가 (React 이벤트 시스템을 우회)
    // 모든 이벤트를 감지하여 디버깅
    useEffect(() => {
        const button = buttonRef.current;
        if (!button) {
            console.warn('⭐ [StarButton] 버튼 ref가 null입니다!');
            return;
        }

        console.log('⭐ [StarButton] 네이티브 이벤트 리스너 등록됨');

        const handleClick = (e: MouseEvent) => {
            console.log('⭐ [StarButton] ⚡⚡⚡ 네이티브 CLICK 이벤트 발생! ⚡⚡⚡', { 
                target: e.target,
                currentTarget: e.currentTarget,
                button: button
            });
            registerButtonClick();
            onClick();
        };

        const handleMouseDown = (e: MouseEvent) => {
            console.log('⭐ [StarButton] ⚡ 네이티브 MOUSEDOWN 이벤트 발생! ⚡');
            registerButtonClick();
        };

        // 캡처와 버블링 모두 등록
        button.addEventListener('click', handleClick, true); // 캡처
        button.addEventListener('click', handleClick, false); // 버블링
        button.addEventListener('mousedown', handleMouseDown, true);

        return () => {
            button.removeEventListener('click', handleClick, true);
            button.removeEventListener('click', handleClick, false);
            button.removeEventListener('mousedown', handleMouseDown, true);
        };
    }, [registerButtonClick, onClick]);

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
        console.log('⭐ [StarButton] React handleMouseDown 실행됨');
        // 전역 store에 버튼 클릭 등록 (Card가 이를 확인하여 onClick 차단)
        registerButtonClick();
        // 마우스 다운 이벤트도 전파 차단
        e.stopPropagation();
        // preventDefault는 하지 않음 (버튼의 onClick이 실행되어야 함)
    };

    return (
        <div 
            style={{ 
                position: 'relative',
                zIndex: 99999,
                pointerEvents: 'auto',
            }}
            onClick={(e) => {
                console.log('⭐ [StarButton Wrapper] div 클릭됨!');
                e.stopPropagation(); // Card로 전파 차단
            }}
        >
            <button
                ref={buttonRef}
                data-star-button="true" // Card에서 버튼을 확실히 식별하기 위한 속성
                onClick={(e) => {
                    console.log('⭐ [StarButton] 버튼 onClick 시작!');
                    e.stopPropagation(); // 가장 먼저 전파 차단
                    e.preventDefault();
                    handleClick(e);
                }}
                onMouseDown={(e) => {
                    console.log('⭐ [StarButton] 버튼 onMouseDown!');
                    e.stopPropagation();
                    handleMouseDown(e);
                }}
                disabled={disabled}
                type="button" // 기본 submit 동작 방지
                className={`mt-2 px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                    isFavorite
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
                style={{
                    position: 'relative',
                    zIndex: 99999,
                    pointerEvents: 'auto',
                    cursor: 'pointer',
                }}
            >
                {isFavorite ? '❤️ Remove from Favorites' : '⭐ Add to Favorites'}
            </button>
        </div>
    );
}
