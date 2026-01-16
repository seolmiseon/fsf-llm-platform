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
    serverTimestamp,
    Timestamp,
    arrayUnion,
    updateDoc,
    arrayRemove,
    setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface Favorite {
    id: string;
    userId: string;
    playerId?: string;
    teamName?: string;
    teamTla?: string;
    teamCrest?: string;
    type: 'favorite' | 'vote';
    createdAt: Timestamp;
}

export type NewFavorite = Omit<Favorite, 'id' | 'createdAt'>;

export function useFavorite(userId: string) {
    const [favorites, setFavorites] = useState<Favorite[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 즐겨찾기 목록 실시간 감지
    useEffect(() => {
        if (!userId || !db) return;

        try {
            const favoritesRef = collection(db, 'favorites');
            const q = query(
                favoritesRef,
                where('userId', '==', userId),
                orderBy('createdAt', 'desc')
            );

            const unsubscribe = onSnapshot(
                q,
                (snapshot) => {
                    const favoriteList = snapshot.docs.map(
                        (doc) =>
                            ({
                                id: doc.id,
                                ...doc.data(),
                            } as Favorite)
                    );
                    setFavorites(favoriteList);
                },
                (err) => {
                    setError(`Favorite data fetch error: ${err.message}`);
                    console.error('Favorites snapshot error:', err);
                }
            );

            return () => unsubscribe();
        } catch (err) {
            const error = err as Error;
            setError(`Favorite setup error: ${error.message}`);
            console.error('Favorites setup error:', error);
            return () => {};
        }
    }, [userId]);

    // ✅ 즐겨찾기 추가 (onSnapshot이 실시간 업데이트하므로 낙관적 업데이트 제거)
    const addFavorite = async (data: NewFavorite) => {
        if (!db || !userId || isLoading) return false;

        setIsLoading(true);
        setError(null);

        try {
            console.log('📝 Adding favorite to Firestore...');
            const favoritesRef = collection(db, 'favorites');

            await addDoc(favoritesRef, {
                ...data,
                userId,
                createdAt: serverTimestamp(),
            });

            const userRef = doc(db, 'users', userId);
            await setDoc(userRef, {
                teams: arrayUnion(data.playerId)
            }, { merge: true });

            console.log('✅ Favorite added successfully');
            // onSnapshot이 자동으로 UI 업데이트함
            return true;

        } catch (err) {
            const error = err as Error;
            setError(`Add favorite error: ${error.message}`);
            console.error('❌ Add favorite error:', error);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    // ✅ 즐겨찾기 제거 (onSnapshot이 실시간 업데이트하므로 낙관적 업데이트 제거)
    const removeFavorite = async (favoriteId: string) => {
        if (!db || isLoading) return false;

        setIsLoading(true);
        setError(null);

        const favoriteToRemove = favorites.find(f => f.id === favoriteId);

        try {
            const favoriteRef = doc(db, 'favorites', favoriteId);
            await deleteDoc(favoriteRef);

            if (favoriteToRemove?.playerId) {
                const userRef = doc(db, 'users', userId);
                await updateDoc(userRef, {
                    teams: arrayRemove(favoriteToRemove.playerId),
                });
            }
            // onSnapshot이 자동으로 UI 업데이트함
            return true;

        } catch (err) {
            const error = err as Error;
            setError(`Remove favorite error: ${error.message}`);
            console.error('Remove favorite error:', error);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const isFavorite = (playerId?: string) => {
        if (!playerId) return false;
        return favorites.some((fav) => fav.playerId === playerId);
    };

    return {
        favorites,
        addFavorite,
        removeFavorite,
        isFavorite,
        isLoading,
        error,
    };
}