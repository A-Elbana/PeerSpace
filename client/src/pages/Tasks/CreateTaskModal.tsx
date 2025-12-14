import React, { useState, useRef } from 'react';
import { X, Upload, Loader2, File as FileIcon, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/button';

interface Task {
    id: string;
    name: string;
    assignees: { id: number; fname: string; lname: string; avatar_url?: string }[];
    dueDate: string | null;
    priority: 'low' | 'medium' | 'high';
    assignmentRelation: string;
    completed: boolean;
}

interface CreateTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTaskCreated: (task: Task) => void;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
    isOpen,
    onClose,
    onTaskCreated
}) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [dueDate, setDueDate] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles([...files, ...Array.from(e.target.files)]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setPriority('medium');
        setDueDate('');
        setFiles([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        setIsSubmitting(true);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Create dummy task
        const newTask: Task = {
            id: String(Date.now()),
            name: title,
            assignees: [],
            dueDate: dueDate ? new Date(dueDate).toLocaleDateString() : null,
            priority: priority,
            assignmentRelation: '',
            completed: false,
        };

        onTaskCreated(newTask);
        resetForm();
        onClose();
        setIsSubmitting(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-card border border-border rounded-xl shadow-lg p-6 m-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-foreground">Create New Task</h2>
                    <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-3 py-2 bg-muted/50 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                            placeholder="Enter task title"
                            required
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-3 py-2 bg-muted/50 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[100px] resize-none"
                            placeholder="Details about the task..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Priority */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Priority</label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value as any)}
                                className="w-full px-3 py-2 bg-muted/50 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>

                        {/* Due Date */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Due Date</label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full px-3 py-2 bg-muted/50 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                    </div>

                    {/* File Upload */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Attachments</label>
                        <div
                            className="border-2 border-dashed border-input rounded-lg p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">Click to upload files</p>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                multiple
                                className="hidden"
                            />
                        </div>

                        {/* File List */}
                        {files.length > 0 && (
                            <div className="mt-4 space-y-2">
                                {files.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded-md">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <FileIcon className="w-4 h-4 text-primary flex-shrink-0" />
                                            <span className="text-sm truncate">{file.name}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeFile(index)}
                                            className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <Button type="button" variant="ghost" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Task'
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
