import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Flag,
    Calendar,
    Users,
    CheckCircle,
    Circle,
    Edit2,
    Trash2,
    Loader2,
    Clock,
    Tag,
    Link as LinkIcon,
    Save,
    X,
    Search,
    ChevronDown,
    XCircle
} from 'lucide-react';
import { Sidebar } from '../../components/dashboard';
import { useSidebar } from '../../contexts/SidebarContext';
import { Button } from '../../components/ui/button';
import DropdownSearch from '../../components/ui/DropdownSearch';
import { DeleteConfirmationModal } from '../../components/common/DeleteConfirmationModal';
import { MarkdownEditor, MarkdownPreview } from '../../components/MarkdownEditor';
import api from '../../services/api';
import { toast } from 'sonner';
import TagChip from '../../components/common/TagChip';
import SubtaskCard from './components/SubtaskCard';

type UserRole = 'student' | 'instructor' | 'admin';

interface UserData {
    id: number;
    email: string;
    fname: string;
    lname: string;
    role: UserRole;
    avatar_url?: string;
}

interface Assignee {
    id: number;
    fname: string;
    lname: string;
    isAccepted: boolean;
}

interface TaskFile {
    id: string;
    name: string;
    url: string;
    type: string;
}

interface Task {
    id: string;
    title: string;
    description: string;
    assignees: Assignee[];
    startDate: string | null;
    dueDate: string | null;
    priority: 'low' | 'medium' | 'high';
    status: boolean;
    assignmentRelation: string | null;
    assignmentRelationId?: number | null;
    tags: string[];
    files: TaskFile[];
    parentTask: string | null;
    ownerId?: number;
}

interface TaskDetailProps {
    onLogout?: () => void;
}

