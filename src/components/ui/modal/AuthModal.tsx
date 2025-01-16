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
            <DialogContent className="sm:max-w-[520px] p-8 rounded-2xl mx-4 bg-white">
                <div className="flex flex-col items-center w-full">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-semibold text-center mb-6">
                            {type === 'signin' ? '로그인' : '회원가입'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-6 w-[90%] mt-auto">
                        {type === 'signin' ? <SigninForm /> : <SignupForm />}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
