import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, TrendingUp, Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Dashboard Components
import { Sidebar, Header } from '../../components/dashboard';
import { useSidebar } from '../../contexts/SidebarContext';

import {
  communityApi,
  assignmentApi,
  submissionApi,
} from '../../services/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { useStudentDashboard } from '../../hooks/useStudentDashboard';

interface StudentDashboardProps {
  user: {
    id: string;
    email: string;
    fname: string;
    lname: string;
    role: 'student' | 'instructor' | 'admin';
    avatar_file_id?: string;
  };
  onLogout: () => void;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const { sidebarWidth } = useSidebar();

  // State for manual assignment fetching (community-specific)
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>('');
  const [assignments, setAssignments] = useState<Array<any>>([]);
  const [assignmentsMeta, setAssignmentsMeta] = useState<any>(null);
  const [assignmentsPage, setAssignmentsPage] = useState(1);
  const [isAssignmentsLoading, setIsAssignmentsLoading] = useState(false);
  const assignmentsLimit = 10;

  // Submissions for status mapping
  const [submittedAssignmentIds, setSubmittedAssignmentIds] = useState<Set<number>>(new Set());

  // Use our new parallel data fetching hook
  const {
    courses: communities,
    coursesMeta: communitiesMeta,
    isLoading: isPrimaryLoading,
    refresh: refreshDashboard,
    error: dashboardError
  } = useStudentDashboard({ coursesLimit: 10 });

  // Initial data sync for selected community and submissions
  useEffect(() => {
    if (!isPrimaryLoading) {
      if (!selectedCommunityId && communities.length > 0) {
        setSelectedCommunityId(communities[0].id);
      }
      fetchSubmissions();
    }
  }, [isPrimaryLoading, communities]);

  // Fetch submissions separately to keep things clean
  const fetchSubmissions = async () => {
    try {
      const mySubmissions = await submissionApi.getMySubmissions({ page: 1, limit: 200 });
      setSubmittedAssignmentIds(new Set(mySubmissions.data.map(sub => sub.aid)));
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
    }
  };

  // Fetch assignments when selected community or page changes
  useEffect(() => {
    if (selectedCommunityId) {
      fetchCommunityAssignments(selectedCommunityId, assignmentsPage);
    }
  }, [selectedCommunityId, assignmentsPage]);

  const fetchCommunityAssignments = async (cid: string, page: number) => {
    setIsAssignmentsLoading(true);
    try {
      const resp = await assignmentApi.getByCommunity(cid, { page, limit: assignmentsLimit });
      const enriched = resp.data.map((a: any) => ({
        ...a,
        submitted: submittedAssignmentIds.has(a.id),
      }));
      setAssignments(enriched);
      setAssignmentsMeta(resp.meta);
    } catch (err) {
      console.error('Failed to fetch assignments:', err);
      setAssignments([]);
    } finally {
      setIsAssignmentsLoading(false);
    }
  };

  // Private community enrollment
  const [communityCode, setCommunityCode] = useState('');
  const [isEnrolling, setIsEnrolling] = useState(false);

  const handleEnrollInPrivateCommunity = async () => {
    if (!communityCode.trim()) {
      toast.error('Please enter a community ID');
      return;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(communityCode.trim())) {
      toast.error('Invalid community ID format');
      return;
    }

    setIsEnrolling(true);
    try {
      await communityApi.enroll(communityCode.trim());
      toast.success('Successfully enrolled in community!');
      setCommunityCode('');
      refreshDashboard();
    } catch (error: any) {
      console.error('Failed to enroll:', error);
      const message = error.response?.data?.message || 'Failed to enroll in community';
      toast.error(message);
    } finally {
      setIsEnrolling(false);
    }
  };

  const nextDue = useMemo(() => {
    const now = new Date();
    const upcoming = assignments
      .filter(i => !i.submitted && i.due_date && new Date(i.due_date) > now)
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
    return upcoming[0];
  }, [assignments]);

