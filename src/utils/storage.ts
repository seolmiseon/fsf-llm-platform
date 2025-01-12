import { storage } from '@/lib/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export async function uploadImageToStorage(imageUrl: string, path: string) {
    try {
        // 1. 이미지 URL에서 이미지 데이터 가져오기
        const response = await fetch(imageUrl);
        const blob = await response.blob();

        // 2. Storage에 업로드할 경로 설정
        const storageRef = ref(storage, path);

        // 3. 이미지 업로드
        const snapshot = await uploadBytes(storageRef, blob);

        // 4. 업로드된 이미지의 URL 가져오기
        const downloadUrl = await getDownloadURL(snapshot.ref);

        return downloadUrl;
    } catch (error) {
        console.error('Image upload error:', error);
        throw error;
    }
}
