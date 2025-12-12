
import React from 'react';
import { FileText, Trash2, Clock } from 'lucide-react';
import type { Note } from '../types';

interface NoteCardProps {
    note: Note;
    onClick: (note: Note) => void;
    onDelete: (note: Note) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, onClick, onDelete }) => {
    return (
        <div
            onClick={() => onClick(note)}
            className="group relative flex flex-col p-5 bg-card hover:bg-muted/50 border border-border rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-1 h-[180px]"
        >
            <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <FileText size={20} />
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(note);
                    }}
                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                >
                    <Trash2 size={16} />
                </button>
            </div>

            <h3 className="text-base font-semibold text-foreground mb-2 line-clamp-1">
                {note.title}
            </h3>

            <p className="text-sm text-muted-foreground line-clamp-3 flex-1">
                {note.content || "No content"}
            </p>

            <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                <Clock size={12} />
                <span>{note.updatedAt.toLocaleDateString()}</span>
            </div>
        </div>
    );
};