  if (isPrimaryLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-frosted-blue-200 border-t-frosted-blue-600 rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar onLogout={onLogout} />

      <main
        className="flex-1 p-8 transition-all duration-300"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        <Header
          title="Student Dashboard"
          subtitle={`Welcome back, ${user.fname}!`}
          showNewTaskButton={false}
        />

        {dashboardError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-2 rounded-lg mb-6">
            {dashboardError}
          </div>
        )}

        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Next Assignment Card */}
          <Card className="rounded-xl border border-border bg-card hover:shadow-lg transition-all duration-300 relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-br before:from-blue-500/5 before:to-transparent before:pointer-events-none">
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 ring-1 ring-blue-500/20">
                  <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-base">Next Assignment</CardTitle>
                  <CardDescription className="text-xs">Upcoming deadline</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {nextDue ? (
                <div className="space-y-2 relative z-10">
                  <p className="font-semibold text-foreground line-clamp-1">{nextDue.title}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{new Date(nextDue.due_date!).toLocaleDateString()}</p>
                    <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => navigate(`/community/${nextDue.cid}/assignment/${nextDue.id}`)}>Open</Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2">No upcoming deadlines</p>
              )}
            </CardContent>
          </Card>

          {/* My Schedule Card */}
          <Card className="rounded-xl border border-border bg-card hover:shadow-lg transition-all duration-300 relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-br before:from-green-500/5 before:to-transparent before:pointer-events-none">
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-green-500/10 dark:bg-green-500/20 ring-1 ring-green-500/20">
                  <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-base">My Schedule</CardTitle>
                  <CardDescription className="text-xs">Tasks & progress</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 relative z-10">
                <p className="text-sm text-muted-foreground">View all tasks across communities</p>
                <Button variant="default" size="sm" className="w-full bg-green-600 hover:bg-green-700" onClick={() => navigate('/schedule')}>View Schedule</Button>
              </div>
            </CardContent>
          </Card>

          {/* Join Private Community Card */}
          <Card className="rounded-xl border border-border bg-card hover:shadow-lg transition-all duration-300 relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-br before:from-purple-500/5 before:to-transparent before:pointer-events-none">
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 ring-1 ring-purple-500/20">
                  <Lock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <CardTitle className="text-base">Join Community</CardTitle>
                  <CardDescription className="text-xs">Enter private ID</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 relative z-10">
                <Input
                  type="text"
                  placeholder="Enter community ID"
                  value={communityCode}
                  onChange={(e) => setCommunityCode(e.target.value)}
                  className="h-9 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleEnrollInPrivateCommunity();
                    }
                  }}
                />
                <Button
                  onClick={handleEnrollInPrivateCommunity}
                  disabled={isEnrolling || !communityCode.trim()}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  size="sm"
                >
                  {isEnrolling ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    'Join Now'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-xl shadow-sm relative">
              {isAssignmentsLoading && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center z-20 rounded-xl">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              )}
              <div className="p-6 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold">Upcoming Assignments</h2>
                  <select
                    className="text-sm bg-muted/40 border border-border rounded-md px-2 py-1"
                    value={selectedCommunityId}
                    onChange={(e) => {
                      setSelectedCommunityId(e.target.value);
                      setAssignmentsPage(1);
                    }}
                  >
                    {communities.length === 0 ? (
                      <option value="">No communities</option>
                    ) : (
                      communities.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))
                    )}
                  </select>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/schedule')}>View Schedule</Button>
              </div>

              <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-6 py-4 bg-muted/30 border-b border-border text-sm font-medium text-muted-foreground">
                <div>Title</div>
                <div className="w-40 text-center">Due date</div>
                <div className="w-28 text-center">Max points</div>
                <div className="w-28 text-center">Submissions</div>
                <div className="w-28 text-center">Status</div>
              </div>

              <div className="divide-y divide-border">
                {assignments.filter(a => a.due_date && !a.submitted).length === 0 ? (
                  <div className="px-6 py-8 text-center text-muted-foreground">No upcoming or overdue assignments found.</div>
                ) : (
                  assignments
                    .filter(a => a.due_date && !a.submitted)
                    .map((a) => {
                      const now = new Date();
                      const dueDate = a.due_date ? new Date(a.due_date) : null;
                      const isOverdue = dueDate && dueDate < now && !a.submitted;
                      const isSubmitted = a.submitted;
                      let statusText = 'Pending';
                      let statusClass = 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
                      if (isSubmitted) { statusText = 'Submitted'; statusClass = 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'; }
                      else if (isOverdue) { statusText = 'Overdue'; statusClass = 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'; }
                      return (
                        <div key={a.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-6 py-4 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => navigate(`/community/${a.cid}/assignment/${a.id}`)}>
                          <div className="flex flex-col min-w-0">
                            <div className={`font-medium truncate ${isSubmitted ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{a.title}</div>
                            <div className="text-xs text-muted-foreground mt-1">Community • {a.Community?.name || '—'}</div>
                          </div>
                          <div className="w-40 text-center text-sm">{a.due_date ? new Date(a.due_date).toLocaleDateString() : '-'}</div>
                          <div className="w-28 text-center text-sm">{a.max_points ?? '-'}</div>
                          <div className="w-28 text-center text-sm">{a._count?.Submission ?? 0}</div>
                          <div className="w-28 flex items-center justify-center"><span className={`text-xs px-2 py-1 rounded ${statusClass}`}>{statusText}</span></div>
                        </div>
                      );
                    })
                )}
              </div>

              <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20">
                <div className="text-xs text-muted-foreground">Page {assignmentsMeta?.page ?? assignmentsPage} of {assignmentsMeta?.totalPages ?? 1}</div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={(assignmentsMeta?.page ?? assignmentsPage) <= 1}
                    onClick={() => setAssignmentsPage(prev => prev - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={(assignmentsMeta?.page ?? 1) >= (assignmentsMeta?.totalPages ?? 1)}
                    onClick={() => setAssignmentsPage(prev => prev + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-card rounded-xl border border-border shadow-sm">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h3 className="text-lg font-semibold">My Communities</h3>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => refreshDashboard()}>Refresh</Button>
                </div>
              </div>

              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-6 py-4 bg-muted/30 border-b border-border text-sm font-medium text-muted-foreground">
                <div>Name</div>
                <div className="w-24 text-center">Type</div>
                <div className="w-24 text-center">Members</div>
                <div className="w-24 text-center">Actions</div>
              </div>

              <div className="divide-y divide-border">
                {communities.length === 0 ? (
                  <div className="px-6 py-8 text-center text-muted-foreground">No communities enrolled.</div>
                ) : (
                  communities.map((c) => (
                    <div key={c.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-6 py-4 hover:bg-muted/20 transition-colors">
                      <div className="flex flex-col min-w-0">
                        <div className="font-medium truncate text-foreground">{c.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">ID • {c.id}</div>
                      </div>
                      <div className="w-24 text-center text-sm">{c.type}</div>
                      <div className="w-24 text-center text-sm">{c._count?.Enrollment ?? '-'}</div>
                      <div className="w-24 flex items-center justify-center">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/community/${c.id}`)}>View</Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20">
                <div className="text-xs text-muted-foreground">Page {communitiesMeta?.page ?? 1} of {communitiesMeta?.totalPages ?? 1}</div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={(communitiesMeta?.page || 1) <= 1} onClick={() => refreshDashboard()}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={(communitiesMeta?.page || 1) >= (communitiesMeta?.totalPages || 1)} onClick={() => refreshDashboard()}>Next</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;
