import { LOGIN_USER } from '@/commons/queries/loginUser';
import { useBoardStore } from '@/commons/store/useBoardStore';
import { useMutation } from '@apollo/client';
import { useRouter } from 'next/navigation';
import { ChangeEvent } from 'react';
import { IInputs } from '../types/IStoreType';
import { userStore } from '@/commons/store/userStore';

export const useSignInPage = () => {
    const { setError, inputs, setInputs } = useBoardStore();
    const { user, setUser, accessToken } = userStore();
    const router = useRouter();

    const handleLoginSuccess = async (data: {
        loginUser: { user: any; accessToken: string };
    }) => {
        try {
            // 1. 유저 정보와 토큰을 전역 상태에 저장
            await setUser(data.loginUser.user, data.loginUser.accessToken);

            setTimeout(() => {
                router.push('/myPage');
            }, 100);
        } catch (error) {
            console.error('로그인 후처리 오류:', error);
            setError('로그인 처리 중 오류가 발생했습니다.');
        }
    };

    const [loginUser] = useMutation(LOGIN_USER, {
        onCompleted: async (data) => {
            if (data?.loginUser?.accessToken) {
                await handleLoginSuccess(data);
            }
        },
        onError: (error) => {
            console.error('Login failed:', error);
            setError('로그인 실패: 서버 오류가 발생했습니다.');
        },
    });

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setInputs(id as keyof IInputs, value);
    };

    const validateEmail = (email: string) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const validatePassword = (password: string) => password.length >= 6;

    const handleSignIn = async () => {
        if (!validateEmail(inputs.email)) {
            setError('이메일 형식이 올바르지 않습니다.');
            return;
        }

        if (!validatePassword(inputs.password)) {
            setError('비밀번호는 최소 6자리 이상이어야 합니다.');
            return;
        }

        try {
            await loginUser({
                variables: {
                    email: inputs.email,
                    password: inputs.password,
                },
            });
        } catch (error) {
            console.error('로그인 오류:', error);
        }
    };

    return {
        handleInputChange,
        handleSignIn,
    };
};
