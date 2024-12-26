import { useModalStore } from '@/store/useModalStore';
import { SearchModal } from './SearchModal';
import { LogoutModal } from './LogoutModal';

export function ModalRoot() {
    const { type } = useModalStore();

    return (
        <>
            {type === 'search' && <SearchModal />}
            {type === 'logout' && <LogoutModal />}
        </>
    );
}
