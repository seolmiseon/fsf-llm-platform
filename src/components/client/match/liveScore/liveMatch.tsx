'use client';

import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase/config';

export default function LiveMatch() {
    const [matchData, setMatchData] = useState(null);

    useEffect(() => {
        // matches 경로의 데이터 구독
        const matchRef = ref(db, 'matches');

        const unsubscribe = onValue(matchRef, (snapshot) => {
            const data = snapshot.val();
            console.log('실시간 데이터:', data);
            setMatchData(data);
        });

        // 컴포넌트 언마운트 시 구독 해제
        return () => unsubscribe();
    }, []);

    return (
        <div>
            <h2>실시간 매치</h2>
            <pre>{JSON.stringify(matchData, null, 2)}</pre>
        </div>
    );
}
