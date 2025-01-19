import { create } from 'zustand';
import { Position, PlayerInfo } from '@/types/api/responses';

import {
    ModalState,
    ModalType,
    ModalData,
    PersonModalData,
} from '@/types/ui/modal';

type ModalStore = ModalState & {
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
    switchToSignin: () => void;
    back: () => void;
    close: () => void;
};

export const useModalStore = create<ModalStore>((set) => ({
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
                kind: 'person',
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
                currentTeam: {
                    id: 0, // 이 부분은 실제 데이터에 맞게 수정 필요
                    name: '',
                    joined: '',
                },
            } as PersonModalData,
            position,
            previousModal: state.type
                ? {
                      type: state.type,
                      data: state.data as ModalData,
                  }
                : undefined,
        })),

    switchToSignin: () =>
        set({
            isOpen: true,
            type: 'signin',
            data: { kind: 'auth', mode: 'signin' },
            position: undefined,
            previousModal: undefined,
        }),

    back: () =>
        set((state) =>
            state.previousModal
                ? {
                      isOpen: true,
                      type: state.previousModal.type,
                      data: state.previousModal.data,
                      position: state.previousModal.position,
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
        set((state) =>
            state.previousModal
                ? {
                      isOpen: true,
                      type: state.previousModal.type,
                      data: state.previousModal.data,
                      position: state.previousModal.position,
                      previousModal: undefined,
                  }
                : {
                      isOpen: false,
                      type: null,
                      data: null,
                      position: undefined,
                      previousModal: undefined,
                  }
        ),
}));
