'use client';

import { useModalStore } from '@/store/useModalStore';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../common/dialog';
import SigninForm from '@/components/auth/SigninForm';
import SignupForm from '@/components/auth/SignupForm';

export function AuthModal() {
    const { isOpen, type, close } = useModalStore();

    if (!isOpen || (type !== 'signin' && type !== 'signup')) return null;

    return (
        <Dialog open={isOpen} onOpenChange={close}>
            <DialogContent className="sm:max-w-[454px]">
                <DialogHeader>
                    <DialogTitle>
                        {type === 'signin' ? '로그인' : '회원가입'}
                    </DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-6">
                    {type === 'signin' ? <SigninForm /> : <SignupForm />}
                </div>
            </DialogContent>
        </Dialog>
    );
}
