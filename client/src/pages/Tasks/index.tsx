import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, Flag, Calendar, Users, Trash2, Search, Filter, CheckCircle, Circle, Link } from 'lucide-react';
import { Sidebar } from '../../components/dashboard';
import api from '../../services/api';
import { toast } from 'sonner';
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

// We'll load tasks from the backend for real users

const Tasks: React.FC<TasksProps> = ({ onLogout }) => {
    const navigate = useNavigate();
    const [user, setUser] = useState<UserData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [tasks, setTasks] = useState<Task[]>([]);

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
    const [updatingTaskIds, setUpdatingTaskIds] = useState<string[]>([]);
    const [page, setPage] = useState<number>(1);
    const [limit] = useState<number>(5);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [totalTasks, setTotalTasks] = useState<number>(0);
    const [isFetchingTasks, setIsFetchingTasks] = useState<boolean>(false);

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
                // Redirect non-students away from Tasks page
                if (userData.role !== 'student') {
                    toast.error('Access denied: Tasks are available to students only');
                    navigate('/explore');
                    return;
                }
                // Fetch tasks for this student from backend (start on page 1)
                try {
                    await fetchTasks(1, limit, searchQuery, priorityFilter === 'all' ? undefined : priorityFilter);
                } catch (err) {
                    console.error('Failed to fetch tasks from backend:', err);
                }
            } catch (error) {
                console.error('Failed to fetch user:', error);
                // If fetching user failed assume not authorized
                toast.error('Access denied: please login as a student');
                navigate('/login');
            } finally {
                setIsLoading(false);
            }
        };

        initData();
    }, [navigate]);

    // Debounce search and priority filter changes to avoid spamming the server
    useEffect(() => {
        const t = setTimeout(() => {
            // reset to first page on new search/filter
            fetchTasks(1, limit, searchQuery, priorityFilter === 'all' ? undefined : priorityFilter).catch((e) => console.error(e));
        }, 300);
        return () => clearTimeout(t);
    }, [searchQuery, priorityFilter]);

    // Helper: map backend task objects to frontend Task
    const mapBackendTasks = (backendTasks: any[]): Task[] => {
        return backendTasks.map((t: any) => {
            let assignees: Assignee[] = [];
            if (Array.isArray(t.TaskAssignees) && t.TaskAssignees.length > 0) {
                assignees = t.TaskAssignees.map((a: any) => ({
                    id: a.user_id ?? a.uid ?? a.User?.id ?? 0,
                    fname: a.User?.fname ?? a.fname ?? 'Unknown',
                    lname: a.User?.lname ?? a.lname ?? '',
                    avatar_url: a.User?.avatar_file_id ?? null,
                }));
            } else if (t.Student) {
                if (Array.isArray(t.Student)) {
                    assignees = t.Student.map((s: any) => ({ id: s.User?.id ?? 0, fname: s.User?.fname ?? 'Unknown', lname: s.User?.lname ?? '', avatar_url: s.User?.avatar_file_id ?? null }));
                } else if (t.Student.User) {
                    assignees = [{ id: t.Student.User.id, fname: t.Student.User.fname, lname: t.Student.User.lname, avatar_url: t.Student.User.avatar_file_id ?? null }];
                }
            }

            let assignmentRelation = '';
            if (t.TaskAssignmentRelation) {
                if (Array.isArray(t.TaskAssignmentRelation)) {
                    assignmentRelation = t.TaskAssignmentRelation[0]?.Assignment?.title ?? '';
                } else {
                    assignmentRelation = t.TaskAssignmentRelation.Assignment?.title ?? '';
                }
            }

            const dueDate = t.end_date ? new Date(t.end_date).toLocaleDateString() : null;

            const p = t.priority;
            let priority: Task['priority'] = 'low';
            if (p === null || p === undefined) priority = 'low';
            else if (p <= 3) priority = 'low';
            else if (p <= 7) priority = 'medium';
            else priority = 'high';

            return {
                id: String(t.id),
                name: t.title ?? t.name ?? 'Untitled',
                assignees,
                dueDate,
                priority,
                assignmentRelation,
                completed: t.status === 2 || t.completed === true,
            } as Task;
        });
    };

    // Fetch tasks from backend and set state, handle pagination meta
    const fetchTasks = async (p = 1, l = limit, q?: string, priority?: string) => {
        setIsFetchingTasks(true);
        try {
            const params: any = { page: p, limit: l };
            if (q && q.trim() !== '') params.q = q.trim();
            if (priority && priority !== 'all') params.priority = priority;

            const tasksRes = await api.get('/tasks', { params });
            const backendTasks = tasksRes.data?.data || [];
            const mapped = mapBackendTasks(backendTasks);
            setTasks(mapped);
            const meta = tasksRes.data?.meta;
            setTotalPages(meta?.totalPages ?? 1);
            setTotalTasks(meta?.total ?? mapped.length);
            setPage(meta?.page ?? p);
        } finally {
            setIsFetchingTasks(false);
        }
    };

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

    const toggleTaskCompletion = async (task: Task) => {
        // Prevent concurrent updates for same task
        if (updatingTaskIds.includes(task.id)) return;

        const newCompleted = !task.completed;
        const desiredStatus = newCompleted ? 2 : 1; // 2 = Completed, 1 = Not Complete

        // Optimistic update
        setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, completed: newCompleted } : t)));
        setUpdatingTaskIds(prev => [...prev, task.id]);

        try {
            await api.patch(`/tasks/${Number(task.id)}/status`, { status: desiredStatus });
            toast.success(`Task marked ${newCompleted ? 'complete' : 'incomplete'}`);
        } catch (err) {
            console.error('Failed to update task status:', err);
            // Revert optimistic update
            setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, completed: task.completed } : t)));
            toast.error('Failed to update task status. Please try again.');
        } finally {
            setUpdatingTaskIds(prev => prev.filter(id => id !== task.id));
        }
    };

    const handleTaskCreated = async () => {
        try {
            await fetchTasks(page, limit, searchQuery, priorityFilter === 'all' ? undefined : priorityFilter);
        } catch (err) {
            console.error('Failed to reload tasks after creation:', err);
        }
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
                {isFetchingTasks && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin ml-2" />}
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
                                            <Link className="w-3 h-3" />
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
                                        disabled={updatingTaskIds.includes(task.id)}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${task.completed
                                            ? 'text-green-500 hover:text-green-600 bg-green-500/10'
                                            : 'text-muted-foreground hover:text-green-500 hover:bg-green-500/10'
                                            }`}
                                        title={task.completed ? "Mark as incomplete" : "Mark as complete"}
                                    >
                                        {updatingTaskIds.includes(task.id) ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            task.completed ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />
                                        )}
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
                                    <div className="absolute right-0 top-full mt-2 w-40 bg-card border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 overflow-hidden">
                                        {['all', 'high', 'medium', 'low'].map((p) => (
                                            <button
                                                key={p}
                                                onClick={() => setPriorityFilter(p as any)}
                                                className={`w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors capitalize ${priorityFilter === p ? 'bg-muted font-medium' : ''} first:rounded-t-lg last:rounded-b-lg focus:outline-none`}
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

                    <TaskTable taskList={completedTasks} title="Completed Tasks" />

                    {/* Pagination controls (server-driven) */}
                    <div className="flex justify-end mt-6">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="mr-4">Total: {totalTasks}</span>
                            <button
                                onClick={async () => {
                                    if (page <= 1) return;
                                    const newPage = page - 1;
                                    await fetchTasks(newPage, limit, searchQuery, priorityFilter === 'all' ? undefined : priorityFilter);
                                }}
                                disabled={page <= 1 || isFetchingTasks}
                                className="px-3 py-1 bg-card border border-input rounded hover:bg-muted disabled:opacity-50"
                            >
                                Prev
                            </button>
                            <span className="px-3">Page {page} of {totalPages}</span>
                            <button
                                onClick={async () => {
                                    if (page >= totalPages) return;
                                    const newPage = page + 1;
                                    await fetchTasks(newPage, limit, searchQuery, priorityFilter === 'all' ? undefined : priorityFilter);
                                }}
                                disabled={page >= totalPages || isFetchingTasks}
                                className="px-3 py-1 bg-card border border-input rounded hover:bg-muted disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
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
