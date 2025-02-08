'use client';

import { getToken } from 'firebase/messaging';
import { messaging } from './config';

export async function requestNotificationPermission(): Promise<string | null> {
    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            throw new Error('Notification permission denied');
        }
        const token = await getToken(messaging, {
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        });

        return token;
    } catch (error) {
        console.error('알림 권한 요청 실패:', error);
        return null;
    }
}
