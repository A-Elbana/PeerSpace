import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, Flag, Calendar, Users, Trash2, Search, Filter, CheckCircle, Circle } from 'lucide-react';
import { Sidebar } from '../../components/dashboard';
import api from '../../services/api';
import { Button } from '../../components/ui/button';
import { DeleteConfirmationModal } from '../../components/common/DeleteConfirmationModal';
import { CreateTaskModal } from './CreateTaskModal';

type UserRole = 'student' | 'instructor' | 'admin';

interface UserData {
    id: number;
    email: string;
    fname: string;
    lname: string;
    role: UserRole;
    avatar_url?: string;
}

// Frontend Task Interface
interface Task {
    id: string;
    name: string;
    assignees: Assignee[];
    dueDate: string | null;
    priority: 'low' | 'medium' | 'high';
    assignmentRelation: string;
    completed: boolean;
}

interface Assignee {
    id: number;
    fname: string;
    lname: string;
    avatar_url?: string;
}

interface TasksProps {
    onLogout?: () => void;
}

// Dummy data
const DUMMY_TASKS: Task[] = [
    {
        id: '1',
        name: 'Complete Database Project Report',
        assignees: [
            { id: 1, fname: 'John', lname: 'Doe' },
            { id: 2, fname: 'Jane', lname: 'Smith' },
        ],
        dueDate: '12/20/2024',
        priority: 'high',
        assignmentRelation: 'Database Systems',
        completed: false,
    },
    {
        id: '2',
        name: 'Study for Algorithms Exam',
        assignees: [{ id: 1, fname: 'John', lname: 'Doe' }],
        dueDate: '12/18/2024',
        priority: 'high',
        assignmentRelation: 'Algorithms',
        completed: false,
    },
    {
        id: '3',
        name: 'Review lecture notes',
        assignees: [],
        dueDate: '12/15/2024',
        priority: 'medium',
        assignmentRelation: '',
        completed: false,
    },
    {
        id: '4',
        name: 'Submit homework assignment',
        assignees: [{ id: 3, fname: 'Alice', lname: 'Johnson' }],
        dueDate: '12/22/2024',
        priority: 'low',
        assignmentRelation: 'Operating Systems',
        completed: true,
    },
    {
        id: '5',
        name: 'Group project meeting',
        assignees: [
            { id: 1, fname: 'John', lname: 'Doe' },
            { id: 2, fname: 'Jane', lname: 'Smith' },
            { id: 3, fname: 'Alice', lname: 'Johnson' },
            { id: 4, fname: 'Bob', lname: 'Wilson' },
            { id: 5, fname: 'Charlie', lname: 'Brown' },
        ],
        dueDate: null,
        priority: 'medium',
        assignmentRelation: 'Software Engineering',
        completed: true,
    },
];

