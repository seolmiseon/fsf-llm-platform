import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useMutation } from '@apollo/client';
import { CREATE_USER } from '@/commons/queries/createUser';
import { zodResolver } from '@hookform/resolvers/zod';
import { useBoardStore } from '@/commons/store/useBoardStore';
import { signUpSchema } from './schemas/signUpSchema';

interface ISignUpFormData {
    email: string;
    password: string;
    password2: string;
    name: string;
}

const useSignUp = () => {
    const {
        register,
        handleSubmit,
        formState: { errors, isValid },
    } = useForm<ISignUpFormData>({
        resolver: zodResolver(signUpSchema),
        mode: 'onChange', // 입력 시마다 유효성 검사
    });
    const { setError, resetForm } = useBoardStore();
    const router = useRouter();
    const [createUser] = useMutation(CREATE_USER);

    const onSubmit = async (data?: ISignUpFormData) => {
        if (!data) return;
        try {
            await createUser({
                variables: {
                    createUserInput: {
                        email: data.email,
                        password: data.password,
                        name: data.name,
                    },
                },
            });
            alert('회원가입이 완료되었습니다!');
            resetForm();
            router.push('/login');
        } catch (error) {
            console.error('회원가입 오류:', error);
            setError('회원가입에 실패했습니다. 다시 시도해주세요.');
        }
    };

    return {
        register,
        handleSubmit: handleSubmit(onSubmit),
        errors,
        isValid,
    };
};

export default useSignUp;
