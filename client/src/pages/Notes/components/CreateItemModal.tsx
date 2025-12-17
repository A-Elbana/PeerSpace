import React, { useState } from 'react';
import api from '../../../services/api';
import { X, Loader2 } from 'lucide-react';
import Select from '../../../components/ui/Select';
import DropdownSearch from '../../../components/ui/DropdownSearch';
import { toast } from 'sonner';

interface CreateItemModalProps {
    isOpen: boolean;
    mode: 'folder' | 'note';
    folders: { id: string; name: string }[];
    onClose: () => void;
    onCreated: (item: any) => void;
    onLoadMoreFolders?: () => void;
    foldersHasMore?: boolean;
    foldersLoadingMore?: boolean;
}

export const CreateItemModal: React.FC<CreateItemModalProps> = ({
    isOpen,
    mode,
    folders,
    onClose,
    onCreated,
    foldersHasMore,
    foldersLoadingMore,
}) => {
    const [title, setTitle] = useState('');
    const [folderId, setFolderId] = useState<string | undefined>(undefined);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const reset = () => {
        setTitle('');
        setFolderId(undefined);
        setError(null);
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const extractData = (resp: any) => {
        if (!resp) return resp;
        if (resp.data && resp.data.data) return resp.data.data;
        if (resp.data) return resp.data;
        return resp;
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
            if (mode === 'folder') {
                // Server expects `title` for notebooks
                const resp = await api.post('/notebooks', { title: title.trim() });
                const created = extractData(resp);
                onCreated(created);
                toast.success('Notebook created');
            } else {
                const payload: any = { title: title.trim() };
                if (folderId) payload.notebook_id = Number(folderId);
                // the notes route expects `title`, optional `body`, and `notebook_id`
                const resp = await api.post('/notes', payload);
                const created = extractData(resp);
                onCreated(created);
                toast.success('Note created');
            }

            handleClose();
        } catch (err: any) {
            // eslint-disable-next-line no-console
            console.error('Create failed', err);
            const msg = err?.response?.data?.message || 'Failed to create';
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
                        <h3 className="text-lg font-semibold text-foreground">{mode === 'folder' ? 'New Notebook' : 'New Note'}</h3>
                        <p className="text-sm text-muted-foreground mt-1">Add a {mode === 'folder' ? 'notebook' : 'note'} to organize your content.</p>
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
                            placeholder={mode === 'folder' ? 'Notebook name' : 'Note title'}
                            autoFocus
                        />
                    </div>

                    {mode === 'note' && (
                        <div>
                            <label className="text-sm text-muted-foreground block mb-1">Notebook (optional)</label>
                            <DropdownSearch
                                value={folderId ?? null}
                                options={folders.map(f => ({ value: f.id, label: f.name }))}
                                onChange={(opt) => setFolderId(opt ? opt.value : undefined)}
                                placeholder="Root (no notebook)"
                                maxHeight={100}
                                hasMore={foldersHasMore}
                                loadingMore={foldersLoadingMore}
                            />
                        </div>
                    )}

                    {error && <div className="text-sm text-destructive">{error}</div>}

                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={handleClose} className="px-4 py-2 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg">
                            Cancel
                        </button>
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center">
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    <span>{mode === 'folder' ? 'Creating...' : 'Creating...'}</span>
                                </>
                            ) : (
                                <span>{mode === 'folder' ? 'Create Notebook' : 'Create Note'}</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateItemModal;
