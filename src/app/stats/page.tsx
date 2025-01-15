'use client';

import { Card } from '@/components/ui/common/card';
import { ChartBar } from 'lucide-react';

export default function StatsPage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <Card className="p-8 text-center">
                <div className="flex flex-col items-center gap-4">
                    <ChartBar className="w-16 h-16 text-gray-400" />
                    <h1 className="text-2xl font-bold">통계 페이지 준비중</h1>
                    <p className="text-gray-600">
                        곧 더 자세한 축구 통계 정보를 제공해드리겠습니다.
                    </p>
                    <p className="text-sm text-gray-500">
                        득점, 도움, 경기 기록 등 다양한 통계 자료가 제공될
                        예정입니다.
                    </p>
                </div>
            </Card>
        </div>
    );
}
