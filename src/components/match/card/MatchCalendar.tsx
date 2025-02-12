'use client';

import { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Card } from '@/components/ui/common/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/common/dialog';
import NotificationBell from '@/components/notification/NotificationBell';

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

export default function MatchCalendar() {
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);

    useEffect(() => {
        const fetchMatches = async () => {
            try {
                const response = await fetch('/api/football?path=matches');
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

    useEffect(() => {
        if (selectedDate && matches.length > 0) {
            try {
                const dateStr = selectedDate.toISOString().split('T')[0];
                const filtered = matches.filter(
                    (match) => match.utcDate.split('T')[0] === dateStr
                );
                setFilteredMatches(filtered);
            } catch (error) {
                console.error('Invalid date:', error);
                setFilteredMatches([]);
            }
        }
    }, [selectedDate, matches]);

    const calendarEvents = matches.map((match) => ({
        id: match.id.toString(),
        title: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
        start: match.utcDate.split('T')[0],
        display: 'block',
        backgroundColor: '#93c5fd',
        textColor: '#1e3a8a',
    }));

    const handleEventClick = (info: any) => {
        console.log('Event click info:', info);
        if (info.date) {
            setSelectedDate(new Date(info.date));
        } else {
            console.error('Invalid date from event:', info);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-4">Loading...</div>;
    }

    return (
        <Card className="p-4">
            <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                height="auto"
                events={calendarEvents}
                eventClick={handleEventClick}
                locale="ko"
            />
            <Dialog
                open={!!selectedDate}
                onOpenChange={() => setSelectedDate(null)}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {' '}
                            {selectedDate?.toLocaleDateString()} 경기 일정
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                        {filteredMatches.length === 0 ? (
                            <div className="text-center text-gray-500 p-4">
                                경기 일정이 없습니다.
                            </div>
                        ) : (
                            filteredMatches.map((match) => (
                                <div
                                    key={match.id}
                                    className="flex flex-col p-2 border-b"
                                >
                                    <div className="flex justify-between mb-2">
                                        <div>
                                            {match.homeTeam.name} vs{' '}
                                            {match.awayTeam.name}
                                        </div>
                                        <div>
                                            {new Date(
                                                match.utcDate
                                            ).toLocaleTimeString('ko-KR', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </div>
                                    </div>
                                    <NotificationBell matchId={match.id} />
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
