import { NextResponse } from 'next/server';
import { auth } from '@/lib/firebase/config';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

export async function POST(req: Request) {
    try {
        const { email, password, name } = await req.json();

        const userCredential = await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );

        if (name) {
            await updateProfile(userCredential.user, {
                displayName: name,
            });
        }
        return NextResponse.json(
            {
                message: 'User created successfully',
            },
            { status: 201 }
        );
    } catch (error: any) {
        return NextResponse.json(
            {
                error: error.message,
            },
            { status: 404 }
        );
    }
}
