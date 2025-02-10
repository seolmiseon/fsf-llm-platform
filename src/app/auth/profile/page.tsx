import ProfileContent from '@/components/auth/ProfileContent';

export default function ProfilePage() {
    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">내 프로필</h1>
            <ProfileContent />
        </div>
    );
}
