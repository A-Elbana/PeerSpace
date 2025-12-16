import React, { useState, useEffect } from 'react';
import { X, Loader2, Tag } from 'lucide-react';
import { Button } from '../ui/button';
import { postApi, type PostResponse } from '../../services/api';
import { toast } from 'sonner';

interface PostModalProps {
    isOpen: boolean;
    onClose: () => void;
    post?: PostResponse; // If provided, mode is 'edit'
    onSuccess: (post: PostResponse) => void;
}

const POST_TAGS = [
    { id: 'math', label: 'Math', color: 'bg-tech-blue-500', textColor: 'text-tech-blue-600', bgLight: 'bg-tech-blue-500/10' },
    { id: 'scientific', label: 'Scientific', color: 'bg-turf-green-500', textColor: 'text-turf-green-600', bgLight: 'bg-turf-green-500/10' },
    { id: 'puzzles', label: 'Puzzles', color: 'bg-royal-gold-500', textColor: 'text-royal-gold-600', bgLight: 'bg-royal-gold-500/10' },
] as const;

export const PostModal: React.FC<PostModalProps> = ({ isOpen, onClose, post, onSuccess }) => {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (post) {
            setTitle(post.title);
            setBody(post.body || '');
            setSelectedTags(post.type ? post.type.split(',').map(t => t.trim().toLowerCase()) : []);
        } else {
            setTitle('');
            setBody('');
            setSelectedTags([]);
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
                const updatedPost = await postApi.update(post.id, {
                    title: title.trim(),
                    body: body.trim(),
                    type: selectedTags.length > 0 ? selectedTags.join(',') : 'discussion',
                    is_resolved: post.is_resolved || false // Preserve resolved status or use dedicated toggle
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <div className="bg-card w-full max-w-lg rounded-xl shadow-2xl border border-border flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                    <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-frosted-blue-500 to-turf-green-500 flex items-center justify-center text-white text-sm font-bold shadow-md">
                            E
                        </div>
                        Edit Post
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1 block">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-3 py-2 bg-muted/50 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                            placeholder="Post title"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1 block">Tags</label>
                        <div className="flex gap-2 flex-wrap bg-muted/30 p-2 rounded-lg border border-input">
                            <Tag size={16} className="text-muted-foreground" />
                            {POST_TAGS.map((tag) => {
                                const isSelected = selectedTags.includes(tag.id);
                                return (
                                    <button
                                        key={tag.id}
                                        type="button"
                                        onClick={() => {
                                            if (isSelected) {
                                                setSelectedTags(prev => prev.filter(t => t !== tag.id));
                                            } else {
                                                setSelectedTags(prev => [...prev, tag.id]);
                                            }
                                        }}
                                        className={`text-xs font-medium px-2 py-1 rounded-full transition-all ${isSelected
                                            ? `${tag.bgLight} ${tag.textColor} ring-1 ring-current`
                                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                            }`}
                                    >
                                        {tag.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1 block">Content</label>
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            className="w-full px-3 py-2 bg-muted/50 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground min-h-[150px] resize-y"
                            placeholder="Post content..."
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading} className="bg-turf-green-500 text-white hover:bg-turf-green-600 transition-colors">
                            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save Changes
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
