'use client';

import { useEffect, useState } from 'react';
import styles from './Input.module.css';
import type { InputProps } from './types';

export const Input = ({
    error,
    label,
    validation,
    helperText,
    onChange,
    disabled,
    className,
    ...props
}: InputProps) => {
    const [validationError, setValidationError] = useState<string | undefined>(
        ''
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;

        if (validation?.pattern && value) {
            const isValid = validation.pattern.test(value);
            if (!isValid) {
                setValidationError(validation.message);
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
        <div>
            {label && <label className={styles.label}>{label}</label>}
            <input
                className={`${styles.input} ${className || ''}`}
                onChange={handleChange}
                disabled={disabled}
                {...props}
            />
            {helperText && !showError && (
                <p className={styles.helperText}>{helperText}</p>
            )}
            {showError && <p className={styles.errorMessage}>{showError}</p>}
        </div>
    );
};
