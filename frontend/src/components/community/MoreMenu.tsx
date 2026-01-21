'use client';

import { useState, useRef, useEffect } from 'react';

interface MoreMenuProps {
    onReport: () => void;
}

/**
 * 더보기 메뉴 컴포넌트 (⋮ 버튼)
 * 
 * 게시글/댓글에서 재사용 가능
 * - 신고하기 메뉴 제공
 * - 추후 확장 가능 (공유, 차단 등)
 */
export function MoreMenu({ onReport }: MoreMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // 외부 클릭 시 메뉴 닫기
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // ESC 키로 닫기
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    const handleReport = () => {
        setIsOpen(false);
        onReport();
    };

    return (
        <div className="relative" ref={menuRef}>
            {/* 더보기 버튼 */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="더보기 메뉴"
                aria-expanded={isOpen}
            >
                <svg
                    className="w-5 h-5 text-gray-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
            </button>

            {/* 드롭다운 메뉴 */}
            {isOpen && (
                <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    <button
                        onClick={handleReport}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                    >
                        <span>🚨</span>
                        <span>신고하기</span>
                    </button>
                </div>
            )}
        </div>
    );
}
