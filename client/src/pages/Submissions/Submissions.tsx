import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCheck, Calendar, FileText, Loader2, Home, ChevronRight, Eye } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Sidebar } from '../../components/dashboard';
import { useSidebar } from '../../contexts/SidebarContext';
import { removeTokens } from '../../utils/auth';
import { submissionApi, instructorApi } from '../../services/api';
import api from '../../services/api';
import { toast } from 'sonner';

interface Submission {
  id: number;
  aid: number;
  sid: number;
  subm_date: string;
  grade: number | null;
  feedback: string | null;
  comment: string | null;
  Assignment: {
    id: number;
    title: string;
    due_date: string | null;
    Community: {
      name: string;
    };
  };
  SubmissionFileAttachment?: Array<{
    File: {
      id: string;
      original_filename?: string;
      format: string;
      resource_type: string;
    };
  }>;
  Student?: {
    User: {
      fname: string;
      lname: string;
    };
  };
}

const Submissions: React.FC = () => {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const { sidebarWidth } = useSidebar();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Fetch user first
        const userRes = await api.get('/auth/me');
        const currentUser = userRes.data;
        setUser(currentUser);

        let response;
        if (currentUser.role === 'instructor' || currentUser.role === 'admin') {
          // Fetch all submissions for instructor's communities
          response = await instructorApi.getManagedSubmissions({ limit: 100 });
        } else {
          // Fetch student's own submissions
          response = await submissionApi.getMySubmissions({ limit: 100 });
        }

        const transformedData = response.data.map((submission: any) => ({
          ...submission,
          Assignment: {
            id: submission.Assignment?.id,
            title: submission.Assignment?.title || 'Unknown Assignment',
            due_date: submission.Assignment?.due_date || null,
            Community: {
              name: submission.Assignment?.Community?.name || 'Unknown Community'
            }
          }
        }));
        setSubmissions(transformedData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast.error('Failed to load submissions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleLogout = () => {
    removeTokens();
    navigate('/login');
  };

  // Group submissions by assignment
  const submissionsByAssignment = submissions.reduce((acc, submission) => {
    const assignmentId = submission.aid;
    if (!acc[assignmentId]) {
      acc[assignmentId] = {
        assignment: submission.Assignment,
        submissions: []
      };
    }
    acc[assignmentId].submissions.push(submission);
    return acc;
  }, {} as Record<number, { assignment: Submission['Assignment'], submissions: Submission[] }>);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar onLogout={handleLogout} />

      <main
        className="flex-1 p-8 transition-all duration-300"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        <div className="max-w-6xl mx-auto">
          {/* Breadcrumb */}
          <div className="mb-6 flex items-center text-sm text-muted-foreground">
            <Home className="w-4 h-4 mr-1" />
            <span>Home</span>
            <ChevronRight className="w-4 h-4 mx-2" />
            <span className="text-foreground font-medium">My Submissions</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {user?.role === 'instructor' || user?.role === 'admin' ? 'Submissions to Grade' : 'My Submissions'}
            </h1>
            <p className="text-muted-foreground">
              {user?.role === 'instructor' || user?.role === 'admin'
                ? 'Review and grade student assignment submissions'
                : 'View and manage all your assignment submissions'}
            </p>
          </div>

          {/* Submissions List */}
          {Object.keys(submissionsByAssignment).length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <FileCheck className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No submissions yet</h3>
              <p className="text-muted-foreground">
                You haven't submitted any assignments yet. Start by completing some assignments!
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(submissionsByAssignment).map(([assignmentId, { assignment, submissions: assignmentSubmissions }]) => (
                <div key={assignmentId} className="bg-card border border-border rounded-xl p-6">
                  {/* Assignment Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        {assignment.title}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{assignment.Community?.name || 'Unknown Community'}</span>
                        {assignment.due_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>Due {formatDate(assignment.due_date)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">
                        {assignmentSubmissions.length} submission{assignmentSubmissions.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  {/* Submissions for this assignment */}
                  <div className="space-y-3">
                    {assignmentSubmissions.map((submission) => (
                      <div
                        key={submission.id}
                        className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border hover:bg-muted/70 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-tech-blue-500/10 flex items-center justify-center">
                            <FileCheck className="w-5 h-5 text-tech-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {user?.role === 'instructor' || user?.role === 'admin'
                                ? `${submission.Student?.User?.fname} ${submission.Student?.User?.lname}`
                                : `Submitted on ${formatDate(submission.subm_date)}`}
                            </p>
                            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                              {(user?.role === 'instructor' || user?.role === 'admin') && (
                                <p className="text-xs">Submitted on {formatDate(submission.subm_date)}</p>
                              )}
                              <div className="flex items-center gap-3">
                                <span>{submission.SubmissionFileAttachment?.length || 0} file{(submission.SubmissionFileAttachment?.length || 0) !== 1 ? 's' : ''}</span>
                                {submission.grade !== null && (
                                  <span className="text-green-600 font-medium">
                                    Grade: {submission.grade}
                                  </span>
                                )}
                              </div>
                              {submission.SubmissionFileAttachment && submission.SubmissionFileAttachment.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {submission.SubmissionFileAttachment.slice(0, 2).map((attachment) => (
                                    <span
                                      key={attachment.File.id}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded text-xs"
                                      title={attachment.File.original_filename}
                                    >
                                      <FileText className="w-3 h-3" />
                                      <span className="truncate max-w-20">
                                        {attachment.File.original_filename || `File.${attachment.File.format}`}
                                      </span>
                                    </span>
                                  ))}
                                  {submission.SubmissionFileAttachment.length > 2 && (
                                    <span className="text-xs text-muted-foreground">
                                      +{submission.SubmissionFileAttachment.length - 2} more
                                    </span>
                                  )}
                                </div>
                              )}
                              {submission.comment && (
                                <span className="italic text-xs">"{submission.comment}"</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {(user?.role === 'instructor' || user?.role === 'admin') ? (
                            <Button
                              size="sm"
                              onClick={() => navigate(`/submission/${submission.id}`)}
                              className="bg-frosted-blue-500 hover:bg-frosted-blue-600 text-white"
                            >
                              Grade
                            </Button>
                          ) : (
                            <button
                              onClick={() => navigate(`/submission/${submission.id}`)}
                              className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                              title="View submission"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
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

export default Submissions;