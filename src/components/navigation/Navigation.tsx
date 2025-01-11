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

export default function Navigation() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
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
        if (status === 'authenticated' && session.user) {
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="relative rounded-full"
                        >
                            {session.user.image ? (
                                <img
                                    src={session.user.image}
                                    alt="Profile"
                                    className="w-8 h-8 rounded-full"
                                />
                            ) : (
                                <User className="w-5 h-5" />
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                            <Link href="/profile">프로필</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href="/my-teams">내 팀</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href="/settings">설정</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-red-600"
                            onClick={() =>
                                open('logout', { kind: 'auth', mode: 'logout' })
                            }
                        >
                            로그아웃
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        }

        return (
            <div className="flex items-center space-x-2">
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
                    <div className="hidden items-center space-x-4 sm:flex">
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
                    <div className="sm:hidden" id="mobile-menu">
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
                            <div className="mt-4 flex flex-col space-y-2 px-3">
                                <Button
                                    variant="primary"
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
                                    variant="outline"
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
                        </div>
                    </div>
                )}
            </nav>
        </header>
    );
}
