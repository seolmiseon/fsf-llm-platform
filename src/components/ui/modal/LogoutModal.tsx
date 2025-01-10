import { useModalStore } from '@/store/useModalStore';
import { Dialog, DialogContent } from '../common/dialog';
import { Button } from '../button/Button';
import { useLogout } from '@/hooks/useLogout';

export function LogoutModal() {
    const { isOpen, type, close } = useModalStore();

    if (!isOpen || type !== 'logout') return null;

    const { handleLogout } = useLogout();

    return (
        <Dialog>
            <DialogContent>
                <h2>로그아웃을 하시겠습니까?</h2>
                <div className="flex gap-4">
                    <Button onClick={handleLogout}>확인</Button>
                    <Button variant="outline" onClick={close}>
                        취소
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
