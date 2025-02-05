import { useState } from 'react';
import { storage } from '@/lib/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface UseImageUploadReturn {
    uploadImage: (
        file: File | string,
        options?: {
            maxWidth?: number;
            maxHeight?: number;
        }
    ) => Promise<string>;
    loading: boolean;
    error: string | null;
}

const resizeImage = (
    file: File,
    maxWidth = 800,
    maxHeight = 600
): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // 비율 유지하며 리사이징
                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('이미지 리사이징 실패'));
                    }
                }, file.type);
            };
            img.onerror = () => reject(new Error('이미지 로드 실패'));
        };
        reader.onerror = () => reject(new Error('파일 읽기 실패'));
    });
};

export function useImageUpload(): UseImageUploadReturn {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const uploadImage = async (
        file: File | string,
        options?: { maxWidth?: number; maxHeight?: number }
    ): Promise<string> => {
        const { maxWidth = 800, maxHeight = 600 } = options || {};

        setLoading(true);
        setError(null);

        try {
            if (typeof file === 'string') {
                return file;
            }

            // 이미지 리사이징
            const resizedBlob = await resizeImage(file, maxWidth, maxHeight);

            // 리사이즈된 파일로 변환
            const resizedFile = new File([resizedBlob], file.name, {
                type: file.type,
            });

            const storageRef = ref(
                storage,
                `community/${Date.now()}_${resizedFile.name}`
            );
            await uploadBytes(storageRef, resizedFile);
            const downloadURL = await getDownloadURL(storageRef);
            return downloadURL;
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : '이미지 업로드에 실패했습니다.';
            setError(errorMessage);
            throw error;
        } finally {
            setLoading(false);
        }
    };
    return { uploadImage, loading, error };
}
