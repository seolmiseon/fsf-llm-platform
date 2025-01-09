import { create } from 'zustand';
import {
    Position,
    PlayerInfo,
    PlayerDetailedInfo,
} from '@/types/api/responses';

import {
    ModalState,
    ModalType,
    ModalData,
    PersonModalData,
} from '@/types/ui/modal';

export const useModalStore = create<
    ModalState & {
        open: (
            type: ModalType,
            data: ModalData | null,
            position?: Position
        ) => void;
        openPersonDetail: (
            playerInfo: PlayerInfo,
            position: Position,
            teamId: string
        ) => void;
        back: () => void;
        close: () => void;
    }
>((set) => ({
    isOpen: false,
    type: null,
    data: null,
    position: undefined,
    previousModal: undefined,

    open: (type, data, position) =>
        set({
            isOpen: true,
            type,
            data,
            position,
        }),

    openPersonDetail: (playerInfo, position, teamId) =>
        set((state) => ({
            isOpen: true,
            type: 'personDetail',
            data: {
                id: playerInfo.id,
                name: playerInfo.name,
                position: playerInfo.position,
                nationality: playerInfo.nationality,
                image: playerInfo.image,
                shirtNumber: playerInfo.shirtNumber,
                teamId,
                description: playerInfo.description,
                dateOfBirth: playerInfo.dateOfBirth,
                height: playerInfo.height,
                weight: playerInfo.weight,
            } as PersonModalData,
            position,
            previousModal: state.type
                ? {
                      type: state.type,
                      data: state.data as ModalData,
                  }
                : undefined,
        })),

    back: () =>
        set((state) =>
            state.previousModal
                ? {
                      isOpen: true,
                      type: state.previousModal.type,
                      data: state.previousModal.data,
                      previousModal: undefined,
                  }
                : {
                      isOpen: false,
                      type: null,
                      data: null,
                      previousModal: undefined,
                  }
        ),

    close: () =>
        set({
            isOpen: false,
            type: null,
            data: null,
            position: undefined,
            previousModal: undefined,
        }),
}));
