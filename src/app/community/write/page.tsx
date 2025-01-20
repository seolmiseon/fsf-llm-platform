'use client';

import PostForm from '@/components/community/board/PostForm';

export default function WritePage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">글 작성</h1>
            <PostForm />
        </div>
    );
}
