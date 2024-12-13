'use client';

import React from 'react';
import useSignUp from './hook';
import styles from './styles.module.css';

const SignUp = () => {
    const { register, handleSubmit, errors, isValid } = useSignUp();

    return (
        <div className={styles.signUpContainer}>
            <form onSubmit={handleSubmit} className={styles.signUpBox}>
                <div className={styles.inputText}>
                    <label>이메일</label>
                    <input
                        type="email"
                        {...register('email')}
                        placeholder="example@email.com"
                    />
                    {errors.email && <p>{errors.email.message}</p>}
                </div>

                <div className={styles.inputText}>
                    <label>비밀번호</label>
                    <input
                        type="password"
                        {...register('password')}
                        placeholder="비밀번호"
                    />
                    {errors.password && <p>{errors.password.message}</p>}
                </div>

                <div className={styles.inputText}>
                    <label>비밀번호 확인</label>
                    <input
                        type="password"
                        {...register('password2')}
                        placeholder="비밀번호 확인"
                    />
                    {errors.password2 && <p>{errors.password2.message}</p>}
                </div>

                <div className={styles.inputText}>
                    <label>이름</label>
                    <input
                        type="text"
                        {...register('name')}
                        placeholder="이름"
                    />
                    {errors.name && <p>{errors.name.message}</p>}
                </div>

                <button type="submit" disabled={!isValid}>
                    회원가입
                </button>
            </form>
        </div>
    );
};

export default SignUp;
