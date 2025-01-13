import { NextResponse } from 'next/server';
import { auth } from '@/lib/firebase/config';
import { signOut } from 'firebase/auth';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json(
                { message: 'No active session' },
                { status: 400 }
            );
        }

        await signOut(auth);

        return NextResponse.json(
            {
                message: 'Logged out successfully',
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Logout error:', error);
        return NextResponse.json(
            { message: 'Failed to logout' },
            { status: 500 }
        );
    }
}
