import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Circle, Loader2, Plus } from 'lucide-react';
import { Sidebar, Header } from '../../components/dashboard';
import { Button } from '../../components/ui/button';
import { assignmentApi } from '../../services/api';
import { communityApi } from '../../services/api';

// Interface for unified task item
interface ScheduleItem {
    id: string | number;
    title: string;
    type: 'assignment' | 'personal';
    dueDate: Date | null;
    completed: boolean;
    communityName?: string;
    cid?: string | number; // Added for navigation
    points?: number;
}

const Schedule: React.FC = () => {
    const navigate = useNavigate();
    const [items, setItems] = useState<ScheduleItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load persistence logic
    useEffect(() => {
        loadSchedule();
    }, []);

    const loadSchedule = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch all communities to find IDs
            const communitiesRes = await communityApi.getAll({ limit: 50 });
            const communities = communitiesRes.data || [];

            // 2. Fetch assignments for all communities
            const assignmentPromises = communities.map(c =>
                assignmentApi.getByCommunity(c.id, { limit: 20 })
                    .then(res => ({ cid: c.id, cname: c.name, assignments: res.data }))
                    .catch(() => ({ cid: c.id, cname: c.name, assignments: [] }))
            );

            const results = await Promise.all(assignmentPromises);

            const assignmentItems: ScheduleItem[] = results.flatMap(r =>
                r.assignments.map((a: any) => ({
                    id: `a-${a.id}`,
                    title: a.title,
                    type: 'assignment' as const,
                    dueDate: a.due_date ? new Date(a.due_date) : null,
                    completed: a.submitted || false,
                    communityName: r.cname,
                    cid: r.cid, // Added cid
                    points: a.max_points
                }))
            );

            // 3. Load Personal Tasks from LocalStorage
            const storedTasks = localStorage.getItem('peerspace_personal_tasks');
            const personalItems: ScheduleItem[] = storedTasks ? JSON.parse(storedTasks).map((t: any) => ({
                ...t,
                dueDate: t.dueDate ? new Date(t.dueDate) : null,
                type: 'personal'
            })) : [];

            // 4. Merge and Sort
            const allItems = [...assignmentItems, ...personalItems].sort((a, b) => {
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return a.dueDate.getTime() - b.dueDate.getTime();
            });

            setItems(allItems);

        } catch (error) {
            console.error('Failed to load schedule:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleComplete = (id: string | number) => {
        // Only works for personal tasks for now
        if (typeof id === 'string' && id.startsWith('a-')) {
            const item = items.find(i => i.id === id);
            if (item && item.type === 'assignment' && item.cid) {
                const aid = id.split('-')[1];
                navigate(`/community/${item.cid}/assignments/${aid}`);
            }
            return;
        }

        // Personal task toggle logic
        const newItems = items.map(item => {
            if (item.id === id) {
                const newItem = { ...item, completed: !item.completed };
                updateLocalStorage(newItem);
                return newItem;
            }
            return item;
        });
        setItems(newItems);
    };

    const updateLocalStorage = (updatedItem: ScheduleItem) => {
        const stored = localStorage.getItem('peerspace_personal_tasks');
        let tasks = stored ? JSON.parse(stored) : [];
        tasks = tasks.map((t: any) => t.id === updatedItem.id ? updatedItem : t);
        localStorage.setItem('peerspace_personal_tasks', JSON.stringify(tasks));
    };

    const handleCreateTask = () => {
        const title = prompt("Enter task title:");
        if (!title) return;

        const newItem: ScheduleItem = {
            id: `p-${Date.now()}`,
            title,
            type: 'personal',
            dueDate: null,
            completed: false
        };

        const stored = localStorage.getItem('peerspace_personal_tasks');
        const tasks = stored ? JSON.parse(stored) : [];
        tasks.push(newItem);
        localStorage.setItem('peerspace_personal_tasks', JSON.stringify(tasks));

        setItems(prev => [...prev, newItem].sort((a, b) => {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return a.dueDate.getTime() - b.dueDate.getTime();
        }));
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-background">
            <Sidebar onLogout={() => navigate('/login')} />
            <main className="flex-1 ml-20 p-8">
                <Header
                    title="My Schedule"
                    subtitle="Manage your assignments and personal tasks"
                    onNewTask={handleCreateTask}
                />

                <div className="bg-card border border-border rounded-xl shadow-sm mt-6">
                    <div className="p-6 border-b border-border flex justify-between items-center">
                        <h2 className="text-lg font-semibold">All Tasks</h2>
                        <Button onClick={handleCreateTask} size="sm" className="bg-tech-blue-500 hover:bg-tech-blue-600">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Personal Task
                        </Button>
                    </div>

                    <div className="divide-y divide-border">
                        {items.length > 0 ? (
                            items.map(item => (
                                <div key={item.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => handleToggleComplete(item.id)}
                                            className={`p-1 rounded-full border-2 transition-colors ${item.completed ? 'bg-green-500 border-green-500 text-white' : 'border-muted-foreground/30 hover:border-tech-blue-500'}`}
                                        >
                                            {item.completed ? <CheckCircle size={16} /> : <Circle size={16} className="text-transparent" />}
                                        </button>

                                        <div>
                                            <h3 className={`font-medium ${item.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{item.title}</h3>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                                <span className={`px-2 py-0.5 rounded-full ${item.type === 'assignment' ? 'bg-purple-500/10 text-purple-600' : 'bg-blue-500/10 text-blue-600'}`}>
                                                    {item.type === 'assignment' ? 'Assignment' : 'Personal'}
                                                </span>
                                                {item.communityName && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{item.communityName}</span>
                                                    </>
                                                )}
                                                {item.dueDate && (
                                                    <>
                                                        <span>•</span>
                                                        <span className={`${item.dueDate < new Date() && !item.completed ? 'text-red-500 font-medium' : ''}`}>
                                                            Due {item.dueDate.toLocaleDateString()}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {item.type === 'assignment' && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => {
                                                const aid = String(item.id).split('-')[1];
                                                if (item.cid) {
                                                    navigate(`/community/${item.cid}/assignments/${aid}`);
                                                }
                                            }}
                                        >
                                            View Details
                                        </Button>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-muted-foreground">
                                No tasks scheduled. Great job!
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Schedule;
