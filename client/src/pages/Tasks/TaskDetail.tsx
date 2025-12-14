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
    ChevronDown
} from 'lucide-react';
import { Sidebar } from '../../components/dashboard';
import { Button } from '../../components/ui/button';
import { DeleteConfirmationModal } from '../../components/common/DeleteConfirmationModal';
import { MarkdownEditor, MarkdownPreview } from '../../components/MarkdownEditor';
import api from '../../services/api';
import { toast } from 'sonner';

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
    avatar_url?: string;
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
    tags: string[];
    files: TaskFile[];
    parentTask: string | null;
}

// Dummy data - extended version
const DUMMY_TASKS: Record<string, Task> = {
    '1': {
        id: '1',
        title: 'Complete Database Project Report',
        description: 'Write a comprehensive report covering the database design, normalization process, and implementation details. Include ER diagrams and SQL queries used.',
        assignees: [
            { id: 1, fname: 'John', lname: 'Doe' },
            { id: 2, fname: 'Jane', lname: 'Smith' },
        ],
        startDate: '12/10/2024',
        dueDate: '12/20/2024',
        priority: 'high',
        status: false,
        assignmentRelation: 'Database Systems - Final Project',
        tags: ['database', 'report', 'project'],
        files: [
            { id: 'f1', name: 'project_outline.pdf', url: '#', type: 'pdf' },
            { id: 'f2', name: 'er_diagram.png', url: '#', type: 'image' },
        ],
        parentTask: null,
    },
    '2': {
        id: '2',
        title: 'Study for Algorithms Exam',
        description: 'Review all lecture notes, practice problems, and past exams. Focus on dynamic programming and graph algorithms.',
        assignees: [{ id: 1, fname: 'John', lname: 'Doe' }],
        startDate: '12/15/2024',
        dueDate: '12/18/2024',
        priority: 'high',
        status: false,
        assignmentRelation: 'Algorithms',
        tags: ['exam', 'study', 'algorithms'],
        files: [],
        parentTask: null,
    },
    '3': {
        id: '3',
        title: 'Review lecture notes',
        description: 'Go through all lecture notes from this semester and create summary sheets.',
        assignees: [],
        startDate: null,
        dueDate: '12/15/2024',
        priority: 'medium',
        status: false,
        assignmentRelation: null,
        tags: ['review', 'notes'],
        files: [],
        parentTask: null,
    },
    '4': {
        id: '4',
        title: 'Submit homework assignment',
        description: 'Complete and submit the OS homework on process scheduling.',
        assignees: [{ id: 3, fname: 'Alice', lname: 'Johnson' }],
        startDate: '12/18/2024',
        dueDate: '12/22/2024',
        priority: 'low',
        status: true,
        assignmentRelation: 'Operating Systems',
        tags: ['homework', 'OS'],
        files: [
            { id: 'f3', name: 'homework_solution.pdf', url: '#', type: 'pdf' },
        ],
        parentTask: null,
    },
    '5': {
        id: '5',
        title: 'Group project meeting',
        description: 'Weekly sync meeting to discuss project progress and next steps.',
        assignees: [
            { id: 1, fname: 'John', lname: 'Doe' },
            { id: 2, fname: 'Jane', lname: 'Smith' },
            { id: 3, fname: 'Alice', lname: 'Johnson' },
            { id: 4, fname: 'Bob', lname: 'Wilson' },
            { id: 5, fname: 'Charlie', lname: 'Brown' },
        ],
        startDate: null,
        dueDate: null,
        priority: 'medium',
        status: true,
        assignmentRelation: 'Software Engineering',
        tags: ['meeting', 'group'],
        files: [],
        parentTask: null,
    },
};

interface TaskDetailProps {
    onLogout?: () => void;
}

