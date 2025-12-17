import React, { useState, useEffect } from 'react';
import { Loader2, Send, FileText, X, Image as ImageIcon, FileIcon } from 'lucide-react';
import { Button } from '../ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import api, { postApi, type PostResponse } from '../../services/api';
import TagChip from '../common/TagChip';
import { toast } from 'sonner';
import { MarkdownEditor } from '../MarkdownEditor';

type LocalFile = File;

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
    const [files, setFiles] = useState<LocalFile[]>([]);
    const [filePreviews, setFilePreviews] = useState<Record<string, string>>({});
    const [existingAttachments, setExistingAttachments] = useState<any[]>([]);

    useEffect(() => {
        if (post) {
            setTitle(post.title);
            setBody(post.body || '');
            // Use PostTag relation only — do not read `post.tags` or split `post.type`
            const existingTags = ((post as any).PostTag && Array.isArray((post as any).PostTag))
                ? (post as any).PostTag.map((t: any) => String(t.tag).trim()).filter(Boolean)
                : [];
            setTagsArr(existingTags);
        } else {
            setTitle('');
            setBody('');
            setTagsArr([]);
            setTagInput('');
        }
        // reset new-file attachments and previews when modal opens/closes
        setFiles([]);
        Object.values(filePreviews).forEach(url => URL.revokeObjectURL(url));
        setFilePreviews({});

        // populate existing attachments from post (preserve across modal open)
        if (post && Array.isArray((post as any).PostFileAttachment)) {
            setExistingAttachments((post as any).PostFileAttachment || []);
        } else {
            setExistingAttachments([]);
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
                // If there are new files, upload them first (same flow as CreatePostWidget)
                const fileIds: string[] = [];
                for (const file of files) {
                    try {
                        const signResponse = await api.post('/uploads/sign', {
                            context: 'POST',
                            context_id: '0',
                            is_private: false,
                            resource_type: 'auto',
                        });
                        const { timestamp, signature, folder, cloudName, apiKey } = signResponse.data;

                        const uploadForm = new FormData();
                        uploadForm.append('file', file);
                        uploadForm.append('timestamp', String(timestamp));
                        uploadForm.append('signature', signature);
                        uploadForm.append('api_key', apiKey);
                        uploadForm.append('folder', folder);
                        const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
                        const uploadResponse = await fetch(uploadUrl, { method: 'POST', body: uploadForm });
                        if (!uploadResponse.ok) throw new Error('Cloudinary upload failed');
                        const cloudinaryData = await uploadResponse.json();

                        const fileResponse = await api.post('/files', {
                            public_id: cloudinaryData.public_id,
                            secure_url: cloudinaryData.secure_url,
                            resource_type: cloudinaryData.resource_type,
                            format: cloudinaryData.format,
                            context: 'POST',
                            context_id: '0',
                            is_private: false,
                        });
                        const createdFileId = fileResponse.data?.data?.id || fileResponse.data?.id || fileResponse.data;
                        if (createdFileId) fileIds.push(String(createdFileId));
                    } catch (err) {
                        console.error('File upload error:', err);
                    }
                }


                const selectedTags = tagsArr.map(t => t.trim()).filter(Boolean);
                const hasAnnouncementTag = selectedTags.some(t => t.toLowerCase() === 'announcement');
                const payloadTags = selectedTags.filter(t => t.toLowerCase() !== 'announcement');

                const payload: any = {
                    title: title.trim(),
                    body: body.trim(),
                    type: hasAnnouncementTag ? 'announcement' : 'discussion',
                    is_resolved: (post as any)?.is_resolved ?? false,
                };

                // include remaining existing attachment ids (if any) together with newly uploaded file ids
                const remainingExistingIds: string[] = (existingAttachments || []).map((a: any) => {
                    // try common fields: fid, File.id, File?.id, File?.public_id
                    return String(a.fid ?? a.File?.id ?? a.File?.fid ?? a.File?.public_id ?? a.id ?? '').trim();
                }).filter(Boolean);

                const combinedIds = [...remainingExistingIds, ...fileIds];
                if (combinedIds.length > 0) payload.file_ids = combinedIds;
                // Always include tags field (even empty) so server can delete existing PostTag rows when cleared
                payload.tags = payloadTags;

                const updatedPost = await postApi.update(post.id, payload);
                toast.success('Post updated successfully');
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

    // File handlers (replicated from CreatePostWidget)
    const onPickFile: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        const newFiles = Array.from(e.target.files || []);
        setFiles(prev => [...prev, ...newFiles]);

        newFiles.forEach(f => {
            const key = `${f.name}-${f.size}`;
            if (f.type.startsWith('image/')) {
                const url = URL.createObjectURL(f);
                setFilePreviews(prev => ({ ...prev, [key]: url }));
            }
        });
    };

    const removeFile = (index: number) => {
        const fileToRemove = files[index];
        const key = `${fileToRemove.name}-${fileToRemove.size}`;
        if (filePreviews[key]) {
            URL.revokeObjectURL(filePreviews[key]);
            setFilePreviews(prev => {
                const updated = { ...prev };
                delete updated[key];
                return updated;
            });
        }
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden bg-card text-foreground">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Edit Post
                    </DialogTitle>
                    <DialogDescription>Update your post content and tags.</DialogDescription>
                </DialogHeader>

                <div className="p-6 space-y-4 overflow-y-auto bg-background dark:bg-background" style={{ maxHeight: 'calc(90vh - 160px)' }}>
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

                        {/* Attachments preview for existing + new files */}
                        {(existingAttachments.length > 0 || files.length > 0) && (
                            <div className="space-y-2 rounded-md border border-dashed border-border p-3 bg-muted/20 dark:bg-muted/10">
                                <div className="text-xs font-medium text-muted-foreground mb-2">
                                    Attachments ({existingAttachments.length + files.length})
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {existingAttachments.map((att, idx) => {
                                        const key = String(att.fid ?? att.File?.id ?? att.File?.public_id ?? `existing-${idx}`);
                                        const url = att.File?.secure_url ?? att.File?.secure_url ?? att.secure_url;
                                        const isImage = !!url && /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(url);
                                        return (
                                            <div key={`existing-${key}-${idx}`} className="relative group rounded-lg overflow-hidden bg-background dark:bg-card border border-border hover:border-frosted-blue-500 transition-all">
                                                {isImage ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={url} alt={key} className="w-full h-20 object-cover" />
                                                ) : (
                                                    <div className="w-full h-20 flex flex-col items-center justify-center bg-muted/50">
                                                        <FileIcon size={20} className="text-muted-foreground mb-1" />
                                                        <span className="text-xs text-muted-foreground truncate px-1 text-center">Existing file</span>
                                                    </div>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => setExistingAttachments(prev => prev.filter((_, i) => i !== idx))}
                                                    className="absolute top-1 right-1 p-1 rounded-full bg-red-500/90 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                                    aria-label="Remove attachment"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>

                                                <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 bg-black/40 text-white text-xs truncate">
                                                    {att.File?.format ? att.File.format : ''}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {files.map((file, idx) => {
                                        const key = `${file.name}-${file.size}`;
                                        const preview = filePreviews[key];
                                        const isImage = file.type.startsWith('image/');

                                        return (
                                            <div
                                                key={`new-${key}-${idx}`}
                                                className="relative group rounded-lg overflow-hidden bg-background dark:bg-card border border-border hover:border-frosted-blue-500 transition-all"
                                            >
                                                {isImage && preview ? (
                                                    <img
                                                        src={preview}
                                                        alt={file.name}
                                                        className="w-full h-20 object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-20 flex flex-col items-center justify-center bg-muted/50">
                                                        <FileIcon size={20} className="text-muted-foreground mb-1" />
                                                        <span className="text-xs text-muted-foreground truncate px-1 text-center">
                                                            {file.name.length > 12 ? `${file.name.slice(0, 12)}...` : file.name}
                                                        </span>
                                                    </div>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => removeFile(idx)}
                                                    className="absolute top-1 right-1 p-1 rounded-full bg-red-500/90 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                                    aria-label="Remove file"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>

                                                <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 bg-black/40 text-white text-xs truncate">
                                                    {formatFileSize(file.size)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted cursor-pointer text-sm text-muted-foreground">
                                <input type="file" className="hidden" onChange={onPickFile} multiple />
                                <ImageIcon className="w-4 h-4" /> Image / File
                            </label>
                        </div>

                        <div>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {tagsArr.map((t) => (
                                    <TagChip
                                        key={t}
                                        label={t}
                                        removable
                                        onRemove={() => setTagsArr(prev => prev.filter(x => x !== t))}
                                    />
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
