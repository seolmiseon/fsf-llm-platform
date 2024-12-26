'use client';

import { useSession } from 'next-auth/react';
import { useSignin } from '@/hooks/useSignin';
import { Button } from '../ui/button/Button';
import { Input } from '../ui/input/Input';
import {
    validateField,
    validateForm,
    ValidationPatterns,
} from '@/lib/utils/Validation';
import SocialLoginButtons from './SocialLoginButtons';
import React, { useState } from 'react';

export default function SigninForm() {
    const { error: authError, loading, handleSignIn } = useSignin();
    const { data: session, status } = useSession();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [validationErrors, setValidationErrors] = useState<
        Record<string, string>
    >({});

    if (status === 'authenticated') {
        return <div>이미 로그인되어있습니다, {session.user?.email}</div>;
    }

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
        const errors = validateForm(formData, ['email', 'password']);
        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
        }
        await handleSignIn(formData.email, formData.password);
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
                    pattern={validationErrors.email}
                    required
                />

                <Input
                    name="password"
                    type="password"
                    placeholder="비밀번호를 입력하세요"
                    value={formData.password}
                    onChange={handleChange}
                    pattern={validationErrors.password}
                    required
                />
            </div>
            {Object.values(validationErrors).map(
                (error, index) =>
                    error && (
                        <p key={index} className="text-red-500 text-sm">
                            {error}
                        </p>
                    )
            )}
            {authError && <p className="text-red-500 text-sm">{authError}</p>}

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
