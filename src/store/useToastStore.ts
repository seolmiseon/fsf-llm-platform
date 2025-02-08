import { create } from 'zustand';

type ToastVariant = 'default' | 'destructive';

interface Toast {
    id: string;
    title?: string;
    description?: string;
    variant?: ToastVariant;
    duration?: number;
}

interface ToastStore {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, 'id'>) => void;
    removeToast: (id: string) => void;
    clearToasts: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
    toasts: [],
    addToast: (toast) =>
        set((state) => ({
            toasts: [
                ...state.toasts,
                { ...toast, id: Math.random().toString(36).slice(2) },
            ],
        })),
    removeToast: (id) =>
        set((state) => ({
            toasts: state.toasts.filter((toast) => toast.id !== id),
        })),
    clearToasts: () => set({ toasts: [] }),
}));

// 편의를 위한 함수 export
export const toast = {
    default: (props: Omit<Toast, 'id' | 'variant'>) => {
        useToastStore.getState().addToast({ ...props, variant: 'default' });
    },
    error: (props: Omit<Toast, 'id' | 'variant'>) => {
        useToastStore.getState().addToast({ ...props, variant: 'destructive' });
    },
};
