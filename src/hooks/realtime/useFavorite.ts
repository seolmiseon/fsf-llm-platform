import { useState, useEffect } from 'react';
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    addDoc,
    deleteDoc,
    doc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface Favorite {
    id: string;
    userId: string;
    leagueId?: string;
    teamId?: string;
    createdAt: Date;
}

export function useFavorite(userId: string) {
    const [favorites, setFavorites] = useState<Favorite[]>([]);

    // 즐겨찾기 목록 실시간 감지
    useEffect(() => {
        if (!userId) return;

        const favoritesRef = collection(db, 'favorites');

        const q = query(
            favoritesRef,
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const favoriteList = snapshot.docs.map(
                (doc) =>
                    ({
                        id: doc.id,
                        ...doc.data(),
                    } as Favorite)
            );

            setFavorites(favoriteList);
        });

        return () => unsubscribe();
    }, [userId]);

    // 즐겨찾기 추가
    const addFavorite = async (data: Omit<Favorite, 'id' | 'createdAt'>) => {
        try {
            const favoritesRef = collection(db, 'favorites');
            await addDoc(favoritesRef, {
                ...data,
                createdAt: new Date(),
            });
            return true;
        } catch (error) {
            console.error('Add favorite error:', error);
            return false;
        }
    };

    // 즐겨찾기 제거
    const removeFavorite = async (favoriteId: string) => {
        try {
            const favoriteRef = doc(db, 'favorites', favoriteId);
            await deleteDoc(favoriteRef);
            return true;
        } catch (error) {
            console.error('Remove favorite error:', error);
            return false;
        }
    };

    // 즐겨찾기 여부 확인
    const isFavorite = (leagueId?: string, teamId?: string) => {
        return favorites.some(
            (fav) =>
                (leagueId && fav.leagueId === leagueId) ||
                (teamId && fav.teamId === teamId)
        );
    };

    return {
        favorites,
        addFavorite,
        removeFavorite,
        isFavorite,
    };
}
