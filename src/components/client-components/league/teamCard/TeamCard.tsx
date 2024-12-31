'use client';

import React from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/Card';
import styles from './TeamCard.module.css';

interface TeamCardProps {
    team: {
        id: string;
        name: string;
        badge: string;
        rank: string;
    };
    onClick: () => void;
}

export function TeamCard({ team, onClick }: TeamCardProps) {
    return (
        <Card
            onClick={onClick}
            className={`
            p-4 rounded-lg bg-white shadow-md
            ${styles.cardWrapper}
        `}
        >
            <CardContent className="flex flex-col items-center gap-3">
                <div className={styles.badgeContainer}>
                    {team.badge ? (
                        <Image
                            src={team.badge}
                            alt={`${team.name} badge`}
                            fill
                            className="object-contain"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-600 to-gray-800 rounded-full flex items-center justify-center">
                            <span className="text-xl font-bold text-white">
                                {team.name.slice(0, 2)}
                            </span>
                        </div>
                    )}
                </div>
                <div className={`text-center ${styles.teamInfo}`}>
                    <h3 className="text-lg font-semibold">{team.name}</h3>
                    <p className="text-sm text-gray-600">Rank #{team.rank}</p>
                </div>
            </CardContent>
        </Card>
    );
}
