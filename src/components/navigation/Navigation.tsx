'use client';

import { Button } from '@/components/ui/button/Button';
import FSFLogo from '@/components/ui/logo/FSFLogo';
import { Search } from 'lucide-react';
import Link from 'next/link';

import { useModalStore } from '@/store/useModalStore';

export default function Navigation() {
    const { open } = useModalStore();

    return (
        <header>
            <nav
                className="w-full bg-white shadow-sm"
                aria-label="메인 네비게이션"
            >
                <div className="max-w-7xl mx-auto px-4"></div>
                <div className="flex justify-between items-center h-16">
                    {/* 로고 */}
                    <div className="flex-shrink-0">
                        <Link href="/">
                            <FSFLogo
                                width={80}
                                height={80}
                                className="hover:opacity-80"
                            />
                        </Link>
                    </div>

                    {/* 메인 메뉴 */}
                    <div className="hidden sm:flex items-center space-x-8">
                        <Link
                            href="/leagues"
                            className="text-gray-700 hover:text-gray-900"
                        >
                            Leagues
                        </Link>
                        <Link
                            href="/match"
                            className="text-gray-700 hover:text-gray-900"
                        >
                            Match
                        </Link>
                        <Link
                            href="/stats"
                            className="text-gray-700 hover:text-gray-900"
                        >
                            Stats
                        </Link>
                        <Link
                            href="/community"
                            className="text-gray-700 hover:text-gray-900"
                        >
                            Community
                        </Link>
                    </div>

                    {/* 검색창과 로그인 버튼 */}
                    <div className="flex items-center space-x-4">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search leagues..."
                                aria-label="리그 검색색"
                                className="pl-10 pr-4 py-2 border rounded-lg"
                                onFocus={() => {
                                    open('search');
                                }}
                            />
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        </div>
                        <Button variant="primary" size="sm" aria-label="로그인">
                            로그인
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            aria-label="회원가입"
                        >
                            회원가입
                        </Button>
                    </div>
                </div>
            </nav>
        </header>
    );
}
