import { getStorage } from 'firebase-admin/storage';

export async function uploadImageToStorage(imageUrl: string, path: string) {
    try {
        // 1. 이미지 URL에서 이미지 데이터 가져오기
        if (!imageUrl) {
            throw new Error('Invalid image URL');
        }

        // 2. 이미지 fetch 시 에러 처리 개선
        const response = await fetch(imageUrl, {
            headers: {
                'X-Auth-Token': process.env
                    .NEXT_PUBLIC_FOOTBALL_API_KEY as string,
                Accept: 'image/*',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }

        const buffer = Buffer.from(await response.arrayBuffer());

        const adminStorage = getStorage();
        const bucket = adminStorage.bucket();
        const file = bucket.file(path);

        const metadata = {
            contentType: response.headers.get('content-type') || 'image/png',
        };

        await file.save(buffer, {
            metadata: metadata,
        });

        // 다운로드 URL 생성
        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: '03-01-2500',
        });

        return url;
    } catch (error) {
        console.error('Image upload error:', error);
        return null;
    }
}