const TaskDetail: React.FC<TaskDetailProps> = ({ onLogout }) => {
    const { taskId } = useParams<{ taskId: string }>();
    const navigate = useNavigate();
    const { sidebarWidth } = useSidebar();
    const [user, setUser] = useState<UserData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [task, setTask] = useState<Task | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editedTask, setEditedTask] = useState<Task | null>(null);

    const [deleteModal, setDeleteModal] = useState({
        isOpen: false,
    });

    // attachmentDeleteModal removed: attachments are not supported on Task details

    // Assignment relation dropdown state
    const [isRelationDropdownOpen, setIsRelationDropdownOpen] = useState(false);
    const [relationSearchQuery, setRelationSearchQuery] = useState('');
    const relationDropdownRef = useRef<HTMLDivElement>(null);

    // Assignments pulled from the server (user's communities)
    const [assignments, setAssignments] = useState<Array<{ id: number; title: string; community: string }>>([]);
    const [assignmentsLoading, setAssignmentsLoading] = useState<boolean>(false);

    useEffect(() => {
        document.title = task ? `PeerSpace - ${task.title}` : 'PeerSpace - Task';
    }, [task]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (relationDropdownRef.current && !relationDropdownRef.current.contains(event.target as Node)) {
                setIsRelationDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const initData = async () => {
            try {
                const userRes = await api.get('/auth/me');
                const userData: UserData = {
                    ...userRes.data,
                    role: userRes.data.role?.toLowerCase() as UserRole,
                };
                setUser(userData);

                // Fetch task from backend
                if (taskId) {
                    try {
                        const res = await api.get(`/tasks/${taskId}`);
                        const backendTask = res.data;
                        const mapped = mapBackendTask(backendTask);
                        setTask(mapped);
                        setEditedTask(mapped);
                        // fetch subtasks for this task
                        try {
                            const stRes = await api.get(`/tasks/${taskId}/subtasks`);
                            const backendSubtasks = stRes.data?.data ?? stRes.data ?? [];
                            const mappedSub = (Array.isArray(backendSubtasks) ? backendSubtasks : []).map(mapBackendTask);
                            setSubtasks(mappedSub);
                        } catch (e) {
                            console.error('Failed to load subtasks:', e);
                        }
                    } catch (err) {
                        console.error('Failed to fetch task:', err);
                        // keep behavior of showing not found
                    }
                }

                // Fetch user's assignments across enrolled communities for relation dropdown
                try {
                    setAssignmentsLoading(true);
                    const res = await api.get('/assignments/me', { params: { limit: 500 } });
                    // Support both { data: { data: [...] } } and direct array responses
                    const items = res.data?.data ?? res.data ?? [];
                    const merged: Array<{ id: number; title: string; community: string }> = (Array.isArray(items) ? items : []).map((a: any) => {
                        const communityName = a.Community?.name ?? a.community?.name ?? a.cid ?? 'Unknown';
                        return { id: a.id, title: a.title, community: communityName };
                    });
                    setAssignments(merged);
                } catch (err) {
                    console.error('Failed to load assignments for relation dropdown:', err);
                } finally {
                    setAssignmentsLoading(false);
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        initData();
    }, [taskId]);

    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [newTag, setNewTag] = useState('');
    const [isTagSaving, setIsTagSaving] = useState(false);
    const [stagedTags, setStagedTags] = useState<string[]>([]);
    const [subtasks, setSubtasks] = useState<Task[]>([]);
    const [eligibleTasks, setEligibleTasks] = useState<Array<{ id: number; title: string }>>([]);
    const [isSubtaskDropdownOpen, setIsSubtaskDropdownOpen] = useState(false);
    const [subtaskSearchQuery, setSubtaskSearchQuery] = useState('');
    const [isLinkingSubtask, setIsLinkingSubtask] = useState(false);
    const [openingSubtaskId, setOpeningSubtaskId] = useState<string | null>(null);
    const [unlinkingSubtaskId, setUnlinkingSubtaskId] = useState<string | null>(null);
    const [removingAssigneeId, setRemovingAssigneeId] = useState<number | null>(null);

    // file upload handlers removed (attachments disabled)

    const toggleStatus = async () => {
        if (!task) return;
        if (isUpdatingStatus) return;

        const newCompleted = !task.status;
        const desiredStatus = newCompleted ? 2 : 1; // backend status codes

        // Optimistic update
        setTask(prev => prev ? { ...prev, status: newCompleted } : prev);
        setIsUpdatingStatus(true);
        try {
            await api.patch(`/tasks/${Number(task.id)}/status`, { status: desiredStatus });
            toast.success(`Task marked ${newCompleted ? 'complete' : 'incomplete'}`);
        } catch (err) {
            console.error('Failed to update task status:', err);
            // Revert
            setTask(prev => prev ? { ...prev, status: !newCompleted } : prev);
            toast.error('Failed to update task status');
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const priorityToNumber = (p: Task['priority']) => {
        switch (p) {
            case 'low':
                return 2;
            case 'medium':
                return 5;
            case 'high':
                return 9;
            default:
                return 5;
        }
    };

    const mapBackendTask = (t: any): Task => {
        // Assignees
        let assignees: Assignee[] = [];
        if (Array.isArray(t.TaskAssignees) && t.TaskAssignees.length > 0) {
                assignees = t.TaskAssignees.map((a: any) => ({
                    id: a.Student.User?.id ?? 0,
                    fname: a.Student.User?.fname ??'a',
                    lname: a.Student.User.lname ?? 'a',
                    isAccepted: a.isAccepted
                }));
            }

        let assignmentRelation = null;
        let assignmentRelationId: number | null = null;
        if (t.TaskAssignmentRelation) {
            if (Array.isArray(t.TaskAssignmentRelation)) {
                assignmentRelation = t.TaskAssignmentRelation[0]?.Assignment?.title ?? null;
                assignmentRelationId = t.TaskAssignmentRelation[0]?.Assignment?.id ?? null;
            } else {
                assignmentRelation = t.TaskAssignmentRelation.Assignment?.title ?? null;
                assignmentRelationId = t.TaskAssignmentRelation.Assignment?.id ?? null;
            }
        }

        const dueDate = t.end_date ? new Date(t.end_date).toLocaleString() : null;
        const startDate = t.start_date ? new Date(t.start_date).toLocaleString() : null;

        const p = t.priority;
        let priority: Task['priority'] = 'low';
        if (p === null || p === undefined) priority = 'low';
        else if (p <= 3) priority = 'low';
        else if (p <= 7) priority = 'medium';
        else priority = 'high';

        const tags = Array.isArray(t.TaskTag) ? t.TaskTag.map((tag: any) => tag.tag) : [];

        return {
            id: String(t.id),
            title: t.title ?? t.name ?? 'Untitled',
            description: t.description ?? '',
            assignees,
            startDate,
            dueDate,
            priority,
            status: t.status === 2,
            assignmentRelation,
            assignmentRelationId,
            tags,
            files: Array.isArray(t.File) ? t.File.map((f: any) => ({ id: String(f.id), name: f.name, url: f.secure_url ?? f.url ?? '', type: f.resource_type ?? 'file' })) : [],
            parentTask: t.Task?.title ?? null,
            ownerId: t.author ?? t.owner_uid ?? (t.Student?.User?.id ?? undefined),
        };
    };

    const isOwner = user && task && String(user.id) === String((task as any).ownerId);

    const handleSave = async () => {
        if (!editedTask || !task) return;
        if (isSaving) return;

        setIsSaving(true);
        try {
            const payload: any = {
                title: editedTask.title,
                description: editedTask.description || null,
                priority: priorityToNumber(editedTask.priority),
                start_date: editedTask.startDate ? new Date(editedTask.startDate).toISOString() : null,
                end_date: editedTask.dueDate ? new Date(editedTask.dueDate).toISOString() : null,
                status: editedTask.status ? 2 : 1,
            };

            const res = await api.patch(`/tasks/${Number(task.id)}`, payload);
            // After updating task fields, handle assignment link/unlink if it changed
            const originalAssignmentId = task.assignmentRelationId ?? null;
            const newAssignmentId = editedTask.assignmentRelationId ?? null;

            if (originalAssignmentId !== newAssignmentId) {
                try {
                    if (originalAssignmentId && !newAssignmentId) {
                        await api.delete(`/tasks/${Number(task.id)}/assignment`);
                    } else if (!originalAssignmentId && newAssignmentId) {
                        await api.post(`/tasks/${Number(task.id)}/assignment`, { assignment_id: newAssignmentId });
                    } else if (originalAssignmentId && newAssignmentId && originalAssignmentId !== newAssignmentId) {
                        // replace: unlink then link
                        try {
                            await api.delete(`/tasks/${Number(task.id)}/assignment`);
                        } catch (e) {
                            // ignore unlink errors and try to link new one
                        }
                        await api.post(`/tasks/${Number(task.id)}/assignment`, { assignment_id: newAssignmentId });
                    }
                } catch (e) {
                    console.error('Failed to update task-assignment relation:', e);
                    toast.error('Failed to update assignment relation');
                }
            }

            // Handle staged tag changes: do not add/remove until user saves — now apply them
            try {
                const originalTags = task.tags ?? [];
                const newTags = stagedTags ?? originalTags;

                const tagsToAdd = newTags.filter(t => !originalTags.includes(t));
                const tagsToRemove = originalTags.filter(t => !newTags.includes(t));

                // perform removals first
                for (const tag of tagsToRemove) {
                    try {
                        await api.delete(`/tasks/${Number(task.id)}/tags/${encodeURIComponent(tag)}`);
                    } catch (e) {
                        console.error('Failed to remove tag during save:', tag, e);
                    }
                }

                for (const tag of tagsToAdd) {
                    try {
                        await api.post(`/tasks/${Number(task.id)}/tags`, { tag });
                    } catch (e) {
                        console.error('Failed to add tag during save:', tag, e);
                    }
                }
            } catch (e) {
                console.error('Failed to sync tags during save:', e);
            }

            // Re-fetch full task to get canonical state (including relation and tags)
            const refreshed = await api.get(`/tasks/${Number(task.id)}`);
            const updated = refreshed.data?.task ?? refreshed.data ?? res.data?.task ?? res.data;
            const mapped = mapBackendTask(updated);
            setTask(mapped);
            setEditedTask(mapped);
            setStagedTags([]);
            setNewTag('');
            setIsEditing(false);
            toast.success('Task updated');

            // refresh subtasks after save (assignment/linking may have changed)
            try {
                const stRes = await api.get(`/tasks/${Number(task.id)}/subtasks`);
                const backendSubtasks = stRes.data?.data ?? stRes.data ?? [];
                const mappedSub = (Array.isArray(backendSubtasks) ? backendSubtasks : []).map(mapBackendTask);
                setSubtasks(mappedSub);
            } catch (e) {
                console.error('Failed to refresh subtasks:', e);
            }
        } catch (err) {
            console.error('Failed to save task:', err);
            toast.error('Failed to save task');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setEditedTask(task);
        setStagedTags([]);
        setNewTag('');
        setIsEditing(false);
    };

    const handleDelete = async () => {
        if (!task) return;
        try {
            await api.delete(`/tasks/${Number(task.id)}`);
            toast.success('Task deleted');
            navigate('/tasks');
        } catch (err) {
            console.error('Failed to delete task:', err);
            toast.error('Failed to delete task');
        }
    };

    const handleRemoveSelf = async () => {
        if (!task || !user) return;
        try {
            await api.delete('/task-assignees/remove', { data: { taskId: Number(task.id), studentId: user.id } });
            toast.success('You have been unassigned from this task');
            navigate('/tasks');
        } catch (err) {
            console.error('Failed to unassign:', err);
            toast.error('Failed to remove assignment');
        }
    };

    const removeAssignee = async (assigneeId: number) => {
        if (!task) return;
        setRemovingAssigneeId(assigneeId);
        try {
            await api.delete('/task-assignees/remove', { data: { taskId: Number(task.id), studentId: assigneeId } });
            toast.success('Assignee removed');
            // Update edited task to remove the assignee
            setEditedTask(prev => prev ? { ...prev, assignees: prev.assignees.filter(a => a.id !== assigneeId) } : prev);
        } catch (err) {
            console.error('Failed to remove assignee:', err);
            toast.error('Failed to remove assignee');
        } finally {
            setRemovingAssigneeId(null);
        }
    };

    const fetchEligibleTasks = async () => {
        if (!task) return;
        try {
            // fetch user's tasks that have no parent (parent_only=true)
            const res = await api.get('/tasks', { params: { limit: 500, parent_only: true } });
            const items = res.data?.data ?? res.data ?? [];
            const list = (Array.isArray(items) ? items : []).filter((t: any) => String(t.id) !== String(task.id)).map((t: any) => ({ id: t.id, title: t.title ?? t.name ?? 'Untitled' }));
            setEligibleTasks(list);
        } catch (e) {
            console.error('Failed to fetch eligible subtasks:', e);
        }
    };

    // ensure eligible tasks are loaded when the main task is available
    useEffect(() => {
        if (task) {
            fetchEligibleTasks();
        }
    }, [task?.id]);

    const linkSubtask = async (childId: number) => {
        if (!task) return;
        setIsLinkingSubtask(true);
        try {
            await api.patch(`/tasks/${childId}`, { parent_task: Number(task.id) });
            toast.success('Subtask linked');
            // refresh subtasks
            const stRes = await api.get(`/tasks/${Number(task.id)}/subtasks`);
            const backendSubtasks = stRes.data?.data ?? stRes.data ?? [];
            const mappedSub = (Array.isArray(backendSubtasks) ? backendSubtasks : []).map(mapBackendTask);
            setSubtasks(mappedSub);
            // remove from eligible list
            setEligibleTasks(prev => prev.filter(t => t.id !== childId));
            setIsSubtaskDropdownOpen(false);
        } catch (e: any) {
            console.error('Failed to link subtask:', e);
            const serverMessage = e?.response?.data?.message ?? e?.message ?? '';
            if (typeof serverMessage === 'string' && (serverMessage.includes('Circular') || serverMessage.includes("own parent"))) {
                toast.error('Cannot link task: circular parent relationship would be created');
            } else {
                toast.error('Failed to link subtask');
            }
        } finally {
            setIsLinkingSubtask(false);
        }
    };

    const unlinkSubtask = async (childId: number) => {
        if (!task) return;
        setUnlinkingSubtaskId(String(childId));
        try {
            await api.patch(`/tasks/${childId}`, { parent_task: null });
            toast.success('Subtask unlinked');
            const stRes = await api.get(`/tasks/${Number(task.id)}/subtasks`);
            const backendSubtasks = stRes.data?.data ?? stRes.data ?? [];
            const mappedSub = (Array.isArray(backendSubtasks) ? backendSubtasks : []).map(mapBackendTask);
            setSubtasks(mappedSub);
            // refresh eligible tasks
            await fetchEligibleTasks();
        } catch (e) {
            console.error('Failed to unlink subtask:', e);
            toast.error('Failed to unlink subtask');
        } finally {
            setUnlinkingSubtaskId(null);
        }
    };

    // attachment deletion removed (attachments disabled)

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high':
                return 'text-red-500 bg-red-500/10';
            case 'medium':
                return 'text-yellow-500 bg-yellow-500/10';
            case 'low':
                return 'text-green-500 bg-green-500/10';
            default:
                return 'text-muted-foreground bg-muted';
        }
    };

    const getInitials = (fname: string, lname: string) => {
        return `${fname.charAt(0)}${lname.charAt(0)}`.toUpperCase();
    };

    const getAvatarColor = (index: number) => {
        const colors = [
            'bg-blue-500',
            'bg-purple-500',
            'bg-yellow-500',
            'bg-pink-500',
            'bg-green-500',
            'bg-indigo-500',
            'bg-red-500',
            'bg-teal-500',
        ];
        return colors[index % colors.length];
    };

    if (isLoading || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
        );
    }

    if (!task) {
        return (
            <div className="flex min-h-screen bg-background text-foreground">
                <Sidebar onLogout={onLogout || (() => {})} />
                <main 
                  className="flex-1 p-8 transition-all duration-300"
                  style={{ marginLeft: `${sidebarWidth}px` }}
                >
                    <div className="max-w-4xl mx-auto">
                        <Button
                            variant="ghost"
                            onClick={() => navigate('/tasks')}
                            className="mb-6"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Tasks
                        </Button>
                        <div className="text-center py-16">
                            <h2 className="text-2xl font-semibold text-foreground mb-2">Task Not Found</h2>
                            <p className="text-muted-foreground">The task you're looking for doesn't exist.</p>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            <Sidebar onLogout={onLogout || (() => {})} />

            <main className="flex-1 ml-20 p-8">
                <div className="max-w-4xl mx-auto">
                    {/* Back Button */}
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/tasks')}
                        className="mb-6"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Tasks
                    </Button>

                    {/* Header */}
                    <div className="bg-card border border-border rounded-xl p-6 mb-6">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editedTask?.title || ''}
                                        onChange={(e) => setEditedTask(editedTask ? { ...editedTask, title: e.target.value } : null)}
                                        className="text-2xl font-bold bg-transparent border-b border-input focus:outline-none focus:border-primary w-full mr-4"
                                    />
                                ) : (
                                    <h1 className={`text-2xl font-bold ${task.status ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                        {task.title}
                                    </h1>
                                )}

                                {isOwner ? (isEditing ? (
                                    <div className="relative mt-2" ref={relationDropdownRef}>
                                        <button
                                            type="button"
                                            onClick={() => setIsRelationDropdownOpen(!isRelationDropdownOpen)}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 hover:bg-muted rounded-lg text-sm transition-colors w-full max-w-md"
                                        >
                                            <LinkIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                            <span className={`flex-1 text-left truncate ${editedTask?.assignmentRelation ? 'text-primary' : 'text-muted-foreground'}`}>
                                                {editedTask?.assignmentRelation || 'Link to assignment...'}
                                            </span>
                                            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isRelationDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {isRelationDropdownOpen && (
                                            <div className="absolute top-full left-0 mt-1 w-full max-w-md bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                                                {/* Search input */}
                                                <div className="p-2 border-b border-border">
                                                    <div className="relative">
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                        <input
                                                            type="text"
                                                            placeholder="Search assignments..."
                                                            value={relationSearchQuery}
                                                            onChange={(e) => setRelationSearchQuery(e.target.value)}
                                                            className="w-full pl-9 pr-3 py-2 bg-muted/50 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                                            autoFocus
                                                        />
                                                    </div>
                                                </div>

                                                {/* Options list */}
                                                <div className="max-h-48 overflow-y-auto">
                                                    {/* Clear option */}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditedTask(editedTask ? { ...editedTask, assignmentRelation: null, assignmentRelationId: null } : null);
                                                            setIsRelationDropdownOpen(false);
                                                            setRelationSearchQuery('');
                                                        }}
                                                        className="w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
                                                    >
                                                        No assignment relation
                                                    </button>

                                                    {assignmentsLoading ? (
                                                        <div className="px-3 py-4 text-center text-sm text-muted-foreground">Loading assignments...</div>
                                                    ) : (
                                                        (() => {
                                                            const filtered = assignments.filter(a =>
                                                                a.title.toLowerCase().includes(relationSearchQuery.toLowerCase()) ||
                                                                a.community.toLowerCase().includes(relationSearchQuery.toLowerCase())
                                                            );

                                                            if (filtered.length === 0 && relationSearchQuery) {
                                                                return (
                                                                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">No assignments found</div>
                                                                );
                                                            }

                                                            return filtered.map((assignment) => (
                                                                <button
                                                                    key={assignment.id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setEditedTask(editedTask ? { ...editedTask, assignmentRelation: assignment.title, assignmentRelationId: assignment.id } : null);
                                                                        setIsRelationDropdownOpen(false);
                                                                        setRelationSearchQuery('');
                                                                    }}
                                                                    className={`w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors ${
                                                                        editedTask?.assignmentRelationId === assignment.id ? 'bg-primary/10' : ''
                                                                    }`}
                                                                >
                                                                    <div className="text-sm font-medium truncate">{assignment.title}</div>
                                                                    <div className="text-xs text-muted-foreground">{assignment.community}</div>
                                                                </button>
                                                            ));
                                                        })()
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    task.assignmentRelation ? (
                                    <div className="flex items-center gap-2 mt-2">
                                                    <LinkIcon className="w-4 h-4 text-muted-foreground" />
                                                    <span className="text-sm text-primary">{task.assignmentRelation}</span>
                                                </div>
                                            ) : null)
                                        ) : null}
                            </div>

                            <div className="flex items-center gap-2">
                                {isOwner ? (
                                    !isEditing ? (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setStagedTags(task?.tags ?? []);
                                                    setNewTag('');
                                                    setIsEditing(true);
                                                }}
                                            >
                                                <Edit2 className="w-4 h-4 mr-2" />
                                                Edit
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-destructive hover:bg-destructive/10"
                                                onClick={() => setDeleteModal({ isOpen: true })}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleCancel}
                                                className="min-w-[100px]"
                                            >
                                                <X className="w-4 h-4 mr-2" />
                                                Cancel
                                            </Button>
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={handleSave}
                                                className="min-w-[100px]"
                                                disabled={isSaving}
                                                aria-busy={isSaving}
                                            >
                                                {isSaving ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        Saving...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save className="w-4 h-4 mr-2" />
                                                        Save
                                                    </>
                                                )}
                                            </Button>
                                        </>
                                    )
                                ) : (
                                    <>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-destructive hover:bg-destructive/10"
                                            onClick={handleRemoveSelf}
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Remove me
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Status & Priority */}
                        <div className="flex items-center gap-4 mb-6">
                            <button
                                onClick={isOwner ? toggleStatus : undefined}
                                disabled={!isOwner}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                    task.status
                                        ? 'bg-green-500/10 text-green-500'
                                        : 'bg-muted text-muted-foreground'
                                } ${!isOwner ? 'opacity-60 cursor-not-allowed' : 'hover:bg-muted/80'}`}
                            >
                                {task.status ? (
                                    <CheckCircle className="w-4 h-4" />
                                ) : (
                                    <Circle className="w-4 h-4" />
                                )}
                                {task.status ? 'Completed' : 'In Progress'}
                            </button>

                            {isEditing ? (
                                <div className="relative">
                                    <Flag className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${getPriorityColor(editedTask?.priority || 'medium').split(' ')[0]}`} fill="currentColor" />
                                    <select
                                        value={editedTask?.priority || 'medium'}
                                        onChange={(e) => setEditedTask(editedTask ? { ...editedTask, priority: e.target.value as any } : null)}
                                        className="pl-9 pr-4 py-1.5 rounded-full text-sm font-medium bg-muted border-none focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
                                    >
                                        <option value="low">Low Priority</option>
                                        <option value="medium">Medium Priority</option>
                                        <option value="high">High Priority</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                </div>
                            ) : (
                                <span className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${getPriorityColor(task.priority)}`}>
                                    <Flag className="w-4 h-4" fill="currentColor" />
                                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
                                </span>
                            )}
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                                <Clock className="w-5 h-5 text-muted-foreground" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Start Date</p>
                                    {isEditing ? (
                                        <input
                                            type="date"
                                            value={editedTask?.startDate ? new Date(editedTask.startDate).toISOString().split('T')[0] : ''}
                                            onChange={(e) => setEditedTask(editedTask ? { ...editedTask, startDate: e.target.value ? new Date(e.target.value).toLocaleDateString() : null } : null)}
                                            className="bg-transparent text-sm font-medium focus:outline-none"
                                        />
                                    ) : (
                                        <p className="text-sm font-medium">{task.startDate || 'Not set'}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                                <Calendar className="w-5 h-5 text-muted-foreground" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Due Date</p>
                                    {isEditing ? (
                                        <input
                                            type="date"
                                            value={editedTask?.dueDate ? new Date(editedTask.dueDate).toISOString().split('T')[0] : ''}
                                            onChange={(e) => setEditedTask(editedTask ? { ...editedTask, dueDate: e.target.value ? new Date(e.target.value).toLocaleDateString() : null } : null)}
                                            className="bg-transparent text-sm font-medium focus:outline-none"
                                        />
                                    ) : (
                                        <p className="text-sm font-medium">{task.dueDate || 'Not set'}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Assignees */}
                        <div className="mb-6">
                            <div className="flex items-center gap-2 mb-3">
                                <Users className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm font-medium text-muted-foreground">Assignees</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {(isEditing ? editedTask?.assignees ?? [] : task.assignees ?? []).length > 0 ? (
                                    (isEditing ? editedTask?.assignees ?? [] : task.assignees ?? []).map((assignee, index) => (
                                        <div
                                            key={assignee.id}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${!assignee.isAccepted ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-muted/50'}`}
                                        >
                                            <div
                                                className={`w-6 h-6 rounded-full ${getAvatarColor(index)} flex items-center justify-center text-white text-xs font-bold`}
                                            >
                                                {getInitials(assignee.fname, assignee.lname)}
                                            </div>
                                            <span className={`text-sm ${!assignee.isAccepted ? 'text-yellow-900 dark:text-yellow-100 font-medium' : ''}`}>{assignee.fname} {assignee.lname}</span>
                                            {isEditing && isOwner && (
                                                <button
                                                    onClick={() => removeAssignee(assignee.id)}
                                                    disabled={removingAssigneeId === assignee.id}
                                                    className="ml-1 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
                                                    title="Remove assignee"
                                                >
                                                    {removingAssigneeId === assignee.id ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        <XCircle className="w-4 h-4" />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <span className="text-sm text-muted-foreground">No assignees</span>
                                )}
                            </div>
                        </div>

                        {/* Tags */}
                        <div className="mb-6">
                            <div className="flex items-center gap-2 mb-3">
                                <Tag className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm font-medium text-muted-foreground">Tags</span>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {(() => {
                                    const original = task.tags ?? [];
                                    const staged = stagedTags ?? original;
                                    const additions = staged.filter(t => !original.includes(t));

                                    if (original.length === 0 && additions.length === 0) {
                                        return <span className="text-sm text-muted-foreground">No tags</span>;
                                    }

                                    return (
                                        <>
                                            {original.map((tag, index) => {
                                                const removed = isEditing && !staged.includes(tag);
                                                return (
                                                    <TagChip
                                                        key={`orig-${index}-${tag}`}
                                                        label={tag}
                                                        removable={isEditing}
                                                        className={removed ? 'opacity-50 line-through' : ''}
                                                        onRemove={() => {
                                                            // mark for removal by removing from stagedTags
                                                            setStagedTags(prev => prev.filter(t => t !== tag));
                                                        }}
                                                    />
                                                );
                                            })}

                                            {additions.map((tag, idx) => (
                                                <TagChip
                                                    key={`add-${idx}-${tag}`}
                                                    label={tag}
                                                    removable={isEditing}
                                                    onRemove={() => {
                                                        // remove staged addition
                                                        setStagedTags(prev => prev.filter(t => t !== tag));
                                                    }}
                                                />
                                            ))}
                                        </>
                                    );
                                })()}
                            </div>

                            {isEditing && (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        placeholder="Add tag"
                                        value={newTag}
                                        onChange={(e) => setNewTag(e.target.value)}
                                        className="px-3 py-1 rounded-md bg-muted/50 text-sm w-48 focus:outline-none"
                                    />
                                    <Button
                                            size="sm"
                                            onClick={async () => {
                                                if (!editedTask || !task) return;
                                                const tag = newTag.trim();
                                                if (!tag) return;
                                                if ((stagedTags ?? []).includes(tag) || (task.tags ?? []).includes(tag)) {
                                                    toast.error('Tag already added');
                                                    return;
                                                }
                                                try {
                                                    setIsTagSaving(true);
                                                    // stage locally; do not call API until save
                                                    setStagedTags(prev => [...prev, tag]);
                                                    setNewTag('');
                                                } catch (e) {
                                                    console.error('Failed to stage tag:', e);
                                                    toast.error('Failed to add tag');
                                                } finally {
                                                    setIsTagSaving(false);
                                                }
                                            }}
                                            disabled={isTagSaving}
                                        >
                                            {isTagSaving ? (
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            ) : null}
                                            Add
                                        </Button>
                                </div>
                            )}
                        </div>

                        {/* Subtasks */}
                        {isOwner && (
                        <div className="mb-6">
                            <div className="flex items-center gap-2 mb-3">
                                <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2v6M12 16v6M5 8h14M5 20h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                <span className="text-sm font-medium text-muted-foreground">Subtasks</span>
                            </div>

                                    <div className={`flex flex-col gap-2 mb-3 ${openingSubtaskId ? 'pointer-events-none opacity-60' : ''}`}>
                                {subtasks.length === 0 ? (
                                    <span className="text-sm text-muted-foreground">No subtasks</span>
                                ) : (
                                    subtasks.map((st) => (
                                                <SubtaskCard
                                                    key={st.id}
                                                    subtask={{ id: st.id, title: st.title }}
                                                    openingSubtaskId={openingSubtaskId}
                                                    unlinkingSubtaskId={unlinkingSubtaskId}
                                                    onOpen={async () => {
                                                        setOpeningSubtaskId(st.id);
                                                        setIsSubtaskDropdownOpen(false);
                                                        try {
                                                            await new Promise((res) => setTimeout(res, 200));
                                                            navigate(`/tasks/${st.id}`);
                                                        } finally {
                                                            setOpeningSubtaskId(null);
                                                        }
                                                    }}
                                                    onUnlink={async () => { await unlinkSubtask(Number(st.id)); }}
                                                    disabled={!!openingSubtaskId || !!unlinkingSubtaskId}
                                                />
                                    ))
                                )}
                            </div>

                            <div className="mb-2 max-w-md">
                                <DropdownSearch
                                    options={eligibleTasks.map(t => ({ value: String(t.id), label: t.title }))}
                                    value={null}
                                    onChange={async (opt) => {
                                        if (!opt) return;
                                        // link selected task as subtask
                                        await linkSubtask(Number(opt.value));
                                    }}
                                    placeholder="Add existing task as subtask..."
                                    maxHeight={192}
                                />
                            </div>
                        </div>
                        )}
                    </div>

                    {/* Description */}
                    <div className="bg-card border border-border rounded-xl p-6 mb-6">
                        <h2 className="text-lg font-semibold mb-4">Description</h2>
                        {isEditing ? (
                            <MarkdownEditor
                                value={editedTask?.description || ''}
                                onChange={(value) => setEditedTask(editedTask ? { ...editedTask, description: value } : null)}
                                placeholder="Add a description..."
                                className="min-h-[200px]"
                            />
                        ) : (
                            task.description ? (
                                <MarkdownPreview content={task.description} />
                            ) : (
                                <p className="text-muted-foreground">No description provided.</p>
                            )
                        )}
                    </div>

                    {/* Attachments removed from Task details per request */}
                </div>

                <DeleteConfirmationModal
                    isOpen={deleteModal.isOpen}
                    onClose={() => setDeleteModal({ isOpen: false })}
                    onConfirm={handleDelete}
                    title="Delete Task"
                    description={`Are you sure you want to delete "${task.title}"? This action cannot be undone.`}
                    itemType="task"
                />

                {/* Attachments removed - no attachment modal */}
            </main>
        </div>
    );
};

export default TaskDetail;
