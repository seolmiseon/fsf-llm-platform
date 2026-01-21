'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BackendApi } from '@/lib/client/api/backend';
import { useAuthStore } from '@/store/useAuthStore';
import { useModalStore } from '@/store/useModalStore';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

// 유저 프로필 타입
interface UserProfile {
  uid: string;
  username: string;
  created_at: string;
  bio: string | null;
  profile_image: string | null;
  favorite_team: string | null;
  favorite_league: string | null;
  post_count: number;
  comment_count: number;
  clubs: string[];
  badges: string[];
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const { user } = useAuthStore();
  const { open } = useModalStore();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const api = new BackendApi();

  // 프로필 조회
  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) return;

      setLoading(true);
      setError(null);

      const response = await api.getUserProfile(userId);

      if (response.success && response.data) {
        setProfile(response.data);
      } else {
        setError(response.error || '프로필을 불러올 수 없습니다.');
      }

      setLoading(false);
    };

    fetchProfile();
  }, [userId]);

  // 신고 모달 열기
  const handleReport = () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (user.uid === userId) {
      alert('자신을 신고할 수 없습니다.');
      return;
    }

    open('report', {
      kind: 'report',
      targetType: 'user',
      targetId: userId,
    });
  };

  // 로딩 상태
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  // 에러 상태
  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            😢 사용자를 찾을 수 없습니다
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 본인 프로필 여부
  const isOwnProfile = user?.uid === userId;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* 프로필 카드 */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* 헤더 배경 */}
          <div className="h-32 bg-gradient-to-r from-green-500 to-emerald-600"></div>

          {/* 프로필 정보 */}
          <div className="relative px-6 pb-6">
            {/* 프로필 이미지 */}
            <div className="absolute -top-16 left-6">
              <div className="w-32 h-32 rounded-full border-4 border-white bg-gray-200 flex items-center justify-center overflow-hidden shadow-lg">
                {profile.profile_image ? (
                  <img
                    src={profile.profile_image}
                    alt={profile.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-5xl text-gray-400">
                    {profile.username.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="flex justify-end pt-4 space-x-2">
              {isOwnProfile ? (
                <button
                  onClick={() => router.push('/settings/profile')}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  프로필 편집
                </button>
              ) : (
                <button
                  onClick={handleReport}
                  className="px-4 py-2 border border-red-300 rounded-lg text-red-600 hover:bg-red-50 transition"
                >
                  🚨 신고하기
                </button>
              )}
            </div>

            {/* 유저 정보 */}
            <div className="mt-8">
              <h1 className="text-2xl font-bold text-gray-900">
                {profile.username}
              </h1>

              {/* 가입일 */}
              <p className="text-gray-500 text-sm mt-1">
                {formatDistanceToNow(new Date(profile.created_at), {
                  addSuffix: true,
                  locale: ko,
                })}{' '}
                가입
              </p>

              {/* 자기소개 */}
              {profile.bio && (
                <p className="mt-4 text-gray-700">{profile.bio}</p>
              )}

              {/* 선호 팀/리그 */}
              {(profile.favorite_team || profile.favorite_league) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {profile.favorite_team && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                      ⚽ {profile.favorite_team}
                    </span>
                  )}
                  {profile.favorite_league && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                      🏆 {profile.favorite_league}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* 활동 통계 */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="text-2xl font-bold text-gray-900">
                    {profile.post_count}
                  </div>
                  <div className="text-sm text-gray-500">게시글</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="text-2xl font-bold text-gray-900">
                    {profile.comment_count}
                  </div>
                  <div className="text-sm text-gray-500">댓글</div>
                </div>
              </div>
            </div>

            {/* 배지 (미래 확장용) */}
            {profile.badges.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 mb-3">
                  획득한 배지
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.badges.map((badge, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm"
                    >
                      🏅 {badge}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 동호회 (미래 확장용) */}
            {profile.clubs.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 mb-3">
                  가입한 동호회
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.clubs.map((club, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                    >
                      👥 {club}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 돌아가기 버튼 */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.back()}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            ← 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}
