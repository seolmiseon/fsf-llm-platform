'use client';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '../ui/button/Button';
import { Input } from '../ui/input/Input';
import { ValidationPatterns } from '@/utils/Validation';
import { useModalStore } from '@/store/useModalStore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useState } from 'react';
import { Error } from '../ui/common/error';

export default function SignupForm() {
    const { setUser } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [validationErrors, setValidationErrors] = useState<
        Record<string, string>
    >({});
    const { close } = useModalStore();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        if (!formData || !auth) return;
        try {
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                formData.get('email') as string,
                formData.get('password') as string
            );

            await updateProfile(userCredential.user, {
                displayName: formData.get('name') as string,
            });

            setUser(userCredential.user);
            // 회원가입 완료 후 바로 로그인 상태로 모달 닫기
            close();
        } catch (error: any) {
            console.error('Signup error:', error);
        }
    };
    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-4 w-full max-w-md mx-auto"
        >
            <Input
                name="name"
                type="text"
                placeholder="이름을 입력하세요"
                validation={ValidationPatterns.name}
                required
                helperText="실명을 입력하세요"
            />

            <Input
                name="email"
                type="email"
                placeholder="이메일을 입력하세요"
                label="이메일"
                validation={ValidationPatterns.email}
                required
            />

            <Input
                name="password"
                type="password"
                placeholder="비밀번호를 입력하세요"
                label="비밀번호"
                validation={ValidationPatterns.password}
                required
            />
            {validationErrors.auth && (
                <Error
                    message={validationErrors.auth}
                    retry={() => setValidationErrors({})}
                />
            )}
            <Button type="submit" variant="primary" fullWidth>
                {loading ? '회원가입중...' : '회원가입'}
            </Button>
        </form>
    );
}
