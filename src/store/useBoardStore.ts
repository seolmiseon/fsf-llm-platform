import { create } from 'zustand';
import { IBoardState } from '@/app/types/IStoreType';

export const useBoardStore = create<IBoardState>((set) => ({
    inputs: {
        writer: '',
        title: '',
        contents: '',
        password: '',
        password2: '',
        email: '',
    },
    error: null,
    uploadImages: [],

    setInputs: (key, value) =>
        set((state) => ({
            inputs: { ...state.inputs, [key]: value },
        })),

    // 이미지가 업데이트될때
    setUploadImages: (image: string, index: number) =>
        set((state) => {
            const updatedImages = [...state.uploadImages];
            updatedImages[index] = image;
            return { uploadImages: updatedImages };
        }),
    // 새로운이미지가 추가될때
    addUploadImages: (image: string[]) =>
        set((state) => ({
            ...state,
            uploadImages: [...state.uploadImages, ...image],
        })),

    //삭제
    removeUploadImage: (index: number) =>
        set((state) => {
            const updatedImages = [...state.uploadImages];
            updatedImages.splice(index, 1);
            return { uploadImages: updatedImages };
        }),

    setError: (error) => set({ error }),

    resetForm: () =>
        set({
            inputs: {
                writer: '',
                title: '',
                contents: '',
                password: '',
                password2: '',
                email: '',
            },
            uploadImages: [],
            error: null,
        }),
}));
