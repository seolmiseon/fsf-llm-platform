'use client';

import { forwardRef, useEffect, useState } from 'react';
import styles from './Input.module.css';
import type { InputProps } from './types';

export const Input = forwardRef<HTMLInputElement, InputProps>(
    (
        {
            error,
            label,
            validation,
            helperText,
            onChange,
            disabled,
            className,
            ...props
        },
        ref
    ) => {
        const [validationError, setValidationError] = useState<
            string | undefined
        >('');

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            const pattern = validation?.pattern || props.pattern;

            if (pattern && value) {
                const isValid = new RegExp(pattern).test(value);
                if (!isValid) {
                    setValidationError(
                        validation?.message || '입력값이 올바르지 않습니다.'
                    );
                } else {
                    setValidationError(undefined);
                }
            }
            onChange?.(e);
        };

        useEffect(() => {
            if (error) {
                setValidationError(undefined);
            }
        }, [error]);

        const showError = error || validationError;

        return (
            <div
                className={`${styles.inputContainer} ${
                    error ? styles.error : ''
                }`}
            >
                {label && <label className={styles.label}>{label}</label>}
                <input
                    ref={ref}
                    className={`${styles.input} ${className || ''}`}
                    onChange={handleChange}
                    disabled={disabled}
                    {...props}
                />
                {showError ? (
                    <p className={styles.errorMessage}>{showError}</p>
                ) : helperText ? (
                    <p className={styles.helperText}>{helperText}</p>
                ) : null}
            </div>
        );
    }
);

Input.displayName = 'Input';
