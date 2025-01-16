'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Card } from '../ui/common/card';
import { getPlaceholderImageUrl } from '@/utils/imageUtils';

export function KLeagueCards() {
    const router = useRouter();

    const handleKLeagueClick = () => {
        router.push('/stats');
    };

    return (
        <>
            {['1부리그', '2부리그'].map((division) => (
                <Card
                    key={division}
                    className="p-4 cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                    onClick={handleKLeagueClick}
                >
                    <div className="relative aspect-square w-full">
                        <Image
                            src="/images/KLeague.png"
                            alt={`K League ${division}`}
                            fill
                            className="object-contain p-2"
                            priority
                            onError={(e) => {
                                e.currentTarget.src =
                                    getPlaceholderImageUrl('league');
                            }}
                        />
                    </div>
                    <div className="text-center mt-2">
                        <p className="font-medium">K LEAGUE</p>
                        <p className="text-sm text-gray-600">{division}</p>
                    </div>
                </Card>
            ))}
        </>
    );
}
