import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  Home,
  CloudUpload,
  File,
  X,
  Trash2,
  Edit3,
  Download,
  FileCheck,
  Star,
  MessageSquare,
  FileIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Sidebar } from '../../components/dashboard';
import { useSidebar } from '../../contexts/SidebarContext';
import { MarkdownPreview } from '../../components/MarkdownEditor';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { removeTokens } from '../../utils/auth';
import api, { submissionApi, instructorApi } from '../../services/api';
import useSubmissionFiles from '../../hooks/useSubmissionFiles';

interface SubmissionDetail {
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
    description?: string;
    due_date: string | null;
    max_points: number | null;
    canBeLate?: boolean;
    Community: {
      id: string;
      name: string;
    };
    Instructor: {
      uid: number;
      User: {
        id: number;
        fname: string;
        lname: string;
      };
    };
    files?: Array<{
      id: string;
      public_id: string;
      secure_url: string;
      resource_type: string;
      format: string;
      is_private: boolean;
      original_filename?: string;
      created_at: string;
    }>;
  };
  SubmissionFileAttachment?: Array<{
    File: {
      id: string;
      public_id: string;
      secure_url: string;
      resource_type: string;
      format: string;
      is_private: boolean;
      original_filename?: string;
      created_at?: string; size?: number;
    };
  }>;
}

type UserRole = "student" | "instructor" | "admin";

// Helper functions
const formatFileSize = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileName = (file?: { name?: string; public_id?: string; format?: string; original_filename?: string }) => {
  if (!file) return 'File';
  if (file.name) return file.name;
  if (file.original_filename) return file.original_filename;
  if (file.public_id) {
    const parts = file.public_id.split('/');
    const name = parts[parts.length - 1];
    return file.format ? `${name}.${file.format}` : name;
  }
  return `${file.format ? `file.${file.format}` : 'file'}`;
};

// Sub-components
// Sub-components
const FeedbackSection: React.FC<{
  grade: number | null;
  feedback: string | null;
  maxPoints: number | null;
}> = ({ grade, feedback, maxPoints }) => {
  if (grade === null && !feedback) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
          <MessageSquare className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Not graded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {grade !== null && (
        <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-200/50 rounded-xl">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
            <Star className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              Grade: {grade}{maxPoints ? ` / ${maxPoints}` : ''}
            </p>
            <p className="text-xs text-muted-foreground">Graded by instructor</p>
          </div>
        </div>
      )}
      {feedback && (
        <div className="p-4 bg-blue-500/10 border border-blue-200/50 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Feedback</span>
          </div>
          <p className="text-sm text-foreground whitespace-pre-wrap">{feedback}</p>
        </div>
      )}
    </div>
  );
};

