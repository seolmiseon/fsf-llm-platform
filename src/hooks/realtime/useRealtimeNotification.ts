import { db } from '@/lib/firebase/config';
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';

interface Notification {
    id: string;
    userId: string;
    message: string;
    createdAt: Date;
    isRead: boolean;
}

export function useRealtimeNotification(userId: string) {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        if (!userId || !db) return;
        const notificationsRef = collection(db, 'notifications');

        const q = query(
            notificationsRef,
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notificationList = snapshot.docs.map(
                (doc) =>
                    ({
                        id: doc.id,
                        ...doc.data(),
                    } as Notification)
            );

            setNotifications(notificationList);
        });

        return () => unsubscribe();
    }, [userId]);

    return notifications;
}
