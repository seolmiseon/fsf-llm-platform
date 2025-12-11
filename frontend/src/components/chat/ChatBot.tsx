'use client';

import { useState, useRef, useEffect } from 'react';
import { BackendApi } from '@/lib/client/api/backend';
import { trackLLMRequest, trackError } from '@/lib/amplitude';  +3+
652

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  image?: string; // Base64 data URL or URL
}

interface ChatBotProps {
  onClose: () => void;
}

export default function ChatBot({ onClose }: ChatBotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backendApi = new BackendApi();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim() || '이미지 분석 요청',
      timestamp: new Date(),
      image: imagePreview || undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input.trim();
    const currentImage = selectedImage;
    setInput('');
    handleRemoveImage();
    setIsLoading(true);

    const startTime = Date.now();

    try {
      let response;
      let responseTime;

      // 이미지가 있으면 vision API, 없으면 일반 chat API
      if (currentImage) {
        response = await backendApi.analyzeMatchChart(
          currentImage,
          currentInput || '경기 차트를 분석해주세요'
        );
        responseTime = Date.now() - startTime;

        if (response.success && response.data) {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: response.data.analysis,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);

          trackLLMRequest({
            question_type: 'vision_analysis',
            response_time_ms: responseTime,
            cache_hit: false,
          });
        } else {
          throw new Error(response.error || 'Failed to analyze image');
        }
      } else {
        response = await backendApi.chat(currentInput);
        responseTime = Date.now() - startTime;

        if (response.success && response.data) {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: response.data.answer,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);

          trackLLMRequest({
            question_type: 'general_chat',
            response_time_ms: responseTime,
            cache_hit: response.data.cache_hit || false,
          });
        } else {
          throw new Error(response.error || 'Failed to get response');
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);

      const responseTime = Date.now() - startTime;
      trackLLMRequest({
        question_type: currentImage ? 'vision_analysis' : 'general_chat',
        response_time_ms: responseTime,
        cache_hit: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      trackError('chat_error', {
        message: error instanceof Error ? error.message : 'Unknown error',
        user_input: userMessage.content.substring(0, 100),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-lg shadow-2xl flex flex-col z-50 border border-gray-200">
      {/* Header */}
      <div className="bg-blue-500 text-white p-4 rounded-t-lg flex justify-between items-center">
        <div>
          <h2 className="font-bold text-lg">⚽ AI 축구 상담</h2>
          <p className="text-xs text-blue-100">무엇이든 물어보세요!</p>
        </div>
        <button
          onClick={onClose}
          className="text-white hover:bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
          aria-label="닫기"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-sm">채팅을 시작하세요!</p>
            <p className="text-xs mt-2 text-gray-400">
              예: &quot;프리미어리그 순위표 알려줘&quot;
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[75%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {message.image && (
                <img
                  src={message.image}
                  alt="Uploaded"
                  className="mb-2 rounded max-w-full h-auto max-h-48 object-contain"
                />
              )}
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p
                className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}
              >
                {message.timestamp.toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        {/* 이미지 미리보기 */}
        {imagePreview && (
          <div className="mb-3 relative inline-block">
            <img
              src={imagePreview}
              alt="Preview"
              className="max-h-32 rounded border border-gray-300"
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 text-xs"
              aria-label="이미지 제거"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex gap-2">
          {/* 이미지 업로드 버튼 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
            aria-label="이미지 업로드"
          >
            📷
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="메시지 입력..."
            disabled={isLoading}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={isLoading || (!input.trim() && !selectedImage)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? '...' : '전송'}
          </button>
        </div>
      </form>
    </div>
  );
}