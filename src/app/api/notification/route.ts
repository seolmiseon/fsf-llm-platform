import { adminDB, FieldValue } from '@/lib/firebase/admin';
import { getMessaging } from 'firebase-admin/messaging';

export async function POST(request: Request) {
    console.log('POST /api/notification started:', new Date().toISOString());
    try {
        if (!adminDB) {
            throw new Error('Firebase Admin이 초기화되지 않았습니다.');
        }

        const { matchId, userId, token } = await request.json();

        const userRef = adminDB.collection('users').doc(userId);

        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            await userRef.set({
                fcmTokens: [token],
                lastTokenUpdate: FieldValue.serverTimestamp(),
            });
        } else {
            await userRef.update({
                fcmTokens: [token],
                lastTokenUpdate: FieldValue.serverTimestamp(),
            });
        }

        // 매치 알림 저장
        await adminDB.collection('matchNotifications').add({
            matchId,
            userId,
            token,
            createdAt: FieldValue.serverTimestamp(),
        });

        try {
            const adminMessaging = getMessaging();
            await adminMessaging.send({
                // 여기서 문제가 발생할 수 있음
                notification: {
                    title: '알림 테스트',
                    body: 'FCM 알림이 정상적으로 설정되었습니다.',
                },
                token: token,
            });
        } catch (messagingError) {
            console.error('FCM error:', messagingError);
            throw new Error('FCM 메시지 전송 실패: ' + messagingError);
        }

        return Response.json({ success: true });
    } catch (error: unknown) {
        console.error('Error details:', error);
        return Response.json({ error: error }, { status: 500 });
    }
}
