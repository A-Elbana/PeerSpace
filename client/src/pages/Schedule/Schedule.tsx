import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronUp, CheckCircle, Loader2 } from 'lucide-react';
import { Sidebar } from '../../components/dashboard';
import { useSidebar } from '../../contexts/SidebarContext';
import { Button } from '../../components/ui/button';
import { assignmentApi, communityApi } from '../../services/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import ScheduleTaskCard from '@/components/ScheduleTaskCard';

// Interface for unified task item
interface ScheduleItem {
    id: string | number;
    title: string;
    type: 'assignment' | 'personal';
    dueDate: Date | null;
    dueTime?: string;
    completed: boolean;
    communityName?: string;
    cid?: string | number;
    courseColor?: string;
    description?: string;
    points?: number;
    hasAttachment?: boolean;
    hasLink?: boolean;
}

interface GroupedByDate {
    date: Date;
    dateString: string;
    relativeLabel: string;
    items: ScheduleItem[];
}

const Schedule: React.FC = () => {
    const navigate = useNavigate();
    const { sidebarWidth } = useSidebar();
    const [items, setItems] = useState<ScheduleItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showJumpToToday, setShowJumpToToday] = useState(false);
    const todayRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        document.title = 'PeerSpace - Schedule';
        loadSchedule();
    }, []);

    // Handle scroll for FAB visibility
    useEffect(() => {
        const handleScroll = () => {
            if (!todayRef.current || !scrollContainerRef.current) return;
            
            const todayPosition = todayRef.current.getBoundingClientRect().top;
            const viewportHeight = window.innerHeight;
            
            // Show FAB when Today section is above the viewport
            setShowJumpToToday(todayPosition < -100);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const loadSchedule = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch all communities
            const communitiesRes = await communityApi.getAll({ limit: 100 });
            const communities = communitiesRes.data || [];

            // 2. Fetch assignments for all communities
            const assignmentPromises = communities.map(c =>
                assignmentApi.getByCommunity(c.id, { limit: 50 })
                    .then(res => ({ 
                        cid: c.id, 
                        cname: c.name, 
                        assignments: res.data 
                    }))
                    .catch(() => ({ cid: c.id, cname: c.name, assignments: [] }))
            );

            const results = await Promise.all(assignmentPromises);

            const assignmentItems: ScheduleItem[] = results.flatMap(r =>
                r.assignments.map((a: any) => ({
                    id: `a-${a.id}`,
                    title: a.title,
                    type: 'assignment' as const,
                    dueDate: a.due_date ? new Date(a.due_date) : null,
                    completed: false, // Can be enhanced with submission status
                    communityName: r.cname,
                    cid: r.cid,
                    description: a.description || undefined,
                    points: a.max_points,
                    hasAttachment: false, // Can be enhanced with file attachment data
                    hasLink: false,
                }))
            );

            // 3. Load Personal Tasks from LocalStorage
            const storedTasks = localStorage.getItem('peerspace_personal_tasks');
            const personalTasks: ScheduleItem[] = storedTasks
                ? JSON.parse(storedTasks).map((t: any) => ({
                    ...t,
                    dueDate: t.dueDate ? new Date(t.dueDate) : null,
                }))
                : [];

            // Combine and sort by due date
            const allItems = [...assignmentItems, ...personalTasks].sort((a, b) => {
                if (!a.dueDate && !b.dueDate) return 0;
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return a.dueDate.getTime() - b.dueDate.getTime();
            });

            setItems(allItems);
        } catch (error) {
            console.error('Failed to load schedule:', error);
            toast.error('Failed to load schedule');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateTask = () => {
        const title = prompt('Enter task title:');
        if (!title) return;

        const dueDateStr = prompt('Enter due date (YYYY-MM-DD) or leave blank:');
        const dueDate = dueDateStr ? new Date(dueDateStr) : null;

        const newTask: ScheduleItem = {
            id: `p-${Date.now()}`,
            title,
            type: 'personal',
            dueDate,
            completed: false,
        };

        const updatedItems = [...items, newTask];
        setItems(updatedItems);

        // Save personal tasks to localStorage
        const personalTasks = updatedItems.filter(i => i.type === 'personal');
        localStorage.setItem('peerspace_personal_tasks', JSON.stringify(personalTasks));
        toast.success('Task created!');
    };

    const toggleComplete = (id: string | number) => {
        const updated = items.map(item =>
            item.id === id ? { ...item, completed: !item.completed } : item
        );
        setItems(updated);

        // Update localStorage for personal tasks
        const personalTasks = updated.filter(i => i.type === 'personal');
        localStorage.setItem('peerspace_personal_tasks', JSON.stringify(personalTasks));
    };

    const handleNavigateToAssignment = (item: ScheduleItem) => {
        if (item.type === 'assignment' && item.cid) {
            const aid = String(item.id).split('-')[1];
            navigate(`/community/${item.cid}/assignment/${aid}`);
        }
    };

    const jumpToToday = () => {
        todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // Group items by date
    const groupedByDate = (): GroupedByDate[] => {
        const groups: { [key: string]: ScheduleItem[] } = {};
        
        items.forEach(item => {
            if (!item.dueDate) return;
            
            const dateKey = item.dueDate.toDateString();
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(item);
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return Object.entries(groups)
            .map(([dateString, items]) => {
                const date = new Date(dateString);
                const diffDays = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                
                let relativeLabel = '';
                if (diffDays === 0) relativeLabel = 'Today';
                else if (diffDays === 1) relativeLabel = 'Tomorrow';
                else if (diffDays === -1) relativeLabel = 'Yesterday';
                else if (diffDays > 1 && diffDays <= 7) relativeLabel = 'This Week';
                else if (diffDays < -1) relativeLabel = 'Past';
                else relativeLabel = 'Upcoming';

                return { date, dateString, relativeLabel, items };
            })
            .sort((a, b) => a.date.getTime() - b.date.getTime());
    };

    const grouped = groupedByDate();

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    return (
        <div className="flex min-h-screen bg-background">
            <Sidebar onLogout={handleLogout} />

            <main
                ref={scrollContainerRef}
                className="flex-1 transition-all duration-300 relative"
                style={{ marginLeft: `${sidebarWidth}px` }}
            >
                {isLoading ? (
                    <div className="flex items-center justify-center min-h-screen">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto px-6 py-8 pb-24">
                        {/* Page Header */}
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold text-foreground mb-2">
                                Academic Stream
                            </h1>
                            <p className="text-muted-foreground">
                                Your assignments and tasks organized by date
                            </p>
                        </div>

                        {/* Date Groups */}
                        {grouped.length > 0 ? (
                            <div className="space-y-6">
                                {grouped.map((group, idx) => {
                                    const isToday = group.relativeLabel === 'Today';
                                    
                                    return (
                                        <div key={group.dateString} ref={isToday ? todayRef : null}>
                                            {/* Sticky Date Anchor */}
                                            <div className={cn(
                                                "sticky top-0 z-10 backdrop-blur-sm bg-background/80 border-b border-border",
                                                "py-4 mb-4 flex items-center justify-between"
                                            )}>
                                                <div className="flex items-center gap-3">
                                                    <h2 className="text-xl font-semibold text-foreground">
                                                        {group.date.toLocaleDateString('en-US', { 
                                                            weekday: 'long',
                                                            month: 'short',
                                                            day: 'numeric'
                                                        })}
                                                    </h2>
                                                    {group.relativeLabel && (
                                                        <span className={cn(
                                                            "px-3 py-1 rounded-full text-xs font-medium",
                                                            isToday 
                                                                ? "bg-tech-blue-100 text-tech-blue-700 dark:bg-tech-blue-900/30 dark:text-tech-blue-300"
                                                                : "bg-muted text-muted-foreground"
                                                        )}>
                                                            {group.relativeLabel}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-sm text-muted-foreground">
                                                    {group.items.length} {group.items.length === 1 ? 'Task' : 'Tasks'}
                                                </span>
                                            </div>

                                            {/* Task Cards */}
                                            <div className="space-y-3">
                                                {group.items.map(item => (
                                                    <ScheduleTaskCard
                                                        key={item.id}
                                                        id={item.id}
                                                        title={item.title}
                                                        type={item.type}
                                                        dueDate={item.dueDate}
                                                        dueTime={item.dueTime}
                                                        completed={item.completed}
                                                        communityName={item.communityName}
                                                        courseColor={item.courseColor}
                                                        description={item.description}
                                                        points={item.points}
                                                        hasAttachment={item.hasAttachment}
                                                        hasLink={item.hasLink}
                                                        onNavigate={item.type === 'assignment' 
                                                            ? () => handleNavigateToAssignment(item)
                                                            : undefined
                                                        }
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            // "Psychological Relief" State - Day Clear
                            <div className="flex flex-col items-center justify-center py-16">
                                <div className="bg-muted/30 rounded-full p-6 mb-4">
                                    <CheckCircle className="w-16 h-16 text-muted-foreground" />
                                </div>
                                <h3 className="text-xl font-semibold text-muted-foreground mb-2">
                                    All Clear!
                                </h3>
                                <p className="text-muted-foreground text-center max-w-md">
                                    You have no upcoming tasks or assignments. 
                                    Take a well-deserved break!
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Floating Action Button - Jump to Today */}
                {showJumpToToday && (
                    <Button
                        onClick={jumpToToday}
                        className={cn(
                            "fixed bottom-8 right-8 z-50",
                            "rounded-full w-14 h-14 shadow-lg",
                            "bg-primary hover:bg-primary/90",
                            "transition-all duration-300 transform",
                            "hover:scale-110"
                        )}
                        size="icon"
                        aria-label="Jump to Today"
                    >
                        <ChevronUp className="w-6 h-6" />
                    </Button>
                )}
            </main>
        </div>
    );
};

export default Schedule;