const Tasks: React.FC<TasksProps> = ({ onLogout }) => {
    const navigate = useNavigate();
    const [user, setUser] = useState<UserData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [tasks, setTasks] = useState<Task[]>(DUMMY_TASKS);

    // Search and Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

    // Delete Modal State
    const [deleteModal, setDeleteModal] = useState<{
        isOpen: boolean;
        taskId: string;
        taskName: string;
    }>({
        isOpen: false,
        taskId: '',
        taskName: ''
    });

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Set page title
    useEffect(() => {
        document.title = 'PeerSpace - Tasks';
    }, []);

    // Fetch User only (tasks are dummy)
    useEffect(() => {
        const initData = async () => {
            try {
                const userRes = await api.get('/auth/me');
                const userData: UserData = {
                    ...userRes.data,
                    role: userRes.data.role?.toLowerCase() as UserRole,
                };
                setUser(userData);
            } catch (error) {
                console.error('Failed to fetch user:', error);
            } finally {
                setIsLoading(false);
            }
        };

        initData();
    }, [navigate]);

    const handleDeleteClick = (task: Task) => {
        setDeleteModal({
            isOpen: true,
            taskId: task.id,
            taskName: task.name,
        });
    };

    const confirmDelete = () => {
        setTasks(tasks.filter(t => t.id !== deleteModal.taskId));
        setDeleteModal({ ...deleteModal, isOpen: false });
    };

    const toggleTaskCompletion = (task: Task) => {
        const updatedTasks = tasks.map(t =>
            t.id === task.id ? { ...t, completed: !t.completed } : t
        );
        setTasks(updatedTasks);
    };

    const handleTaskCreated = (newTask: Task) => {
        setTasks([newTask, ...tasks]);
    };

    const getPriorityColor = (priority: Task['priority']) => {
        switch (priority) {
            case 'high':
                return 'text-red-500';
            case 'medium':
                return 'text-yellow-500';
            case 'low':
                return 'text-green-500';
            default:
                return 'text-muted-foreground';
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

    // Filter logic
    const filteredTasks = tasks.filter(task => {
        const matchesSearch = task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.assignmentRelation.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
        return matchesSearch && matchesPriority;
    });

    const ongoingTasks = filteredTasks.filter(t => !t.completed);
    const completedTasks = filteredTasks.filter(t => t.completed);

    const TaskTable = ({ taskList, title }: { taskList: Task[], title: string }) => (
        <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
                {title}
                <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {taskList.length}
                </span>
            </h2>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-6 py-4 bg-muted/30 border-b border-border text-sm font-medium text-muted-foreground">
                    <div>Name</div>
                    <div className="w-48 text-center">Assignees</div>
                    <div className="w-32 text-center">Due date</div>
                    <div className="w-24 text-center">Priority</div>
                    <div className="w-12 text-center">Done</div>
                    <div className="w-12"></div>
                </div>

                <div className="divide-y divide-border">
                    {taskList.length === 0 ? (
                        <div className="px-6 py-8 text-center text-muted-foreground">
                            No {title.toLowerCase()} tasks found.
                        </div>
                    ) : (
                        taskList.map((task) => (
                            <div
                                key={task.id}
                                className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-6 py-4 hover:bg-muted/20 transition-colors group cursor-pointer"
                                onClick={() => navigate(`/tasks/${task.id}`)}
                            >
                                {/* Task Name & Assignment Relation */}
                                <div className="flex flex-col min-w-0 justify-center">
                                    <div className={`font-medium truncate ${task.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                        {task.name}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full ${task.completed ? 'opacity-50' : ''}`}>
                                            <Users className="w-3 h-3" />
                                            {task.assignmentRelation || 'No Relation'}
                                        </span>
                                    </div>
                                </div>

                                {/* Assignees */}
                                <div className="w-48 flex items-center justify-center">
                                    <div className={`flex -space-x-2 ${task.completed ? 'opacity-50' : ''}`}>
                                        {task.assignees.length > 0 ? (
                                            <>
                                                {task.assignees.slice(0, 4).map((assignee, index) => (
                                                    <div
                                                        key={assignee.id}
                                                        className={`w-8 h-8 rounded-full ${getAvatarColor(
                                                            index
                                                        )} flex items-center justify-center text-white text-xs font-bold border-2 border-background shadow-sm`}
                                                        title={`${assignee.fname} ${assignee.lname}`}
                                                    >
                                                        {getInitials(assignee.fname, assignee.lname)}
                                                    </div>
                                                ))}
                                                {task.assignees.length > 4 && (
                                                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-bold border-2 border-background shadow-sm">
                                                        +{task.assignees.length - 4}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">-</span>
                                        )}
                                    </div>
                                </div>

                                {/* Due Date */}
                                <div className="w-32 flex items-center justify-center">
                                    <div className={`flex items-center gap-2 text-sm ${task.completed ? 'text-muted-foreground' : 'text-foreground'}`}>
                                        <Calendar className="w-4 h-4 text-muted-foreground" />
                                        <span>{task.dueDate || '-'}</span>
                                    </div>
                                </div>

                                {/* Priority */}
                                <div className="w-24 flex items-center justify-center">
                                    <Flag
                                        className={`w-5 h-5 ${task.completed ? 'text-muted-foreground' : getPriorityColor(task.priority)}`}
                                        fill="currentColor"
                                    />
                                </div>

                                {/* Mark Complete Button */}
                                <div className="w-12 flex items-center justify-center">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleTaskCompletion(task); }}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${task.completed
                                            ? 'text-green-500 hover:text-green-600 bg-green-500/10'
                                            : 'text-muted-foreground hover:text-green-500 hover:bg-green-500/10'
                                            }`}
                                        title={task.completed ? "Mark as incomplete" : "Mark as complete"}
                                    >
                                        {task.completed ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                    </button>
                                </div>

                                {/* Delete Action */}
                                <div className="w-12 flex items-center justify-center">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(task); }}
                                        className="w-8 h-8 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                                        title="Delete Task"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            <Sidebar onLogout={onLogout || (() => { })} />

            {/* Main Content */}
            <main className="flex-1 ml-20 p-8">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-foreground mb-2">Tasks</h1>
                            <p className="text-muted-foreground">
                                Manage and track your tasks and deadlines
                            </p>
                        </div>

                        <div className="flex flex-col md:flex-row gap-3">
                            {/* Create Task Button (Styled as requested) */}
                            <Button
                                className="rounded-lg px-3 py-2 h-auto gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                                onClick={() => setIsCreateModalOpen(true)}
                            >
                                <Plus className="w-4 h-4" />
                                <span className="text-sm font-medium">Add Task</span>
                            </Button>

                            {/* Search and Filters */}
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Search tasks..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 pr-4 py-2 bg-card border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-full md:w-64"
                                    />
                                </div>

                                <div className="relative group">
                                    <button className="flex items-center gap-2 px-3 py-2 bg-card border border-input rounded-lg text-sm hover:bg-muted transition-colors">
                                        <Filter className="w-4 h-4 text-muted-foreground" />
                                        <span className="capitalize">{priorityFilter === 'all' ? 'All Priorities' : priorityFilter}</span>
                                    </button>
                                    <div className="absolute right-0 top-full mt-2 w-40 bg-card border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                                        {['all', 'high', 'medium', 'low'].map((p) => (
                                            <button
                                                key={p}
                                                onClick={() => setPriorityFilter(p as any)}
                                                className={`w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors capitalize ${priorityFilter === p ? 'bg-muted font-medium' : ''}`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <TaskTable taskList={ongoingTasks} title="Ongoing Tasks" />

                    {(completedTasks.length > 0 || searchQuery !== '' || priorityFilter !== 'all') && (
                        <TaskTable taskList={completedTasks} title="Completed Tasks" />
                    )}
                </div>

                <DeleteConfirmationModal
                    isOpen={deleteModal.isOpen}
                    onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                    onConfirm={confirmDelete}
                    title="Delete Task"
                    description={`Are you sure you want to delete "${deleteModal.taskName}"? This action cannot be undone.`}
                    itemType="task"
                />

                <CreateTaskModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onTaskCreated={handleTaskCreated}
                />
            </main>
        </div>
    );
};

export default Tasks;
