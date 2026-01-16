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
import { EventClickArg, DayCellContentArg } from '@fullcalendar/core/index.js';
import { FootballDataApi } from '@/lib/client/api/football-data';

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
    const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
    const [hoveredMatches, setHoveredMatches] = useState<Match[]>([]);
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const fetchMatches = async () => {
            try {
                const api = new FootballDataApi();
                const response = await api.getMatches();

                if (response.success) {
                    setMatches(response.data);
                } else {
                    console.error('Failed to fetch matches:', response.error);
                    setMatches([]);
                }
            } catch (error) {
                console.error('Failed to fetch matches:', error);
                setMatches([]);
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
                console.log('Filtered matches:', filtered);
                console.log(
                    'Match IDs:',
                    filtered.map((match) => match.id)
                );
                setFilteredMatches(filtered);
            } catch (error) {
                console.error('Invalid date:', error);
                setFilteredMatches([]);
            }
        }
    }, [selectedDate, matches]);

    const calendarEvents = matches.map((match) => {
        const isFinished = match.status === 'FINISHED';
        const isLive = match.status === 'LIVE' || match.status === 'IN_PLAY';
        
        return {
            id: match.id.toString(),
            title: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
            start: match.utcDate.split('T')[0],
            display: 'block',
            backgroundColor: isLive
                ? '#ef4444' // 빨간색 (LIVE)
                : isFinished
                ? '#6b7280' // 회색 (종료)
                : '#3b82f6', // 파란색 (예정)
            textColor: '#ffffff',
            borderColor: isLive
                ? '#dc2626'
                : isFinished
                ? '#4b5563'
                : '#2563eb',
            className: 'match-event',
        };
    });

    const handleEventClick = (info: EventClickArg) => {
        console.log('Event click info:', info);
        const eventDate = info.event.start;
        if (eventDate) {
            setSelectedDate(new Date(eventDate));
        } else {
            console.error('Invalid date from event:', info);
        }
    };

    // 날짜 셀에 마우스 올렸을 때 경기 목록 가져오기
    const handleDayCellMouseEnter = (
        date: Date,
        event: MouseEvent
    ) => {
        const dateStr = date.toISOString().split('T')[0];
        const dayMatches = matches.filter(
            (match) => match.utcDate.split('T')[0] === dateStr
        );
        
        if (dayMatches.length > 0) {
            setHoveredDate(date);
            setHoveredMatches(dayMatches);
            setPopoverPosition({ x: event.clientX, y: event.clientY });
            setPopoverOpen(true);
        }
    };

    // 날짜 셀 마운트 시 이벤트 리스너 추가
    const handleDayCellDidMount = (info: DayCellContentArg) => {
        const dayEl = info.el;
        const date = info.date;

        // 마우스 이벤트 리스너 추가
        const mouseEnterHandler = (e: MouseEvent) => {
            handleDayCellMouseEnter(date, e);
        };
        
        const mouseLeaveHandler = () => {
            setPopoverOpen(false);
            setTimeout(() => {
                setPopoverOpen((prev) => {
                    if (!prev) {
                        setHoveredDate(null);
                        setHoveredMatches([]);
                    }
                    return prev;
                });
            }, 200);
        };

        dayEl.addEventListener('mouseenter', mouseEnterHandler);
        dayEl.addEventListener('mouseleave', mouseLeaveHandler);

        // 클린업 함수는 FullCalendar가 자동으로 처리
    };

    if (loading) {
        return <div className="flex justify-center p-4">Loading...</div>;
    }

    return (
        <Card className="p-6 shadow-lg">
            <div className="mb-4">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    경기 일정 캘린더
                </h2>
                <p className="text-gray-600 text-sm">
                    날짜를 클릭하거나 경기 이벤트를 클릭하면 상세 일정을 볼 수
                    있습니다.
                </p>
            </div>
            <div className="mb-4 flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    <span>예정된 경기</span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-red-500 rounded"></div>
                    <span>진행 중</span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-gray-500 rounded"></div>
                    <span>종료</span>
                </div>
            </div>
            <div className="calendar-wrapper relative">
                <FullCalendar
                    plugins={[dayGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    height="auto"
                    events={calendarEvents}
                    eventClick={handleEventClick}
                    locale="ko"
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: '',
                    }}
                    dayHeaderFormat={{ weekday: 'short' }}
                    eventDisplay="block"
                    eventTextColor="#ffffff"
                    eventBorderColor="transparent"
                    dayMaxEvents={3}
                    moreLinkClick="popover"
                    dayCellDidMount={handleDayCellDidMount}
                />
                
                {/* 호버 팝오버 - 절대 위치로 표시 */}
                {popoverOpen && hoveredDate && hoveredMatches.length > 0 && (
                    <div
                        className="fixed z-50 w-96 max-h-[500px] overflow-y-auto bg-white rounded-lg shadow-2xl border border-gray-200 p-4"
                        style={{
                            left: `${popoverPosition.x + 10}px`,
                            top: `${popoverPosition.y + 10}px`,
                            transform: 'translate(0, 0)',
                        }}
                        onMouseEnter={() => setPopoverOpen(true)}
                        onMouseLeave={() => {
                            setPopoverOpen(false);
                            setHoveredDate(null);
                            setHoveredMatches([]);
                        }}
                    >
                        <div className="space-y-2">
                            <h3 className="font-bold text-lg mb-3 text-gray-800">
                                {hoveredDate.toLocaleDateString('ko-KR', {
                                    month: 'long',
                                    day: 'numeric',
                                    weekday: 'long',
                                })}{' '}
                                경기 ({hoveredMatches.length}경기)
                            </h3>
                            {hoveredMatches.map((match) => {
                                const matchTime = new Date(match.utcDate);
                                const isFinished = match.status === 'FINISHED';
                                const isLive =
                                    match.status === 'LIVE' ||
                                    match.status === 'IN_PLAY';

                                return (
                                    <div
                                        key={match.id}
                                        className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100 hover:shadow-md transition-all cursor-pointer"
                                        onClick={() => {
                                            setSelectedDate(hoveredDate);
                                            setPopoverOpen(false);
                                        }}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center space-x-2">
                                                <div className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-semibold">
                                                    {matchTime.toLocaleTimeString(
                                                        'ko-KR',
                                                        {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        }
                                                    )}
                                                </div>
                                                {isLive && (
                                                    <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold animate-pulse">
                                                        LIVE
                                                    </span>
                                                )}
                                                {isFinished && (
                                                    <span className="bg-gray-500 text-white px-2 py-1 rounded text-xs">
                                                        종료
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="font-semibold text-gray-800">
                                                {match.homeTeam.name}
                                            </div>
                                            <div className="mx-2 text-gray-400 font-bold">
                                                VS
                                            </div>
                                            <div className="font-semibold text-gray-800">
                                                {match.awayTeam.name}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
            <Dialog
                open={!!selectedDate}
                onOpenChange={() => setSelectedDate(null)}
            >
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">
                            {selectedDate?.toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                weekday: 'long',
                            })}{' '}
                            경기 일정
                        </DialogTitle>
                    </DialogHeader>
                    <div className="mt-4 space-y-3">
                        {filteredMatches.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-gray-400 text-6xl mb-4">
                                    ⚽
                                </div>
                                <p className="text-gray-500 text-lg">
                                    이 날짜에는 경기 일정이 없습니다.
                                </p>
                            </div>
                        ) : (
                            filteredMatches.map((match) => {
                                const matchTime = new Date(match.utcDate);
                                const isFinished = match.status === 'FINISHED';
                                const isLive =
                                    match.status === 'LIVE' ||
                                    match.status === 'IN_PLAY';

                                return (
                                    <div
                                        key={match.id}
                                        className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100 hover:shadow-lg transition-all duration-200"
                                    >
                                        {/* 시간 및 상태 */}
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center space-x-2">
                                                <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                                                    {matchTime.toLocaleTimeString(
                                                        'ko-KR',
                                                        {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        }
                                                    )}
                                                </div>
                                                {isLive && (
                                                    <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold animate-pulse">
                                                        LIVE
                                                    </span>
                                                )}
                                                {isFinished && (
                                                    <span className="bg-gray-500 text-white px-2 py-1 rounded text-xs">
                                                        종료
                                                    </span>
                                                )}
                                            </div>
                                            <NotificationBell
                                                matchId={match.id}
                                                matchDate={match.utcDate}
                                            />
                                        </div>

                                        {/* 팀 정보 */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 text-center">
                                                <div className="font-bold text-lg text-gray-800">
                                                    {match.homeTeam.name}
                                                </div>
                                            </div>
                                            <div className="mx-4 text-gray-400 font-bold text-xl">
                                                VS
                                            </div>
                                            <div className="flex-1 text-center">
                                                <div className="font-bold text-lg text-gray-800">
                                                    {match.awayTeam.name}
                                                </div>
                                            </div>
                                        </div>

                                        {/* 경기 상세 링크 (선택사항) */}
                                        <div className="mt-3 pt-3 border-t border-blue-200">
                                            <a
                                                href={`/match/${match.id}`}
                                                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center justify-center"
                                            >
                                                경기 상세보기 →
                                            </a>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
