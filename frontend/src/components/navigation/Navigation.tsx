'use client';

import { Button } from '@/components/ui/button/Button';
import FSFLogo from '@/components/ui/logo/FSFLogo';
import { Search, Menu, X, Trophy, BarChart3, MessageCircle, Star } from 'lucide-react';
import Link from 'next/link';
import { useModalStore } from '@/store/useModalStore';
import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import NotificationBell from '../notification/NotificationBell';

interface NavigationProps {
    match?: {
        id: number;
        date: string;
    };
}

export default function Navigation({ match }: NavigationProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [imageError, setImageError] = useState(false);
    const { open } = useModalStore();
    const { user, loading } = useAuthStore();
    const pathname = usePathname();

    const navLinks = [
        {
            href: '/match',
            label: 'Match',
            icon: Trophy,
        },
        {
            href: '/stats',
            label: 'Stats',
            icon: BarChart3,
        },
        {
            href: '/community',
            label: 'Community',
            icon: MessageCircle,
            onClick: (e: React.MouseEvent) => {
                if (!user) {
                    e.preventDefault();
                    open('signin', {
                        kind: 'auth',
                        mode: 'signin',
                    });
                }
            },
        },
        {
            href: '/fanpicker',
            label: 'FanPicker',
            icon: Star,
            onClick: (e: React.MouseEvent) => {
                if (!user) {
                    e.preventDefault();
                    open('signin', {
                        kind: 'auth',
                        mode: 'signin',
                    });
                }
            },
        },
    ];

    const renderAuthButtons = () => {
        if (loading) return null;

        //로그인 상태
        if (user) {
            return (
                <>
                    <div className="flex items-center gap-2">
                        {match && (
                            <NotificationBell
                                matchId={match.id}
                                matchDate={match.date}
                            />
                        )}

                        {/* 사용자 아이콘 클릭 시 바로 프로필 페이지로 이동 */}
                        <Link href="/auth/profile">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="relative rounded-full w-8 h-8"
                                aria-label="프로필 페이지로 이동"
                            >
                                {user.image && !imageError ? (
                                    <Image
                                        src={user.image}
                                        alt={`${user.name || 'User'}'s profile`}
                                        fill
                                        className="rounded-full object-cover"
                                        sizes="32px"
                                        loading="eager"
                                        onError={() => setImageError(true)}
                                    />
                                ) : (
                                    <span className="text-lg" aria-label="로그인됨">😊</span>
                                )}
                            </Button>
                        </Link>
                    </div>
                </>
            );
        }

        //비로그인 상태
        return (
            <div className="flex items-center gap-4">
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
            </div>
        );
    };

    return (
        <header className="bg-white shadow-sm h-16">
            <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md">
                <div className="max-w-6xl mx-auto flex justify-between h-16 px-4">
                    <div className="flex items-center">
                        <Link href="/" className="flex-shrink-0">
                            <FSFLogo
                                width={100}
                                height={110}
                                className="hover:opacity-80 transition-opacity"
                            />
                        </Link>
                    </div>

                    <div className="hidden sm:flex sm:items-center sm:space-x-8">
                        <div className="flex items-center gap-2">
                            {navLinks.map(({ href, label, icon: Icon, onClick }) => {
                                const isActive = pathname === href;
                                return (
                                    <Link
                                        key={href}
                                        href={href}
                                        onClick={onClick}
                                        className={`
                                            flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all
                                            ${isActive
                                                ? 'text-purple-600 bg-purple-50 border-b-2 border-purple-600'
                                                : 'text-gray-700 hover:text-purple-600 hover:bg-purple-50/50'
                                            }
                                        `}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {label}
                                    </Link>
                                );
                            })}
                        </div>

                        <div className="hidden sm:flex items-center gap-4">
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
                            <div className="flex items-center">
                                {renderAuthButtons()}
                            </div>
                        </div>
                    </div>

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

                {/* Mobile Menu (isMenuOpen 시) */}
                {isMenuOpen && (
                    <div className="sm:hidden" id="mobile-menu">
                        <div className="px-2 pt-2 pb-3 space-y-1">
                            {navLinks.map(({ href, label, icon: Icon, onClick }) => {
                                const isActive = pathname === href;
                                return (
                                    <Link
                                        key={href}
                                        href={href}
                                        onClick={(e) => {
                                            onClick?.(e);
                                            setIsMenuOpen(false);
                                        }}
                                        className={`
                                            flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium transition-all
                                            ${isActive
                                                ? 'text-purple-600 bg-purple-50 border-l-4 border-purple-600'
                                                : 'text-gray-700 hover:text-purple-600 hover:bg-gray-50'
                                            }
                                        `}
                                    >
                                        <Icon className="w-5 h-5" />
                                        {label}
                                    </Link>
                                );
                            })}

                            {user ? (
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
