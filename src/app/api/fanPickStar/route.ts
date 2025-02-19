import { adminDB } from '@/lib/firebase/admin';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const eventRef = adminDB.collection('event_vote').doc('current_event');
        const eventDoc = await eventRef.get();

        if (!eventDoc.exists) {
            return NextResponse.json(
                { message: 'No active event' },
                { status: 404 }
            );
        }

        return NextResponse.json({ data: eventDoc.data() });
    } catch (error) {
        return NextResponse.json({ error: error }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { userId, playerId } = await request.json();

        if (!userId) {
            return NextResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            );
        }

        await adminDB.collection('user_votes').doc(userId).set({
            eventId: 'current_event',
            votedPlayer: playerId,
            votedAt: new Date(),
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error }, { status: 500 });
    }
}
