import { useModalStore } from '@/store/useModalStore';
import { useTeamData } from '@/hooks/useTeamData';
import styles from './TeamDetailModal.module.css';
import { PlayerInfo } from '@/types/api/responses';
import { getPlaceholderImageUrl } from '@/utils/imageUtils';
import Image from 'next/image';
import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/common/dialog';

interface TeamDetailModalProps {
    teamId: string;
    competitionId: string;
    onClose: () => void;
}

export const TeamDetailModal = ({
    teamId,
    competitionId,
    onClose,
}: TeamDetailModalProps) => {
    const { openPersonDetail } = useModalStore();
    const { teamData, loading, error } = useTeamData(teamId, competitionId);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error loading team data</div>;
    if (!teamData) return null;

    const coach = teamData.coach;

    // 감독 클릭 핸들러
    const handleCoachClick = (e: React.MouseEvent) => {
        e.stopPropagation();

        if (!coach) return;

        openPersonDetail(
            {
                id: coach.id,
                name: coach.name,
                position: 'Manager',
                nationality: coach.nationality,
                dateOfBirth: coach.dateOfBirth,
                image: coach.image,
            },
            {
                x: e.clientX,
                y: e.clientY,
            },
            teamId
        );
    };

    // 선수 클릭 핸들러
    const handlePlayerClick = (player: PlayerInfo, e: React.MouseEvent) => {
        e.stopPropagation();

        openPersonDetail(
            player,
            {
                x: e.clientX,
                y: e.clientY,
            },
            teamId
        );
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent onPointerDownOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>Team Details</DialogTitle>
                    <DialogDescription>
                        Team information and squad details
                    </DialogDescription>
                </DialogHeader>
                <div className={styles.modalContainer}>
                    <div className={styles.header}>
                        <div className={styles.badgeContainer}>
                            <Image
                                src={
                                    teamData.images?.teamBadge ??
                                    getPlaceholderImageUrl('badge')
                                }
                                alt={`${teamData.name} badge`}
                                width={64}
                                height={64}
                                className={styles.badge}
                                onError={(e) => {
                                    e.currentTarget.src =
                                        getPlaceholderImageUrl('badge');
                                }}
                            />
                        </div>
                        <h2>{teamData.name}</h2>
                    </div>

                    <div className={styles.content}>
                        {coach && (
                            <section className={styles.manager}>
                                <h3>Manager</h3>
                                <div
                                    className={styles.personCard}
                                    onClick={handleCoachClick}
                                >
                                    <div className={styles.imageContainer}>
                                        <Image
                                            src={
                                                coach.image ??
                                                getPlaceholderImageUrl(
                                                    'manager'
                                                )
                                            }
                                            alt={coach.name}
                                            width={100}
                                            height={100}
                                            className={styles.personImage}
                                            onError={(e) => {
                                                e.currentTarget.src =
                                                    getPlaceholderImageUrl(
                                                        'manager'
                                                    );
                                            }}
                                        />
                                    </div>
                                    <span>{coach.name}</span>
                                </div>
                            </section>
                        )}

                        <section className={styles.squad}>
                            <div className={styles.gridContainer}>
                                {teamData.squad.map((player) => (
                                    <div
                                        key={player.id}
                                        className={styles.playerCard}
                                        onClick={(e: React.MouseEvent) =>
                                            handlePlayerClick(player, e)
                                        }
                                    >
                                        <div className={styles.imageContainer}>
                                            <Image
                                                src={
                                                    player.image ??
                                                    getPlaceholderImageUrl(
                                                        'player'
                                                    )
                                                }
                                                alt={player.name}
                                                width={80}
                                                height={80}
                                                className={styles.playerImage}
                                                onError={(e) => {
                                                    e.currentTarget.src =
                                                        getPlaceholderImageUrl(
                                                            'player'
                                                        );
                                                }}
                                            />
                                        </div>
                                        <span>{player.name}</span>
                                        <span className={styles.position}>
                                            {player.position}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
