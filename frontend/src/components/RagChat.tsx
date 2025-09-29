'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';
import { Loader2, Send, Bot, User } from 'lucide-react';

interface Message {
    id: string;
    content: string;
    isUser: boolean;
    timestamp: Date;
}

export default function RagChat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            content: input,
            isUser: true,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/rag', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ question: input }),
            });

            const data = await response.json();

            if (response.ok) {
                const botMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    content: data.answer || data.message || '응답을 받았습니다.',
                    isUser: false,
                    timestamp: new Date(),
                };
                setMessages(prev => [...prev, botMessage]);
            } else {
                const errorMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    content: `오류: ${data.error || '알 수 없는 오류가 발생했습니다.'}`,
                    isUser: false,
                    timestamp: new Date(),
                };
                setMessages(prev => [...prev, errorMessage]);
            }
        } catch (error) {
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                content: '네트워크 오류가 발생했습니다.',
                isUser: false,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-2 mb-6">
                <Bot className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-bold">축구 AI 어시스턴트</h2>
            </div>
            
            <div className="space-y-4">
                {/* 메시지 영역 */}
                <div className="h-96 overflow-y-auto space-y-4 p-4 border rounded-lg bg-gray-50">
                    {messages.length === 0 ? (
                        <div className="text-center text-gray-500">
                            축구에 대해 무엇이든 물어보세요! 🏈
                        </div>
                    ) : (
                        messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex gap-3 ${
                                    message.isUser ? 'justify-end' : 'justify-start'
                                }`}
                            >
                                <div
                                    className={`flex gap-2 max-w-[80%] ${
                                        message.isUser ? 'flex-row-reverse' : 'flex-row'
                                    }`}
                                >
                                    <div
                                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                            message.isUser
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-300 text-gray-700'
                                        }`}
                                    >
                                        {message.isUser ? (
                                            <User className="h-4 w-4" />
                                        ) : (
                                            <Bot className="h-4 w-4" />
                                        )}
                                    </div>
                                    <div
                                        className={`p-3 rounded-lg ${
                                            message.isUser
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-white border'
                                        }`}
                                    >
                                        <p className="whitespace-pre-wrap">{message.content}</p>
                                        <p className="text-xs opacity-70 mt-1">
                                            {message.timestamp.toLocaleTimeString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                    {isLoading && (
                        <div className="flex gap-3 justify-start">
                            <div className="flex gap-2">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                                    <Bot className="h-4 w-4" />
                                </div>
                                <div className="p-3 rounded-lg bg-white border">
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>AI가 생각 중...</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 입력 영역 */}
                <div className="flex gap-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="축구에 대해 질문해보세요..."
                        disabled={isLoading}
                        className="flex-1"
                    />
                    <Button
                        onClick={sendMessage}
                        disabled={isLoading || !input.trim()}
                        size="sm"
                        className="px-3"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
} 