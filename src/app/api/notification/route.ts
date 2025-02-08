import { adminDB, FieldValue } from '@/lib/firebase/admin';
import { getMessaging } from 'firebase-admin/messaging';

export async function POST(request: Request) {
    try {
        const { userId, token } = await request.json();

        const adminMessaging = getMessaging();
        await adminMessaging.send({ token }, true); // dryRun
        await adminDB
            .collection('users')
            .doc(userId)
            .update({
                fcmTokens: FieldValue.arrayUnion(token),
                lastTokenUpdate: FieldValue.serverTimestamp(),
            });
        return Response.json({ success: true });
    } catch (error: unknown) {
        return Response.json({ error: error }, { status: 500 });
    }
}
