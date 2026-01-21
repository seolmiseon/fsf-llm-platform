'use client';

import { useState, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useModalStore } from '@/store/useModalStore';
import { useAuthStore } from '@/store/useAuthStore';
import { BackendApi } from '@/lib/client/api/backend';
import { ReportModalData } from '@/types/ui/modal';
import { Button } from '@/components/ui/button/Button';

// 신고 카테고리 목록
const REPORT_CATEGORIES = [
    { value: 'profanity', label: '욕설/비속어' },
    { value: 'harassment', label: '괴롭힘/따돌림' },
    { value: 'hate_speech', label: '혐오 발언' },
    { value: 'spam', label: '스팸/광고' },
    { value: 'inappropriate', label: '부적절한 내용' },
    { value: 'personal_info', label: '개인정보 노출' },
    { value: 'other', label: '기타' },
] as const;

type ReportCategory = typeof REPORT_CATEGORIES[number]['value'];

// 신고 대상 타입 한글 변환
const TARGET_TYPE_LABELS = {
    post: '게시글',
    comment: '댓글',
    user: '사용자',
} as const;

interface ReportModalProps {
    data: ReportModalData;
}

export function ReportModal({ data }: ReportModalProps) {
    const { close } = useModalStore();
    const { user } = useAuthStore();
    const backendApi = useMemo(() => new BackendApi(), []);

    // 상태
    const [category, setCategory] = useState<ReportCategory | null>(null);
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // 유효성 검사
    const isValid = category !== null && reason.trim().length >= 10;

    // 신고 제출
    const handleSubmit = async () => {
        if (!isValid || !user || loading) return;

        setLoading(true);
        setError(null);

        try {
            const response = await backendApi.createReport(
                data.targetType,
                data.targetId,
                category!,
                reason.trim()
            );

            if (response.success) {
                setSuccess(true);
                // 2초 후 모달 닫기
                setTimeout(() => {
                    close();
                }, 2000);
            } else {
                // 에러 메시지 처리
                if (response.error?.includes('429') || response.error?.includes('REPORT_ABUSE')) {
                    setError('신고 횟수가 너무 많습니다. 잠시 후 다시 시도해주세요.');
                } else if (response.error?.includes('409') || response.error?.includes('이미 신고')) {
                    setError('이미 신고한 대상입니다.');
                } else {
                    setError(response.error || '신고 접수 중 오류가 발생했습니다.');
                }
            }
        } catch (err) {
            console.error('Report submission error:', err);
            setError('네트워크 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // 로그인 필요
    if (!user) {
        return (
            <Dialog.Root open={true} onOpenChange={close}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 w-[90vw] max-w-md z-50 shadow-xl">
                        <Dialog.Title className="text-lg font-bold mb-4">
                            🚨 신고하기
                        </Dialog.Title>
                        <p className="text-gray-600 mb-4">
                            신고하려면 로그인이 필요합니다.
                        </p>
                        <div className="flex justify-end">
                            <Button onClick={close}>닫기</Button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        );
    }

    // 성공 화면
    if (success) {
        return (
            <Dialog.Root open={true} onOpenChange={close}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 w-[90vw] max-w-md z-50 shadow-xl">
                        <div className="text-center py-4">
                            <div className="text-4xl mb-4">✅</div>
                            <h3 className="text-lg font-bold text-green-600 mb-2">
                                신고가 접수되었습니다
                            </h3>
                            <p className="text-gray-600 text-sm">
                                검토 후 적절한 조치를 취하겠습니다.
                            </p>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        );
    }

    return (
        <Dialog.Root open={true} onOpenChange={close}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 w-[90vw] max-w-md z-50 shadow-xl max-h-[85vh] overflow-y-auto">
                    {/* 헤더 */}
                    <div className="flex justify-between items-center mb-4">
                        <Dialog.Title className="text-lg font-bold">
                            🚨 신고하기
                        </Dialog.Title>
                        <Dialog.Close asChild>
                            <button 
                                className="text-gray-400 hover:text-gray-600 text-xl"
                                aria-label="닫기"
                            >
                                ✕
                            </button>
                        </Dialog.Close>
                    </div>

                    {/* 신고 대상 표시 */}
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-500">신고 대상: </span>
                        <span className="font-medium">
                            {TARGET_TYPE_LABELS[data.targetType]}
                        </span>
                    </div>

                    {/* 에러 메시지 */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* 카테고리 선택 */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            신고 유형을 선택해주세요
                        </label>
                        <div className="space-y-2">
                            {REPORT_CATEGORIES.map((cat) => (
                                <label
                                    key={cat.value}
                                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                                        category === cat.value
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="category"
                                        value={cat.value}
                                        checked={category === cat.value}
                                        onChange={() => setCategory(cat.value)}
                                        className="mr-3 text-blue-500"
                                    />
                                    <span className="text-sm">{cat.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* 신고 사유 입력 */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            신고 사유 (10자 이상)
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="구체적인 신고 사유를 작성해주세요..."
                            className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows={4}
                            maxLength={500}
                            disabled={loading}
                        />
                        <div className="text-right text-xs text-gray-400 mt-1">
                            {reason.length}/500자
                            {reason.length > 0 && reason.length < 10 && (
                                <span className="text-red-500 ml-2">
                                    (최소 10자 필요)
                                </span>
                            )}
                        </div>
                    </div>

                    {/* 버튼 */}
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={close}
                            disabled={loading}
                            className="flex-1"
                        >
                            취소
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={!isValid || loading}
                            className="flex-1"
                        >
                            {loading ? '신고 중...' : '신고하기'}
                        </Button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
