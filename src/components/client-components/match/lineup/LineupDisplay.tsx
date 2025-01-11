import { MatchLineup } from '@/types/api/football-data';
import { SquadMember } from '@/types/api/responses';

type LineupDisplayProps = MatchLineup;

export const LineupDisplay = ({ homeTeam, awayTeam }: LineupDisplayProps) => {
    const renderPlayerList = (players: SquadMember[]) => (
        <div className="space-y-2">
            {players.map((player) => (
                <div
                    key={player.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                    <div className="flex items-center gap-2">
                        {player.shirtNumber && (
                            <span className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded-full text-sm font-medium">
                                {player.shirtNumber}
                            </span>
                        )}
                        <span>{player.name}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                        {player.position}
                    </span>
                </div>
            ))}
        </div>
    );

    return (
        <div className="grid grid-cols-2 gap-8 p-4">
            {/* 홈팀 */}
            <div>
                <div className="mb-4">
                    <h3 className="text-lg font-semibold">{homeTeam.name}</h3>
                    <p className="text-sm text-gray-500">
                        Formation: {homeTeam.formation}
                    </p>
                    <p className="text-sm text-gray-500">
                        Coach: {homeTeam.coach.name}
                    </p>
                </div>

                <div className="space-y-4">
                    <div>
                        <h4 className="font-medium mb-2">Starting XI</h4>
                        {renderPlayerList(homeTeam.startingXI)}
                    </div>
                    <div>
                        <h4 className="font-medium mb-2">Substitutes</h4>
                        {renderPlayerList(homeTeam.substitutes)}
                    </div>
                </div>
            </div>

            {/* 원정팀 */}
            <div>
                <div className="mb-4">
                    <h3 className="text-lg font-semibold">{awayTeam.name}</h3>
                    <p className="text-sm text-gray-500">
                        Formation: {awayTeam.formation}
                    </p>
                    <p className="text-sm text-gray-500">
                        Coach: {awayTeam.coach.name}
                    </p>
                </div>

                <div className="space-y-4">
                    <div>
                        <h4 className="font-medium mb-2">Starting XI</h4>
                        {renderPlayerList(awayTeam.startingXI)}
                    </div>
                    <div>
                        <h4 className="font-medium mb-2">Substitutes</h4>
                        {renderPlayerList(awayTeam.substitutes)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LineupDisplay;
