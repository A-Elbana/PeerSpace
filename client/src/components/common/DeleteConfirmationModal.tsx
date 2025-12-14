import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    itemType?: string; // Made generic string and optional
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    itemType = 'Item'
}) => {
    if (!isOpen) return null;

    // Capitalize first letter of itemType for the header
    const formattedItemType = itemType.charAt(0).toUpperCase() + itemType.slice(1);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-lg p-6 m-4 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3 text-destructive">
                        <div className="p-2 bg-destructive/10 rounded-full">
                            <AlertTriangle size={24} />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground">Delete {formattedItemType}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="mb-6">
                    <p className="font-medium text-foreground mb-1">{title}</p>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 text-sm font-medium text-destructive-foreground bg-destructive hover:bg-destructive/90 rounded-lg transition-colors"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
};
