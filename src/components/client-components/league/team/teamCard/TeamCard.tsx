'use client';

import React from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/common/card';
import styles from './TeamCard.module.css';
import { useModalStore } from '@/store/useModalStore';
import { TeamResponse } from '@/types/api/responses';

interface TeamCardProps {
    team: TeamResponse;
    onClick: () => void;
    competitionId: string;
}

export const TeamCard: React.FC<TeamCardProps> = ({
    team,
    onClick,
    competitionId,
}) => {
    const { open } = useModalStore();

    const handleClick = () => {
        onClick();
        open('teamDetail', {
            kind: 'team',
            teamId: team.id.toString(),
            competitionId,
        });
    };
    return (
        <Card
            onClick={handleClick}
            className={`
            p-4 rounded-lg bg-white shadow-md
            ${styles.cardWrapper}
        `}
        >
            <CardContent className="flex flex-col items-center gap-3">
                <div className={styles.badgeContainer}>
                    {team.crest ? (
                        <Image
                            src={team.crest}
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
                    <p className="text-sm text-gray-600">{team.tla}</p>
                </div>
            </CardContent>
        </Card>
    );
};
