'use client';

import useSignup from '@/hooks/useSignup';
import { Button } from '../ui/button/Button';
import { Input } from '../ui/input/Input';
import { ValidationPatterns } from '@/utils/Validation';
import { useModalStore } from '@/store/useModalStore';

export default function SignupForm() {
    const { signup, error, loading } = useSignup();
    const { switchToSignin } = useModalStore();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        await signup({
            email: formData.get('email') as string,
            password: formData.get('password') as string,
            name: formData.get('name') as string,
        });
        switchToSignin();
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-4 w-full max-w-md mx-auto"
        >
            {error && <p className="text-red-500">{error}</p>}

            <Input
                name="name"
                type="text"
                placeholder="이름을 입력하세요"
                validation={ValidationPatterns.name}
                disabled={loading}
                required
                helperText="실명을 입력하세요"
            />

            <Input
                name="email"
                type="email"
                placeholder="이메일을 입력하세요"
                label="이메일"
                disabled={loading}
                validation={ValidationPatterns.email}
                required
            />

            <Input
                name="password"
                type="password"
                placeholder="비밀번호를 입력하세요"
                label="비밀번호"
                validation={ValidationPatterns.password}
                disabled={loading}
                required
            />
            <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={loading}
            >
                {loading ? '회원가입중...' : '회원가입'}
            </Button>
        </form>
    );
}
