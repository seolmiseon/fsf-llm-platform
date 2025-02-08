'use client';

import {
    Toast,
    ToastClose,
    ToastDescription,
    ToastProvider,
    ToastTitle,
    ToastViewport,
} from './Toast';
import { useToastStore } from '@/store/useToastStore';
import { useEffect } from 'react';

export function Toaster() {
    const { toasts, removeToast } = useToastStore();

    // 자동 제거 처리
    useEffect(() => {
        toasts.forEach((toast) => {
            const timer = setTimeout(() => {
                removeToast(toast.id);
            }, toast.duration || 5000);

            return () => clearTimeout(timer);
        });
    }, [toasts, removeToast]);

    return (
        <ToastProvider>
            {toasts.map(({ id, title, description, variant }) => (
                <Toast key={id} variant={variant}>
                    <div className="grid gap-1">
                        {title && <ToastTitle>{title}</ToastTitle>}
                        {description && (
                            <ToastDescription>{description}</ToastDescription>
                        )}
                    </div>
                    <ToastClose onClick={() => removeToast(id)} />
                </Toast>
            ))}
            <ToastViewport />
        </ToastProvider>
    );
}
