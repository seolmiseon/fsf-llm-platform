'use client';

import { getToken } from 'firebase/messaging';
import { messaging } from './config';

export async function requestNotificationPermission(): Promise<string | null> {
    try {
        if (!messaging) {
            throw new Error('Messaging is not initialized');
        }
        let permission = Notification.permission;

        if (permission === 'default') {
            permission = await Notification.requestPermission();
        }
        if (permission !== 'granted') {
            throw new Error('Notification permission denied');
        }

        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) {
            throw new Error('Service Worker not registered');
        }

        const currentToken = await getToken(messaging, {
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: registration,
        });

        return currentToken;
    } catch (error) {
        console.error('알림 권한 요청 실패:', error);
        return null;
    }
}
