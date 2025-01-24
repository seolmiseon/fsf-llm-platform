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

export function SearchModal() {
    const { results, loading, error, hasMore, loadMore, handleSearch } =
        useServerSearch();
    const { close } = useModalStore();
    const auth = getAuth();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                close();
            }
        });

        return () => unsubscribe();
    }, [auth, close]);

    return (
        <Dialog>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>검색 결과</DialogTitle>
                </DialogHeader>

                <Input
                    placeholder="Search leagues..."
                    onChange={(e) => handleSearch(e.target.value)}
                    autoFocus
                    className="mb-4"
                    helperText="리그 이름을 입력하세요"
                    error={error}
                />

                <div className="max-h[400px] overflow-auto px-4">
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-green-400" />
                            <p className="mt-2 text-sm text-gray-500">
                                검색중 ...
                            </p>
                        </div>
                    )}

                    {results.map((result) => (
                        <div
                            key={result.id}
                            className="p-4 hover:bg-gray-100 rounded-lg transition-colors border-b last:border-b-0"
                        >
                            <h3 className="font-medium">{result.title}</h3>
                            {result.description && (
                                <p className="text-sm text-gray-600 mt-1">
                                    {result.description}
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
                        className="mt-4"
                    >
                        더 보기
                    </Button>
                )}
            </DialogContent>
        </Dialog>
    );
}
