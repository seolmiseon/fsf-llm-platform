import { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
}

export const Button = ({
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    children,
    className,
    ...props
}: ButtonProps) => {
    const baseStyles =
        'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

    return (
        <button
            className={`${baseStyles} ${styles[variant]} ${styles[size]} 
            ${fullWidth ? 'w-full' : ''} ${className || ''}`}
            {...props}
        >
            {children}
        </button>
    );
};
