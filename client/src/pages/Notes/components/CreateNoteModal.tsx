import React, { useState } from 'react';
import api from '../../../services/api';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Folder } from '../types';

interface CreateNoteModalProps {
  isOpen: boolean;
  folder: Folder;
  onClose: () => void;
  onCreated: (item: any) => void;
}

const CreateNoteModal: React.FC<CreateNoteModalProps> = ({ isOpen, folder, onClose, onCreated }) => {
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const reset = () => {
    setTitle('');
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload: any = { title: title.trim(), notebook_id: Number(folder.id) };
      const resp = await api.post('/notes', payload);
      const created = resp?.data?.data ?? resp?.data ?? resp;
      onCreated(created);
      toast.success('Note created');
      handleClose();
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Create note failed', err);
      const msg = err?.response?.data?.message || 'Failed to create note';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-lg p-6 m-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">New Note</h3>
            <p className="text-sm text-muted-foreground mt-1">Create a note inside <span className="font-medium">{folder.name}</span>.</p>
          </div>
          <button onClick={handleClose} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground block mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-card border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Note title"
              autoFocus
            />
          </div>

          {error && <div className="text-sm text-destructive">{error}</div>}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={handleClose} className="px-4 py-2 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Note</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateNoteModal;
