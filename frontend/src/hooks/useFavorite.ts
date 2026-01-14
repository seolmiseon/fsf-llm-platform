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
    getDoc,
    arrayRemove,
    setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface Favorite {
    id: string;
    userId: string;
    playerId?: string;
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

    // 즐겨찾기 추가
    const addFavorite = async (data: NewFavorite) => {
        console.log('🔍 addFavorite called', { data, db: !!db, userId, isLoading });

        if (!db) {
            console.error('❌ Firestore db is not initialized');
            setError('Firestore가 초기화되지 않았습니다.');
            return false;
        }

        if (!userId) {
            console.error('❌ userId is missing');
            setError('사용자 ID가 없습니다.');
            return false;
        }

        if (isLoading) {
            console.warn('⚠️ Already loading, skipping');
            return false;
        }

        setIsLoading(true);
        setError(null);

        try {
            console.log('📝 Adding favorite to Firestore...');
            const favoritesRef = collection(db, 'favorites');
            const docRef = await addDoc(favoritesRef, {
                ...data,
                userId,
                createdAt: serverTimestamp(),
            });
            console.log('✅ Favorite document created:', docRef.id);

            console.log('📝 Updating user document...');
            const userRef = doc(db, 'users', userId);

            // 문서가 없을 수도 있으므로 setDoc with merge 사용
            await setDoc(userRef, {
                teams: arrayUnion(data.playerId)
            }, { merge: true });
            console.log('✅ User document updated');

            return true;
        } catch (err) {
            const error = err as Error;
            const errorMessage = `Add favorite error: ${error.message}`;
            setError(errorMessage);
            console.error('❌ Add favorite error:', error);
            console.error('Error code:', (error as any).code);
            console.error('Error stack:', error.stack);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    // 즐겨찾기 제거
    const removeFavorite = async (favoriteId: string) => {
        if (!db) return false;
        if (isLoading) return false;

        setIsLoading(true);
        setError(null);

        try {
            const favoriteRef = doc(db, 'favorites', favoriteId);
            const favoriteDoc = await getDoc(favoriteRef);
            const favoriteData = favoriteDoc.data();
            const teamId = favoriteData?.playerId;
            await deleteDoc(favoriteRef);

            if (teamId) {
                const userRef = doc(db, 'users', userId);
                await updateDoc(userRef, {
                    teams: arrayRemove(teamId),
                });
            }
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

    // 즐겨찾기 여부 확인
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
