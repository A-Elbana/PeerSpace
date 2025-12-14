import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { MarkdownEditor } from '../../components/MarkdownEditor';
import api from '../../services/api';
import { toast } from 'sonner';

interface CreateTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    // Called after successful creation; parent should reload tasks
    onTaskCreated: () => void;
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
    const [isSubmitting, setIsSubmitting] = useState(false);
    

    if (!isOpen) return null;

    const formatDateTimeLocal = (d: Date) => {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const now = new Date();
    const maxDate = new Date(now);
    maxDate.setFullYear(maxDate.getFullYear() + 10);
    const minDateTime = formatDateTimeLocal(now);
    const maxDateTime = formatDateTimeLocal(maxDate);



    const resetForm = () => {
        setTitle('');
        setDescription('');
        setPriority('medium');
        setDueDate('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            toast.error('Title is required');
            return;
        }

        if (!description || description.trim().length === 0) {
            toast.error('Description is required');
            return;
        }

        // Validate due date if provided: must be future and within 10 years
        if (dueDate) {
            const selected = new Date(dueDate);
            if (isNaN(selected.getTime())) {
                toast.error('Invalid due date');
                return;
            }
            const nowCheck = new Date();
            const maxCheck = new Date(nowCheck);
            maxCheck.setFullYear(maxCheck.getFullYear() + 10);
            if (selected <= nowCheck) {
                toast.error('Due date must be in the future');
                return;
            }
            if (selected > maxCheck) {
                toast.error('Due date must be within 10 years');
                return;
            }
        }
        setIsSubmitting(true);

        try {
            // Map frontend priority to numeric value expected by backend (0-10)
            const priorityMap: Record<string, number> = { low: 2, medium: 5, high: 8 };

            const payload: any = {
                title: title.trim(),
                description: description ? description.trim() : null,
                priority: priorityMap[priority],
                end_date: dueDate ? new Date(dueDate).toISOString() : undefined,
                status: 1, // default to not-complete (1)
            };

            // Create task first so we have an ID to attach files to
            await api.post('/tasks', payload);

            // attachments removed for tasks — no upload step

            toast.success('Task created');

            // Let parent reload the list (after uploads)
            onTaskCreated();

            resetForm();
            onClose();
        } catch (err) {
            console.error('Failed to create task:', err);
            toast.error('Failed to create task. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
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

                    {/* Description (Markdown) */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                        <MarkdownEditor
                            value={description}
                            onChange={setDescription}
                            placeholder="Describe the task in detail..."
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
                            <label className="block text-sm font-medium text-foreground mb-1">Due Date &amp; Time</label>
                            <input
                                type="datetime-local"
                                value={dueDate}
                                min={minDateTime}
                                max={maxDateTime}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full px-3 py-2 bg-muted/50 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
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
