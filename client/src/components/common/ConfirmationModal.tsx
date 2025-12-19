import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'warning' | 'danger';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 dark:bg-black/70"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-card border border-border rounded-lg shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
                <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${variant === 'danger'
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500'
                        }`}>
                        <AlertTriangle className="w-5 h-5" />
                    </div>

                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                            {title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {message}
                        </p>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        {cancelText}
                    </Button>
                    <Button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={
                            variant === 'danger'
                                ? 'bg-destructive hover:bg-destructive/90 text-white'
                                : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                        }
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
