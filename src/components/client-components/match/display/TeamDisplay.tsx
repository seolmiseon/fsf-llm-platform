import Image from 'next/image';
import { TeamBase } from '@/types/api/responses';
import { getPlaceholderImageUrl } from '@/utils/imageUtils';

interface TeamDisplayProps {
    team: TeamBase;
    align: 'left' | 'right';
    size?: 'sm' | 'md' | 'lg';
}

export const TeamDisplay = ({ team, align, size = 'md' }: TeamDisplayProps) => {
    const sizeClass = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-16 h-16',
    };

    return (
        <div
            className={`flex items-center gap-4 ${
                align === 'right' ? 'flex-row-reverse' : 'flex-row'
            }`}
        >
            <div className="flex flex-col items-center">
                <Image
                    src={team.crest || getPlaceholderImageUrl('team')}
                    alt={`${team.name} crest`}
                    width={64}
                    height={64}
                    className={`${sizeClass[size]} object-contain`}
                    sizes={
                        size === 'sm' ? '32px' : size === 'md' ? '48px' : '64px'
                    }
                    onError={(e) => {
                        e.currentTarget.src = getPlaceholderImageUrl('team');
                    }}
                />
                <span className="text-xs text-gray-500 mt-1">{team.tla}</span>
            </div>
            <h2
                className={`text-lg font-semibold ${
                    align === 'right' ? 'text-right' : 'text-left'
                }`}
            >
                {team.name}
            </h2>
        </div>
    );
};

export default TeamDisplay;
