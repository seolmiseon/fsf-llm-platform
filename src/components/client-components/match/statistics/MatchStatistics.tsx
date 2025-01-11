import { MatchStatistic } from '@/types/api/football-data';

interface MatchStatisticsProps {
    statistics: MatchStatistic[];
    homeTeamName: string;
    awayTeamName: string;
}

const parseStatValue = (value: string) => {
    return parseInt(value.replace('%', ''));
};

export const MatchStatistics = ({
    statistics,
    homeTeamName,
    awayTeamName,
}: MatchStatisticsProps) => {
    return (
        <div className="space-y-4 p-4">
            <h3 className="text-lg font-semibold mb-4">Match Statistics</h3>
            <div className="space-y-2">
                {statistics.map((stat, index) => (
                    <div
                        key={index}
                        className="flex items-center justify-between gap-4"
                    >
                        <div className="text-right w-16">
                            <span className="font-medium">{stat.home}</span>
                        </div>

                        {/* 스탯 바 */}
                        <div className="flex-1 relative h-6 bg-gray-100 rounded">
                            <div className="flex w-full h-full">
                                {/* 홈팀 바 */}
                                <div
                                    className="bg-blue-500 h-full rounded-l"
                                    style={{
                                        width: `${
                                            (parseStatValue(stat.home) /
                                                (parseStatValue(stat.home) +
                                                    parseStatValue(
                                                        stat.away
                                                    ))) *
                                            100
                                        }%`,
                                    }}
                                />
                                {/* 원정팀 바 */}
                                <div
                                    className="bg-red-500 h-full rounded-r"
                                    style={{
                                        width: `${
                                            (parseStatValue(stat.away) /
                                                (parseStatValue(stat.home) +
                                                    parseStatValue(
                                                        stat.away
                                                    ))) *
                                            100
                                        }%`,
                                    }}
                                />
                            </div>

                            {/* 스탯 이름 */}
                            <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-gray-700">
                                {stat.type.replace(/_/g, ' ')}
                            </span>
                        </div>

                        {/* 원정팀 수치 */}
                        <div className="w-16">
                            <span className="font-medium">{stat.away}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* 팀 이름 */}
            <div className="flex justify-between mt-4 text-sm font-medium">
                <span className="text-blue-500">{homeTeamName}</span>
                <span className="text-red-500">{awayTeamName}</span>
            </div>
        </div>
    );
};

export default MatchStatistics;
