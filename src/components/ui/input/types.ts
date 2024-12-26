import { InputHTMLAttributes } from 'react';

export type ValidationRule = {
    pattern: RegExp;
    message: string;
};

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    error?: string;
    label?: string;
    validation?: ValidationRule;
    helperText?: string;
}
