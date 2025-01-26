import { useModalStore } from '@/store/useModalStore';
import { Dialog, DialogContent } from '../common/dialog';
import { Button } from '../button/Button';
import { auth } from '@/lib/firebase/config';
import { signOut } from 'firebase/auth';
import { useAuthStore } from '@/store/useAuthStore';

const handleLogout = async () => {
    try {
        await signOut(auth);
        useAuthStore.getState().setUser(null);

        window.location.href = '/signin';
    } catch (error) {
        console.error('Logout error:', error);

        alert('로그아웃에 실패했습니다. 다시 시도해 주세요.');
    }
};

export function LogoutModal() {
    const { isOpen = false, type = null, close } = useModalStore();

    console.log('LogoutModal render:', { isOpen, type });

    if (!isOpen || type !== 'logout') return null;

    return (
        <Dialog>
            <DialogContent>
                <h2>로그아웃을 하시겠습니까?</h2>
                <div className="flex gap-4">
                    <Button onClick={() => handleLogout()}>확인</Button>
                    <Button variant="outline" onClick={close}>
                        취소
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
