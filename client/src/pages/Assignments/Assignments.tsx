import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, FileText, Loader2, Home, ChevronRight, User } from 'lucide-react';
import { Sidebar } from '../../components/dashboard';
import { removeTokens } from '../../utils/auth';
import api, { assignmentApi, communityApi, submissionApi } from '../../services/api';

type UserRole = 'student' | 'instructor' | 'admin';

interface UserData {
    id: number;
    email: string;
    fname: string;
    lname: string;
    role: UserRole;
}

interface AssignmentData {
    id: number;
    title: string;
    due_date: string | null;
    max_points: number | null;
    canBeLate?: boolean;
    cid: string;
    communityName?: string;
    ungradedCount?: number;
    Instructor?: {
        uid: number;
        User: {
            id: number;
            fname: string;
            lname: string;
        };
    };
}

const Assignments: React.FC = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<UserData | null>(null);
    const [assignments, setAssignments] = useState<AssignmentData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);

                // Fetch user data
                const { data } = await api.get('/auth/me');
                const normalizedUser: UserData = {
                    ...data,
                    role: data.role?.toLowerCase() as UserRole
                };
                setUser(normalizedUser);

                if (normalizedUser.role === 'student') {
                    // Fetch all communities student is enrolled in
                    const communitiesResponse = await communityApi.getAll({ limit: 100 });
                    const allCommunities = [...communitiesResponse.data];

                    // Check enrollment status
                    const enrolledCommunities = [];
                    for (const community of allCommunities) {
                        try {
                            const membersResponse = await communityApi.getMembers(community.id, { limit: 100 });
                            const isEnrolled = membersResponse.data.students.some(
                                (student: { id: number }) => student.id === normalizedUser.id
                            );
                            if (isEnrolled) {
                                enrolledCommunities.push(community);
                            }
                        } catch {
                            // Skip if can't access
                        }
                    }

                    // Fetch assignments from enrolled communities
                    const assignmentPromises = enrolledCommunities.map(async (community) => {
                        try {
                            const assignmentsResponse = await assignmentApi.getByCommunity(community.id, { limit: 100 });
                            return assignmentsResponse.data.map((a: any) => ({
                                ...a,
                                communityName: community.name,
                            }));
                        } catch {
                            return [];
                        }
                    });

                    const allAssignments = (await Promise.all(assignmentPromises)).flat();
                    // Sort by due date (upcoming first, null dates last)
                    allAssignments.sort((a, b) => {
                        if (!a.due_date && !b.due_date) return 0;
                        if (!a.due_date) return 1;
                        if (!b.due_date) return -1;
                        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
                    });
                    setAssignments(allAssignments);

                } else if (normalizedUser.role === 'instructor') {
                    // Fetch all communities
                    const communitiesResponse = await communityApi.getAll({ limit: 100 });
                    const allCommunities = communitiesResponse.data;

                    // Fetch assignments from all communities and filter by instructor
                    const assignmentPromises = allCommunities.map(async (community) => {
                        try {
                            const assignmentsResponse = await assignmentApi.getByCommunity(community.id, { limit: 100 });
                            return assignmentsResponse.data
                                .filter((a: any) => a.Instructor?.User?.id === normalizedUser.id)
                                .map((a: any) => ({
                                    ...a,
                                    communityName: community.name,
                                }));
                        } catch {
                            return [];
                        }
                    });

                    const allInstructorAssignments = (await Promise.all(assignmentPromises)).flat();

                    // Fetch ungraded counts for each assignment
                    const assignmentsWithCounts = await Promise.all(
                        allInstructorAssignments.map(async (assignment) => {
                            try {
                                const submissionsResponse = await submissionApi.getByAssignment(assignment.id, { limit: 100 });
                                const ungradedCount = submissionsResponse.data.filter(sub => sub.grade === null).length;
                                return { ...assignment, ungradedCount };
                            } catch {
                                return { ...assignment, ungradedCount: 0 };
                            }
                        })
                    );

                    // Sort by date created (newest first)
                    assignmentsWithCounts.sort((a, b) => b.id - a.id);
                    setAssignments(assignmentsWithCounts);
                }

            } catch (error) {
                console.error('Failed to fetch assignments:', error);
                removeTokens();
                navigate('/login');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [navigate]);

    const handleLogout = () => {
        removeTokens();
        navigate('/login');
    };

    if (isLoading || !user) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-background">
            <Sidebar onLogout={handleLogout} />

            <main className="flex-1 ml-20 p-8">
                <div className="max-w-6xl mx-auto">
                    {/* Breadcrumb */}
                    <div className="mb-6 flex items-center text-sm text-muted-foreground">
                        <Link to="/dashboard" className="flex items-center hover:text-foreground transition-colors">
                            <Home className="w-4 h-4 mr-1" />
                            Home
                        </Link>
                        <ChevronRight className="w-4 h-4 mx-2" />
                        <span className="text-foreground font-medium">Assignments</span>
                    </div>

                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-foreground mb-2">
                            {user.role === 'student' ? 'My Assignments' : 'Created Assignments'}
                        </h1>
                        <p className="text-muted-foreground">
                            {user.role === 'student'
                                ? 'View all assignments from your enrolled communities'
                                : 'Manage all assignments you have created'}
                        </p>
                    </div>

                    {/* Assignments List */}
                    {assignments.length === 0 ? (
                        <div className="bg-card border border-border rounded-xl p-12 text-center">
                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileText className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-2">No assignments found</h3>
                            <p className="text-muted-foreground">
                                {user.role === 'student'
                                    ? 'You don\'t have any assignments yet. Check back later!'
                                    : 'You haven\'t created any assignments yet.'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {assignments.map((assignment) => (
                                <div
                                    key={assignment.id}
                                    onClick={() => navigate(`/community/${assignment.cid}/assignment/${assignment.id}`)}
                                    className="bg-card border border-border rounded-xl p-6 hover:border-tech-blue-500/50 hover:shadow-lg transition-all cursor-pointer group"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-tech-blue-600 transition-colors">
                                                {assignment.title}
                                            </h3>
                                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <FileText className="w-4 h-4" />
                                                    <span>{assignment.communityName}</span>
                                                </div>
                                                {assignment.due_date && (
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="w-4 h-4" />
                                                        <span>Due {new Date(assignment.due_date).toLocaleDateString()}</span>
                                                    </div>
                                                )}
                                                {assignment.max_points && (
                                                    <div className="flex items-center gap-1">
                                                        <span className="font-medium">{assignment.max_points} points</span>
                                                    </div>
                                                )}
                                                {assignment.canBeLate !== undefined && (
                                                    <div className="flex items-center gap-1">
                                                        {assignment.canBeLate ? (
                                                            <span className="text-green-600 font-medium">Late submissions allowed</span>
                                                        ) : (
                                                            <span className="text-red-600 font-medium">No late submissions</span>
                                                        )}
                                                    </div>
                                                )}
                                                {user.role === 'instructor' && assignment.ungradedCount !== undefined && (
                                                    <div className="flex items-center gap-1">
                                                        <User className="w-4 h-4" />
                                                        <span className="text-orange-600 font-medium">
                                                            {assignment.ungradedCount} ungraded
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-tech-blue-600 group-hover:translate-x-1 transition-all" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Assignments;
