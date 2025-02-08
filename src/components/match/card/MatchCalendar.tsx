'use client';

import { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { DateSelectArg } from '@fullcalendar/core/index.js';
import { Card } from '@/components/ui/common/card';

interface MatchCalendarProps {
    onDateSelect?: (date: Date) => void;
}

interface Match {
    id: number;
    utcDate: string;
    status: string;
    homeTeam: {
        name: string;
    };
    awayTeam: {
        name: string;
    };
}

export default function MatchCalendar({ onDateSelect }: MatchCalendarProps) {
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMatches = async () => {
            try {
                const response = await fetch('/api/football-api?path=matches');
                const data = await response.json();

                if (data.matches) {
                    setMatches(data.matches);
                }
            } catch (error) {
                console.error('Failed to fetch matches:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchMatches();
    }, []);

    const calendarEvents = matches.map((match) => ({
        title: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
        start: match.utcDate.split('T')[0],
        display: 'background',
        backgroundColor: 'bg-blue-100',
    }));

    const handleDateSelect = (selectInfo: DateSelectArg) => {
        const selectedDate = selectInfo.start;
        const dateStr = selectedDate.toISOString().split('T')[0];

        const matchesOnDate = matches.filter(
            (match) => match.utcDate.split('T')[0] === dateStr
        );

        if (matchesOnDate.length > 0) {
            onDateSelect?.(selectedDate);
        }

        if (loading) {
            return <div className="flex justify-center p-4">Loading...</div>;
        }
    };

    return (
        <Card className="p-4">
            <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                height="auto"
                selectable={true}
                select={handleDateSelect}
                events={calendarEvents}
                eventColor="bg-blue-100"
                eventTextColor="text-blue-800"
                eventContent={(eventInfo) => (
                    <div className="bg-blue-100 text-blue-800 p-1 rounded">
                        {eventInfo.event.title}
                    </div>
                )}
                locale="ko"
            />
        </Card>
    );
}
