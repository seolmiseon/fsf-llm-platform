import { StandingTeam } from '@/types/api/football-data';
import { getPlaceholderImageUrl } from '@/utils/imageUtils';
import Image from 'next/image';

interface PositionStandingProps {
    standings: StandingTeam[];
    highlightTeamId?: number;
}



export const PositionTable = ({
    standings,
    highlightTeamId,
}: PositionStandingProps) => {
    if (!standings || standings.length === 0) {
        return <div>No standings data available</div>;
    }
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Pos
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Team
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            MP
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            W
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            D
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            L
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            GF
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            GA
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            GD
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Pts
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Form
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {standings.map((team) => (
                        <tr
                            key={team.team.id}
                            className={`
                                ${
                                    highlightTeamId === team.team.id
                                        ? 'bg-blue-50'
                                        : ''
                                }
                                ${
                                    team.position <= 4
                                        ? 'border-l-4 border-green-500'
                                        : ''
                                }
                                ${
                                    team.position >= standings.length - 3
                                        ? 'border-l-4 border-red-500'
                                        : ''
                                }
                                hover:bg-gray-50
                            `}
                        >
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                                {team.position}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center">
                                    <Image
                                        src={
                                            team.team.crest ||
                                            getPlaceholderImageUrl('team')
                                        }
                                        alt={`${team.team.name} crest`}
                                        width={24}
                                        height={24}
                                        onError={(e) => {
                                            e.currentTarget.src =
                                                getPlaceholderImageUrl('team');
                                        }}
                                    />
                                    <span className="text-sm font-medium">
                                        {team.team.name}
                                    </span>
                                </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                {team.playedGames}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                {team.won}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                {team.draw}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                {team.lost}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                {team.goalsFor}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                {team.goalsAgainst}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                {team.goalDifference}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-bold">
                                {team.points}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                {team.form && (
                                    <div className="flex gap-1 justify-center">
                                        {team.form
                                            .split('')
                                            .map((result, index) => (
                                                <span
                                                    key={index}
                                                    className={`
                                                    w-5 h-5 flex items-center justify-center text-xs font-medium rounded
                                                    ${
                                                        result === 'W'
                                                            ? 'bg-green-100 text-green-800'
                                                            : ''
                                                    }
                                                    ${
                                                        result === 'D'
                                                            ? 'bg-yellow-100 text-yellow-800'
                                                            : ''
                                                    }
                                                    ${
                                                        result === 'L'
                                                            ? 'bg-red-100 text-red-800'
                                                            : ''
                                                    }
                                                `}
                                                >
                                                    {result}
                                                </span>
                                            ))}
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Legend */}
            <div className="mt-4 flex gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500"></div>
                    <span>Champions League</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500"></div>
                    <span>Relegation</span>
                </div>
            </div>
        </div>
    );
};

export default PositionTable;
