import { create } from 'zustand';

type ModalType = 'search' | 'logout' | 'LiveMatch';

interface ModalState {
    isOpen: boolean;
    type: ModalType | null;
    data?: any;
    open: (type: ModalType, data?: any) => void;
    close: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
    isOpen: false,
    type: null,
    data: null,
    open: (type, data) => set({ isOpen: true, type, data }),
    close: () => set({ isOpen: false, type: null, data: null }),
}));
