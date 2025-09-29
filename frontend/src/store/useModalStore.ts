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
                    id: 0,
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

// 스택관리가 더 용이한 로직인데 바꾸기엔 무섭다
// type ModalState = {
// modalStack: Array<{
//     isOpen: boolean;
//     type: ModalType | null;
//     data: ModalData | null;
//     position?: Position;
// }>;
// }

// // Recommended Improved Approach
// type ModalState = {
// isOpen: boolean;
// activeModals: Array<{
//     id: string;  // Unique identifier for each modal
//     type: ModalType;
//     data: ModalData;
//     position?: Position;
// }>;
// }

// type ModalStore = ModalState & {
// open: (type: ModalType, data: ModalData, position?: Position) => void;
// close: (modalId?: string) => void;  // Optional modalId to close specific modal
// back: () => void;  // Go back to previous modal if exists
// closeAll: () => void;  // Close all modals
// };

// export const useModalStore = create<ModalStore>((set) => ({
// isOpen: false,
// activeModals: [],

// open: (type, data, position) => set(state => ({
//     isOpen: true,
//     activeModals: [...state.activeModals, {
//         id: crypto.randomUUID(),
//         type,
//         data,
//         position
//     }]
// })),

// close: (modalId) => set(state => {
//     if (!modalId) {
//         // Close most recent modal if no ID provided
//         const newModals = state.activeModals.slice(0, -1);
//         return {
//             isOpen: newModals.length > 0,
//             activeModals: newModals
//         };
//     }

//     const newModals = state.activeModals.filter(modal => modal.id !== modalId);
//     return {
//         isOpen: newModals.length > 0,
//         activeModals: newModals
//     };
// }),

// back: () => set(state => {
//     const newModals = state.activeModals.slice(0, -1);
//     return {
//         isOpen: newModals.length > 0,
//         activeModals: newModals
//     };
// }),

// closeAll: () => set({
//     isOpen: false,
//     activeModals: []
// })
// }));
