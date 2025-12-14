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
    Upload,
    File as FileIcon,
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
    const [files, setFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [deleteModal, setDeleteModal] = useState({
        isOpen: false,
    });

    const [attachmentDeleteModal, setAttachmentDeleteModal] = useState<{
        isOpen: boolean;
        attachment: TaskFile | null;
    }>({
        isOpen: false,
        attachment: null,
    });

    // Assignment relation dropdown state
    const [isRelationDropdownOpen, setIsRelationDropdownOpen] = useState(false);
    const [relationSearchQuery, setRelationSearchQuery] = useState('');
    const relationDropdownRef = useRef<HTMLDivElement>(null);

    // Dummy assignments for dropdown (will be replaced with API data later)
    const DUMMY_ASSIGNMENTS = [
        { id: '1', name: 'Database Systems - Final Project', community: 'Database Systems' },
        { id: '2', name: 'Algorithms - Midterm Exam', community: 'Algorithms' },
        { id: '3', name: 'Operating Systems - Lab Assignment', community: 'Operating Systems' },
        { id: '4', name: 'Software Engineering - Sprint Review', community: 'Software Engineering' },
        { id: '5', name: 'Computer Networks - Packet Analysis', community: 'Computer Networks' },
        { id: '6', name: 'Machine Learning - Model Training', community: 'Machine Learning' },
    ];

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

                // Load dummy task
                if (taskId && DUMMY_TASKS[taskId]) {
                    setTask(DUMMY_TASKS[taskId]);
                    setEditedTask(DUMMY_TASKS[taskId]);
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        initData();
    }, [taskId]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles([...files, ...Array.from(e.target.files)]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const toggleStatus = () => {
        if (task) {
            setTask({ ...task, status: !task.status });
        }
    };

    const handleSave = () => {
        if (editedTask) {
            // Add new files to task (dummy - just names)
            const newFiles: TaskFile[] = files.map((f, i) => ({
                id: `new-${Date.now()}-${i}`,
                name: f.name,
                url: '#',
                type: f.type.split('/')[0] || 'file',
            }));

            setTask({
                ...editedTask,
                files: [...editedTask.files, ...newFiles],
            });
            setFiles([]);
            setIsEditing(false);
        }
    };

    const handleCancel = () => {
        setEditedTask(task);
        setFiles([]);
        setIsEditing(false);
    };

    const handleDelete = () => {
        // Navigate back to tasks list
        navigate('/tasks');
    };

    const handleDeleteAttachment = () => {
        if (attachmentDeleteModal.attachment && editedTask) {
            setEditedTask({
                ...editedTask,
                files: editedTask.files.filter(f => f.id !== attachmentDeleteModal.attachment?.id)
            });
            // Also update the main task state to reflect immediately
            if (task) {
                setTask({
                    ...task,
                    files: task.files.filter(f => f.id !== attachmentDeleteModal.attachment?.id)
                });
            }
        }
        setAttachmentDeleteModal({ isOpen: false, attachment: null });
    };

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
                                        className="text-2xl font-bold bg-transparent border-b border-input focus:outline-none focus:border-primary w-full"
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

                                                    {DUMMY_ASSIGNMENTS
                                                        .filter(a => 
                                                            a.name.toLowerCase().includes(relationSearchQuery.toLowerCase()) ||
                                                            a.community.toLowerCase().includes(relationSearchQuery.toLowerCase())
                                                        )
                                                        .map((assignment) => (
                                                            <button
                                                                key={assignment.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setEditedTask(editedTask ? { ...editedTask, assignmentRelation: assignment.name } : null);
                                                                    setIsRelationDropdownOpen(false);
                                                                    setRelationSearchQuery('');
                                                                }}
                                                                className={`w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors ${
                                                                    editedTask?.assignmentRelation === assignment.name ? 'bg-primary/10' : ''
                                                                }`}
                                                            >
                                                                <div className="text-sm font-medium truncate">{assignment.name}</div>
                                                                <div className="text-xs text-muted-foreground">{assignment.community}</div>
                                                            </button>
                                                        ))
                                                    }

                                                    {DUMMY_ASSIGNMENTS.filter(a => 
                                                        a.name.toLowerCase().includes(relationSearchQuery.toLowerCase()) ||
                                                        a.community.toLowerCase().includes(relationSearchQuery.toLowerCase())
                                                    ).length === 0 && relationSearchQuery && (
                                                        <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                                                            No assignments found
                                                        </div>
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
                                        >
                                            <Save className="w-4 h-4 mr-2" />
                                            Save
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

                    {/* Attachments */}
                    <div className="bg-card border border-border rounded-xl p-6">
                        <h2 className="text-lg font-semibold mb-4">Attachments</h2>

                        {/* Existing Files */}
                        {task.files.length > 0 && (
                            <div className="space-y-2 mb-4">
                                {task.files.map((file) => (
                                    <div
                                        key={file.id}
                                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <FileIcon className="w-5 h-5 text-primary" />
                                            <span className="text-sm font-medium">{file.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isEditing && (
                                                <button
                                                    type="button"
                                                    onClick={() => setAttachmentDeleteModal({ isOpen: true, attachment: file })}
                                                    className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Delete attachment"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                            <Button variant="ghost" size="sm">
                                                Download
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Upload Area (only in edit mode) */}
                        {isEditing && (
                            <>
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

                                {/* New Files to Upload */}
                                {files.length > 0 && (
                                    <div className="mt-4 space-y-2">
                                        <p className="text-sm font-medium text-muted-foreground">New files to upload:</p>
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
                            </>
                        )}

                        {!isEditing && task.files.length === 0 && (
                            <p className="text-sm text-muted-foreground">No attachments</p>
                        )}
                    </div>
                </div>

                <DeleteConfirmationModal
                    isOpen={deleteModal.isOpen}
                    onClose={() => setDeleteModal({ isOpen: false })}
                    onConfirm={handleDelete}
                    title="Delete Task"
                    description={`Are you sure you want to delete "${task.title}"? This action cannot be undone.`}
                    itemType="task"
                />

                <DeleteConfirmationModal
                    isOpen={attachmentDeleteModal.isOpen}
                    onClose={() => setAttachmentDeleteModal({ isOpen: false, attachment: null })}
                    onConfirm={handleDeleteAttachment}
                    title="Delete Attachment"
                    description={`Are you sure you want to delete "${attachmentDeleteModal.attachment?.name}"? This action cannot be undone.`}
                    itemType="file"
                />
            </main>
        </div>
    );
};

export default TaskDetail;