const GradingInterface: React.FC<{
  submissionId: number;
  maxPoints: number | null;
  onGradeSubmit: (grade: number, feedback: string) => void;
  isGrading: boolean;
}> = ({ maxPoints, onGradeSubmit, isGrading }) => {
  const [grade, setGrade] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');

  const handleSubmit = () => {
    const gradeNum = parseFloat(grade);
    if (isNaN(gradeNum) || gradeNum < 0 || (maxPoints && gradeNum > maxPoints)) {
      toast.error(`Grade must be a number between 0 and ${maxPoints || 'unlimited'}`);
      return;
    }
    onGradeSubmit(gradeNum, feedback);
  };

  return (
    <div className="space-y-4 p-6 bg-gradient-to-br from-card to-card/80 border border-border rounded-xl shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
          <Star className="w-4 h-4 text-orange-600" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Grade Submission</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Grade {maxPoints && `(Max: ${maxPoints})`}
          </label>
          <input
            type="number"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            min="0"
            max={maxPoints || undefined}
            step="0.1"
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-tech-blue-500 focus:border-transparent"
            placeholder="Enter grade..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Feedback (Optional)
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-tech-blue-500 focus:border-transparent resize-none"
            placeholder="Provide feedback for the student..."
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isGrading || !grade.trim()}
          className="w-full"
        >
          {isGrading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting Grade...
            </>
          ) : (
            <>
              <Star className="w-4 h-4 mr-2" />
              Submit Grade
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

const SubmissionMeta: React.FC<{
  submissionDate: string;
}> = ({ submissionDate }) => {
  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
      <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg">
        <Calendar className="w-4 h-4" />
        <span>Submitted {new Date(submissionDate).toLocaleDateString()}</span>
      </div>
    </div>
  );
};

const SubmissionDetail: React.FC = () => {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();
  const { sidebarWidth } = useSidebar();

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  // Student edit mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Instructor grading
  const [isGrading, setIsGrading] = useState(false);

  const {
    fileInputRef,
    uploadedFiles,
    setUploadedFiles,
    isDragOver,
    handleFileChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleBrowseClick,
    removeFile,
    clearAllFiles,
  } = useSubmissionFiles();

  // Fetch user role
  useEffect(() => {
    let mounted = true;
    const fetchUser = async () => {
      try {
        const res = await api.get('/auth/me');
        const role = (res.data.role || '').toLowerCase() as UserRole;
        if (mounted) setUserRole(role);
      } catch (err) {
        if (mounted) setUserRole(null);
      } finally {
        if (mounted) setUserLoading(false);
      }
    };
    fetchUser();
    return () => { mounted = false; };
  }, []);

  // Check if assignment due date has passed
  const isDueDatePassed = submission?.Assignment.due_date
    ? new Date(submission.Assignment.due_date) < new Date()
    : false;

  useEffect(() => {
    const fetchSubmissionDetail = async () => {
      if (!submissionId) return;

      try {
        setIsLoading(true);
        setError(null);

        const res = await submissionApi.getById(Number(submissionId));
        if (!res || !res.data) {
          setError('Submission not found');
          return;
        }

        setSubmission(res.data);
      } catch (error) {
        const axiosErr: any = error;
        const status = axiosErr?.response?.status;
        if (status === 401) {
          setError('Not authenticated. Please log in.');
        } else if (status === 403) {
          setError('You do not have permission to view this submission.');
        } else if (axiosErr?.response?.data?.message) {
          setError(axiosErr.response.data.message);
        } else {
          setError('Failed to load submission details');
        }
        if (axiosErr?.response) console.debug('submission fetch response:', axiosErr.response);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubmissionDetail();
  }, [submissionId]);

  const handleLogout = () => {
    removeTokens();
    navigate('/login');
  };

  const handleGradeSubmit = async (grade: number, feedback: string) => {
    if (!submission) return;

    setIsGrading(true);
    try {
      await instructorApi.gradeSubmission(submission.id, { grade, feedback });
      toast.success('Grade submitted successfully!');
      // Refresh the submission data
      const res = await submissionApi.getById(Number(submissionId));
      if (res?.data) setSubmission(res.data);
    } catch (error: any) {
      console.error('Failed to grade submission:', error);
      toast.error(error.response?.data?.message || 'Failed to submit grade');
    } finally {
      setIsGrading(false);
    }
  };

  const handleUpdateSubmission = async () => {
    if (!submission || uploadedFiles.length === 0) {
      toast.error('Please add at least one file.');
      return;
    }

    setIsUploading(true);

    try {
      const fileIds: string[] = [];

      for (const [idx, file] of uploadedFiles.entries()) {
        const signRes = await api.post('/uploads/sign', {
          context: 'SUBMISSION',
          context_id: String(submission.id),
          is_private: false,
          resource_type: 'auto',
        });
        const { timestamp, signature, folder, cloudName, apiKey } = signRes.data;

        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        uploadFormData.append('timestamp', timestamp.toString());
        uploadFormData.append('signature', signature);
        uploadFormData.append('api_key', apiKey);
        uploadFormData.append('folder', folder);

        const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

        const cloudinaryData: any = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', uploadUrl);

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const json = JSON.parse(xhr.responseText);
                resolve(json);
              } catch (err) {
                reject(err);
              }
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error('Network error during file upload'));
          xhr.send(uploadFormData);
        });

        try {
          const createRes = await api.post('/files', {
            public_id: cloudinaryData.public_id,
            secure_url: cloudinaryData.secure_url,
            resource_type: cloudinaryData.resource_type,
            format: cloudinaryData.format,
            context: 'SUBMISSION',
            context_id: String(submission.id),
            is_private: false,
            original_filename: file.name,
          });

          const createdFileId = createRes.data?.data?.id;
          if (createdFileId) fileIds.push(createdFileId);
        } catch (fileCreateError) {
          console.error('Failed to create file record for submission:', fileCreateError);
        }
      }

      if (fileIds.length > 0) {
        await api.put(`/submissions/${submission.id}`, { fileIds });
      }

      toast.success('Submission updated successfully!');
      setIsEditMode(false);
      setUploadedFiles([]);
      window.location.reload();
    } catch (error: any) {
      if (error.message?.includes('Customer is marked as untrusted') ||
        error.message?.includes('untrusted') ||
        error.message?.includes('cloudinary')) {
        toast.error('File upload failed due to Cloudinary restrictions. Cannot update submission at this time.');
      } else {
        toast.error(error.response?.data?.message || error.message || 'Failed to update submission');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!submission) return;

    setIsDeleting(true);
    try {
      await submissionApi.delete(submission.id);
      toast.success('Submission deleted successfully');
      navigate('/submissions');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete submission');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (isLoading || userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !submission || !userRole) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <p className="text-xl font-semibold text-foreground mb-2">Error</p>
        <p className="text-muted-foreground mb-6">{error || 'Submission not found'}</p>
        <Button onClick={() => navigate(-1)} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const isInstructor = userRole === 'instructor' || userRole === 'admin';
  const isStudent = userRole === 'student';

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar onLogout={handleLogout} />
      <main className="flex-1 p-8 transition-all duration-300" style={{ marginLeft: `${sidebarWidth}px` }}>
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb Navigation: Explore / Assignments / Assignment Name / Submission */}
          <div className="mb-6 flex items-center text-sm text-muted-foreground">
            <Link to="/explore" className="flex items-center hover:text-foreground transition-colors">
              <Home className="w-4 h-4 mr-1" />
              Explore
            </Link>
            <ChevronRight className="w-4 h-4 mx-2" />
            <Link to="/assignments" className="hover:text-foreground transition-colors">
              Assignments
            </Link>
            <ChevronRight className="w-4 h-4 mx-2" />
            <span className="text-foreground font-medium">Submission</span>
          </div>

          {/* Header */}
          <div className="bg-gradient-to-r from-card to-card/80 border border-border rounded-2xl p-6 mb-8 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-tech-blue-500/10 flex items-center justify-center">
                    <FileCheck className="w-6 h-6 text-tech-blue-600" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">{submission.Assignment.title}</h1>
                    <p className="text-sm text-muted-foreground">Submission Details</p>
                  </div>
                </div>
                <SubmissionMeta
                  submissionDate={submission.subm_date}
                />
              </div>

              {/* Student Actions */}
              {isStudent && (
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsEditMode(!isEditMode)}
                    disabled={isDueDatePassed}
                    title={isDueDatePassed ? "Cannot edit submission after due date has passed" : "Edit submission"}
                    className={`inline-flex items-center gap-2 px-4 py-2 bg-tech-blue-500 hover:bg-tech-blue-600 text-white font-medium rounded-lg transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md ${isDueDatePassed ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''}`}
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDueDatePassed}
                    title={isDueDatePassed ? "Cannot delete submission after due date has passed" : "Delete submission"}
                    className={`inline-flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground font-medium rounded-lg transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md border border-border ${isDueDatePassed ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''}`}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
              {/* Left Col: Assignment Details */}
              <div className="lg:col-span-2 space-y-6">
                {/* Assignment Description */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                  <h2 className="text-lg font-semibold mb-4 text-foreground">Assignment Details</h2>
                  {submission.Assignment.description ? (
                    <MarkdownPreview content={submission.Assignment.description} />
                  ) : (
                    <span className="italic opacity-50">No instructions provided.</span>
                  )}
                </div>

                {/* Attached Assignment Files */}
                {submission.Assignment.files && submission.Assignment.files.length > 0 && (
                  <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 text-foreground">Assignment Files</h2>
                    <div className="space-y-3">
                      {submission.Assignment.files.map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-tech-blue-500/10 flex items-center justify-center">
                              <File className="w-5 h-5 text-tech-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground text-sm">
                                {file.original_filename || `File.${file.format}`}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {file.format?.toUpperCase() || 'File'} • {file.resource_type}
                              </p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" asChild>
                            <a href={file.secure_url} target="_blank" rel="noopener noreferrer" className="text-tech-blue-600 hover:text-tech-blue-700" download={file.original_filename || `file.${file.format}`}>
                              <Download className="w-4 h-4" />
                            </a>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Col: Submission Files and Actions */}
              <div className="space-y-6">
                {/* Submission Files */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-tech-blue-500/10 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-tech-blue-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">
                      {isEditMode ? 'Edit Your Submission' : 'Submitted Files'}
                    </h2>
                  </div>

                  {!isEditMode ? (
                    <>
                      {/* Get attachments - handle both old and new format */}
                      {(() => {
                        // Normalize attachments from multiple possible API shapes.
                        // Some endpoints return files under `SubmissionFileAttachment` (with a `File` wrapper),
                        // others may return a direct `files` array on the submission. We handle both.
                        const wrapped = (submission.SubmissionFileAttachment || []).map(a => a.File).filter(Boolean as any);
                        const direct = ((submission as any).files || []).filter((f: any) => f?.secure_url);

                        const normalized: Array<{ File: any }> = [
                          ...wrapped.map((f: any) => ({ File: f })),
                          ...direct.map((f: any) => ({ File: f })),
                        ];

                        const attachments = normalized.filter(a => a.File?.secure_url);

                        const imageFormats = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']);
                        const Images = attachments.filter(a => {
                          const fmt = String(a.File?.format || '').toLowerCase();
                          const url = a.File?.secure_url || '';
                          return (fmt && imageFormats.has(fmt)) || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(url);
                        });

                        const files = attachments.filter(a => !Images.includes(a));

                        if (attachments.length === 0) {
                          return (
                            <div className="text-center py-8">
                              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                                <File className="w-6 h-6 text-muted-foreground" />
                              </div>
                              <p className="text-sm text-muted-foreground">No files submitted</p>
                            </div>
                          );
                        }

                        return (
                          <>
                            {Images.length > 0 && (
                              <div className="mb-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {Images.map((attachment) => (
                                  <div key={attachment.File.id} className="rounded-lg overflow-hidden bg-muted/30 border border-border">
                                    <div className="relative bg-black/5 aspect-video flex items-center justify-center">
                                      <img
                                        src={attachment.File?.secure_url}
                                        alt={getFileName(attachment.File)}
                                        className="w-full h-full object-contain"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {files.length > 0 && (
                              <div className="mb-3 space-y-2">
                                {files.map((attachment) => (
                                  <a
                                    key={attachment.File.id}
                                    href={attachment.File.secure_url}
                                    download={getFileName(attachment.File)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e: any) => e.stopPropagation()}
                                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted border border-border transition-colors group"
                                  >
                                    <div className="shrink-0 w-8 h-8 rounded flex items-center justify-center bg-background">
                                      <FileIcon size={16} className="text-muted-foreground group-hover:text-foreground" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-foreground truncate group-hover:text-frosted-blue-600">
                                        {getFileName(attachment.File)}
                                      </div>
                                      {attachment.File.size && (
                                        <div className="text-xs text-muted-foreground">
                                          {formatFileSize(attachment.File.size)}
                                        </div>
                                      )}
                                    </div>
                                    <Download size={16} className="shrink-0 text-muted-foreground group-hover:text-frosted-blue-600" />
                                  </a>
                                ))}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </>
                  ) : (
                    /* Edit Mode for Student */
                    <div className="space-y-4">
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 cursor-pointer group ${isDragOver ? 'border-tech-blue-500 bg-tech-blue-500/5 scale-[1.02] shadow-lg' : 'border-muted-foreground/25 hover:border-tech-blue-500/50 hover:bg-gradient-to-br hover:from-muted/20 hover:to-muted/40'} ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={handleBrowseClick}
                      >
                        <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.txt,.rtf,.jpg,.jpeg,.png,.gif,.webp" onChange={handleFileChange} disabled={isUploading} className="hidden" />
                        <div className="flex flex-col items-center gap-4">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 ${isDragOver ? 'bg-tech-blue-500/20 scale-110 shadow-lg' : 'bg-muted group-hover:bg-muted/80'}`}>
                            <CloudUpload className={`w-7 h-7 transition-colors ${isDragOver ? 'text-tech-blue-600' : 'text-muted-foreground'}`} />
                          </div>
                          <div className="space-y-2">
                            <p className="text-base font-semibold text-foreground">
                              {isDragOver ? '🎯 Drop your files here!' : 'Replace submission files'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Drag & drop files here, or{' '}
                              <span className="text-tech-blue-600 hover:text-tech-blue-700 font-medium underline cursor-pointer">
                                browse to choose files
                              </span>
                            </p>
                          </div>
                          <div className="flex flex-wrap justify-center gap-2">
                            <span className="px-3 py-1 bg-muted/80 text-xs font-medium rounded-full border">PDF, Word, Images</span>
                            <span className="px-3 py-1 bg-muted/80 text-xs font-medium rounded-full border">Max 10MB each</span>
                          </div>
                        </div>
                      </div>

                      {uploadedFiles.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded bg-tech-blue-500/10 flex items-center justify-center">
                                <FileText className="w-3 h-3 text-tech-blue-600" />
                              </div>
                              <p className="text-sm font-medium text-foreground">
                                Ready to upload ({uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''})
                              </p>
                            </div>
                            <button type="button" onClick={clearAllFiles} className="text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded hover:bg-destructive/10" title="Remove all files">
                              Clear all
                            </button>
                          </div>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {uploadedFiles.map((file, index) => (
                              <div key={index} className="group flex items-center justify-between p-3 bg-gradient-to-r from-muted/20 to-muted/30 rounded-lg border border-border/50 hover:border-tech-blue-200/50 hover:shadow-sm transition-all duration-200">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <div className="w-8 h-8 rounded-lg bg-tech-blue-500/10 flex items-center justify-center flex-shrink-0">
                                    <File className="w-4 h-4 text-tech-blue-600" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-foreground truncate" title={file.name}>
                                      {file.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                  </div>
                                </div>
                                <button type="button" onClick={() => removeFile(index)} className="w-8 h-8 rounded-full bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center text-destructive hover:text-destructive transition-all duration-200 hover:scale-110 flex-shrink-0" title="Remove file">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-3 pt-4">
                        <button onClick={() => setIsEditMode(false)} className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 text-foreground font-medium text-sm rounded-lg transition-all duration-200 hover:scale-[1.02] border border-border">
                          <X className="w-3 h-3" />
                          Cancel
                        </button>
                        <button onClick={handleUpdateSubmission} disabled={isUploading || uploadedFiles.length === 0} className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-tech-blue-500 hover:bg-tech-blue-600 disabled:bg-muted disabled:text-muted-foreground text-white font-medium text-sm rounded-lg transition-all duration-200 hover:scale-[1.02] shadow-sm hover:shadow-md disabled:hover:scale-100 disabled:shadow-none">
                          {isUploading ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            <>
                              <CloudUpload className="w-3 h-3" />
                              Update
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Instructor Grading or Student Results */}
                {isInstructor ? (
                  <GradingInterface
                    submissionId={submission.id}
                    maxPoints={submission.Assignment.max_points}
                    onGradeSubmit={handleGradeSubmit}
                    isGrading={isGrading}
                  />
                ) : (
                  <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <h2 className="text-lg font-semibold text-foreground">Results</h2>
                    </div>
                    <FeedbackSection
                      grade={submission.grade}
                      feedback={submission.feedback}
                      maxPoints={submission.Assignment.max_points}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Submission"
        message="Are you sure you want to delete this submission? This action cannot be undone and your files will be permanently removed."
        confirmText="Delete Submission"
        isDestructive
        isLoading={isDeleting}
      />
    </div>
  );
};

export default SubmissionDetail;