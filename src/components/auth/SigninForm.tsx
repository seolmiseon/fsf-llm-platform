'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { Button } from '../ui/button/Button';
import { Input } from '../ui/input/Input';
import {
    validateField,
    validateForm,
    ValidationPatterns,
} from '@/utils/Validation';
import SocialLoginButtons from './SocialLoginButtons';
import { useRouter } from 'next/navigation';
import { useModalStore } from '@/store/useModalStore';
import { Error } from '../ui/common/error';

export default function SigninForm() {
    const { setUser } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [validationErrors, setValidationErrors] = useState<
        Record<string, string>
    >({});
    const router = useRouter();
    const { close } = useModalStore();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));

        const fieldError = validateField(
            name as keyof typeof ValidationPatterns,
            value
        );
        setValidationErrors((prev) => ({
            ...prev,
            [name]: fieldError,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const errors = validateForm(formData, ['email', 'password']);
        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            setLoading(false);
            return;
        }

        try {
            const userCredential = await signInWithEmailAndPassword(
                auth,
                formData.email,
                formData.password
            );
            setUser(userCredential.user);
            close();
            router.push('/');
        } catch (error: any) {
            console.error('Signin error:', error);
            setValidationErrors({
                auth: '이메일 또는 비밀번호가 올바르지 않습니다.',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <Input
                    name="email"
                    type="email"
                    placeholder="이메일을 입력하세요"
                    value={formData.email}
                    onChange={handleChange}
                    error={validationErrors.email}
                    required
                />

                <Input
                    name="password"
                    type="password"
                    placeholder="비밀번호를 입력하세요"
                    value={formData.password}
                    onChange={handleChange}
                    error={validationErrors.password}
                    required
                />
            </div>

            {validationErrors.auth && (
                <Error
                    message={validationErrors.auth}
                    retry={() => setValidationErrors({})}
                />
            )}

            <Button type="submit" fullWidth disabled={loading}>
                {loading ? '로그인 중...' : '로그인'}
            </Button>

            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 text-gray-500 bg-white">
                        소셜 계정으로 로그인
                    </span>
                </div>
            </div>
            <SocialLoginButtons />
        </form>
    );
}
