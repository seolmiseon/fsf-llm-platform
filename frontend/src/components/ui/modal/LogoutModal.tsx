import { useModalStore } from '@/store/useModalStore';
import { Dialog, DialogContent } from '../common/dialog';
import { Button } from '../button/Button';
import { auth } from '@/lib/firebase/config';
import { signOut } from 'firebase/auth';
import { useAuthStore } from '@/store/useAuthStore';

export function LogoutModal() {
    const { isOpen = false, type = null } = useModalStore();

    console.log('LogoutModal render:', { isOpen, type });

    if (!isOpen || type !== 'logout') return null;

    const handleLogout = async () => {
        if (!auth) return;

        try {
            console.log('로그아웃 시작');
            await signOut(auth);
            console.log('로그아웃');
            useAuthStore.getState().setUser(null);
            console.log('로그아웃 업데이트');
            useModalStore.getState().close();
            console.log('Modal closed.');
            window.location.href = '/signin';
        } catch (error) {
            console.error('Logout error:', error);

            alert('로그아웃에 실패했습니다. 다시 시도해 주세요.');
        }
    };

    return (
        <Dialog>
            <DialogContent>
                <h2>로그아웃을 하시겠습니까?</h2>
                <div className="flex gap-4">
                    <Button onClick={handleLogout}>확인</Button>
                    <Button
                        variant="outline"
                        onClick={useModalStore.getState().close}
                    >
                        취소
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
