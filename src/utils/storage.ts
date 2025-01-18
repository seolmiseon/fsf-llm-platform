import { storage } from '@/lib/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export async function uploadImageToStorage(imageUrl: string, path: string) {
    try {
        // 1. 이미지 URL에서 이미지 데이터 가져오기
        if (!imageUrl) {
            throw new Error('Invalid image URL');
        }

        // 2. 이미지 fetch 시 에러 처리 개선
        const response = await fetch(imageUrl, {
            headers: {
                Accept: 'image/*',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        const blob = await response.blob();

        // 3. Content-Type 확인 및 설정
        const metadata = {
            contentType: blob.type || 'image/png',
        };

        const storageRef = ref(storage, path);

        // 4. 메타데이터와 함께 업로드
        const snapshot = await uploadBytes(storageRef, blob, metadata);
        return await getDownloadURL(snapshot.ref);
    } catch (error) {
        console.error('Image upload error:', error);
        // 원본 이미지 URL을 반환하여 폴백 처리
        return imageUrl;
    }
}
