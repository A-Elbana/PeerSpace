import React from 'react';
import { X } from 'lucide-react';

type TagChipProps = {
    label: string;
    onRemove?: () => void | Promise<void>;
    removable?: boolean;
    className?: string;
    size?: 'sm' | 'md';
    disabled?: boolean;
};

const TagChip: React.FC<TagChipProps> = ({ label, onRemove, removable = false, className = '', size = 'md', disabled = false }) => {
    const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1.5 text-sm';

    // Turf green chip with thin darker border
    const baseClasses = `flex items-center gap-2 rounded-full ${padding} text-green-800 bg-green-100 border border-green-700/20`;

    return (
        <div className={`${baseClasses} ${className}`}>
            <span className="truncate">{label}</span>
            {removable && (
                <button
                    type="button"
                    onClick={onRemove}
                    disabled={disabled}
                    className="ml-1 text-green-700 hover:text-destructive"
                    aria-label={`Remove tag ${label}`}
                >
                    <X className="w-3 h-3" />
                </button>
            )}
        </div>
    );
};

export default TagChip;
