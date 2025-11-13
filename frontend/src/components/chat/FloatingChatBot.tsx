
'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

const ChatBot = dynamic(() => import('./ChatBot'), {
  ssr: false,
  loading: () => (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-lg shadow-2xl flex items-center justify-center z-50">
      <p className="text-gray-500">채팅 로딩 중...</p>
    </div>
  ),
});

export default function FloatingChatBot() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-16 h-16 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 hover:scale-110 transition-all z-50 flex items-center justify-center text-2xl"
          aria-label="AI 채팅 열기"
        >
          💬
        </button>
      )}

      {isOpen && <ChatBot onClose={() => setIsOpen(false)} />}
    </>
  );
}