const TaskDetail: React.FC<TaskDetailProps> = ({ onLogout }) => {
    const { taskId } = useParams<{ taskId: string }>();
    const navigate = useNavigate();
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
                    } catch (err) {
                        console.error('Failed to fetch task:', err);
                        // keep behavior of showing not found
                    }
                }

                // Fetch user's communities and assignments for relation dropdown
                try {
                    setAssignmentsLoading(true);
                    // fetch communities (showing public + user's private memberships)
                    const commRes = await api.get('/communities', { params: { limit: 100 } });
                    const communities = commRes.data?.data || [];

                    // Fetch assignments for each community in parallel
                    const assignmentPromises = communities.map((c: any) =>
                        api.get('/assignments', { params: { cid: c.id, limit: 100 } }).then(r => ({ community: c, assignments: r.data?.data || [] })).catch(() => ({ community: c, assignments: [] }))
                    );

                    const settled = await Promise.all(assignmentPromises);
                    const merged: Array<{ id: number; title: string; community: string }> = [];
                    settled.forEach((s: any) => {
                        s.assignments.forEach((a: any) => {
                            merged.push({ id: a.id, title: a.title, community: s.community.name });
                        });
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
                id: a.user_id ?? a.uid ?? a.User?.id ?? 0,
                fname: a.Student?.User?.fname ?? a.User?.fname ?? a.fname ?? 'Unknown',
                lname: a.Student?.User?.lname ?? a.User?.lname ?? a.lname ?? '',
                avatar_url: a.Student?.User?.avatar_file_id ?? a.User?.avatar_file_id ?? null,
            }));
        } else if (t.Student) {
            if (Array.isArray(t.Student)) {
                assignees = t.Student.map((s: any) => ({ id: s.User?.id ?? 0, fname: s.User?.fname ?? 'Unknown', lname: s.User?.lname ?? '', avatar_url: s.User?.avatar_file_id ?? null }));
            } else if (t.Student.User) {
                assignees = [{ id: t.Student.User.id, fname: t.Student.User.fname, lname: t.Student.User.lname, avatar_url: t.Student.User.avatar_file_id ?? null }];
            }
        }

        let assignmentRelation = null;
        if (t.TaskAssignmentRelation) {
            if (Array.isArray(t.TaskAssignmentRelation)) {
                assignmentRelation = t.TaskAssignmentRelation[0]?.Assignment?.title ?? null;
            } else {
                assignmentRelation = t.TaskAssignmentRelation.Assignment?.title ?? null;
            }
        }

        const dueDate = t.end_date ? new Date(t.end_date).toLocaleDateString() : null;
        const startDate = t.start_date ? new Date(t.start_date).toLocaleDateString() : null;

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
            tags,
            files: Array.isArray(t.File) ? t.File.map((f: any) => ({ id: String(f.id), name: f.name, url: f.secure_url ?? f.url ?? '', type: f.resource_type ?? 'file' })) : [],
            parentTask: t.Task?.title ?? null,
        };
    };

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
            const updated = res.data?.task ?? res.data;
            const mapped = mapBackendTask(updated);
            setTask(mapped);
            setEditedTask(mapped);
            setIsEditing(false);
            toast.success('Task updated');
        } catch (err) {
            console.error('Failed to save task:', err);
            toast.error('Failed to save task');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setEditedTask(task);
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
                <main className="flex-1 ml-20 p-8">
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

                                {isEditing ? (
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
                                                            setEditedTask(editedTask ? { ...editedTask, assignmentRelation: null } : null);
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
                                                                        setEditedTask(editedTask ? { ...editedTask, assignmentRelation: assignment.title } : null);
                                                                        setIsRelationDropdownOpen(false);
                                                                        setRelationSearchQuery('');
                                                                    }}
                                                                    className={`w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors ${
                                                                        editedTask?.assignmentRelation === assignment.title ? 'bg-primary/10' : ''
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
                                ) : task.assignmentRelation ? (
                                    <div className="flex items-center gap-2 mt-2">
                                        <LinkIcon className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-sm text-primary">{task.assignmentRelation}</span>
                                    </div>
                                ) : null}
                            </div>

                            <div className="flex items-center gap-2">
                                {!isEditing ? (
                                    <>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setIsEditing(true)}
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
                                )}
                            </div>
                        </div>

                        {/* Status & Priority */}
                        <div className="flex items-center gap-4 mb-6">
                            <button
                                onClick={toggleStatus}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                    task.status
                                        ? 'bg-green-500/10 text-green-500'
                                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                }`}
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
                                {task.assignees.length > 0 ? (
                                    task.assignees.map((assignee, index) => (
                                        <div
                                            key={assignee.id}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full"
                                        >
                                            <div
                                                className={`w-6 h-6 rounded-full ${getAvatarColor(index)} flex items-center justify-center text-white text-xs font-bold`}
                                            >
                                                {getInitials(assignee.fname, assignee.lname)}
                                            </div>
                                            <span className="text-sm">{assignee.fname} {assignee.lname}</span>
                                        </div>
                                    ))
                                ) : (
                                    <span className="text-sm text-muted-foreground">No assignees</span>
                                )}
                            </div>
                        </div>

                        {/* Tags */}
                        {task.tags.length > 0 && (
                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-3">
                                    <Tag className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm font-medium text-muted-foreground">Tags</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {task.tags.map((tag, index) => (
                                        <span
                                            key={index}
                                            className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full"
                                        >
                                            {tag}
                                        </span>
                                    ))}
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
