'use client';

import { useModalStore } from '@/store/useModalStore';
import { SearchModal } from './SearchModal';
import { LogoutModal } from './LogoutModal';
import { TeamDetailModal } from '@/components/league/team/modals/teamDetailModal/TeamDetailModal';
import { PersonDetailModal } from '@/components/league/team/modals/personDetailModal/PersonDetailModal';
import { ModalData, TeamModalData, PersonModalData } from '@/types/ui/modal';
import { AuthModal } from './AuthModal';

export function ModalRoot() {
    const { type, data, close } = useModalStore();

    const isTeamModalData = (data: ModalData | null): data is TeamModalData => {
        return data?.kind === 'team';
    };

    const isPersonModalData = (
        data: ModalData | null
    ): data is PersonModalData => {
        return data?.kind === 'person';
    };

    return (
        <>
            {type === 'search' && <SearchModal />}
            {type === 'logout' && <LogoutModal />}
            {(type === 'signin' || type === 'signup') && <AuthModal />}
            {type === 'teamDetail' && isTeamModalData(data) && (
                <TeamDetailModal
                    teamId={data.teamId}
                    competitionId={data.competitionId}
                    onClose={close}
                />
            )}
            {type === 'personDetail' && isPersonModalData(data) && (
                <PersonDetailModal person={data} onClose={close} />
            )}
        </>
    );
}
