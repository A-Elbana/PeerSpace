import React from 'react';
import { Loader2 } from 'lucide-react';

interface SubtaskItem {
  id: string;
  title: string;
}

interface SubtaskCardProps {
  subtask: SubtaskItem;
  openingSubtaskId?: string | null;
  unlinkingSubtaskId?: string | null;
  onOpen: () => Promise<void> | void;
  onUnlink: () => Promise<void> | void;
  disabled?: boolean;
}

const SubtaskCard: React.FC<SubtaskCardProps> = ({ subtask, openingSubtaskId, unlinkingSubtaskId, onOpen, onUnlink, disabled = false }) => {
  const isOpening = openingSubtaskId === subtask.id;
  const isUnlinking = unlinkingSubtaskId === subtask.id;

  return (
    <div className="flex items-center justify-between gap-4 px-3 py-2 bg-muted/30 rounded-lg">
      <div className="truncate">{subtask.title}</div>
      <div className="flex items-center gap-2">
        <button
          onClick={async (e) => { e.stopPropagation(); if (disabled) return; await onOpen(); }}
          className="text-sm px-2 py-1 bg-card border border-input rounded hover:bg-muted disabled:opacity-60"
          disabled={disabled}
        >
          {isOpening ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin inline-block" />
              Opening...
            </>
          ) : (
            'Open'
          )}
        </button>

        <button
          onClick={async (e) => { e.stopPropagation(); if (disabled || isUnlinking) return; await onUnlink(); }}
          className="text-sm px-2 py-1 bg-card border border-input rounded hover:bg-muted disabled:opacity-60"
          disabled={disabled || isUnlinking}
        >
          {isUnlinking ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin inline-block" />
              Unlinking...
            </>
          ) : (
            'Unlink'
          )}
        </button>
      </div>
    </div>
  );
};

export default SubtaskCard;
