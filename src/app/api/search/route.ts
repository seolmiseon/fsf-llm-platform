import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import admin from 'firebase-admin';

export async function GET(request: Request) {
    try {
        // 인증 확인
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json(
                { error: '인증이 필요합니다.' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = 10;

        if (!query) {
            return NextResponse.json({ results: [] });
        }

        const db = admin.firestore();
        const searchQuery = db
            .collection('posts')
            .orderBy('title')
            .where('title', '>=', query.toLowerCase())
            .where('title', '<=', query.toLowerCase() + '\uf8ff')
            .limit(limit + 1)
            .offset((page - 1) * limit);

        // 쿼리 실행
        const snapshot = await searchQuery.get();

        const results = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate().toISOString(),
        }));

        return NextResponse.json({
            results,
            pagination: {
                currentPage: page,
                hasMore: results.length === limit,
            },
        });
    } catch (error) {
        console.error('Search error:', error);
        return NextResponse.json(
            { error: '검색 중 오류가 발생했습니다' },
            { status: 500 }
        );
    }
}
function offset(arg0: number) {
    throw new Error('Function not implemented.');
}
