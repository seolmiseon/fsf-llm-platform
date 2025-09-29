'use client';

import * as React from 'react';
import * as ToastPrimitives from '@radix-ui/react-toast';
import { X } from 'lucide-react';

const ToastProvider = ToastPrimitives.Provider;
const ToastViewport = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Viewport>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ ...props }, ref) => (
    <ToastPrimitives.Viewport
        ref={ref}
        className="fixed bottom-0 right-0 z-50 flex max-h-screen flex-col-reverse p-4 sm:flex-col md:max-w-[420px]"
        {...props}
    />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const Toast = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Root>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & {
        variant?: 'default' | 'destructive';
    }
>(({ variant = 'default', ...props }, ref) => {
    return (
        <ToastPrimitives.Root
            ref={ref}
            className={`bg-white border rounded-lg shadow-lg p-4 ${
                variant === 'destructive' ? 'border-red-500' : 'border-gray-200'
            }`}
            {...props}
        />
    );
});
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastTitle = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Title>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ ...props }, ref) => (
    <ToastPrimitives.Title
        ref={ref}
        className="text-sm font-semibold"
        {...props}
    />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Description>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ ...props }, ref) => (
    <ToastPrimitives.Description
        ref={ref}
        className="text-sm opacity-90"
        {...props}
    />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

const ToastClose = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Close>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ ...props }, ref) => (
    <ToastPrimitives.Close
        ref={ref}
        className="absolute right-2 top-2 p-1 text-gray-400 hover:text-gray-500"
        {...props}
    >
        <X className="h-4 w-4" />
    </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

export {
    type ToastProps,
    ToastProvider,
    ToastViewport,
    Toast,
    ToastTitle,
    ToastDescription,
    ToastClose,
};

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;
