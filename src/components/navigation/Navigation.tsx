'use client';

import { Button } from '@/components/ui/button/Button';
import FSFLogo from '@/components/ui/logo/FSFLogo';
import { Search, Menu, X, User, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useModalStore } from '@/store/useModalStore';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropDown/DropDownMenu';
import Image from 'next/image';

export default function Navigation() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [imageError, setImageError] = useState(false);
    const { open } = useModalStore();
    const { data: session, status } = useSession();

    useEffect(() => {
        console.log('Auth status:', status);
        console.log('Session:', session);
    }, [status, session]);

    const navLinks = [
        { href: '/leagues', label: 'Leagues' },
        { href: '/match', label: 'Match' },
        { href: '/stats', label: 'Stats' },
        { href: '/community', label: 'Community' },
    ];

    const renderAuthButtons = () => {
        if (status === 'loading') {
            return null;
        }

        // 로그인된 상태
        if (status === 'authenticated' && session.user) {
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="relative rounded-full"
                            aria-label="사용자 메뉴"
                        >
                            {session.user.image && !imageError ? (
                                <Image
                                    src={session.user.image}
                                    alt={`${
                                        session.user.name || 'User'
                                    }'s profile`}
                                    fill
                                    className="rounded-full object-cover"
                                    sizes="32px"
                                    loading="eager"
                                    onError={() => setImageError(true)}
                                />
                            ) : (
                                <User className="w-5 h-5" aria-hidden="true" />
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem asChild>
                            <Link
                                href="/auth/profile"
                                className="flex items-center"
                            >
                                <User className="mr-2 h-4 w-4" />
                                프로필
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link
                                href="/my-teams"
                                className="flex items-center"
                            >
                                내 팀
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link
                                href="/settings"
                                className="flex items-center"
                            >
                                설정
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-red-600"
                            onClick={() =>
                                open('logout', { kind: 'auth', mode: 'logout' })
                            }
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            로그아웃
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        }

        // 비로그인 상태의 버튼
        const authButtons = (
            <>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                        open('signin', { kind: 'auth', mode: 'signin' })
                    }
                >
                    로그인
                </Button>
                <Button
                    variant="primary"
                    size="sm"
                    onClick={() =>
                        open('signup', { kind: 'auth', mode: 'signup' })
                    }
                >
                    회원가입
                </Button>
            </>
        );

        return <div className="flex items-center space-x-2">{authButtons}</div>;
    };

    return (
        <header className="bg-white shadow-sm">
            <nav
                className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
                aria-label="Main navigation"
            >
                <div className="flex justify-between h-16">
                    {/* Logo */}
                    <div className="flex items-center">
                        <Link href="/" className="flex-shrink-0">
                            <FSFLogo
                                width={80}
                                height={80}
                                className="hover:opacity-80 transition-opacity"
                            />
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden sm:flex sm:items-center sm:space-x-8">
                        {navLinks.map(({ href, label }) => (
                            <Link
                                key={href}
                                href={href}
                                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                            >
                                {label}
                            </Link>
                        ))}
                    </div>

                    {/* Search and Auth Buttons */}
                    <div className="items-center space-x-4 hidden sm:flex">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search leagues..."
                                className="pl-10 pr-4 py-2 border rounded-lg"
                                onFocus={() =>
                                    open('search', {
                                        kind: 'search',
                                        query: '',
                                        page: 1,
                                    })
                                }
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                        {renderAuthButtons()}
                    </div>

                    {/* Mobile menu button */}
                    <div className="sm:hidden flex items-center">
                        <button
                            type="button"
                            className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                            aria-controls="mobile-menu"
                            aria-expanded={isMenuOpen}
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            <span className="sr-only">Open main menu</span>
                            {isMenuOpen ? (
                                <X
                                    className="block h-6 w-6"
                                    aria-hidden="true"
                                />
                            ) : (
                                <Menu
                                    className="block h-6 w-6"
                                    aria-hidden="true"
                                />
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile menu */}
                {isMenuOpen && (
                    <div
                        className="sm:hidden"
                        id="mobile-menu"
                        role="navigation"
                    >
                        <div className="px-2 pt-2 pb-3 space-y-1">
                            {navLinks.map(({ href, label }) => (
                                <Link
                                    key={href}
                                    href={href}
                                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    {label}
                                </Link>
                            ))}
                            {/* 모바일 메뉴의 인증 버튼도 동일한 스타일 사용 */}
                            {status === 'authenticated' ? (
                                <>
                                    <Link
                                        href="/auth/profile"
                                        className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        프로필
                                    </Link>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={() => {
                                            open('logout', {
                                                kind: 'auth',
                                                mode: 'logout',
                                            });
                                            setIsMenuOpen(false);
                                        }}
                                        className="w-full mt-2"
                                    >
                                        로그아웃
                                    </Button>
                                </>
                            ) : (
                                <div className="mt-4 flex flex-col space-y-2 px-3">
                                    {/* 모바일에서도 동일한 버튼 스타일 사용 */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            open('signin', {
                                                kind: 'auth',
                                                mode: 'signin',
                                            });
                                            setIsMenuOpen(false);
                                        }}
                                        className="w-full"
                                    >
                                        로그인
                                    </Button>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={() => {
                                            open('signup', {
                                                kind: 'auth',
                                                mode: 'signup',
                                            });
                                            setIsMenuOpen(false);
                                        }}
                                        className="w-full"
                                    >
                                        회원가입
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </nav>
        </header>
    );
}
