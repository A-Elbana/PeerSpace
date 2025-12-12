
import React from 'react';
import { Folder as FolderIcon, Trash2 } from 'lucide-react';
import type { Folder } from '../types';

interface FolderCardProps {
    folder: Folder;
    onClick: (folder: Folder) => void;
    onDelete: (folder: Folder) => void;
}

export const FolderCard: React.FC<FolderCardProps> = ({ folder, onClick, onDelete }) => {
    return (
        <div
            onClick={() => onClick(folder)}
            className="group relative flex flex-col items-center justify-center p-6 bg-card hover:bg-muted/50 border border-border rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-1"
        >
            <div className={`w-16 h-16 mb-4 rounded-2xl flex items-center justify-center ${folder.color || 'bg-blue-500/10 text-blue-500'}`}>
                <FolderIcon size={32} fill="currentColor" className="opacity-80" />
            </div>
            <h3 className="text-base font-semibold text-foreground text-center truncate w-full px-2">
                {folder.name}
            </h3>

            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(folder);
                }}
                className="absolute top-3 right-3 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md opacity-0 group-hover:opacity-100 transition-all"
            >
                <Trash2 size={16} />
            </button>
        </div>
    );
};
