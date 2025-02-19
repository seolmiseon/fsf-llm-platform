'use client';

import { useServerSearch } from '@/hooks/useServerSearch';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../common/dialog';
import { Loader2 } from 'lucide-react';
import { useModalStore } from '@/store/useModalStore';
import { Input } from '../input/Input';
import { Button } from '../button/Button';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SearchResult } from '@/types/ui/search';

export function SearchModal() {
    const router = useRouter();
    const { search, results, loading, error, hasMore, loadMore, handleSearch } =
        useServerSearch();
    const { close, type } = useModalStore();
    const auth = getAuth();

    const handleResultClick = (result: SearchResult) => {
        if (result.id) {
            router.push(`/leagues/${result.id}`); // 해당 리그 페이지로 이동
            close(); // 모달 닫기
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                close();
            }
        });

        return () => unsubscribe();
    }, [auth, close]);

    return (
        <Dialog open={type === 'search'} onOpenChange={() => close()}>
            <DialogContent className="sm:max-w-[425px] bg-white">
                <DialogHeader>
                    <DialogTitle>검색</DialogTitle>
                </DialogHeader>

                <Input
                    value={search}
                    placeholder="Search leagues..."
                    onChange={(e) => handleSearch(e.target.value)}
                    autoFocus
                    className="mb-4"
                    helperText="리그 이름을 입력하세요"
                    error={error}
                />

                <div className="max-h[400px] overflow-auto">
                    {loading && (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-8 w-8 animate-spin text-green-400" />
                            <p className="mt-2 text-sm text-gray-500">
                                검색중 ...
                            </p>
                        </div>
                    )}

                    {results.map((result) => (
                        <div
                            key={result.id}
                            className="p-3 hover:bg-gray-50 rounded cursor-pointer"
                            onClick={() => handleResultClick(result)}
                        >
                            <h3 className="font-medium">{result.title}</h3>
                            {result.authorName && (
                                <p className="text-sm text-gray-500 mt-1">
                                    {result.authorName}
                                </p>
                            )}
                        </div>
                    ))}
                </div>

                {hasMore && !loading && (
                    <Button
                        variant="ghost"
                        fullWidth
                        onClick={loadMore}
                        className="mt-4 w-full"
                    >
                        더 보기
                    </Button>
                )}
            </DialogContent>
        </Dialog>
    );
}
