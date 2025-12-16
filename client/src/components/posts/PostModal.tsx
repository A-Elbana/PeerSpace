import React, { useState, useEffect } from 'react';
import { Loader2, Send, FileText, X } from 'lucide-react';
import { Button } from '../ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { postApi, type PostResponse } from '../../services/api';
import { toast } from 'sonner';
import { MarkdownEditor } from '../MarkdownEditor';

interface PostModalProps {
    isOpen: boolean;
    onClose: () => void;
    post?: PostResponse; // If provided, mode is 'edit'
    onSuccess: (post: PostResponse) => void;
}

export const PostModal: React.FC<PostModalProps> = ({ isOpen, onClose, post, onSuccess }) => {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [tagsArr, setTagsArr] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (post) {
            setTitle(post.title);
            setBody(post.body || '');
            setTagsArr((post.type ?? '').split(',').map((t: string) => t.trim()).filter(Boolean));
        } else {
            setTitle('');
            setBody('');
            setTagsArr([]);
            setTagInput('');
        }
    }, [post, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !body.trim()) {
            toast.error('Please fill in all required fields');
            return;
        }

        setIsLoading(true);
        try {
            if (post) {
                // Update
                const selectedTags = tagsArr.map(t => t.trim()).filter(Boolean);
                const updatedPost = await postApi.update(post.id, {
                    title: title.trim(),
                    body: body.trim(),
                    type: selectedTags.length > 0 ? selectedTags.join(',') : 'discussion',
                    is_resolved: (post as any)?.is_resolved ?? false,
                });
                toast.success('Post updated successfully');
                // The update API might return the updated post directly or generic response. 
                // Based on standard, let's assume it returns the updated object or we construct it.
                // Assuming updatedPost is the new post object.
                onSuccess(updatedPost);
                onClose();
            }
        } catch (error: any) {
            console.error('Failed to save post:', error);
            toast.error(error.response?.data?.message || 'Failed to save post');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Edit Post
                    </DialogTitle>
                    <DialogDescription>Update your post content and tags.</DialogDescription>
                </DialogHeader>

                <div className="p-6 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 160px)' }}>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Title"
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-frosted-blue-500"
                            />
                        </div>

                        <MarkdownEditor
                            value={body}
                            onChange={setBody}
                            placeholder="Write something..."
                            className="min-h-40"
                        />

                        <div>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {tagsArr.map((t) => (
                                    <span key={t} className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-muted/30 text-sm">
                                        <span className="capitalize">{t}</span>
                                        <button type="button" onClick={() => setTagsArr(prev => prev.filter(x => x !== t))} className="p-0.5 rounded-full hover:bg-muted">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <input
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
                                        e.preventDefault();
                                        const val = tagInput.trim();
                                        if (val) {
                                            setTagsArr(prev => prev.includes(val) ? prev : [...prev, val]);
                                            setTagInput('');
                                        }
                                    }
                                }}
                                placeholder="Press space to add tag"
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none"
                            />
                        </div>
                    </form>
                </div>

                <DialogFooter className="gap-2">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>Cancel</Button>
                    <div className="flex-1" />
                    <Button
                        onClick={handleSubmit as any}
                        disabled={isLoading}
                        className={`gap-2 bg-turf-green-500 hover:bg-turf-green-600`}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                Save Changes
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
