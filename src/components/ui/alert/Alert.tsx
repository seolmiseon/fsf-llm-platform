import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '@/utils/cn';

interface AlertDialogProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description: string;
    variant?: 'default' | 'destructive' | 'success';
    onConfirm?: () => Promise<void>;
    showConfirm?: boolean;
}

const variantStyles = {
    default: 'bg-white',
    destructive: 'bg-red-50 text-red-900',
    success: 'bg-green-50 text-green-900',
};

export function AlertDialog({
    isOpen,
    onClose,
    title,
    description,
    variant = 'default',
    onConfirm,
    showConfirm,
}: AlertDialogProps) {
    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/30" />
                <Dialog.Content
                    className={cn(
                        'fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] rounded-lg p-4 shadow-lg',
                        variantStyles[variant]
                    )}
                >
                    {title && (
                        <Dialog.Title className="mb-2 text-lg font-semibold">
                            {title}
                        </Dialog.Title>
                    )}
                    <Dialog.Description className="text-sm">
                        {description}
                    </Dialog.Description>
                    {showConfirm && (
                        <div className="mt-4 flex justify-end space-x-2">
                            <Dialog.Close asChild>
                                <button
                                    className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                                    onClick={onClose}
                                >
                                    취소
                                </button>
                            </Dialog.Close>
                            <button
                                className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600"
                                onClick={() => {
                                    onConfirm?.();
                                }}
                            >
                                확인
                            </button>
                        </div>
                    )}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
