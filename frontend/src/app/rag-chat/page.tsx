import RagChat from '@/components/RagChat';

export default function RagChatPage() {
    return (
        <div className="min-h-screen bg-gray-100 py-8">
            <div className="container mx-auto px-4">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        축구 AI 어시스턴트
                    </h1>
                    <p className="text-gray-600">
                        축구에 대한 모든 질문에 AI가 답변해드립니다
                    </p>
                </div>
                <RagChat />
            </div>
        </div>
    );
} 