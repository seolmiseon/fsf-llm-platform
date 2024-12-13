'use client';

import React from 'react';
import * as NavigationMenu from '@radix-ui/react-navigation-menu';
import Link from 'next/link';

export default function NavigationBar() {
    return (
        <>
            <NavigationMenu.Root className="relative flex-w-full justify-between px-4 py-2">
                <NavigationMenu.List className="flex gap-6">
                    <NavigationMenu.Item>
                        <NavigationMenu.Link asChild>
                            <Link
                                href="/leagues"
                                className="hover:text-blue-500 transition-colors"
                            >
                                Leagues
                            </Link>
                        </NavigationMenu.Link>
                    </NavigationMenu.Item>
                </NavigationMenu.List>
            </NavigationMenu.Root>
        </>
    );
}
